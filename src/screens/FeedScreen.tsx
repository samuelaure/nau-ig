import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Menu,
  LayoutGrid,
  Clock,
  Trash2,
  X,
  RotateCcw,
  Trash,
  Settings,
  Tag as TagIcon,
  Plus,
} from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { FeedItem } from '@/components/FeedItem';
import { SettingsModal } from '@/components/SettingsModal';
import { CaptureModal } from '@/components/CaptureModal';
import {
  getDuePosts,
  getReviewedPosts,
  getDeletedPosts,
  getAllTags,
  Post,
  untrashPost,
  deletePost,
} from '@/repositories/PostRepository';
import { syncManager } from '@/services/SyncManager';
import { COLORS } from '@/constants';

type FeedTab = 'due' | 'reviewed' | 'trash';
const { width } = Dimensions.get('window');

export const FeedScreen = () => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<FeedTab>('due');
  const [posts, setPosts] = useState<Post[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [viewableItems, setViewableItems] = useState<Set<number>>(new Set());
  const [manualCaptureVisible, setManualCaptureVisible] = useState(false);

  // Animation values for Sidebar
  const sidebarOffset = useSharedValue(-width * 0.85);
  const overlayOpacity = useSharedValue(0);

  const toggleSidebar = () => {
    const nextState = !sidebarVisible;
    setSidebarVisible(nextState);
    sidebarOffset.value = withSpring(nextState ? 0 : -width * 0.85, {
      damping: 20,
      stiffness: 90,
    });
    overlayOpacity.value = withTiming(nextState ? 1 : 0, { duration: 300 });
  };

  const loadFeed = useCallback(async () => {
    try {
      let data: Post[] = [];
      if (activeTab === 'due') {
        data = await getDuePosts(selectedTag);
      } else if (activeTab === 'reviewed') {
        data = await getReviewedPosts(selectedTag);
      } else if (activeTab === 'trash') {
        data = await getDeletedPosts();
      }
      setPosts(data);

      const tags = await getAllTags();
      setAvailableTags(tags);
    } catch (error) {
      console.error('Failed to load feed:', error);
    }
  }, [activeTab, selectedTag]);

  useEffect(() => {
    loadFeed();
    syncManager.triggerSync(15000);
    const unsubscribe = syncManager.subscribe(() => {
      loadFeed();
    });
    return () => {
      unsubscribe();
      syncManager.stop();
    };
  }, [loadFeed]);

  const onRefresh = async () => {
    setRefreshing(true);
    await syncManager.performSync();
    await loadFeed();
    setRefreshing(false);
  };

  const handleTabChange = (tab: FeedTab) => {
    setActiveTab(tab);
    toggleSidebar();
  };

  const handleUntrash = async (id: number) => {
    await untrashPost(id);
    loadFeed();
  };

  const handlePermanentDelete = async (id: number) => {
    await deletePost(id);
    loadFeed();
  };

  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'due':
        return 'To Review';
      case 'reviewed':
        return 'History';
      case 'trash':
        return 'Trash';
      default:
        return '9naŭ';
    }
  };

  // Reanimated Styles
  const sidebarStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sidebarOffset.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
    display: overlayOpacity.value === 0 ? 'none' : 'flex',
  }));

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    const ids = new Set<number>(viewableItems.map((item: any) => item.item.id));
    setViewableItems(ids);
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 40,
  }).current;

  return (
    <View style={styles.container}>
      {/* Sidebar Overlay */}
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <TouchableOpacity style={styles.overlayFill} activeOpacity={1} onPress={toggleSidebar} />
      </Animated.View>

      {/* Sidebar Surface */}
      <Animated.View style={[styles.sidebar, sidebarStyle, { paddingTop: insets.top }]}>
        <View style={styles.sidebarHeader}>
          <View style={styles.logoBadge}>
            <Text style={styles.sidebarLogo}>naŭ</Text>
          </View>
          <TouchableOpacity onPress={toggleSidebar}>
            <X size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.sidebarContent}>
          <TouchableOpacity
            style={[styles.sidebarItem, activeTab === 'due' && styles.sidebarItemActive]}
            onPress={() => handleTabChange('due')}
          >
            <LayoutGrid size={22} color={activeTab === 'due' ? COLORS.secondary : '#4b5563'} />
            <Text
              style={[
                styles.sidebarItemText,
                activeTab === 'due' && { color: COLORS.secondary, fontWeight: '800' },
              ]}
            >
              To Review
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sidebarItem, activeTab === 'reviewed' && styles.sidebarItemActive]}
            onPress={() => handleTabChange('reviewed')}
          >
            <Clock size={22} color={activeTab === 'reviewed' ? COLORS.secondary : '#4b5563'} />
            <Text
              style={[
                styles.sidebarItemText,
                activeTab === 'reviewed' && { color: COLORS.secondary, fontWeight: '800' },
              ]}
            >
              History
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sidebarFooter}>
          <TouchableOpacity
            style={[styles.sidebarItem, activeTab === 'trash' && styles.sidebarItemActive]}
            onPress={() => handleTabChange('trash')}
          >
            <Trash2 size={22} color={activeTab === 'trash' ? COLORS.error : '#4b5563'} />
            <Text
              style={[
                styles.sidebarItemText,
                activeTab === 'trash' && { color: COLORS.error, fontWeight: '800' },
              ]}
            >
              Trash
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sidebarItem}
            onPress={() => {
              setSettingsVisible(true);
              toggleSidebar();
            }}
          >
            <Settings size={22} color="#4b5563" />
            <Text style={styles.sidebarItemText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Top Bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.topBarSide} onPress={toggleSidebar}>
          <Menu size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.logo}>{getHeaderTitle()}</Text>
        <View style={styles.topBarSide} />
      </View>

      {activeTab !== 'trash' && availableTags.length > 0 && (
        <View style={styles.tagBarContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tagScroll}
          >
            <TouchableOpacity
              onPress={() => setSelectedTag(null)}
              style={[styles.tagChip, !selectedTag && styles.tagChipActive]}
            >
              <Text style={[styles.tagChipText, !selectedTag && styles.tagChipTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            {availableTags.map((tag) => (
              <TouchableOpacity
                key={tag}
                onPress={() => setSelectedTag(tag)}
                style={[styles.tagChip, selectedTag === tag && styles.tagChipActive]}
              >
                <TagIcon
                  size={12}
                  color={selectedTag === tag ? '#fff' : '#64748b'}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.tagChipText, selectedTag === tag && styles.tagChipTextActive]}>
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {activeTab === 'trash' ? (
        <FlatList
          key="trash-list"
          data={posts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.trashCard}>
              <View style={styles.trashInfo}>
                <Text style={styles.trashTitle}>{item.title || 'Untitled Capture'}</Text>
                <Text style={styles.trashDate}>Deleted on {item.deleted_at}</Text>
              </View>
              <View style={styles.trashActions}>
                <TouchableOpacity style={styles.untrashBtn} onPress={() => handleUntrash(item.id)}>
                  <RotateCcw size={18} color="#16a34a" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.permaDeleteBtn}
                  onPress={() => handlePermanentDelete(item.id)}
                >
                  <Trash size={18} color="#dc2626" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Trash2 size={48} color="#e2e8f0" />
              <Text style={styles.emptyText}>Trash is empty</Text>
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      ) : (
        <FlatList
          key="feed-list"
          data={posts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <FeedItem
              post={item}
              onProcessed={loadFeed}
              isHistory={activeTab === 'reviewed'}
              isVisible={viewableItems.has(item.id)}
            />
          )}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          ListEmptyComponent={
            <View style={styles.empty}>
              <LayoutGrid size={48} color="#e2e8f0" />
              <Text style={styles.emptyText}>No captures yet</Text>
              <Text style={styles.emptySubText}>
                Share an Instagram post or Reel to Learning Loop to see it here.
              </Text>
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}

      {settingsVisible && (
        <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
      )}

      {manualCaptureVisible && (
        <CaptureModal
          shareValue=""
          onClose={() => {
            setManualCaptureVisible(false);
            loadFeed();
          }}
          isShareIntent={false}
        />
      )}

      {/* Floating Action Button */}
      {activeTab === 'due' && (
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 20 }]}
          onPress={() => setManualCaptureVisible(true)}
          activeOpacity={0.8}
        >
          <Plus size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1000,
  },
  overlayFill: {
    flex: 1,
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: width * 0.85,
    backgroundColor: '#fff',
    zIndex: 1001,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sidebarLogo: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1,
  },
  logoBadge: {
    backgroundColor: '#3b0764',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sidebarContent: {
    flex: 1,
    paddingTop: 20,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 12,
    gap: 15,
    marginBottom: 4,
  },
  sidebarItemActive: {
    backgroundColor: '#f5f3ff',
    borderRadius: 12,
  },
  sidebarItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4b5563',
  },
  sidebarFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingBottom: 40,
    paddingTop: 10,
  },
  empty: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    marginTop: 100,
    padding: 40,
  },
  emptySubText: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyText: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '700',
  },
  logo: {
    color: '#3b0764',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  topBar: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomColor: '#f3f4f6',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 15,
    paddingHorizontal: 16,
  },
  topBarSide: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    width: 40,
  },
  tagBarContainer: {
    backgroundColor: '#fff',
    borderBottomColor: '#f1f5f9',
    borderBottomWidth: 1,
  },
  tagChip: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagChipActive: {
    backgroundColor: '#3b0764',
    borderColor: '#3b0764',
  },
  tagChipText: {
    color: '#4b5563',
    fontSize: 12,
    fontWeight: '600',
  },
  tagChipTextActive: {
    color: '#fff',
  },
  tagScroll: {
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  trashCard: {
    flexDirection: 'row',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trashInfo: {
    flex: 1,
  },
  trashTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  trashDate: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  trashActions: {
    flexDirection: 'row',
    gap: 15,
  },
  untrashBtn: {
    padding: 8,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
  },
  permaDeleteBtn: {
    padding: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#7c7cff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#7c7cff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    zIndex: 999,
  },
});
