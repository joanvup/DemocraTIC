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
}
