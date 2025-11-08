package com.rapidphoto.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Tag domain entity for categorizing photos
 * Domain rules:
 * - Tag names must be unique
 * - Tags can be associated with multiple photos
 */
@Entity
@Table(name = "tags")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Tag {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    private UUID id;
    
    @Column(name = "name", unique = true, nullable = false, length = 100)
    @NotBlank(message = "Tag name is required")
    @Size(min = 1, max = 100, message = "Tag name must be between 1 and 100 characters")
    private String name;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (name != null) {
            name = name.trim().toLowerCase();
        }
    }
    
    /**
     * Domain method: Normalize tag name
     */
    public void normalizeName() {
        if (name != null) {
            this.name = name.trim().toLowerCase();
        }
    }
}

