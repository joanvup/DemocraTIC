import crypto from 'crypto';
import { executeQuery, executeRun } from '../db/connection.js';
import { MachineVotingLog, MachineAuditSummary, MachineStat } from '../../shared/types.js';

export class MachineLogRepository {
  async createLog(data: {
    election_id: string;
    station_id: string;
    ip_address: string;
    device_type?: string;
    os_name?: string;
    browser_name?: string;
    screen_resolution?: string;
    student_course?: string;
    user_agent?: string;
  }): Promise<void> {
    const id = `mlog-${crypto.randomUUID()}`;
    const votedAt = new Date().toISOString();

    await executeRun(
      `INSERT INTO machine_voting_logs (
        id, election_id, station_id, ip_address, device_type, os_name, browser_name, screen_resolution, student_course, voted_at, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.election_id,
        data.station_id || 'STATION-DEFAULT',
        data.ip_address || '127.0.0.1',
        data.device_type || 'Desktop',
        data.os_name || 'Desconocido',
        data.browser_name || 'Navegador Web',
        data.screen_resolution || '',
        data.student_course || '',
        votedAt,
        data.user_agent || ''
      ]
    );
  }

  async getRecentLogs(electionId?: string, limit: number = 200): Promise<MachineVotingLog[]> {
    if (electionId) {
      return executeQuery<MachineVotingLog>(
        `SELECT id, election_id, station_id, ip_address, device_type, os_name, browser_name, screen_resolution, student_course, voted_at
         FROM machine_voting_logs
         WHERE election_id = ?
         ORDER BY voted_at DESC
         LIMIT ?`,
        [electionId, limit]
      );
    }
    return executeQuery<MachineVotingLog>(
      `SELECT id, election_id, station_id, ip_address, device_type, os_name, browser_name, screen_resolution, student_course, voted_at
       FROM machine_voting_logs
       ORDER BY voted_at DESC
       LIMIT ?`,
      [limit]
    );
  }

  async getSummary(electionId?: string): Promise<MachineAuditSummary> {
    const whereClause = electionId ? 'WHERE election_id = ?' : '';
    const params = electionId ? [electionId] : [];

    const totalRows = await executeQuery<{ total: number; unique_stations: number; unique_ips: number }>(
      `SELECT 
         COUNT(*) as total,
         COUNT(DISTINCT station_id) as unique_stations,
         COUNT(DISTINCT ip_address) as unique_ips
       FROM machine_voting_logs ${whereClause}`,
      params
    );

    const total_votes = totalRows[0]?.total || 0;
    const unique_machines = totalRows[0]?.unique_stations || 0;
    const unique_ips = totalRows[0]?.unique_ips || 0;

    interface RawMachineRow {
      station_id: string;
      ip_address: string;
      device_type: string;
      os_name: string;
      browser_name: string;
      total_votes: number;
      first_vote_at: string;
      last_vote_at: string;
      courses_str: string | null;
    }

    const rawMachines = await executeQuery<RawMachineRow>(
      `SELECT 
         station_id,
         ip_address,
         device_type,
         os_name,
         browser_name,
         COUNT(*) as total_votes,
         MIN(voted_at) as first_vote_at,
         MAX(voted_at) as last_vote_at,
         GROUP_CONCAT(DISTINCT student_course) as courses_str
       FROM machine_voting_logs
       ${whereClause}
       GROUP BY station_id, ip_address, device_type, os_name, browser_name
       ORDER BY total_votes DESC`,
      params
    );

    const machines: MachineStat[] = rawMachines.map(row => {
      const courses = row.courses_str
        ? row.courses_str.split(',').filter(c => Boolean(c && c.trim()))
        : [];
      return {
        station_id: row.station_id,
        ip_address: row.ip_address,
        device_type: row.device_type || 'Desktop',
        os_name: row.os_name || 'Desconocido',
        browser_name: row.browser_name || 'Navegador',
        total_votes: Number(row.total_votes),
        first_vote_at: row.first_vote_at,
        last_vote_at: row.last_vote_at,
        courses
      };
    });

    const recent_logs = await this.getRecentLogs(electionId, 150);

    return {
      total_votes,
      unique_machines,
      unique_ips,
      machines,
      recent_logs
    };
  }
}
