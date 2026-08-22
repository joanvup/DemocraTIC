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
 * POST /api/v1/voting/identify
 * Identifica al estudiante por código manual o lectura de QR
 */
router.post('/identify', async (req, res) => {
  try {
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
