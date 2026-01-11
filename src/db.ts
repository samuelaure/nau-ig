import * as SQLite from "expo-sqlite";

export const db = SQLite.openDatabase("nau.db");

export function initDb() {
  db.transaction(tx => {
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        instagramUrl TEXT,
        caption TEXT,
        createdAt INTEGER
      );`
    );
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS repetition (
        postId INTEGER,
        interval INTEGER,
        nextDueAt INTEGER
      );`
    );
  });
}
