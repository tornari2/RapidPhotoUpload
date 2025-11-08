import { useEffect, useRef } from 'react';
import { sseService } from '../services/sseService';
import type { UploadStatusEvent } from '../types/upload';

/**
 * Hook for managing SSE connections
 */
export function useSSE(
  jobId: string | null,
  onEvent: (event: UploadStatusEvent) => void
) {
  const onEventRef = useRef(onEvent);

  // Keep callback ref up to date
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!jobId) {
      return;
    }

    const handler = (event: UploadStatusEvent) => {
      onEventRef.current(event);
    };

    sseService.connect(jobId, handler);

    return () => {
      sseService.removeListener(jobId, handler);
      sseService.disconnect();
    };
  }, [jobId]);
}

