# Emergency Cleanup Guide for Stalled Uploads

## Problem
Your production application at https://d1burddp911hjd.cloudfront.net/ has over 100 images stuck in "UPLOADING" status that need to be deleted.

## Solution Overview
I've created three methods to clean up the stalled uploads:
1. **Automated cleanup** - Deploy the fix so it cleans up automatically
2. **API endpoints** - Call admin endpoints to trigger manual cleanup
3. **Direct database cleanup** - Run SQL script directly on the production database

---

## Method 1: Deploy Automated Cleanup (Recommended)

The `StalledUploadCleanupService` is already implemented but needs to be deployed.

### Steps:

1. **Verify the service is enabled:**
   Check that `SchedulingConfig.java` exists and has `@EnableScheduling`:

   ```bash
   cat backend/src/main/java/com/rapidphoto/infrastructure/config/SchedulingConfig.java
   ```

2. **Build and deploy the backend:**
   ```bash
   cd backend
   ./build-for-eb.sh
   ./deploy.sh
   ```

3. **Monitor the cleanup:**
   The service runs every 5 minutes and cleans up uploads older than 10 minutes.
   Check the CloudWatch logs for messages like:
   ```
   "Found X stalled uploads older than 10 minutes. Initiating cleanup."
   ```

---

## Method 2: Use Admin API Endpoints (Quick Fix)

I've created admin endpoints that you can call immediately.

### Step 1: Deploy the AdminController

First, you need to build and deploy the new `AdminController.java`:

```bash
cd backend
mvn clean package -DskipTests
./deploy.sh
```

### Step 2: Call the Admin Endpoints

Once deployed, use these curl commands:

#### A. Check How Many Stalled Uploads Exist
```bash
curl -X GET "https://YOUR_BACKEND_URL/api/admin/stalled-uploads/stats?thresholdMinutes=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Response example:
```json
{
  "stalledCount": 120,
  "thresholdMinutes": 10,
  "cutoffTime": "2025-11-10T10:30:00",
  "currentTime": "2025-11-10T10:40:00",
  "oldestUpload": "2025-11-10T08:00:00",
  "newestUpload": "2025-11-10T10:30:00"
}
```

#### B. Trigger Cleanup (Marks as FAILED but keeps records)
```bash
curl -X POST "https://YOUR_BACKEND_URL/api/admin/stalled-uploads/cleanup" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

This will:
- Mark stalled photos as FAILED (not UPLOADING)
- Delete partial S3 objects
- Update upload job statistics
- Keep records in database for audit

#### C. DELETE All Stalled Uploads (Nuclear Option)
⚠️ **WARNING: This permanently deletes the photos from both database and S3**

```bash
curl -X DELETE "https://YOUR_BACKEND_URL/api/admin/stalled-uploads/delete-all?thresholdMinutes=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Response example:
```json
{
  "success": true,
  "totalDeleted": 120,
  "s3ObjectsDeleted": 115,
  "s3DeletesFailed": 5,
  "thresholdMinutes": 10,
  "cutoffTime": "2025-11-10T10:30:00"
}
```

---

## Method 3: Direct Database Cleanup (Emergency)

If you need immediate cleanup and can't wait for deployment, run the SQL script directly.

### Steps:

1. **Connect to your production database:**
   ```bash
   # Get connection details from your AWS RDS console or environment variables
   psql -h YOUR_RDS_ENDPOINT -U YOUR_USERNAME -d YOUR_DATABASE_NAME
   ```

2. **Run the cleanup script:**
   ```bash
   psql -h YOUR_RDS_ENDPOINT -U YOUR_USERNAME -d YOUR_DATABASE_NAME -f backend/cleanup_stalled_uploads.sql
   ```

3. **Review the output:**
   The script will first show you what will be deleted. If you're satisfied, uncomment the DELETE statements in the SQL file and run again.

### Manual SQL Commands (if needed):

```sql
-- 1. Check how many stalled uploads exist
SELECT COUNT(*) FROM photos WHERE upload_status = 'UPLOADING';

-- 2. See details of stalled uploads
SELECT id, filename, created_at, s3_key 
FROM photos 
WHERE upload_status = 'UPLOADING' 
ORDER BY created_at ASC;

-- 3. Delete stalled uploads (DANGEROUS - make sure you want to do this!)
BEGIN;

-- Delete from junction table
DELETE FROM photo_tags WHERE photo_id IN (
  SELECT id FROM photos WHERE upload_status = 'UPLOADING'
);

-- Delete upload events
DELETE FROM upload_events WHERE photo_id IN (
  SELECT id FROM photos WHERE upload_status = 'UPLOADING'
);

-- Delete the photos
DELETE FROM photos WHERE upload_status = 'UPLOADING';

-- Check results
SELECT upload_status, COUNT(*) FROM photos GROUP BY upload_status;

-- If everything looks good:
COMMIT;
-- If something went wrong:
-- ROLLBACK;
```

---

## Important Notes

### Security Considerations
⚠️ **The admin endpoints have NO authentication yet!**

For production, you should:
1. Add admin authentication to `AdminController.java`
2. Or remove the endpoints after cleanup
3. Or restrict access via API Gateway/firewall rules

### S3 Cleanup
The stalled photos may have partial objects in S3. The cleanup service and DELETE endpoint will attempt to remove them, but you may need to:

1. **Check S3 for orphaned objects:**
   ```bash
   aws s3 ls s3://YOUR_BUCKET_NAME/ --recursive | grep -E "uploading|temp"
   ```

2. **Set up S3 Lifecycle policy** to auto-delete incomplete uploads:
   ```json
   {
     "Rules": [
       {
         "Id": "DeleteIncompleteUploads",
         "Status": "Enabled",
         "AbortIncompleteMultipartUpload": {
           "DaysAfterInitiation": 1
         }
       }
     ]
   }
   ```

### Why This Happened

Stalled uploads can occur due to:
- Network interruptions during upload
- Client-side crashes or page refreshes
- Server timeouts
- Browser closing before upload completes

### Prevention

The `StalledUploadCleanupService` should prevent this in the future by:
- Running every 5 minutes (configurable via `PHOTO_UPLOAD_CLEANUP_INTERVAL_MS`)
- Marking uploads as FAILED if they've been UPLOADING for more than 10 minutes (configurable via `PHOTO_UPLOAD_STALLED_THRESHOLD_MINUTES`)
- Cleaning up S3 objects
- Updating job statistics

---

## Recommended Action Plan

1. ✅ **Immediate:** Use Method 2B (POST cleanup endpoint) to mark stalled as FAILED
2. ✅ **If needed:** Use Method 2C (DELETE endpoint) to permanently remove them
3. ✅ **Long-term:** Ensure Method 1 (automated cleanup) is deployed and running
4. ✅ **Security:** Add authentication to admin endpoints or remove them after cleanup
5. ✅ **Monitoring:** Set up CloudWatch alerts for high UPLOADING photo counts

---

## Verification

After cleanup, verify success:

```bash
# Check database stats
curl -X GET "https://YOUR_BACKEND_URL/api/admin/stats" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Should show:
# - totalPhotos: reduced count
# - photosByStatus.UPLOADING: should be 0 or very low
# - photosByStatus.COMPLETED: your completed photos
# - photosByStatus.FAILED: any legitimately failed uploads
```

---

## Questions?

If you encounter issues:
1. Check CloudWatch logs for error messages
2. Verify database connection
3. Check S3 bucket permissions
4. Verify the backend deployment was successful

