package com.rapidphoto.features.auth;

import com.rapidphoto.features.auth.dto.LoginRequest;
import com.rapidphoto.features.auth.dto.LoginResponse;
import com.rapidphoto.features.auth.dto.RefreshTokenRequest;
import com.rapidphoto.features.auth.dto.RegisterRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for authentication operations
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {
    
    private final AuthService authService;
    
    /**
     * Register endpoint
     * Creates a new user account and returns JWT token
     * 
     * @param request Register request with username and password
     * @return LoginResponse with JWT token
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        log.info("Registration attempt for username: {}", request.getUsername());
        
        try {
            LoginResponse response = authService.register(
                    request.getUsername(),
                    request.getPassword()
            );
            log.info("Registration successful for user: {}", request.getUsername());
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            log.warn("Registration failed for username: {} - {}", request.getUsername(), e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse(e.getMessage()));
        } catch (Exception e) {
            log.error("Unexpected error during registration for username: {}", request.getUsername(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("An error occurred during registration"));
        }
    }
    
    /**
     * Login endpoint
     * Authenticates user and returns JWT token
     * 
     * @param request Login request with username and password
     * @return LoginResponse with JWT token
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        log.info("Login attempt for username: {}", request.getUsername());
        
        try {
            LoginResponse response = authService.authenticate(
                    request.getUsername(),
                    request.getPassword()
            );
            log.info("Login successful for user: {}", request.getUsername());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.warn("Login failed for username: {} - {}", request.getUsername(), e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ErrorResponse("Invalid username or password"));
        } catch (Exception e) {
            log.error("Unexpected error during login for username: {}", request.getUsername(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("An error occurred during authentication"));
        }
    }
    
    /**
     * Refresh token endpoint
     * Issues a new JWT token if the provided token is valid
     * 
     * @param request RefreshTokenRequest containing current token
     * @return LoginResponse with new JWT token
     */
    @PostMapping("/refresh")
    public ResponseEntity<?> refreshToken(@Valid @RequestBody RefreshTokenRequest request) {
        log.info("Token refresh request");
        
        try {
            LoginResponse response = authService.refreshToken(request.getToken());
            log.info("Token refresh successful");
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.warn("Token refresh failed - {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ErrorResponse("Invalid or expired token"));
        } catch (Exception e) {
            log.error("Unexpected error during token refresh", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("An error occurred during token refresh"));
        }
    }
    
    /**
     * Error response DTO
     */
    private record ErrorResponse(String error) {}
}

