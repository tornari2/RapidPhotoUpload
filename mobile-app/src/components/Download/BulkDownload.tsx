import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDownload } from '../../hooks/useDownload';
import { useToast } from '../../contexts/ToastContext';
import type { Photo } from '../../types';

interface BulkDownloadProps {
  photos: Photo[];
  onComplete?: () => void;
}

export const BulkDownload: React.FC<BulkDownloadProps> = ({ photos, onComplete }) => {
  const { downloadPhotos, isDownloading, progress, photoProgress, error } = useDownload();
  const { showToast } = useToast();
  const [showProgress, setShowProgress] = useState(false);

  const handleDownload = async () => {
    if (photos.length === 0) return;

    setShowProgress(true);
    try {
      await downloadPhotos(photos, (completed, total) => {
        // Progress is handled by the hook
      });
      const successCount = progress.completed;
      const failedCount = photos.length - successCount;
      
      if (failedCount === 0) {
        showToast(`Successfully downloaded all ${successCount} photos`, 'success');
      } else {
        showToast(`Downloaded ${successCount} photos, ${failedCount} failed`, 'error');
      }
      onComplete?.();
    } catch (err: any) {
      showToast(err.message || 'Failed to download photos', 'error');
    } finally {
      setTimeout(() => {
        setShowProgress(false);
      }, 2000);
    }
  };

  if (photos.length === 0) {
    return null;
  }

  const activeDownloads = Array.from(photoProgress.values()).filter(
    (p) => p.status === 'downloading'
  ).length;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={handleDownload}
        disabled={isDownloading}
        style={[styles.button, isDownloading && styles.buttonDisabled]}
      >
        <Ionicons name="download-outline" size={20} color="#F3F4F6" />
        <Text style={styles.buttonText}>
          {isDownloading
            ? `Downloading... (${progress.completed}/${progress.total})`
            : `Download ${photos.length} Photos`}
        </Text>
      </TouchableOpacity>

      {showProgress && isDownloading && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${progress.percentage}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {progress.completed} of {progress.total} photos downloaded
            {activeDownloads > 0 && ` (${activeDownloads} downloading)`}
          </Text>
          <Text style={styles.progressSubtext}>
            {progress.percentage}% complete
          </Text>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error.message}</Text>
        </View>
      )}

      {showProgress && photoProgress.size > 0 && (
        <ScrollView style={styles.photosList}>
          {Array.from(photoProgress.values()).map((photoProg) => (
            <View key={photoProg.photoId} style={styles.photoItem}>
              <Text style={styles.photoName} numberOfLines={1}>
                {photoProg.filename}
              </Text>
              <View style={styles.photoStatus}>
                {photoProg.status === 'completed' && (
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                )}
                {photoProg.status === 'failed' && (
                  <Ionicons name="close-circle" size={16} color="#EF4444" />
                )}
                {photoProg.status === 'downloading' && (
                  <Ionicons name="cloud-download-outline" size={16} color="#8B5CF6" />
                )}
                <Text style={styles.photoProgress}>
                  {photoProg.status === 'completed'
                    ? '100%'
                    : photoProg.status === 'failed'
                    ? 'Failed'
                    : `${photoProg.progress}%`}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
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
  progressContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#1F2937',
    borderRadius: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#374151',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 4,
  },
  progressText: {
    color: '#F3F4F6',
    fontSize: 14,
    marginBottom: 4,
  },
  progressSubtext: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  errorContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#7F1D1D',
    borderRadius: 4,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
  },
  photosList: {
    maxHeight: 200,
    marginTop: 12,
  },
  photoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#111827',
    borderRadius: 4,
    marginBottom: 4,
  },
  photoName: {
    color: '#F3F4F6',
    fontSize: 12,
    flex: 1,
    marginRight: 8,
  },
  photoStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  photoProgress: {
    color: '#9CA3AF',
    fontSize: 12,
  },
});

