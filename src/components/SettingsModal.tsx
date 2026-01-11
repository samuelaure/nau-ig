import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { X, Globe } from 'lucide-react-native';
import { getSetting, setSetting } from '../storage/settings';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SettingsModal = ({ visible, onClose }: SettingsModalProps) => {
  const [webhookUrl, setWebhookUrl] = useState('');

  useEffect(() => {
    if (visible) {
      getSetting('make_webhook_url').then((val) => setWebhookUrl(val || ''));
    }
  }, [visible]);

  const handleSave = async () => {
    await setSetting('make_webhook_url', webhookUrl);
    onClose();
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
              <Text style={styles.helpText}>
                This URL is used to trigger media processing and background
                downloads.
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
