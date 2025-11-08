package com.rapidphoto.features.download_photo;

import com.rapidphoto.domain.Photo;
import com.rapidphoto.domain.PhotoStatus;
import com.rapidphoto.domain.UploadJob;
import com.rapidphoto.domain.UploadJobStatus;
import com.rapidphoto.domain.User;
import com.rapidphoto.features.download_photo.dto.DownloadPhotoResponse;
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
 * Integration tests for photo download functionality
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class DownloadPhotoIntegrationTest {
    
    @Autowired
    private DownloadPhotoHandler downloadPhotoHandler;
    
    @Autowired
    private PhotoRepository photoRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private UploadJobRepository uploadJobRepository;
    
    private User testUser;
    private User otherUser;
    private Photo completedPhoto;
    private Photo uploadingPhoto;
    private Photo failedPhoto;
    private Photo otherUserPhoto;
    
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
                .totalCount(3)
                .completedCount(1)
                .failedCount(1)
                .status(UploadJobStatus.PARTIAL_SUCCESS)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        testJob = uploadJobRepository.save(testJob);
        
        // Create test photos
        completedPhoto = Photo.builder()
                .user(testUser)
                .uploadJob(testJob)
                .filename("completed.jpg")
                .s3Key("uploads/" + testUser.getId() + "/" + UUID.randomUUID() + "-completed.jpg")
                .fileSize(1024L)
                .contentType("image/jpeg")
                .uploadStatus(PhotoStatus.COMPLETED)
                .completedAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now().minusHours(1))
                .build();
        completedPhoto = photoRepository.save(completedPhoto);
        
        uploadingPhoto = Photo.builder()
                .user(testUser)
                .uploadJob(testJob)
                .filename("uploading.jpg")
                .s3Key("uploads/" + testUser.getId() + "/" + UUID.randomUUID() + "-uploading.jpg")
                .fileSize(2048L)
                .contentType("image/jpeg")
                .uploadStatus(PhotoStatus.UPLOADING)
                .createdAt(LocalDateTime.now())
                .build();
        uploadingPhoto = photoRepository.save(uploadingPhoto);
        
        failedPhoto = Photo.builder()
                .user(testUser)
                .uploadJob(testJob)
                .filename("failed.jpg")
                .s3Key("uploads/" + testUser.getId() + "/" + UUID.randomUUID() + "-failed.jpg")
                .fileSize(512L)
                .contentType("image/jpeg")
                .uploadStatus(PhotoStatus.FAILED)
                .retryCount(1)
                .createdAt(LocalDateTime.now().minusMinutes(30))
                .build();
        failedPhoto = photoRepository.save(failedPhoto);
        
        otherUserPhoto = Photo.builder()
                .user(otherUser)
                .filename("other.jpg")
                .s3Key("uploads/" + otherUser.getId() + "/" + UUID.randomUUID() + "-other.jpg")
                .fileSize(1024L)
                .contentType("image/jpeg")
                .uploadStatus(PhotoStatus.COMPLETED)
                .completedAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .build();
        otherUserPhoto = photoRepository.save(otherUserPhoto);
    }
    
    @Test
    void testDownloadPhoto_Success() {
        DownloadPhotoQuery query = DownloadPhotoQuery.builder()
                .photoId(completedPhoto.getId())
                .userId(testUser.getId())
                .build();
        
        DownloadPhotoResponse response = downloadPhotoHandler.handle(query);
        
        assertThat(response).isNotNull();
        assertThat(response.getPhotoId()).isEqualTo(completedPhoto.getId());
        assertThat(response.getDownloadUrl()).isNotNull();
        assertThat(response.getDownloadUrl()).isNotBlank();
        assertThat(response.getFilename()).isEqualTo("completed.jpg");
        assertThat(response.getContentType()).isEqualTo("image/jpeg");
        assertThat(response.getFileSize()).isEqualTo(1024L);
        assertThat(response.getExpirationMinutes()).isNotNull();
        assertThat(response.getExpirationMinutes()).isBetween(1, 60);
    }
    
    @Test
    void testDownloadPhoto_WithCustomExpiration() {
        DownloadPhotoQuery query = DownloadPhotoQuery.builder()
                .photoId(completedPhoto.getId())
                .userId(testUser.getId())
                .expirationMinutes(30)
                .build();
        
        DownloadPhotoResponse response = downloadPhotoHandler.handle(query);
        
        assertThat(response).isNotNull();
        assertThat(response.getExpirationMinutes()).isEqualTo(30);
        assertThat(response.getDownloadUrl()).isNotNull();
    }
    
    @Test
    void testDownloadPhoto_ExpirationClampedToMinimum() {
        DownloadPhotoQuery query = DownloadPhotoQuery.builder()
                .photoId(completedPhoto.getId())
                .userId(testUser.getId())
                .expirationMinutes(0) // Should be clamped to 1
                .build();
        
        DownloadPhotoResponse response = downloadPhotoHandler.handle(query);
        
        assertThat(response).isNotNull();
        assertThat(response.getExpirationMinutes()).isEqualTo(1);
    }
    
    @Test
    void testDownloadPhoto_ExpirationClampedToMaximum() {
        DownloadPhotoQuery query = DownloadPhotoQuery.builder()
                .photoId(completedPhoto.getId())
                .userId(testUser.getId())
                .expirationMinutes(120) // Should be clamped to 60
                .build();
        
        DownloadPhotoResponse response = downloadPhotoHandler.handle(query);
        
        assertThat(response).isNotNull();
        assertThat(response.getExpirationMinutes()).isEqualTo(60);
    }
    
    @Test
    void testDownloadPhoto_PhotoNotFound() {
        DownloadPhotoQuery query = DownloadPhotoQuery.builder()
                .photoId(UUID.randomUUID())
                .userId(testUser.getId())
                .build();
        
        assertThatThrownBy(() -> downloadPhotoHandler.handle(query))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Photo not found or access denied");
    }
    
    @Test
    void testDownloadPhoto_AccessDenied() {
        DownloadPhotoQuery query = DownloadPhotoQuery.builder()
                .photoId(otherUserPhoto.getId())
                .userId(testUser.getId()) // Different user
                .build();
        
        assertThatThrownBy(() -> downloadPhotoHandler.handle(query))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Photo not found or access denied");
    }
    
    @Test
    void testDownloadPhoto_PhotoNotCompleted() {
        // Try to download uploading photo
        DownloadPhotoQuery query1 = DownloadPhotoQuery.builder()
                .photoId(uploadingPhoto.getId())
                .userId(testUser.getId())
                .build();
        
        assertThatThrownBy(() -> downloadPhotoHandler.handle(query1))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Photo is not completed");
        
        // Try to download failed photo
        DownloadPhotoQuery query2 = DownloadPhotoQuery.builder()
                .photoId(failedPhoto.getId())
                .userId(testUser.getId())
                .build();
        
        assertThatThrownBy(() -> downloadPhotoHandler.handle(query2))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Photo is not completed");
    }
    
    @Test
    void testDownloadPhoto_DownloadUrlIsValid() {
        DownloadPhotoQuery query = DownloadPhotoQuery.builder()
                .photoId(completedPhoto.getId())
                .userId(testUser.getId())
                .build();
        
        DownloadPhotoResponse response = downloadPhotoHandler.handle(query);
        
        // Verify URL is a valid HTTP/HTTPS URL
        assertThat(response.getDownloadUrl()).satisfies(url -> 
            assertThat(url).satisfiesAnyOf(
                u -> assertThat(u).startsWith("http://"),
                u -> assertThat(u).startsWith("https://")
            )
        );
        assertThat(response.getDownloadUrl()).satisfies(url ->
            assertThat(url).satisfiesAnyOf(
                u -> assertThat(u).contains("amazonaws.com"),
                u -> assertThat(u).contains("s3")
            )
        );
    }
}

