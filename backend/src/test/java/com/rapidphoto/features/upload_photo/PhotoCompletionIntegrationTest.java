package com.rapidphoto.features.upload_photo;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rapidphoto.domain.Photo;
import com.rapidphoto.domain.PhotoStatus;
import com.rapidphoto.domain.UploadJob;
import com.rapidphoto.domain.UploadJobStatus;
import com.rapidphoto.domain.User;
import com.rapidphoto.features.upload_photo.dto.CompletePhotoUploadRequest;
import com.rapidphoto.features.upload_photo.dto.FailPhotoUploadRequest;
import com.rapidphoto.features.upload_photo.repository.PhotoRepository;
import com.rapidphoto.features.upload_photo.repository.UploadJobRepository;
import com.rapidphoto.features.auth.repository.UserRepository;
import com.rapidphoto.infrastructure.s3.S3Service;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for photo completion and failure workflows
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class PhotoCompletionIntegrationTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @Autowired
    private ObjectMapper objectMapper;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private UploadJobRepository uploadJobRepository;
    
    @Autowired
    private PhotoRepository photoRepository;
    
    @MockBean
    private S3Service s3Service;
    
    private User testUser;
    private UploadJob testJob;
    private Photo testPhoto;
    
    @BeforeEach
    void setUp() {
        // Clean up test data
        photoRepository.deleteAll();
        uploadJobRepository.deleteAll();
        userRepository.deleteAll();
        
        // Create test user
        testUser = User.builder()
                .username("testuser")
                .passwordHash("hashedpassword")
                .build();
        testUser = userRepository.save(testUser);
        
        // Create test upload job
        testJob = UploadJob.builder()
                .user(testUser)
                .totalCount(1)
                .completedCount(0)
                .failedCount(0)
                .status(UploadJobStatus.IN_PROGRESS)
                .build();
        testJob = uploadJobRepository.save(testJob);
        
        // Create test photo
        testPhoto = Photo.builder()
                .user(testUser)
                .uploadJob(testJob)
                .filename("test.jpg")
                .s3Key("uploads/" + testUser.getId() + "/" + UUID.randomUUID() + "-test.jpg")
                .fileSize(1024L)
                .contentType("image/jpeg")
                .uploadStatus(PhotoStatus.UPLOADING)
                .retryCount(0)
                .build();
        testPhoto = photoRepository.save(testPhoto);
    }
    
    @Test
    void testCompletePhotoUpload_Success() throws Exception {
        // Given - Mock S3 to return that file exists
        when(s3Service.fileExists(anyString())).thenReturn(true);
        
        CompletePhotoUploadRequest request = CompletePhotoUploadRequest.builder()
                .photoId(testPhoto.getId())
                .build();
        
        // When
        mockMvc.perform(post("/api/photos/{photoId}/complete", testPhoto.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Photo upload completed successfully"));
        
        // Then - Verify photo status updated
        Photo updatedPhoto = photoRepository.findById(testPhoto.getId())
                .orElseThrow();
        assertThat(updatedPhoto.getUploadStatus()).isEqualTo(PhotoStatus.COMPLETED);
        assertThat(updatedPhoto.getCompletedAt()).isNotNull();
        
        // Verify upload job updated
        UploadJob updatedJob = uploadJobRepository.findById(testJob.getId())
                .orElseThrow();
        assertThat(updatedJob.getCompletedCount()).isEqualTo(1);
        assertThat(updatedJob.getFailedCount()).isEqualTo(0);
        assertThat(updatedJob.getStatus()).isEqualTo(UploadJobStatus.COMPLETED);
    }
    
    @Test
    void testCompletePhotoUpload_FileNotInS3() throws Exception {
        // Given - Mock S3 to return that file does not exist
        when(s3Service.fileExists(anyString())).thenReturn(false);
        
        CompletePhotoUploadRequest request = CompletePhotoUploadRequest.builder()
                .photoId(testPhoto.getId())
                .build();
        
        // When
        mockMvc.perform(post("/api/photos/{photoId}/complete", testPhoto.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Photo completion failed"));
        
        // Then - Verify photo status not changed
        Photo updatedPhoto = photoRepository.findById(testPhoto.getId())
                .orElseThrow();
        assertThat(updatedPhoto.getUploadStatus()).isEqualTo(PhotoStatus.UPLOADING);
    }
    
    @Test
    void testCompletePhotoUpload_PhotoNotFound() throws Exception {
        // Given
        UUID nonExistentPhotoId = UUID.randomUUID();
        CompletePhotoUploadRequest request = CompletePhotoUploadRequest.builder()
                .photoId(nonExistentPhotoId)
                .build();
        
        // When
        mockMvc.perform(post("/api/upload-jobs/{photoId}/complete", nonExistentPhotoId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isInternalServerError());
    }
    
    @Test
    void testFailPhotoUpload_Success() throws Exception {
        // Given
        FailPhotoUploadRequest request = FailPhotoUploadRequest.builder()
                .photoId(testPhoto.getId())
                .errorMessage("Network error during upload")
                .build();
        
        // When
        mockMvc.perform(post("/api/photos/{photoId}/fail", testPhoto.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Photo upload failure recorded"));
        
        // Then - Verify photo status updated
        Photo updatedPhoto = photoRepository.findById(testPhoto.getId())
                .orElseThrow();
        assertThat(updatedPhoto.getUploadStatus()).isEqualTo(PhotoStatus.FAILED);
        assertThat(updatedPhoto.getRetryCount()).isEqualTo(1);
        
        // Verify upload job updated
        UploadJob updatedJob = uploadJobRepository.findById(testJob.getId())
                .orElseThrow();
        assertThat(updatedJob.getCompletedCount()).isEqualTo(0);
        assertThat(updatedJob.getFailedCount()).isEqualTo(1);
        assertThat(updatedJob.getStatus()).isEqualTo(UploadJobStatus.FAILED);
    }
    
    @Test
    void testFailPhotoUpload_MissingErrorMessage() throws Exception {
        // Given
        FailPhotoUploadRequest request = FailPhotoUploadRequest.builder()
                .photoId(testPhoto.getId())
                .errorMessage("") // Empty error message
                .build();
        
        // When
        mockMvc.perform(post("/api/photos/{photoId}/fail", testPhoto.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }
    
    @Test
    void testFailPhotoUpload_PhotoNotFound() throws Exception {
        // Given
        UUID nonExistentPhotoId = UUID.randomUUID();
        FailPhotoUploadRequest request = FailPhotoUploadRequest.builder()
                .photoId(nonExistentPhotoId)
                .errorMessage("Error message")
                .build();
        
        // When
        mockMvc.perform(post("/api/upload-jobs/{photoId}/fail", nonExistentPhotoId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isInternalServerError());
    }
    
    @Test
    void testCompletePhotoUpload_AlreadyCompleted() throws Exception {
        // Given - Mark photo as already completed
        testPhoto.markAsCompleted();
        testPhoto = photoRepository.save(testPhoto);
        when(s3Service.fileExists(anyString())).thenReturn(true);
        
        CompletePhotoUploadRequest request = CompletePhotoUploadRequest.builder()
                .photoId(testPhoto.getId())
                .build();
        
        // When - Should fail because photo is already completed
        mockMvc.perform(post("/api/upload-jobs/{photoId}/complete", testPhoto.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }
    
    @Test
    void testCompletePhotoUpload_WithoutRequestBody() throws Exception {
        // Given - Mock S3 to return that file exists
        when(s3Service.fileExists(anyString())).thenReturn(true);
        
        // When - Call endpoint without request body (photoId from path only)
        mockMvc.perform(post("/api/upload-jobs/{photoId}/complete", testPhoto.getId())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
        
        // Then - Verify photo status updated
        Photo updatedPhoto = photoRepository.findById(testPhoto.getId())
                .orElseThrow();
        assertThat(updatedPhoto.getUploadStatus()).isEqualTo(PhotoStatus.COMPLETED);
    }
}

