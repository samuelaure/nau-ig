import * as SQLite from 'expo-sqlite';
import { DATABASE_NAME } from './constants';

// For Expo 50, we use the legacy openDatabase API but wrap it for better DX
const db = SQLite.openDatabase(DATABASE_NAME);

/**
 * Execute a SQL query and return the results as a Promise.
 */
export const executeSql = <T = any>(sql: string, params: any[] = []): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        sql,
        params,
        (_, { rows }) => {
          // rows._array is a legacy way to get all rows as an array
          resolve((rows as any)._array || []);
        },
        (_, err) => {
          reject(err);
          return false;
        },
      );
    });
  });
};

/**
 * Execute a SQL query that doesn't return rows (INSERT, UPDATE, DELETE).
 */
export const runSql = (sql: string, params: any[] = []): Promise<number> => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        sql,
        params,
        (_, result) => {
          resolve(result.insertId || result.rowsAffected || 0);
        },
        (_, err) => {
          reject(err);
          return false;
        },
      );
    });
  });
};

export const initDb = async (): Promise<void> => {
  await runSql(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      instagramUrl TEXT NOT NULL,
      title TEXT,
      content TEXT,
      tags TEXT,
      frequency TEXT,
      mediaData TEXT,
      isProcessed INTEGER DEFAULT 0,
      sm2_interval INTEGER DEFAULT 1,
      sm2_repetition INTEGER DEFAULT 0,
      sm2_ease_factor REAL DEFAULT 2.5,
      next_review_at DATETIME,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
};

export default db;
