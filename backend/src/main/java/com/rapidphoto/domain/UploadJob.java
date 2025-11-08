package com.rapidphoto.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * UploadJob domain entity representing a batch upload operation
 * Domain rules:
 * - Upload jobs track overall batch status and individual photo states
 * - Status transitions follow business rules (IN_PROGRESS -> COMPLETED/PARTIAL_SUCCESS/FAILED)
 */
@Entity
@Table(name = "upload_jobs", indexes = {
    @Index(name = "idx_upload_jobs_user_id", columnList = "user_id"),
    @Index(name = "idx_upload_jobs_status", columnList = "status")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UploadJob {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    private UUID id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @NotNull(message = "User is required")
    private User user;
    
    @Column(name = "total_count", nullable = false)
    @NotNull(message = "Total count is required")
    @PositiveOrZero(message = "Total count must be non-negative")
    private Integer totalCount;
    
    @Column(name = "completed_count", nullable = false)
    @Builder.Default
    private Integer completedCount = 0;
    
    @Column(name = "failed_count", nullable = false)
    @Builder.Default
    private Integer failedCount = 0;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    @NotNull(message = "Status is required")
    private UploadJobStatus status;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (updatedAt == null) {
            updatedAt = LocalDateTime.now();
        }
        if (status == null) {
            status = UploadJobStatus.IN_PROGRESS;
        }
        if (completedCount == null) {
            completedCount = 0;
        }
        if (failedCount == null) {
            failedCount = 0;
        }
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    
    /**
     * Domain method: Increment completed count and update status
     */
    public void incrementCompleted() {
        this.completedCount++;
        this.updateStatus();
    }
    
    /**
     * Domain method: Increment failed count and update status
     */
    public void incrementFailed() {
        this.failedCount++;
        this.updateStatus();
    }
    
    /**
     * Domain method: Update job status based on counts
     * Domain rule: Status transitions follow business logic
     */
    private void updateStatus() {
        int inProgressCount = totalCount - completedCount - failedCount;
        
        if (completedCount == totalCount) {
            this.status = UploadJobStatus.COMPLETED;
        } else if (failedCount == totalCount) {
            this.status = UploadJobStatus.FAILED;
        } else if (completedCount > 0 || failedCount > 0) {
            this.status = UploadJobStatus.PARTIAL_SUCCESS;
        } else {
            this.status = UploadJobStatus.IN_PROGRESS;
        }
        
        this.updatedAt = LocalDateTime.now();
    }
    
    /**
     * Domain method: Check if job is complete
     */
    public boolean isComplete() {
        return status == UploadJobStatus.COMPLETED || 
               status == UploadJobStatus.FAILED ||
               (completedCount + failedCount == totalCount);
    }
    
    /**
     * Domain method: Get progress percentage
     */
    public double getProgressPercentage() {
        if (totalCount == 0) {
            return 0.0;
        }
        return ((double) (completedCount + failedCount) / totalCount) * 100.0;
    }
}

