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
  Modal,
  ToastAndroid,
  Switch,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  X,
  Plus,
  Link as LinkIcon,
  Tag as TagIcon,
  RotateCw,
  Square,
  CheckSquare,
  ChevronDown,
  Calendar as CalendarIcon,
  Check,
} from 'lucide-react-native';
import { savePost, getAllTags } from '@/repositories/PostRepository';
import { SYNC_POLLING_INTERVAL, COLORS } from '@/constants';
import { getFrequencyChain } from '@/services/FrequencyService';
import { syncManager } from '@/services/SyncManager';

interface CaptureModalProps {
  shareValue: string;
  onClose: () => void;
  isShareIntent?: boolean;
}

const UNITS = ['Days', 'Weeks', 'Months', 'Years'];

export const CaptureModal: React.FC<CaptureModalProps> = ({
  shareValue,
  onClose,
  isShareIntent,
}) => {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [existingTags, setExistingTags] = useState<string[]>([]);

  // Frequency States
  const [repeatInterval, setRepeatInterval] = useState('1');
  const [repeatUnit, setRepeatUnit] = useState('Days');
  const [hasFrequency, setHasFrequency] = useState(false);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [pickerDate, setPickerDate] = useState(new Date());

  // Modal Visibility
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showFreqPicker, setShowFreqPicker] = useState(false);
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isFreqCustomized, setIsFreqCustomized] = useState(false);
  const [freqChain, setFreqChain] = useState<string[]>([]);

  // Clean the URL if it comes with prefix text (common in Instagram shares)
  const [manualUrl, setManualUrl] = useState('');
  const [finalUrl, setFinalUrl] = useState('');

  // Clean the URL if it comes with prefix text (common in Instagram shares)
  useEffect(() => {
    const rawUrl = shareValue || manualUrl;
    if (rawUrl) {
      const urlMatch = rawUrl.match(/https?:\/\/[^\s]+/);
      let extractedUrl = urlMatch ? urlMatch[0] : rawUrl;
      try {
        const urlObj = new URL(extractedUrl);
        setFinalUrl(`${urlObj.origin}${urlObj.pathname}`);
      } catch (e) {
        setFinalUrl(extractedUrl.split('?')[0]);
      }
    } else {
      setFinalUrl('');
    }
  }, [shareValue, manualUrl]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    loadData();
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

  const loadData = async () => {
    const [tags, chain] = await Promise.all([
      getAllTags(),
      getFrequencyChain(),
    ]);
    setExistingTags(tags);
    setFreqChain(chain);
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const addNewTag = () => {
    const tag = newTag.trim();
    if (tag) {
      const existing = existingTags.find((t) => t.toLowerCase() === tag.toLowerCase());
      const tagToUse = existing || tag;

      if (!existing) {
        setExistingTags([tagToUse, ...existingTags]);
      }

      if (!selectedTags.includes(tagToUse)) {
        setSelectedTags([...selectedTags, tagToUse]);
      }
      setNewTag('');
    }
  };

  const filteredTags = existingTags.filter((t) => t.toLowerCase().includes(newTag.toLowerCase()));

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setPickerDate(selectedDate);
      setStartDate(selectedDate.toISOString().split('T')[0]);
    }
  };

  const onTypeDate = (text: string) => {
    setStartDate(text);
    const parsed = new Date(text);
    if (!isNaN(parsed.getTime())) {
      setPickerDate(parsed);
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
        toValue: 30,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
      if (isShareIntent && Platform.OS === 'android') {
        BackHandler.exitApp();
      }
    });
  };

  const handleSave = async () => {
    if (!title && !note && !finalUrl) {
      Alert.alert('Empty Content', 'Please add a title, note, or an Instagram URL.');
      return;
    }

    setIsSaving(true);
    try {
      const postData = {
        instagramUrl: finalUrl,
        title: title || (finalUrl ? 'Instagram Capture' : 'New Note'),
        content: note,
        tags: selectedTags,
        frequency: hasFrequency ? `${repeatInterval} ${repeatUnit}` : null,
        startDate: startDate,
      };

      await savePost(postData);

      if (finalUrl) {
        syncManager.triggerSync();
      }

      if (Platform.OS === 'android') {
        ToastAndroid.show('Capture Saved!', ToastAndroid.SHORT);
      }

      handleClose();
    } catch (err) {
      console.error('[CaptureModal] CRITICAL SAVE ERROR:', err);
      Alert.alert('Save Error', 'Failed to save the content. Check console for details.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal transparent visible={true} animationType="none" onRequestClose={handleClose}>
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
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {!shareValue && (
            <View style={styles.urlInputContainer}>
              <LinkIcon size={18} color={COLORS.primary} style={styles.inputLinkIcon} />
              <TextInput
                style={styles.urlInput}
                placeholder="Paste Instagram URL (optional)"
                placeholderTextColor="#9ca3af"
                value={manualUrl}
                onChangeText={setManualUrl}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          )}

          {shareValue && (
            <View style={styles.urlHeader}>
              <LinkIcon size={10} color="#9ca3af" />
              <Text style={styles.urlText} numberOfLines={1}>
                {finalUrl.replace('https://', '').replace('www.', '') || 'Processing Link...'}
              </Text>
            </View>
          )}

          <TextInput
            style={styles.titleInput}
            placeholder="Title"
            placeholderTextColor="#9ca3af"
            value={title}
            onChangeText={setTitle}
          />

          <TextInput
            style={styles.noteInput}
            placeholder="Take a note..."
            placeholderTextColor="#9ca3af"
            multiline
            value={note}
            onChangeText={setNote}
            autoFocus
          />

          <View style={styles.bottomRow}>
            <View style={styles.actionsLeft}>
              <TouchableOpacity style={styles.iconButton} onPress={() => setShowTagPicker(true)}>
                <TagIcon size={20} color="#5f6368" />
                {selectedTags.length > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{selectedTags.length}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.iconButton} onPress={() => setShowFreqPicker(true)}>
                <RotateCw size={20} color={hasFrequency ? COLORS.primary : "#5f6368"} />
                {hasFrequency && (
                  <View style={[styles.badge, { backgroundColor: COLORS.success }]}>
                    <Check size={10} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          {selectedTags.length > 0 && (
            <View style={styles.tagPreviewContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {selectedTags.map((tag) => (
                  <View key={tag} style={styles.previewTag}>
                    <Text style={styles.previewTagText}>{tag}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </Animated.View>

        {/* Tag Picker Modal */}
        <Modal
          visible={showTagPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowTagPicker(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowTagPicker(false)}
          >
            <View style={styles.popupContent} onStartShouldSetResponder={() => true}>
              <View style={styles.popupHeader}>
                <TextInput
                  style={styles.popupInput}
                  placeholder="New label..."
                  value={newTag}
                  onChangeText={setNewTag}
                />
                <TouchableOpacity onPress={addNewTag} style={styles.addTagBtn}>
                  <Plus size={20} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.popupList}>
                {filteredTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      style={styles.popupItem}
                      onPress={() => toggleTag(tag)}
                    >
                      {isSelected ? (
                        <CheckSquare size={18} color={COLORS.primary} />
                      ) : (
                        <Square size={18} color="#5f6368" />
                      )}
                      <Text
                        style={[styles.popupItemText, isSelected && styles.popupItemTextActive]}
                      >
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <TouchableOpacity
                style={[styles.doneBtn, { marginTop: 12 }]}
                onPress={() => setShowTagPicker(false)}
              >
                <Text style={styles.doneBtnText}>OK</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Frequency Picker Modal */}
        <Modal
          visible={showFreqPicker}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setShowFreqPicker(false);
            setShowUnitDropdown(false);
          }}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => {
              setShowFreqPicker(false);
              setShowUnitDropdown(false);
            }}
          >
            <View style={styles.popupContent} onStartShouldSetResponder={() => true}>
              <Text style={styles.popupTitle}>Repetition</Text>

              <View style={[styles.freqRow, { justifyContent: 'space-between', marginBottom: 20 }]}>
                <Text style={styles.freqLabel}>Schedule</Text>
                <Switch
                  value={hasFrequency}
                  onValueChange={setHasFrequency}
                  trackColor={{ false: '#d1d5db', true: COLORS.primary }}
                  thumbColor="#fff"
                />
              </View>

              {hasFrequency && (
                <>
                  <View style={styles.freqRow}>
                    <Text style={styles.freqLabel}>Every</Text>
                    <TextInput
                      style={styles.freqInput}
                      keyboardType="numeric"
                      value={repeatInterval}
                      onChangeText={setRepeatInterval}
                    />

                    <View style={styles.dropdownContainer}>
                      <TouchableOpacity
                        style={styles.dropdownTrigger}
                        onPress={() => setShowUnitDropdown(!showUnitDropdown)}
                      >
                        <Text style={styles.dropdownValue}>{repeatUnit}</Text>
                        <ChevronDown size={16} color="#5f6368" />
                      </TouchableOpacity>

                      {showUnitDropdown && (
                        <View style={styles.dropdownList}>
                          {UNITS.map((u) => (
                            <TouchableOpacity
                              key={u}
                              style={styles.dropdownItem}
                              onPress={() => {
                                setRepeatUnit(u);
                                setShowUnitDropdown(false);
                              }}
                            >
                              <Text
                                style={[
                                  styles.dropdownItemText,
                                  repeatUnit === u && styles.dropdownItemTextActive,
                                ]}
                              >
                                {u}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>

                  {freqChain.length > 0 && (
                    <View style={styles.quickFreqContainer}>
                      <Text style={styles.quickFreqLabel}>Quick Select</Text>
                      <View style={styles.quickFreqGrid}>
                        {freqChain.slice(0, 8).map((freq) => (
                          <TouchableOpacity
                            key={freq}
                            style={styles.quickFreqChip}
                            onPress={() => {
                              const parts = freq.split(' ');
                              if (parts.length >= 2) {
                                setRepeatInterval(parts[0]);
                                const u = parts[1];
                                setRepeatUnit(u.charAt(0).toUpperCase() + u.slice(1).toLowerCase());
                                if (!u.endsWith('s')) {
                                  // basic check for plural
                                  setRepeatUnit(u.charAt(0).toUpperCase() + u.slice(1).toLowerCase() + (u.toLowerCase() === 'year' || u.toLowerCase() === 'month' || u.toLowerCase() === 'week' || u.toLowerCase() === 'day' ? 's' : ''));
                                }
                              }
                            }}
                          >
                            <Text style={styles.quickFreqChipText}>{freq}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  <View style={styles.dateRow}>
                    <Text style={styles.freqLabel}>Starts</Text>
                    <View style={styles.dateInputWrapper}>
                      <TextInput
                        style={styles.dateInput}
                        value={startDate}
                        onChangeText={onTypeDate}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor="#9ca3af"
                      />
                      <TouchableOpacity
                        style={styles.calendarTrigger}
                        onPress={() => setShowDatePicker(true)}
                      >
                        <CalendarIcon size={18} color={COLORS.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {showDatePicker && (
                    <DateTimePicker
                      value={pickerDate}
                      mode="date"
                      display="default"
                      onChange={handleDateChange}
                    />
                  )}
                </>
              )}

              <TouchableOpacity
                style={styles.doneBtn}
                onPress={() => {
                  setShowFreqPicker(false);
                  setShowUnitDropdown(false);
                  setIsFreqCustomized(true);
                }}
              >
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </KeyboardAvoidingView>
    </Modal>
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
    maxWidth: 400,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    width: '100%',
  },
  urlHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 12,
    opacity: 0.6,
  },
  urlText: {
    color: '#5f6368',
    fontSize: 11,
    marginLeft: 4,
  },
  titleInput: {
    color: '#202124',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    padding: 0,
    marginTop: 10,
  },
  urlInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  urlInput: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
    paddingVertical: 10,
    marginLeft: 8,
  },
  inputLinkIcon: {
    opacity: 0.7,
  },
  noteInput: {
    color: '#3c4043',
    fontSize: 16,
    lineHeight: 24,
    minHeight: 100,
    padding: 0,
    textAlignVertical: 'top',
  },
  bottomRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  actionsLeft: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 8,
    position: 'relative',
  },
  badge: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    height: 16,
    justifyContent: 'center',
    minWidth: 16,
    paddingHorizontal: 4,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  saveButton: {
    backgroundColor: COLORS.secondary,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  tagPreviewContainer: {
    flexDirection: 'row',
    marginTop: 12,
  },
  previewTag: {
    backgroundColor: '#f1f3f4',
    borderRadius: 12,
    marginRight: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  previewTagText: {
    color: '#5f6368',
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    flex: 1,
    justifyContent: 'center',
  },
  popupContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    maxHeight: '80%',
    padding: 16,
    width: '85%',
    maxWidth: 340,
  },
  popupHeader: {
    alignItems: 'center',
    borderBottomColor: '#f1f3f4',
    borderBottomWidth: 1,
    flexDirection: 'row',
    marginBottom: 12,
    paddingBottom: 8,
  },
  popupInput: {
    flex: 1,
    fontSize: 16,
  },
  addTagBtn: {
    padding: 8,
  },
  popupList: {
    maxHeight: 200,
  },
  popupItem: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingVertical: 12,
  },
  popupItemText: {
    color: '#3c4043',
    fontSize: 15,
    marginLeft: 12,
  },
  popupItemTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  popupTitle: {
    color: '#202124',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
  },
  freqRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    zIndex: 10,
  },
  freqLabel: {
    color: '#5f6368',
    fontSize: 14,
    fontWeight: '600',
    width: 50,
  },
  freqInput: {
    backgroundColor: '#f1f3f4',
    borderRadius: 8,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    textAlign: 'center',
    width: 50,
  },
  dropdownContainer: {
    flex: 1,
    position: 'relative',
  },
  dropdownTrigger: {
    alignItems: 'center',
    backgroundColor: '#f1f3f4',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dropdownValue: {
    color: '#3c4043',
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownList: {
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 4,
    left: 0,
    position: 'absolute',
    right: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    top: 40,
    zIndex: 20,
  },
  dropdownItem: {
    padding: 12,
  },
  dropdownItemText: {
    color: '#3c4043',
    fontSize: 14,
  },
  dropdownItemTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  dateRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  dateInputWrapper: {
    alignItems: 'center',
    backgroundColor: '#f1f3f4',
    borderRadius: 8,
    flex: 1,
    flexDirection: 'row',
    paddingRight: 8,
  },
  dateInput: {
    color: '#3c4043',
    flex: 1,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  calendarTrigger: {
    padding: 4,
  },
  doneBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
  },
  doneBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  quickFreqContainer: {
    marginBottom: 20,
  },
  quickFreqLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  quickFreqGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickFreqChip: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  quickFreqChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
});
