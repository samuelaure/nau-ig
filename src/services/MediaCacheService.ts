import * as FileSystem from 'expo-file-system';

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
      return url;
    }
  },

  clearCache: async () => {
    const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory!);
    for (const file of files) {
      await FileSystem.deleteAsync(`${FileSystem.documentDirectory}${file}`);
    }
  },
};
