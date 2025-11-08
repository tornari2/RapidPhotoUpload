package com.rapidphoto.features.auth;

import com.rapidphoto.domain.User;
import com.rapidphoto.features.auth.dto.LoginResponse;
import com.rapidphoto.features.auth.repository.UserRepository;
import com.rapidphoto.infrastructure.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

/**
 * Unit tests for AuthService
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {
    
    @Mock
    private UserRepository userRepository;
    
    @Mock
    private JwtTokenProvider jwtTokenProvider;
    
    @Mock
    private PasswordEncoder passwordEncoder;
    
    @InjectMocks
    private AuthService authService;
    
    private User testUser;
    private String hashedPassword;
    
    @BeforeEach
    void setUp() {
        hashedPassword = "$2a$10$hashedpassword";
        testUser = User.builder()
                .id(UUID.randomUUID())
                .username("testuser")
                .passwordHash(hashedPassword)
                .build();
    }
    
    @Test
    void testAuthenticate_Success() {
        // Given
        String plainPassword = "password123";
        String token = "test-jwt-token";
        
        when(userRepository.findByUsername("testuser"))
                .thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches(plainPassword, hashedPassword))
                .thenReturn(true);
        when(jwtTokenProvider.generateToken(testUser.getId(), testUser.getUsername()))
                .thenReturn(token);
        when(jwtTokenProvider.getExpirationMs())
                .thenReturn(3600000L);
        
        // When
        LoginResponse response = authService.authenticate("testuser", plainPassword);
        
        // Then
        assertThat(response).isNotNull();
        assertThat(response.getToken()).isEqualTo(token);
        assertThat(response.getType()).isEqualTo("Bearer");
        assertThat(response.getUserId()).isEqualTo(testUser.getId());
        assertThat(response.getUsername()).isEqualTo("testuser");
        assertThat(response.getExpiresIn()).isEqualTo(3600L);
    }
    
    @Test
    void testAuthenticate_UserNotFound() {
        // Given
        when(userRepository.findByUsername("nonexistent"))
                .thenReturn(Optional.empty());
        
        // When/Then
        assertThatThrownBy(() -> authService.authenticate("nonexistent", "password"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid username or password");
    }
    
    @Test
    void testAuthenticate_InvalidPassword() {
        // Given
        when(userRepository.findByUsername("testuser"))
                .thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("wrongpassword", hashedPassword))
                .thenReturn(false);
        
        // When/Then
        assertThatThrownBy(() -> authService.authenticate("testuser", "wrongpassword"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid username or password");
    }
}

