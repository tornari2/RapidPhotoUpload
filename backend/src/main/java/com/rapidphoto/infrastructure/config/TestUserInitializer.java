package com.rapidphoto.infrastructure.config;

import com.rapidphoto.domain.User;
import com.rapidphoto.features.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Creates a test user on application startup if it doesn't exist
 * Useful for development and testing
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class TestUserInitializer implements CommandLineRunner {
    
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    
    @Override
    public void run(String... args) {
        // Only create test user if it doesn't exist
        if (userRepository.findByUsername("testuser").isEmpty()) {
            User testUser = User.builder()
                    .username("testuser")
                    .passwordHash(passwordEncoder.encode("password123"))
                    .build();
            
            userRepository.save(testUser);
            log.info("Created test user: testuser / password123");
        } else {
            log.debug("Test user already exists");
        }
    }
}

