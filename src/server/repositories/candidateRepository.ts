import crypto from 'crypto';
import { executeGetOne, executeQuery, executeRun } from '../db/connection.js';
import { ICandidateRepository } from './interfaces.js';
import { Candidate } from '../../shared/types.js';

export class CandidateRepository implements ICandidateRepository {
  async findById(id: string): Promise<Candidate | null> {
    return executeGetOne<Candidate>(
      'SELECT id, election_id, full_name, student_course, list_number, slogan, description, photo_url, display_order, is_active, created_at, updated_at FROM candidates WHERE id = ?',
      [id]
    );
  }

  async findByElectionId(electionId: string): Promise<Candidate[]> {
    return executeQuery<Candidate>(
      'SELECT id, election_id, full_name, student_course, list_number, slogan, description, photo_url, display_order, is_active, created_at, updated_at FROM candidates WHERE election_id = ? AND is_active = 1 ORDER BY list_number ASC, display_order ASC',
      [electionId]
    );
  }

  async findAllByElection(electionId: string): Promise<Candidate[]> {
    return executeQuery<Candidate>(
      'SELECT id, election_id, full_name, student_course, list_number, slogan, description, photo_url, display_order, is_active, created_at, updated_at FROM candidates WHERE election_id = ? ORDER BY list_number ASC, display_order ASC',
      [electionId]
    );
  }

  async create(candidate: Omit<Candidate, 'id' | 'created_at' | 'updated_at'>): Promise<Candidate> {
    const id = `cand-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    await executeRun(
      `INSERT INTO candidates (id, election_id, full_name, student_course, list_number, slogan, description, photo_url, display_order, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        candidate.election_id,
        candidate.full_name,
        candidate.student_course,
        candidate.list_number,
        candidate.slogan ?? '',
        candidate.description ?? '',
        candidate.photo_url ?? '',
        candidate.display_order ?? candidate.list_number,
        candidate.is_active ?? 1,
        now,
        now
      ]
    );

    return {
      id,
      election_id: candidate.election_id,
      full_name: candidate.full_name,
      student_course: candidate.student_course,
      list_number: candidate.list_number,
      slogan: candidate.slogan ?? '',
      description: candidate.description ?? '',
      photo_url: candidate.photo_url ?? '',
      display_order: candidate.display_order ?? candidate.list_number,
      is_active: candidate.is_active ?? 1,
      created_at: now,
      updated_at: now
    };
  }

  async update(id: string, candidate: Partial<Omit<Candidate, 'id' | 'created_at' | 'updated_at'>>): Promise<void> {
    const fields: string[] = [];
    const values: (string | number)[] = [];

    if (candidate.full_name !== undefined) { fields.push('full_name = ?'); values.push(candidate.full_name); }
    if (candidate.student_course !== undefined) { fields.push('student_course = ?'); values.push(candidate.student_course); }
    if (candidate.list_number !== undefined) { fields.push('list_number = ?'); values.push(candidate.list_number); }
    if (candidate.slogan !== undefined) { fields.push('slogan = ?'); values.push(candidate.slogan); }
    if (candidate.description !== undefined) { fields.push('description = ?'); values.push(candidate.description); }
    if (candidate.photo_url !== undefined) { fields.push('photo_url = ?'); values.push(candidate.photo_url); }
    if (candidate.display_order !== undefined) { fields.push('display_order = ?'); values.push(candidate.display_order); }
    if (candidate.is_active !== undefined) { fields.push('is_active = ?'); values.push(candidate.is_active); }

    if (fields.length === 0) return;

    const now = new Date().toISOString();
    fields.push('updated_at = ?');
    values.push(now);

    values.push(id);
    await executeRun(`UPDATE candidates SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  async delete(id: string): Promise<void> {
    await executeRun('DELETE FROM candidates WHERE id = ?', [id]);
  }
}
