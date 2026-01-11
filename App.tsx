import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ShareIntentProvider } from './src/providers/ShareIntentProvider';
import { ShareIntentModal } from './src/components/ShareIntentModal';
import { FeedScreen } from './src/screens/FeedScreen';
import { initDb } from './src/db';

// Ensure DB is ready
initDb();

export default function App() {
  return (
    <SafeAreaProvider>
      <ShareIntentProvider>
        <FeedScreen />
        {/* The modal is rendered globally if an intent exists */}
        <ShareIntentModal />
      </ShareIntentProvider>
    </SafeAreaProvider>
  );
}
