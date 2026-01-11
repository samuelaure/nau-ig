import React, { useEffect, useState } from 'react';
import { View, Modal } from 'react-native';
import * as Linking from 'expo-linking';
import { initDb } from './src/db';
import { CaptureModal } from './src/screens/CaptureModal';
import { Feed } from './src/screens/Feed';
import { Settings } from './src/screens/Settings';

export default function App() {
  const [sharedUrl, setSharedUrl] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    initDb();

    const sub = Linking.addEventListener('url', ({ url }) => {
      if (url) setSharedUrl(url);
    });

    return () => sub.remove();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {showSettings ? (
        <Settings onClose={() => setShowSettings(false)} />
      ) : (
        <Feed onOpenSettings={() => setShowSettings(true)} />
      )}

      <Modal visible={!!sharedUrl} animationType="slide">
        {sharedUrl && (
          <CaptureModal
            instagramUrl={sharedUrl}
            onClose={() => setSharedUrl(null)}
          />
        )}
      </Modal>
    </View>
  );
}
