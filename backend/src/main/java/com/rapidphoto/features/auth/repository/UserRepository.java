package com.rapidphoto.features.auth.repository;

import com.rapidphoto.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

/**
 * Repository for User entity (authentication context)
 */
@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    
    /**
     * Find user by username
     */
    Optional<User> findByUsername(String username);
}

