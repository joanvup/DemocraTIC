import crypto from 'crypto';
import { executeGetOne, executeQuery, executeRun } from '../db/connection.js';
import { IElectionRepository } from './interfaces.js';
import { Election } from '../../shared/types.js';

export class ElectionRepository implements IElectionRepository {
  async findById(id: string): Promise<Election | null> {
    return executeGetOne<Election>(
      'SELECT id, name, year, description, start_at, end_at, status, allow_blank_vote, show_live_results, created_at, updated_at FROM elections WHERE id = ?',
      [id]
    );
  }

  async findActive(): Promise<Election | null> {
    // Prefer OPEN, then SCHEDULED, otherwise latest
    const openElection = await executeGetOne<Election>(
      "SELECT id, name, year, description, start_at, end_at, status, allow_blank_vote, show_live_results, created_at, updated_at FROM elections WHERE status = 'OPEN' ORDER BY created_at DESC LIMIT 1"
    );
    if (openElection) return openElection;

    const scheduledElection = await executeGetOne<Election>(
      "SELECT id, name, year, description, start_at, end_at, status, allow_blank_vote, show_live_results, created_at, updated_at FROM elections WHERE status = 'SCHEDULED' ORDER BY start_at ASC, created_at DESC LIMIT 1"
    );
    if (scheduledElection) return scheduledElection;

    return executeGetOne<Election>(
      'SELECT id, name, year, description, start_at, end_at, status, allow_blank_vote, show_live_results, created_at, updated_at FROM elections ORDER BY created_at DESC LIMIT 1'
    );
  }

  async findAll(): Promise<Election[]> {
    return executeQuery<Election>(
      'SELECT id, name, year, description, start_at, end_at, status, allow_blank_vote, show_live_results, created_at, updated_at FROM elections ORDER BY year DESC, created_at DESC'
    );
  }

  async create(election: Omit<Election, 'id' | 'created_at' | 'updated_at'>): Promise<Election> {
    const id = `elec-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    await executeRun(
      `INSERT INTO elections (id, name, year, description, start_at, end_at, status, allow_blank_vote, show_live_results, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        election.name,
        election.year,
        election.description ?? '',
        election.start_at ?? now,
        election.end_at ?? now,
        election.status ?? 'DRAFT',
        election.allow_blank_vote ?? 1,
        election.show_live_results ?? 1,
        now,
        now
      ]
    );

    return {
      id,
      name: election.name,
      year: election.year,
      description: election.description ?? '',
      start_at: election.start_at ?? now,
      end_at: election.end_at ?? now,
      status: election.status ?? 'DRAFT',
      allow_blank_vote: election.allow_blank_vote ?? 1,
      show_live_results: election.show_live_results ?? 1,
      created_at: now,
      updated_at: now
    };
  }

  async update(id: string, election: Partial<Omit<Election, 'id' | 'created_at' | 'updated_at'>>): Promise<void> {
    const fields: string[] = [];
    const values: (string | number)[] = [];

    if (election.name !== undefined) { fields.push('name = ?'); values.push(election.name); }
    if (election.year !== undefined) { fields.push('year = ?'); values.push(election.year); }
    if (election.description !== undefined) { fields.push('description = ?'); values.push(election.description); }
    if (election.start_at !== undefined) { fields.push('start_at = ?'); values.push(election.start_at); }
    if (election.end_at !== undefined) { fields.push('end_at = ?'); values.push(election.end_at); }
    if (election.status !== undefined) { fields.push('status = ?'); values.push(election.status); }
    if (election.allow_blank_vote !== undefined) { fields.push('allow_blank_vote = ?'); values.push(election.allow_blank_vote); }
    if (election.show_live_results !== undefined) { fields.push('show_live_results = ?'); values.push(election.show_live_results); }

    if (fields.length === 0) return;

    const now = new Date().toISOString();
    fields.push('updated_at = ?');
    values.push(now);

    values.push(id);
    await executeRun(`UPDATE elections SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  async delete(id: string): Promise<void> {
    await executeRun('DELETE FROM elections WHERE id = ?', [id]);
  }
}
