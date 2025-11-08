package com.rapidphoto.domain;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class UserTest {
    
    private User user;
    
    @BeforeEach
    void setUp() {
        user = User.builder()
                .username("testuser")
                .passwordHash("hashedpassword")
                .build();
    }
    
    @Test
    void testUserCreation() {
        assertNotNull(user);
        assertEquals("testuser", user.getUsername());
        assertEquals("hashedpassword", user.getPasswordHash());
    }
    
    @Test
    void testCanPerformOperations_WithValidUser() {
        user.setId(UUID.randomUUID());
        assertTrue(user.canPerformOperations());
    }
    
    @Test
    void testCanPerformOperations_WithoutId() {
        user.setId(null);
        assertFalse(user.canPerformOperations());
    }
    
    @Test
    void testCanPerformOperations_WithBlankUsername() {
        user.setId(UUID.randomUUID());
        user.setUsername("");
        assertFalse(user.canPerformOperations());
    }
    
    @Test
    void testCreatedAtSetOnPersist() {
        assertNull(user.getCreatedAt());
        // Simulate @PrePersist
        user.onCreate();
        assertNotNull(user.getCreatedAt());
        assertTrue(user.getCreatedAt().isBefore(LocalDateTime.now().plusSeconds(1)));
    }
}

