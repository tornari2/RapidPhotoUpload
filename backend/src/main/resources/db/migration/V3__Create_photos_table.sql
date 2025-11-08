-- V3__Create_photos_table.sql
-- Create photos table for individual photo metadata

CREATE TABLE photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    upload_job_id UUID REFERENCES upload_jobs(id) ON DELETE SET NULL,
    filename VARCHAR(500) NOT NULL,
    s3_key VARCHAR(1000) NOT NULL UNIQUE,
    file_size BIGINT NOT NULL,
    content_type VARCHAR(100),
    upload_status VARCHAR(50) NOT NULL,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX idx_photos_user_id ON photos(user_id);
CREATE INDEX idx_photos_upload_job_id ON photos(upload_job_id);
CREATE INDEX idx_photos_upload_status ON photos(upload_status);
CREATE INDEX idx_photos_s3_key ON photos(s3_key);

-- Add constraint to ensure status is valid
ALTER TABLE photos ADD CONSTRAINT chk_photos_status 
    CHECK (upload_status IN ('UPLOADING', 'COMPLETED', 'FAILED'));

-- Add constraint to ensure file_size is positive
ALTER TABLE photos ADD CONSTRAINT chk_photos_file_size 
    CHECK (file_size > 0);

-- Add constraint to ensure retry_count is non-negative
ALTER TABLE photos ADD CONSTRAINT chk_photos_retry_count 
    CHECK (retry_count >= 0);

