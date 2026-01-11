import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabase('nau.db');

export function initDb() {
  db.transaction((tx) => {
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        instagramUrl TEXT NOT NULL,
        note TEXT,
        mediaUrl TEXT,
        mediaType TEXT,
        createdAt INTEGER NOT NULL
      );
    `);

    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS repetition (
        postId INTEGER PRIMARY KEY,
        interval INTEGER NOT NULL,
        nextDueAt INTEGER NOT NULL,
        lastInteractionAt INTEGER NOT NULL
      );
    `);

    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);
  });
}
