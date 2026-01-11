import React, { useEffect, useState } from "react";
import { View, Text, Button, Modal } from "react-native";
import * as Linking from "expo-linking";
import { initDb } from "./src/db";
import { CaptureModal } from "./src/screens/CaptureModal";
import { Feed } from "./src/screens/Feed";

export default function App() {
  const [sharedUrl, setSharedUrl] = useState<string | null>(null);

  useEffect(() => {
    initDb();
    Linking.getInitialURL().then(url => {
      if (url) setSharedUrl(url);
    });
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <Feed />
      <Modal visible={!!sharedUrl} animationType="slide">
        <CaptureModal
          url={sharedUrl!}
          onClose={() => setSharedUrl(null)}
        />
      </Modal>
    </View>
  );
}
