import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';

/**
 * FeedScreen - The primary interaction layer for 9naŭ IG.
 * Displays content following the SM-2 algorithm to ensure
 * internalization of captured posts.
 */
export const FeedScreen = () => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.content}>
        <Text style={styles.title}>9naŭ IG</Text>
        <Text style={styles.subtitle}>
          Your intentional feed will appear here.
        </Text>
        <Text style={styles.hint}>
          Try sharing a post from Instagram to get started.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20
  },
  hint: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20
  }
});
