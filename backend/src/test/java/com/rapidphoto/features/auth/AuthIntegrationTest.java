package com.rapidphoto.features.auth;

import com.rapidphoto.domain.User;
import com.rapidphoto.features.auth.dto.LoginRequest;
import com.rapidphoto.features.auth.dto.LoginResponse;
import com.rapidphoto.features.auth.dto.RefreshTokenRequest;
import com.rapidphoto.features.auth.repository.UserRepository;
import com.rapidphoto.infrastructure.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration tests for authentication flow
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Transactional
public class AuthIntegrationTest {
    
    @LocalServerPort
    private int port;
    
    @Autowired
    private TestRestTemplate restTemplate;
    
    @Autowired
    private AuthService authService;
    
    @Autowired
    private JwtTokenProvider jwtTokenProvider;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    private User testUser;
    private String baseUrl;
    
    @BeforeEach
    void setUp() {
        baseUrl = "http://localhost:" + port;
        
        // Create test user
        testUser = User.builder()
                .username("testuser")
                .passwordHash(passwordEncoder.encode("password123"))
                .build();
        testUser = userRepository.save(testUser);
    }
    
    @Test
    void testLogin_Success() {
        LoginRequest request = LoginRequest.builder()
                .username("testuser")
                .password("password123")
                .build();
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<LoginRequest> entity = new HttpEntity<>(request, headers);
        
        ResponseEntity<LoginResponse> response = restTemplate.exchange(
                baseUrl + "/api/auth/login",
                HttpMethod.POST,
                entity,
                LoginResponse.class
        );
        
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getToken()).isNotNull();
        assertThat(response.getBody().getType()).isEqualTo("Bearer");
        assertThat(response.getBody().getUserId()).isEqualTo(testUser.getId());
        assertThat(response.getBody().getUsername()).isEqualTo("testuser");
        assertThat(response.getBody().getExpiresIn()).isNotNull();
    }
    
    @Test
    void testLogin_InvalidCredentials() {
        LoginRequest request = LoginRequest.builder()
                .username("testuser")
                .password("wrongpassword")
                .build();
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<LoginRequest> entity = new HttpEntity<>(request, headers);
        
        ResponseEntity<?> response = restTemplate.exchange(
                baseUrl + "/api/auth/login",
                HttpMethod.POST,
                entity,
                Object.class
        );
        
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
    
    @Test
    void testLogin_UserNotFound() {
        LoginRequest request = LoginRequest.builder()
                .username("nonexistent")
                .password("password123")
                .build();
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<LoginRequest> entity = new HttpEntity<>(request, headers);
        
        ResponseEntity<?> response = restTemplate.exchange(
                baseUrl + "/api/auth/login",
                HttpMethod.POST,
                entity,
                Object.class
        );
        
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
    
    @Test
    void testRefreshToken_Success() {
        // First, login to get a token
        LoginResponse loginResponse = authService.authenticate("testuser", "password123");
        String token = loginResponse.getToken();
        
        // Refresh the token
        RefreshTokenRequest refreshRequest = RefreshTokenRequest.builder()
                .token(token)
                .build();
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<RefreshTokenRequest> entity = new HttpEntity<>(refreshRequest, headers);
        
        ResponseEntity<LoginResponse> response = restTemplate.exchange(
                baseUrl + "/api/auth/refresh",
                HttpMethod.POST,
                entity,
                LoginResponse.class
        );
        
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getToken()).isNotNull();
        assertThat(response.getBody().getToken()).isNotEqualTo(token); // New token
        assertThat(response.getBody().getUserId()).isEqualTo(testUser.getId());
        assertThat(response.getBody().getUsername()).isEqualTo("testuser");
    }
    
    @Test
    void testRefreshToken_InvalidToken() {
        RefreshTokenRequest refreshRequest = RefreshTokenRequest.builder()
                .token("invalid.token.here")
                .build();
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<RefreshTokenRequest> entity = new HttpEntity<>(refreshRequest, headers);
        
        ResponseEntity<?> response = restTemplate.exchange(
                baseUrl + "/api/auth/refresh",
                HttpMethod.POST,
                entity,
                Object.class
        );
        
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
    
    @Test
    void testProtectedEndpoint_WithValidToken() {
        // Login to get token
        LoginResponse loginResponse = authService.authenticate("testuser", "password123");
        String token = loginResponse.getToken();
        
        // Try to access a protected endpoint
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        HttpEntity<?> entity = new HttpEntity<>(headers);
        
        // Try to access photos endpoint (protected)
        ResponseEntity<?> response = restTemplate.exchange(
                baseUrl + "/api/photos?userId=" + testUser.getId(),
                HttpMethod.GET,
                entity,
                Object.class
        );
        
        // Should not return 401 Unauthorized (might return 200 or 400/404 depending on implementation)
        assertThat(response.getStatusCode()).isNotEqualTo(HttpStatus.UNAUTHORIZED);
    }
    
    @Test
    void testProtectedEndpoint_WithoutToken() {
        // Try to access a protected endpoint without token
        HttpHeaders headers = new HttpHeaders();
        HttpEntity<?> entity = new HttpEntity<>(headers);
        
        ResponseEntity<?> response = restTemplate.exchange(
                baseUrl + "/api/photos?userId=" + testUser.getId(),
                HttpMethod.GET,
                entity,
                Object.class
        );
        
        // Should return 401 Unauthorized
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
    
    @Test
    void testProtectedEndpoint_WithInvalidToken() {
        // Try to access a protected endpoint with invalid token
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth("invalid.token.here");
        HttpEntity<?> entity = new HttpEntity<>(headers);
        
        ResponseEntity<?> response = restTemplate.exchange(
                baseUrl + "/api/photos?userId=" + testUser.getId(),
                HttpMethod.GET,
                entity,
                Object.class
        );
        
        // Should return 401 Unauthorized
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
    
    @Test
    void testPublicEndpoint_WithoutToken() {
        // Try to access a public endpoint without token
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        LoginRequest request = LoginRequest.builder()
                .username("testuser")
                .password("password123")
                .build();
        HttpEntity<LoginRequest> entity = new HttpEntity<>(request, headers);
        
        ResponseEntity<?> response = restTemplate.exchange(
                baseUrl + "/api/auth/login",
                HttpMethod.POST,
                entity,
                Object.class
        );
        
        // Should succeed (public endpoint)
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }
}

