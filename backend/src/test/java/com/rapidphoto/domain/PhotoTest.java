package com.rapidphoto.domain;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class PhotoTest {
    
    private User user;
    private UploadJob uploadJob;
    private Photo photo;
    
    @BeforeEach
    void setUp() {
        user = User.builder()
                .id(UUID.randomUUID())
                .username("testuser")
                .passwordHash("hash")
                .build();
        
        uploadJob = UploadJob.builder()
                .id(UUID.randomUUID())
                .user(user)
                .totalCount(10)
                .build();
        
        photo = Photo.builder()
                .user(user)
                .uploadJob(uploadJob)
                .filename("test.jpg")
                .s3Key("uploads/user123/test.jpg")
                .fileSize(2048000L)
                .contentType("image/jpeg")
                .uploadStatus(PhotoStatus.UPLOADING)
                .build();
    }
    
    @Test
    void testPhotoCreation() {
        assertNotNull(photo);
        assertEquals("test.jpg", photo.getFilename());
        assertEquals(PhotoStatus.UPLOADING, photo.getUploadStatus());
        assertEquals(0, photo.getRetryCount());
    }
    
    @Test
    void testMarkAsCompleted() {
        photo.markAsCompleted();
        assertEquals(PhotoStatus.COMPLETED, photo.getUploadStatus());
        assertNotNull(photo.getCompletedAt());
    }
    
    @Test
    void testMarkAsCompleted_ThrowsExceptionIfAlreadyCompleted() {
        photo.markAsCompleted();
        assertThrows(IllegalStateException.class, () -> photo.markAsCompleted());
    }
    
    @Test
    void testMarkAsFailed() {
        photo.markAsFailed();
        assertEquals(PhotoStatus.FAILED, photo.getUploadStatus());
        assertEquals(1, photo.getRetryCount());
    }
    
    @Test
    void testRetry_FromFailedStatus() {
        photo.markAsFailed();
        photo.retry();
        assertEquals(PhotoStatus.UPLOADING, photo.getUploadStatus());
    }
    
    @Test
    void testRetry_ThrowsExceptionIfNotFailed() {
        assertThrows(IllegalStateException.class, () -> photo.retry());
    }
    
    @Test
    void testCanRetry_WithFailedStatusAndUnderMaxRetries() {
        photo.markAsFailed();
        assertTrue(photo.canRetry(3));
    }
    
    @Test
    void testCanRetry_WithFailedStatusButExceededMaxRetries() {
        photo.markAsFailed();
        photo.setRetryCount(3);
        assertFalse(photo.canRetry(3));
    }
    
    @Test
    void testCanRetry_WithNonFailedStatus() {
        assertFalse(photo.canRetry(3));
    }
    
    @Test
    void testBelongsTo_WithCorrectUser() {
        assertTrue(photo.belongsTo(user));
    }
    
    @Test
    void testBelongsTo_WithDifferentUser() {
        User otherUser = User.builder()
                .id(UUID.randomUUID())
                .username("otheruser")
                .passwordHash("hash")
                .build();
        assertFalse(photo.belongsTo(otherUser));
    }
    
    @Test
    void testPrePersist_SetsDefaults() {
        Photo newPhoto = new Photo();
        newPhoto.onCreate();
        assertNotNull(newPhoto.getCreatedAt());
        assertEquals(PhotoStatus.UPLOADING, newPhoto.getUploadStatus());
        assertEquals(0, newPhoto.getRetryCount());
    }
}

