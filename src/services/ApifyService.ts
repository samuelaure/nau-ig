import { MediaItem } from '@/repositories/PostRepository';

export interface ApifyScrapResult {
    status: 'success' | 'error';
    username?: string;
    profile_image?: string;
    instagram_caption?: string;
    mediaItems?: MediaItem[];
}

/**
 * Service to interact directly with the Apify API.
 * This removes the dependency on Make.com for orchestration.
 */
export class ApifyService {
    /**
     * Scrapes an Instagram post using the apify/instagram-scraper actor.
     * Uses the run-sync-get-dataset-items endpoint for immediate results.
     */
    static async scrapPost(instagramUrl: string, token: string): Promise<ApifyScrapResult> {
        const actorId = 'apify~instagram-scraper';
        const url = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${token}`;

        const input = {
            directUrls: [instagramUrl],
            resultsType: 'details',
            resultsLimit: 1,
            addParentData: false,
        };

        try {
            console.log(`[ApifyService] Scraping URL: ${instagramUrl}`);
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(input),
            });

            if (!response.ok) {
                throw new Error(`Apify returned ${response.status}: ${await response.text()}`);
            }

            const items = await response.json();

            if (!Array.isArray(items) || items.length === 0) {
                return { status: 'error' };
            }

            const item = items[0];

            // Map Apify fields to our internal structure
            const mediaItems: MediaItem[] = [];

            // Handle Carousel / Single Image / Video
            if (item.childPosts && item.childPosts.length > 0) {
                item.childPosts.forEach((child: any) => {
                    mediaItems.push({
                        type: child.type === 'Video' ? 'video' : 'image',
                        url: child.videoUrl || child.displayUrl,
                    });
                });
            } else {
                mediaItems.push({
                    type: item.type === 'Video' ? 'video' : 'image',
                    url: item.videoUrl || item.displayUrl,
                });
            }

            return {
                status: 'success',
                username: item.ownerUsername,
                profile_image: item.ownerProfilePicUrl || item.owner?.profile_pic_url,
                instagram_caption: item.caption,
                mediaItems,
            };
        } catch (error) {
            console.error('[ApifyService] Error scraping post:', error);
            return { status: 'error' };
        }
    }
}
