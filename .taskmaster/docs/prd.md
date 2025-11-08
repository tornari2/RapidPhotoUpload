<context>
# Overview
RapidPhotoUpload is a high-performance, asynchronous photo upload system designed to handle up to 100 concurrent media uploads per user session. This system demonstrates architectural excellence through Domain-Driven Design (DDD), Command Query Responsibility Segregation (CQRS), and Vertical Slice Architecture (VSA). The project consists of three integrated components: a Java Spring Boot backend, a React TypeScript web application, and a React Native mobile application, all utilizing AWS infrastructure (S3, RDS PostgreSQL, Elastic Beanstalk).

# Problem Statement
Users need to upload large batches of photos (up to 100 simultaneously) without application freezing or performance degradation. The system must provide real-time feedback on individual and batch upload progress while maintaining full UI responsiveness across web and mobile platforms.

# Core Features

## 1. High-Volume Concurrent Upload System
- Support simultaneous upload of 100 photos per user session (~2MB each)
- Direct upload to AWS S3 using presigned URLs (reduces backend load)
- Asynchronous processing ensures UI remains responsive during uploads
- Target performance: 100 photos uploaded within 90 seconds on standard broadband

## 2. Real-Time Progress Tracking
- Server-Sent Events (SSE) for live progress updates
- Individual photo progress indicators with status (Uploading, Failed, Complete)
- Batch-level progress tracking (e.g., "47/100 uploaded, 2 failed, 51 in progress")
- Visual progress bars for both individual files and overall batch
- Users can navigate the application freely while uploads continue in background

## 3. Photo Management (Web Interface)
- Grid view with thumbnails of all uploaded photos
- Upload and view photos on the same page (seamless experience)
- Tag photos individually or in bulk
- Download single or multiple photos
- Search and filter by tags (nice-to-have, can be Phase 2 if time-constrained)
- All features available during active upload operations

## 4. Mobile Application (React Native)
- Gallery selection for bulk photo upload
- Grid view with thumbnails matching web interface
- Tag photos individually or in bulk
- Download photos to device
- Real-time upload progress indicators
- Same functionality as web for core features (upload, view, tag, download)

## 5. Robust Error Handling
- Automatic retry mechanism (3 attempts per failed upload)
- Failed uploads clearly marked with retry option
- Partial success handling (e.g., 50/100 succeed = "Partial Success" status)
- User can manually retry individual failed uploads
- Clear error messages for debugging

## 6. Authentication
- Simple mocked authentication system (JWT-based is acceptable)
- Secure endpoints for both mobile and web clients
- User sessions maintained across navigation

# User Experience

## User Personas
- **Primary User:** Content creator or professional photographer needing to upload large photo batches efficiently
- **Use Case:** Upload 100 event photos from a wedding, continue working while uploads process

## Key User Flows

### Flow 1: Web Bulk Upload
1. User logs in via web interface
2. Clicks "Upload Photos" button on main page
3. Selects 100 photos from file system
4. Upload begins immediately with real-time progress
5. User sees grid updating with thumbnails as uploads complete
6. User adds tags to completed photos while remaining photos upload
7. User downloads selected photos
8. Failed uploads show retry button

### Flow 2: Mobile Bulk Upload
1. User logs in via mobile app
2. Taps "Upload Photos" button
3. Opens gallery and selects 100 photos
4. Upload begins with individual and batch progress indicators
5. User can navigate to home screen; upload continues in background
6. Returns to app to see grid with completed uploads
7. Tags and downloads photos as needed

## UI/UX Considerations
- Progress indicators must be prominent but not intrusive
- Failed uploads visually distinct (red indicator)
- Grid loads progressively as uploads complete (no wait for all 100)
- Responsive design for web (desktop and tablet)
- Mobile-first design for React Native app
- Consistent design language across web and mobile

</context>

<PRD>
# Technical Architecture

## Mandatory Architectural Principles

### 1. Domain-Driven Design (DDD)
The system MUST model core concepts as robust Domain Objects within a single bounded context containing three aggregates:

**Upload Aggregate:**
- UploadJob entity (root): Manages batch upload lifecycle
- UploadEvent value object: Tracks state transitions
- Photo entity: Represents individual upload within job

**Media Aggregate:**
- Photo entity (root): Stored photo with metadata
- Tag value object: Photo categorization
- Thumbnail value object: Optimized display images

**User Aggregate:**
- User entity (root): Authentication and ownership
- Session value object: Active user session management

**Domain Rules:**
- Upload jobs track overall batch status and individual photo states
- Photos are immutable once successfully stored
- Users own their photos and can only access their own data
- Failed uploads maintain reference for retry capability

### 2. CQRS (Command Query Responsibility Segregation)
Strict separation between mutations and queries using the same PostgreSQL database:

**Commands (Write Operations):**
- CreateUploadJobCommand → CreateUploadJobHandler
- UploadPhotoCommand → UploadPhotoHandler  
- RetryFailedUploadCommand → RetryFailedUploadHandler
- TagPhotoCommand → TagPhotoHandler
- DeletePhotoCommand → DeletePhotoHandler

**Queries (Read Operations):**
- GetUploadJobStatusQuery → GetUploadJobStatusHandler
- GetUserPhotosQuery → GetUserPhotosHandler
- GetPhotoMetadataQuery → GetPhotoMetadataHandler
- SearchPhotosByTagQuery → SearchPhotosByTagHandler

**Benefits:**
- Clear separation of concerns
- Optimized query models for read performance
- Simplified command validation and business logic

### 3. Vertical Slice Architecture (VSA)
Organize backend code around features, each slice containing all layers:

```
/src/main/java/com/rapidphoto/features/
  /upload-photo/
    - UploadPhotoCommand.java (command model)
    - UploadPhotoHandler.java (business logic)
    - UploadPhotoController.java (API endpoint)
    - UploadPhotoRepository.java (data access)
    - UploadPhotoValidator.java (validation)
  
  /get-photos/
    - GetPhotosQuery.java
    - GetPhotosHandler.java
    - GetPhotosController.java
    - GetPhotosRepository.java
  
  /tag-photo/
    - TagPhotoCommand.java
    - TagPhotoHandler.java
    - TagPhotoController.java
    - TagPhotoRepository.java
  
  /download-photo/
    - DownloadPhotoQuery.java
    - DownloadPhotoHandler.java
    - DownloadPhotoController.java
  
  /upload-status/
    - GetUploadStatusQuery.java
    - GetUploadStatusHandler.java
    - UploadStatusController.java (SSE endpoint)
    - UploadStatusRepository.java
  
  /retry-upload/
    - RetryUploadCommand.java
    - RetryUploadHandler.java
    - RetryUploadController.java
```

**Shared Infrastructure:**
```
/src/main/java/com/rapidphoto/
  /domain/
    - Photo.java (domain entity)
    - UploadJob.java (domain entity)
    - User.java (domain entity)
    - Tag.java (value object)
  
  /infrastructure/
    - S3Service.java (AWS S3 client wrapper)
    - PresignedUrlGenerator.java
    - AsyncConfig.java (thread pool configuration)
```

## Technical Stack

### Backend
- **Framework:** Spring Boot 3.x with Spring MVC
- **Language:** Java 17+
- **Concurrency:** Spring @Async with custom thread pool configuration
- **Thread Pool:** Fixed pool of 100 threads for concurrent upload handling
- **Database:** PostgreSQL 15 on AWS RDS
- **Cloud Storage:** AWS S3 (single bucket with user-based prefixes: `uploads/{userId}/`)
- **Real-time:** Server-Sent Events (SSE) for progress updates
- **Deployment:** AWS Elastic Beanstalk

**Key Spring Configuration:**
```java
@Configuration
@EnableAsync
public class AsyncConfig implements AsyncConfigurer {
    @Bean(name = "uploadExecutor")
    public Executor uploadExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(50);
        executor.setMaxPoolSize(100);
        executor.setQueueCapacity(200);
        executor.setThreadNamePrefix("upload-");
        executor.initialize();
        return executor;
    }
}
```

### Web Frontend
- **Framework:** React 18+ with TypeScript
- **State Management:** React Context API or Zustand for upload state
- **HTTP Client:** Axios for API calls
- **SSE Client:** EventSource API for real-time updates
- **UI Components:** Headless UI or Radix UI for accessible components
- **Styling:** Tailwind CSS for responsive design
- **File Upload:** Browser File API with progress tracking

### Mobile Frontend
- **Framework:** React Native (latest stable)
- **Language:** TypeScript
- **State Management:** React Context API or Zustand
- **Navigation:** React Navigation
- **HTTP Client:** Axios
- **Image Picker:** react-native-image-picker
- **Background Tasks:** react-native-background-upload or similar
- **Platform Support:** iOS and Android

### AWS Infrastructure
- **Compute:** Elastic Beanstalk (Java 17 Corretto platform)
- **Database:** RDS PostgreSQL (db.t3.medium for development)
- **Storage:** S3 Standard tier
- **Networking:** Application Load Balancer (ALB) via Elastic Beanstalk
- **IAM:** Service role with S3 read/write permissions

## Database Schema

### Core Tables

**users**
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- Mocked but structure present
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**upload_jobs**
```sql
CREATE TABLE upload_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    total_count INTEGER NOT NULL,
    completed_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    status VARCHAR(50) NOT NULL, -- IN_PROGRESS, COMPLETED, PARTIAL_SUCCESS, FAILED
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_upload_jobs_user_id ON upload_jobs(user_id);
CREATE INDEX idx_upload_jobs_status ON upload_jobs(status);
```

**photos**
```sql
CREATE TABLE photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    upload_job_id UUID REFERENCES upload_jobs(id),
    filename VARCHAR(500) NOT NULL,
    s3_key VARCHAR(1000) NOT NULL UNIQUE,
    file_size BIGINT NOT NULL,
    content_type VARCHAR(100),
    upload_status VARCHAR(50) NOT NULL, -- UPLOADING, COMPLETED, FAILED
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);
CREATE INDEX idx_photos_user_id ON photos(user_id);
CREATE INDEX idx_photos_upload_job_id ON photos(upload_job_id);
CREATE INDEX idx_photos_upload_status ON photos(upload_status);
```

**upload_events**
```sql
CREATE TABLE upload_events (
    id BIGSERIAL PRIMARY KEY,
    photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- STARTED, PROGRESS, COMPLETED, FAILED, RETRY
    message TEXT,
    metadata JSONB, -- Flexible for additional context
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_upload_events_photo_id ON upload_events(photo_id);
CREATE INDEX idx_upload_events_created_at ON upload_events(created_at);
```

**tags**
```sql
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE photo_tags (
    photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (photo_id, tag_id)
);
CREATE INDEX idx_photo_tags_tag_id ON photo_tags(tag_id);
```

## System Components

### 1. Upload Flow (Direct to S3 with Presigned URLs)

**Step-by-Step Process:**
1. **Client Initiates Upload:**
   - Web/Mobile sends POST `/api/uploads/initialize` with file metadata array (filenames, sizes, types)
   - Backend creates UploadJob and Photo records with status UPLOADING
   - Returns upload job ID and array of presigned URLs (one per photo)

2. **Client Uploads to S3:**
   - Client uses presigned URLs to upload directly to S3
   - Progress tracked locally on client
   - Client subscribes to SSE endpoint `/api/uploads/{jobId}/status` for server-side updates

3. **Client Notifies Backend:**
   - After each successful S3 upload, client sends POST `/api/uploads/{jobId}/complete/{photoId}`
   - Backend verifies file exists in S3, updates photo status to COMPLETED
   - Backend emits SSE event with updated progress

4. **Failure Handling:**
   - If upload fails, client sends POST `/api/uploads/{jobId}/fail/{photoId}` with error details
   - Backend updates photo status to FAILED, increments retry_count
   - User can trigger POST `/api/uploads/{photoId}/retry` to get new presigned URL

### 2. Real-Time Progress Updates (SSE)

**SSE Endpoint:** GET `/api/uploads/{jobId}/status`

**Event Types:**
```json
// Photo progress update
{
  "type": "PHOTO_PROGRESS",
  "photoId": "uuid",
  "filename": "photo.jpg",
  "status": "UPLOADING",
  "timestamp": "2024-01-01T12:00:00Z"
}

// Photo completed
{
  "type": "PHOTO_COMPLETED",
  "photoId": "uuid",
  "filename": "photo.jpg",
  "thumbnailUrl": "https://...",
  "timestamp": "2024-01-01T12:00:05Z"
}

// Photo failed
{
  "type": "PHOTO_FAILED",
  "photoId": "uuid",
  "filename": "photo.jpg",
  "error": "Network timeout",
  "retryable": true,
  "timestamp": "2024-01-01T12:00:10Z"
}

// Batch progress
{
  "type": "BATCH_PROGRESS",
  "jobId": "uuid",
  "totalCount": 100,
  "completedCount": 47,
  "failedCount": 2,
  "inProgressCount": 51,
  "status": "IN_PROGRESS",
  "timestamp": "2024-01-01T12:00:00Z"
}

// Batch completed
{
  "type": "BATCH_COMPLETED",
  "jobId": "uuid",
  "totalCount": 100,
  "completedCount": 98,
  "failedCount": 2,
  "status": "PARTIAL_SUCCESS",
  "timestamp": "2024-01-01T12:01:30Z"
}
```

**Backend SSE Implementation:**
- SseEmitter maintained per upload job
- Async handlers emit events on photo status changes
- Client automatically reconnects if connection drops
- Events persisted in upload_events table for reliability

### 3. Photo Viewing and Management

**API Endpoints:**
- GET `/api/photos` - List all user photos (with pagination, optional tag filter)
- GET `/api/photos/{photoId}` - Get photo metadata
- GET `/api/photos/{photoId}/download` - Generate presigned download URL
- POST `/api/photos/{photoId}/tags` - Add tags to photo
- DELETE `/api/photos/{photoId}/tags/{tagId}` - Remove tag from photo
- POST `/api/photos/bulk-tag` - Add tags to multiple photos

**Web Interface Features:**
- Grid layout with lazy loading (20 photos per load)
- Thumbnail generation (300x300px) stored in S3 with `-thumb` suffix
- Click photo to view full size
- Multi-select for bulk operations (tagging, downloading)
- Search bar for tag filtering (nice-to-have)
- Upload button opens file dialog, uploads begin immediately

**Mobile Interface Features:**
- Same grid layout optimized for touch
- Pull-to-refresh for latest photos
- Long-press for multi-select
- Native share dialog for downloads
- Camera roll integration via react-native-image-picker

### 4. Authentication

**Implementation:**
- POST `/api/auth/login` - Returns JWT token (mocked validation)
- Middleware validates JWT on all protected endpoints
- Token stored in localStorage (web) / SecureStore (mobile)
- Simple hardcoded users for demo: `demo@example.com` / `password123`

## Performance Benchmarks

### Load Testing Requirements
- System MUST successfully upload 100 photos (~2MB each = 200MB total)
- Target time: 90 seconds on standard broadband (assumes ~2.2 MBps upload speed)
- UI responsiveness: 60fps maintained during peak upload operations

### Backend Performance
- Thread pool sized for 100 concurrent operations
- Database connection pool: 20 connections minimum
- S3 presigned URL generation: < 10ms per URL
- SSE event emission: < 5ms latency

### Frontend Performance
- Grid renders 20 photos initially, loads more on scroll
- Thumbnails cached in browser/device
- Upload progress updates: 100ms throttle to prevent UI jank
- React component optimization (React.memo, useMemo where appropriate)

# Development Roadmap

## Phase 1: Backend Foundation (Day 1)
**Goal:** Working Spring Boot API with DDD/CQRS/VSA architecture, S3 integration, and SSE

### Tasks:
1. **Project Setup**
   - Initialize Spring Boot 3.x project with required dependencies
   - Configure AWS SDK for S3
   - Set up PostgreSQL database connection
   - Configure Elastic Beanstalk deployment files

2. **Domain Layer**
   - Implement User, Photo, UploadJob, Tag domain entities
   - Create value objects (UploadEvent, Tag)
   - Define domain rules and validation

3. **Database Schema**
   - Create migration scripts for all tables (users, upload_jobs, photos, upload_events, tags, photo_tags)
   - Add indexes for performance
   - Seed test user data

4. **Core Upload Feature (Vertical Slice)**
   - CreateUploadJobCommand and handler
   - Generate presigned S3 URLs (100 at once)
   - CompletePhotoUploadCommand and handler
   - FailPhotoUploadCommand and handler
   - RetryUploadCommand and handler
   - SSE endpoint for upload status

5. **Photo Management Features (Vertical Slices)**
   - GetUserPhotosQuery and handler
   - GetPhotoMetadataQuery and handler
   - DownloadPhotoQuery (generate presigned download URL)
   - TagPhotoCommand and handler
   - BulkTagPhotosCommand and handler

6. **Infrastructure Services**
   - S3Service with presigned URL generation
   - AsyncConfig for thread pool
   - JWT authentication filter (mocked)
   - Exception handling and error responses

7. **Integration Tests**
   - Test upload job creation
   - Test presigned URL generation
   - Test photo completion workflow
   - Test retry mechanism
   - Test SSE event emission
   - Test 10 concurrent uploads (scale to 100 later)

## Phase 2: Web Frontend (Day 2)
**Goal:** React TypeScript web app with upload, grid view, tagging, and download

### Tasks:
1. **Project Setup**
   - Create React + TypeScript + Vite project
   - Install dependencies (axios, tailwind, etc.)
   - Configure API base URL
   - Set up routing

2. **Authentication**
   - Login page with form
   - JWT storage in localStorage
   - Protected route wrapper
   - Axios interceptor for token

3. **Upload Feature**
   - File input with multi-select (up to 100 files)
   - Upload progress tracking per file
   - SSE connection for real-time updates
   - Progress bars (individual and batch)
   - Retry button for failed uploads
   - Status indicators (Uploading, Complete, Failed)

4. **Photo Grid**
   - Grid layout with thumbnails (CSS Grid)
   - Lazy loading with infinite scroll
   - Photo click to view full size modal
   - Multi-select checkbox mode
   - Empty state when no photos

5. **Tagging System**
   - Tag input component (multi-select)
   - Add tags to single photo
   - Bulk tag selected photos
   - Display tags on grid items

6. **Download Feature**
   - Download single photo
   - Bulk download (multiple presigned URLs)
   - Download progress feedback

7. **Search/Filter (Nice-to-have)**
   - Search bar for tag filtering
   - Filter dropdown for tag selection

8. **Integration**
   - Combine upload + grid on single page
   - Test uploading while browsing grid
   - Test real-time grid updates as uploads complete

## Phase 3: Mobile Frontend (Day 3)
**Goal:** React Native mobile app mirroring web functionality

### Tasks:
1. **Project Setup**
   - Initialize React Native project (Expo or bare)
   - Install dependencies (axios, react-native-image-picker, etc.)
   - Configure TypeScript
   - Set up navigation (React Navigation)

2. **Authentication**
   - Login screen
   - JWT storage in SecureStore/AsyncStorage
   - Auth context provider
   - Protected route navigation

3. **Gallery Integration**
   - Integrate react-native-image-picker
   - Multi-select gallery (up to 100 images)
   - Display selected images count
   - Permission handling for camera roll

4. **Upload Feature**
   - Upload selected images to backend
   - Individual progress indicators
   - Batch progress indicator
   - SSE connection for real-time updates (or polling fallback)
   - Retry failed uploads
   - Handle background upload (app minimized)

5. **Photo Grid**
   - FlatList with thumbnail images
   - Pull-to-refresh
   - Long-press for multi-select
   - Tap to view full size
   - Empty state

6. **Tagging System**
   - Tag input modal
   - Add tags to single photo
   - Bulk tag selected photos
   - Display tags on grid items

7. **Download Feature**
   - Download single photo to camera roll
   - Bulk download selected photos
   - Download progress indicator
   - Success notification

8. **Testing**
   - Test on iOS simulator/device
   - Test on Android emulator/device
   - Test upload of 100 images
   - Test background upload behavior

## Phase 4: Deployment and Final Testing (Day 3-4)
**Goal:** Deployed system ready for demo

### Tasks:
1. **AWS Deployment**
   - Deploy Spring Boot to Elastic Beanstalk
   - Configure RDS PostgreSQL
   - Create S3 bucket with proper permissions
   - Set environment variables
   - Test deployed backend

2. **Frontend Deployment**
   - Build web app for production
   - Deploy to Vercel/Netlify or S3 + CloudFront
   - Update API base URL to production
   - Test deployed web app

3. **Integration Testing**
   - End-to-end test: Upload 100 photos via web
   - Verify all 100 appear in S3
   - Verify database records
   - Test SSE real-time updates
   - Test retry mechanism
   - Test tagging and download
   - End-to-end test: Upload 100 photos via mobile
   - Cross-client test: Upload from web, view on mobile

4. **Demo Preparation**
   - Prepare 100 test images (~2MB each)
   - Test demo script (login → upload 100 → show progress → tag → download)
   - Record demo video
   - Take screenshots for documentation

# Logical Dependency Chain

## Foundation (Must Build First)
1. Database schema and migrations
2. Domain entities (User, Photo, UploadJob)
3. AWS S3 service integration
4. Spring Boot @Async configuration

## Backend Core (Sequential)
1. Upload job creation (presigned URL generation)
2. Photo completion handler
3. SSE status endpoint
4. Photo query endpoints
5. Tag management endpoints
6. Download endpoint (presigned URLs)
7. Retry mechanism

## Frontend Core (Can Build in Parallel After Backend MVP)
1. Authentication flow
2. Upload UI with progress tracking
3. SSE integration for real-time updates
4. Photo grid display
5. Tagging UI
6. Download functionality

## Optimization and Polish
1. Retry failed uploads
2. Partial success handling
3. Search/filter by tags (nice-to-have)
4. Performance optimization (lazy loading, caching)

# Testing Strategy

## Integration Tests (MANDATORY)

### Backend Integration Tests
**Test Class:** `UploadWorkflowIntegrationTest`
- Test upload job creation with 10 photo metadata
- Verify 10 presigned URLs generated
- Simulate S3 upload completion notifications
- Verify database updates (photo status, upload_events)
- Test SSE event emission
- Verify batch status calculation

**Test Class:** `FailureAndRetryIntegrationTest`
- Test failed upload notification
- Verify failure recorded in database
- Test retry command generates new presigned URL
- Verify retry_count incremented

**Test Class:** `PhotoManagementIntegrationTest`
- Test photo listing endpoint
- Test tagging photos (single and bulk)
- Test download URL generation
- Verify S3 key format and access

**Scaling Test:**
- After initial 10-photo tests pass, scale to 100 photos
- Verify thread pool handles concurrent load
- Verify database connection pool adequacy
- Verify SSE performance with 100 events

**Test Environment:**
- Use real AWS S3 test bucket (separate from production)
- Use test database (PostgreSQL on localhost or RDS test instance)
- Use test user credentials

### Frontend Tests (Unit Tests Where Helpful)
- Unit test upload progress calculation logic
- Unit test SSE event parsing
- Integration test (E2E with Playwright): Full upload flow
- Integration test: SSE connection and reconnection
- Manual testing: 100 concurrent uploads from UI

## Test Coverage Goals
- Backend command handlers: 100% coverage
- Backend query handlers: 100% coverage
- Domain entities: 80%+ coverage
- Frontend upload logic: 80%+ coverage

# Risks and Mitigations

## Technical Challenges

### Risk: S3 Upload Failures at Scale
- **Mitigation:** Retry mechanism with exponential backoff, clear failure indicators, manual retry option

### Risk: Thread Pool Exhaustion
- **Mitigation:** Properly sized thread pool (100 max threads), queue capacity (200), monitoring via logs

### Risk: Database Connection Pool Saturation
- **Mitigation:** Connection pool sized to 20+, use connection pooling library (HikariCP), query optimization

### Risk: SSE Connection Drops
- **Mitigation:** Client auto-reconnect logic, persist events in upload_events table for replay, fallback to polling

### Risk: Memory Issues with 100 Concurrent Uploads
- **Mitigation:** Direct S3 upload (not through backend), lightweight metadata handling, JVM heap sizing

## MVP Definition

### Must-Have for Demo
- Upload 100 photos simultaneously from web
- Real-time progress indicators (individual and batch)
- Photo grid with thumbnails
- Tagging photos (single and bulk)
- Download photos (single and bulk)
- Retry failed uploads
- Mobile app with same core functionality

### Nice-to-Have (Can Cut if Time-Constrained)
- Search/filter by tags (can be Phase 2)
- Advanced error recovery (beyond 3 retries)
- Thumbnail optimization (can use S3 originals initially)
- CloudFront CDN (can use direct S3 URLs for demo)

### Can Defer to Post-Demo
- User management (multiple users)
- Photo deletion
- Photo editing/metadata update
- Usage analytics
- Cost monitoring
- Automated testing in CI/CD pipeline

# Appendix

## AWS Resource Specifications

### Elastic Beanstalk Environment
- Platform: Java 17 Corretto
- Instance Type: t3.medium (2 vCPU, 4GB RAM)
- Auto Scaling: 1-3 instances (start with 1)
- Load Balancer: Application Load Balancer

### RDS PostgreSQL
- Instance: db.t3.medium
- Storage: 20GB SSD
- Multi-AZ: No (for cost savings in dev)
- Backup: Automated daily backups

### S3 Bucket Configuration
- Bucket Name: `rapidphoto-uploads-{env}`
- Region: us-east-1 (or closest to users)
- Versioning: Disabled (for demo)
- Lifecycle: None (for demo)
- CORS: Enabled for direct uploads
- Folder Structure: `uploads/{userId}/{photoId}-{filename}`

### IAM Roles
- Elastic Beanstalk Instance Role: S3 read/write, RDS connect
- Web/Mobile Client: No direct AWS credentials (presigned URLs only)

## API Endpoint Summary

### Authentication
- POST `/api/auth/login` - Login with credentials, returns JWT
- POST `/api/auth/logout` - Invalidate session

### Upload Management
- POST `/api/uploads/initialize` - Create upload job, get presigned URLs
- POST `/api/uploads/{jobId}/complete/{photoId}` - Mark photo upload complete
- POST `/api/uploads/{jobId}/fail/{photoId}` - Mark photo upload failed
- POST `/api/uploads/{photoId}/retry` - Get new presigned URL for retry
- GET `/api/uploads/{jobId}/status` - SSE endpoint for real-time status

### Photo Management
- GET `/api/photos` - List user photos (paginated, filterable by tag)
- GET `/api/photos/{photoId}` - Get photo metadata
- GET `/api/photos/{photoId}/download` - Get presigned download URL
- POST `/api/photos/{photoId}/tags` - Add tags to photo
- DELETE `/api/photos/{photoId}/tags/{tagId}` - Remove tag from photo
- POST `/api/photos/bulk-tag` - Add tags to multiple photos

### Tags
- GET `/api/tags` - List all tags
- POST `/api/tags` - Create new tag

## Development Environment Setup

### Prerequisites
- Java 17+ JDK
- Node.js 18+ and npm
- PostgreSQL 15
- AWS CLI configured with credentials
- AWS account with S3, RDS, and Elastic Beanstalk access
- Xcode (for iOS development) or Android Studio (for Android)

### Local Development
1. Clone repository
2. Set environment variables (AWS credentials, database URL, JWT secret)
3. Run PostgreSQL locally or connect to RDS
4. Run Spring Boot: `./mvnw spring-boot:run`
5. Run React web: `npm run dev` (in web-app directory)
6. Run React Native: `npx expo start` (in mobile-app directory)

### Database Migrations
- Use Flyway or Liquibase for version-controlled migrations
- Migrations run automatically on application startup

## Performance Optimization Notes

### Backend
- Use Spring @Async with custom executor for upload handling
- Database indexes on frequently queried columns (user_id, upload_job_id, status)
- Connection pooling (HikariCP with 20+ connections)
- Efficient S3 SDK usage (reuse client instances)

### Frontend
- React.memo for expensive components (photo grid items)
- Virtualized lists for large photo grids (react-window)
- Thumbnail lazy loading with Intersection Observer
- Debounced SSE event processing (100ms) to prevent render thrashing

### Mobile
- FlatList with optimized rendering (windowSize, maxToRenderPerBatch)
- Image caching (react-native-fast-image)
- Background upload task persistence

## Security Considerations

### Authentication
- JWT tokens with expiration (1 hour)
- Refresh token mechanism (optional for demo)
- HTTPS only for production

### S3 Security
- Presigned URLs expire after 15 minutes
- Bucket policy restricts public access
- CORS configured for specific origins only

### Input Validation
- File size limits (max 5MB per photo)
- File type validation (JPEG, PNG only)
- Filename sanitization to prevent path traversal

### API Rate Limiting
- Consider adding rate limiting to prevent abuse (optional for demo)

</PRD>

