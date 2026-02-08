import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Modal,
    ScrollView,
} from 'react-native';
import {
    Plus,
    Square,
    CheckSquare,
} from 'lucide-react-native';
import { getAllLabels, createLabel } from '@/repositories/LabelRepository';
import { COLORS } from '@/constants';

interface TagPickerModalProps {
    visible: boolean;
    onClose: () => void;
    selectedTags: string[];
    onTagsChange: (tags: string[]) => void;
}

export const TagPickerModal: React.FC<TagPickerModalProps> = ({
    visible,
    onClose,
    selectedTags,
    onTagsChange,
}) => {
    const [newTag, setNewTag] = useState('');
    const [existingTags, setExistingTags] = useState<string[]>([]);

    useEffect(() => {
        if (visible) {
            loadData();
        }
    }, [visible]);

    const loadData = async () => {
        const labels = await getAllLabels();
        setExistingTags(labels.map((l) => l.name));
    };

    const toggleTag = (tag: string) => {
        if (selectedTags.includes(tag)) {
            onTagsChange(selectedTags.filter((t) => t !== tag));
        } else {
            onTagsChange([...selectedTags, tag]);
        }
    };

    const addNewTag = async () => {
        const tag = newTag.trim();
        if (tag) {
            const existing = existingTags.find((t) => t.toLowerCase() === tag.toLowerCase());
            const tagToUse = existing || tag;

            if (!existing) {
                await createLabel(tagToUse);
                setExistingTags([tagToUse, ...existingTags]);
            }

            if (!selectedTags.includes(tagToUse)) {
                onTagsChange([...selectedTags, tagToUse]);
            }
            setNewTag('');
        }
    };

    const filteredTags = existingTags.filter((t) =>
        t.toLowerCase().includes(newTag.toLowerCase())
    );

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <View style={styles.popupContent} onStartShouldSetResponder={() => true}>
                    <View style={styles.popupHeader}>
                        <TextInput
                            style={styles.popupInput}
                            placeholder="New label..."
                            value={newTag}
                            onChangeText={setNewTag}
                            placeholderTextColor={COLORS.textSecondary}
                        />
                        <TouchableOpacity onPress={addNewTag} style={styles.addTagBtn}>
                            <Plus size={20} color={COLORS.primary} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView
                        style={styles.popupList}
                        keyboardShouldPersistTaps="handled"
                    >
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
                                        <Square size={18} color="#000" />
                                    )}
                                    <Text
                                        style={[
                                            styles.popupItemText,
                                            isSelected && styles.popupItemTextActive,
                                        ]}
                                    >
                                        {tag}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                    <TouchableOpacity
                        style={[styles.doneBtn, { marginTop: 12 }]}
                        onPress={onClose}
                    >
                        <Text style={styles.doneBtnText}>OK</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    addTagBtn: {
        padding: 8,
    },
    doneBtn: {
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        flexDirection: 'row',
        gap: 6,
        height: 42,
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    doneBtnText: {
        color: COLORS.background,
        fontSize: 14,
        fontWeight: '700',
    },
    modalOverlay: {
        alignItems: 'center',
        backgroundColor: COLORS.overlay,
        flex: 1,
        justifyContent: 'center',
    },
    popupContent: {
        backgroundColor: COLORS.background,
        borderRadius: 16,
        maxHeight: '80%',
        maxWidth: 340,
        padding: 16,
        width: '85%',
    },
    popupHeader: {
        alignItems: 'center',
        borderBottomColor: COLORS.border,
        borderBottomWidth: 1,
        flexDirection: 'row',
        marginBottom: 12,
        paddingBottom: 8,
    },
    popupInput: {
        color: COLORS.dark,
        flex: 1,
        fontSize: 16,
    },
    popupItem: {
        alignItems: 'center',
        flexDirection: 'row',
        paddingVertical: 12,
    },
    popupItemText: {
        color: COLORS.dark,
        fontSize: 15,
        marginLeft: 12,
    },
    popupItemTextActive: {
        color: COLORS.primary,
        fontWeight: '600',
    },
    popupList: {
        maxHeight: 200,
    },
});
