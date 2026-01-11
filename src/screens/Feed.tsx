import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Button,
  StyleSheet,
  Image
} from "react-native";
import { db } from "../db";
import { adjustRepetition } from "../repetition";

interface Item {
  id: number;
  instagramUrl: string;
  note: string;
  mediaUrl?: string;
  mediaType?: string;
  interval: number;
}

export function Feed({ onOpenSettings }: { onOpenSettings: () => void }) {
  const [items, setItems] = useState<Item[]>([]);

  const load = () => {
    db.transaction(tx => {
      tx.executeSql(
        `
        SELECT p.*, r.interval
        FROM posts p
        JOIN repetition r ON r.postId = p.id
        WHERE r.nextDueAt <= ?
        ORDER BY r.nextDueAt ASC
        `,
        [Date.now()],
        (_, { rows }) => setItems(rows._array)
      );
    });
  };

  useEffect(load, []);

  const act = (id: number, interval: number, action: any) => {
    const rep = adjustRepetition(interval, action);
    db.transaction(tx => {
      tx.executeSql(
        `
        UPDATE repetition
        SET interval = ?, nextDueAt = ?, lastInteractionAt = ?
        WHERE postId = ?
        `,
        [rep.interval, rep.nextDueAt, rep.lastInteractionAt, id]
      );
    });
    load();
  };

  return (
    <ScrollView style={styles.feed}>
      <Button title="Settings" onPress={onOpenSettings} />

      {items.map(i => (
        <View key={i.id} style={styles.card}>
          {i.mediaUrl && i.mediaType === "image" && (
            <Image source={{ uri: i.mediaUrl }} style={styles.image} />
          )}

          {i.note ? <Text style={styles.note}>{i.note}</Text> : null}

          <View style={styles.actions}>
            <Button title="Less" onPress={() => act(i.id, i.interval, "less")} />
            <Button title="Same" onPress={() => act(i.id, i.interval, "same")} />
            <Button title="More" onPress={() => act(i.id, i.interval, "more")} />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  feed: { padding: 12 },
  card: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#f5f5f5",
    gap: 10
  },
  image: {
    width: "100%",
    height: 240,
    borderRadius: 8
  },
  note: {
    fontSize: 16
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between"
  }
});
