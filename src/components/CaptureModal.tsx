import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Save, X } from 'lucide-react-native';
import { savePost } from '@/repositories/PostRepository';
import { getSetting } from '@/repositories/SettingsRepository';
import { sendToMake } from '@/services/SyncService';

interface CaptureModalProps {
  shareValue: string;
  onClose: () => void;
}

export const CaptureModal: React.FC<CaptureModalProps> = ({ shareValue, onClose }) => {
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!shareValue) return;

    setIsSaving(true);
    try {
      // 1. Save to Local Database first (Offline-first approach)
      const postId = await savePost({
        instagramUrl: shareValue,
        title: 'New Capture',
        content: note,
        tags: [], // Could be expanded to parse tags from note
        frequency: 'daily',
      });

      // 2. Attempt to trigger Webhook immediately if URL is configured
      const webhookUrl = await getSetting('make_webhook_url');
      if (webhookUrl) {
        try {
          await sendToMake(webhookUrl, {
            action: 'capture',
            instagramUrl: shareValue,
            postId: postId,
          });
        } catch (webhookErr) {
          // We don't block the UI if the webhook fails,
          // background sync will pick it up later since it's in the DB.
          console.warn('Webhook immediate trigger failed, will retry in background:', webhookErr);
        }
      }

      onClose();
    } catch (err) {
      console.error('Save error:', err);
      Alert.alert('Save Error', 'Failed to save the content to local storage.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal transparent animationType="slide" visible={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Capture to 9naŭ</Text>
            <TouchableOpacity onPress={onClose}>
              <X color="#666" size={24} />
            </TouchableOpacity>
          </View>

          <Text style={styles.urlLabel} numberOfLines={1}>
            Source: {shareValue}
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Add a note or thought..."
            placeholderTextColor="#999"
            multiline
            value={note}
            onChangeText={setNote}
            autoFocus
          />

          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Save color="#fff" size={20} />
                <Text style={styles.saveText}>Save to Learning Loop</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
    borderRadius: 12,
    borderWidth: 1,
    color: '#111827',
    fontSize: 16,
    height: 140,
    marginBottom: 24,
    padding: 16,
    textAlignVertical: 'top',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 20,
    minHeight: 350,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: '#000',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    padding: 18,
  },
  saveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  title: {
    color: '#000',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  urlLabel: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    color: '#6b7280',
    fontSize: 12,
    marginBottom: 20,
    overflow: 'hidden',
    padding: 10,
  },
});
