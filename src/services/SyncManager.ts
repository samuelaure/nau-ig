import { getSetting } from '@/repositories/SettingsRepository';
import {
    getPendingPosts,
    updatePostMedia,
    incrementSyncAttempts,
    updateSyncStatus,
} from '@/repositories/PostRepository';
import { runSql } from '../db';
import { sendToMake } from './SyncService';

/**
 * SyncManager handles the background synchronization of captures.
 * It implements a "one-at-a-time" execution lock and automatically stops
 * when there is no work to do to save resources.
 */
class SyncManager {
    private isSyncing = false;
    private intervalId: NodeJS.Timeout | null = null;
    private subscribers: (() => void)[] = [];
    private pollingInterval = 15000;

    /**
     * Main entry point to wake up the sync service.
     * If already running, it does nothing. If stopped, it performs a sync
     * and starts the timer if there's more work.
     */
    async triggerSync(pollingIntervalMs = 15000) {
        this.pollingInterval = pollingIntervalMs;
        console.log('[SyncManager] Trigger requested.');

        if (this.isSyncing) return;

        // Perform an immediate sync
        const hasMoreWork = await this.performSync();

        // If there is more work to do, ensure the timer is running
        if (hasMoreWork && !this.intervalId) {
            console.log('[SyncManager] More work found. Starting timer.');
            this.intervalId = setInterval(() => this.backgroundTick(), this.pollingInterval);
        }
    }

    /**
     * Internal tick for the interval timer
     */
    private async backgroundTick() {
        if (this.isSyncing) return;

        const hasMoreWork = await this.performSync();

        if (!hasMoreWork && this.intervalId) {
            console.log('[SyncManager] Work complete. Shutting down timer.');
            this.stop();
        }
    }

    /**
     * Stops the sync timer.
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    /**
     * Subscribe to updates (e.g., to refresh UI when data arrives)
     */
    subscribe(callback: () => void) {
        this.subscribers.push(callback);
        return () => {
            this.subscribers = this.subscribers.filter(s => s !== callback);
        };
    }

    private notify() {
        this.subscribers.forEach(s => s());
    }

    /**
     * Performs the actual sync logic.
     * @returns boolean - true if there are still pending items to sync
     */
    async performSync(): Promise<boolean> {
        if (this.isSyncing) return false;

        try {
            this.isSyncing = true;

            // Periodically clean up old trash (older than 30 days)
            await runSql("DELETE FROM posts WHERE is_deleted = 1 AND deleted_at < datetime('now', '-30 days')");

            const webhookUrl = await getSetting('make_webhook_url');

            if (!webhookUrl) {
                console.warn('[SyncManager] Webhook URL missing. Skipping.');
                return false;
            }

            const MAX_ATTEMPTS = 10;
            const pending = await getPendingPosts(MAX_ATTEMPTS);

            if (pending.length === 0) {
                return false;
            }

            console.log(`[SyncManager] Syncing ${pending.length} items...`);

            const response = await sendToMake(webhookUrl, {
                action: 'sync_batch',
                items: pending.map(p => ({ id: p.id, url: p.instagramUrl })),
            });

            if (response.status === 'success' && response.results) {
                let hasChanges = false;

                for (const p of pending) {
                    const result = response.results[p.id];
                    if (result?.status === 'success' && result.mediaData) {
                        await updatePostMedia(p.id, {
                            mediaData: result.mediaData,
                            username: result.username,
                            profile_image: result.profile_image,
                            instagram_caption: result.instagram_caption,
                        });
                        hasChanges = true;
                    } else {
                        await this.handleFailure(p, MAX_ATTEMPTS);
                    }
                }
                if (hasChanges) this.notify();
            } else {
                // Batch request failed or returned error status
                for (const p of pending) {
                    await this.handleFailure(p, MAX_ATTEMPTS);
                }
            }

            // Check again if there's more work after this batch
            const remaining = await getPendingPosts(MAX_ATTEMPTS);
            return remaining.length > 0;

        } catch (error) {
            console.error('[SyncManager] Sync error:', error);
            return true; // Assume more work to retry later on error
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
