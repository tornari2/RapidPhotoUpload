package com.rapidphoto.features.upload_status;

import com.rapidphoto.domain.Photo;
import com.rapidphoto.domain.PhotoStatus;
import com.rapidphoto.domain.UploadJob;
import com.rapidphoto.domain.UploadJobStatus;
import com.rapidphoto.domain.User;
import com.rapidphoto.features.upload_photo.repository.PhotoRepository;
import com.rapidphoto.features.upload_photo.repository.UploadJobRepository;
import com.rapidphoto.features.auth.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration tests for SSE upload status service
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class UploadStatusIntegrationTest {
    
    @Autowired
    private UploadStatusService uploadStatusService;
    
    @Autowired
    private UploadJobRepository uploadJobRepository;
    
    @Autowired
    private PhotoRepository photoRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    private User testUser;
    private UploadJob testJob;
    private Photo testPhoto;
    
    @BeforeEach
    void setUp() {
        // Create test user
        testUser = User.builder()
                .username("test@example.com")
                .passwordHash("hashedPassword")
                .build();
        testUser = userRepository.save(testUser);
        
        // Create test upload job
        testJob = UploadJob.builder()
                .user(testUser)
                .totalCount(5)
                .completedCount(0)
                .failedCount(0)
                .status(UploadJobStatus.IN_PROGRESS)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
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
                .createdAt(LocalDateTime.now())
                .build();
        testPhoto = photoRepository.save(testPhoto);
    }
    
    @Test
    void testCreateSSEConnection() {
        UUID jobId = testJob.getId();
        String connectionId = UUID.randomUUID().toString();
        
        SseEmitter emitter = uploadStatusService.createConnection(jobId, connectionId);
        
        // Verify connection was created
        assertThat(emitter).isNotNull();
        assertThat(uploadStatusService.getConnectionCount(jobId)).isEqualTo(1);
    }
    
    @Test
    void testSSEConnectionWithGeneratedConnectionId() {
        UUID jobId = testJob.getId();
        String connectionId = UUID.randomUUID().toString();
        
        SseEmitter emitter = uploadStatusService.createConnection(jobId, connectionId);
        
        // Verify connection was created
        assertThat(emitter).isNotNull();
        assertThat(uploadStatusService.getConnectionCount(jobId)).isEqualTo(1);
    }
    
    @Test
    void testEmitPhotoCompletedEvent() throws Exception {
        UUID jobId = testJob.getId();
        String connectionId = UUID.randomUUID().toString();
        
        // Create connection
        uploadStatusService.createConnection(jobId, connectionId);
        assertThat(uploadStatusService.getConnectionCount(jobId)).isEqualTo(1);
        
        // Emit photo completed event
        UploadStatusEvent event = UploadStatusEvent.builder()
                .eventType("photo_completed")
                .photoId(testPhoto.getId())
                .jobId(jobId)
                .photoStatus(PhotoStatus.COMPLETED.name())
                .jobStatus(UploadJobStatus.IN_PROGRESS.name())
                .progress(20.0)
                .completedCount(1)
                .failedCount(0)
                .totalCount(5)
                .timestamp(LocalDateTime.now())
                .build();
        
        uploadStatusService.emitEvent(jobId, event);
        
        // Connection should still be active
        assertThat(uploadStatusService.getConnectionCount(jobId)).isEqualTo(1);
    }
    
    @Test
    void testEmitPhotoFailedEvent() throws Exception {
        UUID jobId = testJob.getId();
        String connectionId = UUID.randomUUID().toString();
        
        // Create connection
        uploadStatusService.createConnection(jobId, connectionId);
        
        // Emit photo failed event
        UploadStatusEvent event = UploadStatusEvent.builder()
                .eventType("photo_failed")
                .photoId(testPhoto.getId())
                .jobId(jobId)
                .photoStatus(PhotoStatus.FAILED.name())
                .jobStatus(UploadJobStatus.IN_PROGRESS.name())
                .progress(20.0)
                .completedCount(0)
                .failedCount(1)
                .totalCount(5)
                .errorMessage("Upload failed")
                .timestamp(LocalDateTime.now())
                .build();
        
        uploadStatusService.emitEvent(jobId, event);
        
        // Connection should still be active
        assertThat(uploadStatusService.getConnectionCount(jobId)).isEqualTo(1);
    }
    
    @Test
    void testMultipleConnectionsForSameJob() throws Exception {
        UUID jobId = testJob.getId();
        
        // Create multiple connections
        uploadStatusService.createConnection(jobId, "conn1");
        uploadStatusService.createConnection(jobId, "conn2");
        uploadStatusService.createConnection(jobId, "conn3");
        
        assertThat(uploadStatusService.getConnectionCount(jobId)).isEqualTo(3);
        
        // Emit event - should go to all connections
        UploadStatusEvent event = UploadStatusEvent.builder()
                .eventType("photo_completed")
                .photoId(testPhoto.getId())
                .jobId(jobId)
                .photoStatus(PhotoStatus.COMPLETED.name())
                .jobStatus(UploadJobStatus.IN_PROGRESS.name())
                .progress(20.0)
                .completedCount(1)
                .failedCount(0)
                .totalCount(5)
                .timestamp(LocalDateTime.now())
                .build();
        
        uploadStatusService.emitEvent(jobId, event);
        
        // All connections should still be active
        assertThat(uploadStatusService.getConnectionCount(jobId)).isEqualTo(3);
    }
    
    @Test
    void testReconnectionWithSameConnectionId() throws Exception {
        UUID jobId = testJob.getId();
        String connectionId = "reconnect-test";
        
        // Create initial connection
        SseEmitter emitter1 = uploadStatusService.createConnection(jobId, connectionId);
        assertThat(uploadStatusService.getConnectionCount(jobId)).isEqualTo(1);
        
        // Simulate disconnection by completing the emitter
        emitter1.complete();
        
        // Wait a bit for cleanup
        Thread.sleep(100);
        
        // Reconnect with same connection ID
        SseEmitter emitter2 = uploadStatusService.createConnection(jobId, connectionId);
        assertThat(uploadStatusService.getConnectionCount(jobId)).isEqualTo(1);
        
        // Verify new connection works
        UploadStatusEvent event = UploadStatusEvent.builder()
                .eventType("photo_completed")
                .photoId(testPhoto.getId())
                .jobId(jobId)
                .photoStatus(PhotoStatus.COMPLETED.name())
                .jobStatus(UploadJobStatus.IN_PROGRESS.name())
                .progress(20.0)
                .completedCount(1)
                .failedCount(0)
                .totalCount(5)
                .timestamp(LocalDateTime.now())
                .build();
        
        uploadStatusService.emitEvent(jobId, event);
    }
    
    @Test
    void testCloseAllConnections() throws Exception {
        UUID jobId = testJob.getId();
        
        // Create multiple connections
        uploadStatusService.createConnection(jobId, "conn1");
        uploadStatusService.createConnection(jobId, "conn2");
        assertThat(uploadStatusService.getConnectionCount(jobId)).isEqualTo(2);
        
        // Close all connections
        uploadStatusService.closeAllConnections(jobId);
        
        // Verify all connections are closed
        assertThat(uploadStatusService.getConnectionCount(jobId)).isEqualTo(0);
    }
    
    @Test
    void testEmitEventWithNoConnections() throws Exception {
        UUID jobId = testJob.getId();
        
        // Emit event when no connections exist
        UploadStatusEvent event = UploadStatusEvent.builder()
                .eventType("photo_completed")
                .photoId(testPhoto.getId())
                .jobId(jobId)
                .photoStatus(PhotoStatus.COMPLETED.name())
                .jobStatus(UploadJobStatus.IN_PROGRESS.name())
                .progress(20.0)
                .completedCount(1)
                .failedCount(0)
                .totalCount(5)
                .timestamp(LocalDateTime.now())
                .build();
        
        // Should not throw exception
        uploadStatusService.emitEvent(jobId, event);
        
        // No connections should exist
        assertThat(uploadStatusService.getConnectionCount(jobId)).isEqualTo(0);
    }
}

