import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Animated,
  TextInput
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import {
  MoreHorizontal,
  Repeat,
  CheckCircle2,
  DownloadCloud
} from 'lucide-react-native';
import { TapGestureHandler, State } from 'react-native-gesture-handler';
import { MediaCacheService } from '../services/MediaCacheService';
import {
  Post,
  MediaItem,
  updatePostFrequency,
  markPostAsReviewed,
  updatePostNote
} from '../repositories/PostRepository';

const { width } = Dimensions.get('window');

interface FeedItemProps {
  post: Post;
  onProcessed: () => void;
  isHistory?: boolean;
}

export const FeedItem = ({ post, onProcessed, isHistory }: FeedItemProps) => {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Note Evolution State
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(post.content || '');

  const doubleTapRef = useRef(null);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (post.isProcessed === 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 1000,
            useNativeDriver: true
          })
        ])
      ).start();
    }

    const prepareMedia = async () => {
      if (post.tags) {
        try {
          setTags(JSON.parse(post.tags));
        } catch (e) {}
      }

      if (!post.mediaData || post.isProcessed === 0) {
        setLoading(false);
        return;
      }
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
  }, [post.mediaData, post.isProcessed, post.tags, pulseAnim]);

  // Zero-Button Persistence: Auto-save logic
  const persistNote = useCallback(
    async (content: string) => {
      if (content === post.content) return;
      try {
        await updatePostNote(post.id, content);
      } catch (e) {
        console.error('Failed to auto-save note', e);
      }
    },
    [post.id, post.content]
  );

  // Debounced save (1.5s of inactivity)
  useEffect(() => {
    if (isEditingNote) {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        persistNote(noteDraft);
      }, 1500);
    }
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [noteDraft, isEditingNote, persistNote]);

  const handleFrequencyChange = async (direction: 'more' | 'less') => {
    setIsUpdating(true);
    try {
      await updatePostFrequency(post.id, direction);
      onProcessed();
    } catch (e) {
      console.error('Failed to update frequency', e);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReviewed = async () => {
    if (isHistory || post.isProcessed === 0) return;
    setIsUpdating(true);
    try {
      await markPostAsReviewed(post.id, post.sm2_interval);
      onProcessed();
    } catch (e) {
      console.error('Failed to mark as reviewed', e);
    } finally {
      setIsUpdating(false);
    }
  };

  const onDoubleTap = (event: any) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      handleReviewed();
    }
  };

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
          <View>
            <Text style={styles.username}>{post.title || 'Saved Post'}</Text>
            <View style={styles.tagDisplayList}>
              {tags.map((tag, idx) => (
                <Text key={idx} style={styles.headerTagText}>
                  #{tag}{' '}
                </Text>
              ))}
            </View>
          </View>
        </View>
        <MoreHorizontal size={20} color="#666" />
      </View>

      <TapGestureHandler
        onHandlerStateChange={onDoubleTap}
        numberOfTaps={2}
        ref={doubleTapRef}
        enabled={post.isProcessed === 1}
      >
        <View style={styles.mediaContainer}>
          {post.isProcessed === 0 ? (
            <Animated.View
              style={[
                styles.media,
                styles.processingContainer,
                { opacity: pulseAnim }
              ]}
            >
              <DownloadCloud size={40} color="#9ca3af" />
              <Text style={styles.processingText}>Preparing media...</Text>
              <ActivityIndicator
                size="small"
                color="#9ca3af"
                style={{ marginTop: 12 }}
              />
            </Animated.View>
          ) : loading ? (
            <View style={[styles.media, styles.loadingPlaceholder]}>
              <ActivityIndicator color="#000" />
            </View>
          ) : media.length > 0 ? (
            <FlatList
              data={media}
              renderItem={renderMedia}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, index) => index.toString()}
            />
          ) : (
            <View style={[styles.media, styles.loadingPlaceholder]}>
              <Text style={styles.emptyMediaText}>
                Media error. Pull to refresh.
              </Text>
            </View>
          )}
        </View>
      </TapGestureHandler>

      <View style={styles.actions}>
        <View style={styles.frequencyControlGroup}>
          <TouchableOpacity
            style={styles.freqActionBtn}
            onPress={() => handleFrequencyChange('less')}
            disabled={isUpdating}
          >
            <Text style={styles.freqBtnText}>Less</Text>
          </TouchableOpacity>
          <View style={styles.frequencyBadge}>
            <Text style={styles.frequencyValue}>{post.sm2_interval}d</Text>
          </View>
          <TouchableOpacity
            style={styles.freqActionBtn}
            onPress={() => handleFrequencyChange('more')}
            disabled={isUpdating}
          >
            <Text style={styles.freqBtnText}>More</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.repeatCircle,
            isHistory && styles.historyCircle,
            post.isProcessed === 0 && styles.disabledCircle
          ]}
          onPress={handleReviewed}
          disabled={isUpdating || isHistory || post.isProcessed === 0}
        >
          {isUpdating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : isHistory ? (
            <CheckCircle2 size={22} color="#fff" />
          ) : (
            <Repeat size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {/* Note Evolution Canvas */}
      <View style={styles.content}>
        {isEditingNote ? (
          <TextInput
            style={[styles.notes, styles.noteInput]}
            value={noteDraft}
            onChangeText={setNoteDraft}
            multiline
            autoFocus
            onBlur={() => {
              setIsEditingNote(false);
              persistNote(noteDraft);
            }}
            placeholder="Expand your thoughts..."
            placeholderTextColor="#9ca3af"
          />
        ) : (
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.notePreview}
            onPress={() => setIsEditingNote(true)}
          >
            {post.content ? (
              <Text style={styles.notes}>
                <Text style={styles.notesLabel}>My Notes: </Text>
                {post.content}
              </Text>
            ) : (
              <Text style={styles.emptyNotePlaceholder}>
                Tap to add your thoughts...
              </Text>
            )}
          </TouchableOpacity>
        )}
        <View style={styles.footerInfo}>
          <Text style={styles.date}>
            {isHistory ? 'Next review in' : 'Review due in'} {post.sm2_interval}{' '}
            days
          </Text>
        </View>
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
  tagDisplayList: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  headerTagText: {
    fontSize: 10,
    color: '#3b82f6',
    fontWeight: '600'
  },
  mediaContainer: {
    width: width,
    height: width,
    backgroundColor: '#fafafa'
  },
  media: {
    width: width,
    height: width,
    justifyContent: 'center',
    alignItems: 'center'
  },
  processingContainer: {
    backgroundColor: '#f9fafb'
  },
  processingText: {
    marginTop: 12,
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500'
  },
  loadingPlaceholder: {
    backgroundColor: '#eee'
  },
  emptyMediaText: {
    color: '#9ca3af',
    fontSize: 12
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12
  },
  frequencyControlGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 24,
    padding: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  freqActionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20
  },
  freqBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4b5563'
  },
  frequencyBadge: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    minWidth: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2
  },
  frequencyValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#000'
  },
  repeatCircle: {
    backgroundColor: '#3b82f6',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4
  },
  historyCircle: {
    backgroundColor: '#10b981',
    shadowColor: '#10b981'
  },
  disabledCircle: {
    backgroundColor: '#e5e7eb',
    shadowOpacity: 0,
    elevation: 0
  },
  content: {
    paddingHorizontal: 12,
    paddingBottom: 16
  },
  notePreview: {
    paddingVertical: 8,
    minHeight: 40
  },
  noteInput: {
    paddingVertical: 8,
    minHeight: 40,
    textAlignVertical: 'top'
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
  emptyNotePlaceholder: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic'
  },
  footerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8
  },
  date: {
    fontSize: 11,
    color: '#9ca3af',
    fontStyle: 'italic'
  }
});
