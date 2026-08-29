import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

// SQLite fallback
import initSqlJs, { Database, SqlValue } from 'sql.js';
let sqliteDbInstance: Database | null = null;
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE_PATH = path.join(DATA_DIR, 'elections.sqlite');

export interface QueryResult<T = Record<string, unknown>> {
  rows: T[];
  changes?: number;
  lastInsertRowid?: number;
}

const isMysql = () => process.env.DATABASE_CLIENT === 'mysql';

export async function getMysqlConnection() {
  if (pool) return pool;

  const config: mysql.PoolOptions = {
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };

  // Priorizar variables individuales para evitar errores de parseo de URL
  // con contraseñas que contienen caracteres especiales (como @, #, etc.)
  if (process.env.DB_HOST) {
    config.host = process.env.DB_HOST;
    config.user = process.env.DB_USER || 'root';
    config.password = process.env.DB_PASSWORD || '';
    config.database = process.env.DB_NAME || 'elections';
    config.port = parseInt(process.env.DB_PORT || '3306', 10);
  } else if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('mysql://')) {
    config.uri = process.env.DATABASE_URL;
  } else {
    config.host = 'localhost';
    config.user = 'root';
    config.password = '';
    config.database = 'elections';
    config.port = 3306;
  }

  pool = mysql.createPool(config);

  const connection = await pool.getConnection();
  connection.release();
  console.log('[DB] Successfully connected to MySQL database');
  return pool;
}

export async function getSqliteConnection(): Promise<Database> {
  if (sqliteDbInstance) return sqliteDbInstance;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE_PATH);
      sqliteDbInstance = new SQL.Database(fileBuffer);
      // Validate database integrity to catch "unsupported file format" early
      sqliteDbInstance.exec('SELECT count(*) FROM sqlite_master;');
    } catch (err: any) {
      console.error('Failed to load existing database (might be corrupted):', err.message);
      const backupPath = DB_FILE_PATH + '.corrupt.' + Date.now();
      fs.renameSync(DB_FILE_PATH, backupPath);
      sqliteDbInstance = new SQL.Database();
      persistSqliteDatabase(sqliteDbInstance);
    }
  } else {
    sqliteDbInstance = new SQL.Database();
    persistSqliteDatabase(sqliteDbInstance);
  }

  return sqliteDbInstance;
}

export function persistSqliteDatabase(db?: Database): void {
  const targetDb = db || sqliteDbInstance;
  if (!targetDb) return;
  try {
    const data = targetDb.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE_PATH, buffer);
  } catch (err) {
    console.error('Error persisting SQLite database to disk:', err);
  }
}

export async function executeQuery<T = Record<string, unknown>>(
  sql: string,
  params: any[] = []
): Promise<T[]> {
  if (isMysql()) {
    const db = await getMysqlConnection();
    try {
      const [rows] = await db.query(sql, params);
      return rows as T[];
    } catch (err) {
      console.error(`SQL Error in executeQuery: "${sql}"`, err);
      throw err;
    }
  } else {
    const db = await getSqliteConnection();
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
}

export async function executeGetOne<T = Record<string, unknown>>(
  sql: string,
  params: any[] = []
): Promise<T | null> {
  const rows = await executeQuery<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function executeRun(
  sql: string,
  params: any[] = []
): Promise<{ changes: number }> {
  if (isMysql()) {
    const db = await getMysqlConnection();
    try {
      const [result] = await db.query(sql, params);
      const changes = (result as any).affectedRows || 0;
      return { changes };
    } catch (err) {
      console.error(`SQL Error in executeRun: "${sql}"`, err);
      throw err;
    }
  } else {
    const db = await getSqliteConnection();
    try {
      db.run(sql, params);
      persistSqliteDatabase(db);
      return { changes: db.getRowsModified() };
    } catch (err) {
      console.error(`SQL Error in executeRun: "${sql}"`, err);
      throw err;
    }
  }
}

export async function executeTransaction<T>(
  callback: () => Promise<T>
): Promise<T> {
  if (isMysql()) {
    const db = await getMysqlConnection();
    const connection = await db.getConnection();
    await connection.beginTransaction();
    try {
      const result = await callback();
      await connection.commit();
      connection.release();
      return result;
    } catch (err) {
      await connection.rollback();
      connection.release();
      throw err;
    }
  } else {
    const db = await getSqliteConnection();
    db.run('BEGIN TRANSACTION;');
    try {
      const result = await callback();
      db.run('COMMIT;');
      persistSqliteDatabase(db);
      return result;
    } catch (err) {
      db.run('ROLLBACK;');
      throw err;
    }
  }
}
