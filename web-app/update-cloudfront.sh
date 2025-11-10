#!/bin/bash

# Update CloudFront Distribution with Custom Error Pages
# This fixes the SPA routing issue where direct URLs return 404

set -e

echo "🚀 Updating CloudFront distribution for SPA routing..."

# Get your CloudFront distribution ID
# Replace YOUR_DISTRIBUTION_ID with your actual distribution ID
DISTRIBUTION_ID="${CLOUDFRONT_DISTRIBUTION_ID}"

if [ -z "$DISTRIBUTION_ID" ]; then
  echo "❌ Error: CLOUDFRONT_DISTRIBUTION_ID environment variable not set"
  echo "   Set it with: export CLOUDFRONT_DISTRIBUTION_ID=YOUR_DISTRIBUTION_ID"
  echo "   Find your distribution ID in AWS Console > CloudFront"
  exit 1
fi

echo "📋 Distribution ID: $DISTRIBUTION_ID"

# Get current distribution config
echo "📥 Fetching current distribution config..."
aws cloudfront get-distribution-config \
  --id $DISTRIBUTION_ID \
  --output json > /tmp/cloudfront-current-config.json

# Extract the ETag
ETAG=$(jq -r '.ETag' /tmp/cloudfront-current-config.json)
echo "🏷️  Current ETag: $ETAG"

# Extract and update the DistributionConfig
jq '.DistributionConfig' /tmp/cloudfront-current-config.json > /tmp/cloudfront-config-only.json

# Add custom error responses if not already present
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
}' /tmp/cloudfront-config-only.json > /tmp/cloudfront-updated-config.json

# Update the distribution
echo "🔄 Updating CloudFront distribution..."
aws cloudfront update-distribution \
  --id $DISTRIBUTION_ID \
  --distribution-config file:///tmp/cloudfront-updated-config.json \
  --if-match $ETAG

echo "✅ Distribution updated successfully!"
echo "⏳ CloudFront is now deploying the changes (this may take 5-15 minutes)"
echo "💡 You can monitor the status in AWS Console > CloudFront > Distributions"

# Optional: Create an invalidation to clear the cache
read -p "Do you want to create a cache invalidation? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "🗑️  Creating cache invalidation..."
  aws cloudfront create-invalidation \
    --distribution-id $DISTRIBUTION_ID \
    --paths "/*"
  echo "✅ Cache invalidation created!"
fi

echo "🎉 All done! Your SPA routing should work once the deployment completes."

