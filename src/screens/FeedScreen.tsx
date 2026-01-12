import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  ScrollView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Settings,
  LayoutGrid,
  Clock,
  Tag as TagIcon
} from 'lucide-react-native';
import { FeedItem } from '../components/FeedItem';
import { SettingsModal } from '../components/SettingsModal';
import {
  getDuePosts,
  getReviewedPosts,
  getPendingPosts,
  getAllTags,
  updatePostMedia,
  Post
} from '../repositories/PostRepository';
import { getSetting } from '../storage/settings';
import { sendToMake } from '../services/make';

type FeedTab = 'due' | 'reviewed';

export const FeedScreen = () => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<FeedTab>('due');
  const [posts, setPosts] = useState<Post[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const syncInterval = useRef<NodeJS.Timeout | null>(null);

  const loadFeed = useCallback(async () => {
    try {
      const data =
        activeTab === 'due'
          ? await getDuePosts(selectedTag)
          : await getReviewedPosts(selectedTag);
      setPosts(data);

      const tags = await getAllTags();
      setAvailableTags(tags);
    } catch (error) {
      console.error('Failed to load feed:', error);
    }
  }, [activeTab, selectedTag]);

  /**
   * Optimized Background Sync:
   * Batches all pending posts into a single request to the Make webhook.
   */
  const performBackgroundSync = useCallback(async () => {
    const webhookUrl = await getSetting('make_webhook_url');
    if (!webhookUrl) return;

    const pending = await getPendingPosts();
    if (pending.length === 0) return;

    try {
      const response = await sendToMake(webhookUrl, {
        action: 'sync_batch',
        items: pending.map((p) => ({ id: p.id, url: p.instagramUrl }))
      });

      if (response.status === 'success' && response.results) {
        let hasUpdates = false;
        for (const [postId, result] of Object.entries(response.results)) {
          if (result.status === 'success' && result.mediaData) {
            await updatePostMedia(Number(postId), result.mediaData);
            hasUpdates = true;
          }
        }
        if (hasUpdates) loadFeed();
      }
    } catch (e) {
      // Silent fail for polling
    }
  }, [loadFeed]);

  useEffect(() => {
    loadFeed();
    // Poll every 10 seconds while the app is foregrounded
    syncInterval.current = setInterval(performBackgroundSync, 10000);
    return () => {
      if (syncInterval.current) clearInterval(syncInterval.current);
    };
  }, [loadFeed, performBackgroundSync]);

  const onRefresh = async () => {
    setRefreshing(true);
    await performBackgroundSync();
    await loadFeed();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <View style={styles.topBarSide} />
        <Text style={styles.logo}>9naŭ IG</Text>
        <TouchableOpacity
          style={styles.topBarSide}
          onPress={() => setSettingsVisible(true)}
        >
          <Settings size={22} color="#000" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'due' && styles.activeTab]}
          onPress={() => setActiveTab('due')}
        >
          <LayoutGrid
            size={20}
            color={activeTab === 'due' ? '#000' : '#9ca3af'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'due' && styles.activeTabText
            ]}
          >
            To Review
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'reviewed' && styles.activeTab]}
          onPress={() => setActiveTab('reviewed')}
        >
          <Clock
            size={20}
            color={activeTab === 'reviewed' ? '#000' : '#9ca3af'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'reviewed' && styles.activeTabText
            ]}
          >
            History
          </Text>
        </TouchableOpacity>
      </View>

      {availableTags.length > 0 && (
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
              <Text
                style={[
                  styles.tagChipText,
                  !selectedTag && styles.tagChipTextActive
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            {availableTags.map((tag) => (
              <TouchableOpacity
                key={tag}
                onPress={() => setSelectedTag(tag === selectedTag ? null : tag)}
                style={[
                  styles.tagChip,
                  selectedTag === tag && styles.tagChipActive
                ]}
              >
                <TagIcon
                  size={12}
                  color={selectedTag === tag ? '#fff' : '#4b5563'}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.tagChipText,
                    selectedTag === tag && styles.tagChipTextActive
                  ]}
                >
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
        renderItem={({ item }) => (
          <FeedItem
            post={item}
            onProcessed={loadFeed}
            isHistory={activeTab === 'reviewed'}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {activeTab === 'due'
                ? 'You reached Review Zero!'
                : 'No history yet.'}
            </Text>
            <Text style={styles.emptySubText}>
              {activeTab === 'due'
                ? 'Great job! Check your history or capture more content.'
                : 'Reviewed posts will appear here.'}
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
    flex: 1,
    backgroundColor: '#fff'
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#fff'
  },
  topBarSide: {
    width: 40,
    alignItems: 'flex-end',
    justifyContent: 'center'
  },
  logo: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -1,
    color: '#000',
    textAlign: 'center'
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#000'
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af'
  },
  activeTabText: {
    color: '#000'
  },
  tagBarContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#fafafa'
  },
  tagScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  tagChipActive: {
    backgroundColor: '#000',
    borderColor: '#000'
  },
  tagChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4b5563'
  },
  tagChipTextActive: {
    color: '#fff'
  },
  empty: {
    flex: 1,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827'
  },
  emptySubText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8
  }
});
