import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ShareIntentProvider, useShareIntentContext } from '@/context/ShareIntentContext';
import { FeedScreen } from '@/screens/FeedScreen';
import { CaptureModal } from '@/components/CaptureModal';
import { initDb } from '@/db';

const MainLayout = () => {
  const { hasShareIntent, value, resetShareIntent } = useShareIntentContext();

  /**
   * If there is an active share intent, we render ONLY the CaptureModal.
   * This is key for the Dialog-themed Share activity to look professional
   * and avoid showing the main app feed in the background.
   */
  if (hasShareIntent) {
    return (
      <View style={styles.shareOverlay}>
        <StatusBar style="dark" />
        <CaptureModal shareValue={value} onClose={resetShareIntent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <FeedScreen />
    </View>
  );
};

export default function App() {
  useEffect(() => {
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
    backgroundColor: '#fff',
    flex: 1,
  },
  shareOverlay: {
    // Transparent background so the Android dialog style shows the underlying activity (Instagram)
    backgroundColor: 'transparent',
    flex: 1,
  },
});
