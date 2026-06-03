'use client';

import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';

interface TripStatus {
  status: 'draft' | 'processing' | 'completed' | 'failed';
  progress_message: string;
}

export function useTripStatus(tripId: string | number, enabled = true) {
  const [status, setStatus] = useState<TripStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Track previous status để tránh trigger fetchTrip nhiều lần
  const prevStatusRef = useRef<string | null>(null);

  useEffect(() => {
    // Reset khi enable thay đổi
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    if (!tripId) return;

    const poll = async () => {
      try {
        const { data } = await api.get<TripStatus>(`/trips/${tripId}/status`);
        setStatus(data);
        prevStatusRef.current = data.status;

        if (data.status === 'completed' || data.status === 'failed') {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Lỗi kết nối';
        setError(msg);
        // Không stop poll khi lỗi mạng tạm thời — thử lại sau
      }
    };

    poll(); // immediate first call
    intervalRef.current = setInterval(poll, 3000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [tripId, enabled]);

  return { status, error };
}
