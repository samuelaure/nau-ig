import { executeSql, runSql } from '../db';

export interface MediaItem {
  type: 'image' | 'video';
  url: string;
  localUri?: string;
}

export interface Post {
  id: number;
  instagramUrl: string;
  title?: string;
  content?: string;
  tags?: string;
  mediaData?: string;
  isProcessed: number;
  sm2_interval: number;
  sm2_ease_factor: number;
  sm2_repetition: number;
  frequency: string;
  sync_attempts: number;
  sync_status: 'pending' | 'processed' | 'standby';
}

export const getDuePosts = async (tagFilter?: string | null): Promise<Post[]> => {
  let query = `SELECT * FROM posts WHERE (next_review_at <= datetime('now') OR next_review_at IS NULL)`;
  const params: any[] = [];

  if (tagFilter) {
    query += ` AND tags LIKE ?`;
    params.push(`%${tagFilter}%`);
  }

  query += ` ORDER BY next_review_at ASC`;
  return executeSql<Post>(query, params);
};

export const getReviewedPosts = async (tagFilter?: string | null): Promise<Post[]> => {
  let query = `SELECT * FROM posts WHERE next_review_at > datetime('now')`;
  const params: any[] = [];

  if (tagFilter) {
    query += ` AND tags LIKE ?`;
    params.push(`%${tagFilter}%`);
  }

  query += ` ORDER BY next_review_at DESC`;
  return executeSql<Post>(query, params);
};

/**
 * Fetches all unique tags used across all posts to populate the Filter Bar.
 */
export const getAllTags = async (): Promise<string[]> => {
  try {
    const rows = await executeSql<{ tags: string }>(
      'SELECT tags FROM posts WHERE tags IS NOT NULL',
    );
    const allTags = new Set<string>();
    rows.forEach((row) => {
      try {
        const tags: string[] = JSON.parse(row.tags);
        tags.forEach((t) => allTags.add(t));
      } catch (e) {
        /* ignore parse errors */
      }
    });
    return Array.from(allTags);
  } catch (err) {
    return [];
  }
};

export const getPendingPosts = async (maxAttempts = 10): Promise<Post[]> => {
  return executeSql<Post>(
    "SELECT * FROM posts WHERE isProcessed = 0 AND sync_status = 'pending' AND sync_attempts < ?",
    [maxAttempts],
  );
};

export const incrementSyncAttempts = async (id: number): Promise<void> => {
  await runSql('UPDATE posts SET sync_attempts = sync_attempts + 1 WHERE id = ?', [id]);
};

export const updateSyncStatus = async (
  id: number,
  status: 'pending' | 'standby' | 'processed',
): Promise<void> => {
  await runSql('UPDATE posts SET sync_status = ? WHERE id = ?', [status, id]);
};

export const resetSyncForManualRetry = async (ids: number[]): Promise<void> => {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(',');
  await runSql(
    `UPDATE posts SET sync_attempts = 0, sync_status = 'pending' WHERE id IN (\${placeholders})`,
    ids,
  );
};

export const getStandbyPosts = async (): Promise<Post[]> => {
  return executeSql<Post>("SELECT * FROM posts WHERE sync_status = 'standby' OR sync_attempts >= 10");
};

export const updatePostFrequency = async (
  id: number,
  direction: 'more' | 'less',
): Promise<void> => {
  await runSql(
    `UPDATE posts 
     SET sm2_interval = CASE WHEN ? = 'more' THEN MAX(1, sm2_interval / 2) ELSE sm2_interval * 2 END,
         next_review_at = datetime('now', '+' || (CASE WHEN ? = 'more' THEN MAX(1, sm2_interval / 2) ELSE sm2_interval * 2 END) || ' days')
     WHERE id = ?`,
    [direction, direction, id],
  );
};

export const updatePostNote = async (id: number, content: string): Promise<void> => {
  await runSql('UPDATE posts SET content = ? WHERE id = ?', [content, id]);
};

export const deletePost = async (id: number): Promise<void> => {
  await runSql('DELETE FROM posts WHERE id = ?', [id]);
};

export const markPostAsReviewed = async (id: number, interval: number): Promise<void> => {
  await runSql(
    `UPDATE posts 
     SET next_review_at = datetime('now', '+' || ? || ' days'),
         sm2_repetition = sm2_repetition + 1
     WHERE id = ?`,
    [interval, id],
  );
};

export const updatePostMedia = async (id: number, mediaData: MediaItem[]): Promise<void> => {
  await runSql(
    "UPDATE posts SET mediaData = ?, isProcessed = 1, sync_status = 'processed' WHERE id = ?",
    [JSON.stringify(mediaData), id],
  );
};

export const savePost = async (post: any): Promise<number> => {
  return runSql(
    `INSERT INTO posts (instagramUrl, title, content, tags, frequency, sm2_interval, isProcessed, next_review_at) 
     VALUES (?, ?, ?, ?, ?, 1, 0, ?)`,
    [
      post.instagramUrl,
      post.title,
      post.content,
      JSON.stringify(post.tags),
      post.frequency,
      post.startDate || new Date().toISOString().split('T')[0],
    ],
  );
};
