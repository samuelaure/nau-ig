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
      console.log('[DB] Executing SQL:', sql, 'params:', params);
      tx.executeSql(
        sql,
        params,
        (_, { rows }) => {
          const result = (rows as any)._array || [];
          console.log('[DB] SQL Success. Rows returned:', result.length);
          resolve(result);
        },
        (_, err) => {
          console.error('[DB] SQL Error:', err, 'SQL:', sql);
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
      console.log('[DB] Running SQL (no rows):', sql, 'params:', params);
      tx.executeSql(
        sql,
        params,
        (_, result) => {
          const res = result.insertId || result.rowsAffected || 0;
          console.log('[DB] Run SQL success. Result (ID/Affected):', res);
          resolve(res);
        },
        (_, err) => {
          console.error('[DB] Run SQL error:', err, 'SQL:', sql);
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
      instagramUrl TEXT,
      title TEXT,
      content TEXT,
      tags TEXT,
      frequency TEXT,
      mediaData TEXT,
      username TEXT,
      profile_image TEXT,
      instagram_caption TEXT,
      is_deleted INTEGER DEFAULT 0,
      deleted_at DATETIME,
      isProcessed INTEGER DEFAULT 0,
      sync_attempts INTEGER DEFAULT 0,
      sync_status TEXT DEFAULT 'pending',
      sm2_interval INTEGER DEFAULT 1,
      sm2_repetition INTEGER DEFAULT 0,
      sm2_ease_factor REAL DEFAULT 2.5,
      next_review_at DATETIME,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migration for existing databases: Check columns first to avoid noise
  try {
    const tableInfo = await executeSql<{ name: string }>('PRAGMA table_info(posts)');
    const existingColumns = tableInfo.map((col) => col.name);

    if (!existingColumns.includes('sync_attempts')) {
      await runSql('ALTER TABLE posts ADD COLUMN sync_attempts INTEGER DEFAULT 0');
    }
    if (!existingColumns.includes('sync_status')) {
      await runSql("ALTER TABLE posts ADD COLUMN sync_status TEXT DEFAULT 'pending'");
    }
    if (!existingColumns.includes('username')) {
      await runSql('ALTER TABLE posts ADD COLUMN username TEXT');
    }
    if (!existingColumns.includes('profile_image')) {
      await runSql('ALTER TABLE posts ADD COLUMN profile_image TEXT');
    }
    if (!existingColumns.includes('instagram_caption')) {
      await runSql('ALTER TABLE posts ADD COLUMN instagram_caption TEXT');
    }
    if (!existingColumns.includes('is_deleted')) {
      await runSql('ALTER TABLE posts ADD COLUMN is_deleted INTEGER DEFAULT 0');
    }
    if (!existingColumns.includes('deleted_at')) {
      await runSql('ALTER TABLE posts ADD COLUMN deleted_at DATETIME');
    }
  } catch (e) {
    console.warn('[DB] Migration check failed:', e);
  }

  await runSql(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
};

export default db;
