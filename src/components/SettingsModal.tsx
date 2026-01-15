import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { X, Globe, Database, Trash2, RefreshCcw } from 'lucide-react-native';
import { getSetting, setSetting } from '@/repositories/SettingsRepository';
import { getStandbyPosts, resetSyncForManualRetry, updatePostMedia } from '@/repositories/PostRepository';
import { sendToMake } from '@/services/SyncService';
import { MediaCacheService } from '@/services/MediaCacheService';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SettingsModal = ({ visible, onClose }: SettingsModalProps) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isClearing, setIsClearing] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [standbyCount, setStandbyCount] = useState(0);

  const loadStandbyCount = async () => {
    try {
      const standby = await getStandbyPosts();
      setStandbyCount(standby.length);
    } catch (e) {
      console.error('Failed to load standby count:', e);
    }
  };

  useEffect(() => {
    if (visible) {
      getSetting('make_webhook_url').then((val) => setWebhookUrl(val || ''));
      loadStandbyCount();
    }
  }, [visible]);

  const handleSave = async () => {
    await setSetting('make_webhook_url', webhookUrl);
    onClose();
  };

  const handleClearCache = async () => {
    Alert.alert(
      'Clear Media Cache?',
      'All downloaded images and videos will be removed. They will be background-downloaded again when you view them in the feed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setIsClearing(true);
            try {
              await MediaCacheService.clearCache();
            } finally {
              setIsClearing(false);
            }
          },
        },
      ],
    );
  };

  const handleManualRecovery = async () => {
    if (standbyCount === 0) {
      Alert.alert('Manual Recovery', 'No captures are currently in standby.');
      return;
    }

    setIsRecovering(true);
    try {
      const standbyPosts = await getStandbyPosts();
      const currentWebhookUrl = await getSetting('make_webhook_url');
      if (!currentWebhookUrl) throw new Error('Webhook URL not configured');

      console.log(`[Recovery] Querying webhook for ${standbyPosts.length} standby items...`);

      const response = await sendToMake(currentWebhookUrl, {
        action: 'manual_recovery' as any,
        items: standbyPosts.map(p => ({ id: p.id, url: p.instagramUrl })),
      });

      if (response.status === 'success' && response.results) {
        let recovered = 0;
        let restarted = 0;
        const toRestart: number[] = [];

        for (const p of standbyPosts) {
          const result = response.results[p.id];
          if (result?.status === 'success' && result.mediaData) {
            await updatePostMedia(p.id, result.mediaData);
            recovered++;
          } else {
            toRestart.push(p.id);
            restarted++;
          }
        }

        if (toRestart.length > 0) {
          await resetSyncForManualRetry(toRestart);
        }

        Alert.alert(
          'Recovery Finished',
          `${recovered} instant recoveries. ${restarted} tasks restarted.`
        );
        loadStandbyCount();
      } else {
        throw new Error('Webhook returned unsuccessful status');
      }
    } catch (e: any) {
      Alert.alert('Recovery Failed', e.message || 'Check your connection and webhook URL.');
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <View style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.title}>Configuration</Text>
              <TouchableOpacity onPress={onClose}>
                <X size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={styles.content}>
              {/* Webhook Settings */}
              <Text style={styles.label}>Make.com Webhook URL</Text>
              <View style={styles.inputContainer}>
                <Globe size={18} color="#9ca3af" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="https://hook.make.com/..."
                  value={webhookUrl}
                  onChangeText={setWebhookUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Storage Settings */}
              <View style={styles.sectionDivider} />
              <Text style={styles.label}>Media Management</Text>
              <TouchableOpacity
                style={styles.dangerActionBtn}
                onPress={handleClearCache}
                disabled={isClearing}
              >
                <Database size={18} color="#ef4444" style={styles.inputIcon} />
                <Text style={styles.dangerActionText}>
                  {isClearing ? 'Clearing...' : 'Clear Media Cache'}
                </Text>
                <Trash2 size={16} color="#ef4444" style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
              <Text style={styles.helpText}>
                Clearing the cache frees up local storage. Media is automatically re-downloaded when needed.
              </Text>

              {/* Sync Recovery */}
              <View style={styles.sectionDivider} />
              <View style={styles.labelRow}>
                <Text style={styles.label}>Sync Recovery</Text>
                {standbyCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{standbyCount}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={[styles.actionBtn, standbyCount === 0 && styles.disabledBtn]}
                onPress={handleManualRecovery}
                disabled={isRecovering || standbyCount === 0}
              >
                <RefreshCcw
                  size={18}
                  color={standbyCount > 0 ? '#4f46e5' : '#9ca3af'}
                  style={[styles.inputIcon, isRecovering && styles.rotate]}
                />
                <Text style={[styles.actionBtnText, standbyCount === 0 && styles.disabledText]}>
                  {isRecovering ? 'Processing...' : 'Retry Standby Captures'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.helpText}>
                {standbyCount > 0
                  ? `There are ${standbyCount} captures in standby after failing to process. Tap to retry them.`
                  : "All captures are processing normally or are fully synced."}
              </Text>

              <View style={styles.sectionDivider} />

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>Save Settings</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    elevation: 5,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  content: {
    gap: 12,
  },
  label: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputContainer: {
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 12,
  },
  sectionDivider: {
    backgroundColor: '#f3f4f6',
    height: 1,
    marginVertical: 4,
  },
  dangerActionBtn: {
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderColor: '#fee2e2',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dangerActionText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  helpText: {
    color: '#6b7280',
    fontSize: 12,
    lineHeight: 18,
  },
  actionBtn: {
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    borderColor: '#ede9fe',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  actionBtnText: {
    color: '#4f46e5',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledBtn: {
    backgroundColor: '#f9fafb',
    borderColor: '#f3f4f6',
  },
  disabledText: {
    color: '#9ca3af',
  },
  badge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  saveBtn: {
    alignItems: 'center',
    backgroundColor: '#000',
    borderRadius: 12,
    marginTop: 12,
    padding: 16,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  rotate: {
    // Note: React Native doesn't support rotation animation in styles alone easily without Animated.
    // For now, it will just stay static but we could add animation later if needed.
  }
});
