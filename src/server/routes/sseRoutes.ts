import { Router } from 'express';
import { sseBroadcast } from '../services/sseBroadcastService.js';

const router = Router();

/**
 * GET /api/v1/events
 * Canal SSE para transmitir actualizaciones en vivo del escrutinio y participación
 */
router.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Enviar mensaje de bienvenida / handshake
  res.write(`event: connected\ndata: ${JSON.stringify({ timestamp: Date.now() })}\n\n`);

  sseBroadcast.addClient(res);

  // Mantener vivo con un ping cada 25 segundos
  const keepAliveInterval = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(keepAliveInterval);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(keepAliveInterval);
  });
});

export default router;
