import { Router } from 'express';
import * as XLSX from 'xlsx';
import { AuditRepository } from '../repositories/auditRepository.js';
import { CandidateRepository } from '../repositories/candidateRepository.js';
import { ElectionRepository } from '../repositories/electionRepository.js';
import { SettingsRepository } from '../repositories/settingsRepository.js';
import { StudentRepository } from '../repositories/studentRepository.js';
import { UserRepository } from '../repositories/userRepository.js';
import { VoteRepository } from '../repositories/voteRepository.js';
import { AuthService } from '../services/authService.js';
import { ExcelImportService } from '../services/excelImportService.js';
import { QrCryptoService } from '../services/qrCryptoService.js';
import { VotingService } from '../services/votingService.js';
import { AuthenticatedRequest, requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

const userRepo = new UserRepository();
const electionRepo = new ElectionRepository();
const candidateRepo = new CandidateRepository();
const studentRepo = new StudentRepository();
const voteRepo = new VoteRepository();
const auditRepo = new AuditRepository();
const settingsRepo = new SettingsRepository();

const authService = new AuthService(userRepo);
const votingService = new VotingService(electionRepo, candidateRepo, studentRepo, voteRepo);
const excelImportService = new ExcelImportService(studentRepo);

/* ==========================================================================
   AUTENTICACIÓN
   ========================================================================== */

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ success: false, message: 'Usuario y contraseña requeridos.' });
      return;
    }

    const authResult = await authService.authenticate(username, password);
    if (!authResult) {
      res.status(401).json({ success: false, message: 'Credenciales inválidas.' });
      return;
    }

    // Set HttpOnly cookie
    res.cookie('auth_token', authResult.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000
    });

    await auditRepo.create({
      user_id: authResult.user.id,
      username: authResult.user.username,
      action: 'LOGIN',
      details: `Inicio de sesión exitoso con rol ${authResult.user.role}`,
      ip_address: req.ip || '127.0.0.1'
    });

    res.json({
      success: true,
      user: authResult.user,
      token: authResult.token
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error en autenticación';
    res.status(500).json({ success: false, message: msg });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.json({ success: true, message: 'Sesión finalizada correctamente.' });
});

router.get('/me', requireAuth(), (req: AuthenticatedRequest, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

/* ==========================================================================
   GESTIÓN DE ELECCIONES
   ========================================================================== */

router.get('/elections', requireAuth(), async (_req, res) => {
  try {
    const elections = await electionRepo.findAll();
    res.json({ success: true, elections });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al listar elecciones';
    res.status(500).json({ success: false, message: msg });
  }
});

router.post('/elections', requireAuth(['SUPERADMIN', 'ADMIN_ELECTORAL']), async (req: AuthenticatedRequest, res) => {
  try {
    const election = await electionRepo.create(req.body);
    await auditRepo.create({
      user_id: req.user?.userId || null,
      username: req.user?.username || 'system',
      action: 'CREATE_ELECTION',
      details: `Creada elección "${election.name}" (Año ${election.year})`,
      ip_address: req.ip || '127.0.0.1'
    });
    res.json({ success: true, election });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al crear elección';
    res.status(500).json({ success: false, message: msg });
  }
});

router.put('/elections/:id', requireAuth(['SUPERADMIN', 'ADMIN_ELECTORAL']), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    await electionRepo.update(id, req.body);
    await auditRepo.create({
      user_id: req.user?.userId || null,
      username: req.user?.username || 'system',
      action: 'UPDATE_ELECTION',
      details: `Actualizada elección ID ${id}: ${JSON.stringify(req.body)}`,
      ip_address: req.ip || '127.0.0.1'
    });
    const updated = await electionRepo.findById(id);
    res.json({ success: true, election: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al actualizar elección';
    res.status(500).json({ success: false, message: msg });
  }
});

/* ==========================================================================
   GESTIÓN DE CANDIDATOS
   ========================================================================== */

router.get('/candidates', requireAuth(), async (req, res) => {
  try {
    const electionId = (req.query.election_id as string) || (await electionRepo.findActive())?.id;
    if (!electionId) {
      res.json({ success: true, candidates: [] });
      return;
    }
    const candidates = await candidateRepo.findAllByElection(electionId);
    res.json({ success: true, candidates });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al listar candidatos';
    res.status(500).json({ success: false, message: msg });
  }
});

router.post('/candidates', requireAuth(['SUPERADMIN', 'ADMIN_ELECTORAL']), async (req: AuthenticatedRequest, res) => {
  try {
    const candidate = await candidateRepo.create(req.body);
    await auditRepo.create({
      user_id: req.user?.userId || null,
      username: req.user?.username || 'system',
      action: 'CREATE_CANDIDATE',
      details: `Registrado candidato: ${candidate.full_name} (Lista #${candidate.list_number})`,
      ip_address: req.ip || '127.0.0.1'
    });
    res.json({ success: true, candidate });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al crear candidato';
    res.status(500).json({ success: false, message: msg });
  }
});

router.put('/candidates/:id', requireAuth(['SUPERADMIN', 'ADMIN_ELECTORAL']), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    await candidateRepo.update(id, req.body);
    await auditRepo.create({
      user_id: req.user?.userId || null,
      username: req.user?.username || 'system',
      action: 'UPDATE_CANDIDATE',
      details: `Actualizado candidato ID ${id}`,
      ip_address: req.ip || '127.0.0.1'
    });
    const updated = await candidateRepo.findById(id);
    res.json({ success: true, candidate: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al actualizar candidato';
    res.status(500).json({ success: false, message: msg });
  }
});

router.delete('/candidates/:id', requireAuth(['SUPERADMIN', 'ADMIN_ELECTORAL']), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    await candidateRepo.delete(id);
    await auditRepo.create({
      user_id: req.user?.userId || null,
      username: req.user?.username || 'system',
      action: 'DELETE_CANDIDATE',
      details: `Eliminado candidato ID ${id}`,
      ip_address: req.ip || '127.0.0.1'
    });
    res.json({ success: true, message: 'Candidato eliminado correctamente' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al eliminar candidato';
    res.status(500).json({ success: false, message: msg });
  }
});

/* ==========================================================================
   GESTIÓN DE ESTUDIANTES Y CARNETS QR
   ========================================================================== */

router.get('/students', requireAuth(), async (req, res) => {
  try {
    const search = req.query.search as string;
    const grade = req.query.grade as string;
    const course = req.query.course as string;
    const electionId = (req.query.election_id as string) || (await electionRepo.findActive())?.id;

    const students = await studentRepo.findAll(search, grade, course);

    // Mapear con estado de si ya votó
    let mappedStudents = students.map(s => ({
      ...s,
      has_voted: false,
      signed_qr_payload: QrCryptoService.generatePayload(s.student_code)
    }));

    if (electionId) {
      const statuses = await Promise.all(
        students.map(s => voteRepo.getVoterStatus(electionId, s.id))
      );
      mappedStudents = students.map((s, idx) => ({
        ...s,
        has_voted: statuses[idx]?.has_voted === 1,
        voted_at: statuses[idx]?.voted_at || null,
        signed_qr_payload: QrCryptoService.generatePayload(s.student_code)
      }));
    }

    res.json({ success: true, students: mappedStudents });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al consultar estudiantes';
    res.status(500).json({ success: false, message: msg });
  }
});

router.post('/students', requireAuth(['SUPERADMIN', 'ADMIN_ELECTORAL']), async (req: AuthenticatedRequest, res) => {
  try {
    const student = await studentRepo.create(req.body);
    await auditRepo.create({
      user_id: req.user?.userId || null,
      username: req.user?.username || 'system',
      action: 'CREATE_STUDENT',
      details: `Creado estudiante ${student.full_name} (${student.student_code})`,
      ip_address: req.ip || '127.0.0.1'
    });
    res.json({
      success: true,
      student: {
        ...student,
        signed_qr_payload: QrCryptoService.generatePayload(student.student_code)
      }
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al registrar estudiante';
    res.status(500).json({ success: false, message: msg });
  }
});

/* ==========================================================================
   IMPORTACIÓN DESDE EXCEL
   ========================================================================== */

router.post('/students/import-analyze', requireAuth(['SUPERADMIN', 'ADMIN_ELECTORAL']), async (req, res) => {
  try {
    const { base64Data, fileName } = req.body;
    if (!base64Data) {
      res.status(400).json({ success: false, message: 'Archivo base64 requerido' });
      return;
    }

    const buffer = Buffer.from(base64Data.replace(/^data:.*,/, ''), 'base64');
    const analysis = excelImportService.analyzeBuffer(buffer, fileName || 'estudiantes.xlsx');
    res.json({ success: true, analysis });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al analizar el archivo Excel';
    res.status(500).json({ success: false, message: msg });
  }
});

router.post('/students/import-preview', requireAuth(['SUPERADMIN', 'ADMIN_ELECTORAL']), async (req, res) => {
  try {
    const { base64Data, mapping, sheetIndex } = req.body;
    if (!base64Data || !mapping) {
      res.status(400).json({ success: false, message: 'Datos o mapeo de columnas ausentes' });
      return;
    }

    const buffer = Buffer.from(base64Data.replace(/^data:.*,/, ''), 'base64');
    const preview = await excelImportService.previewData(buffer, mapping, sheetIndex || 0);
    res.json({ success: true, preview });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al generar vista previa';
    res.status(500).json({ success: false, message: msg });
  }
});

router.post('/students/import-execute', requireAuth(['SUPERADMIN', 'ADMIN_ELECTORAL']), async (req: AuthenticatedRequest, res) => {
  try {
    const { base64Data, mapping, sheetIndex } = req.body;
    const buffer = Buffer.from(base64Data.replace(/^data:.*,/, ''), 'base64');
    const result = await excelImportService.executeImport(buffer, mapping, sheetIndex || 0);

    await auditRepo.create({
      user_id: req.user?.userId || null,
      username: req.user?.username || 'system',
      action: 'IMPORT_EXCEL',
      details: `Importación de censo: ${result.inserted} creados, ${result.updated} actualizados de ${result.total} registros.`,
      ip_address: req.ip || '127.0.0.1'
    });

    res.json({ success: true, result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al ejecutar importación';
    res.status(500).json({ success: false, message: msg });
  }
});

/* ==========================================================================
   ESTADÍSTICAS Y REPORTES
   ========================================================================== */

router.get('/stats/:electionId', requireAuth(), async (req, res) => {
  try {
    const { electionId } = req.params;
    const stats = await votingService.getElectionStats(electionId);
    res.json({ success: true, stats });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al calcular estadísticas';
    res.status(500).json({ success: false, message: msg });
  }
});

router.get('/reports/:electionId/export-excel', requireAuth(), async (req, res) => {
  try {
    const { electionId } = req.params;
    const election = await electionRepo.findById(electionId);
    const stats = await votingService.getElectionStats(electionId);

    // 1. Hoja de Resultados Electorales Agregados
    const resultsData = stats.results.map(r => ({
      'Candidato / Opción': r.candidate_name,
      'Número de Lista': r.list_number || 'N/A',
      'Votos Obtenidos': r.votes_count,
      'Porcentaje (%)': `${r.percentage}%`
    }));

    // 2. Hoja de Participación por Cursos
    const participationData = stats.participation_by_course.map(p => ({
      'Grado': p.grade,
      'Curso': p.course,
      'Habilitados': p.total,
      'Votaron': p.voted,
      'Pendientes': p.pending,
      'Participación (%)': `${p.percentage}%`
    }));

    // 3. Hoja de Resumen General
    const summaryData = [
      { 'Métrica': 'Elección', 'Valor': election?.name || electionId },
      { 'Métrica': 'Año', 'Valor': election?.year || 2026 },
      { 'Métrica': 'Estado', 'Valor': election?.status || 'OPEN' },
      { 'Métrica': 'Censo Electoral (Habilitados)', 'Valor': stats.total_eligible_students },
      { 'Métrica': 'Total Votos Emitidos', 'Valor': stats.total_votes_cast },
      { 'Métrica': 'Votantes Pendientes', 'Valor': stats.total_pending_students },
      { 'Métrica': 'Porcentaje de Participación', 'Valor': `${stats.participation_percentage}%` },
      { 'Métrica': 'Fecha de Emisión del Reporte', 'Valor': new Date().toLocaleString() }
    ];

    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    const wsResults = XLSX.utils.json_to_sheet(resultsData);
    const wsParticipation = XLSX.utils.json_to_sheet(participationData);

    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen General');
    XLSX.utils.book_append_sheet(wb, wsResults, 'Resultados Electorales');
    XLSX.utils.book_append_sheet(wb, wsParticipation, 'Participación por Curso');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', `attachment; filename=Escrutinio_${electionId}_${Date.now()}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al exportar reporte Excel';
    res.status(500).json({ success: false, message: msg });
  }
});

/* ==========================================================================
   AUDITORÍA Y AJUSTES
   ========================================================================== */

router.get('/audit-logs', requireAuth(['SUPERADMIN']), async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 100;
    const logs = await auditRepo.findAll(limit);
    res.json({ success: true, logs });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al consultar logs';
    res.status(500).json({ success: false, message: msg });
  }
});

router.get('/settings', async (_req, res) => {
  try {
    const settings = await settingsRepo.getSettings();
    res.json({ success: true, settings });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al consultar configuración';
    res.status(500).json({ success: false, message: msg });
  }
});

router.put('/settings', requireAuth(['SUPERADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    await settingsRepo.updateSettings(req.body);
    await auditRepo.create({
      user_id: req.user?.userId || null,
      username: req.user?.username || 'system',
      action: 'UPDATE_SETTINGS',
      details: 'Actualización de configuración institucional del colegio',
      ip_address: req.ip || '127.0.0.1'
    });
    const updated = await settingsRepo.getSettings();
    res.json({ success: true, settings: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al actualizar configuración';
    res.status(500).json({ success: false, message: msg });
  }
});

export default router;
