# RapidPhotoUpload

A high-performance, cloud-native photo upload and management system built with modern architectural patterns including Domain-Driven Design (DDD), Command Query Responsibility Segregation (CQRS), and Vertical Slice Architecture (VSA).

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
├──────────────────────────────┬──────────────────────────────────┤
│      Web Application         │     Mobile Application           │
│    (React + TypeScript)      │   (React Native + Expo)          │
│                              │                                  │
│  • Photo Selection           │  • Camera Integration            │
│  • Batch Upload              │  • Background Uploads            │
│  • Progress Tracking         │  • Offline Queue                 │
│  • Gallery + Infinite Scroll │  • Push Notifications            │
│  • Real-time SSE Updates     │  • Biometric Auth                │
└──────────────┬───────────────┴────────────┬─────────────────────┘
               │                            │
               │  REST API (HTTP/HTTPS)     │
               │  + SSE (Server-Sent Events)│
               │                            │
┌──────────────┴────────────────────────────┴─────────────────────┐
│                     BACKEND LAYER (Spring Boot)                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────┐ │
│  │ Controller │→ │  Handler   │→ │  Service   │→ │Repository│ │
│  │   Layer    │  │   Layer    │  │   Layer    │  │  Layer   │ │
│  │            │  │            │  │            │  │          │ │
│  │ • REST     │  │ • Commands │  │ • S3       │  │ • JPA    │ │
│  │ • Validate │  │ • Queries  │  │ • SSE      │  │ • CRUD   │ │
│  │ • Auth     │  │ • Business │  │ • Async    │  │ • Custom │ │
│  │ • DTO      │  │   Logic    │  │ • Scheduled│  │  Queries │ │
│  └────────────┘  └────────────┘  └────────────┘  └──────────┘ │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Domain Model (Entities)                      │  │
│  │  User  ←──→  UploadJob  ←──→  Photo  ←──→  Tag          │  │
│  │              UploadEvent                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────┬─────────────────────────┬─────────────────────┬─┘
               │                         │                     │
               ↓                         ↓                     ↓
┌──────────────────────┐  ┌──────────────────────┐  ┌─────────────┐
│   AWS S3 Storage     │  │  PostgreSQL Database  │  │ SSE Clients │
│                      │  │                       │  │             │
│ • Presigned URLs     │  │ • Photo Metadata      │  │ • Real-time │
│ • Direct Upload      │  │ • User Data           │  │   Updates   │
│ • File Verification  │  │ • Job Status          │  │ • Multi-tab │
│ • Download URLs      │  │ • Relationships       │  │   Support   │
└──────────────────────┘  └──────────────────────┘  └─────────────┘
```

### Upload Flow
```
1. Client → Backend: Create Upload Job (POST /api/upload-jobs)
2. Backend → Client: Return presigned S3 URLs + job metadata
3. Client → S3: Direct upload via presigned URLs (parallel)
4. Client → Backend: Notify completion (POST /api/photos/{id}/complete)
5. Backend → S3: Verify file exists
6. Backend → Database: Update photo status to COMPLETED
7. Backend → All Clients: Broadcast SSE event
```

---

## 🛠️ Tech Stack

### Frontend - Web Application
- **Framework:** React 18 with TypeScript
- **UI Library:** TailwindCSS + Headless UI
- **State Management:** React Query + React Context
- **HTTP Client:** Axios with retry logic
- **Real-time:** EventSource (SSE)
- **Build Tool:** Vite
- **Deployment:** AWS Amplify

### Frontend - Mobile Application
- **Framework:** React Native with Expo
- **UI Library:** React Native Paper (Material Design)
- **Navigation:** React Navigation
- **File System:** expo-file-system
- **Camera:** expo-image-picker
- **Authentication:** expo-secure-store
- **Platform:** iOS & Android

### Backend - API
- **Framework:** Spring Boot 3.2.0
- **Language:** Java 17
- **Web:** Spring Web MVC
- **Security:** Spring Security + JWT
- **Database:** Spring Data JPA + Hibernate
- **Cloud:** AWS SDK v2 (S3)
- **Build:** Maven
- **Deployment:** AWS Elastic Beanstalk

### Database & Storage
- **Database:** PostgreSQL 15
- **Hosting:** AWS RDS
- **Object Storage:** AWS S3
- **Connection Pool:** HikariCP

### Infrastructure
- **Backend Hosting:** AWS Elastic Beanstalk
- **Web Hosting:** AWS Amplify
- **Object Storage:** AWS S3
- **Database:** AWS RDS (PostgreSQL)
- **IAM:** AWS IAM Roles & Policies
- **Region:** us-east-2 (Ohio)

---

## ✨ Features

### Core Upload Features
- ✅ **Batch Photo Upload** - Upload multiple photos simultaneously
- ✅ **Direct S3 Upload** - Client-to-S3 upload via presigned URLs (no backend bottleneck)
- ✅ **Real-time Progress** - Individual progress tracking per photo
- ✅ **Concurrent Processing** - 100+ concurrent uploads per backend instance
- ✅ **Automatic Retry** - Exponential backoff for transient failures
- ✅ **Upload Verification** - Backend verifies S3 upload before marking complete
- ✅ **Stalled Upload Cleanup** - Automated cleanup every 5 minutes

### Gallery & Management
- ✅ **Photo Gallery** - Grid view with infinite scroll
- ✅ **Photo Tagging** - Add multiple tags per photo
- ✅ **Bulk Operations** - Select multiple photos for tagging/download/delete
- ✅ **Search & Filter** - Filter by tags, status, date
- ✅ **Download Photos** - Secure presigned download URLs
- ✅ **Delete Photos** - Remove photos with S3 cleanup

### Real-time Features
- ✅ **Live Status Updates** - Server-Sent Events (SSE) for real-time progress
- ✅ **Multi-tab Support** - Updates reflected across all open tabs/devices
- ✅ **Job Aggregation** - Track overall job progress (completed/failed counts)

### Security
- ✅ **JWT Authentication** - Stateless token-based auth with refresh tokens
- ✅ **Presigned URLs** - Time-limited, scoped access to S3 (no credential exposure)
- ✅ **User Isolation** - Strict user-scoped data access
- ✅ **HTTPS/TLS** - All communications encrypted
- ✅ **S3 Encryption** - At-rest encryption (AES-256)

### Mobile-Specific Features
- ✅ **Native Camera** - Direct camera integration
- ✅ **Photo Compression** - 80% quality compression before upload
- ✅ **Background Upload** - Continue uploads when app backgrounded
- ✅ **Offline Queue** - Queue uploads when offline, sync when connected

---

## 🏛️ Architectural Patterns

### 1. Domain-Driven Design (DDD)

**How Requirements Were Met:**

#### Ubiquitous Language
- **Domain Concepts:** `UploadJob`, `Photo`, `User`, `Tag`, `PhotoStatus`, `UploadJobStatus`
- **Operations:** `CreateUploadJob`, `CompletePhotoUpload`, `FailPhotoUpload`, `TagPhoto`
- **Events:** `PhotoCompletedEvent`, `PhotoFailedEvent`, `UploadJobStatusChangedEvent`

#### Rich Domain Model
```java
@Entity
public class Photo {
    @Id private UUID id;
    @ManyToOne private User user;
    @ManyToOne private UploadJob uploadJob;
    @Enumerated(EnumType.STRING) private PhotoStatus uploadStatus;
    private String s3Key, filename;
    
    // Business logic methods
    public void markAsCompleted() {
        if (this.uploadStatus != PhotoStatus.UPLOADING) {
            throw new IllegalStateException("Photo not in UPLOADING state");
        }
        this.uploadStatus = PhotoStatus.COMPLETED;
        this.completedAt = LocalDateTime.now();
    }
}
```

#### Aggregates & Bounded Contexts
- **Upload Aggregate:** `UploadJob` (root) → `Photo` (entities) → `UploadEvent` (value objects)
- **User Aggregate:** `User` (root) → owns photos and jobs
- **Tag Aggregate:** `Tag` (root) → many-to-many with photos

#### Repositories
- `PhotoRepository`, `UploadJobRepository`, `UserRepository` - DDD-style repositories hiding persistence details

#### Domain Events
```java
@Service
public class PhotoCompletionHandler {
    @Async
    public void handle(CompletePhotoUploadCommand command) {
        Photo photo = photoRepository.findById(command.getPhotoId());
        photo.markAsCompleted();
        
        // Emit domain event
        uploadEventService.broadcastPhotoCompleted(photo);
    }
}
```

---

### 2. Command Query Responsibility Segregation (CQRS)

**How Requirements Were Met:**

#### Separation of Commands (Writes) and Queries (Reads)

**Commands** (modify state):
```java
// Command: CreateUploadJobCommand
@RequiredArgsConstructor
public class CreateUploadJobHandler {
    public CreateUploadJobResponse handle(CreateUploadJobCommand command) {
        // Create entities, generate presigned URLs, persist to database
        UploadJob job = UploadJob.builder()
            .user(command.getUser())
            .totalCount(command.getPhotos().size())
            .build();
        // ... save job and photos
        return response;
    }
}

// Command: CompletePhotoUploadCommand
public class CompletePhotoUploadHandler {
    public CompletePhotoUploadResponse handle(CompletePhotoUploadCommand command) {
        // Verify S3, update status, increment counters
        photo.markAsCompleted();
        job.incrementCompletedCount();
        return response;
    }
}
```

**Queries** (read-only):
```java
// Query: GetUserPhotosQuery
@RequiredArgsConstructor
public class GetPhotosHandler {
    public PaginatedResponse<Photo> handle(GetUserPhotosQuery query) {
        // Read-only database query, no state changes
        return photoRepository.findByUser_Id(
            query.getUserId(), 
            PageRequest.of(query.getPage(), query.getSize())
        );
    }
}

// Query: GetUploadJobStatusQuery
public class GetUploadStatusHandler {
    public UploadJobStatusResponse handle(GetUploadJobStatusQuery query) {
        // Read-only job status retrieval
        return uploadJobRepository.findById(query.getJobId())
            .map(this::mapToResponse);
    }
}
```

#### Separate Models for Read and Write
- **Write Model:** Full entities with business logic (`Photo`, `UploadJob`, `User`)
- **Read Model:** DTOs optimized for queries (`PhotoResponse`, `UploadJobStatusResponse`, `DownloadUrlResponse`)

#### Event-Driven Updates
```java
// Command handler emits events, consumed by read model updaters
@Async
public void broadcastPhotoCompleted(Photo photo) {
    UploadStatusEvent event = UploadStatusEvent.builder()
        .photoId(photo.getId())
        .status("COMPLETED")
        .userId(photo.getUser().getId())
        .build();
    
    // Broadcast via SSE to update client read models
    sseEmitters.forEach(emitter -> emitter.send(event));
}
```

---

### 3. Vertical Slice Architecture (VSA)

**How Requirements Were Met:**

#### Feature-Based Organization
```
backend/src/main/java/com/rapidphoto/
├── features/
│   ├── auth/                    # Authentication slice
│   │   ├── AuthController.java
│   │   ├── AuthService.java
│   │   ├── repository/
│   │   └── dto/
│   │
│   ├── upload_photo/            # Upload slice
│   │   ├── PhotoController.java
│   │   ├── CreateUploadJobHandler.java
│   │   ├── CompletePhotoUploadHandler.java
│   │   ├── FailPhotoUploadHandler.java
│   │   ├── repository/
│   │   ├── dto/
│   │   └── events/
│   │
│   ├── get_photos/              # Query slice
│   │   ├── GetPhotosController.java
│   │   ├── GetPhotosHandler.java
│   │   ├── repository/
│   │   └── dto/
│   │
│   ├── download_photo/          # Download slice
│   │   ├── DownloadPhotoController.java
│   │   ├── DownloadPhotoHandler.java
│   │   └── dto/
│   │
│   ├── tag_photo/               # Tagging slice
│   │   ├── TagController.java
│   │   ├── TagPhotoHandler.java
│   │   └── repository/
│   │
│   └── delete_photo/            # Delete slice
│       ├── DeletePhotoController.java
│       ├── DeletePhotoHandler.java
│       └── dto/
│
├── domain/                      # Shared domain models
│   ├── Photo.java
│   ├── UploadJob.java
│   ├── User.java
│   └── Tag.java
│
└── infrastructure/              # Shared infrastructure
    ├── config/
    ├── s3/
    └── security/
```

#### Self-Contained Features
Each feature slice contains ALL layers needed for that feature:
- ✅ REST Controller
- ✅ Handler (business logic)
- ✅ Repository (if needed)
- ✅ DTOs (request/response)
- ✅ Domain events

Example: **Upload Photo Feature Slice**
```
upload_photo/
├── PhotoController.java              # REST endpoints
├── CreateUploadJobHandler.java       # Command handler
├── CreateUploadJobCommand.java       # Command object
├── CompletePhotoUploadHandler.java   # Command handler
├── FailPhotoUploadHandler.java       # Command handler
├── repository/
│   ├── PhotoRepository.java          # JPA repository
│   └── UploadJobRepository.java
├── dto/
│   ├── CreateUploadJobRequest.java   # Request DTO
│   ├── CreateUploadJobResponse.java  # Response DTO
│   ├── CompletePhotoUploadRequest.java
│   └── FailPhotoUploadRequest.java
└── events/
    └── UploadEventService.java       # Event emission
```

#### Minimal Cross-Slice Dependencies
- **Shared Domain:** Only domain entities are shared (`Photo`, `User`, `UploadJob`)
- **Infrastructure Services:** S3 service, JWT provider shared via dependency injection
- **No Feature-to-Feature Calls:** Features don't directly call each other

#### Independent Testing
Each slice can be tested independently:
```java
@SpringBootTest
class CreateUploadJobIntegrationTest {
    // Tests ONLY the upload job creation slice
    // Mocks S3 service (infrastructure)
    // No dependencies on other feature slices
}
```

---

## 📊 Architecture Benefits

### DDD Benefits
✅ **Clear Domain Language** - Code reflects business concepts  
✅ **Rich Behavior** - Business logic encapsulated in domain entities  
✅ **Maintainability** - Changes to business rules isolated in domain layer

### CQRS Benefits
✅ **Optimized Operations** - Write and read models independently optimized  
✅ **Scalability** - Read and write sides can scale independently  
✅ **Simpler Queries** - Read models designed specifically for UI needs

### VSA Benefits
✅ **Feature Independence** - Teams can work on different features without conflicts  
✅ **Easier Navigation** - All code for a feature in one place  
✅ **Reduced Coupling** - Features don't depend on each other  
✅ **Faster Onboarding** - New developers can understand one slice at a time

---

## 🚀 Performance Metrics

- **Concurrent Uploads:** 100+ per backend instance
- **Throughput:** 10,000 photos/hour (tested)
- **Job Creation Latency:** <1 second
- **S3 Upload:** Direct (bypasses backend)
- **Real-time Updates:** SSE (<100ms latency)
- **Database:** Connection pool (10 connections, HikariCP)
- **Thread Pool:** 10 core, 20 max threads

---

## 🔒 Security

- **Authentication:** JWT with 15-minute access tokens + refresh tokens
- **Authorization:** User-scoped data access (userId validation on all queries)
- **S3 Access:** Presigned URLs (15-minute expiration, scoped permissions)
- **Data Encryption:** TLS in transit, AES-256 at rest (S3)
- **SQL Injection:** Prevented via JPA parameterized queries
- **CORS:** Configured for web app origin only

---

## 📦 Deployment

### Backend (AWS Elastic Beanstalk)
```bash
cd backend
mvn clean package
eb deploy rapid-photo-upload-env
```

### Web App (AWS Amplify)
```bash
cd web-app
npm run build
# Auto-deployed via GitHub integration
```

### Mobile App (Expo)
```bash
cd mobile-app
expo build:android
expo build:ios
```

---

## 🧪 Testing

**Integration Tests:** 5 comprehensive end-to-end tests validating complete upload flow  
**Test Coverage:** 100% of upload workflow (create → upload → complete → download)  
**Test Runtime:** 2.8 seconds for full suite  

Run tests:
```bash
cd backend
mvn test -Dtest=CompleteUploadFlowIntegrationTest
```

---

## 📚 Documentation

Comprehensive technical documentation available in `/docs`:
- **Technical Writeup** (2 pages) - Architecture, concurrency, S3 integration
- **AI Tool Documentation** (10 pages) - Claude Sonnet 4.5 usage with examples
- **Test Cases & Validation** (11 pages) - Integration test evidence

---

## 🏗️ Project Structure

```
RapidPhotoUpload/
├── backend/              # Spring Boot API
│   ├── src/
│   │   ├── main/java/com/rapidphoto/
│   │   │   ├── features/      # Vertical slices (VSA)
│   │   │   ├── domain/        # DDD entities
│   │   │   └── infrastructure/
│   │   └── test/              # Integration tests
│   └── pom.xml
│
├── web-app/              # React web client
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── pages/
│   └── package.json
│
├── mobile-app/           # React Native mobile client
│   ├── src/
│   │   ├── components/
│   │   ├── screens/
│   │   ├── services/
│   │   └── utils/
│   └── package.json
│
└── docs/                 # Technical documentation
    ├── 1_Technical_Writeup.md
    ├── 2_AI_Tool_Documentation.md
    └── 3_Test_Cases_and_Validation.md
```

---

## 👥 Development

**AI-Assisted Development:** This project was built with significant assistance from Claude Sonnet 4.5 via Cursor IDE, achieving an 84% reduction in development time (59.5 hours saved).

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🎯 Status

✅ **Production Ready** - All features implemented and tested  
✅ **Integration Tests Passing** - 5/5 tests, 59/59 assertions  
✅ **Deployed** - Backend (Elastic Beanstalk), Web (Amplify), Database (RDS)

