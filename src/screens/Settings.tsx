import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Button, StyleSheet } from "react-native";
import { getSetting, setSetting } from "../storage/settings";

export function Settings() {
  const [webhook, setWebhook] = useState("");

  useEffect(() => {
    getSetting("makeWebhook").then(v => v && setWebhook(v));
  }, []);

  const save = () => {
    setSetting("makeWebhook", webhook.trim());
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Make.com Webhook URL</Text>
      <TextInput
        value={webhook}
        onChangeText={setWebhook}
        placeholder="https://hook.make.com/..."
        style={styles.input}
        autoCapitalize="none"
      />
      <Button title="Save" onPress={save} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  label: { fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 12
  }
});
