import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Settings, LayoutGrid, Clock } from 'lucide-react-native';
import { FeedItem } from '../components/FeedItem';
import { SettingsModal } from '../components/SettingsModal';
import {
  getDuePosts,
  getReviewedPosts,
  Post
} from '../repositories/PostRepository';

type FeedTab = 'due' | 'reviewed';

export const FeedScreen = () => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<FeedTab>('due');
  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);

  const loadFeed = useCallback(async () => {
    try {
      const data =
        activeTab === 'due' ? await getDuePosts() : await getReviewedPosts();
      setPosts(data);
    } catch (error) {
      console.error('Failed to load feed:', error);
    }
  }, [activeTab]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const onRefresh = async () => {
    setRefreshing(true);
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

      {/* Tab Switcher */}
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
        onClose={() => setSettingsVisible(false)}
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
