import crypto from 'crypto';
import { ICandidateRepository, IElectionRepository, IStudentRepository, IVoteRepository } from '../repositories/interfaces.js';
import { QrCryptoService } from './qrCryptoService.js';
import { sseBroadcast } from './sseBroadcastService.js';
import { ElectionStats, IdentifyStudentResponse } from '../../shared/types.js';

export class VotingService {
  constructor(
    private electionRepo: IElectionRepository,
    private candidateRepo: ICandidateRepository,
    private studentRepo: IStudentRepository,
    private voteRepo: IVoteRepository
  ) {}

  /**
   * Identifica y autoriza a un estudiante para votar (por código manual o QR)
   */
  async identifyStudent(params: {
    studentCode?: string;
    qrPayload?: string;
    electionId?: string;
    stationId?: string;
  }): Promise<IdentifyStudentResponse> {
    // 1. Obtener la elección activa
    let election = params.electionId ? await this.electionRepo.findById(params.electionId) : await this.electionRepo.findActive();

    if (!election) {
      return { success: false, message: 'No hay ninguna jornada electoral activa en este momento.' };
    }

    if (election.status !== 'OPEN') {
      const msg = election.status === 'CLOSED' || election.status === 'FINISHED'
        ? 'La jornada electoral ha finalizado.'
        : 'La elección aún no ha sido abierta oficialmente.';
      return { success: false, message: msg };
    }

    // 2. Extraer código del estudiante
    let codeToSearch = params.studentCode?.trim();

    if (params.qrPayload) {
      const qrResult = QrCryptoService.verifyPayload(params.qrPayload);
      if (!qrResult.isValid || !qrResult.studentCode) {
        return { success: false, message: qrResult.error || 'El código QR no es válido o está deteriorado.' };
      }
      codeToSearch = qrResult.studentCode;
    }

    if (!codeToSearch) {
      return { success: false, message: 'Por favor ingresa o escanea el código del carnet.' };
    }

    // 3. Buscar estudiante en el censo electoral
    const student = await this.studentRepo.findByCode(codeToSearch);
    if (!student) {
      return { 
        success: false, 
        message: `No encontramos al estudiante con código "${codeToSearch}" en el censo electoral. Por favor verifica que esté registrado en la lista de votantes.` 
      };
    }

    if (student.status !== 'ACTIVE') {
      return { success: false, message: 'El estudiante se encuentra en estado inactivo en el sistema.' };
    }

    // 4. Verificar si ya votó
    const voterStatus = await this.voteRepo.getVoterStatus(election.id, student.id);
    if (voterStatus && voterStatus.has_voted === 1) {
      return { success: false, message: 'Este estudiante ya ejerció su derecho al voto en esta elección.' };
    }

    // 5. Generar Token Temporal de Votación (Blind Token con TTL de 120 segundos)
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 120 * 1000).toISOString(); // 2 minutos

    await this.voteRepo.createVotingToken({
      token_hash: tokenHash,
      election_id: election.id,
      student_id: student.id,
      expires_at: expiresAt,
      is_consumed: 0,
      created_at: now.toISOString()
    });

    // 6. Obtener candidatos activos
    const candidates = await this.candidateRepo.findByElectionId(election.id);

    return {
      success: true,
      student: {
        full_name: student.full_name,
        course: student.course,
        grade: student.grade
      },
      voting_token: rawToken,
      expires_in_seconds: 120,
      candidates,
      allow_blank_vote: election.allow_blank_vote === 1
    };
  }

  /**
   * Emite el voto de manera atómica y 100% anónima
   */
  async castVote(params: {
    votingToken: string;
    candidateId?: string | null;
    isBlank?: boolean;
    stationId?: string;
  }): Promise<{ success: boolean; message: string; receipt_id?: string }> {
    if (!params.votingToken) {
      return { success: false, message: 'Token de votación ausente.' };
    }

    const tokenHash = crypto.createHash('sha256').update(params.votingToken).digest('hex');
    const token = await this.voteRepo.findVotingToken(tokenHash);

    if (!token) {
      return { success: false, message: 'Sesión de votación inválida o expirada.' };
    }

    if (token.is_consumed === 1) {
      return { success: false, message: 'Esta sesión ya fue consumida previamente.' };
    }

    if (new Date(token.expires_at) < new Date()) {
      return { success: false, message: 'El tiempo límite para votar ha expirado. Por favor identifícate nuevamente.' };
    }

    // Validar candidato si no es blanco
    if (!params.isBlank) {
      if (!params.candidateId) {
        return { success: false, message: 'Debes seleccionar un candidato o la opción de voto en blanco.' };
      }
      const candidate = await this.candidateRepo.findById(params.candidateId);
      if (!candidate || candidate.election_id !== token.election_id || candidate.is_active !== 1) {
        return { success: false, message: 'El candidato seleccionado no es válido para esta elección.' };
      }
    }

    try {
      const receiptId = await this.voteRepo.castAnonymousVote({
        electionId: token.election_id,
        studentId: token.student_id,
        tokenHash: tokenHash,
        candidateId: params.candidateId || null,
        isBlank: Boolean(params.isBlank),
        stationId: params.stationId || 'web-kiosk'
      });

      // Transmitir actualización en tiempo real a todos los clientes SSE
      this.broadcastStatsUpdate(token.election_id).catch(err => {
        console.error('Error broadcasting election stats:', err);
      });

      return {
        success: true,
        message: '¡Tu voto ha sido registrado con éxito!',
        receipt_id: receiptId
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar el voto en el servidor.';
      return { success: false, message: msg };
    }
  }

  /**
   * Calcula estadísticas y resultados agregados
   */
  async getElectionStats(electionId: string): Promise<ElectionStats> {
    const totalEligible = await this.studentRepo.countTotal();
    const totalVotes = await this.voteRepo.getTotalVotesCount(electionId);
    const pendingStudents = Math.max(0, totalEligible - totalVotes);
    const participationPercentage = totalEligible > 0 ? Number(((totalVotes / totalEligible) * 100).toFixed(1)) : 0;

    // Obtener candidatos de la elección
    const candidates = await this.candidateRepo.findByElectionId(electionId);
    const rawResults = await this.voteRepo.getResultsByElection(electionId);

    // Mapear resultados por candidato
    const resultsMap = new Map<string, number>();
    let blankVotes = 0;

    for (const r of rawResults) {
      if (r.is_blank === 1 || !r.candidate_id) {
        blankVotes += Number(r.votes_count);
      } else {
        resultsMap.set(r.candidate_id, Number(r.votes_count));
      }
    }

    const candidateResults = candidates.map(c => {
      const count = resultsMap.get(c.id) || 0;
      const percentage = totalVotes > 0 ? Number(((count / totalVotes) * 100).toFixed(1)) : 0;
      return {
        candidate_id: c.id,
        candidate_name: c.full_name,
        list_number: c.list_number,
        photo_url: c.photo_url || null,
        votes_count: count,
        percentage,
        is_blank: false
      };
    });

    const election = await this.electionRepo.findById(electionId);
    const allowBlank = election?.allow_blank_vote === 1;

    // Agregar Voto en Blanco solo si está habilitado o si hay votos registrados (caso borde)
    if (allowBlank || blankVotes > 0) {
      candidateResults.push({
        candidate_id: null,
        candidate_name: 'VOTO EN BLANCO',
        list_number: null,
        photo_url: null,
        votes_count: blankVotes,
        percentage: totalVotes > 0 ? Number(((blankVotes / totalVotes) * 100).toFixed(1)) : 0,
        is_blank: true
      });
    }

    // Ordenar de mayor a menor votación
    candidateResults.sort((a, b) => b.votes_count - a.votes_count);

    // Participación por curso
    const courseData = await this.voteRepo.getVoterParticipationByCourse(electionId);
    const participationByCourse = courseData.map(c => {
      const total = Number(c.total);
      const voted = Number(c.voted);
      const pending = Math.max(0, total - voted);
      const percentage = total > 0 ? Number(((voted / total) * 100).toFixed(1)) : 0;
      return {
        course: c.course,
        grade: c.grade,
        total,
        voted,
        pending,
        percentage
      };
    });

    // Helper para ordenar cursos por nombre lógico (Primero, Segundo, etc.)
    const gradeWeights: Record<string, number> = {
      'prejardin': 1, 'pre-jardin': 1,
      'jardin': 2, 
      'transicion': 3,
      'primero': 4, '1ro': 4, '1°': 4,
      'segundo': 5, '2do': 5, '2°': 5,
      'tercero': 6, '3ro': 6, '3°': 6,
      'cuarto': 7, '4to': 7, '4°': 7,
      'quinto': 8, '5to': 8, '5°': 8,
      'sexto': 9, '6to': 9, '6°': 9,
      'septimo': 10, '7mo': 10, '7°': 10,
      'octavo': 11, '8vo': 11, '8°': 11,
      'noveno': 12, '9no': 12, '9°': 12,
      'decimo': 13, '10mo': 13, '10°': 13,
      'undecimo': 14, 'once': 14, '11mo': 14, '11°': 14,
      'doce': 15, '12mo': 15, '12°': 15
    };
    const sortedGradeKeys = Object.keys(gradeWeights).sort((a, b) => b.length - a.length);

    const getGradeWeight = (name: string): number => {
      if (!name) return 999;
      const normalized = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      for (const key of sortedGradeKeys) {
        if (normalized.includes(key)) return gradeWeights[key];
      }
      const match = normalized.match(/\d+/);
      if (match) return parseInt(match[0], 10);
      return 999;
    };

    participationByCourse.sort((a, b) => {
      const weightA = Math.min(getGradeWeight(a.course), getGradeWeight(a.grade));
      const weightB = Math.min(getGradeWeight(b.course), getGradeWeight(b.grade));
      
      if (weightA !== weightB) {
        return weightA - weightB;
      }
      
      // Desempate alfabético ("Primero A" vs "Primero B")
      return a.course.localeCompare(b.course, undefined, { numeric: true, sensitivity: 'base' });
    });

    // Línea de tiempo
    const timeline = await this.voteRepo.getVotesTimeline(electionId);

    return {
      total_eligible_students: totalEligible,
      total_votes_cast: totalVotes,
      total_pending_students: pendingStudents,
      participation_percentage: participationPercentage,
      results: candidateResults,
      participation_by_course: participationByCourse,
      votes_timeline: timeline
    };
  }

  private async broadcastStatsUpdate(electionId: string): Promise<void> {
    const stats = await this.getElectionStats(electionId);
    sseBroadcast.broadcast('election_stats', { electionId, stats });
  }
}
