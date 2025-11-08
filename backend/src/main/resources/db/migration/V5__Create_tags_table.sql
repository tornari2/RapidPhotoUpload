-- V5__Create_tags_table.sql
-- Create tags table for photo categorization

CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tags_name ON tags(name);

-- Add constraint to ensure tag name is not empty
ALTER TABLE tags ADD CONSTRAINT chk_tags_name_length 
    CHECK (LENGTH(TRIM(name)) > 0);

