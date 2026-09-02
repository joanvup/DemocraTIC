import crypto from 'crypto';
import { executeQuery, executeRun } from '../db/connection.js';
import { IAuditRepository } from './interfaces.js';
import { AuditLog } from '../../shared/types.js';

export class AuditRepository implements IAuditRepository {
  async create(log: Omit<AuditLog, 'id' | 'created_at'>): Promise<void> {
    const id = `aud-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    await executeRun(
      'INSERT INTO audit_logs (id, user_id, username, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, log.user_id || null, log.username, log.action, log.details || '', log.ip_address || '127.0.0.1', now]
    );
  }

  async findAll(limit: number = 100): Promise<AuditLog[]> {
    return executeQuery<AuditLog>(
      'SELECT id, user_id, username, action, details, ip_address, created_at FROM audit_logs ORDER BY created_at DESC LIMIT ?',
      [limit]
    );
  }

  async getVoteFlow(): Promise<Array<{time: string, votes: number}>> {
    const rows = await executeQuery<{created_at: string}>(`
      SELECT created_at
      FROM audit_logs
      WHERE action = 'VOTO_EMITIDO'
      ORDER BY created_at ASC
    `);
    
    const flowMap = new Map<string, number>();
    for (const r of rows) {
      // created_at is expected to be ISO string like '2026-09-02T11:42:23.000Z'
      const timeHour = r.created_at.substring(0, 13) + ':00:00Z'; 
      flowMap.set(timeHour, (flowMap.get(timeHour) || 0) + 1);
    }

    return Array.from(flowMap.entries()).map(([time, votes]) => ({ time, votes }));
  }
}
