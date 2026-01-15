import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
  Dimensions,
} from 'react-native';
import { Save, X, Hash, Clock, Plus, Link as LinkIcon, Check } from 'lucide-react-native';
import { savePost, getAllTags } from '@/repositories/PostRepository';
import { getSetting } from '@/repositories/SettingsRepository';
import { sendToMake } from '@/services/SyncService';
import { COLORS } from '@/constants';

interface CaptureModalProps {
  shareValue: string;
  onClose: () => void;
}

const FREQUENCIES = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
];

export const CaptureModal: React.FC<CaptureModalProps> = ({ shareValue, onClose }) => {
  const [note, setNote] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [frequency, setFrequency] = useState('daily');
  const [isSaving, setIsSaving] = useState(false);
  const [existingTags, setExistingTags] = useState<string[]>([]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    loadExistingTags();
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
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

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 20,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
      if (Platform.OS === 'android') {
        BackHandler.exitApp();
      }
    });
  };

  const handleSave = async () => {
    if (!shareValue) return;

    setIsSaving(true);
    try {
      const postId = await savePost({
        instagramUrl: shareValue,
        title: 'Instagram Capture',
        content: note,
        tags: selectedTags,
        frequency: frequency,
      });

      const webhookUrl = await getSetting('make_webhook_url');
      if (webhookUrl) {
        try {
          await sendToMake(webhookUrl, {
            action: 'capture',
            instagramUrl: shareValue,
            postId: postId,
          });
        } catch (webhookErr) {
          console.warn('Webhook failed:', webhookErr);
        }
      }

      handleClose();
    } catch (err) {
      console.error('Save error:', err);
      Alert.alert('Save Error', 'Failed to save the content. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={handleClose}
          activeOpacity={1}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.dialog,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Quick Capture</Text>
            <View style={styles.linkContainer}>
              <LinkIcon size={12} color="#9ca3af" />
              <Text style={styles.subtitle} numberOfLines={1}>
                {shareValue.replace('https://', '').replace('www.', '')}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X color="#9ca3af" size={20} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.inputSection}>
            <TextInput
              style={styles.noteInput}
              placeholder="Add your thoughts or notes..."
              placeholderTextColor="#9ca3af"
              multiline
              value={note}
              onChangeText={setNote}
              autoFocus
            />
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Hash size={14} color={COLORS.textSecondary} />
              <Text style={styles.sectionTitle}>Contextual Tags</Text>
            </View>
            <View style={styles.tagInputContainer}>
              <TextInput
                style={styles.tagInput}
                placeholder="Type tag name..."
                placeholderTextColor="#9ca3af"
                value={newTag}
                onChangeText={setNewTag}
                onSubmitEditing={addNewTag}
              />
              <TouchableOpacity onPress={addNewTag} style={styles.addTagIcon}>
                <Plus size={18} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.tagCloud}>
              {selectedTags.length > 0 && (
                <View style={styles.tagGroup}>
                  {selectedTags.map((tag) => (
                    <TouchableOpacity
                      key={tag}
                      onPress={() => toggleTag(tag)}
                      style={[styles.tagChip, styles.tagChipActive]}
                    >
                      <Text style={styles.tagChipTextActive}>{tag}</Text>
                      <X size={10} color="#fff" style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {existingTags.filter(t => !selectedTags.includes(t)).length > 0 && (
                <View style={styles.tagGroup}>
                  {existingTags
                    .filter((t) => !selectedTags.includes(t))
                    .map((tag) => (
                      <TouchableOpacity
                        key={tag}
                        onPress={() => toggleTag(tag)}
                        style={styles.tagChip}
                      >
                        <Text style={styles.tagChipText}># {tag}</Text>
                      </TouchableOpacity>
                    ))}
                </View>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Clock size={14} color={COLORS.textSecondary} />
              <Text style={styles.sectionTitle}>Spaced Repetition</Text>
            </View>
            <View style={styles.freqContainer}>
              {FREQUENCIES.map((f) => {
                const isActive = frequency === f.id;
                return (
                  <TouchableOpacity
                    key={f.id}
                    onPress={() => setFrequency(f.id)}
                    style={[styles.freqButton, isActive && styles.freqButtonActive]}
                  >
                    {isActive && <Check size={12} color="#fff" style={{ marginRight: 4 }} />}
                    <Text style={[styles.freqText, isActive && styles.freqTextActive]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Save color="#fff" size={18} />
                <Text style={styles.saveText}>Capture to Loop</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  dialog: {
    backgroundColor: '#fff',
    borderRadius: 24,
    elevation: 24,
    maxHeight: '80%',
    maxWidth: 400,
    overflow: 'hidden',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    width: '100%',
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  linkContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 4,
  },
  subtitle: {
    color: '#6b7280',
    fontSize: 12,
    marginLeft: 4,
    maxWidth: '90%',
  },
  closeButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    padding: 6,
  },
  inputSection: {
    marginBottom: 16,
  },
  noteInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    color: '#111827',
    fontSize: 15,
    minHeight: 80,
    padding: 16,
    textAlignVertical: 'top',
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  tagInputContainer: {
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    flexDirection: 'row',
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  tagInput: {
    color: '#111827',
    flex: 1,
    fontSize: 14,
    paddingVertical: 10,
  },
  addTagIcon: {
    paddingLeft: 8,
  },
  tagCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  tagChip: {
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 5,
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
  freqContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  freqButton: {
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  freqButtonActive: {
    backgroundColor: '#111827',
  },
  freqText: {
    color: '#4b5563',
    fontSize: 12,
    fontWeight: '700',
  },
  freqTextActive: {
    color: '#fff',
  },
  footer: {
    marginTop: 8,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    padding: 16,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
});
