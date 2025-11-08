package com.rapidphoto.infrastructure.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit tests for JwtTokenProvider
 */
class JwtTokenProviderTest {
    
    private JwtTokenProvider jwtTokenProvider;
    private static final String TEST_SECRET = "test-secret-key-must-be-at-least-32-characters-long-for-hs256";
    private static final long TEST_EXPIRATION_MS = 3600000L; // 1 hour
    
    @BeforeEach
    void setUp() {
        jwtTokenProvider = new JwtTokenProvider(TEST_SECRET, TEST_EXPIRATION_MS);
    }
    
    @Test
    void testGenerateToken() {
        // Given
        UUID userId = UUID.randomUUID();
        String username = "testuser";
        
        // When
        String token = jwtTokenProvider.generateToken(userId, username);
        
        // Then
        assertThat(token).isNotNull();
        assertThat(token).isNotEmpty();
        assertThat(token.split("\\.")).hasSize(3); // JWT has 3 parts: header.payload.signature
    }
    
    @Test
    void testValidateToken_ValidToken() {
        // Given
        UUID userId = UUID.randomUUID();
        String username = "testuser";
        String token = jwtTokenProvider.generateToken(userId, username);
        
        // When
        boolean isValid = jwtTokenProvider.validateToken(token);
        
        // Then
        assertThat(isValid).isTrue();
    }
    
    @Test
    void testValidateToken_InvalidToken() {
        // Given
        String invalidToken = "invalid.token.here";
        
        // When
        boolean isValid = jwtTokenProvider.validateToken(invalidToken);
        
        // Then
        assertThat(isValid).isFalse();
    }
    
    @Test
    void testGetUserIdFromToken() {
        // Given
        UUID userId = UUID.randomUUID();
        String username = "testuser";
        String token = jwtTokenProvider.generateToken(userId, username);
        
        // When
        UUID extractedUserId = jwtTokenProvider.getUserIdFromToken(token);
        
        // Then
        assertThat(extractedUserId).isEqualTo(userId);
    }
    
    @Test
    void testGetUsernameFromToken() {
        // Given
        UUID userId = UUID.randomUUID();
        String username = "testuser";
        String token = jwtTokenProvider.generateToken(userId, username);
        
        // When
        String extractedUsername = jwtTokenProvider.getUsernameFromToken(token);
        
        // Then
        assertThat(extractedUsername).isEqualTo(username);
    }
    
    @Test
    void testSecretKeyTooShort() {
        // Given
        String shortSecret = "short";
        
        // When/Then
        assertThatThrownBy(() -> new JwtTokenProvider(shortSecret, TEST_EXPIRATION_MS))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("at least 32 characters");
    }
}

