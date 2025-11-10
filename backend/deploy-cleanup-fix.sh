#!/bin/bash

# Emergency Deployment Script for Stalled Upload Cleanup
# This script will build and deploy the backend with the admin cleanup endpoints

set -e  # Exit on error

echo "========================================"
echo "Emergency Stalled Upload Cleanup Deploy"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check if we're in the right directory
if [ ! -f "pom.xml" ]; then
    echo -e "${RED}Error: pom.xml not found. Please run this script from the backend directory.${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Verifying new files exist...${NC}"
if [ ! -f "src/main/java/com/rapidphoto/infrastructure/config/AdminController.java" ]; then
    echo -e "${RED}Error: AdminController.java not found!${NC}"
    exit 1
fi

if [ ! -f "src/main/java/com/rapidphoto/features/upload_photo/StalledUploadCleanupService.java" ]; then
    echo -e "${RED}Error: StalledUploadCleanupService.java not found!${NC}"
    exit 1
fi

if [ ! -f "src/main/java/com/rapidphoto/infrastructure/config/SchedulingConfig.java" ]; then
    echo -e "${RED}Error: SchedulingConfig.java not found!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ All required files present${NC}"
echo ""

# Step 2: Clean and compile
echo -e "${YELLOW}Step 2: Cleaning and compiling backend...${NC}"
mvn clean compile
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Compilation failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Compilation successful${NC}"
echo ""

# Step 3: Run tests (optional - can skip with -DskipTests)
echo -e "${YELLOW}Step 3: Running tests...${NC}"
read -p "Run tests? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    mvn test
    if [ $? -ne 0 ]; then
        echo -e "${RED}Warning: Tests failed. Continue anyway? (y/N)${NC}"
        read -p "" -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
else
    echo -e "${YELLOW}Skipping tests${NC}"
fi
echo ""

# Step 4: Package
echo -e "${YELLOW}Step 4: Packaging application...${NC}"
mvn package -DskipTests
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Packaging failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Packaging successful${NC}"
echo ""

# Step 5: Deploy to Elastic Beanstalk
echo -e "${YELLOW}Step 5: Deploying to AWS Elastic Beanstalk...${NC}"
echo "This will deploy the backend with the new admin cleanup endpoints."
echo ""
read -p "Continue with deployment? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ./deploy.sh
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Deployment failed!${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Deployment successful${NC}"
else
    echo -e "${YELLOW}Deployment cancelled${NC}"
    exit 0
fi
echo ""

# Step 6: Wait for deployment to complete
echo -e "${YELLOW}Step 6: Waiting for deployment to complete...${NC}"
echo "This may take 2-5 minutes..."
echo ""
echo "You can monitor the deployment at:"
echo "https://console.aws.amazon.com/elasticbeanstalk/"
echo ""

# Step 7: Show next steps
echo -e "${GREEN}========================================"
echo "Deployment Complete!"
echo "========================================${NC}"
echo ""
echo "Next steps to clean up stalled uploads:"
echo ""
echo "1. Get your backend URL from AWS:"
echo "   https://console.aws.amazon.com/elasticbeanstalk/"
echo ""
echo "2. Login to your app and get a JWT token:"
echo "   Open browser console on https://d1burddp911hjd.cloudfront.net/"
echo "   After login, get token from localStorage or make a login API call"
echo ""
echo "3. Check stalled uploads count:"
echo "   curl -X GET \"https://YOUR_BACKEND_URL/api/admin/stalled-uploads/stats\" \\"
echo "     -H \"Authorization: Bearer YOUR_JWT_TOKEN\""
echo ""
echo "4. Clean up stalled uploads:"
echo "   curl -X DELETE \"https://YOUR_BACKEND_URL/api/admin/stalled-uploads/delete-all\" \\"
echo "     -H \"Authorization: Bearer YOUR_JWT_TOKEN\""
echo ""
echo -e "${YELLOW}IMPORTANT: The admin endpoints have NO authentication!${NC}"
echo -e "${YELLOW}After cleanup, either add auth or remove the AdminController.${NC}"
echo ""
echo "Full guide available at: ../STALLED_UPLOADS_CLEANUP_GUIDE.md"
echo ""

