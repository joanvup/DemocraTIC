import cookieParser from 'cookie-parser';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { runMigrations } from './src/server/db/migrations.js';
import { seedDatabase } from './src/server/db/seed.js';
import adminRoutes from './src/server/routes/adminRoutes.js';
import sseRoutes from './src/server/routes/sseRoutes.js';
import votingRoutes from './src/server/routes/votingRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middlewares estándar
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));
  app.use(cookieParser());

  // Ejecutar migraciones e inicialización de SQLite
  try {
    await runMigrations();
    await seedDatabase();
  } catch (err) {
    console.error('Error al inicializar la base de datos:', err);
  }

  // Rutas de API
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  app.use('/api/v1/voting', votingRoutes);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1', sseRoutes);

  // Manejador 404 para cualquier ruta /api/* no capturada
  app.all('/api/*', (_req, res) => {
    res.status(404).json({ success: false, message: 'Ruta API no encontrada' });
  });

  // Vite Middleware para desarrollo o archivos estáticos para producción
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🗳️ Servidor de Elecciones Escolares activo en http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fallo al iniciar el servidor:', err);
});
