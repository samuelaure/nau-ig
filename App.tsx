import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  ShareIntentProvider,
  useShareIntentContext
} from './src/context/ShareIntentContext';
import { FeedScreen } from './src/screens/FeedScreen';
import { CaptureModal } from './src/components/CaptureModal';
import { initDb } from './src/db';

const MainLayout = () => {
  const { hasShareIntent, value, resetShareIntent } = useShareIntentContext();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <FeedScreen />
      {hasShareIntent && (
        <CaptureModal shareValue={value} onClose={resetShareIntent} />
      )}
    </View>
  );
};

export default function App() {
  useEffect(() => {
    (async () => {
      try {
        await initDb();
      } catch (err) {
        console.error('DB Init Error:', err);
      }
    })();
  }, []);

  return (
    <ShareIntentProvider>
      <MainLayout />
    </ShareIntentProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000'
  }
});
