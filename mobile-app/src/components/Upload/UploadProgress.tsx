import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { UploadProgress as UploadProgressType } from '../../types/upload';

interface UploadProgressProps {
  progress: UploadProgressType;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({ progress }) => {
  const getStatusColor = () => {
    switch (progress.status) {
      case 'completed':
        return '#10B981'; // green
      case 'failed':
        return '#EF4444'; // red
      case 'uploading':
        return '#8B5CF6'; // purple
      default:
        return '#6B7280'; // gray
    }
  };

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'completed':
        return <Ionicons name="checkmark-circle" size={20} color="#10B981" />;
      case 'failed':
        return <Ionicons name="close-circle" size={20} color="#EF4444" />;
      case 'uploading':
        return <Ionicons name="cloud-upload-outline" size={20} color="#8B5CF6" />;
      default:
        return <Ionicons name="time-outline" size={20} color="#6B7280" />;
    }
  };

  const formatUploadTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {getStatusIcon()}
          <Text style={styles.filename} numberOfLines={1}>
            {progress.filename}
          </Text>
        </View>
        <View style={styles.headerRight}>
          {progress.uploadTime !== undefined && progress.status !== 'pending' && (
            <Text style={styles.time}>{formatUploadTime(progress.uploadTime)}</Text>
          )}
          <Text style={styles.percentage}>
            {progress.status === 'completed'
              ? '100%'
              : progress.status === 'failed'
              ? 'Failed'
              : progress.status === 'uploading'
              ? `${progress.progress}%`
              : 'Pending'}
          </Text>
        </View>
      </View>
      <View style={styles.progressBarContainer}>
        <View
          style={[
            styles.progressBar,
            { width: `${progress.progress}%`, backgroundColor: getStatusColor() },
          ]}
        />
      </View>
      {progress.error && (
        <Text style={styles.errorText}>{progress.error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filename: {
    color: '#F3F4F6',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  time: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  percentage: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
    minWidth: 50,
    textAlign: 'right',
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#374151',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
});

