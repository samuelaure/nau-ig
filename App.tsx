import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ShareIntentProvider, useShareIntentContext } from '@/context/ShareIntentContext';
import { FeedScreen } from '@/screens/FeedScreen';
import { CaptureModal } from '@/components/CaptureModal';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initDb } from '@/db';

const MainLayout = () => {
  const { hasShareIntent, value, resetShareIntent } = useShareIntentContext();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <FeedScreen />
      {hasShareIntent && <CaptureModal shareValue={value} onClose={resetShareIntent} />}
    </View>
  );
};

export default function App() {
  useEffect(() => {
    // Correctly await the DB initialization
    initDb().catch((err) => {
      console.error('CRITICAL: DB Init Error:', err);
    });
  }, []);

  return (
    <SafeAreaProvider>
      <ShareIntentProvider>
        <MainLayout />
      </ShareIntentProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    flex: 1,
  },
});
