import crypto from 'crypto';
import { executeGetOne, executeQuery, executeRun } from '../db/connection.js';
import { IUserRepository } from './interfaces.js';
import { User } from '../../shared/types.js';

export class UserRepository implements IUserRepository {
  async findByUsername(username: string): Promise<(User & { password_hash: string }) | null> {
    return executeGetOne<User & { password_hash: string }>(
      'SELECT id, username, password_hash, full_name, role, is_active, created_at FROM users WHERE username = ?',
      [username]
    );
  }

  async findById(id: string): Promise<User | null> {
    return executeGetOne<User>(
      'SELECT id, username, full_name, role, is_active, created_at FROM users WHERE id = ?',
      [id]
    );
  }

  async findAll(): Promise<User[]> {
    return executeQuery<User>(
      'SELECT id, username, full_name, role, is_active, created_at FROM users ORDER BY created_at DESC'
    );
  }

  async create(user: Omit<User, 'id' | 'created_at'> & { password_hash: string }): Promise<User> {
    const id = `usr-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    await executeRun(
      'INSERT INTO users (id, username, password_hash, full_name, role, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, user.username, user.password_hash, user.full_name, user.role, user.is_active ?? 1, now]
    );
    return {
      id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active ?? 1,
      created_at: now
    };
  }

  async update(id: string, user: Partial<Omit<User, 'id' | 'created_at'>> & { password_hash?: string }): Promise<void> {
    const fields: string[] = [];
    const values: (string | number)[] = [];

    if (user.username !== undefined) { fields.push('username = ?'); values.push(user.username); }
    if (user.full_name !== undefined) { fields.push('full_name = ?'); values.push(user.full_name); }
    if (user.role !== undefined) { fields.push('role = ?'); values.push(user.role); }
    if (user.is_active !== undefined) { fields.push('is_active = ?'); values.push(user.is_active); }
    if (user.password_hash !== undefined) { fields.push('password_hash = ?'); values.push(user.password_hash); }

    if (fields.length === 0) return;

    values.push(id);
    await executeRun(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  async delete(id: string): Promise<void> {
    await executeRun('DELETE FROM users WHERE id = ?', [id]);
  }
}
