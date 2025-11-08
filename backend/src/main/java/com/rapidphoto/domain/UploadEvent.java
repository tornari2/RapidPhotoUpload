package com.rapidphoto.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * UploadEvent value object representing a state transition in photo upload lifecycle
 * Domain rules:
 * - Events are immutable once created
 * - Events track state transitions for debugging and audit
 */
@Entity
@Table(name = "upload_events", indexes = {
    @Index(name = "idx_upload_events_photo_id", columnList = "photo_id"),
    @Index(name = "idx_upload_events_created_at", columnList = "created_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UploadEvent {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "photo_id", nullable = false)
    private Photo photo;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 50)
    private EventType eventType;
    
    @Column(name = "message", columnDefinition = "TEXT")
    private String message;
    
    @Column(name = "metadata", columnDefinition = "JSONB")
    @Convert(converter = JsonbConverter.class)
    private Map<String, Object> metadata;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
    
    /**
     * Event types for upload lifecycle
     */
    public enum EventType {
        STARTED,
        PROGRESS,
        COMPLETED,
        FAILED,
        RETRY
    }
    
    /**
     * Domain method: Create event for photo upload start
     */
    public static UploadEvent started(Photo photo) {
        return UploadEvent.builder()
                .photo(photo)
                .eventType(EventType.STARTED)
                .message("Upload started")
                .build();
    }
    
    /**
     * Domain method: Create event for photo completion
     */
    public static UploadEvent completed(Photo photo) {
        return UploadEvent.builder()
                .photo(photo)
                .eventType(EventType.COMPLETED)
                .message("Upload completed successfully")
                .build();
    }
    
    /**
     * Domain method: Create event for photo failure
     */
    public static UploadEvent failed(Photo photo, String errorMessage) {
        return UploadEvent.builder()
                .photo(photo)
                .eventType(EventType.FAILED)
                .message(errorMessage)
                .build();
    }
    
    /**
     * Domain method: Create event for retry
     */
    public static UploadEvent retry(Photo photo, int retryCount) {
        return UploadEvent.builder()
                .photo(photo)
                .eventType(EventType.RETRY)
                .message("Retry attempt " + retryCount)
                .metadata(Map.of("retryCount", retryCount))
                .build();
    }
}

