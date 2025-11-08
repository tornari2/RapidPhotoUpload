package com.rapidphoto.infrastructure.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

/**
 * AWS S3 Client Configuration
 * Configures the S3 client for presigned URL generation and file operations
 */
@Configuration
public class S3Config {
    
    @Value("${aws.s3.region:us-east-2}")
    private String region;
    
    @Bean
    public S3Client s3Client() {
        return S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(DefaultCredentialsProvider.create())
                .build();
    }
    
    @Bean
    public Region awsRegion() {
        return Region.of(region);
    }
}

