import React, { useState } from "react";
import { View, TextInput, Button } from "react-native";
import { db } from "../db";
import { initialRepetition } from "../repetition";

export function CaptureModal({ url, onClose }: { url: string; onClose: () => void }) {
  const [caption, setCaption] = useState("");

  const save = () => {
    const createdAt = Date.now();
    db.transaction(tx => {
      tx.executeSql(
        "INSERT INTO posts (instagramUrl, caption, createdAt) values (?, ?, ?)",
        [url, caption, createdAt],
        (_, result) => {
          const rep = initialRepetition();
          tx.executeSql(
            "INSERT INTO repetition (postId, interval, nextDueAt) values (?, ?, ?)",
            [result.insertId, rep.interval, rep.nextDueAt]
          );
        }
      );
    });
    onClose();
  };

  return (
    <View style={{ padding: 16 }}>
      <TextInput
        placeholder="Optional note"
        value={caption}
        onChangeText={setCaption}
        style={{ borderWidth: 1, marginBottom: 12 }}
      />
      <Button title="Save" onPress={save} />
    </View>
  );
}
