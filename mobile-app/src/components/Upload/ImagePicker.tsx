import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
} from 'react-native';
import * as ExpoImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import type { PhotoFile } from '../../types/upload';

interface ImagePickerProps {
  onImagesSelected: (images: PhotoFile[]) => void;
  onValidationError?: (message: string) => void;
  maxImages?: number;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const ImagePicker: React.FC<ImagePickerProps> = ({
  onImagesSelected,
  onValidationError,
  maxImages = 100,
  disabled = false,
}) => {
  const [selectedImages, setSelectedImages] = useState<PhotoFile[]>([]);

  const requestPermissions = async () => {
    const { status } = await ExpoImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'We need access to your photos to upload them.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const pickImages = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ExpoImagePicker.launchImageLibraryAsync({
        mediaTypes: ExpoImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: maxImages - selectedImages.length,
      });

      if (!result.canceled && result.assets) {
        const validImages: PhotoFile[] = [];
        const tooLargeFiles: string[] = [];

        result.assets.forEach((asset) => {
          const fileSize = asset.fileSize || 0;
          const filename = asset.fileName || `photo_${Date.now()}.jpg`;
          
          if (fileSize > MAX_FILE_SIZE) {
            tooLargeFiles.push(`${filename} (${formatFileSize(fileSize)})`);
          } else {
            validImages.push({
              uri: asset.uri,
              filename,
              fileSize,
              type: asset.mimeType || 'image/jpeg',
              width: asset.width,
              height: asset.height,
            });
          }
        });

        // Show warning for files that are too large
        if (tooLargeFiles.length > 0) {
          const message = `The following ${tooLargeFiles.length} file${tooLargeFiles.length > 1 ? 's' : ''} exceed the 10MB limit and were not added:\n\n${tooLargeFiles.slice(0, 5).join('\n')}${tooLargeFiles.length > 5 ? `\n...and ${tooLargeFiles.length - 5} more` : ''}`;
          if (onValidationError) {
            onValidationError(message);
          } else {
            Alert.alert('File Size Limit', message);
          }
        }

        // Only add valid images
        if (validImages.length > 0) {
          const updatedImages = [...selectedImages, ...validImages].slice(0, maxImages);
          setSelectedImages(updatedImages);
          onImagesSelected(updatedImages);
        } else if (tooLargeFiles.length > 0) {
          // If all files were too large, don't update selection
          return;
        }
      }
    } catch (error: any) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to pick images. Please try again.');
    }
  };

  const removeImage = (index: number) => {
    const updatedImages = selectedImages.filter((_, i) => i !== index);
    setSelectedImages(updatedImages);
    onImagesSelected(updatedImages);
  };

  return (
    <View style={styles.container}>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, disabled && styles.buttonDisabled]}
          onPress={pickImages}
          disabled={disabled || selectedImages.length >= maxImages}
        >
          <Ionicons name="add-circle-outline" size={24} color="#8B5CF6" />
          <Text style={styles.buttonText}>
            {selectedImages.length > 0
              ? `Add More (${selectedImages.length}/${maxImages})`
              : `Select Photos (up to ${maxImages})`}
          </Text>
        </TouchableOpacity>
      </View>

      {selectedImages.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.imagePreviewContainer}
        >
          {selectedImages.map((image, index) => (
            <View key={index} style={styles.imagePreview}>
              <Image source={{ uri: image.uri }} style={styles.image} />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeImage(index)}
              >
                <Ionicons name="close-circle" size={24} color="#EF4444" />
              </TouchableOpacity>
              <Text style={styles.imageName} numberOfLines={1}>
                {image.filename}
              </Text>
              <Text style={styles.imageSize}>
                {formatFileSize(image.fileSize)}
              </Text>
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
  buttonContainer: {
    marginBottom: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#F3F4F6',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  imagePreviewContainer: {
    marginTop: 8,
  },
  imagePreview: {
    marginRight: 12,
    position: 'relative',
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#1F2937',
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#000',
    borderRadius: 12,
  },
  imageName: {
    color: '#9CA3AF',
    fontSize: 10,
    marginTop: 4,
    width: 80,
    textAlign: 'center',
  },
  imageSize: {
    color: '#6B7280',
    fontSize: 9,
    marginTop: 2,
    width: 80,
    textAlign: 'center',
  },
});

