import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator
} from 'react-native';
import { Save, X } from 'lucide-react-native';

interface CaptureModalProps {
  shareValue: string;
  onClose: () => void;
}

export const CaptureModal: React.FC<CaptureModalProps> = ({
  shareValue,
  onClose
}) => {
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // TRIGGER MAKE.COM WEBHOOK
      const response = await fetch('YOUR_MAKE_WEBHOOK_URL', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: shareValue,
          note: note,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        onClose();
      } else {
        console.error('Webhook failed');
      }
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      transparent
      animationType="slide"
      visible={true}
      onRequestClose={onClose}
    >
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

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={isSaving}
          >
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end'
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: 300
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a'
  },
  urlLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 15,
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 6
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 15,
    height: 120,
    textAlignVertical: 'top',
    fontSize: 16,
    color: '#333',
    marginBottom: 20
  },
  saveButton: {
    backgroundColor: '#000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 10
  },
  saveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});
