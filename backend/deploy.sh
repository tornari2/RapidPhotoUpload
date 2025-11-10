#!/bin/bash

# Deployment script for AWS Elastic Beanstalk
# Prerequisites: AWS CLI and EB CLI installed, AWS credentials configured

echo "======================================"
echo "Deploying to AWS Elastic Beanstalk"
echo "======================================"

# Exit on error
set -e

# Navigate to backend directory
cd "$(dirname "$0")"

# Build the application
echo "Step 1: Building application..."
./build-for-eb.sh

# Deploy to Elastic Beanstalk
echo ""
echo "Step 2: Deploying to Elastic Beanstalk..."
eb deploy

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Check deployment status: eb status"
echo "View logs: eb logs"
echo "Open application: eb open"



