import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ImagePicker } from '../components/Upload/ImagePicker';
import { BatchProgress } from '../components/Upload/BatchProgress';
import { Button } from '../components/Button';
import { useUpload } from '../hooks/useUpload';
import type { PhotoFile } from '../types/upload';

export default function UploadScreen() {
  const { uploadPhotos, uploadProgress, isUploading, error } = useUpload();
  const [selectedImages, setSelectedImages] = useState<PhotoFile[]>([]);

  const handleImagesSelected = (images: PhotoFile[]) => {
    setSelectedImages(images);
  };

  const handleUpload = async () => {
    if (selectedImages.length === 0) {
      Alert.alert('No Images', 'Please select at least one image to upload');
      return;
    }

    try {
      await uploadPhotos(selectedImages, 3); // 3 concurrent uploads
      Alert.alert('Success', 'Photos uploaded successfully');
      setSelectedImages([]);
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message || 'Failed to upload photos');
    }
  };

  const handleClear = () => {
    setSelectedImages([]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Upload Photos</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <ImagePicker
          onImagesSelected={handleImagesSelected}
          maxImages={100}
          disabled={isUploading}
        />

        {selectedImages.length > 0 && (
          <View style={styles.actions}>
            <Button
              title={isUploading ? 'Uploading...' : `Upload ${selectedImages.length} Photos`}
              onPress={handleUpload}
              variant="primary"
              size="large"
              disabled={isUploading}
              loading={isUploading}
              style={styles.uploadButton}
            />
            {!isUploading && (
              <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
                <Text style={styles.clearButtonText}>Clear Selection</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {uploadProgress && (
          <View style={styles.progressContainer}>
            <BatchProgress progress={uploadProgress} />
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  title: {
    color: '#F3F4F6',
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  actions: {
    marginTop: 16,
    gap: 12,
  },
  uploadButton: {
    marginBottom: 8,
  },
  clearButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  progressContainer: {
    marginTop: 16,
  },
  errorContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#7F1D1D',
    borderRadius: 8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
  },
});

