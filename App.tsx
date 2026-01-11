import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ShareIntentProvider } from './src/providers/ShareIntentProvider';
import { ShareIntentModal } from './src/components/ShareIntentModal';
import { FeedScreen } from './src/screens/FeedScreen';
import { initDb } from './src/db';
import { StatusBar } from 'expo-status-bar';

initDb();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" translucent backgroundColor="transparent" />
        <ShareIntentProvider>
          <FeedScreen />
          <ShareIntentModal />
        </ShareIntentProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
