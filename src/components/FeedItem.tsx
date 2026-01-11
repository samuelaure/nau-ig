import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { MoreHorizontal, Repeat } from 'lucide-react-native';
import { MediaCacheService } from '../services/MediaCacheService';
import { Post, MediaItem } from '../repositories/PostRepository';

const { width } = Dimensions.get('window');

export const FeedItem = ({ post }: { post: Post }) => {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const prepareMedia = async () => {
      if (!post.mediaData) return;
      try {
        const data: MediaItem[] = JSON.parse(post.mediaData);
        const cachedData = await Promise.all(
          data.map(async (item) => ({
            ...item,
            localUri: await MediaCacheService.ensureMediaCached(item.url)
          }))
        );
        setMedia(cachedData);
      } catch (e) {
        console.error('JSON Parse error for post media', e);
      } finally {
        setLoading(false);
      }
    };
    prepareMedia();
  }, [post.mediaData]);

  const renderMedia = ({ item }: { item: MediaItem }) => {
    const source = { uri: item.localUri || item.url };
    if (item.type === 'video') {
      return (
        <Video
          style={styles.media}
          source={source}
          useNativeControls
          resizeMode={ResizeMode.COVER}
          isLooping
          shouldPlay={false}
        />
      );
    }
    return <Image source={source} style={styles.media} resizeMode="cover" />;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.userSection}>
          <View style={styles.avatarPlaceholder} />
          <Text style={styles.username}>{post.title || 'Saved Post'}</Text>
        </View>
        <MoreHorizontal size={20} color="#666" />
      </View>

      <View style={styles.mediaContainer}>
        {loading ? (
          <View style={[styles.media, styles.loadingPlaceholder]} />
        ) : (
          <FlatList
            data={media}
            renderItem={renderMedia}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) => index.toString()}
          />
        )}
      </View>

      <View style={styles.actions}>
        <View style={styles.habitButtons}>
          <TouchableOpacity style={styles.actionBtn}>
            <Text style={styles.btnText}>Less</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.primaryBtn]}>
            <Text style={[styles.btnText, styles.primaryBtnText]}>Same</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Text style={styles.btnText}>More</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.repeatCircle}>
          <Repeat size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {post.content && (
          <Text style={styles.notes}>
            <Text style={styles.notesLabel}>My Notes: </Text>
            {post.content}
          </Text>
        )}
        <Text style={styles.date}>Next review scheduled by SM-2</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    marginBottom: 12
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginRight: 10
  },
  username: {
    fontWeight: '700',
    fontSize: 14
  },
  mediaContainer: {
    width: width,
    height: width,
    backgroundColor: '#fafafa'
  },
  media: {
    width: width,
    height: width
  },
  loadingPlaceholder: {
    backgroundColor: '#eee'
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12
  },
  habitButtons: {
    flexDirection: 'row',
    gap: 8
  },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  primaryBtn: {
    backgroundColor: '#000',
    borderColor: '#000'
  },
  btnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4b5563'
  },
  primaryBtnText: {
    color: '#fff'
  },
  repeatCircle: {
    backgroundColor: '#3b82f6',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center'
  },
  content: {
    paddingHorizontal: 12,
    paddingBottom: 16
  },
  notesLabel: {
    fontWeight: '700',
    color: '#1a1a1a'
  },
  notes: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20
  },
  date: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 6
  }
});
