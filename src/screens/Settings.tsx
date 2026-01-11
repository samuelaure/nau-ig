import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { getSetting, setSetting } from '../storage/settings';

export function Settings({ onClose }: { onClose: () => void }) {
  const [webhook, setWebhook] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSetting('makeWebhook').then((v) => v && setWebhook(v));
  }, []);

  const save = () => {
    const value = webhook.trim();

    if (!value.startsWith('http')) {
      Alert.alert('Invalid URL', 'Please enter a valid webhook URL.');
      return;
    }

    setSetting('makeWebhook', value);
    setSaved(true);

    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <Text style={styles.label}>Make.com Webhook URL</Text>
      <TextInput
        value={webhook}
        onChangeText={setWebhook}
        placeholder="https://hook.make.com/..."
        style={styles.input}
        autoCapitalize="none"
      />

      <Button title="Save" onPress={save} />
      {saved && <Text style={styles.saved}>Saved ✓</Text>}

      <Button title="Back" onPress={onClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12
  },
  title: {
    fontSize: 20,
    fontWeight: '600'
  },
  label: {
    fontWeight: '500'
  },
  input: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 12
  },
  saved: {
    color: 'green'
  }
});
