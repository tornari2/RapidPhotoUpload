# CloudFront SPA Routing Fix

## Problem

When accessing routes directly (e.g., `https://your-domain.com/login`), CloudFront returns a 404 error:

```
404 Not Found
Code: NoSuchKey
Message: The specified key does not exist.
Key: login
```

This happens because CloudFront/S3 looks for a file called "login" which doesn't exist in the bucket.

## Root Cause

Single Page Applications (SPAs) like React use client-side routing. All routes should be handled by `index.html`, but CloudFront doesn't know this by default. When a user:

1. Visits `/login` directly (or refreshes the page on that route)
2. CloudFront tries to find a file named "login" in your S3 bucket
3. S3 returns a 404 because no such file exists
4. Without custom error handling, this 404 is shown to the user

## Solution

Configure CloudFront to redirect all 404 and 403 errors to `index.html` with a 200 status code. This allows React Router to take over and handle the routing.

## Implementation

### Option 1: Using the AWS CLI (Automated Script)

1. **Get your CloudFront Distribution ID**:
   - Go to AWS Console > CloudFront > Distributions
   - Copy your Distribution ID (e.g., `E1234ABCDEFGHI`)

2. **Set the environment variable**:
   ```bash
   export CLOUDFRONT_DISTRIBUTION_ID=YOUR_DISTRIBUTION_ID
   ```

3. **Run the update script**:
   ```bash
   cd web-app
   ./update-cloudfront.sh
   ```

4. **Wait for deployment** (5-15 minutes)
   - Monitor status in AWS Console > CloudFront

### Option 2: Using AWS Console (Manual)

1. Go to AWS Console > CloudFront > Distributions
2. Select your distribution
3. Go to the "Error Pages" tab
4. Click "Create Custom Error Response"
5. Configure for **404 errors**:
   - HTTP Error Code: `404`
   - Customize Error Response: `Yes`
   - Response Page Path: `/index.html`
   - HTTP Response Code: `200`
   - Error Caching Minimum TTL: `300`
6. Click "Create Custom Error Response"
7. Repeat steps 4-6 for **403 errors**
8. Wait for the distribution to deploy (5-15 minutes)

### Option 3: Using AWS CLI (Manual Commands)

```bash
# Get your distribution ID
DISTRIBUTION_ID="YOUR_DISTRIBUTION_ID"

# Fetch current config
aws cloudfront get-distribution-config \
  --id $DISTRIBUTION_ID \
  --output json > /tmp/current-config.json

# Extract ETag
ETAG=$(jq -r '.ETag' /tmp/current-config.json)

# Extract config
jq '.DistributionConfig' /tmp/current-config.json > /tmp/config.json

# Add custom error responses
jq '.CustomErrorResponses = {
  "Quantity": 2,
  "Items": [
    {
      "ErrorCode": 404,
      "ResponsePagePath": "/index.html",
      "ResponseCode": "200",
      "ErrorCachingMinTTL": 300
    },
    {
      "ErrorCode": 403,
      "ResponsePagePath": "/index.html",
      "ResponseCode": "200",
      "ErrorCachingMinTTL": 300
    }
  ]
}' /tmp/config.json > /tmp/updated-config.json

# Update distribution
aws cloudfront update-distribution \
  --id $DISTRIBUTION_ID \
  --distribution-config file:///tmp/updated-config.json \
  --if-match $ETAG
```

## What Changed

The CloudFront distribution now includes Custom Error Responses:

```json
"CustomErrorResponses": {
  "Quantity": 2,
  "Items": [
    {
      "ErrorCode": 404,
      "ResponsePagePath": "/index.html",
      "ResponseCode": "200",
      "ErrorCachingMinTTL": 300
    },
    {
      "ErrorCode": 403,
      "ResponsePagePath": "/index.html",
      "ResponseCode": "200",
      "ErrorCachingMinTTL": 300
    }
  ]
}
```

### Why Both 404 and 403?

- **404**: Returned when a file doesn't exist
- **403**: Sometimes returned by S3 for missing files when using certain configurations

Both need to redirect to `index.html` to ensure all routes work.

## Testing

After the CloudFront deployment completes:

1. **Test direct URL access**:
   ```bash
   curl -I https://your-domain.com/login
   # Should return 200 and serve index.html
   ```

2. **Test in browser**:
   - Visit `https://your-domain.com/login` directly
   - Should load the login page without errors
   - Refresh the page - should still work

3. **Test various routes**:
   - `/gallery`
   - `/settings`
   - Any other routes in your app

## Cache Invalidation

If you still see errors after deployment, create a cache invalidation:

```bash
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"
```

Or in AWS Console:
1. CloudFront > Distributions > Your Distribution
2. "Invalidations" tab
3. "Create Invalidation"
4. Paths: `/*`
5. "Create Invalidation"

## Verification

After applying the fix:

✅ Direct URL access works (e.g., `/login`, `/gallery`)  
✅ Page refreshes work without errors  
✅ Browser back/forward buttons work  
✅ Bookmarked deep links work  

## Related Files

- `cloudfront-rapidphoto-config.json` - Updated configuration template
- `web-app/update-cloudfront.sh` - Automated update script
- `web-app/public/_redirects` - Amplify-specific redirects (different system)
- `web-app/amplify.yml` - Amplify configuration with redirect rules

## Notes

- The `_redirects` file works for AWS Amplify hosting but not for CloudFront/S3
- CloudFront changes take 5-15 minutes to deploy globally
- Cache invalidations are free for the first 1,000 paths per month
- This configuration is standard for all SPAs (React, Vue, Angular, etc.)

## Troubleshooting

### Still seeing 404 errors?

1. **Check deployment status**: AWS Console > CloudFront > Your Distribution > Status should be "Deployed"
2. **Clear browser cache**: Hard refresh with Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
3. **Create cache invalidation**: Use the command above
4. **Verify configuration**: Check that CustomErrorResponses were added correctly

### Distribution update fails?

1. **Check AWS credentials**: Ensure AWS CLI is configured with proper permissions
2. **Verify distribution ID**: Double-check you're using the correct distribution ID
3. **Check ETag**: The ETag must match the current config version

## References

- [AWS CloudFront Custom Error Pages](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/GeneratingCustomErrorResponses.html)
- [SPA Routing with CloudFront](https://aws.amazon.com/premiumsupport/knowledge-center/cloudfront-serve-static-website/)

