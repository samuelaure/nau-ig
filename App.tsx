import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ShareIntentProvider } from './src/providers/ShareIntentProvider';
import { ShareIntentModal } from './src/components/ShareIntentModal';
import { FeedScreen } from './src/screens/FeedScreen';
import { initDb } from './src/db';

// Initialize the local-first database
initDb();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ShareIntentProvider>
          {/* Main Habit-Aware Feed */}
          <FeedScreen />
          
          {/* Share Capture Overlay */}
          <ShareIntentModal />
        </ShareIntentProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
