-- Clear all data from the database
-- WARNING: This will delete ALL data from all tables!
-- Run this script at your own risk.

-- Disable foreign key checks temporarily (PostgreSQL doesn't support this, so we delete in order)
-- Delete in order to respect foreign key constraints:

-- 1. Delete junction table first (photo_tags)
DELETE FROM photo_tags;

-- 2. Delete upload events (references photos)
DELETE FROM upload_events;

-- 3. Delete photos (references users and upload_jobs)
DELETE FROM photos;

-- 4. Delete upload jobs (references users)
DELETE FROM upload_jobs;

-- 5. Delete tags (independent table)
DELETE FROM tags;

-- 6. Delete users (parent table, will cascade to related data)
DELETE FROM users;

-- Reset sequences (if any)
-- Note: photo_tags uses BIGSERIAL which has a sequence
-- Check and reset sequences
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') LOOP
        EXECUTE 'ALTER SEQUENCE ' || quote_ident(r.sequence_name) || ' RESTART WITH 1';
    END LOOP;
END $$;

-- Verify deletion
SELECT 
    'users' as table_name, COUNT(*) as remaining_rows FROM users
UNION ALL
SELECT 'upload_jobs', COUNT(*) FROM upload_jobs
UNION ALL
SELECT 'photos', COUNT(*) FROM photos
UNION ALL
SELECT 'upload_events', COUNT(*) FROM upload_events
UNION ALL
SELECT 'tags', COUNT(*) FROM tags
UNION ALL
SELECT 'photo_tags', COUNT(*) FROM photo_tags;

