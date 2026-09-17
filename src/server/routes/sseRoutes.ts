import { Router } from 'express';
import { sseBroadcast } from '../services/sseBroadcastService.js';

const router = Router();

/**
 * GET /api/v1/events
 * Canal SSE para transmitir actualizaciones en vivo del escrutinio y participación
 */
router.get('/events', (req, res) => {
  // Configuración de cabeceras optimizadas para LiteSpeed / Nginx / Hostinger
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Desactiva el buffering de Nginx/LiteSpeed en Hostinger
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
      sseBroadcast.removeClient(res);
    }
  }, 25000);

  const cleanup = () => {
    clearInterval(keepAliveInterval);
    sseBroadcast.removeClient(res);
  };

  req.on('close', cleanup);
  req.on('end', cleanup);
  res.on('finish', cleanup);
  res.on('close', cleanup);
});

export default router;
