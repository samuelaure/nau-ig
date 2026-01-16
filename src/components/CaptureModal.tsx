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
import { getSetting } from '@/repositories/SettingsRepository';
import { syncManager } from '@/services/SyncManager';
import { COLORS } from '@/constants';

interface CaptureModalProps {
  shareValue: string;
  onClose: () => void;
}

const UNITS = ['Days', 'Weeks', 'Months', 'Years'];

export const CaptureModal: React.FC<CaptureModalProps> = ({ shareValue, onClose }) => {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [existingTags, setExistingTags] = useState<string[]>([]);

  // Frequency States
  const [repeatInterval, setRepeatInterval] = useState('1');
  const [repeatUnit, setRepeatUnit] = useState('Days');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [pickerDate, setPickerDate] = useState(new Date());

  // Modal Visibility
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showFreqPicker, setShowFreqPicker] = useState(false);
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isFreqCustomized, setIsFreqCustomized] = useState(false);

  // Clean the URL if it comes with prefix text (common in Instagram shares)
  const cleanUrl = useRef('');
  useEffect(() => {
    if (shareValue) {
      // 1. Extract the actual URL from any surrounding text
      const urlMatch = shareValue.match(/https?:\/\/[^\s]+/);
      let extractedUrl = urlMatch ? urlMatch[0] : shareValue;

      // 2. Strip tracking parameters (the part after ?)
      try {
        const urlObj = new URL(extractedUrl);
        // We only want the path (e.g. /p/CODE/) and host, not the query params
        // This effectively removes ?igsh=... and other trackers
        cleanUrl.current = `${urlObj.origin}${urlObj.pathname}`;
      } catch (e) {
        // Fallback if URL parsing fails: just use the extracted URL
        cleanUrl.current = extractedUrl.split('?')[0];
      }
    }
  }, [shareValue]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

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
    // We already ensure existingTags match case, but let's be safe
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const addNewTag = () => {
    const tag = newTag.trim();
    if (tag) {
      // Find case-insensitive match
      const existing = existingTags.find(t => t.toLowerCase() === tag.toLowerCase());
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

  const filteredTags = existingTags.filter(t =>
    t.toLowerCase().includes(newTag.toLowerCase())
  );

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
      if (Platform.OS === 'android') {
        BackHandler.exitApp();
      }
    });
  };

  const handleSave = async () => {
    if (!shareValue) {
      console.error('[CaptureModal] Cannot save: shareValue is missing');
      return;
    }

    console.log('[CaptureModal] handleSave started. shareValue:', cleanUrl.current);
    setIsSaving(true);
    try {
      const postData = {
        instagramUrl: cleanUrl.current,
        title: title || 'Instagram Capture',
        content: note,
        tags: selectedTags,
        frequency: `${repeatInterval} ${repeatUnit}`,
        startDate: startDate,
      };

      console.log('[CaptureModal] Attempting to savePost with:', postData);
      const postId = await savePost(postData);
      console.log('[CaptureModal] savePost success. postId:', postId);

      // Wake up the background sync manager to start downloading the new capture
      syncManager.triggerSync();

      console.log('[CaptureModal] Showing success toast');
      if (Platform.OS === 'android') {
        ToastAndroid.show('Capture Saved!', ToastAndroid.SHORT);
      }

      console.log('[CaptureModal] Closing modal');
      handleClose();
    } catch (err) {
      console.error('[CaptureModal] CRITICAL SAVE ERROR:', err);
      Alert.alert('Save Error', 'Failed to save the content. Check console for details.');
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
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleClose} activeOpacity={1} />
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
        <View style={styles.urlHeader}>
          <LinkIcon size={10} color="#9ca3af" />
          <Text style={styles.urlText} numberOfLines={1}>
            {cleanUrl.current.replace('https://', '').replace('www.', '') || 'No URL'}
          </Text>
        </View>

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
              <RotateCw size={20} color="#5f6368" />
              {isFreqCustomized && (
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
                    <Text style={[styles.popupItemText, isSelected && styles.popupItemTextActive]}>
                      {tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

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
    backgroundColor: '#a34d20',
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
    maxHeight: '60%',
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
});
