package com.rapidphoto.domain;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class UploadJobTest {
    
    private User user;
    private UploadJob uploadJob;
    
    @BeforeEach
    void setUp() {
        user = User.builder()
                .id(UUID.randomUUID())
                .username("testuser")
                .passwordHash("hash")
                .build();
        
        uploadJob = UploadJob.builder()
                .user(user)
                .totalCount(100)
                .build();
    }
    
    @Test
    void testUploadJobCreation() {
        assertNotNull(uploadJob);
        assertEquals(100, uploadJob.getTotalCount());
        assertEquals(0, uploadJob.getCompletedCount());
        assertEquals(0, uploadJob.getFailedCount());
        // Status is set by @PrePersist, so call onCreate to simulate persistence
        uploadJob.onCreate();
        assertEquals(UploadJobStatus.IN_PROGRESS, uploadJob.getStatus());
    }
    
    @Test
    void testIncrementCompleted_UpdatesStatusToCompleted() {
        uploadJob.setTotalCount(5);
        for (int i = 0; i < 5; i++) {
            uploadJob.incrementCompleted();
        }
        assertEquals(5, uploadJob.getCompletedCount());
        assertEquals(UploadJobStatus.COMPLETED, uploadJob.getStatus());
    }
    
    @Test
    void testIncrementFailed_UpdatesStatusToFailed() {
        uploadJob.setTotalCount(5);
        for (int i = 0; i < 5; i++) {
            uploadJob.incrementFailed();
        }
        assertEquals(5, uploadJob.getFailedCount());
        assertEquals(UploadJobStatus.FAILED, uploadJob.getStatus());
    }
    
    @Test
    void testIncrementCompleted_UpdatesStatusToPartialSuccess() {
        uploadJob.setTotalCount(10);
        uploadJob.incrementCompleted();
        uploadJob.incrementFailed();
        assertEquals(1, uploadJob.getCompletedCount());
        assertEquals(1, uploadJob.getFailedCount());
        assertEquals(UploadJobStatus.PARTIAL_SUCCESS, uploadJob.getStatus());
    }
    
    @Test
    void testIsComplete_WithCompletedStatus() {
        uploadJob.setTotalCount(5);
        uploadJob.setCompletedCount(5);
        uploadJob.setStatus(UploadJobStatus.COMPLETED);
        assertTrue(uploadJob.isComplete());
    }
    
    @Test
    void testIsComplete_WithFailedStatus() {
        uploadJob.setTotalCount(5);
        uploadJob.setFailedCount(5);
        uploadJob.setStatus(UploadJobStatus.FAILED);
        assertTrue(uploadJob.isComplete());
    }
    
    @Test
    void testIsComplete_WithAllCountsMatchingTotal() {
        uploadJob.setTotalCount(10);
        uploadJob.setCompletedCount(7);
        uploadJob.setFailedCount(3);
        assertTrue(uploadJob.isComplete());
    }
    
    @Test
    void testIsComplete_WithInProgressStatus() {
        uploadJob.setTotalCount(10);
        uploadJob.setCompletedCount(3);
        uploadJob.setFailedCount(2);
        uploadJob.setStatus(UploadJobStatus.IN_PROGRESS);
        assertFalse(uploadJob.isComplete());
    }
    
    @Test
    void testGetProgressPercentage_WithZeroTotal() {
        uploadJob.setTotalCount(0);
        assertEquals(0.0, uploadJob.getProgressPercentage());
    }
    
    @Test
    void testGetProgressPercentage_WithPartialProgress() {
        uploadJob.setTotalCount(100);
        uploadJob.setCompletedCount(50);
        uploadJob.setFailedCount(10);
        assertEquals(60.0, uploadJob.getProgressPercentage());
    }
    
    @Test
    void testGetProgressPercentage_WithFullProgress() {
        uploadJob.setTotalCount(100);
        uploadJob.setCompletedCount(100);
        assertEquals(100.0, uploadJob.getProgressPercentage());
    }
    
    @Test
    void testPrePersist_SetsDefaults() {
        UploadJob newJob = new UploadJob();
        newJob.onCreate();
        assertNotNull(newJob.getCreatedAt());
        assertNotNull(newJob.getUpdatedAt());
        assertEquals(UploadJobStatus.IN_PROGRESS, newJob.getStatus());
        assertEquals(0, newJob.getCompletedCount());
        assertEquals(0, newJob.getFailedCount());
    }
}

