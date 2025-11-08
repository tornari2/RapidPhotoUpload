package com.rapidphoto.infrastructure.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;
import java.util.function.Function;

/**
 * JWT Token Provider for generating and validating JWT tokens
 */
@Component
public class JwtTokenProvider {
    
    private final SecretKey secretKey;
    private final long expirationMs;
    
    public JwtTokenProvider(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiration-ms:3600000}") long expirationMs) {
        // Ensure secret is at least 256 bits (32 bytes) for HS256
        if (secret.length() < 32) {
            throw new IllegalArgumentException("JWT secret must be at least 32 characters (256 bits)");
        }
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }
    
    /**
     * Generate JWT token for a user
     * 
     * @param userId User UUID
     * @param username Username
     * @return JWT token string
     */
    public String generateToken(UUID userId, String username) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expirationMs);
        
        return Jwts.builder()
                .subject(userId.toString())
                .claim("username", username)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(secretKey)
                .compact();
    }
    
    /**
     * Validate JWT token
     * 
     * @param token JWT token string
     * @return true if token is valid, false otherwise
     */
    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(secretKey)
                    .build()
                    .parseSignedClaims(token);
            return !isTokenExpired(token);
        } catch (Exception e) {
            return false;
        }
    }
    
    /**
     * Extract user ID from token
     * 
     * @param token JWT token string
     * @return User UUID
     */
    public UUID getUserIdFromToken(String token) {
        String subject = getClaimFromToken(token, Claims::getSubject);
        return UUID.fromString(subject);
    }
    
    /**
     * Extract username from token
     * 
     * @param token JWT token string
     * @return Username
     */
    public String getUsernameFromToken(String token) {
        return getClaimFromToken(token, claims -> claims.get("username", String.class));
    }
    
    /**
     * Check if token is expired
     * 
     * @param token JWT token string
     * @return true if expired, false otherwise
     */
    public boolean isTokenExpired(String token) {
        Date expiration = getClaimFromToken(token, Claims::getExpiration);
        return expiration.before(new Date());
    }
    
    /**
     * Extract a claim from token
     * 
     * @param token JWT token string
     * @param claimsResolver Function to extract claim
     * @return Claim value
     */
    private <T> T getClaimFromToken(String token, Function<Claims, T> claimsResolver) {
        Claims claims = getAllClaimsFromToken(token);
        return claimsResolver.apply(claims);
    }
    
    /**
     * Get all claims from token
     * 
     * @param token JWT token string
     * @return Claims object
     */
    private Claims getAllClaimsFromToken(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
    
    /**
     * Get token expiration time in milliseconds
     * 
     * @return Expiration time in milliseconds
     */
    public long getExpirationMs() {
        return expirationMs;
    }
}

