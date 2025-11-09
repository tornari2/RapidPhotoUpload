/**
 * Utility functions for retry logic and timeout handling
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  timeoutMs?: number;
  shouldRetry?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  timeoutMs: 30000,
  shouldRetry: (error) => {
    // Retry on network errors, timeouts, and 5xx server errors
    if (!error.response) return true; // Network error
    const status = error.response.status;
    return status >= 500 || status === 408 || status === 429; // Server errors, timeout, rate limit
  },
  onRetry: () => {},
};

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  multiplier: number
): number {
  const exponentialDelay = initialDelay * Math.pow(multiplier, attempt);
  const cappedDelay = Math.min(exponentialDelay, maxDelay);
  // Add jitter (±25% randomness) to prevent thundering herd
  const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1);
  return Math.round(cappedDelay + jitter);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      // Add timeout wrapper
      const result = await withTimeout(fn(), opts.timeoutMs);
      return result;
    } catch (error) {
      lastError = error;

      // Check if we should retry
      const isLastAttempt = attempt === opts.maxRetries;
      const shouldRetryError = opts.shouldRetry(error);

      if (isLastAttempt || !shouldRetryError) {
        throw error;
      }

      // Calculate delay and notify
      const delay = calculateDelay(
        attempt,
        opts.initialDelayMs,
        opts.maxDelayMs,
        opts.backoffMultiplier
      );
      opts.onRetry(attempt + 1, error);

      // Wait before retrying
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Add timeout to a promise
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutError?: Error
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(
          timeoutError || new Error(`Operation timed out after ${timeoutMs}ms`)
        );
      }, timeoutMs);
    }),
  ]);
}

/**
 * Retry specifically for S3 uploads with appropriate settings
 */
export async function retryS3Upload<T>(
  fn: () => Promise<T>,
  onRetry?: (attempt: number, error: any) => void
): Promise<T> {
  return retryWithBackoff(fn, {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 5000,
    backoffMultiplier: 2,
    timeoutMs: 60000, // 60 seconds for large files
    shouldRetry: (error) => {
      // Retry on network errors and certain S3 errors
      if (!error.response) return true;
      const status = error.response?.status;
      // Retry on 503 Service Unavailable, 500 Internal Error, 408 Timeout
      return status === 503 || status === 500 || status === 408;
    },
    onRetry,
  });
}

/**
 * Retry for general API calls
 */
export async function retryApiCall<T>(
  fn: () => Promise<T>,
  onRetry?: (attempt: number, error: any) => void
): Promise<T> {
  return retryWithBackoff(fn, {
    maxRetries: 2,
    initialDelayMs: 500,
    maxDelayMs: 3000,
    backoffMultiplier: 2,
    timeoutMs: 30000, // 30 seconds
    shouldRetry: (error) => {
      if (!error.response) return true; // Network error
      const status = error.response.status;
      // Don't retry client errors (4xx) except timeout and rate limit
      if (status >= 400 && status < 500) {
        return status === 408 || status === 429;
      }
      // Retry server errors (5xx)
      return status >= 500;
    },
    onRetry,
  });
}

