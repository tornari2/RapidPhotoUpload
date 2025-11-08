package com.rapidphoto.features.tag_photo;

import com.rapidphoto.domain.Photo;
import com.rapidphoto.domain.PhotoStatus;
import com.rapidphoto.domain.Tag;
import com.rapidphoto.domain.UploadJob;
import com.rapidphoto.domain.UploadJobStatus;
import com.rapidphoto.domain.User;
import com.rapidphoto.features.tag_photo.dto.BulkTagPhotosRequest;
import com.rapidphoto.features.tag_photo.dto.BulkTagPhotosResponse;
import com.rapidphoto.features.tag_photo.dto.TagPhotoRequest;
import com.rapidphoto.features.tag_photo.dto.TagPhotoResponse;
import com.rapidphoto.features.tag_photo.repository.TagRepository;
import com.rapidphoto.features.upload_photo.repository.PhotoRepository;
import com.rapidphoto.features.upload_photo.repository.UploadJobRepository;
import com.rapidphoto.features.auth.repository.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Integration tests for photo tagging operations
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class TagPhotoIntegrationTest {
    
    @Autowired
    private TagPhotoHandler tagPhotoHandler;
    
    @Autowired
    private BulkTagPhotosHandler bulkTagPhotosHandler;
    
    @Autowired
    private PhotoRepository photoRepository;
    
    @Autowired
    private TagRepository tagRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private UploadJobRepository uploadJobRepository;
    
    @Autowired
    private EntityManager entityManager;
    
    private User testUser;
    private User otherUser;
    private Photo testPhoto1;
    private Photo testPhoto2;
    private Photo otherUserPhoto;
    
    @BeforeEach
    void setUp() {
        // Create test users
        testUser = User.builder()
                .username("test@example.com")
                .passwordHash("hashedPassword")
                .build();
        testUser = userRepository.save(testUser);
        
        otherUser = User.builder()
                .username("other@example.com")
                .passwordHash("hashedPassword")
                .build();
        otherUser = userRepository.save(otherUser);
        
        // Create test upload job
        UploadJob testJob = UploadJob.builder()
                .user(testUser)
                .totalCount(2)
                .completedCount(2)
                .status(UploadJobStatus.COMPLETED)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        testJob = uploadJobRepository.save(testJob);
        
        // Create test photos
        testPhoto1 = Photo.builder()
                .user(testUser)
                .uploadJob(testJob)
                .filename("photo1.jpg")
                .s3Key("uploads/" + testUser.getId() + "/" + UUID.randomUUID() + "-photo1.jpg")
                .fileSize(1024L)
                .contentType("image/jpeg")
                .uploadStatus(PhotoStatus.COMPLETED)
                .completedAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .build();
        testPhoto1 = photoRepository.save(testPhoto1);
        
        testPhoto2 = Photo.builder()
                .user(testUser)
                .uploadJob(testJob)
                .filename("photo2.jpg")
                .s3Key("uploads/" + testUser.getId() + "/" + UUID.randomUUID() + "-photo2.jpg")
                .fileSize(2048L)
                .contentType("image/jpeg")
                .uploadStatus(PhotoStatus.COMPLETED)
                .completedAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .build();
        testPhoto2 = photoRepository.save(testPhoto2);
        
        otherUserPhoto = Photo.builder()
                .user(otherUser)
                .filename("other.jpg")
                .s3Key("uploads/" + otherUser.getId() + "/" + UUID.randomUUID() + "-other.jpg")
                .fileSize(1024L)
                .contentType("image/jpeg")
                .uploadStatus(PhotoStatus.COMPLETED)
                .completedAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .build();
        otherUserPhoto = photoRepository.save(otherUserPhoto);
    }
    
    @Test
    void testTagPhoto_SingleTag() {
        TagPhotoCommand command = TagPhotoCommand.builder()
                .photoId(testPhoto1.getId())
                .userId(testUser.getId())
                .tagNames(Arrays.asList("nature"))
                .build();
        
        TagPhotoResponse response = tagPhotoHandler.handle(command);
        
        assertThat(response).isNotNull();
        assertThat(response.getPhotoId()).isEqualTo(testPhoto1.getId());
        assertThat(response.getAddedTags()).containsExactly("nature");
        assertThat(response.getExistingTags()).isEmpty();
        assertThat(response.getTotalTags()).isEqualTo(1);
        
        // Verify tag was created
        assertThat(tagRepository.findByNameIgnoreCase("nature")).isPresent();
        
        // Verify photo-tag link exists
        Set<String> photoTags = getPhotoTagNames(testPhoto1.getId());
        assertThat(photoTags).contains("nature");
    }
    
    @Test
    void testTagPhoto_MultipleTags() {
        TagPhotoCommand command = TagPhotoCommand.builder()
                .photoId(testPhoto1.getId())
                .userId(testUser.getId())
                .tagNames(Arrays.asList("nature", "landscape", "sunset"))
                .build();
        
        TagPhotoResponse response = tagPhotoHandler.handle(command);
        
        assertThat(response).isNotNull();
        assertThat(response.getAddedTags()).hasSize(3);
        assertThat(response.getAddedTags()).containsExactlyInAnyOrder("nature", "landscape", "sunset");
        assertThat(response.getTotalTags()).isEqualTo(3);
        
        // Verify all tags were created
        assertThat(tagRepository.findByNameIgnoreCase("nature")).isPresent();
        assertThat(tagRepository.findByNameIgnoreCase("landscape")).isPresent();
        assertThat(tagRepository.findByNameIgnoreCase("sunset")).isPresent();
    }
    
    @Test
    void testTagPhoto_DuplicateTags() {
        // Tag photo first time
        TagPhotoCommand command1 = TagPhotoCommand.builder()
                .photoId(testPhoto1.getId())
                .userId(testUser.getId())
                .tagNames(Arrays.asList("nature"))
                .build();
        tagPhotoHandler.handle(command1);
        
        // Tag photo again with same tag
        TagPhotoCommand command2 = TagPhotoCommand.builder()
                .photoId(testPhoto1.getId())
                .userId(testUser.getId())
                .tagNames(Arrays.asList("nature", "landscape"))
                .build();
        TagPhotoResponse response = tagPhotoHandler.handle(command2);
        
        assertThat(response).isNotNull();
        assertThat(response.getAddedTags()).containsExactly("landscape");
        assertThat(response.getExistingTags()).containsExactly("nature");
        assertThat(response.getTotalTags()).isEqualTo(2);
    }
    
    @Test
    void testTagPhoto_TagNameNormalization() {
        TagPhotoCommand command = TagPhotoCommand.builder()
                .photoId(testPhoto1.getId())
                .userId(testUser.getId())
                .tagNames(Arrays.asList("  NATURE  ", "Landscape", "SUNSET"))
                .build();
        
        TagPhotoResponse response = tagPhotoHandler.handle(command);
        
        assertThat(response).isNotNull();
        assertThat(response.getAddedTags()).hasSize(3);
        // Tags should be normalized to lowercase
        assertThat(response.getAddedTags()).containsExactlyInAnyOrder("nature", "landscape", "sunset");
        
        // Verify tags are stored in lowercase
        assertThat(tagRepository.findByNameIgnoreCase("nature")).isPresent();
        assertThat(tagRepository.findByNameIgnoreCase("NATURE")).isPresent(); // Case-insensitive lookup
    }
    
    @Test
    void testTagPhoto_PhotoNotFound() {
        TagPhotoCommand command = TagPhotoCommand.builder()
                .photoId(UUID.randomUUID())
                .userId(testUser.getId())
                .tagNames(Arrays.asList("nature"))
                .build();
        
        assertThatThrownBy(() -> tagPhotoHandler.handle(command))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Photo not found or access denied");
    }
    
    @Test
    void testTagPhoto_AccessDenied() {
        TagPhotoCommand command = TagPhotoCommand.builder()
                .photoId(otherUserPhoto.getId())
                .userId(testUser.getId()) // Different user
                .tagNames(Arrays.asList("nature"))
                .build();
        
        assertThatThrownBy(() -> tagPhotoHandler.handle(command))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Photo not found or access denied");
    }
    
    @Test
    void testTagPhoto_ReuseExistingTag() {
        // Create a tag first
        Tag existingTag = Tag.builder()
                .name("existing-tag")
                .build();
        existingTag.normalizeName();
        tagRepository.save(existingTag);
        
        // Tag photo with existing tag
        TagPhotoCommand command = TagPhotoCommand.builder()
                .photoId(testPhoto1.getId())
                .userId(testUser.getId())
                .tagNames(Arrays.asList("existing-tag"))
                .build();
        
        TagPhotoResponse response = tagPhotoHandler.handle(command);
        
        assertThat(response).isNotNull();
        assertThat(response.getAddedTags()).containsExactly("existing-tag");
        
        // Verify same tag instance is reused
        assertThat(tagRepository.findByNameIgnoreCase("existing-tag"))
                .isPresent()
                .get()
                .extracting(Tag::getId)
                .isEqualTo(existingTag.getId());
    }
    
    @Test
    void testBulkTagPhotos_Success() {
        BulkTagPhotosCommand command = BulkTagPhotosCommand.builder()
                .userId(testUser.getId())
                .photoIds(Arrays.asList(testPhoto1.getId(), testPhoto2.getId()))
                .tagNames(Arrays.asList("nature", "landscape"))
                .build();
        
        BulkTagPhotosResponse response = bulkTagPhotosHandler.handle(command);
        
        assertThat(response).isNotNull();
        assertThat(response.getTotalPhotos()).isEqualTo(2);
        assertThat(response.getSuccessfulPhotos()).isEqualTo(2);
        assertThat(response.getFailedPhotos()).isEqualTo(0);
        assertThat(response.getFailures()).isEmpty();
        assertThat(response.getResults()).hasSize(2);
        
        // Verify both photos were tagged
        Set<String> photo1Tags = getPhotoTagNames(testPhoto1.getId());
        Set<String> photo2Tags = getPhotoTagNames(testPhoto2.getId());
        assertThat(photo1Tags).containsExactlyInAnyOrder("nature", "landscape");
        assertThat(photo2Tags).containsExactlyInAnyOrder("nature", "landscape");
    }
    
    @Test
    void testBulkTagPhotos_PartialFailure() {
        BulkTagPhotosCommand command = BulkTagPhotosCommand.builder()
                .userId(testUser.getId())
                .photoIds(Arrays.asList(testPhoto1.getId(), UUID.randomUUID(), testPhoto2.getId()))
                .tagNames(Arrays.asList("nature"))
                .build();
        
        BulkTagPhotosResponse response = bulkTagPhotosHandler.handle(command);
        
        assertThat(response).isNotNull();
        assertThat(response.getTotalPhotos()).isEqualTo(3);
        assertThat(response.getSuccessfulPhotos()).isEqualTo(2);
        assertThat(response.getFailedPhotos()).isEqualTo(1);
        assertThat(response.getFailures()).hasSize(1);
        assertThat(response.getResults()).hasSize(2);
    }
    
    @Test
    void testBulkTagPhotos_AccessDenied() {
        BulkTagPhotosCommand command = BulkTagPhotosCommand.builder()
                .userId(testUser.getId())
                .photoIds(Arrays.asList(testPhoto1.getId(), otherUserPhoto.getId()))
                .tagNames(Arrays.asList("nature"))
                .build();
        
        BulkTagPhotosResponse response = bulkTagPhotosHandler.handle(command);
        
        assertThat(response).isNotNull();
        assertThat(response.getTotalPhotos()).isEqualTo(2);
        assertThat(response.getSuccessfulPhotos()).isEqualTo(1);
        assertThat(response.getFailedPhotos()).isEqualTo(1);
        assertThat(response.getFailures()).hasSize(1);
        assertThat(response.getFailures().get(otherUserPhoto.getId())).isNotNull();
    }
    
    /**
     * Helper method to get tag names for a photo
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
        return tagNames.stream().collect(Collectors.toSet());
    }
}

