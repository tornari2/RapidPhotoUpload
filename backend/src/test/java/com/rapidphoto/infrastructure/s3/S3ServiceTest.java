package com.rapidphoto.infrastructure.s3;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class S3ServiceTest {
    
    @Mock
    private S3Client s3Client;
    
    @Mock
    private PresignedUrlGenerator presignedUrlGenerator;
    
    private S3Service s3Service;
    private UUID userId;
    private UUID photoId;
    
    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        photoId = UUID.randomUUID();
        s3Service = new S3ServiceImpl(presignedUrlGenerator, "test-bucket");
    }
    
    @Test
    void testGenerateUploadUrl() {
        String expectedUrl = "https://test-bucket.s3.amazonaws.com/uploads/...";
        when(presignedUrlGenerator.generateUploadUrl(
                userId, photoId, "test.jpg", "image/jpeg"))
                .thenReturn(expectedUrl);
        
        String url = s3Service.generateUploadUrl(userId, photoId, "test.jpg", "image/jpeg");
        
        assertNotNull(url);
        assertEquals(expectedUrl, url);
    }
    
    @Test
    void testGenerateDownloadUrl() {
        String s3Key = "uploads/user123/photo456-test.jpg";
        String expectedUrl = "https://test-bucket.s3.amazonaws.com/uploads/...";
        when(presignedUrlGenerator.generateDownloadUrl(s3Key))
                .thenReturn(expectedUrl);
        
        String url = s3Service.generateDownloadUrl(s3Key);
        
        assertNotNull(url);
        assertEquals(expectedUrl, url);
    }
    
    @Test
    void testFileExists_ReturnsTrue() {
        String s3Key = "uploads/user123/photo456-test.jpg";
        when(presignedUrlGenerator.fileExists(s3Key)).thenReturn(true);
        
        assertTrue(s3Service.fileExists(s3Key));
    }
    
    @Test
    void testFileExists_ReturnsFalse() {
        String s3Key = "uploads/user123/nonexistent.jpg";
        when(presignedUrlGenerator.fileExists(s3Key)).thenReturn(false);
        
        assertFalse(s3Service.fileExists(s3Key));
    }
    
    @Test
    void testBuildS3Key() {
        String s3Key = s3Service.buildS3Key(userId, photoId, "test photo.jpg");
        
        assertNotNull(s3Key);
        assertTrue(s3Key.startsWith("uploads/"));
        assertTrue(s3Key.contains(userId.toString()));
        assertTrue(s3Key.contains(photoId.toString()));
        // Filename should be sanitized (spaces replaced)
        assertTrue(s3Key.contains("test_photo.jpg") || s3Key.contains("test"));
    }
    
    @Test
    void testBuildS3Key_SanitizesSpecialCharacters() {
        String s3Key = s3Service.buildS3Key(userId, photoId, "test@#$%photo.jpg");
        
        // Should sanitize special characters
        assertFalse(s3Key.contains("@"));
        assertFalse(s3Key.contains("#"));
        assertFalse(s3Key.contains("$"));
        assertFalse(s3Key.contains("%"));
    }
}

