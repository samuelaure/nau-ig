import { getSetting } from '@/repositories/SettingsRepository';
import {
  getPendingPosts,
  updatePostMedia,
  incrementSyncAttempts,
  updateSyncStatus,
  getProfileByUsername,
} from '@/repositories/PostRepository';
import { runSql } from '../db';
import { ApifyService } from './ApifyService';
import { MediaCacheService } from './MediaCacheService';

/**
 * SyncManager handles the background synchronization of captures.
 * Transitioned to Standalone Mode: Now uses Apify directly and downloads media locally.
 */
class SyncManager {
  private isSyncing = false;
  private intervalId: NodeJS.Timeout | null = null;
  private subscribers: (() => void)[] = [];
  private pollingInterval = 15000;

  async triggerSync(pollingIntervalMs = 15000) {
    this.pollingInterval = pollingIntervalMs;
    if (this.isSyncing) return;

    const hasMoreWork = await this.performSync();

    if (hasMoreWork && !this.intervalId) {
      this.intervalId = setInterval(() => this.backgroundTick(), this.pollingInterval);
    }
  }

  private async backgroundTick() {
    if (this.isSyncing) return;
    const hasMoreWork = await this.performSync();
    if (!hasMoreWork && this.intervalId) {
      this.stop();
    }
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  subscribe(callback: () => void) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== callback);
    };
  }

  private notify() {
    this.subscribers.forEach((s) => s());
  }

  /**
   * Performs the actual sync logic using direct Apify scraping and local downloads.
   */
  async performSync(): Promise<boolean> {
    if (this.isSyncing) return false;

    try {
      this.isSyncing = true;

      // Clean up old trash
      await runSql(
        "DELETE FROM posts WHERE is_deleted = 1 AND deleted_at < datetime('now', '-30 days')",
      );

      const apifyToken = await getSetting('apify_api_token');
      if (!apifyToken) {
        console.warn('[SyncManager] Apify API Token missing. Skipping.');
        return false;
      }

      const MAX_ATTEMPTS = 5; // Reduced attempts for the slower scraper
      const pending = await getPendingPosts(MAX_ATTEMPTS);

      if (pending.length === 0) {
        return false;
      }

      console.log(`[SyncManager] Standalone Sync: Processing ${pending.length} items...`);

      for (const post of pending) {
        try {
          const result = await ApifyService.scrapPost(post.instagramUrl, apifyToken);

          if (result.status === 'restricted') {
            console.log(`[SyncManager] Restricted content for post ${post.id}`);
            // We update with what we have (caption/title) and set status to restricted
            // We pass empty media array but valid other data.
            await updatePostMedia(post.id, {
              mediaData: [],
              instagram_caption: result.instagram_caption,
            });
            // Override status to restricted
            await updateSyncStatus(post.id, 'restricted');
            this.notify();
            continue;
          }

          if (result.status === 'success' && result.mediaItems) {
            const username = result.username || 'instagram_user';

            // Check if we already have a profile for this user
            let profileImage = result.profile_image;
            let instagramUserId = result.instagram_user_id;

            const existingProfile = await getProfileByUsername(username);

            if (existingProfile) {
              console.log(`[SyncManager] Using cached profile for ${username}`);
              profileImage = existingProfile.profile_image;
              instagramUserId = existingProfile.instagram_user_id;
            } else {
              // Try to get HD profile info from the specialized scraper
              const profileInfo = await ApifyService.fetchProfileInfo(username, apifyToken);
              if (profileInfo.status === 'success') {
                profileImage = profileInfo.profile_image || profileImage;
                instagramUserId = profileInfo.id;
              }
            }

            // Pre-cache media locally to ensure "Offline First" ownership
            const localMedia = await Promise.all(
              result.mediaItems.map(async (item) => ({
                ...item,
                localUri: await MediaCacheService.ensureMediaCached(item.url),
              })),
            );

            // Also cache the profile image locally
            const localProfileImage = profileImage
              ? await MediaCacheService.ensureMediaCached(profileImage)
              : undefined;

            await updatePostMedia(post.id, {
              mediaData: localMedia,
              username: username,
              profile_image: localProfileImage,
              instagram_caption: result.instagram_caption,
              instagram_user_id: instagramUserId,
            });

            console.log(`[SyncManager] Successfully processed post ${post.id}`);
            this.notify();
          } else {
            await this.handleFailure(post, MAX_ATTEMPTS);
          }
        } catch (err) {
          console.error(`[SyncManager] Error processing post ${post.id}:`, err);
          await this.handleFailure(post, MAX_ATTEMPTS);
        }
      }

      const remaining = await getPendingPosts(MAX_ATTEMPTS);
      return remaining.length > 0;
    } catch (error) {
      console.error('[SyncManager] Critical sync error:', error);
      return true;
    } finally {
      this.isSyncing = false;
    }
  }

  private async handleFailure(post: any, maxAttempts: number) {
    await incrementSyncAttempts(post.id);
    if (post.sync_attempts + 1 >= maxAttempts) {
      console.log(`[SyncManager] Item ${post.id} hit retry limit -> STANDBY.`);
      await updateSyncStatus(post.id, 'standby');
      this.notify();
    }
  }
}

export const syncManager = new SyncManager();
