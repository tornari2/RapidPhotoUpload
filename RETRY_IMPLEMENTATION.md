# Retry Logic and Timeout Handling Implementation

## Summary

Implemented comprehensive retry logic with exponential backoff and timeout handling across all API calls and S3 uploads to improve reliability and handle transient network failures.

## What Was Added

### 1. **Retry Utilities Module** (`utils/retryUtils.ts`)

A centralized utility module that provides:

- **`retryWithBackoff<T>`**: Generic retry function with exponential backoff and jitter
  - Configurable max retries (default: 3)
  - Exponential backoff with jitter to prevent thundering herd
  - Smart retry decisions based on error types
  - Timeout support
  
- **`withTimeout<T>`**: Promise timeout wrapper
  - Adds configurable timeouts to any promise
  - Default: 30 seconds for API calls, 60 seconds for S3 uploads

- **`retryS3Upload<T>`**: Specialized retry for S3 uploads
  - 3 retries with 1-5 second delays
  - 60-second timeout for large files
  - Retries on 503, 500, 408 status codes and network errors

- **`retryApiCall<T>`**: Specialized retry for API calls
  - 2 retries with 0.5-3 second delays
  - 30-second timeout
  - Retries on 5xx errors, 408 (timeout), 429 (rate limit)
  - Doesn't retry 4xx client errors (except timeout/rate limit)

### 2. **API Client Enhancement** (`services/api.ts`)

- Added 30-second timeout to all axios requests
- Prevents requests from hanging indefinitely

### 3. **Upload Service** (`services/uploadService.ts`)

Enhanced with retry logic for:
- ✅ **Create upload job** - Retries API calls with exponential backoff
- ✅ **S3 uploads** - 3 automatic retries with progress tracking reset
- ✅ **Complete photo upload** - Retries completion notification
- ✅ **Fail photo upload** - Retries failure notification

Special features:
- Progress callback resets to 0 on retry (UI reflects retry state)
- 60-second timeout for large file uploads
- Console warnings on retry attempts

### 4. **Photo Service** (`services/photoService.ts`)

All operations now have retry logic:
- ✅ Get user photos (listing)
- ✅ Get download URL
- ✅ Get photo metadata
- ✅ Delete photo

### 5. **Auth Service** (`services/authService.ts`)

Protected authentication operations:
- ✅ User registration
- ✅ User login
- ✅ Token refresh

### 6. **Tag Service** (`services/tagService.ts`)

Reliable tagging operations:
- ✅ Tag single photo
- ✅ Bulk tag photos

### 7. **Download Service** (`services/downloadService.ts`)

Enhanced image download reliability:
- ✅ Single photo download with retry
- ✅ 60-second timeout for large images
- ✅ Retries on fetch failures
- ✅ Proper error handling with status checking

## Retry Strategy

### Exponential Backoff Algorithm

```
delay = min(initialDelay * (multiplier ^ attempt), maxDelay) + jitter
```

- **Jitter**: ±25% randomness prevents simultaneous retries from multiple clients
- **Capped delays**: Maximum delay prevents excessive wait times

### Retry Decision Logic

**Will Retry:**
- Network errors (no response)
- 5xx server errors
- 408 Request Timeout
- 429 Rate Limit (for API calls)
- 503 Service Unavailable (for S3)

**Won't Retry:**
- 4xx client errors (bad request, unauthorized, not found, etc.)
- Exceptions: 408 and 429 are retried

## Performance Impact

**Minimal to None:**
- Retry logic only activates on failures
- Exponential backoff prevents rapid retry storms
- Jitter prevents thundering herd
- Timeouts prevent infinite hangs
- Total overhead on success: ~0ms (no retry needed)
- Total overhead on failure: 1-5 seconds per retry (exponential)

## Benefits

1. **Improved Reliability**: Automatic recovery from transient failures
2. **Better UX**: Users don't see intermittent failures
3. **Network Resilience**: Handles spotty connections gracefully
4. **S3 Reliability**: Handles S3's eventual consistency and transient errors
5. **Progress Tracking**: Upload progress UI reflects retry state
6. **Smart Retries**: Only retries errors that are likely to succeed on retry

## Configuration

Default settings are optimized for web applications, but can be customized:

- API calls: 2 retries, 30s timeout
- S3 uploads: 3 retries, 60s timeout
- Download images: 3 retries, 60s timeout

## Error Handling

- All retries log warnings to console
- Final failures bubble up with original error
- User-facing error messages remain unchanged
- Retry attempts are transparent to UI components

