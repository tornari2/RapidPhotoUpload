package com.rapidphoto.domain;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class TagTest {
    
    private Tag tag;
    
    @BeforeEach
    void setUp() {
        tag = Tag.builder()
                .name("Nature")
                .build();
    }
    
    @Test
    void testTagCreation() {
        assertNotNull(tag);
        assertEquals("Nature", tag.getName());
    }
    
    @Test
    void testNormalizeName() {
        tag.setName("  UPPERCASE TAG  ");
        tag.normalizeName();
        assertEquals("uppercase tag", tag.getName());
    }
    
    @Test
    void testPrePersist_NormalizesName() {
        Tag newTag = Tag.builder()
                .name("  MIXED Case Tag  ")
                .build();
        newTag.onCreate();
        assertEquals("mixed case tag", newTag.getName());
        assertNotNull(newTag.getCreatedAt());
    }
    
    @Test
    void testPrePersist_SetsCreatedAt() {
        Tag newTag = new Tag();
        newTag.onCreate();
        assertNotNull(newTag.getCreatedAt());
    }
}

