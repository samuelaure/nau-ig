import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabase('nau_ig.db');

export const initDb = () => {
  db.transaction((tx) => {
    // Drop and recreate or use ALTER TABLE if you have data you want to keep.
    // For this dev phase, we ensure the schema is correct.
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        instagramUrl TEXT NOT NULL,
        title TEXT,
        content TEXT,
        tags TEXT,
        frequency TEXT,
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
