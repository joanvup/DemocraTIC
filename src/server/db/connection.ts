import fs from 'fs';
import path from 'path';
import initSqlJs, { Database, SqlValue } from 'sql.js';

let dbInstance: Database | null = null;
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE_PATH = path.join(DATA_DIR, 'elections.sqlite');

export interface QueryResult<T = Record<string, unknown>> {
  rows: T[];
  changes?: number;
  lastInsertRowid?: number;
}

export async function getDbConnection(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE_PATH);
      dbInstance = new SQL.Database(fileBuffer);
    } catch (err: any) {
      console.error('Failed to load existing database (might be corrupted):', err.message);
      // Create backup and initialize new database
      const backupPath = DB_FILE_PATH + '.corrupt.' + Date.now();
      fs.renameSync(DB_FILE_PATH, backupPath);
      console.log(`Corrupted database backed up to ${backupPath}. Creating fresh database.`);
      dbInstance = new SQL.Database();
      persistDatabase(dbInstance);
    }
  } else {
    dbInstance = new SQL.Database();
    persistDatabase(dbInstance);
  }

  return dbInstance;
}

export function persistDatabase(db?: Database): void {
  const targetDb = db || dbInstance;
  if (!targetDb) return;
  try {
    const data = targetDb.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE_PATH, buffer);
  } catch (err) {
    console.error('Error persisting SQLite database to disk:', err);
  }
}

/**
 * Capa de abstracción de consultas SQL compatible con SQLite y preparada para MySQL
 */
export async function executeQuery<T = Record<string, unknown>>(
  sql: string,
  params: SqlValue[] = []
): Promise<T[]> {
  const db = await getDbConnection();
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const results: T[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as T);
    }
    stmt.free();
    return results;
  } catch (err) {
    console.error(`SQL Error in executeQuery: "${sql}"`, err);
    throw err;
  }
}

export async function executeGetOne<T = Record<string, unknown>>(
  sql: string,
  params: SqlValue[] = []
): Promise<T | null> {
  const rows = await executeQuery<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function executeRun(
  sql: string,
  params: SqlValue[] = []
): Promise<{ changes: number }> {
  const db = await getDbConnection();
  try {
    db.run(sql, params);
    persistDatabase(db);
    return { changes: db.getRowsModified() };
  } catch (err) {
    console.error(`SQL Error in executeRun: "${sql}"`, err);
    throw err;
  }
}

export async function executeTransaction<T>(
  callback: () => Promise<T>
): Promise<T> {
  const db = await getDbConnection();
  db.run('BEGIN TRANSACTION;');
  try {
    const result = await callback();
    db.run('COMMIT;');
    persistDatabase(db);
    return result;
  } catch (err) {
    db.run('ROLLBACK;');
    throw err;
  }
}
