package com.rapidphoto.infrastructure.s3;

import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.time.Duration;
import java.util.UUID;

/**
 * Generates presigned URLs for S3 uploads and downloads
 * Presigned URLs allow clients to upload/download directly to/from S3
 */
@Component
@Slf4j
public class PresignedUrlGenerator {
    
    private final S3Client s3Client;
    private final Region region;
    private final String bucketName;
    private final int expirationMinutes;
    private final S3Presigner presigner; // Reusable presigner instance (thread-safe)
    
    public PresignedUrlGenerator(
            S3Client s3Client,
            Region region,
            @Value("${aws.s3.bucket-name}") String bucketName,
            @Value("${aws.s3.presigned-url-expiration-minutes:15}") int expirationMinutes) {
        this.s3Client = s3Client;
        this.region = region;
        this.bucketName = bucketName;
        this.expirationMinutes = expirationMinutes;
        // Create singleton presigner instance (thread-safe, reusable)
        this.presigner = S3Presigner.builder()
                .region(region)
                .build();
    }
    
    /**
     * Generate presigned URL for uploading a photo to S3
     * S3 key format: uploads/{userId}/{photoId}-{filename}
     * 
     * @param userId User ID for organizing uploads
     * @param photoId Photo ID for unique identification
     * @param filename Original filename
     * @param contentType Content type (e.g., image/jpeg)
     * @return Presigned URL for PUT operation
     */
    public String generateUploadUrl(UUID userId, UUID photoId, String filename, String contentType) {
        String s3Key = buildS3Key(userId, photoId, filename);
        
        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(s3Key)
                .contentType(contentType)
                .build();
        
        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(expirationMinutes))
                .putObjectRequest(putObjectRequest)
                .build();
        
        PresignedPutObjectRequest presignedRequest = presigner.presignPutObject(presignRequest);
        return presignedRequest.url().toString();
    }
    
    /**
     * Generate presigned URL for downloading a photo from S3
     * 
     * @param s3Key S3 key of the photo to download
     * @return Presigned URL for GET operation
     */
    public String generateDownloadUrl(String s3Key) {
        return generateDownloadUrl(s3Key, expirationMinutes);
    }
    
    /**
     * Generate presigned URL for downloading a photo from S3 with custom expiration
     * 
     * @param s3Key S3 key of the photo to download
     * @param customExpirationMinutes Custom expiration time in minutes
     * @return Presigned URL for GET operation
     */
    public String generateDownloadUrl(String s3Key, int customExpirationMinutes) {
        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(s3Key)
                .build();
        
        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(customExpirationMinutes))
                .getObjectRequest(getObjectRequest)
                .build();
        
        PresignedGetObjectRequest presignedRequest = presigner.presignGetObject(presignRequest);
        return presignedRequest.url().toString();
    }
    
    /**
     * Build S3 key following the pattern: uploads/{userId}/{photoId}-{filename}
     * 
     * @param userId User ID
     * @param photoId Photo ID
     * @param filename Original filename
     * @return S3 key
     */
    public String buildS3Key(UUID userId, UUID photoId, String filename) {
        // Sanitize filename to prevent path traversal
        String sanitizedFilename = filename.replaceAll("[^a-zA-Z0-9._-]", "_");
        return String.format("uploads/%s/%s-%s", userId, photoId, sanitizedFilename);
    }
    
    /**
     * Verify if a file exists in S3
     * 
     * @param s3Key S3 key to check
     * @return true if file exists, false otherwise
     */
    public boolean fileExists(String s3Key) {
        try {
            s3Client.headObject(headObjectRequest -> headObjectRequest
                    .bucket(bucketName)
                    .key(s3Key)
            );
            return true;
        } catch (Exception e) {
            return false;
        }
    }
    
    /**
     * Delete a file from S3
     * 
     * @param s3Key S3 key of the file to delete
     * @return true if deletion was successful, false otherwise
     */
    public boolean deleteFile(String s3Key) {
        try {
            s3Client.deleteObject(deleteObjectRequest -> deleteObjectRequest
                    .bucket(bucketName)
                    .key(s3Key)
            );
            log.debug("Successfully deleted file from S3: {}", s3Key);
            return true;
        } catch (Exception e) {
            log.error("Failed to delete file from S3: {} - Error: {}", s3Key, e.getMessage(), e);
            return false;
        }
    }
    
    /**
     * Cleanup method to close presigner when component is destroyed
     */
    @PreDestroy
    public void cleanup() {
        if (presigner != null) {
            presigner.close();
        }
    }
}

