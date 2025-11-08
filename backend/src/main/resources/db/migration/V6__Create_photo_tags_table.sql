-- V6__Create_photo_tags_table.sql
-- Create photo_tags junction table for many-to-many relationship

CREATE TABLE photo_tags (
    photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (photo_id, tag_id)
);

CREATE INDEX idx_photo_tags_tag_id ON photo_tags(tag_id);
CREATE INDEX idx_photo_tags_photo_id ON photo_tags(photo_id);

