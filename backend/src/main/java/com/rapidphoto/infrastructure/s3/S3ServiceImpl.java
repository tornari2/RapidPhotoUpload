package com.rapidphoto.infrastructure.s3;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * S3Service implementation using PresignedUrlGenerator
 */
@Service
public class S3ServiceImpl implements S3Service {
    
    private final PresignedUrlGenerator presignedUrlGenerator;
    private final String bucketName;
    
    public S3ServiceImpl(
            PresignedUrlGenerator presignedUrlGenerator,
            @Value("${aws.s3.bucket-name}") String bucketName) {
        this.presignedUrlGenerator = presignedUrlGenerator;
        this.bucketName = bucketName;
    }
    
    @Override
    public String generateUploadUrl(UUID userId, UUID photoId, String filename, String contentType) {
        return presignedUrlGenerator.generateUploadUrl(userId, photoId, filename, contentType);
    }
    
    @Override
    public String generateDownloadUrl(String s3Key) {
        return presignedUrlGenerator.generateDownloadUrl(s3Key);
    }
    
    @Override
    public boolean fileExists(String s3Key) {
        return presignedUrlGenerator.fileExists(s3Key);
    }
    
    @Override
    public boolean deleteFile(String s3Key) {
        return presignedUrlGenerator.deleteFile(s3Key);
    }
    
    @Override
    public String buildS3Key(UUID userId, UUID photoId, String filename) {
        // Sanitize filename to prevent path traversal
        String sanitizedFilename = filename.replaceAll("[^a-zA-Z0-9._-]", "_");
        return String.format("uploads/%s/%s-%s", userId, photoId, sanitizedFilename);
    }
}

