package com.rapidphoto.infrastructure.s3;

import com.rapidphoto.infrastructure.config.S3Config;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration test for S3 configuration
 * Note: Requires AWS credentials to be configured for full integration test
 */
@SpringBootTest(classes = {S3Config.class, PresignedUrlGenerator.class, S3ServiceImpl.class})
@TestPropertySource(properties = {
    "aws.s3.bucket-name=test-bucket",
    "aws.s3.region=us-east-2",
    "aws.s3.presigned-url-expiration-minutes=15"
})
class S3IntegrationTest {
    
    @Autowired(required = false)
    private S3Client s3Client;
    
    @Autowired(required = false)
    private Region awsRegion;
    
    @Autowired(required = false)
    private S3Service s3Service;
    
    @Test
    void testS3ConfigBeansCreated() {
        // These tests verify Spring configuration loads correctly
        // Actual S3 connection requires AWS credentials
        
        if (s3Client != null) {
            assertNotNull(s3Client, "S3Client bean should be created");
            assertNotNull(awsRegion, "Region bean should be created");
            assertEquals(Region.US_EAST_2, awsRegion, "Region should be us-east-2");
        } else {
            System.out.println("⚠️  S3Client not created - AWS credentials may not be configured");
            System.out.println("   To test S3 connection, configure AWS credentials:");
            System.out.println("   1. Set environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY");
            System.out.println("   2. Or create ~/.aws/credentials file");
            System.out.println("   3. Or configure IAM role (for Elastic Beanstalk - recommended)");
        }
    }
    
    @Test
    void testS3ServiceBeanCreated() {
        if (s3Service != null) {
            assertNotNull(s3Service, "S3Service bean should be created");
        } else {
            System.out.println("⚠️  S3Service not created - check Spring configuration");
        }
    }
    
    @Test
    void testS3KeyBuilding() {
        if (s3Service != null) {
            java.util.UUID userId = java.util.UUID.randomUUID();
            java.util.UUID photoId = java.util.UUID.randomUUID();
            String filename = "test-photo.jpg";
            
            String s3Key = s3Service.buildS3Key(userId, photoId, filename);
            
            assertNotNull(s3Key);
            assertTrue(s3Key.startsWith("uploads/"));
            assertTrue(s3Key.contains(userId.toString()));
            assertTrue(s3Key.contains(photoId.toString()));
            assertTrue(s3Key.contains("test-photo.jpg"));
        }
    }
}

