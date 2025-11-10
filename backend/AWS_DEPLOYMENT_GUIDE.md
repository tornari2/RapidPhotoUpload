# AWS Elastic Beanstalk Deployment Guide

Complete guide for deploying the RapidPhotoUpload backend to AWS Elastic Beanstalk.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [AWS Setup](#aws-setup)
3. [Environment Configuration](#environment-configuration)
4. [Deployment Steps](#deployment-steps)
5. [Post-Deployment](#post-deployment)
6. [Troubleshooting](#troubleshooting)
7. [Maintenance](#maintenance)

---

## Prerequisites

### Required Software

1. **AWS CLI** (latest version)
   ```bash
   # Install AWS CLI
   brew install awscli  # macOS
   # OR
   pip install awscli   # Python
   
   # Verify installation
   aws --version
   ```

2. **EB CLI** (Elastic Beanstalk Command Line Interface)
   ```bash
   # Install EB CLI
   pip install awsebcli
   
   # Verify installation
   eb --version
   ```

3. **Java 17** (JDK)
   ```bash
   # Verify Java version
   java -version  # Should show version 17
   ```

4. **Maven** (included with project via Maven Wrapper)

### AWS Account Requirements

- Active AWS account
- IAM user with appropriate permissions:
  - `AWSElasticBeanstalkFullAccess`
  - `AmazonRDSFullAccess`
  - `AmazonS3FullAccess`
  - `IAMFullAccess` (for creating roles)
- AWS credentials configured locally

---

## AWS Setup

### Step 1: Configure AWS Credentials

```bash
# Configure AWS credentials
aws configure

# You'll be prompted for:
# - AWS Access Key ID
# - AWS Secret Access Key
# - Default region name (e.g., us-east-1)
# - Default output format (json)
```

### Step 2: Create RDS PostgreSQL Database

1. **Via AWS Console:**
   - Go to RDS → Create database
   - Choose PostgreSQL (version 15.x recommended)
   - Template: Production
   - DB instance identifier: `rapidphoto-prod`
   - Master username: `postgres`
   - Master password: [Create secure password]
   - DB instance class: `db.t3.micro` (start small, scale up)
   - Storage: 20 GB General Purpose SSD
   - Enable automatic backups
   - **IMPORTANT:** Note the endpoint URL after creation

2. **Via AWS CLI:**
   ```bash
   aws rds create-db-instance \
     --db-instance-identifier rapidphoto-prod \
     --db-instance-class db.t3.micro \
     --engine postgres \
     --engine-version 15.4 \
     --master-username postgres \
     --master-user-password YOUR_SECURE_PASSWORD \
     --allocated-storage 20 \
     --vpc-security-group-ids sg-xxxxxxxx \
     --backup-retention-period 7 \
     --publicly-accessible
   ```

### Step 3: Create S3 Bucket

1. **Via AWS Console:**
   - Go to S3 → Create bucket
   - Bucket name: `rapidphoto-uploads-prod` (must be globally unique)
   - Region: Same as your EB environment (e.g., us-east-1)
   - Block all public access: **Uncheck** (we'll use presigned URLs)
   - Enable versioning: Optional
   - Create bucket

2. **Via AWS CLI:**
   ```bash
   # Create bucket
   aws s3api create-bucket \
     --bucket rapidphoto-uploads-prod \
     --region us-east-1
   
   # Configure CORS for the bucket
   aws s3api put-bucket-cors \
     --bucket rapidphoto-uploads-prod \
     --cors-configuration file://s3-cors.json
   ```

3. **Create `s3-cors.json`:**
   ```json
   {
     "CORSRules": [
       {
         "AllowedOrigins": ["https://your-frontend-domain.com"],
         "AllowedMethods": ["GET", "PUT", "POST"],
         "AllowedHeaders": ["*"],
         "MaxAgeSeconds": 3000
       }
     ]
   }
   ```

---

## Environment Configuration

### Step 1: Update Environment Variables

Edit `.ebextensions/02_environment.config` and replace the placeholder values:

```yaml
option_settings:
  aws:elasticbeanstalk:application:environment:
    # Database Configuration
    SPRING_DATASOURCE_URL: jdbc:postgresql://your-rds-endpoint.us-east-1.rds.amazonaws.com:5432/rapidphoto
    SPRING_DATASOURCE_USERNAME: postgres
    SPRING_DATASOURCE_PASSWORD: your-secure-rds-password
    
    # AWS S3 Configuration
    AWS_S3_BUCKET_NAME: rapidphoto-uploads-prod
    AWS_REGION: us-east-1
    
    # JWT Configuration
    # Generate a secure secret: openssl rand -base64 64
    JWT_SECRET: your-generated-secure-secret-key-min-256-bits
    
    # CORS Configuration
    CORS_ALLOWED_ORIGINS: https://your-frontend-domain.com,https://www.your-frontend-domain.com
```

### Step 2: Security Considerations

**IMPORTANT:** Never commit actual secrets to Git!

For production, consider using:
- AWS Systems Manager Parameter Store
- AWS Secrets Manager
- Environment-specific configuration files (`.gitignore` them)

---

## Deployment Steps

### Step 1: Initialize Elastic Beanstalk

Navigate to the backend directory:

```bash
cd backend
```

Initialize EB:

```bash
eb init

# You'll be prompted for:
# - Select a default region (e.g., us-east-1)
# - Application name: rapid-photo-upload
# - Platform: Java
# - Platform version: Corretto 17 (latest)
# - Do you want to set up SSH: No (or Yes if you need debugging access)
```

This creates `.elasticbeanstalk/config.yml` in your backend directory.

### Step 2: Create Elastic Beanstalk Environment

```bash
eb create rapidphoto-prod-env \
  --instance-type t3.small \
  --platform "Corretto 17" \
  --service-role aws-elasticbeanstalk-service-role \
  --envvars $(cat .ebextensions/02_environment.config | grep -A 100 "environment:" | grep -v "aws:elasticbeanstalk" | sed 's/^[[:space:]]*//' | tr '\n' ',' | sed 's/,$//')

# OR use interactive creation:
eb create

# You'll be prompted for:
# - Environment name: rapidphoto-prod-env
# - DNS CNAME prefix: rapidphoto-prod (or auto-generate)
# - Load balancer type: application
```

**Wait for environment creation** (5-10 minutes). Monitor with:

```bash
eb status
```

### Step 3: Build and Deploy

#### Option A: Using Deployment Script (Recommended)

```bash
# Make scripts executable (if not already)
chmod +x build-for-eb.sh deploy.sh

# Build and deploy
./deploy.sh
```

#### Option B: Manual Deployment

```bash
# Build the JAR
./mvnw clean package -DskipTests

# Deploy to Elastic Beanstalk
eb deploy
```

### Step 4: Monitor Deployment

```bash
# Check status
eb status

# View logs
eb logs

# Open in browser
eb open
```

---

## Post-Deployment

### Step 1: Configure Auto-Scaling (Optional)

```bash
# Update environment with auto-scaling configuration
eb config

# In the editor that opens, find and update:
# aws:autoscaling:asg:
#   MinSize: 1
#   MaxSize: 4
# 
# aws:autoscaling:trigger:
#   MeasureName: CPUUtilization
#   Statistic: Average
#   Unit: Percent
#   UpperThreshold: 75
#   LowerThreshold: 25
```

### Step 2: Configure Load Balancer Health Checks

The health check endpoint is: `GET /actuator/health` (if Spring Boot Actuator is enabled)

Or use the root endpoint: `GET /` for basic availability check.

### Step 3: Set Up CloudWatch Alarms

```bash
# Create alarm for high CPU usage
aws cloudwatch put-metric-alarm \
  --alarm-name rapidphoto-high-cpu \
  --alarm-description "Alert when CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2
```

### Step 4: Verify Deployment

Test your endpoints:

```bash
# Get the application URL
eb status | grep CNAME

# Test health endpoint
curl https://your-eb-url.elasticbeanstalk.com/

# Test API endpoints
curl https://your-eb-url.elasticbeanstalk.com/api/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'
```

---

## Troubleshooting

### View Logs

```bash
# Stream logs in real-time
eb logs --stream

# Download full logs
eb logs --all

# View specific log file
eb ssh  # Then navigate to /var/log/
```

### Common Issues

#### 1. **Application Failed to Start**

**Check:**
- Environment variables are set correctly
- RDS database is accessible (security group rules)
- S3 bucket exists and IAM role has permissions

**Solution:**
```bash
eb logs | grep ERROR
```

#### 2. **Database Connection Fails**

**Check:**
- RDS endpoint URL is correct
- Security group allows inbound traffic from EB environment
- Credentials are correct

**Solution:**
```bash
# Update security group to allow EB environment
# RDS Console → Security Groups → Add inbound rule
# Type: PostgreSQL, Source: EB environment security group
```

#### 3. **S3 Upload Fails**

**Check:**
- S3 bucket exists and name is correct
- IAM instance profile has S3 permissions
- CORS configuration is correct

**Solution:**
```bash
# Attach S3 policy to EB instance profile
aws iam attach-role-policy \
  --role-name aws-elasticbeanstalk-ec2-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
```

#### 4. **502 Bad Gateway**

**Check:**
- Application is actually running: `eb ssh` → `ps aux | grep java`
- Port 5000 is being used (specified in Procfile)
- Health check endpoint is responding

**Solution:**
```bash
# Restart environment
eb restart
```

### Enable Debug Logging

Add to `application-prod.properties`:
```properties
logging.level.com.rapidphoto=DEBUG
logging.level.org.springframework=DEBUG
```

Then redeploy.

---

## Maintenance

### Update Application

```bash
# Make code changes
# Build and deploy
./deploy.sh

# Or manually
./mvnw clean package -DskipTests
eb deploy
```

### Scale Environment

```bash
# Scale up
eb scale 3  # Run 3 instances

# Scale down
eb scale 1
```

### Database Migrations

Flyway runs automatically on application startup. Ensure:
- Migration scripts are in `src/main/resources/db/migration`
- Flyway is enabled in `application-prod.properties`

### Backup Strategy

1. **RDS Automated Backups:** Already enabled (7-day retention)
2. **Manual Snapshot:**
   ```bash
   aws rds create-db-snapshot \
     --db-instance-identifier rapidphoto-prod \
     --db-snapshot-identifier rapidphoto-manual-backup-$(date +%Y%m%d)
   ```

3. **S3 Versioning:** Enable on your S3 bucket for photo recovery

### Monitor Costs

```bash
# Get current month costs
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics UnblendedCost
```

### Terminate Environment (When Done Testing)

```bash
# Terminate environment (deletes all resources)
eb terminate rapidphoto-prod-env

# IMPORTANT: This does NOT delete:
# - RDS database (delete manually)
# - S3 bucket (delete manually)
```

---

## Cost Estimation

**Monthly costs (approximate):**

- Elastic Beanstalk: Free (you only pay for resources)
- EC2 t3.small (1 instance): ~$15/month
- RDS db.t3.micro: ~$13/month
- S3 storage (10GB): ~$0.23/month
- S3 requests (10,000): ~$0.04/month
- Data transfer: Varies

**Total:** ~$30-50/month for a basic production deployment

---

## Security Best Practices

1. **Use HTTPS:** Configure SSL certificate via ACM (AWS Certificate Manager)
2. **Enable VPC:** Deploy RDS in private subnet
3. **Use Secrets Manager:** Store sensitive values securely
4. **Enable CloudTrail:** Audit all API calls
5. **Regular Updates:** Keep dependencies updated
6. **WAF:** Consider AWS WAF for application-level protection

---

## Additional Resources

- [AWS Elastic Beanstalk Documentation](https://docs.aws.amazon.com/elasticbeanstalk/)
- [EB CLI Reference](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb-cli3.html)
- [Spring Boot on AWS](https://spring.io/guides/gs/spring-boot-docker/)

---

## Support

For issues or questions:
1. Check application logs: `eb logs`
2. Check AWS Service Health Dashboard
3. Review CloudWatch metrics
4. Contact AWS Support (if you have a support plan)

---

**Deployment Checklist:**

- [ ] AWS CLI installed and configured
- [ ] EB CLI installed
- [ ] RDS PostgreSQL database created
- [ ] S3 bucket created and configured
- [ ] Environment variables updated in `.ebextensions/02_environment.config`
- [ ] JWT secret generated and set
- [ ] CORS origins configured
- [ ] Application built successfully
- [ ] EB environment initialized
- [ ] EB environment created
- [ ] Application deployed
- [ ] Health check passing
- [ ] API endpoints responding correctly
- [ ] CloudWatch alarms configured
- [ ] Auto-scaling configured (if needed)
- [ ] SSL certificate configured (if needed)
- [ ] Frontend updated with new backend URL

---

**Last Updated:** November 10, 2024



