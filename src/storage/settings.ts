import { db } from '../db';

export function setSetting(key: string, value: string): Promise<void> {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
        [key, value],
        () => resolve(),
        (_, err) => {
          reject(err);
          return false;
        }
      );
    });
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
        },
        () => {
          resolve(null);
          return false;
        }
      );
    });
  });
}
