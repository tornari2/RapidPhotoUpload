package com.rapidphoto.features.upload_photo.repository;

import com.rapidphoto.domain.UploadJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Repository for UploadJob entity
 */
@Repository
public interface UploadJobRepository extends JpaRepository<UploadJob, UUID> {
    
    /**
     * Find all upload jobs for a user
     */
    List<UploadJob> findByUserId(UUID userId);
}

