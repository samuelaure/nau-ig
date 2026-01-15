import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
} from 'react-native';
import { Save, X, Hash, Clock, Plus } from 'lucide-react-native';
import { savePost, getAllTags } from '@/repositories/PostRepository';
import { getSetting } from '@/repositories/SettingsRepository';
import { sendToMake } from '@/services/SyncService';
import { COLORS } from '@/constants';

interface CaptureModalProps {
  shareValue: string;
  onClose: () => void;
}

const FREQUENCIES = [
  { id: 'daily', label: 'Daily', interval: 1 },
  { id: 'weekly', label: 'Weekly', interval: 7 },
  { id: 'monthly', label: 'Monthly', interval: 30 },
];

export const CaptureModal: React.FC<CaptureModalProps> = ({ shareValue, onClose }) => {
  const [note, setNote] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [frequency, setFrequency] = useState('daily');
  const [isSaving, setIsSaving] = useState(false);
  const [existingTags, setExistingTags] = useState<string[]>([]);

  useEffect(() => {
    loadExistingTags();
  }, []);

  const loadExistingTags = async () => {
    const tags = await getAllTags();
    setExistingTags(tags);
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const addNewTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (tag && !selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag]);
      setNewTag('');
    }
  };

  const handleSave = async () => {
    if (!shareValue) return;

    setIsSaving(true);
    try {
      // 1. Save to Local Database first
      const postId = await savePost({
        instagramUrl: shareValue,
        title: 'Instagram Capture',
        content: note,
        tags: selectedTags,
        frequency: frequency,
      });

      // 2. Attempt Webhook Trigger
      const webhookUrl = await getSetting('make_webhook_url');
      if (webhookUrl) {
        try {
          await sendToMake(webhookUrl, {
            action: 'capture',
            instagramUrl: shareValue,
            postId: postId,
          });
        } catch (webhookErr) {
          console.warn('Webhook failed, relying on background sync:', webhookErr);
        }
      }

      onClose();
      // On Android, we exit the activity to return to the source app (e.g. Instagram)
      if (Platform.OS === 'android') {
        BackHandler.exitApp();
      }
    } catch (err) {
      console.error('Save error:', err);
      Alert.alert('Save Error', 'Failed to save the content. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.dialog}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Capture Content</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              From: {shareValue}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              onClose();
              if (Platform.OS === 'android') BackHandler.exitApp();
            }}
            style={styles.closeButton}
          >
            <X color="#666" size={20} />
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.noteInput}
          placeholder="What's this about?"
          placeholderTextColor="#9ca3af"
          multiline
          value={note}
          onChangeText={setNote}
          autoFocus
        />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Hash size={16} color={COLORS.textSecondary} />
            <Text style={styles.sectionTitle}>Tags</Text>
          </View>
          <View style={styles.tagInputContainer}>
            <TextInput
              style={styles.tagInput}
              placeholder="Add tag..."
              value={newTag}
              onChangeText={setNewTag}
              onSubmitEditing={addNewTag}
            />
            <TouchableOpacity onPress={addNewTag} style={styles.addTagButton}>
              <Plus size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagList}>
            {selectedTags.map((tag) => (
              <TouchableOpacity
                key={tag}
                onPress={() => toggleTag(tag)}
                style={[styles.tagChip, styles.tagChipActive]}
              >
                <Text style={styles.tagChipTextActive}>{tag}</Text>
              </TouchableOpacity>
            ))}
            {existingTags
              .filter((t) => !selectedTags.includes(t))
              .map((tag) => (
                <TouchableOpacity key={tag} onPress={() => toggleTag(tag)} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>{tag}</Text>
                </TouchableOpacity>
              ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock size={16} color={COLORS.textSecondary} />
            <Text style={styles.sectionTitle}>Review Frequency</Text>
          </View>
          <View style={styles.freqContainer}>
            {FREQUENCIES.map((f) => (
              <TouchableOpacity
                key={f.id}
                onPress={() => setFrequency(f.id)}
                style={[styles.freqButton, frequency === f.id && styles.freqButtonActive]}
              >
                <Text style={[styles.freqText, frequency === f.id && styles.freqTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
          {isSaving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Save color="#fff" size={20} />
              <Text style={styles.saveText}>Save</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  addTagButton: {
    paddingHorizontal: 12,
  },
  closeButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    padding: 8,
  },
  container: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  dialog: {
    backgroundColor: '#fff',
    borderRadius: 30,
    elevation: 24,
    maxWidth: 400,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    width: '100%',
  },
  freqButton: {
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    flex: 1,
    paddingVertical: 10,
  },
  freqButtonActive: {
    backgroundColor: '#000',
  },
  freqContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  freqText: {
    color: '#4b5563',
    fontSize: 13,
    fontWeight: '600',
  },
  freqTextActive: {
    color: '#fff',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  noteInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    color: '#111827',
    fontSize: 16,
    height: 100,
    marginBottom: 20,
    padding: 16,
    textAlignVertical: 'top',
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginTop: 10,
    padding: 16,
  },
  saveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  subtitle: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 2,
    maxWidth: 200,
  },
  tagChip: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    marginRight: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagChipActive: {
    backgroundColor: COLORS.primary,
  },
  tagChipText: {
    color: '#4b5563',
    fontSize: 12,
    fontWeight: '600',
  },
  tagChipTextActive: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  tagInput: {
    color: '#111827',
    flex: 1,
    fontSize: 14,
    paddingVertical: 8,
  },
  tagInputContainer: {
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    flexDirection: 'row',
    marginBottom: 8,
    paddingLeft: 12,
  },
  tagList: {
    flexDirection: 'row',
  },
  title: {
    color: '#000',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
});
