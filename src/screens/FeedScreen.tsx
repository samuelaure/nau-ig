import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Settings, LayoutGrid, Clock, Tag as TagIcon } from 'lucide-react-native';
import { FeedItem } from '@/components/FeedItem';
import { SettingsModal } from '@/components/SettingsModal';
import {
  getDuePosts,
  getReviewedPosts,
  getAllTags,
  Post,
} from '@/repositories/PostRepository';
import { syncManager } from '@/services/SyncManager';

type FeedTab = 'due' | 'reviewed';

export const FeedScreen = () => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<FeedTab>('due');
  const [posts, setPosts] = useState<Post[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);

  const loadFeed = useCallback(async () => {
    try {
      const data =
        activeTab === 'due' ? await getDuePosts(selectedTag) : await getReviewedPosts(selectedTag);
      setPosts(data);

      const tags = await getAllTags();
      setAvailableTags(tags);
    } catch (error) {
      console.error('Failed to load feed:', error);
    }
  }, [activeTab, selectedTag]);

  useEffect(() => {
    loadFeed();

    // Start the centralized sync service (industry-standard background manager)
    syncManager.start(15000);

    // Subscribe to sync events to automatically refresh the feed when data arrives
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
    // Explicitly trigger a sync on pull-to-refresh
    await syncManager.sync();
    await loadFeed();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <View style={styles.topBarSide} />
        <Text style={styles.logo}>9naŭ IG</Text>
        <TouchableOpacity style={styles.topBarSide} onPress={() => setSettingsVisible(true)}>
          <Settings size={22} color="#000" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'due' && styles.activeTab]}
          onPress={() => setActiveTab('due')}
        >
          <LayoutGrid size={20} color={activeTab === 'due' ? '#000' : '#9ca3af'} />
          <Text style={[styles.tabText, activeTab === 'due' && styles.activeTabText]}>
            To Review
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'reviewed' && styles.activeTab]}
          onPress={() => setActiveTab('reviewed')}
        >
          <Clock size={20} color={activeTab === 'reviewed' ? '#000' : '#9ca3af'} />
          <Text style={[styles.tabText, activeTab === 'reviewed' && styles.activeTabText]}>
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
        renderItem={({ item }) => (
          <FeedItem post={item} onProcessed={loadFeed} isHistory={activeTab === 'reviewed'} />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {activeTab === 'due' ? 'You reached Review Zero!' : 'No history yet.'}
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
  activeTab: {
    borderBottomColor: '#000',
    borderBottomWidth: 2,
  },
  activeTabText: {
    color: '#000',
  },
  container: {
    backgroundColor: '#fff',
    flex: 1,
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
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -1,
    textAlign: 'center',
  },
  tab: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  tabContainer: {
    borderBottomColor: '#f3f4f6',
    borderBottomWidth: 1,
    flexDirection: 'row',
  },
  tabText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '600',
  },
  tagBarContainer: {
    backgroundColor: '#fafafa',
    borderBottomColor: '#f3f4f6',
    borderBottomWidth: 1,
  },
  tagChip: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#e5e7eb',
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
  topBar: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomColor: '#f3f4f6',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  topBarSide: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    width: 40,
  },
});
