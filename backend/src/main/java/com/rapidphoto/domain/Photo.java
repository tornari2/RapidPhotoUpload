package com.rapidphoto.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

/**
 * Photo domain entity representing an uploaded photo
 * Domain rules:
 * - Photo belongs to a user
 * - Photo is immutable once successfully stored
 * - Failed uploads maintain reference for retry capability
 */
@Entity
@Table(name = "photos", indexes = {
    @Index(name = "idx_photos_user_id", columnList = "user_id"),
    @Index(name = "idx_photos_upload_job_id", columnList = "upload_job_id"),
    @Index(name = "idx_photos_upload_status", columnList = "upload_status")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Photo {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    private UUID id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @NotNull(message = "User is required")
    private User user;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "upload_job_id")
    private UploadJob uploadJob;
    
    @Column(name = "filename", nullable = false, length = 500)
    @NotBlank(message = "Filename is required")
    private String filename;
    
    @Column(name = "s3_key", nullable = false, unique = true, length = 1000)
    @NotBlank(message = "S3 key is required")
    private String s3Key;
    
    @Column(name = "file_size", nullable = false)
    @NotNull(message = "File size is required")
    @Positive(message = "File size must be positive")
    private Long fileSize;
    
    @Column(name = "content_type", length = 100)
    private String contentType;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "upload_status", nullable = false, length = 50)
    @NotNull(message = "Upload status is required")
    private PhotoStatus uploadStatus;
    
    @Column(name = "retry_count", nullable = false)
    @Builder.Default
    private Integer retryCount = 0;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "completed_at")
    private LocalDateTime completedAt;
    
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "photo_tags",
        joinColumns = @JoinColumn(name = "photo_id"),
        inverseJoinColumns = @JoinColumn(name = "tag_id")
    )
    @Builder.Default
    private Set<Tag> tags = new HashSet<>();
    
    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (uploadStatus == null) {
            uploadStatus = PhotoStatus.UPLOADING;
        }
        if (retryCount == null) {
            retryCount = 0;
        }
    }
    
    /**
     * Domain method: Mark photo as completed
     * Domain rule: Photo is immutable once successfully stored
     */
    public void markAsCompleted() {
        if (this.uploadStatus == PhotoStatus.COMPLETED) {
            throw new IllegalStateException("Photo is already completed and cannot be modified");
        }
        this.uploadStatus = PhotoStatus.COMPLETED;
        this.completedAt = LocalDateTime.now();
    }
    
    /**
     * Domain method: Mark photo as failed
     */
    public void markAsFailed() {
        this.uploadStatus = PhotoStatus.FAILED;
        this.retryCount++;
    }
    
    /**
     * Domain method: Retry failed upload
     */
    public void retry() {
        if (this.uploadStatus != PhotoStatus.FAILED) {
            throw new IllegalStateException("Only failed photos can be retried");
        }
        this.uploadStatus = PhotoStatus.UPLOADING;
    }
    
    /**
     * Domain method: Check if photo can be retried
     */
    public boolean canRetry(int maxRetries) {
        return this.uploadStatus == PhotoStatus.FAILED && this.retryCount < maxRetries;
    }
    
    /**
     * Domain method: Check if photo belongs to user
     */
    public boolean belongsTo(User user) {
        return this.user != null && this.user.getId().equals(user.getId());
    }
}

