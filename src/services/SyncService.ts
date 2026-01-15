import { MediaItem } from '@/repositories/PostRepository';

interface SyncResult {
  status: 'success' | 'pending' | 'error';
  mediaData?: MediaItem[];
  username?: string;
  profile_image?: string;
  instagram_caption?: string;
}

interface WebhookResponse {
  status: 'success' | 'error';
  // For batch sync, return a map of postId -> result
  results?: Record<number, SyncResult>;
}

/**
 * Service to interact with the Make.com webhook.
 * Optimized for batch processing of multiple captured posts.
 */
export async function sendToMake(
  webhookUrl: string,
  payload: {
    action: 'capture' | 'sync_batch';
    instagramUrl?: string;
    postId?: number;
    items?: { id: number; url: string }[];
  },
): Promise<WebhookResponse> {
  let retries = 3;
  let delay = 1000;

  while (retries > 0) {
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          timestamp: new Date().toISOString(),
          platform: 'android',
        }),
      });

      if (res.ok) return await res.json();
      throw new Error(`Server responded with ${res.status}`);
    } catch (error) {
      retries--;
      if (retries === 0) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
  return { status: 'error' };
}
