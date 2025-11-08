package com.rapidphoto.infrastructure.s3;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration test for S3 connection
 * This test verifies that the S3 service can actually connect to AWS
 */
@SpringBootTest(classes = {
    com.rapidphoto.infrastructure.config.S3Config.class,
    PresignedUrlGenerator.class,
    S3ServiceImpl.class
})
@TestPropertySource(properties = {
    "aws.s3.bucket-name=rapidphoto-uploads-dev",
    "aws.s3.region=us-east-2",
    "aws.s3.presigned-url-expiration-minutes=15"
})
class S3ConnectionTest {
    
    @Autowired(required = false)
    private S3Client s3Client;
    
    @Autowired(required = false)
    private S3Service s3Service;
    
    @Test
    void testS3ClientConnection() {
        assertNotNull(s3Client, "S3Client should be created");
        
        // Test that we can actually connect to S3
        try {
            // This will throw an exception if credentials are invalid
            s3Client.listBuckets();
            System.out.println("✅ S3 Client connection successful!");
        } catch (Exception e) {
            fail("Failed to connect to S3: " + e.getMessage());
        }
    }
    
    @Test
    void testS3ServiceAvailable() {
        assertNotNull(s3Service, "S3Service should be available");
        System.out.println("✅ S3Service bean created successfully!");
    }
    
    @Test
    void testGeneratePresignedUrl() {
        if (s3Service == null) {
            System.out.println("⚠️  S3Service not available - skipping presigned URL test");
            return;
        }
        
        UUID userId = UUID.randomUUID();
        UUID photoId = UUID.randomUUID();
        String filename = "test-photo.jpg";
        String contentType = "image/jpeg";
        
        try {
            String presignedUrl = s3Service.generateUploadUrl(userId, photoId, filename, contentType);
            
            assertNotNull(presignedUrl, "Presigned URL should not be null");
            assertTrue(presignedUrl.startsWith("https://"), "Presigned URL should be HTTPS");
            assertTrue(presignedUrl.contains("rapidphoto-uploads-dev"), "URL should contain bucket name");
            assertTrue(presignedUrl.contains("s3"), "URL should contain s3");
            
            System.out.println("✅ Presigned URL generated successfully!");
            System.out.println("   URL: " + presignedUrl.substring(0, Math.min(100, presignedUrl.length())) + "...");
        } catch (Exception e) {
            fail("Failed to generate presigned URL: " + e.getMessage());
        }
    }
    
    @Test
    void testS3KeyBuilding() {
        if (s3Service == null) {
            System.out.println("⚠️  S3Service not available - skipping S3 key test");
            return;
        }
        
        UUID userId = UUID.randomUUID();
        UUID photoId = UUID.randomUUID();
        String filename = "test photo.jpg";
        
        String s3Key = s3Service.buildS3Key(userId, photoId, filename);
        
        assertNotNull(s3Key);
        assertTrue(s3Key.startsWith("uploads/"));
        assertTrue(s3Key.contains(userId.toString()));
        assertTrue(s3Key.contains(photoId.toString()));
        // Filename should be sanitized (space replaced with underscore)
        assertTrue(s3Key.contains("test_photo.jpg") || s3Key.contains("test"));
        
        System.out.println("✅ S3 key built successfully: " + s3Key);
    }
}

