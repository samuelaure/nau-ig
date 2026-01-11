import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  ActivityIndicator
} from "react-native";
import { db } from "../db";
import { initialRepetition } from "../repetition";
import { getSetting } from "../storage/settings";
import { sendToMake } from "../services/make";

export function CaptureModal({
  instagramUrl,
  onClose
}: {
  instagramUrl: string;
  onClose: () => void;
}) {
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const save = async () => {
    setLoading(true);

    const webhook = await getSetting("makeWebhook");
    let mediaUrl = null;
    let mediaType = null;

    if (webhook) {
      try {
        const data = await sendToMake(webhook, instagramUrl);
        mediaUrl = data.mediaUrl;
        mediaType = data.mediaType;
      } catch { }
    }

    const createdAt = Date.now();
    const rep = initialRepetition();

    db.transaction(tx => {
      tx.executeSql(
        `
        INSERT INTO posts
        (instagramUrl, note, mediaUrl, mediaType, createdAt)
        VALUES (?, ?, ?, ?, ?)
        `,
        [instagramUrl, note, mediaUrl, mediaType, createdAt],
        (_, result) => {
          tx.executeSql(
            `
            INSERT INTO repetition
            (postId, interval, nextDueAt, lastInteractionAt)
            VALUES (?, ?, ?, ?)
            `,
            [
              result.insertId || 0,
              rep.interval,
              rep.nextDueAt,
              rep.lastInteractionAt
            ]
          );
        }
      );
    });

    setLoading(false);
    onClose();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.url}>{instagramUrl}</Text>

      <TextInput
        placeholder="Add your note"
        multiline
        value={note}
        onChangeText={setNote}
        style={styles.input}
      />

      {loading ? (
        <ActivityIndicator />
      ) : (
        <Button title="Save & return to Instagram" onPress={save} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  url: { fontSize: 12, color: "#666" },
  input: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
    minHeight: 100,
    textAlignVertical: "top"
  }
});
