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
  TextInput,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import {
  TapGestureHandler,
  LongPressGestureHandler,
  State,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import {
  Volume2,
  VolumeX,
  Play,
  MoreHorizontal,
  CheckCircle2,
  DownloadCloud,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Check,
  StickyNote,
  User,
} from 'lucide-react-native';
import { MediaCacheService } from '@/services/MediaCacheService';
import {
  Post,
  MediaItem,
  markPostAsReviewed,
  updatePostNote,
  updatePostTitle,
  moveToTrash,
} from '@/repositories/PostRepository';

const { width } = Dimensions.get('window');

interface FeedItemProps {
  post: Post;
  onProcessed: () => void;
  isHistory?: boolean;
  isVisible?: boolean;
}

export const FeedItem = ({ post, onProcessed, isHistory, isVisible }: FeedItemProps) => {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Unified Editing Mode
  const [isEditing, setIsEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(post.title || '');
  const [noteDraft, setNoteDraft] = useState(post.content || '');
  const [showOriginalCaption, setShowOriginalCaption] = useState(false);

  // Frequency Stage State (Local only until committed)
  const [draftInterval, setDraftInterval] = useState(post.sm2_interval || 1);

  // Menu State
  const [menuVisible, setMenuVisible] = useState(false);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const isSimpleNote = !post.instagramUrl;

  const doubleTapRef = useRef(null);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  // Track if we need to blur properly
  const titleInputRef = useRef<TextInput>(null);
  const noteInputRef = useRef<TextInput>(null);

  useEffect(() => {
    // Only overwrite drafts if the user isn't currently editing.
    // This prevents background sync refreshes from wiping out what the user is typing.
    if (!isEditing) {
      setTitleDraft(post.title || '');
      setNoteDraft(post.content || '');
      setDraftInterval(post.sm2_interval || 1);
    }
  }, [post.title, post.content, post.sm2_interval, isEditing]);

  useEffect(() => {
    if (post.isProcessed === 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      pulseAnim.setValue(1);
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
        // Pre-fetch all media to get dimensions or ensure local availability
        const cachedData = await Promise.all(
          data.map(async (item) => {
            const localUri = await MediaCacheService.ensureMediaCached(item.url);
            return {
              ...item,
              localUri,
            };
          }),
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

  const handlePersist = useCallback(async () => {
    let hasChanged = false;
    if (titleDraft !== post.title) {
      await updatePostTitle(post.id, titleDraft);
      hasChanged = true;
    }
    if (noteDraft !== post.content) {
      await updatePostNote(post.id, noteDraft);
      hasChanged = true;
    }

    if (hasChanged) {
      // Refresh the parent so the 'post' prop eventually catches up
      onProcessed();
    }
  }, [post.id, post.title, post.content, titleDraft, noteDraft]);

  // Debounced save while editing
  useEffect(() => {
    if (isEditing) {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        handlePersist();
      }, 1500);
    }
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [titleDraft, noteDraft, isEditing, handlePersist]);

  const handleIntervalDraft = (direction: 'up' | 'down') => {
    if (direction === 'down') {
      // Study more often = interval gets smaller
      setDraftInterval((prev) => Math.max(1, Math.round(prev / 2)));
    } else {
      // Study less often = interval gets larger
      setDraftInterval((prev) => prev * 2);
    }
  };

  const handleReviewed = async () => {
    if (isHistory || post.isProcessed === 0) return;
    setIsUpdating(true);
    try {
      await markPostAsReviewed(post.id, draftInterval);
      onProcessed();
    } catch (e) {
      console.error('Failed to mark as reviewed', e);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      return;
    }
    try {
      await moveToTrash(post.id);
      setIsConfirmingDelete(false);
      setMenuVisible(false);
      onProcessed();
    } catch (e) {
      console.error('Failed to delete post', e);
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
      return <InstagramVideo source={source} isVisible={isVisible} />;
    }
    return (
      <View style={styles.mediaContainer}>
        <Image source={source} style={styles.media} resizeMode="contain" />
      </View>
    );
  };

  const onBlurWrapper = () => {
    setTimeout(() => {
      if (!titleInputRef.current?.isFocused() && !noteInputRef.current?.isFocused()) {
        setIsEditing(false);
        handlePersist();
      }
    }, 100);
  };

  const isDrafed = draftInterval !== post.sm2_interval;

  return (
    <View style={styles.container}>
      {/* 1. Header (Dynamic Based on Content Type) */}
      <View style={[styles.igHeader, isSimpleNote && styles.noteHeader]}>
        <View style={styles.igUserInfo}>
          {isSimpleNote ? (
            <View style={styles.noteIconWrapper}>
              <StickyNote size={18} color="#2563eb" />
              <Text style={styles.noteBadgeText}>Note</Text>
            </View>
          ) : (
            <>
              <View style={styles.igAvatarPlaceholder}>
                {post.profile_image ? (
                  <Image
                    key={post.profile_image}
                    source={{ uri: post.profile_image }}
                    style={styles.igAvatar}
                  />
                ) : (
                  <User size={18} color="#94a3b8" />
                )}
              </View>
              <Text style={styles.igUsername}>{post.username || 'instagram_user'}</Text>
            </>
          )}
        </View>
        <TouchableOpacity
          style={styles.menuTrigger}
          onPress={() => {
            setMenuVisible(!menuVisible);
            if (menuVisible) setIsConfirmingDelete(false);
          }}
        >
          <MoreHorizontal size={20} color="#262626" />
        </TouchableOpacity>

        {menuVisible && (
          <View style={styles.dropdownMenu}>
            <TouchableOpacity
              style={[styles.menuItem, isConfirmingDelete && styles.menuItemConfirm]}
              onPress={handleDelete}
            >
              <Text style={[styles.menuItemText, isConfirmingDelete && styles.menuItemTextConfirm]}>
                {isConfirmingDelete ? 'Are you sure?' : 'Delete'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 2. Media Carousel (Only for IG links) */}
      {!isSimpleNote && (
        <TapGestureHandler
          onHandlerStateChange={onDoubleTap}
          numberOfTaps={2}
          ref={doubleTapRef}
          enabled={post.isProcessed === 1}
        >
          <View style={styles.mediaWrapper}>
            {post.isProcessed === 0 ? (
              <Animated.View
                style={[styles.mediaPlaceholder, styles.processingBox, { opacity: pulseAnim }]}
              >
                <DownloadCloud size={40} color="#94a3b8" />
                <Text style={styles.processingTitle}>Syncing Media...</Text>
                <ActivityIndicator size="small" color="#94a3b8" style={{ marginTop: 12 }} />
              </Animated.View>
            ) : loading ? (
              <View style={[styles.mediaPlaceholder, styles.loadingBox]}>
                <ActivityIndicator color="#000" />
              </View>
            ) : media.length > 0 ? (
              <View>
                <FlatList
                  data={media}
                  renderItem={renderMedia}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(_, index) => index.toString()}
                  decelerationRate="fast"
                  snapToInterval={width}
                  onScroll={(e) => {
                    const offset = e.nativeEvent.contentOffset.x;
                    setActiveMediaIndex(Math.round(offset / width));
                  }}
                />
                {media.length > 1 && (
                  <View style={styles.paginationContainer}>
                    {media.map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.paginationDot,
                          i === activeMediaIndex && styles.paginationDotActive,
                        ]}
                      />
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <View style={[styles.mediaPlaceholder, styles.errorBox]}>
                <Text style={styles.errorText}>Media not available</Text>
              </View>
            )}
          </View>
        </TapGestureHandler>
      )}

      {/* 3. Refactored Review Bar (16px Padding) */}
      {/* Structure: Done | Current frequency | Less | More */}
      <View style={styles.reviewBar}>
        <TouchableOpacity
          style={[
            styles.doneBtn,
            isHistory && styles.doneBtnSuccess,
            (post.isProcessed === 0 || (isSimpleNote && isHistory)) && styles.doneBtnLocked,
          ]}
          onPress={handleReviewed}
          disabled={isUpdating || isHistory || (post.isProcessed === 0 && !isSimpleNote)}
        >
          {isUpdating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : isHistory ? (
            <CheckCircle2 size={18} color="#fff" />
          ) : (
            <Check size={18} color="#fff" strokeWidth={3} />
          )}
          <Text style={styles.doneBtnText}>{isHistory ? 'Done' : 'Done'}</Text>
        </TouchableOpacity>

        <View style={styles.rightActionsGroup}>
          <View style={styles.freqDisplayContainer}>
            <Text style={[styles.freqLabel, isDrafed && styles.freqLabelStale]}>
              {post.sm2_interval}d
            </Text>
            {isDrafed && (
              <>
                <Text style={styles.freqArrow}>→</Text>
                <Text style={styles.freqLabelNew}>{draftInterval}d</Text>
              </>
            )}
          </View>

          <View style={styles.divider} />

          <View style={styles.stepControls}>
            <TouchableOpacity
              style={styles.stepBtnIcon}
              onPress={() => handleIntervalDraft('down')}
              disabled={isUpdating}
            >
              <ChevronDown size={22} color="#64748b" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.stepBtnIcon}
              onPress={() => handleIntervalDraft('up')}
              disabled={isUpdating}
            >
              <ChevronUp size={22} color="#64748b" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 4. Caption Area (30px Padding) */}
      <View style={styles.captionArea}>
        {isEditing ? (
          <TextInput
            ref={titleInputRef}
            style={[styles.postTitle, styles.inputReset]}
            value={titleDraft}
            onChangeText={setTitleDraft}
            onBlur={onBlurWrapper}
            placeholder="Title"
          />
        ) : (
          <TouchableOpacity onPress={() => setIsEditing(true)}>
            <Text style={styles.postTitle}>{titleDraft || 'Untitled Capture'}</Text>
          </TouchableOpacity>
        )}

        {isEditing ? (
          <View style={styles.editorContainer}>
            <TextInput
              ref={noteInputRef}
              style={[styles.noteContent, styles.noteInput, styles.inputReset]}
              value={noteDraft}
              onChangeText={setNoteDraft}
              multiline
              onBlur={onBlurWrapper}
              placeholder="Capture your thoughts..."
              placeholderTextColor="#94a3b8"
            />

            {post.instagram_caption ? (
              <View style={styles.originalCaptionSection}>
                <TouchableOpacity
                  style={styles.captionToggle}
                  onPress={() => setShowOriginalCaption(!showOriginalCaption)}
                >
                  <Text style={styles.captionToggleText}>
                    {showOriginalCaption
                      ? 'Hide Original Caption'
                      : 'Show Original Caption (Reference)'}
                  </Text>
                  {showOriginalCaption ? (
                    <EyeOff size={14} color="#8e8e8e" />
                  ) : (
                    <Eye size={14} color="#8e8e8e" />
                  )}
                </TouchableOpacity>

                {showOriginalCaption && (
                  <View style={styles.originalCaptionCard}>
                    <Text style={styles.originalCaptionText}>{post.instagram_caption}</Text>
                  </View>
                )}
              </View>
            ) : null}
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setIsEditing(true)}
            style={styles.noteDisplay}
          >
            <Text style={styles.noteContent}>
              {noteDraft || (
                <Text style={styles.placeholderText}>Tap to add a note or edit content...</Text>
              )}
            </Text>
          </TouchableOpacity>
        )}

        {tags.length > 0 && (
          <View style={styles.labelPillsRow}>
            {tags.map((tag, idx) => (
              <View key={idx} style={styles.pill}>
                <Text style={styles.pillText}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.footerInfo}>
          <Text style={styles.reviewTimeline}>
            {isHistory ? 'Next review in' : 'Review due in'} {post.sm2_interval} days
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    marginBottom: 24,
  },
  mediaWrapper: {
    width: width,
    backgroundColor: '#000',
  },
  mediaContainer: {
    width: width,
    // Flexible height: we use a base aspect ratio but allow content to define height
    minHeight: width,
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  mediaPlaceholder: {
    width: width,
    aspectRatio: 1, // Placeholders remain square
    backgroundColor: '#f8fafc',
  },
  // 1. IG Header (16px)
  noteHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
  },
  noteIconWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  noteBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
    marginLeft: 6,
    textTransform: 'uppercase',
  },
  noteDisplay: {
    paddingVertical: 12,
    minHeight: 120,
    backgroundColor: '#fff',
  },
  igHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 100,
  },
  igUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  igAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    marginRight: 10,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  igAvatar: {
    width: '100%',
    height: '100%',
  },
  igUsername: {
    fontSize: 14,
    fontWeight: '700',
    color: '#262626',
  },
  menuTrigger: {
    padding: 4,
  },
  dropdownMenu: {
    position: 'absolute',
    right: 12,
    top: 50,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    zIndex: 1000,
    minWidth: 160,
    padding: 4,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  menuItemConfirm: {
    backgroundColor: '#ef4444',
  },
  menuItemText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  menuItemTextConfirm: {
    color: '#fff',
  },
  // 2. Media Carousel (0px)
  processingBox: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingTitle: {
    marginTop: 12,
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
  loadingBox: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBox: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  // --- Video Overlays ---
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  muteIndicator: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationContainer: {
    position: 'absolute',
    bottom: -20, // Move dots slightly below the media like modern IG
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'center',
    gap: 4,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#cbd5e1',
  },
  paginationDotActive: {
    backgroundColor: '#2563eb',
    width: 8, // Slightly larger active dot
  },
  // --- 3. Review Bar (16px) ---
  reviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  rightActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  doneBtn: {
    height: 42,
    paddingHorizontal: 16,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    elevation: 2,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  doneBtnSuccess: {
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
  },
  doneBtnLocked: {
    backgroundColor: '#e2e8f0',
    elevation: 0,
    shadowOpacity: 0,
  },
  doneBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  freqDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  freqLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  freqLabelStale: {
    color: '#94a3b8',
    textDecorationLine: 'line-through',
    backgroundColor: 'transparent',
  },
  freqArrow: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '700',
  },
  freqLabelNew: {
    fontSize: 14,
    fontWeight: '900',
    color: '#2563eb',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: '#e2e8f0',
  },
  stepControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepBtnIcon: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  // --- 4. Caption Area (30px) ---
  captionArea: {
    paddingHorizontal: 30,
    paddingBottom: 24,
  },
  postTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 24,
    marginBottom: 6,
    padding: 0,
    margin: 0,
  },
  noteContent: {
    fontSize: 15,
    lineHeight: 22,
    color: '#334155',
    padding: 0,
    margin: 0,
  },
  inputReset: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  placeholderText: {
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  editorContainer: {
    marginBottom: 12,
  },
  noteInput: {
    textAlignVertical: 'top',
    minHeight: 80,
  },
  originalCaptionSection: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  },
  captionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  captionToggleText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  originalCaptionCard: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#cbd5e1',
  },
  originalCaptionText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#475569',
    fontStyle: 'italic',
  },
  labelPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  pill: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: '#e2e8f0',
  },
  pillText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  footerInfo: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  reviewTimeline: {
    fontSize: 11,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
});
// --- Instagram Video Component ---

const InstagramVideo = ({ source, isVisible }: { source: any; isVisible?: boolean }) => {
  const videoRef = useRef<Video>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [showMuteIndicator, setShowMuteIndicator] = useState(false);
  const muteAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isVisible) {
      videoRef.current?.pauseAsync();
    } else if (!isPaused) {
      videoRef.current?.playAsync();
    }
  }, [isVisible, isPaused]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
    setShowMuteIndicator(true);
    muteAnim.setValue(1);
    Animated.timing(muteAnim, {
      toValue: 0,
      duration: 1000,
      useNativeDriver: true,
    }).start(() => setShowMuteIndicator(false));
  };

  const handleLongPress = (event: any) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      setIsPaused(true);
      videoRef.current?.pauseAsync();
    } else if (
      event.nativeEvent.state === State.END ||
      event.nativeEvent.state === State.CANCELLED
    ) {
      setIsPaused(false);
      if (isVisible) videoRef.current?.playAsync();
    }
  };

  return (
    <LongPressGestureHandler onHandlerStateChange={handleLongPress} minDurationMs={200}>
      <View style={styles.mediaContainer}>
        <TapGestureHandler
          onHandlerStateChange={(e) => e.nativeEvent.state === State.ACTIVE && toggleMute()}
        >
          <View style={StyleSheet.absoluteFill}>
            <Video
              ref={videoRef}
              style={styles.media}
              source={source}
              resizeMode={ResizeMode.CONTAIN} // Switch to contain to see full 9:16 Reels
              isLooping
              isMuted={isMuted}
              shouldPlay={isVisible && !isPaused}
            />

            {/* Hold to Pause Indicator */}
            {isPaused && (
              <View style={styles.videoOverlay}>
                <View style={styles.pauseIconContainer}>
                  <Play size={40} color="#fff" fill="#fff" style={{ marginLeft: 4 }} />
                </View>
              </View>
            )}

            {/* Mute/Unmute Indicator */}
            {showMuteIndicator && (
              <Animated.View style={[styles.muteIndicator, { opacity: muteAnim }]}>
                {isMuted ? <VolumeX size={24} color="#fff" /> : <Volume2 size={24} color="#fff" />}
              </Animated.View>
            )}
          </View>
        </TapGestureHandler>
      </View>
    </LongPressGestureHandler>
  );
};
