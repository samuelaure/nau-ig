import { getSetting } from '@/repositories/SettingsRepository';
import {
    getPendingPosts,
    updatePostMedia,
    incrementSyncAttempts,
    updateSyncStatus
} from '@/repositories/PostRepository';
import { sendToMake } from './SyncService';

/**
 * SyncManager handles the background synchronization of captures.
 * It implements a "one-at-a-time" execution lock and handle retry logic.
 */
class SyncManager {
    private isSyncing = false;
    private intervalId: NodeJS.Timeout | null = null;
    private lastSyncTime = 0;
    private subscribers: (() => void)[] = [];

    /**
     * Starts the sync loop.
     */
    start(pollingIntervalMs = 15000) {
        if (this.intervalId) return;

        // Initial sync
        this.sync();

        this.intervalId = setInterval(() => {
            this.sync();
        }, pollingIntervalMs);

        console.log('[SyncManager] Service started.');
    }

    /**
     * Stops the sync loop.
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        console.log('[SyncManager] Service stopped.');
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
     * Performs a single sync operation.
     */
    async sync() {
        if (this.isSyncing) return;

        try {
            this.isSyncing = true;
            const webhookUrl = await getSetting('make_webhook_url');

            if (!webhookUrl) {
                console.warn('[SyncManager] Webhook URL missing. Skipping sync.');
                return;
            }

            const MAX_ATTEMPTS = 10;
            const pending = await getPendingPosts(MAX_ATTEMPTS);

            if (pending.length === 0) {
                // Stop the noise if there's nothing to do
                return;
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
                        await updatePostMedia(p.id, result.mediaData);
                        hasChanges = true;
                        console.log(`[SyncManager] Item ${p.id} processed successfully.`);
                    } else {
                        // Either specifically marked pending by backend or missing from results
                        await this.handleFailure(p, MAX_ATTEMPTS);
                    }
                }

                if (hasChanges) this.notify();
            } else {
                // Whole batch failed (e.g. webhook error response)
                for (const p of pending) {
                    await this.handleFailure(p, MAX_ATTEMPTS);
                }
            }
        } catch (error) {
            console.error('[SyncManager] Critical error during sync:', error);
            // In case of network errors (fetch fail), we still increment attempts 
            // to avoid infinite loops on invalid URLs or permanent network issues
            try {
                const pending = await getPendingPosts(10);
                for (const p of pending) {
                    await this.handleFailure(p, 10);
                }
            } catch (innerErr) {
                // DB might be locked or closed
            }
        } finally {
            this.isSyncing = false;
            this.lastSyncTime = Date.now();
        }
    }

    private async handleFailure(post: any, maxAttempts: number) {
        await incrementSyncAttempts(post.id);
        // Note: post.sync_attempts is what it was BEFORE this increment
        if (post.sync_attempts + 1 >= maxAttempts) {
            console.log(`[SyncManager] Item ${post.id} hit retry limit. Moving to STANDBY.`);
            await updateSyncStatus(post.id, 'standby');
            this.notify(); // Notify so UI can show standby state or refresh
        }
    }
}

export const syncManager = new SyncManager();
