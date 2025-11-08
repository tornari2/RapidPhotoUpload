package com.rapidphoto.features.upload_photo;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rapidphoto.domain.Photo;
import com.rapidphoto.domain.PhotoStatus;
import com.rapidphoto.domain.UploadJob;
import com.rapidphoto.domain.UploadJobStatus;
import com.rapidphoto.domain.User;
import com.rapidphoto.features.upload_photo.dto.CreateUploadJobRequest;
import com.rapidphoto.features.upload_photo.dto.CreateUploadJobResponse;
import com.rapidphoto.features.upload_photo.repository.PhotoRepository;
import com.rapidphoto.features.upload_photo.repository.UploadJobRepository;
import com.rapidphoto.features.auth.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for upload job creation
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class CreateUploadJobIntegrationTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @Autowired
    private ObjectMapper objectMapper;
    
    @Autowired
    private CreateUploadJobHandler handler;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private UploadJobRepository uploadJobRepository;
    
    @Autowired
    private PhotoRepository photoRepository;
    
    private User testUser;
    
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
    }
    
    @Test
    void testCreateUploadJob_Success() throws Exception {
        // Prepare request
        CreateUploadJobRequest request = CreateUploadJobRequest.builder()
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
                                .build()
                ))
                .build();
        
        // Execute request
        String responseJson = mockMvc.perform(post("/api/upload-jobs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.jobId").exists())
                .andExpect(jsonPath("$.userId").value(testUser.getId().toString()))
                .andExpect(jsonPath("$.totalCount").value(2))
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"))
                .andExpect(jsonPath("$.photos").isArray())
                .andExpect(jsonPath("$.photos.length()").value(2))
                .andExpect(jsonPath("$.photos[0].photoId").exists())
                .andExpect(jsonPath("$.photos[0].filename").value("photo1.jpg"))
                .andExpect(jsonPath("$.photos[0].uploadUrl").exists())
                .andExpect(jsonPath("$.photos[0].s3Key").exists())
                .andExpect(jsonPath("$.photos[0].status").value("UPLOADING"))
                .andReturn()
                .getResponse()
                .getContentAsString();
        
        // Parse response
        CreateUploadJobResponse response = objectMapper.readValue(
                responseJson, CreateUploadJobResponse.class);
        
        // Verify database state
        UploadJob job = uploadJobRepository.findById(response.getJobId())
                .orElseThrow();
        assertThat(job.getUser().getId()).isEqualTo(testUser.getId());
        assertThat(job.getTotalCount()).isEqualTo(2);
        assertThat(job.getCompletedCount()).isEqualTo(0);
        assertThat(job.getFailedCount()).isEqualTo(0);
        assertThat(job.getStatus()).isEqualTo(UploadJobStatus.IN_PROGRESS);
        
        List<Photo> photos = photoRepository.findByUploadJobId(response.getJobId());
        assertThat(photos).hasSize(2);
        assertThat(photos).allMatch(p -> p.getUploadStatus() == PhotoStatus.UPLOADING);
        assertThat(photos).allMatch(p -> p.getUser().getId().equals(testUser.getId()));
        
        // Verify presigned URLs are generated
        assertThat(response.getPhotos()).allMatch(p -> p.getUploadUrl() != null && !p.getUploadUrl().isEmpty());
        assertThat(response.getPhotos()).allMatch(p -> p.getS3Key() != null && !p.getS3Key().isEmpty());
    }
    
    @Test
    void testCreateUploadJob_ValidationError_MissingUserId() throws Exception {
        CreateUploadJobRequest request = CreateUploadJobRequest.builder()
                .photos(List.of(
                        CreateUploadJobRequest.PhotoUploadRequest.builder()
                                .filename("photo1.jpg")
                                .fileSize(1024L)
                                .contentType("image/jpeg")
                                .build()
                ))
                .build();
        
        mockMvc.perform(post("/api/upload-jobs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }
    
    @Test
    void testCreateUploadJob_ValidationError_EmptyPhotos() throws Exception {
        CreateUploadJobRequest request = CreateUploadJobRequest.builder()
                .userId(testUser.getId())
                .photos(List.of())
                .build();
        
        mockMvc.perform(post("/api/upload-jobs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }
    
    @Test
    void testCreateUploadJob_ValidationError_InvalidFileSize() throws Exception {
        CreateUploadJobRequest request = CreateUploadJobRequest.builder()
                .userId(testUser.getId())
                .photos(List.of(
                        CreateUploadJobRequest.PhotoUploadRequest.builder()
                                .filename("photo1.jpg")
                                .fileSize(0L) // Invalid: too small
                                .contentType("image/jpeg")
                                .build()
                ))
                .build();
        
        mockMvc.perform(post("/api/upload-jobs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }
    
    @Test
    void testCreateUploadJob_ValidationError_InvalidContentType() throws Exception {
        CreateUploadJobRequest request = CreateUploadJobRequest.builder()
                .userId(testUser.getId())
                .photos(List.of(
                        CreateUploadJobRequest.PhotoUploadRequest.builder()
                                .filename("photo1.pdf")
                                .fileSize(1024L)
                                .contentType("application/pdf") // Invalid: not an image
                                .build()
                ))
                .build();
        
        mockMvc.perform(post("/api/upload-jobs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }
    
    @Test
    void testCreateUploadJob_UserNotFound() throws Exception {
        CreateUploadJobRequest request = CreateUploadJobRequest.builder()
                .userId(UUID.randomUUID()) // Non-existent user
                .photos(List.of(
                        CreateUploadJobRequest.PhotoUploadRequest.builder()
                                .filename("photo1.jpg")
                                .fileSize(1024L)
                                .contentType("image/jpeg")
                                .build()
                ))
                .build();
        
        mockMvc.perform(post("/api/upload-jobs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isInternalServerError());
    }
    
    @Test
    void testCreateUploadJob_MaxPhotosLimit() throws Exception {
        // Create request with 101 photos (exceeds max of 100)
        List<CreateUploadJobRequest.PhotoUploadRequest> photos = java.util.stream.IntStream.range(0, 101)
                .mapToObj(i -> CreateUploadJobRequest.PhotoUploadRequest.builder()
                        .filename("photo" + i + ".jpg")
                        .fileSize(1024L)
                        .contentType("image/jpeg")
                        .build())
                .toList();
        
        CreateUploadJobRequest request = CreateUploadJobRequest.builder()
                .userId(testUser.getId())
                .photos(photos)
                .build();
        
        mockMvc.perform(post("/api/upload-jobs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }
    
    @Test
    void testCreateUploadJob_HandlerDirectly() {
        // Test handler directly
        CreateUploadJobCommand command = CreateUploadJobCommand.builder()
                .user(testUser)
                .photos(List.of(
                        CreateUploadJobCommand.PhotoInfo.builder()
                                .filename("test.jpg")
                                .fileSize(1024L)
                                .contentType("image/jpeg")
                                .build()
                ))
                .build();
        
        CreateUploadJobResponse response = handler.handle(command);
        
        assertThat(response).isNotNull();
        assertThat(response.getJobId()).isNotNull();
        assertThat(response.getUserId()).isEqualTo(testUser.getId());
        assertThat(response.getTotalCount()).isEqualTo(1);
        assertThat(response.getPhotos()).hasSize(1);
        assertThat(response.getPhotos().get(0).getUploadUrl()).isNotEmpty();
    }
}

