import bcrypt from 'bcryptjs';
import { executeGetOne, executeRun } from './connection.js';

export async function seedDatabase(): Promise<void> {
  const now = new Date().toISOString();

  // Asegurar siempre la presencia de los estudiantes con códigos de los carnets físicos reales
  const realStudents = [
    { code: '5306', name: 'Andrés Felipe Morales Castro', grade: '10', course: '10A' },
    { code: '5729', name: 'Mariana Sofía Gómez Rueda', grade: '11', course: '11A' },
    { code: '5732', name: 'Juan Diego Hernández Silva', grade: '11', course: '11B' },
    { code: '5743', name: 'Valeria Valentina Torres Ruiz', grade: '10', course: '10B' },
    { code: '5748', name: 'Sebastián Camilo López Mendoza', grade: '9', course: '9A' },
  ];

  for (const rs of realStudents) {
    const existing = await executeGetOne<{ id: string }>('SELECT id FROM students WHERE student_code = ?', [rs.code]);
    if (!existing) {
      await executeRun(
        `INSERT INTO students (id, student_code, full_name, grade, course, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [`std-real-${rs.code}`, rs.code, rs.name, rs.grade, rs.course, 'ACTIVE', now, now]
      );
    }
  }

  // Check if admin user exists
  const existingAdmin = await executeGetOne<{ id: string }>('SELECT id FROM users WHERE username = ?', ['admin']);
  if (existingAdmin) {
    console.log('[SEED] Database already contains initial admin & general seed.');
    return;
  }

  console.log('[SEED] Seeding database with initial users, election, candidates, and 100 students...');

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
    `INSERT INTO settings (id, school_name, logo_url, primary_color, secondary_color, footer_text, allow_qr_scanner, allow_manual_id, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      'set-default-1',
      'Colegio Bilingüe San Patricio',
      'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=160&auto=format&fit=crop&q=80',
      '#1e3a8a',
      '#0284c7',
      'Gobierno Escolar y Democracia Participativa 2026',
      1,
      1,
      now
    ]
  );

  // 3. Create Default Election
  const electionId = 'elec-personero-2026';
  await executeRun(
    `INSERT INTO elections (id, name, year, description, start_at, end_at, status, allow_blank_vote, show_live_results, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      electionId,
      'Elecciones de Personero Estudiantil 2026-2027',
      '2026-2027',
      'Jornada democrática oficial para la elección del Personero Estudiantil del Colegio Bilingüe.',
      '2026-08-22T08:00:00.000Z',
      '2026-08-22T16:00:00.000Z',
      'OPEN', // Ready for immediate testing
      1, // Voto en blanco habilitado
      1, // Resultados en vivo
      now,
      now
    ]
  );

  // 4. Create 5 Candidates
  const candidatesData = [
    {
      id: 'cand-1',
      name: 'Sofía Valentina Morales',
      course: '11A',
      number: 1,
      slogan: '"Liderazgo con Acción, Voces con Solución"',
      description: 'Propuesta enfocada en bienestar estudiantil, actividades extracurriculares de robótica y mediación estudiantil.',
      photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
      order: 1
    },
    {
      id: 'cand-2',
      name: 'Mateo Alejandro Gómez',
      course: '11B',
      number: 2,
      slogan: '"Innovación, Deporte y Convivencia"',
      description: 'Impulso a torneos intercolegiales, renovación de zonas verdes y digitalización de biblioteca.',
      photo: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&auto=format&fit=crop&q=80',
      order: 2
    },
    {
      id: 'cand-3',
      name: 'Camila Andrea Restrepo',
      course: '11A',
      number: 3,
      slogan: '"Compromiso Real por los Derechos de Todos"',
      description: 'Defensa activa de los derechos del estudiante, tutorías académicas entre pares y talleres de salud mental.',
      photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80',
      order: 3
    },
    {
      id: 'cand-4',
      name: 'Nicolás David Herrera',
      course: '11B',
      number: 4,
      slogan: '"Un Colegio Sostenible e Inclusivo"',
      description: 'Campaña ecológica de reciclaje institucional, accesibilidad para todos los estudiantes y viernes culturales.',
      photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
      order: 4
    },
    {
      id: 'cand-5',
      name: 'Valeria Isabel Vargas',
      course: '11A',
      number: 5,
      slogan: '"Transparencia, Unión y Excelencia"',
      description: 'Presupuesto participativo estudiantil, buzón digital de quejas y sugerencias, y feria de orientación vocacional.',
      photo: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300&auto=format&fit=crop&q=80',
      order: 5
    }
  ];

  for (const c of candidatesData) {
    await executeRun(
      `INSERT INTO candidates (id, election_id, full_name, student_course, list_number, slogan, description, photo_url, display_order, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [c.id, electionId, c.name, c.course, c.number, c.slogan, c.description, c.photo, c.order, 1, now, now]
    );
  }

  // 5. Create 100 Students across 10 Courses (1A, 1B, 2A, 2B, 3A, 3B, 4A, 4B, 5A, 5B)
  const courses = [
    { grade: '1', course: '1A' },
    { grade: '1', course: '1B' },
    { grade: '2', course: '2A' },
    { grade: '2', course: '2B' },
    { grade: '3', course: '3A' },
    { grade: '3', course: '3B' },
    { grade: '4', course: '4A' },
    { grade: '4', course: '4B' },
    { grade: '5', course: '5A' },
    { grade: '5', course: '5B' },
  ];

  const firstNames = ['Lucas', 'Martina', 'Santiago', 'Lucía', 'Mateo', 'Emma', 'Daniel', 'Isabella', 'Alejandro', 'Salomé', 'Samuel', 'Mia', 'Gabriel', 'Antonella', 'Diego', 'Mariana', 'Nicolás', 'Samantha', 'Joaquín', 'Paula'];
  const lastNames = ['Rodríguez', 'González', 'Martínez', 'García', 'López', 'Hernández', 'Pérez', 'Sánchez', 'Ramírez', 'Torres', 'Díaz', 'Vargas', 'Castro', 'Romero', 'Suárez', 'Morales', 'Jiménez', 'Ortiz', 'Silva', 'Mendoza'];

  let studentIndex = 1;
  for (const c of courses) {
    for (let i = 1; i <= 10; i++) {
      const code = `2026${String(studentIndex).padStart(4, '0')}`; // e.g. 20260001 to 20260100
      const fn = firstNames[(studentIndex + i) % firstNames.length];
      const ln1 = lastNames[(studentIndex * 2) % lastNames.length];
      const ln2 = lastNames[(studentIndex * 3 + 1) % lastNames.length];
      const fullName = `${fn} ${ln1} ${ln2}`;

      await executeRun(
        `INSERT INTO students (id, student_code, full_name, grade, course, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [`std-${studentIndex}`, code, fullName, c.grade, c.course, 'ACTIVE', now, now]
      );

      studentIndex++;
    }
  }

  // Log initial audit
  await executeRun(
    `INSERT INTO audit_logs (id, user_id, username, action, details, ip_address, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    ['aud-seed-1', 'usr-admin-1', 'system', 'INITIAL_SEED', 'Base de datos inicializada con 100 estudiantes, 5 candidatos y 1 elección.', '127.0.0.1', now]
  );

  console.log(`[SEED] Success! Seeded 100 students (20260001 - 20260100), 5 candidates, 2 users.`);
}
