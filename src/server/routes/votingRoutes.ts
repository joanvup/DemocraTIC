import { Router } from 'express';
import { CandidateRepository } from '../repositories/candidateRepository.js';
import { ElectionRepository } from '../repositories/electionRepository.js';
import { SettingsRepository } from '../repositories/settingsRepository.js';
import { StudentRepository } from '../repositories/studentRepository.js';
import { VoteRepository } from '../repositories/voteRepository.js';
import { VotingService } from '../services/votingService.js';
import { CastVoteRequest, IdentifyStudentRequest } from '../../shared/types.js';

const router = Router();

const electionRepo = new ElectionRepository();
const candidateRepo = new CandidateRepository();
const studentRepo = new StudentRepository();
const voteRepo = new VoteRepository();
const settingsRepo = new SettingsRepository();

const votingService = new VotingService(electionRepo, candidateRepo, studentRepo, voteRepo);

function getClientIp(req: any): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? (typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded[0]) : req.socket.remoteAddress;
  return ip ? ip.trim() : '';
}

function checkIpRestriction(clientIp: string, settings: any): boolean {
  if (settings.restrict_by_ip !== 1) return true;
  if (!settings.allowed_ips) return false;
  
  if (clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === '::ffff:127.0.0.1') {
    return true;
  }

  const allowed = settings.allowed_ips.split(',').map(i => i.trim());
  return allowed.includes(clientIp);
}

/**
 * GET /api/v1/voting/active-election
 * Retorna la información pública de la jornada y ajustes del colegio
 */
router.get('/active-election', async (req, res) => {
  try {
    const election = await electionRepo.findActive();
    const settings = await settingsRepo.getSettings();

    res.json({
      success: true,
      election,
      settings
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al obtener la elección activa';
    res.status(500).json({ success: false, message: msg });
  }
});

/**
 * GET /api/v1/voting/candidates
 * Retorna los candidatos oficiales activos de la elección actual desde la base de datos
 */
router.get('/candidates', async (req, res) => {
  try {
    const electionId = req.query.election_id as string;
    let election = null;
    if (electionId) {
      election = await electionRepo.findById(electionId);
    } else {
      election = await electionRepo.findActive();
    }

    if (!election) {
      res.json({ success: true, candidates: [] });
      return;
    }

    const candidates = await candidateRepo.findByElectionId(election.id);
    res.json({
      success: true,
      election,
      candidates
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al obtener los candidatos';
    res.status(500).json({ success: false, message: msg });
  }
});

/**
 * POST /api/v1/voting/identify
 * Identifica al estudiante por código manual o lectura de QR
 */
router.post('/identify', async (req, res) => {
  try {
    const settings = await settingsRepo.getSettings();
    const clientIp = getClientIp(req);
    if (!checkIpRestriction(clientIp, settings)) {
      res.status(403).json({ success: false, message: 'Acceso Denegado: Fuera de la red del colegio.' });
      return;
    }

    const body = req.body as IdentifyStudentRequest;
    const result = await votingService.identifyStudent({
      studentCode: body.student_code,
      qrPayload: body.qr_payload,
      electionId: body.election_id,
      stationId: body.station_id || req.ip || 'station-1'
    });

    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error en la identificación del estudiante';
    res.status(500).json({ success: false, message: msg });
  }
});

/**
 * POST /api/v1/voting/cast
 * Emite el voto anónimo y de un solo uso
 */
router.post('/cast', async (req, res) => {
  try {
    const body = req.body as CastVoteRequest;
    const result = await votingService.castVote({
      votingToken: body.voting_token,
      candidateId: body.candidate_id,
      isBlank: body.is_blank,
      stationId: body.station_id || req.ip || 'station-1'
    });

    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al procesar el voto';
    res.status(500).json({ success: false, message: msg });
  }
});

/**
 * GET /api/v1/voting/public-results
 * Resultados públicos para pantalla gigante / videobeam
 */
router.get('/public-results', async (req, res) => {
  try {
    const election = await electionRepo.findActive();
    if (!election) {
      res.status(404).json({ success: false, message: 'No hay elección disponible.' });
      return;
    }

    const settings = await settingsRepo.getSettings();

    if (election.show_live_results !== 1 && election.status !== 'CLOSED' && election.status !== 'FINISHED') {
      res.json({
        success: true,
        election,
        settings,
        is_hidden: true,
        message: 'Los resultados se harán públicos al cierre oficial de la jornada electoral.'
      });
      return;
    }

    const stats = await votingService.getElectionStats(election.id);
    res.json({
      success: true,
      election,
      settings,
      is_hidden: false,
      stats
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al obtener resultados públicos';
    res.status(500).json({ success: false, message: msg });
  }
});

export default router;
