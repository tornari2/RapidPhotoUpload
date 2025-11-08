-- V2__Create_upload_jobs_table.sql
-- Create upload_jobs table for batch upload tracking

CREATE TABLE upload_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_count INTEGER NOT NULL,
    completed_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_upload_jobs_user_id ON upload_jobs(user_id);
CREATE INDEX idx_upload_jobs_status ON upload_jobs(status);

-- Add constraint to ensure status is valid
ALTER TABLE upload_jobs ADD CONSTRAINT chk_upload_jobs_status 
    CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'PARTIAL_SUCCESS', 'FAILED'));

-- Add constraint to ensure counts are non-negative
ALTER TABLE upload_jobs ADD CONSTRAINT chk_upload_jobs_counts 
    CHECK (total_count >= 0 AND completed_count >= 0 AND failed_count >= 0);

-- Add constraint to ensure counts don't exceed total
ALTER TABLE upload_jobs ADD CONSTRAINT chk_upload_jobs_count_total 
    CHECK (completed_count + failed_count <= total_count);

