import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabase('nau_ig.db');

/**
 * Ensures all tables exist with correct schemas.
 * Following PRD Section 19.7 for Data Models.
 */
export const initDb = () => {
  db.transaction((tx) => {
    // Posts Table with SM-2 Spaced Repetition fields
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

    // Key-Value settings store (Webhook URLs, User Preferences)
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);
  });
};
