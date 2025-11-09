import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Tag } from '../../types';

interface TagDisplayProps {
  tags: Tag[];
  onTagPress?: (tag: Tag) => void;
  maxVisible?: number;
}

export const TagDisplay: React.FC<TagDisplayProps> = ({
  tags,
  onTagPress,
  maxVisible = 3,
}) => {
  if (!tags || tags.length === 0) {
    return null;
  }

  const visibleTags = tags.slice(0, maxVisible);
  const remainingCount = tags.length - maxVisible;

  return (
    <View style={styles.container}>
      {visibleTags.map((tag) => (
        <TouchableOpacity
          key={tag.id}
          style={styles.tag}
          onPress={() => onTagPress?.(tag)}
          disabled={!onTagPress}
        >
          <Ionicons name="pricetag" size={12} color="#8B5CF6" />
          <Text style={styles.tagText}>{tag.name}</Text>
        </TouchableOpacity>
      ))}
      {remainingCount > 0 && (
        <View style={styles.moreTag}>
          <Text style={styles.moreText}>+{remainingCount}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  tagText: {
    color: '#F3F4F6',
    fontSize: 10,
    fontWeight: '500',
  },
  moreTag: {
    backgroundColor: '#374151',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  moreText: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '500',
  },
});

