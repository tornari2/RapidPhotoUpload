package com.rapidphoto.features.tag_photo.repository;

import com.rapidphoto.domain.Tag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

/**
 * Repository for Tag entity
 */
@Repository
public interface TagRepository extends JpaRepository<Tag, UUID> {
    
    /**
     * Find tag by name (case-insensitive)
     */
    Optional<Tag> findByNameIgnoreCase(String name);
    
    /**
     * Check if tag exists by name (case-insensitive)
     */
    boolean existsByNameIgnoreCase(String name);
}

