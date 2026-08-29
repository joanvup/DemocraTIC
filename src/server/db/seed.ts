import bcrypt from 'bcryptjs';
import { executeGetOne, executeRun } from './connection.js';

export async function seedDatabase(): Promise<void> {
  const now = new Date().toISOString();

  // Check if admin user exists
  const existingAdmin = await executeGetOne<{ id: string }>('SELECT id FROM users WHERE username = ?', ['admin']);
  if (existingAdmin) {
    console.log('[SEED] Database already contains initial admin. Skipping seed.');
    return;
  }

  console.log('[SEED] Initializing clean database with only required system accounts...');

  // 1. Create Default Users
  const salt = bcrypt.genSaltSync(10);
  const adminPasswordHash = bcrypt.hashSync('Admin2026!*', salt);
  const monitorPasswordHash = bcrypt.hashSync('Monitor2026!*', salt);

  await executeRun(
    `INSERT INTO users (id, username, password_hash, full_name, role, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    ['usr-admin-1', 'admin', adminPasswordHash, 'Administrador Electoral Principal', 'SUPERADMIN', 1, now]
  );

  await executeRun(
    `INSERT INTO users (id, username, password_hash, full_name, role, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    ['usr-monitor-1', 'monitor', monitorPasswordHash, 'Monitor de Estación', 'MONITOR', 1, now]
  );

  // 2. Create Default School Settings
  await executeRun(
    `INSERT INTO settings (id, school_name, logo_url, primary_color, secondary_color, footer_text, allow_qr_scanner, allow_manual_id, restrict_by_ip, allowed_ips, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      'set-default-1',
      'Colegio Bilingüe San Patricio',
      'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=160&auto=format&fit=crop&q=80',
      '#1e3a8a',
      '#0284c7',
      'Gobierno Escolar y Democracia Participativa 2026',
      1,
      1,
      0,
      '',
      now
    ]
  );

  // Log initial audit
  await executeRun(
    `INSERT INTO audit_logs (id, user_id, username, action, details, ip_address, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    ['aud-seed-1', 'usr-admin-1', 'system', 'INITIAL_SEED', 'Base de datos inicializada de forma limpia (sin datos de prueba).', '127.0.0.1', now]
  );

  console.log(`[SEED] Success! Seeded only required system accounts (admin, monitor).`);
}
