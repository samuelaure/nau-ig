import { MediaItem } from '../repositories/PostRepository';

interface WebhookResponse {
  status: 'success' | 'pending' | 'error';
  mediaData?: MediaItem[];
}

/**
 * Service to interact with the Make.com webhook.
 * Handles both initial capture and subsequent background synchronization.
 */
export async function sendToMake(
  webhookUrl: string,
  payload: {
    action: 'capture' | 'sync';
    instagramUrl?: string;
    postId?: number;
  }
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
          platform: 'android'
        })
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
