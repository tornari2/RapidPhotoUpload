#!/bin/bash
# Auto-cleanup script for stalled uploads
# Run this every minute: */1 * * * * /path/to/auto-cleanup-stalled.sh

PGPASSWORD='g8tlWLabSMgnuTiH5AoNG9ujk' psql -h rapid-photo-upload-db.c1uuigcm4bd1.us-east-2.rds.amazonaws.com -U photoadmin -d rapidphotodb << 'EOF'
BEGIN;
DELETE FROM photo_tags WHERE photo_id IN (
  SELECT id FROM photos 
  WHERE upload_status = 'UPLOADING' 
  AND created_at < NOW() - INTERVAL '2 minutes'
);
DELETE FROM upload_events WHERE photo_id IN (
  SELECT id FROM photos 
  WHERE upload_status = 'UPLOADING' 
  AND created_at < NOW() - INTERVAL '2 minutes'
);
DELETE FROM photos 
WHERE upload_status = 'UPLOADING' 
AND created_at < NOW() - INTERVAL '2 minutes';
COMMIT;
EOF

