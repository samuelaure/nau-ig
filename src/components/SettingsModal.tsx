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
  Alert
} from 'react-native';
import { X, Globe, Database, Trash2 } from 'lucide-react-native';
import { getSetting, setSetting } from '../storage/settings';
import { MediaCacheService } from '../services/MediaCacheService';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SettingsModal = ({ visible, onClose }: SettingsModalProps) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    if (visible) {
      getSetting('make_webhook_url').then((val) => setWebhookUrl(val || ''));
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
          }
        }
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
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
                <Trash2
                  size={16}
                  color="#ef4444"
                  style={{ marginLeft: 'auto' }}
                />
              </TouchableOpacity>
              <Text style={styles.helpText}>
                Clearing the cache frees up local storage. Media is
                automatically re-downloaded when needed.
              </Text>

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
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20
  },
  container: {
    flex: 1,
    justifyContent: 'center'
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24
  },
  title: {
    fontSize: 20,
    fontWeight: '800'
  },
  content: {
    gap: 12
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151'
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginVertical: 12
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12
  },
  inputIcon: {
    marginRight: 8
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14
  },
  dangerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12
  },
  dangerActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444'
  },
  helpText: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 18
  },
  saveBtn: {
    backgroundColor: '#000',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16
  }
});
