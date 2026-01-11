import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet } from "react-native";
import { db } from "../db";
import { initialRepetition } from "../repetition";

export function CaptureModal({
  url,
  onClose
}: {
  url: string;
  onClose: () => void;
}) {
  const [note, setNote] = useState("");

  const save = () => {
    const createdAt = Date.now();
    const rep = initialRepetition();

    db.transaction(tx => {
      tx.executeSql(
        `INSERT INTO posts (instagramUrl, note, createdAt)
         VALUES (?, ?, ?)`,
        [url, note, createdAt],
        (_, result) => {
          if (result.insertId !== undefined) {
            tx.executeSql(
              `INSERT INTO repetition
               (postId, interval, nextDueAt, lastInteractionAt)
               VALUES (?, ?, ?, ?)`,
              [result.insertId, rep.interval, rep.nextDueAt, rep.lastInteractionAt]
            );
          }
        }
      );
    });

    onClose();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Instagram link</Text>
      <Text style={styles.url}>{url}</Text>

      <TextInput
        placeholder="Add your note (optional)"
        multiline
        value={note}
        onChangeText={setNote}
        style={styles.input}
      />

      <Button title="Save & return to Instagram" onPress={save} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12
  },
  label: {
    fontWeight: "600"
  },
  url: {
    fontSize: 12,
    color: "#555"
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 6,
    minHeight: 100,
    textAlignVertical: "top"
  }
});
