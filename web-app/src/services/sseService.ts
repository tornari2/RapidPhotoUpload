import type { UploadStatusEvent } from '../types/upload';

/**
 * Service for handling Server-Sent Events (SSE) connections
 */
export class SSEService {
  private eventSource: EventSource | null = null;
  private listeners: Map<string, Set<(event: UploadStatusEvent) => void>> = new Map();

  /**
   * Connect to SSE stream for an upload job
   */
  connect(jobId: string, onEvent: (event: UploadStatusEvent) => void): void {
    // Close existing connection if any
    this.disconnect();

    // Use relative path to leverage Vite proxy
    // Note: EventSource doesn't support custom headers, so authentication needs to be handled differently
    // In production, consider using a different approach or ensuring the endpoint accepts token in query
    const url = `/api/upload-jobs/${jobId}/status`;

    this.eventSource = new EventSource(url);

    // Store listener
    if (!this.listeners.has(jobId)) {
      this.listeners.set(jobId, new Set());
    }
    this.listeners.get(jobId)!.add(onEvent);

    // Handle incoming events
    this.eventSource.onmessage = (event) => {
      try {
        const data: UploadStatusEvent = JSON.parse(event.data);
        // Notify all listeners for this job
        this.listeners.get(jobId)?.forEach((listener) => listener(data));
      } catch (error) {
        console.error('Error parsing SSE event:', error);
      }
    };

    // Handle connection errors
    this.eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      // EventSource will automatically reconnect, but we can handle errors here
    };
  }

  /**
   * Disconnect from SSE stream
   */
  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  /**
   * Remove a specific listener
   */
  removeListener(jobId: string, listener: (event: UploadStatusEvent) => void): void {
    this.listeners.get(jobId)?.delete(listener);
    if (this.listeners.get(jobId)?.size === 0) {
      this.listeners.delete(jobId);
    }
  }
}

// Export singleton instance
export const sseService = new SSEService();

