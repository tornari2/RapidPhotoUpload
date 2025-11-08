package com.rapidphoto.features.upload_status;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.UUID;

/**
 * REST controller for Server-Sent Events (SSE) upload status updates
 */
@RestController
@RequestMapping("/api/upload-jobs")
@RequiredArgsConstructor
@Slf4j
public class UploadStatusController {
    
    private final UploadStatusService uploadStatusService;
    
    /**
     * SSE endpoint for real-time upload status updates
     * Clients connect to this endpoint to receive status updates for an upload job
     * 
     * @param jobId Upload job ID
     * @param connectionId Optional connection ID for reconnection support (if not provided, generates one)
     * @return SseEmitter for the connection
     */
    @GetMapping(value = "/{jobId}/status", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamUploadStatus(
            @PathVariable UUID jobId,
            @RequestParam(required = false, defaultValue = "") String connectionId) {
        
        // Generate connection ID if not provided
        String connId = connectionId.isEmpty() ? UUID.randomUUID().toString() : connectionId;
        
        log.info("SSE connection request for job: {} with connection ID: {}", jobId, connId);
        
        return uploadStatusService.createConnection(jobId, connId);
    }
}

