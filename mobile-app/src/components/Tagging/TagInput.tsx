import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTags } from '../../hooks/useTags';
import type { Photo } from '../../types';

interface TagInputProps {
  photo: Photo;
  visible: boolean;
  onClose: () => void;
  onTagged: () => void;
}

export const TagInput: React.FC<TagInputProps> = ({
  photo,
  visible,
  onClose,
  onTagged,
}) => {
  const { tags, tagPhoto } = useTags();
  const [inputValue, setInputValue] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(
    photo.tags?.map((t) => t.name) || []
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleAddTag = () => {
    const tagName = inputValue.trim();
    if (tagName && !selectedTags.includes(tagName)) {
      setSelectedTags([...selectedTags, tagName]);
      setInputValue('');
    }
  };

  const handleRemoveTag = (tagName: string) => {
    setSelectedTags(selectedTags.filter((t) => t !== tagName));
  };

  const handleSave = async () => {
    if (isSaving) return; // Prevent double-tap
    
    setIsSaving(true);
    
    try {
      // Tag photo (wait for it to complete)
      await tagPhoto(photo.id, selectedTags);
      
      // Success - notify parent (parent will handle closing)
      onTagged();
    } catch (error: any) {
      console.error('Failed to tag photo:', error);
      // Close modal on error
      onClose();
    }
  };

  const existingTags = tags
    .map((t) => t.name)
    .filter((name) => !selectedTags.includes(name));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Add Tags</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#F3F4F6" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter tag name"
              placeholderTextColor="#6B7280"
              value={inputValue}
              onChangeText={setInputValue}
              onSubmitEditing={handleAddTag}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={handleAddTag} style={styles.addButton}>
              <Ionicons name="add" size={24} color="#8B5CF6" />
            </TouchableOpacity>
          </View>

          {selectedTags.length > 0 && (
            <View style={styles.selectedTagsContainer}>
              <Text style={styles.sectionTitle}>Selected Tags</Text>
              <View style={styles.tagsList}>
                {selectedTags.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={styles.tagChip}
                    onPress={() => handleRemoveTag(tag)}
                  >
                    <Text style={styles.tagText}>{tag}</Text>
                    <Ionicons name="close-circle" size={16} color="#F3F4F6" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {existingTags.length > 0 && (
            <View style={styles.existingTagsContainer}>
              <Text style={styles.sectionTitle}>Existing Tags</Text>
              <View style={styles.tagsList}>
                {existingTags.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={styles.tagChipInactive}
                    onPress={() => {
                      setSelectedTags([...selectedTags, tag]);
                    }}
                  >
                    <Text style={styles.tagTextInactive}>{tag}</Text>
                    <Ionicons name="add-circle-outline" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={onClose}
              disabled={isSaving}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} 
              onPress={handleSave}
              disabled={isSaving}
            >
              <Text style={styles.saveButtonText}>
                {isSaving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#F3F4F6',
    fontSize: 20,
    fontWeight: 'bold',
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#F3F4F6',
    fontSize: 16,
  },
  addButton: {
    padding: 12,
    justifyContent: 'center',
  },
  selectedTagsContainer: {
    marginBottom: 20,
  },
  existingTagsContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  tagChipInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: '#374151',
  },
  tagText: {
    color: '#F3F4F6',
    fontSize: 14,
    fontWeight: '500',
  },
  tagTextInactive: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 'auto',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#F3F4F6',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#6B7280',
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#F3F4F6',
    fontSize: 16,
    fontWeight: '600',
  },
});

