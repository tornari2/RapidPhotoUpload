package com.rapidphoto.features.get_photos;

import com.rapidphoto.domain.Photo;
import com.rapidphoto.domain.PhotoStatus;
import com.rapidphoto.domain.UploadJob;
import com.rapidphoto.domain.UploadJobStatus;
import com.rapidphoto.domain.User;
import com.rapidphoto.features.get_photos.dto.GetUserPhotosResponse;
import com.rapidphoto.features.get_photos.dto.PhotoMetadataResponse;
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
 * Integration tests for photo query endpoints
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class GetPhotosIntegrationTest {
    
    @Autowired
    private GetUserPhotosHandler getUserPhotosHandler;
    
    @Autowired
    private GetPhotoMetadataHandler getPhotoMetadataHandler;
    
    @Autowired
    private PhotoRepository photoRepository;
    
    @Autowired
    private UploadJobRepository uploadJobRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    private User testUser;
    private User otherUser;
    private UploadJob testJob;
    private Photo completedPhoto;
    private Photo uploadingPhoto;
    private Photo failedPhoto;
    
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
        testJob = UploadJob.builder()
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
        
        // Create photo for other user
        Photo otherUserPhoto = Photo.builder()
                .user(otherUser)
                .filename("other.jpg")
                .s3Key("uploads/" + otherUser.getId() + "/" + UUID.randomUUID() + "-other.jpg")
                .fileSize(1024L)
                .contentType("image/jpeg")
                .uploadStatus(PhotoStatus.COMPLETED)
                .createdAt(LocalDateTime.now())
                .build();
        photoRepository.save(otherUserPhoto);
    }
    
    @Test
    void testGetUserPhotos_AllPhotos() {
        GetUserPhotosQuery query = GetUserPhotosQuery.builder()
                .userId(testUser.getId())
                .build();
        
        GetUserPhotosResponse response = getUserPhotosHandler.handle(query);
        
        assertThat(response).isNotNull();
        assertThat(response.getPhotos()).hasSize(3);
        assertThat(response.getTotalElements()).isEqualTo(3);
        assertThat(response.getPage()).isEqualTo(0);
        assertThat(response.getSize()).isEqualTo(20);
    }
    
    @Test
    void testGetUserPhotos_FilterByStatus() {
        GetUserPhotosQuery query = GetUserPhotosQuery.builder()
                .userId(testUser.getId())
                .status(PhotoStatus.COMPLETED)
                .build();
        
        GetUserPhotosResponse response = getUserPhotosHandler.handle(query);
        
        assertThat(response).isNotNull();
        assertThat(response.getPhotos()).hasSize(1);
        assertThat(response.getPhotos().get(0).getUploadStatus()).isEqualTo(PhotoStatus.COMPLETED);
        assertThat(response.getPhotos().get(0).getFilename()).isEqualTo("completed.jpg");
    }
    
    @Test
    void testGetUserPhotos_FilterByUploadJob() {
        GetUserPhotosQuery query = GetUserPhotosQuery.builder()
                .userId(testUser.getId())
                .uploadJobId(testJob.getId())
                .build();
        
        GetUserPhotosResponse response = getUserPhotosHandler.handle(query);
        
        assertThat(response).isNotNull();
        assertThat(response.getPhotos()).hasSize(3);
        assertThat(response.getPhotos()).allMatch(p -> p.getUploadJobId().equals(testJob.getId()));
    }
    
    @Test
    void testGetUserPhotos_FilterByStatusAndUploadJob() {
        GetUserPhotosQuery query = GetUserPhotosQuery.builder()
                .userId(testUser.getId())
                .status(PhotoStatus.FAILED)
                .uploadJobId(testJob.getId())
                .build();
        
        GetUserPhotosResponse response = getUserPhotosHandler.handle(query);
        
        assertThat(response).isNotNull();
        assertThat(response.getPhotos()).hasSize(1);
        assertThat(response.getPhotos().get(0).getUploadStatus()).isEqualTo(PhotoStatus.FAILED);
        assertThat(response.getPhotos().get(0).getFilename()).isEqualTo("failed.jpg");
    }
    
    @Test
    void testGetUserPhotos_Pagination() {
        GetUserPhotosQuery query = GetUserPhotosQuery.builder()
                .userId(testUser.getId())
                .page(0)
                .size(2)
                .build();
        
        GetUserPhotosResponse response = getUserPhotosHandler.handle(query);
        
        assertThat(response).isNotNull();
        assertThat(response.getPhotos()).hasSize(2);
        assertThat(response.getTotalElements()).isEqualTo(3);
        assertThat(response.getTotalPages()).isEqualTo(2);
        assertThat(response.isHasNext()).isTrue();
        assertThat(response.isHasPrevious()).isFalse();
    }
    
    @Test
    void testGetUserPhotos_SortByFilename() {
        GetUserPhotosQuery query = GetUserPhotosQuery.builder()
                .userId(testUser.getId())
                .sortBy("filename")
                .sortDirection("asc")
                .build();
        
        GetUserPhotosResponse response = getUserPhotosHandler.handle(query);
        
        assertThat(response).isNotNull();
        assertThat(response.getPhotos()).hasSize(3);
        // Should be sorted by filename ascending
        assertThat(response.getPhotos().get(0).getFilename()).isEqualTo("completed.jpg");
    }
    
    @Test
    void testGetUserPhotos_OtherUserPhotosNotIncluded() {
        GetUserPhotosQuery query = GetUserPhotosQuery.builder()
                .userId(testUser.getId())
                .build();
        
        GetUserPhotosResponse response = getUserPhotosHandler.handle(query);
        
        assertThat(response).isNotNull();
        assertThat(response.getPhotos()).hasSize(3);
        assertThat(response.getPhotos()).allMatch(p -> p.getUserId().equals(testUser.getId()));
    }
    
    @Test
    void testGetPhotoMetadata_Success() {
        GetPhotoMetadataQuery query = GetPhotoMetadataQuery.builder()
                .photoId(completedPhoto.getId())
                .userId(testUser.getId())
                .includeDownloadUrl(true)
                .includeTags(true)
                .build();
        
        PhotoMetadataResponse response = getPhotoMetadataHandler.handle(query);
        
        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(completedPhoto.getId());
        assertThat(response.getUserId()).isEqualTo(testUser.getId());
        assertThat(response.getFilename()).isEqualTo("completed.jpg");
        assertThat(response.getUploadStatus()).isEqualTo(PhotoStatus.COMPLETED);
        assertThat(response.getDownloadUrl()).isNotNull();
        assertThat(response.getTags()).isNotNull();
    }
    
    @Test
    void testGetPhotoMetadata_WithoutDownloadUrl() {
        GetPhotoMetadataQuery query = GetPhotoMetadataQuery.builder()
                .photoId(completedPhoto.getId())
                .userId(testUser.getId())
                .includeDownloadUrl(false)
                .includeTags(false)
                .build();
        
        PhotoMetadataResponse response = getPhotoMetadataHandler.handle(query);
        
        assertThat(response).isNotNull();
        assertThat(response.getDownloadUrl()).isNull();
        assertThat(response.getTags()).isNull();
    }
    
    @Test
    void testGetPhotoMetadata_PhotoNotFound() {
        GetPhotoMetadataQuery query = GetPhotoMetadataQuery.builder()
                .photoId(UUID.randomUUID())
                .userId(testUser.getId())
                .build();
        
        assertThatThrownBy(() -> getPhotoMetadataHandler.handle(query))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Photo not found or access denied");
    }
    
    @Test
    void testGetPhotoMetadata_AccessDenied() {
        GetPhotoMetadataQuery query = GetPhotoMetadataQuery.builder()
                .photoId(completedPhoto.getId())
                .userId(otherUser.getId()) // Different user
                .build();
        
        assertThatThrownBy(() -> getPhotoMetadataHandler.handle(query))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Photo not found or access denied");
    }
}

