package com.rapidphoto.features.tag_photo;

import com.rapidphoto.domain.Photo;
import com.rapidphoto.domain.Tag;
import com.rapidphoto.features.tag_photo.dto.TagPhotoResponse;
import com.rapidphoto.features.tag_photo.repository.TagRepository;
import com.rapidphoto.features.upload_photo.repository.PhotoRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Handler for TagPhotoCommand
 * Tags a single photo with one or more tags
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TagPhotoHandler {
    
    private final PhotoRepository photoRepository;
    private final TagRepository tagRepository;
    private final EntityManager entityManager;
    
    /**
     * Handle the TagPhotoCommand
     * 
     * @param command The command containing photo ID, user ID, and tag names
     * @return TagPhotoResponse with tagging results
     * @throws IllegalArgumentException if photo not found or doesn't belong to user
     */
    @Transactional
    public TagPhotoResponse handle(TagPhotoCommand command) {
        log.info("Tagging photo: {} for user: {} with tags: {}", 
                command.getPhotoId(), command.getUserId(), command.getTagNames());
        
        // Verify photo exists and belongs to user
        Photo photo = photoRepository.findByIdAndUserId(command.getPhotoId(), command.getUserId())
                .orElseThrow(() -> {
                    log.warn("Photo not found or access denied: photoId={}, userId={}", 
                            command.getPhotoId(), command.getUserId());
                    return new IllegalArgumentException("Photo not found or access denied");
                });
        
        // Normalize tag names (lowercase, trim)
        List<String> normalizedTagNames = command.getTagNames().stream()
                .map(name -> name.trim().toLowerCase())
                .filter(name -> !name.isEmpty())
                .distinct()
                .collect(Collectors.toList());
        
        if (normalizedTagNames.isEmpty()) {
            throw new IllegalArgumentException("No valid tag names provided");
        }
        
        // Get existing tags for the photo
        Set<String> existingTagNames = getPhotoTagNames(photo.getId());
        
        // Find or create tags
        List<Tag> tags = new ArrayList<>();
        List<String> addedTags = new ArrayList<>();
        List<String> alreadyExistingTags = new ArrayList<>();
        
        for (String tagName : normalizedTagNames) {
            // Check if tag already exists for this photo
            if (existingTagNames.contains(tagName)) {
                alreadyExistingTags.add(tagName);
                log.debug("Tag '{}' already exists for photo: {}", tagName, photo.getId());
                continue;
            }
            
            // Find or create tag
            Tag tag = tagRepository.findByNameIgnoreCase(tagName)
                    .orElseGet(() -> {
                        Tag newTag = Tag.builder()
                                .name(tagName)
                                .build();
                        newTag.normalizeName();
                        Tag saved = tagRepository.save(newTag);
                        log.debug("Created new tag: {}", tagName);
                        return saved;
                    });
            
            tags.add(tag);
            addedTags.add(tagName);
        }
        
        // Link tags to photo via photo_tags junction table
        for (Tag tag : tags) {
            linkTagToPhoto(photo.getId(), tag.getId());
        }
        
        // Get updated tag count
        Set<String> allTagNames = getPhotoTagNames(photo.getId());
        
        log.info("Successfully tagged photo: {} - Added: {}, Already existed: {}, Total: {}", 
                photo.getId(), addedTags.size(), alreadyExistingTags.size(), allTagNames.size());
        
        return TagPhotoResponse.builder()
                .photoId(photo.getId())
                .addedTags(addedTags)
                .existingTags(new ArrayList<>(alreadyExistingTags))
                .totalTags(allTagNames.size())
                .build();
    }
    
    /**
     * Get all tag names for a photo
     */
    private Set<String> getPhotoTagNames(UUID photoId) {
        Query query = entityManager.createNativeQuery(
                "SELECT t.name FROM tags t " +
                "INNER JOIN photo_tags pt ON t.id = pt.tag_id " +
                "WHERE pt.photo_id = :photoId"
        );
        query.setParameter("photoId", photoId);
        
        @SuppressWarnings("unchecked")
        List<String> tagNames = (List<String>) query.getResultList();
        return new HashSet<>(tagNames);
    }
    
    /**
     * Link a tag to a photo in the photo_tags junction table
     * Uses INSERT IGNORE pattern to avoid duplicate key errors
     */
    private void linkTagToPhoto(UUID photoId, UUID tagId) {
        // Check if link already exists
        Query checkQuery = entityManager.createNativeQuery(
                "SELECT COUNT(*) FROM photo_tags WHERE photo_id = :photoId AND tag_id = :tagId"
        );
        checkQuery.setParameter("photoId", photoId);
        checkQuery.setParameter("tagId", tagId);
        
        Long count = ((Number) checkQuery.getSingleResult()).longValue();
        if (count > 0) {
            log.debug("Tag {} already linked to photo {}", tagId, photoId);
            return;
        }
        
        // Insert link
        Query insertQuery = entityManager.createNativeQuery(
                "INSERT INTO photo_tags (photo_id, tag_id, created_at) VALUES (:photoId, :tagId, CURRENT_TIMESTAMP)"
        );
        insertQuery.setParameter("photoId", photoId);
        insertQuery.setParameter("tagId", tagId);
        insertQuery.executeUpdate();
        
        log.debug("Linked tag {} to photo {}", tagId, photoId);
    }
}

