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
  mediaData?: string;
  isProcessed: number;
  sm2_interval: number;
  sm2_ease_factor: number;
  sm2_repetition: number;
  frequency: string;
}

export const getDuePosts = (): Promise<Post[]> => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        `SELECT * FROM posts 
         WHERE (next_review_at <= datetime('now') OR next_review_at IS NULL) 
         ORDER BY next_review_at ASC`,
        [],
        (_, { rows }) => resolve(rows._array),
        (_, err) => {
          reject(err);
          return false;
        }
      );
    });
  });
};

export const getReviewedPosts = (): Promise<Post[]> => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        `SELECT * FROM posts 
         WHERE next_review_at > datetime('now') 
         ORDER BY next_review_at DESC`,
        [],
        (_, { rows }) => resolve(rows._array),
        (_, err) => {
          reject(err);
          return false;
        }
      );
    });
  });
};

export const getPendingPosts = (): Promise<Post[]> => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        `SELECT * FROM posts WHERE isProcessed = 0`,
        [],
        (_, { rows }) => resolve(rows._array),
        (_, err) => {
          reject(err);
          return false;
        }
      );
    });
  });
};

export const updatePostFrequency = (
  id: number,
  direction: 'more' | 'less'
): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        `UPDATE posts 
         SET sm2_interval = CASE WHEN ? = 'more' THEN MAX(1, sm2_interval / 2) ELSE sm2_interval * 2 END,
             next_review_at = datetime('now', '+' || (CASE WHEN ? = 'more' THEN MAX(1, sm2_interval / 2) ELSE sm2_interval * 2 END) || ' days')
         WHERE id = ?`,
        [direction, direction, id],
        () => resolve(),
        (_, err) => {
          reject(err);
          return false;
        }
      );
    });
  });
};

export const updatePostNote = (id: number, content: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        `UPDATE posts SET content = ? WHERE id = ?`,
        [content, id],
        () => resolve(),
        (_, err) => {
          reject(err);
          return false;
        }
      );
    });
  });
};

export const markPostAsReviewed = (
  id: number,
  interval: number
): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        `UPDATE posts 
         SET next_review_at = datetime('now', '+' || ? || ' days'),
             sm2_repetition = sm2_repetition + 1
         WHERE id = ?`,
        [interval, id],
        () => resolve(),
        (_, err) => {
          reject(err);
          return false;
        }
      );
    });
  });
};

export const updatePostMedia = (
  id: number,
  mediaData: MediaItem[]
): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        `UPDATE posts SET mediaData = ?, isProcessed = 1 WHERE id = ?`,
        [JSON.stringify(mediaData), id],
        () => resolve(),
        (_, err) => {
          reject(err);
          return false;
        }
      );
    });
  });
};

export const savePost = (post: any): Promise<number> => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        `INSERT INTO posts (instagramUrl, title, content, tags, frequency, sm2_interval, isProcessed, next_review_at) 
         VALUES (?, ?, ?, ?, ?, 1, 0, datetime('now'))`,
        [
          post.instagramUrl,
          post.title,
          post.content,
          JSON.stringify(post.tags),
          post.frequency
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
