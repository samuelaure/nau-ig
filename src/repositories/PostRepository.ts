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

export const getPendingPosts = async (): Promise<Post[]> => {
  return executeSql<Post>('SELECT * FROM posts WHERE isProcessed = 0');
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
  await runSql('UPDATE posts SET mediaData = ?, isProcessed = 1 WHERE id = ?', [
    JSON.stringify(mediaData),
    id,
  ]);
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
