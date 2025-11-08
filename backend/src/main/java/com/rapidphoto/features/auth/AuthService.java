package com.rapidphoto.features.auth;

import com.rapidphoto.domain.User;
import com.rapidphoto.features.auth.dto.LoginResponse;
import com.rapidphoto.features.auth.repository.UserRepository;
import com.rapidphoto.infrastructure.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Authentication service for user login, registration, and JWT token generation
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {
    
    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;
    
    /**
     * Register a new user and generate JWT token
     * 
     * @param username Username (must be unique)
     * @param password Plain text password
     * @return LoginResponse with JWT token
     * @throws IllegalArgumentException if username already exists or validation fails
     */
    @Transactional
    public LoginResponse register(String username, String password) {
        log.debug("Attempting registration for username: {}", username);
        
        // Check if username already exists
        if (userRepository.findByUsername(username).isPresent()) {
            log.warn("Registration failed: Username already exists - {}", username);
            throw new IllegalArgumentException("Username already exists");
        }
        
        // Create new user
        User newUser = User.builder()
                .username(username)
                .passwordHash(passwordEncoder.encode(password))
                .build();
        
        newUser = userRepository.save(newUser);
        log.info("User registered successfully: {}", username);
        
        // Generate JWT token
        String token = jwtTokenProvider.generateToken(newUser.getId(), newUser.getUsername());
        
        // Build response
        return LoginResponse.builder()
                .token(token)
                .type("Bearer")
                .expiresIn(jwtTokenProvider.getExpirationMs() / 1000) // Convert to seconds
                .userId(newUser.getId())
                .username(newUser.getUsername())
                .build();
    }
    
    /**
     * Authenticate user and generate JWT token
     * 
     * @param username Username
     * @param password Plain text password
     * @return LoginResponse with JWT token
     * @throws IllegalArgumentException if credentials are invalid
     */
    public LoginResponse authenticate(String username, String password) {
        log.debug("Attempting authentication for username: {}", username);
        
        // Find user by username
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> {
                    log.warn("Authentication failed: User not found - {}", username);
                    return new IllegalArgumentException("Invalid username or password");
                });
        
        // Verify password
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            log.warn("Authentication failed: Invalid password for user - {}", username);
            throw new IllegalArgumentException("Invalid username or password");
        }
        
        // Generate JWT token
        String token = jwtTokenProvider.generateToken(user.getId(), user.getUsername());
        log.info("Authentication successful for user: {}", username);
        
        // Build response
        return LoginResponse.builder()
                .token(token)
                .type("Bearer")
                .expiresIn(jwtTokenProvider.getExpirationMs() / 1000) // Convert to seconds
                .userId(user.getId())
                .username(user.getUsername())
                .build();
    }
    
    /**
     * Refresh JWT token
     * Validates the current token and issues a new one if valid
     * 
     * @param token Current JWT token
     * @return LoginResponse with new JWT token
     * @throws IllegalArgumentException if token is invalid or expired
     */
    public LoginResponse refreshToken(String token) {
        log.debug("Attempting token refresh");
        
        // Validate token
        if (!jwtTokenProvider.validateToken(token)) {
            log.warn("Token refresh failed: Invalid or expired token");
            throw new IllegalArgumentException("Invalid or expired token");
        }
        
        // Extract user information from token
        UUID userId = jwtTokenProvider.getUserIdFromToken(token);
        String username = jwtTokenProvider.getUsernameFromToken(token);
        
        // Verify user still exists
        User user = userRepository.findById(userId)
                .orElseThrow(() -> {
                    log.warn("Token refresh failed: User not found - {}", userId);
                    return new IllegalArgumentException("User not found");
                });
        
        // Generate new token
        String newToken = jwtTokenProvider.generateToken(user.getId(), user.getUsername());
        log.info("Token refreshed successfully for user: {}", username);
        
        // Build response
        return LoginResponse.builder()
                .token(newToken)
                .type("Bearer")
                .expiresIn(jwtTokenProvider.getExpirationMs() / 1000) // Convert to seconds
                .userId(user.getId())
                .username(user.getUsername())
                .build();
    }
}

