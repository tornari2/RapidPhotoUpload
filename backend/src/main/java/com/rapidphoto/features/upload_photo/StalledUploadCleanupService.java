package com.rapidphoto.features.upload_photo;

import com.rapidphoto.domain.Photo;
import com.rapidphoto.domain.PhotoStatus;
import com.rapidphoto.domain.UploadEvent;
import com.rapidphoto.domain.UploadJob;
import com.rapidphoto.features.upload_photo.repository.PhotoRepository;
import com.rapidphoto.features.upload_photo.repository.UploadJobRepository;
import com.rapidphoto.features.upload_status.UploadStatusEvent;
import com.rapidphoto.features.upload_status.UploadStatusService;
import com.rapidphoto.infrastructure.s3.S3Service;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Periodically scans for uploads that never completed and marks them as failed so
 * that they no longer appear as "stuck" in the gallery.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class StalledUploadCleanupService {

    private final PhotoRepository photoRepository;
    private final UploadJobRepository uploadJobRepository;
    private final UploadStatusService uploadStatusService;
    private final EntityManager entityManager;
    private final S3Service s3Service;

    /**
     * Number of minutes an upload is allowed to stay in UPLOADING status before it's treated as stalled.
     */
    @Value("${photo.upload.stalled-threshold-minutes:10}")
    private long stalledThresholdMinutes;

    /**
     * Interval between cleanup executions (defaults to 5 minutes).
     */
    @Value("${photo.upload.cleanup-interval-ms:300000}")
    private long cleanupIntervalMs;

    /**
     * Scheduled task that marks long-running uploads as failed.
     */
    @Scheduled(fixedDelayString = "${photo.upload.cleanup-interval-ms:300000}")
    @Transactional
    public void cleanupStalledUploads() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(stalledThresholdMinutes);
        List<Photo> stalledPhotos = photoRepository.findByUploadStatusAndCreatedAtBefore(PhotoStatus.UPLOADING, cutoff);

        if (stalledPhotos.isEmpty()) {
            return;
        }

        log.warn("Found {} stalled uploads older than {} minutes. Initiating cleanup.", stalledPhotos.size(), stalledThresholdMinutes);

        Map<UUID, UploadJob> jobCache = new HashMap<>();

        for (Photo photo : stalledPhotos) {
            try {
                handleStalledPhoto(photo, jobCache);
            } catch (Exception ex) {
                log.error("Failed to clean up stalled upload for photo {}: {}", photo.getId(), ex.getMessage(), ex);
            }
        }
    }

    private void handleStalledPhoto(Photo photo, Map<UUID, UploadJob> jobCache) {
        UUID photoId = photo.getId();
        UUID jobId = photo.getUploadJob() != null ? photo.getUploadJob().getId() : null;

        log.warn("Marking stalled upload as failed. photoId={}, jobId={}, createdAt={}", photoId, jobId, photo.getCreatedAt());

        // Mark the photo as failed so it no longer appears as UPLOADING
        photo.markAsFailed();
        photoRepository.save(photo);

        // Record the failure event for audit/debugging
        UploadEvent failureEvent = UploadEvent.failed(photo,
                String.format("Upload automatically failed after exceeding %d minute threshold", stalledThresholdMinutes));
        entityManager.persist(failureEvent);

        // Best-effort attempt to delete any partial object from S3
        try {
            if (s3Service.fileExists(photo.getS3Key())) {
                boolean deleted = s3Service.deleteFile(photo.getS3Key());
                if (deleted) {
                    log.debug("Deleted stalled upload object from S3: {}", photo.getS3Key());
                }
            }
        } catch (Exception ex) {
            log.debug("Unable to delete stalled upload object from S3 for {}: {}", photo.getS3Key(), ex.getMessage());
        }

        // Update the parent upload job counts/status if present
        if (jobId != null) {
            UploadJob uploadJob = jobCache.computeIfAbsent(jobId, id -> uploadJobRepository.findById(id).orElse(null));
            if (uploadJob != null) {
                uploadJob.incrementFailed();
                uploadJobRepository.save(uploadJob);
                emitFailureEvent(uploadJob, photoId);
            }
        }
    }

    private void emitFailureEvent(UploadJob uploadJob, UUID failedPhotoId) {
        try {
            UploadStatusEvent failureEvent = UploadStatusEvent.builder()
                    .eventType("photo_failed")
                    .jobId(uploadJob.getId())
                    .photoId(failedPhotoId)
                    .jobStatus(uploadJob.getStatus().name())
                    .photoStatus(PhotoStatus.FAILED.name())
                    .progress(uploadJob.getProgressPercentage())
                    .completedCount(uploadJob.getCompletedCount())
                    .failedCount(uploadJob.getFailedCount())
                    .totalCount(uploadJob.getTotalCount())
                    .timestamp(LocalDateTime.now())
                    .errorMessage("Upload automatically failed after stalling")
                    .build();

            uploadStatusService.emitEvent(uploadJob.getId(), failureEvent);

            if (uploadJob.isComplete()) {
                UploadStatusEvent jobEvent = UploadStatusEvent.builder()
                        .eventType("job_completed")
                        .jobId(uploadJob.getId())
                        .jobStatus(uploadJob.getStatus().name())
                        .progress(100.0)
                        .completedCount(uploadJob.getCompletedCount())
                        .failedCount(uploadJob.getFailedCount())
                        .totalCount(uploadJob.getTotalCount())
                        .timestamp(LocalDateTime.now())
                        .build();

                uploadStatusService.emitEvent(uploadJob.getId(), jobEvent);
            }
        } catch (Exception ex) {
            log.debug("Failed to emit SSE failure event for job {}: {}", uploadJob.getId(), ex.getMessage());
        }
    }
}

