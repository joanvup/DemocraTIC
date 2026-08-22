import crypto from 'crypto';
import { executeGetOne, executeQuery, executeRun, executeTransaction } from '../db/connection.js';
import { IStudentRepository } from './interfaces.js';
import { Student } from '../../shared/types.js';

export class StudentRepository implements IStudentRepository {
  async findById(id: string): Promise<Student | null> {
    return executeGetOne<Student>(
      'SELECT id, student_code, full_name, grade, course, status, created_at, updated_at FROM students WHERE id = ?',
      [id]
    );
  }

  async findByCode(studentCode: string): Promise<Student | null> {
    if (!studentCode) return null;
    const cleaned = String(studentCode).replace(/[\u200B-\u200D\uFEFF\r\n\t]/g, '').trim();
    if (!cleaned) return null;

    // 1. Coincidencia directa exacta (insensible a mayúsculas/minúsculas)
    const direct = await executeGetOne<Student>(
      'SELECT id, student_code, full_name, grade, course, status, created_at, updated_at FROM students WHERE LOWER(TRIM(student_code)) = LOWER(?)',
      [cleaned]
    );
    if (direct) return direct;

    // 2. Coincidencia por ID de registro (ej. std-real-5306 o std-1)
    const byId = await executeGetOne<Student>(
      'SELECT id, student_code, full_name, grade, course, status, created_at, updated_at FROM students WHERE id = ?',
      [cleaned]
    );
    if (byId) return byId;

    // 3. Normalización numérica sin ceros a la izquierda (ej: "005306" -> "5306" o viceversa)
    const digitsMatch = cleaned.match(/\d+/);
    if (digitsMatch) {
      const digits = digitsMatch[0];
      const strippedDigits = digits.replace(/^0+/, '');
      
      const numMatch = await executeGetOne<Student>(
        'SELECT id, student_code, full_name, grade, course, status, created_at, updated_at FROM students WHERE TRIM(student_code) = ? OR TRIM(student_code) = ? OR TRIM(student_code) = ?',
        [digits, strippedDigits.length > 0 ? strippedDigits : digits, `0${digits}`]
      );
      if (numMatch) return numMatch;
    }

    // 4. Búsqueda si el código del estudiante está contenido dentro del payload escaneado (ej: URL o texto largo)
    const allStudents = await executeQuery<Student>('SELECT id, student_code, full_name, grade, course, status, created_at, updated_at FROM students');
    for (const st of allStudents) {
      const stCode = (st.student_code || '').trim().toLowerCase();
      if (!stCode) continue;
      const lowerCleaned = cleaned.toLowerCase();
      if (lowerCleaned === stCode || lowerCleaned.includes(stCode) || stCode.includes(lowerCleaned)) {
        return st;
      }
    }

    return null;
  }

  async findAll(search?: string, grade?: string, course?: string): Promise<Student[]> {
    let sql = 'SELECT id, student_code, full_name, grade, course, status, created_at, updated_at FROM students WHERE 1=1';
    const params: string[] = [];

    if (search && search.trim()) {
      sql += ' AND (student_code LIKE ? OR full_name LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    if (grade && grade.trim()) {
      sql += ' AND grade = ?';
      params.push(grade.trim());
    }

    if (course && course.trim()) {
      sql += ' AND course = ?';
      params.push(course.trim());
    }

    sql += ' ORDER BY course ASC, full_name ASC';
    return executeQuery<Student>(sql, params);
  }

  async create(student: Omit<Student, 'id' | 'created_at' | 'updated_at'>): Promise<Student> {
    const id = `std-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    await executeRun(
      'INSERT INTO students (id, student_code, full_name, grade, course, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        student.student_code.trim(),
        student.full_name.trim(),
        student.grade.trim(),
        student.course.trim(),
        student.status || 'ACTIVE',
        now,
        now
      ]
    );

    return {
      id,
      student_code: student.student_code.trim(),
      full_name: student.full_name.trim(),
      grade: student.grade.trim(),
      course: student.course.trim(),
      status: student.status || 'ACTIVE',
      created_at: now,
      updated_at: now
    };
  }

  async createBatch(students: Array<Omit<Student, 'id' | 'created_at' | 'updated_at'>>): Promise<{ created: number; skipped: number }> {
    return executeTransaction(async () => {
      let created = 0;
      let skipped = 0;
      const now = new Date().toISOString();

      for (const s of students) {
        const existing = await this.findByCode(s.student_code);
        if (existing) {
          // Update existing student
          await this.update(existing.id, {
            full_name: s.full_name,
            grade: s.grade,
            course: s.course,
            status: s.status || 'ACTIVE'
          });
          skipped++;
        } else {
          const id = `std-${crypto.randomUUID()}`;
          await executeRun(
            'INSERT INTO students (id, student_code, full_name, grade, course, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [
              id,
              s.student_code.trim(),
              s.full_name.trim(),
              s.grade.trim(),
              s.course.trim(),
              s.status || 'ACTIVE',
              now,
              now
            ]
          );
          created++;
        }
      }

      return { created, skipped };
    });
  }

  async update(id: string, student: Partial<Omit<Student, 'id' | 'created_at' | 'updated_at'>>): Promise<void> {
    const fields: string[] = [];
    const values: (string | number)[] = [];

    if (student.student_code !== undefined) { fields.push('student_code = ?'); values.push(student.student_code.trim()); }
    if (student.full_name !== undefined) { fields.push('full_name = ?'); values.push(student.full_name.trim()); }
    if (student.grade !== undefined) { fields.push('grade = ?'); values.push(student.grade.trim()); }
    if (student.course !== undefined) { fields.push('course = ?'); values.push(student.course.trim()); }
    if (student.status !== undefined) { fields.push('status = ?'); values.push(student.status); }

    if (fields.length === 0) return;

    const now = new Date().toISOString();
    fields.push('updated_at = ?');
    values.push(now);

    values.push(id);
    await executeRun(`UPDATE students SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  async delete(id: string): Promise<void> {
    await executeRun('DELETE FROM students WHERE id = ?', [id]);
  }

  async countTotal(): Promise<number> {
    const res = await executeGetOne<{ count: number }>("SELECT COUNT(*) as count FROM students WHERE status = 'ACTIVE'");
    return res ? Number(res.count) : 0;
  }
}
