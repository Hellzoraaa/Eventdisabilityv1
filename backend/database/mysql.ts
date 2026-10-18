import mysql from 'mysql2/promise';
import { dbConfig } from '../config/database.ts';
let pool: any = null;
let isConnected = false;

/**
 * Initialize MySQL Connection Pool
 * Configured by default for local development with Laragon (127.0.0.1:3306, user: root, password: '')
 * MySQL adalah satu-satunya sumber data aplikasi; tidak ada fallback in-memory.
 */
export async function getDbPool(): Promise<any> {
  if (pool) return pool;

  try {
    const realPool = mysql.createPool({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      waitForConnections: true,
      connectionLimit: dbConfig.connectionLimit,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });

    // Test the connection
    const connection = await realPool.getConnection();
    await connection.ping();
    connection.release();

    isConnected = true;
    pool = realPool;
    console.log(`[Database] Terhubung ke MySQL Laragon (${dbConfig.host}:${dbConfig.port}/${dbConfig.database})`);
    return pool;
  } catch (error: any) {
    isConnected = false;
    pool = null;
    console.error(`[Database Error] Gagal terhubung ke MySQL ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}:`, error?.message || error);
    throw error;
  }
}

export function isMysqlConnected(): boolean {
  return isConnected;
}

export async function executeQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const p = await getDbPool();
  if (!p) {
    throw new Error('MySQL connection pool is not available.');
  }
  const [rows] = await p.execute(sql, params);
  return rows as T[];
}
