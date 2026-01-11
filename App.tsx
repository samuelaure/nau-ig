import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ShareIntentProvider } from './src/providers/ShareIntentProvider';
import { ShareIntentModal } from './src/components/ShareIntentModal';
import { FeedScreen } from './src/screens/FeedScreen';
import { initDb } from './src/db';

// Single entry point for database and schema initialization
initDb();

export default function App() {
  return (
    <SafeAreaProvider>
      <ShareIntentProvider>
        {/* The main feed where intentional repetition happens */}
        <FeedScreen />

        {/* Overlay that intercepts Instagram shares */}
        <ShareIntentModal />
      </ShareIntentProvider>
    </SafeAreaProvider>
  );
}
