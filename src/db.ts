import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabase('nau_ig.db');

export const initDb = () => {
  db.transaction((tx) => {
    // Enhanced Posts table with media metadata and processing status
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        instagramUrl TEXT NOT NULL,
        title TEXT,
        content TEXT,
        tags TEXT,
        frequency TEXT,
        mediaData TEXT, -- JSON array of { type: 'image'|'video', url: string, localUri: string }
        isProcessed INTEGER DEFAULT 0,
        sm2_interval INTEGER DEFAULT 1,
        sm2_repetition INTEGER DEFAULT 0,
        sm2_ease_factor REAL DEFAULT 2.5,
        next_review_at DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);
  });
};
