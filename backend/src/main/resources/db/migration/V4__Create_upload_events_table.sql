-- V4__Create_upload_events_table.sql
-- Create upload_events table for tracking upload lifecycle events

CREATE TABLE upload_events (
    id BIGSERIAL PRIMARY KEY,
    photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    message TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_upload_events_photo_id ON upload_events(photo_id);
CREATE INDEX idx_upload_events_created_at ON upload_events(created_at);
CREATE INDEX idx_upload_events_event_type ON upload_events(event_type);

-- Add constraint to ensure event_type is valid
ALTER TABLE upload_events ADD CONSTRAINT chk_upload_events_type 
    CHECK (event_type IN ('STARTED', 'PROGRESS', 'COMPLETED', 'FAILED', 'RETRY'));

-- Add GIN index for JSONB metadata queries
CREATE INDEX idx_upload_events_metadata ON upload_events USING GIN (metadata);

