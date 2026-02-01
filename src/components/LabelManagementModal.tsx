import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Modal,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Plus, Check, Pencil, Trash2, Tag, X } from 'lucide-react-native';
import { Label, getAllLabels, createLabel, updateLabel, deleteLabel } from '@/repositories/LabelRepository';
import { COLORS } from '@/constants';

interface LabelManagementModalProps {
    visible: boolean;
    onClose: () => void;
    onLabelsChanged?: () => void;
}

export const LabelManagementModal: React.FC<LabelManagementModalProps> = ({
    visible,
    onClose,
    onLabelsChanged,
}) => {
    const [labels, setLabels] = useState<Label[]>([]);
    const [newLabelName, setNewLabelName] = useState('');
    const [editingLabelId, setEditingLabelId] = useState<number | null>(null);
    const [editingName, setEditingName] = useState('');

    useEffect(() => {
        if (visible) {
            loadLabels();
        }
    }, [visible]);

    const loadLabels = async () => {
        const data = await getAllLabels();
        setLabels(data);
    };

    const handleCreate = async () => {
        if (!newLabelName.trim()) return;
        try {
            await createLabel(newLabelName.trim());
            setNewLabelName('');
            await loadLabels();
            onLabelsChanged?.();
        } catch (error) {
            console.error('Failed to create label:', error);
        }
    };

    const handleUpdate = async (id: number) => {
        if (!editingName.trim()) return;
        try {
            await updateLabel(id, editingName.trim());
            setEditingLabelId(null);
            await loadLabels();
            onLabelsChanged?.();
        } catch (error) {
            console.error('Failed to update label:', error);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await deleteLabel(id);
            await loadLabels();
            onLabelsChanged?.();
        } catch (error) {
            console.error('Failed to delete label:', error);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.container}
                >
                    <View style={styles.content}>
                        <Text style={styles.title}>Edit labels</Text>

                        {/* Create New Label */}
                        <View style={styles.row}>
                            <TouchableOpacity onPress={() => setNewLabelName('')} style={styles.iconBtn}>
                                <X size={20} color={newLabelName ? '#5f6368' : '#e0e0e0'} />
                            </TouchableOpacity>
                            <TextInput
                                style={styles.input}
                                placeholder="Create new label"
                                value={newLabelName}
                                onChangeText={setNewLabelName}
                                onSubmitEditing={handleCreate}
                            />
                            <TouchableOpacity onPress={handleCreate} style={styles.iconBtn} disabled={!newLabelName}>
                                <Check size={20} color={newLabelName ? COLORS.primary : '#e0e0e0'} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.labelList}>
                            {labels.map((label) => (
                                <View key={label.id} style={styles.row}>
                                    {editingLabelId === label.id ? (
                                        <TouchableOpacity onPress={() => handleDelete(label.id)} style={styles.iconBtn}>
                                            <Trash2 size={20} color="#5f6368" />
                                        </TouchableOpacity>
                                    ) : (
                                        <View style={styles.iconBtn}>
                                            <Tag size={20} color="#5f6368" />
                                        </View>
                                    )}

                                    <TextInput
                                        style={[styles.input, editingLabelId === label.id && styles.inputEditing]}
                                        value={editingLabelId === label.id ? editingName : label.name}
                                        onChangeText={setEditingName}
                                        onFocus={() => {
                                            setEditingLabelId(label.id);
                                            setEditingName(label.name);
                                        }}
                                        onSubmitEditing={() => handleUpdate(label.id)}
                                    />

                                    {editingLabelId === label.id ? (
                                        <TouchableOpacity onPress={() => handleUpdate(label.id)} style={styles.iconBtn}>
                                            <Check size={20} color={COLORS.primary} />
                                        </TouchableOpacity>
                                    ) : (
                                        <TouchableOpacity
                                            onPress={() => {
                                                setEditingLabelId(label.id);
                                                setEditingName(label.name);
                                            }}
                                            style={styles.iconBtn}
                                        >
                                            <Pencil size={20} color="#5f6368" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}
                        </ScrollView>

                        <View style={styles.footer}>
                            <TouchableOpacity onPress={onClose} style={styles.doneBtn}>
                                <Text style={styles.doneBtnText}>Done</Text>
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
        alignItems: 'center',
    },
    container: {
        width: '90%',
        maxWidth: 400,
        backgroundColor: '#fff',
        borderRadius: 8,
        overflow: 'hidden',
    },
    content: {
        padding: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#202124',
        marginBottom: 20,
        paddingHorizontal: 8,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 48,
        marginBottom: 8,
    },
    iconBtn: {
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#3c4043',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'transparent',
    },
    inputEditing: {
        borderBottomColor: '#e0e0e0',
    },
    labelList: {
        maxHeight: 300,
        marginTop: 8,
    },
    footer: {
        borderTopWidth: 1,
        borderTopColor: '#f1f3f4',
        paddingTop: 12,
        alignItems: 'flex-end',
        marginTop: 12,
    },
    doneBtn: {
        paddingHorizontal: 24,
        paddingVertical: 10,
    },
    doneBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#202124',
    },
});
