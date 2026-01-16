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
  Tag as TagIcon
} from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { FeedItem } from '@/components/FeedItem';
import { SettingsModal } from '@/components/SettingsModal';
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

  // Animation values for Sidebar
  const sidebarOffset = useSharedValue(-width * 0.85);
  const overlayOpacity = useSharedValue(0);

  const toggleSidebar = () => {
    const nextState = !sidebarVisible;
    setSidebarVisible(nextState);
    sidebarOffset.value = withSpring(nextState ? 0 : -width * 0.85, {
      damping: 20,
      stiffness: 90
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
      case 'due': return 'To Review';
      case 'reviewed': return 'History';
      case 'trash': return 'Trash';
      default: return '9naŭ IG';
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
    itemVisiblePercentThreshold: 60, // Item is "visible" if 60% is on screen
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
          <Text style={styles.sidebarLogo}>9naŭ IG</Text>
          <TouchableOpacity onPress={toggleSidebar}>
            <X size={24} color="#000" />
          </TouchableOpacity>
        </View>

        <View style={styles.sidebarContent}>
          <TouchableOpacity
            style={[styles.sidebarItem, activeTab === 'due' && styles.sidebarItemActive]}
            onPress={() => handleTabChange('due')}
          >
            <LayoutGrid size={22} color={activeTab === 'due' ? '#2563eb' : '#4b5563'} />
            <Text style={[styles.sidebarItemText, activeTab === 'due' && styles.sidebarItemTextActive]}>To Review</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sidebarItem, activeTab === 'reviewed' && styles.sidebarItemActive]}
            onPress={() => handleTabChange('reviewed')}
          >
            <Clock size={22} color={activeTab === 'reviewed' ? '#2563eb' : '#4b5563'} />
            <Text style={[styles.sidebarItemText, activeTab === 'reviewed' && styles.sidebarItemTextActive]}>History</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sidebarFooter}>
          <TouchableOpacity
            style={[styles.sidebarItem, activeTab === 'trash' && styles.sidebarItemActive]}
            onPress={() => handleTabChange('trash')}
          >
            <Trash2 size={22} color={activeTab === 'trash' ? '#ef4444' : '#4b5563'} />
            <Text style={[styles.sidebarItemText, activeTab === 'trash' && styles.sidebarItemTextActive]}>Trash</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sidebarItem}
            onPress={() => { setSettingsVisible(true); toggleSidebar(); }}
          >
            <Settings size={22} color="#4b5563" />
            <Text style={styles.sidebarItemText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Top Bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.topBarSide} onPress={toggleSidebar}>
          <Menu size={24} color="#000" />
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
                onPress={() => setSelectedTag(tag === selectedTag ? null : tag)}
                style={[styles.tagChip, selectedTag === tag && styles.tagChipActive]}
              >
                <TagIcon
                  size={12}
                  color={selectedTag === tag ? '#fff' : '#4b5563'}
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

      <FlatList
        data={posts}
        keyExtractor={(item) => `${activeTab}-${item.id}`}
        renderItem={({ item }) => {
          if (activeTab === 'trash') {
            return (
              <View style={styles.trashCard}>
                <View style={styles.trashInfo}>
                  <Text style={styles.trashTitle}>{item.title || 'Untitled Capture'}</Text>
                  <Text style={styles.trashDate}>Deleted on {item.deleted_at}</Text>
                </View>
                <View style={styles.trashActions}>
                  <TouchableOpacity onPress={() => handleUntrash(item.id)} style={styles.untrashBtn}>
                    <RotateCcw size={20} color="#10b981" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handlePermanentDelete(item.id)} style={styles.permaDeleteBtn}>
                    <Trash size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }
          return (
            <FeedItem
              post={item}
              onProcessed={loadFeed}
              isHistory={activeTab === 'reviewed'}
              isVisible={viewableItems.has(item.id)}
            />
          );
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {activeTab === 'due' ? 'You reached Review Zero!' :
                activeTab === 'reviewed' ? 'No history yet.' : 'Trash is empty.'}
            </Text>
            <Text style={styles.emptySubText}>
              {activeTab === 'due'
                ? 'Great job! Check your history or capture more content.'
                : activeTab === 'reviewed'
                  ? 'Reviewed posts will appear here.'
                  : 'Deleted captures will wait here until permanent cleanup.'}
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
      />

      <SettingsModal
        visible={settingsVisible}
        onClose={() => {
          setSettingsVisible(false);
          loadFeed();
        }}
      />
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
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -1,
    color: '#000',
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
    backgroundColor: '#eff6ff',
    borderRadius: 12,
  },
  sidebarItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4b5563',
  },
  sidebarItemTextActive: {
    color: '#2563eb',
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
    color: '#000',
    fontSize: 20,
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
    backgroundColor: '#000',
    borderColor: '#000',
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
});
