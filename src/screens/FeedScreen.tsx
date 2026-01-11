import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets
} from 'react-native-safe-area-context';
import { Settings } from 'lucide-react-native';
import { FeedItem } from '../components/FeedItem';
import { SettingsModal } from '../components/SettingsModal';
import { getDuePosts, Post } from '../repositories/PostRepository';

export const FeedScreen = () => {
  const insets = useSafeAreaInsets();
  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);

  const loadFeed = useCallback(async () => {
    try {
      const data = await getDuePosts();
      setPosts(data);
    } catch (error) {
      console.error('Failed to load feed:', error);
    }
  }, []);

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

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <FeedItem post={item} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Nothing due for review yet.</Text>
            <Text style={styles.emptySubText}>
              Capture posts from Instagram to start your habit.
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
