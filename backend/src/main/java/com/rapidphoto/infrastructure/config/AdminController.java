package com.rapidphoto.infrastructure.config;

import com.rapidphoto.domain.Photo;
import com.rapidphoto.domain.PhotoStatus;
import com.rapidphoto.features.upload_photo.StalledUploadCleanupService;
import com.rapidphoto.features.upload_photo.repository.PhotoRepository;
import com.rapidphoto.infrastructure.s3.S3Service;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Administrative endpoints for emergency operations
 * WARNING: These endpoints should be protected by admin authentication in production
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Slf4j
public class AdminController {

    private final PhotoRepository photoRepository;
    private final StalledUploadCleanupService stalledUploadCleanupService;
    private final S3Service s3Service;

    /**
     * Get statistics about stalled uploads
     * GET /api/admin/stalled-uploads/stats
     */
    @GetMapping("/stalled-uploads/stats")
    public ResponseEntity<Map<String, Object>> getStalledStats(
            @RequestParam(defaultValue = "10") long thresholdMinutes) {
        
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(thresholdMinutes);
        List<Photo> stalledPhotos = photoRepository.findByUploadStatusAndCreatedAtBefore(
                PhotoStatus.UPLOADING, cutoff);
        
        Map<String, Object> stats = new HashMap<>();
        stats.put("stalledCount", stalledPhotos.size());
        stats.put("thresholdMinutes", thresholdMinutes);
        stats.put("cutoffTime", cutoff.toString());
        stats.put("currentTime", LocalDateTime.now().toString());
        
        if (!stalledPhotos.isEmpty()) {
            stats.put("oldestUpload", stalledPhotos.stream()
                    .map(Photo::getCreatedAt)
                    .min(LocalDateTime::compareTo)
                    .map(LocalDateTime::toString)
                    .orElse(null));
            
            stats.put("newestUpload", stalledPhotos.stream()
                    .map(Photo::getCreatedAt)
                    .max(LocalDateTime::compareTo)
                    .map(LocalDateTime::toString)
                    .orElse(null));
        }
        
        log.info("Stalled upload stats requested: {} photos found", stalledPhotos.size());
        return ResponseEntity.ok(stats);
    }

    /**
     * Manually trigger the stalled upload cleanup process
     * POST /api/admin/stalled-uploads/cleanup
     */
    @PostMapping("/stalled-uploads/cleanup")
    public ResponseEntity<Map<String, Object>> cleanupStalledUploads() {
        log.warn("Manual stalled upload cleanup triggered via admin endpoint");
        
        LocalDateTime startTime = LocalDateTime.now();
        
        // Get count before cleanup
        List<Photo> stalledBefore = photoRepository.findByUploadStatusAndCreatedAtBefore(
                PhotoStatus.UPLOADING, LocalDateTime.now().minusMinutes(10));
        int countBefore = stalledBefore.size();
        
        // Trigger cleanup
        stalledUploadCleanupService.cleanupStalledUploads();
        
        // Get count after cleanup
        List<Photo> stalledAfter = photoRepository.findByUploadStatusAndCreatedAtBefore(
                PhotoStatus.UPLOADING, LocalDateTime.now().minusMinutes(10));
        int countAfter = stalledAfter.size();
        
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("stalledCountBefore", countBefore);
        result.put("stalledCountAfter", countAfter);
        result.put("cleaned", countBefore - countAfter);
        result.put("startTime", startTime.toString());
        result.put("endTime", LocalDateTime.now().toString());
        
        log.warn("Manual cleanup completed: {} photos cleaned up", countBefore - countAfter);
        return ResponseEntity.ok(result);
    }

    /**
     * Delete ALL stalled uploads (emergency nuclear option)
     * DELETE /api/admin/stalled-uploads/delete-all
     */
    @DeleteMapping("/stalled-uploads/delete-all")
    @Transactional
    public ResponseEntity<Map<String, Object>> deleteAllStalledUploads(
            @RequestParam(defaultValue = "10") long thresholdMinutes) {
        
        log.error("EMERGENCY: Delete all stalled uploads triggered! thresholdMinutes={}", thresholdMinutes);
        
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(thresholdMinutes);
        List<Photo> stalledPhotos = photoRepository.findByUploadStatusAndCreatedAtBefore(
                PhotoStatus.UPLOADING, cutoff);
        
        int totalDeleted = 0;
        int s3Deleted = 0;
        int s3Failed = 0;
        
        for (Photo photo : stalledPhotos) {
            try {
                // Try to delete from S3 first
                if (photo.getS3Key() != null && !photo.getS3Key().isEmpty()) {
                    try {
                        if (s3Service.fileExists(photo.getS3Key())) {
                            boolean deleted = s3Service.deleteFile(photo.getS3Key());
                            if (deleted) {
                                s3Deleted++;
                                log.debug("Deleted S3 object: {}", photo.getS3Key());
                            } else {
                                s3Failed++;
                                log.warn("Failed to delete S3 object: {}", photo.getS3Key());
                            }
                        }
                    } catch (Exception ex) {
                        s3Failed++;
                        log.warn("Error deleting S3 object {}: {}", photo.getS3Key(), ex.getMessage());
                    }
                }
                
                // Delete from database
                photoRepository.delete(photo);
                totalDeleted++;
                
            } catch (Exception ex) {
                log.error("Failed to delete stalled photo {}: {}", photo.getId(), ex.getMessage(), ex);
            }
        }
        
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("totalDeleted", totalDeleted);
        result.put("s3ObjectsDeleted", s3Deleted);
        result.put("s3DeletesFailed", s3Failed);
        result.put("thresholdMinutes", thresholdMinutes);
        result.put("cutoffTime", cutoff.toString());
        
        log.error("EMERGENCY DELETE COMPLETED: {} stalled photos deleted, {} S3 objects deleted, {} S3 deletes failed", 
                totalDeleted, s3Deleted, s3Failed);
        
        return ResponseEntity.ok(result);
    }
    
    /**
     * Get overall database statistics
     * GET /api/admin/stats
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getDatabaseStats() {
        Map<String, Object> stats = new HashMap<>();
        
        long totalPhotos = photoRepository.count();
        long uploadingCount = photoRepository.findByUploadStatusAndCreatedAtBefore(
                PhotoStatus.UPLOADING, LocalDateTime.now().plusDays(1)).size();
        long completedCount = photoRepository.findAll().stream()
                .filter(p -> p.getUploadStatus() == PhotoStatus.COMPLETED)
                .count();
        long failedCount = photoRepository.findAll().stream()
                .filter(p -> p.getUploadStatus() == PhotoStatus.FAILED)
                .count();
        
        Map<String, Long> photosByStatus = new HashMap<>();
        photosByStatus.put("UPLOADING", uploadingCount);
        photosByStatus.put("COMPLETED", completedCount);
        photosByStatus.put("FAILED", failedCount);
        
        stats.put("totalPhotos", totalPhotos);
        stats.put("photosByStatus", photosByStatus);
        stats.put("timestamp", LocalDateTime.now().toString());
        
        return ResponseEntity.ok(stats);
    }
}

