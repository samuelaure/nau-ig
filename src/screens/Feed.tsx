import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Button,
  StyleSheet
} from "react-native";
import { db } from "../db";
import { adjustRepetition } from "../repetition";

interface FeedItem {
  id: number;
  instagramUrl: string;
  note: string;
  interval: number;
}

export function Feed() {
  const [items, setItems] = useState<FeedItem[]>([]);

  const load = () => {
    db.transaction(tx => {
      tx.executeSql(
        `
        SELECT p.id, p.instagramUrl, p.note, r.interval
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

  const act = (postId: number, interval: number, action: "more" | "same" | "less") => {
    const rep = adjustRepetition(interval, action);

    db.transaction(tx => {
      tx.executeSql(
        `
        UPDATE repetition
        SET interval = ?, nextDueAt = ?, lastInteractionAt = ?
        WHERE postId = ?
        `,
        [rep.interval, rep.nextDueAt, rep.lastInteractionAt, postId]
      );
    });

    load();
  };

  return (
    <ScrollView style={styles.feed}>
      {items.map(item => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.url}>{item.instagramUrl}</Text>

          {item.note ? (
            <Text style={styles.note}>{item.note}</Text>
          ) : null}

          <View style={styles.actions}>
            <Button title="Less" onPress={() => act(item.id, item.interval, "less")} />
            <Button title="Same" onPress={() => act(item.id, item.interval, "same")} />
            <Button title="More" onPress={() => act(item.id, item.interval, "more")} />
          </View>
        </View>
      ))}

      {items.length === 0 && (
        <Text style={styles.empty}>
          Nothing due now. Come back later.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  feed: {
    padding: 12
  },
  card: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 10,
    backgroundColor: "#f6f6f6",
    gap: 10
  },
  url: {
    fontSize: 12,
    color: "#666"
  },
  note: {
    fontSize: 16
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  empty: {
    marginTop: 40,
    textAlign: "center",
    color: "#777"
  }
});
