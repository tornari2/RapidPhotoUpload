#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Rapid Photo Upload - AWS Setup${NC}"
echo -e "${BLUE}========================================${NC}"

# Configuration
APP_NAME="rapid-photo-upload"
ENV_NAME="rapid-photo-upload-env"
REGION="us-east-2"
DB_NAME="rapidphotodb"
DB_USERNAME="photoadmin"
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
S3_BUCKET_NAME="${APP_NAME}-photos-$(date +%s)"

echo -e "\n${GREEN}Configuration:${NC}"
echo "App Name: $APP_NAME"
echo "Environment: $ENV_NAME"
echo "Region: $REGION"
echo "S3 Bucket: $S3_BUCKET_NAME"
echo "DB Name: $DB_NAME"
echo "DB Username: $DB_USERNAME"
echo "DB Password: $DB_PASSWORD"

# Save configuration
CONFIG_FILE="aws-config.txt"
cat > $CONFIG_FILE << EOF
AWS Configuration for Rapid Photo Upload
Generated: $(date)
========================================
Application Name: $APP_NAME
Environment Name: $ENV_NAME
Region: $REGION

S3 Bucket: $S3_BUCKET_NAME

Database Information:
  Endpoint: (will be populated after creation)
  Database Name: $DB_NAME
  Username: $DB_USERNAME
  Password: $DB_PASSWORD

IMPORTANT: Save this file securely and do not commit to git!
EOF

echo -e "\n${GREEN}✓ Configuration saved to $CONFIG_FILE${NC}"

# Step 1: Create S3 Bucket
echo -e "\n${BLUE}Step 1: Creating S3 Bucket...${NC}"
aws s3api create-bucket \
  --bucket $S3_BUCKET_NAME \
  --region $REGION \
  --create-bucket-configuration LocationConstraint=$REGION

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket $S3_BUCKET_NAME \
  --versioning-configuration Status=Enabled

# Configure CORS
cat > /tmp/cors.json << 'EOF'
{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "MaxAgeSeconds": 3000
    }
  ]
}
EOF

aws s3api put-bucket-cors \
  --bucket $S3_BUCKET_NAME \
  --cors-configuration file:///tmp/cors.json

echo -e "${GREEN}✓ S3 Bucket created: $S3_BUCKET_NAME${NC}"

# Step 2: Create RDS Security Group
echo -e "\n${BLUE}Step 2: Creating RDS Security Group...${NC}"
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text --region $REGION)
echo "Using VPC: $VPC_ID"

RDS_SG_ID=$(aws ec2 create-security-group \
  --group-name "${APP_NAME}-rds-sg" \
  --description "Security group for RDS PostgreSQL" \
  --vpc-id $VPC_ID \
  --region $REGION \
  --query 'GroupId' \
  --output text)

echo -e "${GREEN}✓ RDS Security Group created: $RDS_SG_ID${NC}"

# Step 3: Create DB Subnet Group
echo -e "\n${BLUE}Step 3: Creating DB Subnet Group...${NC}"
SUBNET_IDS=$(aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --query "Subnets[*].SubnetId" \
  --output text \
  --region $REGION)

SUBNET_ARRAY=($SUBNET_IDS)
aws rds create-db-subnet-group \
  --db-subnet-group-name "${APP_NAME}-subnet-group" \
  --db-subnet-group-description "Subnet group for Rapid Photo Upload" \
  --subnet-ids ${SUBNET_ARRAY[@]} \
  --region $REGION

echo -e "${GREEN}✓ DB Subnet Group created${NC}"

# Step 4: Create RDS Instance
echo -e "\n${BLUE}Step 4: Creating RDS PostgreSQL Instance (this takes ~5-10 minutes)...${NC}"
aws rds create-db-instance \
  --db-instance-identifier "${APP_NAME}-db" \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.14 \
  --master-username $DB_USERNAME \
  --master-user-password $DB_PASSWORD \
  --allocated-storage 20 \
  --db-name $DB_NAME \
  --vpc-security-group-ids $RDS_SG_ID \
  --db-subnet-group-name "${APP_NAME}-subnet-group" \
  --backup-retention-period 7 \
  --no-multi-az \
  --publicly-accessible \
  --region $REGION

echo -e "${GREEN}✓ RDS instance creation initiated${NC}"
echo "Waiting for RDS instance to be available..."

aws rds wait db-instance-available \
  --db-instance-identifier "${APP_NAME}-db" \
  --region $REGION

DB_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier "${APP_NAME}-db" \
  --query "DBInstances[0].Endpoint.Address" \
  --output text \
  --region $REGION)

echo -e "${GREEN}✓ RDS instance available at: $DB_ENDPOINT${NC}"

# Update config file with endpoint
echo "" >> $CONFIG_FILE
echo "Database Endpoint: $DB_ENDPOINT" >> $CONFIG_FILE
echo "Full JDBC URL: jdbc:postgresql://$DB_ENDPOINT:5432/$DB_NAME" >> $CONFIG_FILE

# Step 5: Create IAM Role for Elastic Beanstalk
echo -e "\n${BLUE}Step 5: Creating IAM Role for Elastic Beanstalk...${NC}"

# Create trust policy
cat > /tmp/trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create IAM role
ROLE_EXISTS=$(aws iam get-role --role-name aws-elasticbeanstalk-ec2-role 2>/dev/null || echo "not-exists")
if [[ $ROLE_EXISTS == "not-exists" ]]; then
  aws iam create-role \
    --role-name aws-elasticbeanstalk-ec2-role \
    --assume-role-policy-document file:///tmp/trust-policy.json

  # Attach policies
  aws iam attach-role-policy \
    --role-name aws-elasticbeanstalk-ec2-role \
    --policy-arn arn:aws:iam::aws:policy/AWSElasticBeanstalkWebTier

  aws iam attach-role-policy \
    --role-name aws-elasticbeanstalk-ec2-role \
    --policy-arn arn:aws:iam::aws:policy/AWSElasticBeanstalkMulticontainerDocker

  aws iam attach-role-policy \
    --role-name aws-elasticbeanstalk-ec2-role \
    --policy-arn arn:aws:iam::aws:policy/AWSElasticBeanstalkWorkerTier

  # Create and attach custom S3 policy
  cat > /tmp/s3-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::$S3_BUCKET_NAME",
        "arn:aws:s3:::$S3_BUCKET_NAME/*"
      ]
    }
  ]
}
EOF

  aws iam put-role-policy \
    --role-name aws-elasticbeanstalk-ec2-role \
    --policy-name S3AccessPolicy \
    --policy-document file:///tmp/s3-policy.json

  # Create instance profile
  aws iam create-instance-profile \
    --instance-profile-name aws-elasticbeanstalk-ec2-role

  aws iam add-role-to-instance-profile \
    --instance-profile-name aws-elasticbeanstalk-ec2-role \
    --role-name aws-elasticbeanstalk-ec2-role

  echo "Waiting for IAM role to propagate..."
  sleep 10

  echo -e "${GREEN}✓ IAM role created${NC}"
else
  echo -e "${GREEN}✓ IAM role already exists${NC}"
fi

# Step 6: Update security group to allow EB to access RDS
echo -e "\n${BLUE}Step 6: Configuring Security Groups...${NC}"

# Get the default EB security group (or we'll update it after EB creation)
aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG_ID \
  --protocol tcp \
  --port 5432 \
  --cidr 0.0.0.0/0 \
  --region $REGION 2>/dev/null || echo "Security rule may already exist"

echo -e "${GREEN}✓ Security groups configured${NC}"

# Step 7: Create Elastic Beanstalk Application
echo -e "\n${BLUE}Step 7: Creating Elastic Beanstalk Application...${NC}"
aws elasticbeanstalk create-application \
  --application-name $APP_NAME \
  --description "Rapid Photo Upload Application" \
  --region $REGION 2>/dev/null || echo "Application may already exist"

echo -e "${GREEN}✓ Elastic Beanstalk application created${NC}"

# Step 8: Create environment configuration
echo -e "\n${BLUE}Step 8: Creating Elastic Beanstalk Environment...${NC}"

# Create option settings file
cat > /tmp/eb-options.json << EOF
[
  {
    "Namespace": "aws:autoscaling:launchconfiguration",
    "OptionName": "IamInstanceProfile",
    "Value": "aws-elasticbeanstalk-ec2-role"
  },
  {
    "Namespace": "aws:autoscaling:launchconfiguration",
    "OptionName": "InstanceType",
    "Value": "t3.micro"
  },
  {
    "Namespace": "aws:elasticbeanstalk:application:environment",
    "OptionName": "SPRING_DATASOURCE_URL",
    "Value": "jdbc:postgresql://$DB_ENDPOINT:5432/$DB_NAME"
  },
  {
    "Namespace": "aws:elasticbeanstalk:application:environment",
    "OptionName": "SPRING_DATASOURCE_USERNAME",
    "Value": "$DB_USERNAME"
  },
  {
    "Namespace": "aws:elasticbeanstalk:application:environment",
    "OptionName": "SPRING_DATASOURCE_PASSWORD",
    "Value": "$DB_PASSWORD"
  },
  {
    "Namespace": "aws:elasticbeanstalk:application:environment",
    "OptionName": "AWS_S3_BUCKET_NAME",
    "Value": "$S3_BUCKET_NAME"
  },
  {
    "Namespace": "aws:elasticbeanstalk:application:environment",
    "OptionName": "AWS_REGION",
    "Value": "$REGION"
  },
  {
    "Namespace": "aws:elasticbeanstalk:application:environment",
    "OptionName": "SPRING_PROFILES_ACTIVE",
    "Value": "prod"
  },
  {
    "Namespace": "aws:elasticbeanstalk:container:java",
    "OptionName": "JVMOptions",
    "Value": "-Xmx256m -Xms128m"
  }
]
EOF

aws elasticbeanstalk create-environment \
  --application-name $APP_NAME \
  --environment-name $ENV_NAME \
  --solution-stack-name "64bit Amazon Linux 2023 v4.3.2 running Corretto 21" \
  --option-settings file:///tmp/eb-options.json \
  --region $REGION

echo -e "${GREEN}✓ Elastic Beanstalk environment creation initiated${NC}"
echo "Waiting for environment to be ready (this takes ~5 minutes)..."

aws elasticbeanstalk wait environment-exists \
  --application-name $APP_NAME \
  --environment-names $ENV_NAME \
  --region $REGION

# Get environment URL
ENV_URL=$(aws elasticbeanstalk describe-environments \
  --application-name $APP_NAME \
  --environment-names $ENV_NAME \
  --query "Environments[0].CNAME" \
  --output text \
  --region $REGION)

echo -e "${GREEN}✓ Environment created at: http://$ENV_URL${NC}"

# Update config file
echo "" >> $CONFIG_FILE
echo "Elastic Beanstalk Environment URL: http://$ENV_URL" >> $CONFIG_FILE

# Final summary
echo -e "\n${BLUE}========================================${NC}"
echo -e "${GREEN}AWS Setup Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Resources created:"
echo "✓ S3 Bucket: $S3_BUCKET_NAME"
echo "✓ RDS PostgreSQL: $DB_ENDPOINT"
echo "✓ Elastic Beanstalk: http://$ENV_URL"
echo ""
echo "Configuration saved to: $CONFIG_FILE"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Build your application: cd backend && ./build-for-eb.sh"
echo "2. Deploy to EB: ./deploy.sh"
echo ""
echo -e "${RED}IMPORTANT: Add $CONFIG_FILE to .gitignore!${NC}"

# Add to gitignore
if ! grep -q "aws-config.txt" ../.gitignore 2>/dev/null; then
  echo "aws-config.txt" >> ../.gitignore
  echo -e "${GREEN}✓ Added aws-config.txt to .gitignore${NC}"
fi

echo -e "\n${GREEN}Setup complete! 🚀${NC}"

