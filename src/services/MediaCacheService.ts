import * as FileSystem from 'expo-file-system';

/**
 * Handles the background download and local caching of Instagram media.
 * Ensures media is stored locally for offline-first performance.
 */
export const MediaCacheService = {
  getFilename: (url: string) => {
    const parts = url.split('/');
    return parts[parts.length - 1].split('?')[0];
  },

  getLocalUri: (url: string) => {
    const filename = MediaCacheService.getFilename(url);
    return `${FileSystem.documentDirectory}${filename}`;
  },

  ensureMediaCached: async (url: string): Promise<string> => {
    const localUri = MediaCacheService.getLocalUri(url);
    const info = await FileSystem.getInfoAsync(localUri);

    if (info.exists) {
      return localUri;
    }

    try {
      const download = await FileSystem.downloadAsync(url, localUri);
      return download.uri;
    } catch (error) {
      console.error('Failed to download media:', error);
      return url; // Fallback to remote if download fails
    }
  },

  clearCache: async () => {
    const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory!);
    for (const file of files) {
      await FileSystem.deleteAsync(`${FileSystem.documentDirectory}${file}`);
    }
  }
};
