import React, { useEffect, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { db } from "../db";
import { Post } from "../models";

export function Feed() {
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    db.transaction(tx => {
      tx.executeSql(
        "SELECT * FROM posts ORDER BY createdAt DESC",
        [],
        (_, { rows }) => setPosts(rows._array)
      );
    });
  }, []);

  return (
    <ScrollView>
      {posts.map(p => (
        <View key={p.id} style={{ padding: 12 }}>
          <Text>{p.instagramUrl}</Text>
          <Text>{p.caption}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
