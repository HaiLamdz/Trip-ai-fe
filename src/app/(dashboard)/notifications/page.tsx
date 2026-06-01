'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface Notification {
  id: number; type: string; title: string; body: string;
  read_at: string | null; created_at: string;
  data?: { trip_id?: number };
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchNotifications(); }, []);

  const markRead = async (id: number) => {
    await api.put(`/notifications/${id}/read`);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
  };

  const markAllRead = async () => {
    await api.put('/notifications/read-all');
    setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
  };

  const handleClick = async (n: Notification) => {
    if (!n.read_at) await markRead(n.id);
    if (n.data?.trip_id) router.push(`/trips/${n.data.trip_id}`);
  };

  const TYPE_ICONS: Record<string, string> = {
    trip_completed: '✅', trip_failed: '❌', budget_warning: '⚠️', weather_alert: '🌧️',
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">🔔 Thông báo</h1>
        {notifications.some(n => !n.read_at) && (
          <button onClick={markAllRead} className="btn-outline text-sm">Đánh dấu tất cả đã đọc</button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500">Đang tải...</div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20 text-gray-500">Chưa có thông báo nào</div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div
              key={n.id}
              onClick={() => handleClick(n)}
              className={`card cursor-pointer hover:shadow-md transition-shadow ${!n.read_at ? 'border-l-4 border-l-blue-500' : ''}`}
            >
              <div className="flex gap-3">
                <span className="text-2xl">{TYPE_ICONS[n.type] || '📢'}</span>
                <div className="flex-1">
                  <p className={`font-medium text-sm ${!n.read_at ? 'text-gray-900' : 'text-gray-600'}`}>{n.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString('vi-VN')}</p>
                </div>
                {!n.read_at && <div className="w-2 h-2 bg-blue-500 rounded-full mt-1 shrink-0" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
