import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { UploadProgress } from './UploadProgress';
import type { BatchUploadProgress } from '../../types/upload';

interface BatchProgressProps {
  progress: BatchUploadProgress;
}

export const BatchProgress: React.FC<BatchProgressProps> = ({ progress }) => {
  const getStatusText = () => {
    switch (progress.status) {
      case 'completed':
        return 'All uploads completed';
      case 'partial_success':
        return 'Some uploads failed';
      case 'failed':
        return 'All uploads failed';
      case 'uploading':
        return 'Uploading...';
      default:
        return 'Preparing...';
    }
  };

  const getStatusColor = () => {
    switch (progress.status) {
      case 'completed':
        return '#10B981';
      case 'partial_success':
        return '#F59E0B';
      case 'failed':
        return '#EF4444';
      default:
        return '#8B5CF6';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Upload Progress</Text>
        <Text style={[styles.status, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total</Text>
          <Text style={styles.summaryValue}>{progress.total}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Completed</Text>
          <Text style={[styles.summaryValue, { color: '#10B981' }]}>
            {progress.completed}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Failed</Text>
          <Text style={[styles.summaryValue, { color: '#EF4444' }]}>
            {progress.failed}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Progress</Text>
          <Text style={styles.summaryValue}>{progress.progress}%</Text>
        </View>
      </View>

      <View style={styles.overallProgressBar}>
        <View
          style={[
            styles.overallProgressBarFill,
            { width: `${progress.progress}%`, backgroundColor: getStatusColor() },
          ]}
        />
      </View>

      <ScrollView style={styles.photosList}>
        {progress.photos.map((photoProgress) => (
          <UploadProgress key={photoProgress.photoId} progress={photoProgress} />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#F3F4F6',
    fontSize: 18,
    fontWeight: 'bold',
  },
  status: {
    fontSize: 14,
    fontWeight: '600',
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 4,
  },
  summaryValue: {
    color: '#F3F4F6',
    fontSize: 18,
    fontWeight: 'bold',
  },
  overallProgressBar: {
    height: 8,
    backgroundColor: '#374151',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  overallProgressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  photosList: {
    maxHeight: 300,
  },
});

