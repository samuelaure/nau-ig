import { db } from '../db';

export interface Post {
  id?: number;
  instagramUrl: string;
  title?: string;
  content?: string;
  tags?: string[];
  frequency?: 'high' | 'medium' | 'low';
  createdAt?: string;
}

/**
 * Maps User-selected frequency to SM-2 initial Interval
 */
const getInitialInterval = (frequency: string = 'medium') => {
  switch (frequency) {
    case 'high':
      return 1; // Review tomorrow
    case 'low':
      return 7; // Review in a week
    default:
      return 3; // Review in 3 days
  }
};

export const savePost = (post: Post): Promise<number> => {
  const initialInterval = getInitialInterval(post.frequency);

  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        `INSERT INTO posts (
          instagramUrl, title, content, tags, frequency, 
          sm2_interval, next_review_at
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now', '+${initialInterval} days'))`,
        [
          post.instagramUrl,
          post.title || null,
          post.content || null,
          post.tags ? JSON.stringify(post.tags) : null,
          post.frequency || 'medium',
          initialInterval
        ],
        (_, result) => resolve(result.insertId || 0),
        (_, error) => {
          reject(error);
          return false;
        }
      );
    });
  });
};
