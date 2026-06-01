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

  useEffect(() => {
    if (!enabled || !tripId) return;

    const poll = async () => {
      try {
        const { data } = await api.get<TripStatus>(`/trips/${tripId}/status`);
        setStatus(data);

        if (data.status === 'completed' || data.status === 'failed') {
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Lỗi kết nối';
        setError(msg);
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    };

    poll(); // immediate first call
    intervalRef.current = setInterval(poll, 3000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [tripId, enabled]);

  return { status, error };
}
