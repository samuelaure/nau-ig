import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  ShareIntentProvider,
  useShareIntent
} from './src/providers/ShareIntentProvider';
import { ShareIntentModal } from './src/components/ShareIntentModal';
import { FeedScreen } from './src/screens/FeedScreen';
import { initDb } from './src/db';
import { StatusBar } from 'expo-status-bar';

// Initialize SQLite schema
initDb();

/**
 * RootContent manages the conditional rendering to prevent "jumping"
 * when a share intent is captured.
 */
const RootContent = () => {
  const { value } = useShareIntent();

  // If there is an active sharing value, we render ONLY the modal.
  // This helps prevent the "app jump" feel by not rendering the full Feed background.
  if (value && value.value) {
    return (
      <GestureHandlerRootView
        style={{ flex: 1, backgroundColor: 'transparent' }}
      >
        <ShareIntentModal />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <FeedScreen />
      <ShareIntentModal />
    </GestureHandlerRootView>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <ShareIntentProvider>
        <RootContent />
      </ShareIntentProvider>
    </SafeAreaProvider>
  );
}
