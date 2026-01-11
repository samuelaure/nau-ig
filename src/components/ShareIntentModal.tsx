import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Clipboard
} from 'react-native';
import { X, Save, Link as LinkIcon } from 'lucide-react-native';
import { useShareIntent } from '../providers/ShareIntentProvider';

const FREQUENCY_OPTIONS = [
  { label: 'High (Every day)', value: 'high' },
  { label: 'Medium (Weekly)', value: 'medium' },
  { label: 'Low (Monthly)', value: 'low' }
];

const AVAILABLE_TAGS = [
  'Inspiration',
  'Learning',
  'Fitness',
  'Tech',
  'Art',
  'Recipes'
];

export const ShareIntentModal = () => {
  const { value, resetShareIntent, saveShareIntent, isSaving } =
    useShareIntent();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [frequency, setFrequency] = useState('medium');

  if (!value || !value.value) return null;

  const handleSave = async () => {
    await saveShareIntent({
      title,
      content,
      tags: selectedTags,
      frequency
    });
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const copyLink = () => {
    Clipboard.setString(value.value);
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <View style={styles.modalCard}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Capture to 9naŭ</Text>
              <TouchableOpacity onPress={resetShareIntent} disabled={isSaving}>
                <X size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.form}
              showsVerticalScrollIndicator={false}
            >
              <TouchableOpacity onPress={copyLink} style={styles.linkContainer}>
                <LinkIcon size={16} color="#3b82f6" />
                <Text style={styles.linkText} numberOfLines={1}>
                  {value.value}
                </Text>
              </TouchableOpacity>

              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="What is this about?"
                value={title}
                onChangeText={setTitle}
                placeholderTextColor="#999"
              />

              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add your thoughts..."
                value={content}
                onChangeText={setContent}
                multiline
                numberOfLines={4}
                placeholderTextColor="#999"
              />

              <Text style={styles.label}>Tags</Text>
              <View style={styles.tagContainer}>
                {AVAILABLE_TAGS.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    onPress={() => toggleTag(tag)}
                    style={[
                      styles.tagChip,
                      selectedTags.includes(tag) && styles.tagChipActive
                    ]}
                  >
                    <Text
                      style={[
                        styles.tagText,
                        selectedTags.includes(tag) && styles.tagTextActive
                      ]}
                    >
                      {tag}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Repetition Frequency</Text>
              <View style={styles.frequencyContainer}>
                {FREQUENCY_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setFrequency(opt.value)}
                    style={[
                      styles.freqButton,
                      frequency === opt.value && styles.freqButtonActive
                    ]}
                  >
                    <Text
                      style={[
                        styles.freqText,
                        frequency === opt.value && styles.freqTextActive
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ height: 20 }} />
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  isSaving && styles.saveButtonDisabled
                ]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Save size={20} color="#fff" />
                    <Text style={styles.saveButtonText}>Save Post</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end'
  },
  container: {
    maxHeight: '85%'
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a'
  },
  form: {
    paddingHorizontal: 20
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#dbeafe'
  },
  linkText: {
    fontSize: 12,
    color: '#3b82f6',
    marginLeft: 8,
    flex: 1
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 8,
    marginTop: 4
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    marginBottom: 16
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top'
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  tagChipActive: {
    backgroundColor: '#000',
    borderColor: '#000'
  },
  tagText: {
    fontSize: 13,
    color: '#4b5563'
  },
  tagTextActive: {
    color: '#fff',
    fontWeight: '500'
  },
  frequencyContainer: {
    gap: 8
  },
  freqButton: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb'
  },
  freqButtonActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff'
  },
  freqText: {
    fontSize: 14,
    color: '#4b5563'
  },
  freqTextActive: {
    color: '#3b82f6',
    fontWeight: '600'
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6'
  },
  saveButton: {
    backgroundColor: '#000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 8
  },
  saveButtonDisabled: {
    opacity: 0.6
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700'
  }
});
