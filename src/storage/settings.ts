import * as SQLite from 'expo-sqlite';
import { db } from '../db';

export function initSettings() {
  db.transaction((tx) => {
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);
  });
}

export function setSetting(key: string, value: string) {
  db.transaction((tx) => {
    tx.executeSql(
      `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
      [key, value]
    );
  });
}

export function getSetting(key: string): Promise<string | null> {
  return new Promise((resolve) => {
    db.transaction((tx) => {
      tx.executeSql(
        `SELECT value FROM settings WHERE key = ?`,
        [key],
        (_, { rows }) => {
          resolve(rows.length ? rows.item(0).value : null);
        }
      );
    });
  });
}
