package com.rapidphoto.features.upload_status;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * Event DTO for SSE status updates
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UploadStatusEvent {
    
    /**
     * Event type: photo_completed, photo_failed, job_completed, job_progress
     */
    private String eventType;
    
    /**
     * Photo ID (if event is photo-related)
     */
    private UUID photoId;
    
    /**
     * Upload job ID
     */
    private UUID jobId;
    
    /**
     * Photo status
     */
    private String photoStatus;
    
    /**
     * Upload job status
     */
    private String jobStatus;
    
    /**
     * Progress percentage (0-100)
     */
    private Double progress;
    
    /**
     * Completed count
     */
    private Integer completedCount;
    
    /**
     * Failed count
     */
    private Integer failedCount;
    
    /**
     * Total count
     */
    private Integer totalCount;
    
    /**
     * Error message (for failures)
     */
    private String errorMessage;
    
    /**
     * Timestamp of the event
     */
    private LocalDateTime timestamp;
    
    /**
     * Additional metadata
     */
    private Map<String, Object> metadata;
}

