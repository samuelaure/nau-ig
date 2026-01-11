import { db } from '../db';

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
  mediaData?: string; // JSON
  sm2_interval: number;
  sm2_ease_factor: number;
  sm2_repetition: number;
}

/**
 * Fetches posts that are due for review based on SM-2.
 */
export const getDuePosts = (): Promise<Post[]> => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        `SELECT * FROM posts WHERE next_review_at <= datetime('now') OR next_review_at IS NULL ORDER BY next_review_at ASC`,
        [],
        (_, { rows }) => resolve(rows._array),
        (_, err) => { reject(err); return false; }
      );
    });
  });
};

export const updatePostMedia = (id: number, mediaData: MediaItem[]): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        `UPDATE posts SET mediaData = ?, isProcessed = 1 WHERE id = ?`,
        [JSON.stringify(mediaData), id],
        () => resolve(),
        (_, err) => { reject(err); return false; }
      );
    });
  });
};

export const savePost = (post: any): Promise<number> => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        `INSERT INTO posts (instagramUrl, title, content, tags, frequency, sm2_interval, next_review_at) 
         VALUES (?, ?, ?, ?, ?, 1, datetime('now'))`,
        [post.instagramUrl, post.title, post.content, JSON.stringify(post.tags), post.frequency],
        (_, result) => resolve(result.insertId || 0),
        (_, error) => { reject(error); return false; }
      );
    });
  });
};
