import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDownload } from '../../hooks/useDownload';
import type { Photo } from '../../types';

interface DownloadButtonProps {
  photo: Photo;
  variant?: 'icon' | 'button';
  onComplete?: () => void;
}

export const DownloadButton: React.FC<DownloadButtonProps> = ({
  photo,
  variant = 'icon',
  onComplete,
}) => {
  const { downloadPhoto, isDownloading, photoProgress } = useDownload();
  const progress = photoProgress.get(photo.id);

  const handleDownload = async () => {
    try {
      await downloadPhoto(photo);
      onComplete?.();
    } catch (error: any) {
      console.error('Download failed:', error);
    }
  };

  if (variant === 'icon') {
    return (
      <TouchableOpacity
        onPress={handleDownload}
        disabled={isDownloading}
        style={styles.iconButton}
      >
        {progress?.status === 'downloading' ? (
          <Ionicons name="cloud-download-outline" size={18} color="#8B5CF6" />
        ) : progress?.status === 'completed' ? (
          <Ionicons name="checkmark-circle" size={18} color="#10B981" />
        ) : (
          <Ionicons name="download-outline" size={18} color="#F3F4F6" />
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={handleDownload}
      disabled={isDownloading}
      style={[styles.button, isDownloading && styles.buttonDisabled]}
    >
      {progress?.status === 'downloading' ? (
        <>
          <Ionicons name="cloud-download-outline" size={20} color="#F3F4F6" />
          <Text style={styles.buttonText}>
            Downloading... {progress.progress}%
          </Text>
        </>
      ) : progress?.status === 'completed' ? (
        <>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={styles.buttonText}>Downloaded</Text>
        </>
      ) : (
        <>
          <Ionicons name="download-outline" size={20} color="#F3F4F6" />
          <Text style={styles.buttonText}>Download</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  iconButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 4,
    padding: 4,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#F3F4F6',
    fontSize: 16,
    fontWeight: '600',
  },
});

