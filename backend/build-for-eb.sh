#!/bin/bash

# Build script for AWS Elastic Beanstalk deployment
# This script packages the Spring Boot application as a JAR file

echo "======================================"
echo "Building RapidPhotoUpload for AWS EB"
echo "======================================"

# Exit on error
set -e

# Navigate to backend directory
cd "$(dirname "$0")"

# Clean and package
echo "Running Maven clean and package..."
./mvnw clean package -DskipTests

# Check if build was successful
if [ -f "target/rapid-photo-upload-0.0.1-SNAPSHOT.jar" ]; then
    echo ""
    echo "✅ Build successful!"
    echo "JAR file location: target/rapid-photo-upload-0.0.1-SNAPSHOT.jar"
    echo ""
    echo "Next steps:"
    echo "1. Initialize Elastic Beanstalk: eb init"
    echo "2. Create environment: eb create"
    echo "3. Deploy: eb deploy"
    echo ""
else
    echo ""
    echo "❌ Build failed!"
    exit 1
fi

