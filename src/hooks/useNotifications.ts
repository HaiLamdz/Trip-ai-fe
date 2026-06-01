'use client';

import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';

export function useNotifications(enabled = true) {
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchCount = async () => {
    try {
      const { data } = await api.get<{ unread_count: number }>('/notifications/unread-count');
      setUnreadCount(data.unread_count);
    } catch {
      // silently fail
    }
  };

  useEffect(() => {
    if (!enabled) return;
    fetchCount();
    intervalRef.current = setInterval(fetchCount, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled]);

  return { unreadCount, refetch: fetchCount };
}
