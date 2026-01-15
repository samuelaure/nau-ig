import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ShareIntentProvider, useShareIntentContext } from '@/context/ShareIntentContext';
import { FeedScreen } from '@/screens/FeedScreen';
import { CaptureModal } from '@/components/CaptureModal';
import { initDb } from '@/db';

const MainLayout = ({ isCapture }: { isCapture?: boolean }) => {
  const { hasShareIntent, value, resetShareIntent } = useShareIntentContext();

  /**
   * If we are in CaptureActivity (isCapture is true), we MUST show either
   * the CaptureModal or a loading state. We never show the FeedScreen here.
   */
  if (isCapture) {
    if (hasShareIntent) {
      return (
        <View style={styles.shareOverlay}>
          <StatusBar style="dark" />
          <CaptureModal shareValue={value} onClose={resetShareIntent} />
        </View>
      );
    }

    // While waiting for the intent to be processed by the library
    return (
      <View style={styles.shareOverlay}>
        <StatusBar style="dark" />
        {/* Transparent loading state or a subtle spinner could go here if needed */}
      </View>
    );
  }

  // Normal app flow
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <FeedScreen />
    </View>
  );
};

export default function App(props: any) {
  useEffect(() => {
    initDb().catch((err) => {
      console.error('CRITICAL: DB Init Error:', err);
    });
  }, []);

  return (
    <SafeAreaProvider>
      <ShareIntentProvider>
        <MainLayout isCapture={props?.isCapture} />
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
