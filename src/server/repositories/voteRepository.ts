import crypto from 'crypto';
import { executeGetOne, executeQuery, executeRun, executeTransaction } from '../db/connection.js';
import { IVoteRepository, IVotingToken } from './interfaces.js';
import { VoterStatus } from '../../shared/types.js';

export class VoteRepository implements IVoteRepository {
  async getVoterStatus(electionId: string, studentId: string): Promise<VoterStatus | null> {
    return executeGetOne<VoterStatus>(
      'SELECT id, election_id, student_id, has_voted, voted_at, station_id FROM voter_status WHERE election_id = ? AND student_id = ?',
      [electionId, studentId]
    );
  }

  async createVotingToken(token: IVotingToken): Promise<void> {
    await executeRun(
      'INSERT INTO voting_tokens (token_hash, election_id, student_id, expires_at, is_consumed, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [token.token_hash, token.election_id, token.student_id, token.expires_at, token.is_consumed, token.created_at]
    );
  }

  async findVotingToken(tokenHash: string): Promise<IVotingToken | null> {
    return executeGetOne<IVotingToken>(
      'SELECT token_hash, election_id, student_id, expires_at, is_consumed, created_at FROM voting_tokens WHERE token_hash = ?',
      [tokenHash]
    );
  }

  async consumeVotingToken(tokenHash: string): Promise<void> {
    await executeRun('UPDATE voting_tokens SET is_consumed = 1 WHERE token_hash = ?', [tokenHash]);
  }

  /**
   * 🛡️ Transacción Atómica de Emisión de Voto:
   * 1. Verifica validez y vigencia del token de votación
   * 2. Quema el token (is_consumed = 1)
   * 3. Registra en voter_status (bloqueando de forma irreversible futuros intentos)
   * 4. Inserta el voto ANÓNIMO en 'votes' (sin vínculo alguno con student_id)
   * 5. Si algo falla (ej. carrera concurrente), ROLLBACK total
   */
  async castAnonymousVote(params: {
    electionId: string;
    studentId: string;
    tokenHash: string;
    candidateId: string | null;
    isBlank: boolean;
    stationId?: string;
  }): Promise<string> {
    return executeTransaction(async () => {
      const now = new Date().toISOString();

      // 1. Verificar token
      const token = await executeGetOne<IVotingToken>(
        'SELECT token_hash, election_id, student_id, expires_at, is_consumed FROM voting_tokens WHERE token_hash = ?',
        [params.tokenHash]
      );

      if (!token) {
        throw new Error('Token de votación no encontrado o inválido.');
      }

      if (token.is_consumed === 1) {
        throw new Error('Este pase de votación ya fue utilizado.');
      }

      if (new Date(token.expires_at) < new Date()) {
        throw new Error('El pase de votación ha expirado por inactividad.');
      }

      // 2. Verificar que no haya votado previamente
      const existingStatus = await executeGetOne<VoterStatus>(
        'SELECT id FROM voter_status WHERE election_id = ? AND student_id = ?',
        [params.electionId, params.studentId]
      );

      if (existingStatus) {
        throw new Error('Este estudiante ya figura con voto registrado.');
      }

      // 3. Marcar token como consumido
      await executeRun('UPDATE voting_tokens SET is_consumed = 1 WHERE token_hash = ?', [params.tokenHash]);

      // 4. Registrar que el estudiante votó (voter_status)
      const voterStatusId = `vs-${crypto.randomUUID()}`;
      await executeRun(
        'INSERT INTO voter_status (id, election_id, student_id, has_voted, voted_at, station_id) VALUES (?, ?, ?, 1, ?, ?)',
        [voterStatusId, params.electionId, params.studentId, now, params.stationId || 'web-kiosk']
      );

      // 5. Registrar voto ANÓNIMO en urna electrónica (SIN student_id)
      const voteId = `vt-${crypto.randomUUID()}`;
      await executeRun(
        'INSERT INTO votes (id, election_id, candidate_id, is_blank, created_at) VALUES (?, ?, ?, ?, ?)',
        [voteId, params.electionId, params.isBlank ? null : params.candidateId, params.isBlank ? 1 : 0, now]
      );

      // Retorna recibo criptográfico anónimo para el votante
      const receiptHash = crypto.createHash('sha256').update(`${voteId}-${now}`).digest('hex').substring(0, 10).toUpperCase();
      return receiptHash;
    });
  }

  async getResultsByElection(electionId: string): Promise<Array<{
    candidate_id: string | null;
    is_blank: number;
    votes_count: number;
  }>> {
    return executeQuery<{
      candidate_id: string | null;
      is_blank: number;
      votes_count: number;
    }>(
      `SELECT candidate_id, is_blank, COUNT(*) as votes_count
       FROM votes
       WHERE election_id = ?
       GROUP BY candidate_id, is_blank`,
      [electionId]
    );
  }

  async getTotalVotesCount(electionId: string): Promise<number> {
    const res = await executeGetOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM votes WHERE election_id = ?',
      [electionId]
    );
    return res ? Number(res.count) : 0;
  }

  async getVoterParticipationByCourse(electionId: string): Promise<Array<{
    course: string;
    grade: string;
    total: number;
    voted: number;
  }>> {
    return executeQuery<{
      course: string;
      grade: string;
      total: number;
      voted: number;
    }>(
      `SELECT 
        s.course,
        s.grade,
        COUNT(s.id) as total,
        SUM(CASE WHEN vs.has_voted = 1 THEN 1 ELSE 0 END) as voted
       FROM students s
       LEFT JOIN voter_status vs ON s.id = vs.student_id AND vs.election_id = ?
       WHERE s.status = 'ACTIVE'
       GROUP BY s.course, s.grade
       ORDER BY s.grade ASC, s.course ASC`,
      [electionId]
    );
  }

  async getVotesTimeline(electionId: string): Promise<Array<{
    hour: string;
    votes_count: number;
  }>> {
    const votes = await executeQuery<{ created_at: string }>(
      'SELECT created_at FROM votes WHERE election_id = ? ORDER BY created_at ASC',
      [electionId]
    );

    const timelineMap = new Map<string, number>();
    for (const v of votes) {
      if (!v.created_at) continue;
      const d = new Date(v.created_at);
      const hourKey = `${String(d.getHours()).padStart(2, '0')}:00`;
      timelineMap.set(hourKey, (timelineMap.get(hourKey) || 0) + 1);
    }

    const result: Array<{ hour: string; votes_count: number }> = [];
    timelineMap.forEach((count, hour) => {
      result.push({ hour, votes_count: count });
    });

    return result;
  }
}
