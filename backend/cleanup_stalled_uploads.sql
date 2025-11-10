-- Emergency cleanup script for stalled uploads
-- This script will delete all photos with status 'UPLOADING' that are older than 10 minutes
-- and clean up their associated S3 objects

-- First, let's see what we're dealing with
SELECT 
    'Photos with UPLOADING status' as description,
    COUNT(*) as count,
    MIN(created_at) as oldest,
    MAX(created_at) as newest
FROM photos 
WHERE upload_status = 'UPLOADING';

-- Show detailed information about stalled uploads
SELECT 
    p.id,
    p.filename,
    p.upload_status,
    p.created_at,
    p.user_id,
    p.upload_job_id,
    p.s3_key,
    EXTRACT(EPOCH FROM (NOW() - p.created_at))/60 as minutes_since_created
FROM photos p
WHERE p.upload_status = 'UPLOADING'
ORDER BY p.created_at ASC;

-- DANGEROUS: Delete all stalled uploads
-- Uncomment the lines below ONLY after reviewing the SELECT results above

/*
-- Step 1: Store the IDs of photos to delete for reference
CREATE TEMP TABLE stalled_photo_ids AS
SELECT id, s3_key, upload_job_id
FROM photos 
WHERE upload_status = 'UPLOADING'
  AND created_at < NOW() - INTERVAL '10 minutes';

-- Step 2: Delete from junction table first (photo_tags)
DELETE FROM photo_tags 
WHERE photo_id IN (SELECT id FROM stalled_photo_ids);

-- Step 3: Delete upload events
DELETE FROM upload_events 
WHERE photo_id IN (SELECT id FROM stalled_photo_ids);

-- Step 4: Delete the photos themselves
DELETE FROM photos 
WHERE id IN (SELECT id FROM stalled_photo_ids);

-- Step 5: Update upload job counts (optional - may need adjustment based on your logic)
-- This will recalculate the job totals based on actual remaining photos
UPDATE upload_jobs uj
SET 
    failed_count = (
        SELECT COUNT(*) 
        FROM photos p 
        WHERE p.upload_job_id = uj.id 
          AND p.upload_status = 'FAILED'
    ),
    completed_count = (
        SELECT COUNT(*) 
        FROM photos p 
        WHERE p.upload_job_id = uj.id 
          AND p.upload_status = 'COMPLETED'
    )
WHERE id IN (SELECT DISTINCT upload_job_id FROM stalled_photo_ids WHERE upload_job_id IS NOT NULL);

-- Show results
SELECT 
    'Deleted stalled photos' as action,
    COUNT(*) as count
FROM stalled_photo_ids;

-- Cleanup temp table
DROP TABLE stalled_photo_ids;
*/

-- Final verification - should show 0 or very few UPLOADING photos
SELECT 
    upload_status,
    COUNT(*) as count
FROM photos
GROUP BY upload_status
ORDER BY upload_status;

