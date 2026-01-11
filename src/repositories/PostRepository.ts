import { db } from '../db';

export interface Post {
  id?: number;
  instagramUrl: string;
  title?: string;
  content?: string;
  tags?: string; // Stored as comma-separated or JSON string
  frequency?: string;
  createdAt?: string;
}

export const savePost = (post: Post): Promise<number> => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        `INSERT INTO posts (instagramUrl, title, content, tags, frequency, createdAt) 
         VALUES (?, ?, ?, ?, ?, datetime('now'))`,
        [
          post.instagramUrl,
          post.title || null,
          post.content || null,
          post.tags ? JSON.stringify(post.tags) : null,
          post.frequency || 'medium'
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
