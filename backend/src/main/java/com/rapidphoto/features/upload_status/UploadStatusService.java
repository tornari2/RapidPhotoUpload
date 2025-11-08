package com.rapidphoto.features.upload_status;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Service for managing SSE connections and emitting status events
 */
@Service
@Slf4j
public class UploadStatusService {
    
    // Map of jobId -> Map of connectionId -> SseEmitter
    private final Map<UUID, Map<String, SseEmitter>> jobConnections = new ConcurrentHashMap<>();
    
    // Default timeout: 30 minutes
    private static final long DEFAULT_TIMEOUT = 30 * 60 * 1000L;
    
    /**
     * Create a new SSE connection for an upload job
     * 
     * @param jobId Upload job ID
     * @param connectionId Unique connection ID (e.g., client session ID)
     * @return SseEmitter for the connection
     */
    public SseEmitter createConnection(UUID jobId, String connectionId) {
        log.info("Creating SSE connection for job: {} with connection ID: {}", jobId, connectionId);
        
        SseEmitter emitter = new SseEmitter(DEFAULT_TIMEOUT);
        
        // Handle completion and timeout
        emitter.onCompletion(() -> {
            log.debug("SSE connection completed for job: {} connection: {}", jobId, connectionId);
            removeConnection(jobId, connectionId);
        });
        
        emitter.onTimeout(() -> {
            log.debug("SSE connection timeout for job: {} connection: {}", jobId, connectionId);
            removeConnection(jobId, connectionId);
        });
        
        emitter.onError((ex) -> {
            log.error("SSE connection error for job: {} connection: {}", jobId, connectionId, ex);
            removeConnection(jobId, connectionId);
        });
        
        // Store connection
        jobConnections.computeIfAbsent(jobId, k -> new ConcurrentHashMap<>())
                .put(connectionId, emitter);
        
        // Send initial connection event
        try {
            UploadStatusEvent initialEvent = UploadStatusEvent.builder()
                    .eventType("connected")
                    .jobId(jobId)
                    .timestamp(java.time.LocalDateTime.now())
                    .build();
            emitter.send(SseEmitter.event()
                    .name("status")
                    .data(initialEvent));
        } catch (IOException e) {
            log.error("Error sending initial connection event", e);
            removeConnection(jobId, connectionId);
        }
        
        log.info("SSE connection created for job: {} connection: {}", jobId, connectionId);
        return emitter;
    }
    
    /**
     * Emit a status event to all connections for an upload job
     * 
     * @param jobId Upload job ID
     * @param event Status event to emit
     */
    public void emitEvent(UUID jobId, UploadStatusEvent event) {
        Map<String, SseEmitter> connections = jobConnections.get(jobId);
        if (connections == null || connections.isEmpty()) {
            log.debug("No active connections for job: {}", jobId);
            return;
        }
        
        log.debug("Emitting event to {} connections for job: {} - event type: {}", 
                connections.size(), jobId, event.getEventType());
        
        // Send event to all connections
        connections.entrySet().removeIf(entry -> {
            String connectionId = entry.getKey();
            SseEmitter emitter = entry.getValue();
            
            try {
                emitter.send(SseEmitter.event()
                        .name("status")
                        .data(event));
                return false; // Keep connection
            } catch (IOException e) {
                log.warn("Error sending event to connection {} for job {}: {}", 
                        connectionId, jobId, e.getMessage());
                return true; // Remove connection
            }
        });
        
        // Clean up if no connections left
        if (connections.isEmpty()) {
            jobConnections.remove(jobId);
            log.debug("Removed job {} from connections map (no active connections)", jobId);
        }
    }
    
    /**
     * Remove a connection
     * 
     * @param jobId Upload job ID
     * @param connectionId Connection ID
     */
    private void removeConnection(UUID jobId, String connectionId) {
        Map<String, SseEmitter> connections = jobConnections.get(jobId);
        if (connections != null) {
            SseEmitter emitter = connections.remove(connectionId);
            if (emitter != null) {
                try {
                    emitter.complete();
                } catch (Exception e) {
                    log.debug("Error completing emitter", e);
                }
            }
            
            // Clean up if no connections left
            if (connections.isEmpty()) {
                jobConnections.remove(jobId);
            }
        }
    }
    
    /**
     * Get number of active connections for a job
     * 
     * @param jobId Upload job ID
     * @return Number of active connections
     */
    public int getConnectionCount(UUID jobId) {
        Map<String, SseEmitter> connections = jobConnections.get(jobId);
        return connections != null ? connections.size() : 0;
    }
    
    /**
     * Close all connections for a job
     * 
     * @param jobId Upload job ID
     */
    public void closeAllConnections(UUID jobId) {
        Map<String, SseEmitter> connections = jobConnections.remove(jobId);
        if (connections != null) {
            log.info("Closing {} connections for job: {}", connections.size(), jobId);
            connections.values().forEach(emitter -> {
                try {
                    emitter.complete();
                } catch (Exception e) {
                    log.debug("Error completing emitter", e);
                }
            });
        }
    }
}

