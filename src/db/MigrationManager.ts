import { executeSql, runSql } from './core';

interface Migration {
  version: number;
  up: () => Promise<void>;
}

/**
 * Version 1 (Baseline):
 * This includes all columns added ad-hoc previously:
 * sync_attempts, sync_status, username, profile_image,
 * instagram_caption, is_deleted, deleted_at, instagram_user_id, biography.
 */
const migrations: Migration[] = [
  {
    version: 1,
    up: async () => {
      const tableInfo = await executeSql<{ name: string }>('PRAGMA table_info(posts)');
      const existingColumns = tableInfo.map((col) => col.name);

      const migrations = [
        {
          col: 'sync_attempts',
          sql: 'ALTER TABLE posts ADD COLUMN sync_attempts INTEGER DEFAULT 0',
        },
        {
          col: 'sync_status',
          sql: "ALTER TABLE posts ADD COLUMN sync_status TEXT DEFAULT 'pending'",
        },
        { col: 'username', sql: 'ALTER TABLE posts ADD COLUMN username TEXT' },
        { col: 'profile_image', sql: 'ALTER TABLE posts ADD COLUMN profile_image TEXT' },
        { col: 'instagram_caption', sql: 'ALTER TABLE posts ADD COLUMN instagram_caption TEXT' },
        { col: 'is_deleted', sql: 'ALTER TABLE posts ADD COLUMN is_deleted INTEGER DEFAULT 0' },
        { col: 'deleted_at', sql: 'ALTER TABLE posts ADD COLUMN deleted_at DATETIME' },
        { col: 'instagram_user_id', sql: 'ALTER TABLE posts ADD COLUMN instagram_user_id TEXT' },
        { col: 'biography', sql: 'ALTER TABLE posts ADD COLUMN biography TEXT' },
      ];

      for (const m of migrations) {
        if (!existingColumns.includes(m.col)) {
          await runSql(m.sql);
        }
      }
    },
  },
  // Add future migrations here:
  // {
  //   version: 2,
  //   up: async () => { ... }
  // }
];

export const applyMigrations = async () => {
  // 1. Get current version
  const result = await executeSql<{ user_version: number }>('PRAGMA user_version');
  let currentVersion = result[0]?.user_version || 0;

  console.log(`[DB] Current version: ${currentVersion}`);

  // 2. Filter and apply migrations
  const pending = migrations
    .filter((m) => m.version > currentVersion)
    .sort((a, b) => a.version - b.version);

  if (pending.length === 0) {
    console.log('[DB] No pending migrations.');
    return;
  }

  for (const migration of pending) {
    console.log(`[DB] Applying migration to version ${migration.version}...`);
    await migration.up();
    await runSql(`PRAGMA user_version = ${migration.version}`);
    console.log(`[DB] Migration to version ${migration.version} successful.`);
  }
};
