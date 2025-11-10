package com.rapidphoto.features.upload_photo.repository;

import com.rapidphoto.domain.Photo;
import com.rapidphoto.domain.PhotoStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for Photo entity
 */
@Repository
public interface PhotoRepository extends JpaRepository<Photo, UUID> {
    
    /**
     * Find all photos for a user
     */
    List<Photo> findByUserId(UUID userId);
    
    /**
     * Find all photos for an upload job
     */
    List<Photo> findByUploadJobId(UUID uploadJobId);
    
    /**
     * Find photos by user ID with pagination
     */
    Page<Photo> findByUser_Id(UUID userId, Pageable pageable);
    
    /**
     * Find photos by user ID and status with pagination
     */
    Page<Photo> findByUser_IdAndUploadStatus(UUID userId, PhotoStatus status, Pageable pageable);

    /**
     * Find photos by user ID and status without pagination
     */
    List<Photo> findByUser_IdAndUploadStatus(UUID userId, PhotoStatus status);
    
    /**
     * Find photos by user ID and upload job ID with pagination
     */
    Page<Photo> findByUser_IdAndUploadJobId(UUID userId, UUID uploadJobId, Pageable pageable);
    
    /**
     * Find photos by user ID, status, and upload job ID with pagination
     */
    Page<Photo> findByUser_IdAndUploadStatusAndUploadJobId(
            UUID userId, PhotoStatus status, UUID uploadJobId, Pageable pageable);
    
    /**
     * Find photo by ID and user ID (for authorization)
     */
    Optional<Photo> findByIdAndUser_Id(UUID id, UUID userId);

    /**
     * Find photos by status that were created before the given cutoff timestamp
     */
    List<Photo> findByUploadStatusAndCreatedAtBefore(PhotoStatus status, LocalDateTime cutoff);
}

