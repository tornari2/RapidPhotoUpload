package com.rapidphoto.features.retry_upload;

import com.rapidphoto.domain.Photo;
import com.rapidphoto.domain.PhotoStatus;
import com.rapidphoto.domain.UploadJob;
import com.rapidphoto.domain.UploadJobStatus;
import com.rapidphoto.domain.User;
import com.rapidphoto.features.retry_upload.dto.RetryUploadResponse;
import com.rapidphoto.features.upload_photo.repository.PhotoRepository;
import com.rapidphoto.features.upload_photo.repository.UploadJobRepository;
import com.rapidphoto.features.auth.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Integration tests for retry upload functionality
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class RetryUploadIntegrationTest {
    
    @Autowired
    private RetryUploadHandler retryUploadHandler;
    
    @Autowired
    private PhotoRepository photoRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private UploadJobRepository uploadJobRepository;
    
    private User testUser;
    private User otherUser;
    private Photo failedPhoto;
    private Photo completedPhoto;
    private Photo uploadingPhoto;
    private Photo maxRetriesPhoto;
    private Photo otherUserFailedPhoto;
    
    @BeforeEach
    void setUp() {
        // Create test users
        testUser = User.builder()
                .username("test@example.com")
                .passwordHash("hashedPassword")
                .build();
        testUser = userRepository.save(testUser);
        
        otherUser = User.builder()
                .username("other@example.com")
                .passwordHash("hashedPassword")
                .build();
        otherUser = userRepository.save(otherUser);
        
        // Create test upload job
        UploadJob testJob = UploadJob.builder()
                .user(testUser)
                .totalCount(4)
                .completedCount(1)
                .failedCount(3)
                .status(UploadJobStatus.PARTIAL_SUCCESS)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        testJob = uploadJobRepository.save(testJob);
        
        // Create failed photo (can be retried)
        failedPhoto = Photo.builder()
                .user(testUser)
                .uploadJob(testJob)
                .filename("failed.jpg")
                .s3Key("uploads/" + testUser.getId() + "/" + UUID.randomUUID() + "-failed.jpg")
                .fileSize(1024L)
                .contentType("image/jpeg")
                .uploadStatus(PhotoStatus.FAILED)
                .retryCount(1)
                .createdAt(LocalDateTime.now().minusHours(1))
                .build();
        failedPhoto = photoRepository.save(failedPhoto);
        
        // Create completed photo (cannot be retried)
        completedPhoto = Photo.builder()
                .user(testUser)
                .uploadJob(testJob)
                .filename("completed.jpg")
                .s3Key("uploads/" + testUser.getId() + "/" + UUID.randomUUID() + "-completed.jpg")
                .fileSize(2048L)
                .contentType("image/jpeg")
                .uploadStatus(PhotoStatus.COMPLETED)
                .completedAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now().minusHours(2))
                .build();
        completedPhoto = photoRepository.save(completedPhoto);
        
        // Create uploading photo (cannot be retried)
        uploadingPhoto = Photo.builder()
                .user(testUser)
                .uploadJob(testJob)
                .filename("uploading.jpg")
                .s3Key("uploads/" + testUser.getId() + "/" + UUID.randomUUID() + "-uploading.jpg")
                .fileSize(512L)
                .contentType("image/jpeg")
                .uploadStatus(PhotoStatus.UPLOADING)
                .createdAt(LocalDateTime.now())
                .build();
        uploadingPhoto = photoRepository.save(uploadingPhoto);
        
        // Create photo at max retry count (cannot be retried)
        maxRetriesPhoto = Photo.builder()
                .user(testUser)
                .uploadJob(testJob)
                .filename("max-retries.jpg")
                .s3Key("uploads/" + testUser.getId() + "/" + UUID.randomUUID() + "-max-retries.jpg")
                .fileSize(1024L)
                .contentType("image/jpeg")
                .uploadStatus(PhotoStatus.FAILED)
                .retryCount(3) // Max retries (default is 3)
                .createdAt(LocalDateTime.now().minusHours(3))
                .build();
        maxRetriesPhoto = photoRepository.save(maxRetriesPhoto);
        
        // Create other user's failed photo
        otherUserFailedPhoto = Photo.builder()
                .user(otherUser)
                .filename("other-failed.jpg")
                .s3Key("uploads/" + otherUser.getId() + "/" + UUID.randomUUID() + "-other-failed.jpg")
                .fileSize(1024L)
                .contentType("image/jpeg")
                .uploadStatus(PhotoStatus.FAILED)
                .retryCount(1)
                .createdAt(LocalDateTime.now().minusHours(1))
                .build();
        otherUserFailedPhoto = photoRepository.save(otherUserFailedPhoto);
    }
    
    @Test
    void testRetryUpload_Success() {
        RetryUploadCommand command = RetryUploadCommand.builder()
                .photoId(failedPhoto.getId())
                .userId(testUser.getId())
                .build();
        
        RetryUploadResponse response = retryUploadHandler.handle(command);
        
        assertThat(response).isNotNull();
        assertThat(response.getPhotoId()).isEqualTo(failedPhoto.getId());
        assertThat(response.getUploadUrl()).isNotNull();
        assertThat(response.getUploadUrl()).isNotBlank();
        assertThat(response.getFilename()).isEqualTo("failed.jpg");
        assertThat(response.getContentType()).isEqualTo("image/jpeg");
        assertThat(response.getRetryCount()).isEqualTo(1); // Retry count doesn't change on retry
        assertThat(response.getMessage()).isNotNull();
        
        // Verify photo status changed to UPLOADING
        Photo updatedPhoto = photoRepository.findById(failedPhoto.getId()).orElseThrow();
        assertThat(updatedPhoto.getUploadStatus()).isEqualTo(PhotoStatus.UPLOADING);
    }
    
    @Test
    void testRetryUpload_PhotoNotFound() {
        RetryUploadCommand command = RetryUploadCommand.builder()
                .photoId(UUID.randomUUID())
                .userId(testUser.getId())
                .build();
        
        assertThatThrownBy(() -> retryUploadHandler.handle(command))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Photo not found or access denied");
    }
    
    @Test
    void testRetryUpload_AccessDenied() {
        RetryUploadCommand command = RetryUploadCommand.builder()
                .photoId(otherUserFailedPhoto.getId())
                .userId(testUser.getId()) // Different user
                .build();
        
        assertThatThrownBy(() -> retryUploadHandler.handle(command))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Photo not found or access denied");
    }
    
    @Test
    void testRetryUpload_PhotoNotFailed() {
        // Try to retry completed photo
        RetryUploadCommand command1 = RetryUploadCommand.builder()
                .photoId(completedPhoto.getId())
                .userId(testUser.getId())
                .build();
        
        assertThatThrownBy(() -> retryUploadHandler.handle(command1))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Photo cannot be retried");
        
        // Try to retry uploading photo
        RetryUploadCommand command2 = RetryUploadCommand.builder()
                .photoId(uploadingPhoto.getId())
                .userId(testUser.getId())
                .build();
        
        assertThatThrownBy(() -> retryUploadHandler.handle(command2))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Photo cannot be retried");
    }
    
    @Test
    void testRetryUpload_MaxRetriesExceeded() {
        RetryUploadCommand command = RetryUploadCommand.builder()
                .photoId(maxRetriesPhoto.getId())
                .userId(testUser.getId())
                .build();
        
        assertThatThrownBy(() -> retryUploadHandler.handle(command))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("exceeded maximum retry attempts");
    }
    
    @Test
    void testRetryUpload_NewPresignedUrlGenerated() {
        RetryUploadCommand command = RetryUploadCommand.builder()
                .photoId(failedPhoto.getId())
                .userId(testUser.getId())
                .build();
        
        RetryUploadResponse response1 = retryUploadHandler.handle(command);
        String url1 = response1.getUploadUrl();
        
        // Retry again (photo will be failed again, then retried)
        // First, mark it as failed again
        Photo photo = photoRepository.findById(failedPhoto.getId()).orElseThrow();
        photo.markAsFailed();
        photo = photoRepository.save(photo);
        
        RetryUploadResponse response2 = retryUploadHandler.handle(command);
        String url2 = response2.getUploadUrl();
        
        // URLs should be different (new presigned URL generated)
        assertThat(url1).isNotEqualTo(url2);
    }
    
    @Test
    void testRetryUpload_StatusTransition() {
        // Verify initial status
        assertThat(failedPhoto.getUploadStatus()).isEqualTo(PhotoStatus.FAILED);
        
        RetryUploadCommand command = RetryUploadCommand.builder()
                .photoId(failedPhoto.getId())
                .userId(testUser.getId())
                .build();
        
        retryUploadHandler.handle(command);
        
        // Verify status changed to UPLOADING
        Photo updatedPhoto = photoRepository.findById(failedPhoto.getId()).orElseThrow();
        assertThat(updatedPhoto.getUploadStatus()).isEqualTo(PhotoStatus.UPLOADING);
    }
}

