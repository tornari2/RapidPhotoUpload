package com.rapidphoto.domain;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class UploadEventTest {
    
    private User user;
    private Photo photo;
    
    @BeforeEach
    void setUp() {
        user = User.builder()
                .id(UUID.randomUUID())
                .username("testuser")
                .passwordHash("hash")
                .build();
        
        photo = Photo.builder()
                .id(UUID.randomUUID())
                .user(user)
                .filename("test.jpg")
                .s3Key("uploads/user123/test.jpg")
                .fileSize(2048000L)
                .uploadStatus(PhotoStatus.UPLOADING)
                .build();
    }
    
    @Test
    void testStartedEvent() {
        UploadEvent event = UploadEvent.started(photo);
        assertNotNull(event);
        assertEquals(UploadEvent.EventType.STARTED, event.getEventType());
        assertEquals("Upload started", event.getMessage());
        assertEquals(photo, event.getPhoto());
    }
    
    @Test
    void testCompletedEvent() {
        UploadEvent event = UploadEvent.completed(photo);
        assertNotNull(event);
        assertEquals(UploadEvent.EventType.COMPLETED, event.getEventType());
        assertEquals("Upload completed successfully", event.getMessage());
        assertEquals(photo, event.getPhoto());
    }
    
    @Test
    void testFailedEvent() {
        String errorMessage = "Network timeout";
        UploadEvent event = UploadEvent.failed(photo, errorMessage);
        assertNotNull(event);
        assertEquals(UploadEvent.EventType.FAILED, event.getEventType());
        assertEquals(errorMessage, event.getMessage());
        assertEquals(photo, event.getPhoto());
    }
    
    @Test
    void testRetryEvent() {
        UploadEvent event = UploadEvent.retry(photo, 2);
        assertNotNull(event);
        assertEquals(UploadEvent.EventType.RETRY, event.getEventType());
        assertEquals("Retry attempt 2", event.getMessage());
        assertEquals(photo, event.getPhoto());
        assertNotNull(event.getMetadata());
        assertEquals(2, event.getMetadata().get("retryCount"));
    }
    
    @Test
    void testPrePersist_SetsCreatedAt() {
        UploadEvent event = new UploadEvent();
        event.onCreate();
        assertNotNull(event.getCreatedAt());
    }
    
    @Test
    void testEventTypeEnum() {
        assertEquals(5, UploadEvent.EventType.values().length);
        assertTrue(UploadEvent.EventType.STARTED != null);
        assertTrue(UploadEvent.EventType.PROGRESS != null);
        assertTrue(UploadEvent.EventType.COMPLETED != null);
        assertTrue(UploadEvent.EventType.FAILED != null);
        assertTrue(UploadEvent.EventType.RETRY != null);
    }
}

