import { executeRun } from './connection.js';

export async function runMigrations(): Promise<void> {
  console.log('[MIGRATIONS] Executing schema migrations...');

  // 1. Users Table
  await executeRun(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(150) NOT NULL,
      role VARCHAR(30) NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at VARCHAR(30) NOT NULL
    );
  `);

  // 2. Elections Table
  await executeRun(`
    CREATE TABLE IF NOT EXISTS elections (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      year VARCHAR(20) NOT NULL,
      description TEXT,
      start_at VARCHAR(30),
      end_at VARCHAR(30),
      status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
      allow_blank_vote INTEGER NOT NULL DEFAULT 1,
      show_live_results INTEGER NOT NULL DEFAULT 1,
      created_at VARCHAR(30) NOT NULL,
      updated_at VARCHAR(30) NOT NULL
    );
  `);

  // 3. Candidates Table
  await executeRun(`
    CREATE TABLE IF NOT EXISTS candidates (
      id VARCHAR(36) PRIMARY KEY,
      election_id VARCHAR(36) NOT NULL,
      full_name VARCHAR(150) NOT NULL,
      student_course VARCHAR(50) NOT NULL,
      list_number INTEGER NOT NULL,
      slogan VARCHAR(255),
      description TEXT,
      photo_url TEXT,
      display_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at VARCHAR(30) NOT NULL,
      updated_at VARCHAR(30) NOT NULL,
      FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE
    );
  `);

  // 4. Students Table
  await executeRun(`
    CREATE TABLE IF NOT EXISTS students (
      id VARCHAR(36) PRIMARY KEY,
      student_code VARCHAR(50) UNIQUE NOT NULL,
      full_name VARCHAR(150) NOT NULL,
      grade VARCHAR(20) NOT NULL,
      course VARCHAR(20) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
      created_at VARCHAR(30) NOT NULL,
      updated_at VARCHAR(30) NOT NULL
    );
  `);

  // 5. Voter Status Table (Control de Quién ya votó - Para prevenir doble voto)
  await executeRun(`
    CREATE TABLE IF NOT EXISTS voter_status (
      id VARCHAR(36) PRIMARY KEY,
      election_id VARCHAR(36) NOT NULL,
      student_id VARCHAR(36) NOT NULL,
      has_voted INTEGER NOT NULL DEFAULT 1,
      voted_at VARCHAR(30) NOT NULL,
      station_id VARCHAR(50),
      UNIQUE(election_id, student_id),
      FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );
  `);

  // 6. Anonymous Votes Table (Urna electrónica anónima - NUNCA vinculada a student_id)
  await executeRun(`
    CREATE TABLE IF NOT EXISTS votes (
      id VARCHAR(36) PRIMARY KEY,
      election_id VARCHAR(36) NOT NULL,
      candidate_id VARCHAR(36),
      is_blank INTEGER NOT NULL DEFAULT 0,
      created_at VARCHAR(30) NOT NULL,
      FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE
    );
  `);

  // 7. Temporary Voting Tokens (Autorización de un solo uso con caducidad)
  await executeRun(`
    CREATE TABLE IF NOT EXISTS voting_tokens (
      token_hash VARCHAR(64) PRIMARY KEY,
      election_id VARCHAR(36) NOT NULL,
      student_id VARCHAR(36) NOT NULL,
      expires_at VARCHAR(30) NOT NULL,
      is_consumed INTEGER NOT NULL DEFAULT 0,
      created_at VARCHAR(30) NOT NULL
    );
  `);

  // 8. Audit Logs Table
  await executeRun(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36),
      username VARCHAR(100) NOT NULL,
      action VARCHAR(100) NOT NULL,
      details TEXT,
      ip_address VARCHAR(45),
      created_at VARCHAR(30) NOT NULL
    );
  `);

  // 9. Settings Table
  await executeRun(`
    CREATE TABLE IF NOT EXISTS settings (
      id VARCHAR(36) PRIMARY KEY,
      school_name VARCHAR(150) NOT NULL,
      logo_url TEXT,
      primary_color VARCHAR(20) NOT NULL DEFAULT '#1e3a8a',
      secondary_color VARCHAR(20) NOT NULL DEFAULT '#0284c7',
      footer_text VARCHAR(255) NOT NULL DEFAULT 'Elecciones Democráticas de Personería Estudiantil',
      allow_qr_scanner INTEGER NOT NULL DEFAULT 1,
      allow_manual_id INTEGER NOT NULL DEFAULT 1,
      updated_at VARCHAR(30) NOT NULL
    );
  `);

  try {
    await executeRun(`ALTER TABLE settings ADD COLUMN restrict_by_ip INTEGER NOT NULL DEFAULT 0;`);
  } catch (e) {
    // Ignore if column already exists
  }
  
  try {
    await executeRun(`ALTER TABLE settings ADD COLUMN allowed_ips TEXT;`);
  } catch (e) {
    // Ignore if column already exists
  }

  console.log('[MIGRATIONS] Migrations completed successfully.');
}
