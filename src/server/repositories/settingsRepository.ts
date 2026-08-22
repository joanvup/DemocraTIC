import { executeGetOne, executeRun } from '../db/connection.js';
import { ISettingsRepository } from './interfaces.js';
import { SchoolSettings } from '../../shared/types.js';

export class SettingsRepository implements ISettingsRepository {
  async getSettings(): Promise<SchoolSettings> {
    const settings = await executeGetOne<SchoolSettings>(
      'SELECT id, school_name, logo_url, primary_color, secondary_color, footer_text, allow_qr_scanner, allow_manual_id, updated_at FROM settings LIMIT 1'
    );

    if (settings) {
      return settings;
    }

    // Default fallback
    const now = new Date().toISOString();
    return {
      id: 'default',
      school_name: 'Colegio Bilingüe San Patricio',
      logo_url: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=160&auto=format&fit=crop&q=80',
      primary_color: '#1e3a8a',
      secondary_color: '#0284c7',
      footer_text: 'Elecciones Democráticas de Personería Estudiantil',
      allow_qr_scanner: 1,
      allow_manual_id: 1,
      updated_at: now
    };
  }

  async updateSettings(settings: Partial<Omit<SchoolSettings, 'id' | 'updated_at'>>): Promise<void> {
    const fields: string[] = [];
    const values: (string | number)[] = [];

    if (settings.school_name !== undefined) { fields.push('school_name = ?'); values.push(settings.school_name); }
    if (settings.logo_url !== undefined) { fields.push('logo_url = ?'); values.push(settings.logo_url); }
    if (settings.primary_color !== undefined) { fields.push('primary_color = ?'); values.push(settings.primary_color); }
    if (settings.secondary_color !== undefined) { fields.push('secondary_color = ?'); values.push(settings.secondary_color); }
    if (settings.footer_text !== undefined) { fields.push('footer_text = ?'); values.push(settings.footer_text); }
    if (settings.allow_qr_scanner !== undefined) { fields.push('allow_qr_scanner = ?'); values.push(settings.allow_qr_scanner); }
    if (settings.allow_manual_id !== undefined) { fields.push('allow_manual_id = ?'); values.push(settings.allow_manual_id); }

    if (fields.length === 0) return;

    const now = new Date().toISOString();
    fields.push('updated_at = ?');
    values.push(now);

    await executeRun(`UPDATE settings SET ${fields.join(', ')}`, values);
  }
}
