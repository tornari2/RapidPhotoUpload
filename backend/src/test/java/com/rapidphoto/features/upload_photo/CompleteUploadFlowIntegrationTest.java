package com.rapidphoto.features.upload_photo;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rapidphoto.domain.Photo;
import com.rapidphoto.domain.PhotoStatus;
import com.rapidphoto.domain.UploadJob;
import com.rapidphoto.domain.UploadJobStatus;
import com.rapidphoto.domain.User;
import com.rapidphoto.features.upload_photo.dto.CompletePhotoUploadRequest;
import com.rapidphoto.features.upload_photo.dto.CreateUploadJobRequest;
import com.rapidphoto.features.upload_photo.dto.CreateUploadJobResponse;
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

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * End-to-End Integration Test for Complete Photo Upload Flow
 * 
 * Tests the entire upload process:
 * 1. Client creates upload job (POST /api/upload-jobs)
 * 2. Backend generates presigned URLs and stores metadata
 * 3. Client uploads to S3 using presigned URL (simulated)
 * 4. Client notifies backend of completion (POST /api/photos/{id}/complete)
 * 5. Backend verifies S3 upload and marks photo as COMPLETED
 * 6. Client retrieves photo via download URL (GET /api/photos/{id}/download)
 * 7. Verify data persistence and state consistency
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class CompleteUploadFlowIntegrationTest {
    
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
    
    @BeforeEach
    void setUp() {
        // Clean up test data
        photoRepository.deleteAll();
        uploadJobRepository.deleteAll();
        userRepository.deleteAll();
        
        // Create test user
        testUser = User.builder()
                .username("integrationtestuser")
                .passwordHash("hashedpassword")
                .build();
        testUser = userRepository.save(testUser);
    }
    
    @Test
    void testCompleteUploadFlow_SinglePhoto_Success() throws Exception {
        // Mock S3 service responses
        when(s3Service.fileExists(anyString())).thenReturn(true);
        
        // ==========================================
        // STEP 1: Create Upload Job
        // ==========================================
        CreateUploadJobRequest createRequest = CreateUploadJobRequest.builder()
                .userId(testUser.getId())
                .photos(List.of(
                        CreateUploadJobRequest.PhotoUploadRequest.builder()
                                .filename("test-photo.jpg")
                                .fileSize(1024L)
                                .contentType("image/jpeg")
                                .build()
                ))
                .build();
        
        String createResponseJson = mockMvc.perform(post("/api/upload-jobs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.jobId").exists())
                .andExpect(jsonPath("$.photos[0].photoId").exists())
                .andExpect(jsonPath("$.photos[0].uploadUrl").exists())
                .andExpect(jsonPath("$.photos[0].s3Key").exists())
                .andReturn()
                .getResponse()
                .getContentAsString();
        
        CreateUploadJobResponse createResponse = objectMapper.readValue(
                createResponseJson, CreateUploadJobResponse.class);
        
        UUID jobId = createResponse.getJobId();
        UUID photoId = createResponse.getPhotos().get(0).getPhotoId();
        String uploadUrl = createResponse.getPhotos().get(0).getUploadUrl();
        String s3Key = createResponse.getPhotos().get(0).getS3Key();
        
        // Verify initial database state
        Photo photoBeforeUpload = photoRepository.findById(photoId).orElseThrow();
        assertThat(photoBeforeUpload.getUploadStatus()).isEqualTo(PhotoStatus.UPLOADING);
        assertThat(photoBeforeUpload.getS3Key()).isEqualTo(s3Key);
        
        UploadJob jobBeforeUpload = uploadJobRepository.findById(jobId).orElseThrow();
        assertThat(jobBeforeUpload.getStatus()).isEqualTo(UploadJobStatus.IN_PROGRESS);
        assertThat(jobBeforeUpload.getCompletedCount()).isEqualTo(0);
        
        // ==========================================
        // STEP 2: Upload to S3 (Simulated with Mock)
        // ==========================================
        // In a real scenario, the client would upload using the presigned URL
        // For testing, we mock the S3 service to say the file exists
        assertThat(uploadUrl).isNotEmpty();
        assertThat(s3Key).startsWith("uploads/");
        
        // ==========================================
        // STEP 3: Notify Backend of Upload Completion
        // ==========================================
        CompletePhotoUploadRequest completeRequest = CompletePhotoUploadRequest.builder()
                .photoId(photoId)
                .build();
        
        mockMvc.perform(post("/api/photos/" + photoId + "/complete")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(completeRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.photoId").value(photoId.toString()))
                .andExpect(jsonPath("$.status").value("COMPLETED"));
        
        // ==========================================
        // STEP 4: Verify Database State After Completion
        // ==========================================
        Photo photoAfterUpload = photoRepository.findById(photoId).orElseThrow();
        assertThat(photoAfterUpload.getUploadStatus()).isEqualTo(PhotoStatus.COMPLETED);
        assertThat(photoAfterUpload.getS3Key()).isEqualTo(s3Key);
        assertThat(photoAfterUpload.getUploadJob().getId()).isEqualTo(jobId);
        assertThat(photoAfterUpload.getCompletedAt()).isNotNull();
        
        UploadJob jobAfterUpload = uploadJobRepository.findById(jobId).orElseThrow();
        assertThat(jobAfterUpload.getStatus()).isEqualTo(UploadJobStatus.COMPLETED);
        assertThat(jobAfterUpload.getCompletedCount()).isEqualTo(1);
        assertThat(jobAfterUpload.getFailedCount()).isEqualTo(0);
        
        // ==========================================
        // STEP 5: Retrieve Photo via Download URL
        // ==========================================
        String downloadResponseJson = mockMvc.perform(
                        get("/api/photos/" + photoId + "/download")
                                .param("userId", testUser.getId().toString())
                                .param("expirationMinutes", "60"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.downloadUrl").exists())
                .andExpect(jsonPath("$.filename").value("test-photo.jpg"))
                .andReturn()
                .getResponse()
                .getContentAsString();
        
        // ==========================================
        // STEP 6: Verify Complete Data Persistence
        // ==========================================
        // Verify photo can be queried
        List<Photo> userPhotos = photoRepository.findByUserId(testUser.getId());
        assertThat(userPhotos).hasSize(1);
        assertThat(userPhotos.get(0).getId()).isEqualTo(photoId);
        assertThat(userPhotos.get(0).getUploadStatus()).isEqualTo(PhotoStatus.COMPLETED);
    }
    
    @Test
    void testCompleteUploadFlow_MultiplePhotos_Success() throws Exception {
        // Mock S3 service
        when(s3Service.fileExists(anyString())).thenReturn(true);
        
        // ==========================================
        // STEP 1: Create Upload Job with Multiple Photos
        // ==========================================
        CreateUploadJobRequest createRequest = CreateUploadJobRequest.builder()
                .userId(testUser.getId())
                .photos(List.of(
                        CreateUploadJobRequest.PhotoUploadRequest.builder()
                                .filename("photo1.jpg")
                                .fileSize(1024L)
                                .contentType("image/jpeg")
                                .build(),
                        CreateUploadJobRequest.PhotoUploadRequest.builder()
                                .filename("photo2.png")
                                .fileSize(2048L)
                                .contentType("image/png")
                                .build(),
                        CreateUploadJobRequest.PhotoUploadRequest.builder()
                                .filename("photo3.jpg")
                                .fileSize(3072L)
                                .contentType("image/jpeg")
                                .build()
                ))
                .build();
        
        String createResponseJson = mockMvc.perform(post("/api/upload-jobs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.totalCount").value(3))
                .andReturn()
                .getResponse()
                .getContentAsString();
        
        CreateUploadJobResponse createResponse = objectMapper.readValue(
                createResponseJson, CreateUploadJobResponse.class);
        
        UUID jobId = createResponse.getJobId();
        
        // ==========================================
        // STEP 2: Complete All Photos
        // ==========================================
        for (CreateUploadJobResponse.PhotoUploadResponse photoInfo : createResponse.getPhotos()) {
            // Notify backend
            CompletePhotoUploadRequest completeRequest = CompletePhotoUploadRequest.builder()
                    .photoId(photoInfo.getPhotoId())
                    .build();
            
            mockMvc.perform(post("/api/photos/" + photoInfo.getPhotoId() + "/complete")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(completeRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }
        
        // ==========================================
        // STEP 3: Verify All Photos Completed
        // ==========================================
        UploadJob finalJob = uploadJobRepository.findById(jobId).orElseThrow();
        assertThat(finalJob.getStatus()).isEqualTo(UploadJobStatus.COMPLETED);
        assertThat(finalJob.getTotalCount()).isEqualTo(3);
        assertThat(finalJob.getCompletedCount()).isEqualTo(3);
        assertThat(finalJob.getFailedCount()).isEqualTo(0);
        
        List<Photo> allPhotos = photoRepository.findByUploadJobId(jobId);
        assertThat(allPhotos).hasSize(3);
        assertThat(allPhotos).allMatch(p -> p.getUploadStatus() == PhotoStatus.COMPLETED);
        
        // ==========================================
        // STEP 4: Verify All Photos Can Be Downloaded
        // ==========================================
        for (CreateUploadJobResponse.PhotoUploadResponse photoInfo : createResponse.getPhotos()) {
            mockMvc.perform(
                            get("/api/photos/" + photoInfo.getPhotoId() + "/download")
                                    .param("userId", testUser.getId().toString()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.downloadUrl").exists());
        }
    }
    
    @Test
    void testCompleteUploadFlow_PartialFailure() throws Exception {
        // Mock S3 service
        when(s3Service.fileExists(anyString())).thenReturn(true);
        
        // ==========================================
        // STEP 1: Create Upload Job with 3 Photos
        // ==========================================
        CreateUploadJobRequest createRequest = CreateUploadJobRequest.builder()
                .userId(testUser.getId())
                .photos(List.of(
                        CreateUploadJobRequest.PhotoUploadRequest.builder()
                                .filename("success1.jpg")
                                .fileSize(1024L)
                                .contentType("image/jpeg")
                                .build(),
                        CreateUploadJobRequest.PhotoUploadRequest.builder()
                                .filename("failure.jpg")
                                .fileSize(2048L)
                                .contentType("image/jpeg")
                                .build(),
                        CreateUploadJobRequest.PhotoUploadRequest.builder()
                                .filename("success2.jpg")
                                .fileSize(3072L)
                                .contentType("image/jpeg")
                                .build()
                ))
                .build();
        
        String createResponseJson = mockMvc.perform(post("/api/upload-jobs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        
        CreateUploadJobResponse createResponse = objectMapper.readValue(
                createResponseJson, CreateUploadJobResponse.class);
        
        UUID jobId = createResponse.getJobId();
        
        // ==========================================
        // STEP 2: Complete Two Photos Successfully, Fail One
        // ==========================================
        // Success 1
        UUID photo1Id = createResponse.getPhotos().get(0).getPhotoId();
        
        mockMvc.perform(post("/api/photos/" + photo1Id + "/complete")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                CompletePhotoUploadRequest.builder().photoId(photo1Id).build())))
                .andExpect(status().isOk());
        
        // Failure
        UUID photo2Id = createResponse.getPhotos().get(1).getPhotoId();
        mockMvc.perform(post("/api/photos/" + photo2Id + "/fail")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                "{\"photoId\":\"" + photo2Id + "\",\"errorMessage\":\"Simulated upload failure\"}")))
                .andExpect(status().isOk());
        
        // Success 2
        UUID photo3Id = createResponse.getPhotos().get(2).getPhotoId();
        
        mockMvc.perform(post("/api/photos/" + photo3Id + "/complete")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                CompletePhotoUploadRequest.builder().photoId(photo3Id).build())))
                .andExpect(status().isOk());
        
        // ==========================================
        // STEP 3: Verify Job State
        // ==========================================
        UploadJob finalJob = uploadJobRepository.findById(jobId).orElseThrow();
        assertThat(finalJob.getStatus()).isEqualTo(UploadJobStatus.FAILED);
        assertThat(finalJob.getTotalCount()).isEqualTo(3);
        assertThat(finalJob.getCompletedCount()).isEqualTo(2);
        assertThat(finalJob.getFailedCount()).isEqualTo(1);
        
        // Verify individual photo states
        Photo successPhoto1 = photoRepository.findById(photo1Id).orElseThrow();
        assertThat(successPhoto1.getUploadStatus()).isEqualTo(PhotoStatus.COMPLETED);
        
        Photo failedPhoto = photoRepository.findById(photo2Id).orElseThrow();
        assertThat(failedPhoto.getUploadStatus()).isEqualTo(PhotoStatus.FAILED);
        
        Photo successPhoto2 = photoRepository.findById(photo3Id).orElseThrow();
        assertThat(successPhoto2.getUploadStatus()).isEqualTo(PhotoStatus.COMPLETED);
    }
    
    @Test
    void testCompleteUploadFlow_S3VerificationFailure() throws Exception {
        // ==========================================
        // STEP 1: Create Upload Job
        // ==========================================
        CreateUploadJobRequest createRequest = CreateUploadJobRequest.builder()
                .userId(testUser.getId())
                .photos(List.of(
                        CreateUploadJobRequest.PhotoUploadRequest.builder()
                                .filename("test.jpg")
                                .fileSize(1024L)
                                .contentType("image/jpeg")
                                .build()
                ))
                .build();
        
        String createResponseJson = mockMvc.perform(post("/api/upload-jobs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        
        CreateUploadJobResponse createResponse = objectMapper.readValue(
                createResponseJson, CreateUploadJobResponse.class);
        
        UUID photoId = createResponse.getPhotos().get(0).getPhotoId();
        
        // ==========================================
        // STEP 2: Try to Complete WITHOUT Uploading to S3
        // ==========================================
        // Mock S3 to return that file does NOT exist
        when(s3Service.fileExists(anyString())).thenReturn(false);
        
        CompletePhotoUploadRequest completeRequest = CompletePhotoUploadRequest.builder()
                .photoId(photoId)
                .build();
        
        mockMvc.perform(post("/api/photos/" + photoId + "/complete")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(completeRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").exists());
        
        // ==========================================
        // STEP 3: Verify Photo Remains in UPLOADING State
        // ==========================================
        Photo photo = photoRepository.findById(photoId).orElseThrow();
        assertThat(photo.getUploadStatus()).isEqualTo(PhotoStatus.UPLOADING);
    }
    
    @Test
    void testCompleteUploadFlow_DataPersistenceVerification() throws Exception {
        // Mock S3 service
        when(s3Service.fileExists(anyString())).thenReturn(true);
        
        // ==========================================
        // STEP 1: Create and Complete Upload
        // ==========================================
        CreateUploadJobRequest createRequest = CreateUploadJobRequest.builder()
                .userId(testUser.getId())
                .photos(List.of(
                        CreateUploadJobRequest.PhotoUploadRequest.builder()
                                .filename("persistence-test.jpg")
                                .fileSize(5120L)
                                .contentType("image/jpeg")
                                .build()
                ))
                .build();
        
        String createResponseJson = mockMvc.perform(post("/api/upload-jobs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        
        CreateUploadJobResponse createResponse = objectMapper.readValue(
                createResponseJson, CreateUploadJobResponse.class);
        
        UUID jobId = createResponse.getJobId();
        UUID photoId = createResponse.getPhotos().get(0).getPhotoId();
        String s3Key = createResponse.getPhotos().get(0).getS3Key();
        
        // Complete upload
        mockMvc.perform(post("/api/photos/" + photoId + "/complete")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                CompletePhotoUploadRequest.builder().photoId(photoId).build())))
                .andExpect(status().isOk());
        
        // ==========================================
        // STEP 2: Verify Complete Data Model
        // ==========================================
        Photo photo = photoRepository.findById(photoId).orElseThrow();
        
        // Verify all photo fields
        assertThat(photo.getId()).isEqualTo(photoId);
        assertThat(photo.getFilename()).isEqualTo("persistence-test.jpg");
        assertThat(photo.getS3Key()).isEqualTo(s3Key);
        assertThat(photo.getUploadStatus()).isEqualTo(PhotoStatus.COMPLETED);
        assertThat(photo.getFileSize()).isEqualTo(5120L);
        assertThat(photo.getContentType()).isEqualTo("image/jpeg");
        assertThat(photo.getCreatedAt()).isNotNull();
        assertThat(photo.getCompletedAt()).isNotNull();
        
        // Verify relationships
        assertThat(photo.getUser()).isNotNull();
        assertThat(photo.getUser().getId()).isEqualTo(testUser.getId());
        assertThat(photo.getUploadJob()).isNotNull();
        assertThat(photo.getUploadJob().getId()).isEqualTo(jobId);
        
        // Verify job data
        UploadJob job = uploadJobRepository.findById(jobId).orElseThrow();
        assertThat(job.getUser().getId()).isEqualTo(testUser.getId());
        assertThat(job.getStatus()).isEqualTo(UploadJobStatus.COMPLETED);
        assertThat(job.getCompletedCount()).isEqualTo(1);
        assertThat(job.getCreatedAt()).isNotNull();
    }
}

