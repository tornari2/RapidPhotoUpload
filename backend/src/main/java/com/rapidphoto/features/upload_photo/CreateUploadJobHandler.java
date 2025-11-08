package com.rapidphoto.features.upload_photo;

import com.rapidphoto.domain.Photo;
import com.rapidphoto.domain.PhotoStatus;
import com.rapidphoto.domain.UploadJob;
import com.rapidphoto.domain.UploadJobStatus;
import com.rapidphoto.features.upload_photo.dto.CreateUploadJobResponse;
import com.rapidphoto.features.upload_photo.repository.PhotoRepository;
import com.rapidphoto.features.upload_photo.repository.UploadJobRepository;
import com.rapidphoto.infrastructure.s3.S3Service;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Handler for CreateUploadJobCommand
 * Orchestrates the creation of upload jobs, photo records, and presigned URL generation
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CreateUploadJobHandler {
    
    private final UploadJobRepository uploadJobRepository;
    private final PhotoRepository photoRepository;
    private final S3Service s3Service;
    
    /**
     * Handle the create upload job command
     * 
     * @param command The command containing user and photo information
     * @return Response with job ID, photo IDs, and presigned URLs
     */
    @Transactional
    public CreateUploadJobResponse handle(CreateUploadJobCommand command) {
        log.info("Creating upload job for user: {}", command.getUser().getId());
        
        // Create UploadJob entity
        UploadJob uploadJob = UploadJob.builder()
                .user(command.getUser())
                .totalCount(command.getPhotos().size())
                .completedCount(0)
                .failedCount(0)
                .status(UploadJobStatus.IN_PROGRESS)
                .build();
        
        uploadJob = uploadJobRepository.save(uploadJob);
        log.debug("Created upload job: {}", uploadJob.getId());
        
        // Create Photo entities and generate presigned URLs
        final UploadJob finalUploadJob = uploadJob; // Make effectively final for lambda
        List<CreateUploadJobResponse.PhotoUploadResponse> photoResponses = command.getPhotos().stream()
                .map(photoInfo -> createPhotoAndGenerateUrl(finalUploadJob, command.getUser(), photoInfo))
                .toList();
        
        log.info("Created upload job {} with {} photos", uploadJob.getId(), photoResponses.size());
        
        // Build response
        return CreateUploadJobResponse.builder()
                .jobId(uploadJob.getId())
                .userId(command.getUser().getId())
                .totalCount(uploadJob.getTotalCount())
                .status(uploadJob.getStatus().name())
                .photos(photoResponses)
                .build();
    }
    
    /**
     * Create a Photo entity and generate its presigned URL
     */
    private CreateUploadJobResponse.PhotoUploadResponse createPhotoAndGenerateUrl(
            UploadJob uploadJob,
            com.rapidphoto.domain.User user,
            CreateUploadJobCommand.PhotoInfo photoInfo) {
        
        // Generate photo ID
        UUID photoId = UUID.randomUUID();
        
        // Build S3 key
        String s3Key = s3Service.buildS3Key(user.getId(), photoId, photoInfo.getFilename());
        
        // Create Photo entity
        Photo photo = Photo.builder()
                .id(photoId)
                .user(user)
                .uploadJob(uploadJob)
                .filename(photoInfo.getFilename())
                .s3Key(s3Key)
                .fileSize(photoInfo.getFileSize())
                .contentType(photoInfo.getContentType())
                .uploadStatus(PhotoStatus.UPLOADING)
                .retryCount(0)
                .build();
        
        photo = photoRepository.save(photo);
        log.debug("Created photo: {} for job: {}", photo.getId(), uploadJob.getId());
        
        // Generate presigned URL
        String presignedUrl = s3Service.generateUploadUrl(
                user.getId(),
                photoId,
                photoInfo.getFilename(),
                photoInfo.getContentType()
        );
        
        log.debug("Generated presigned URL for photo: {}", photo.getId());
        
        // Build response
        return CreateUploadJobResponse.PhotoUploadResponse.builder()
                .photoId(photo.getId())
                .filename(photo.getFilename())
                .uploadUrl(presignedUrl)
                .s3Key(photo.getS3Key())
                .status(photo.getUploadStatus().name())
                .build();
    }
}

