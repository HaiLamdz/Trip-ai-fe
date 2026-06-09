'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import MobileNav from '@/components/layout/MobileNav';

interface SavedPlace {
  id: number; place_name: string; place_type: string | null;
  latitude: number | null; longitude: number | null; notes: string | null;
  created_at: string;
}

const TYPE_ICONS: Record<string, string> = {
  food: '🍜', cafe: '☕', attraction: '🏛️', hotel: '🏨', transport: '🚗', other: '📍',
};
const TYPE_LABELS: Record<string, string> = {
  food: 'Ẩm thực', cafe: 'Cà phê', attraction: 'Tham quan',
  hotel: 'Lưu trú', transport: 'Di chuyển', other: 'Khác',
};
const TYPE_COLORS: Record<string, string> = {
  food: '#f97316', cafe: '#a78bfa', attraction: '#3b82f6',
  hotel: '#10b981', transport: '#6b7280', other: '#94a3b8',
};

export default function SavedPlacesPage() {
  const [places, setPlaces] = useState<SavedPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    api.get('/places/saved')
      .then(({ data }) => setPlaces(data.data))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await api.delete(`/places/saved/${id}`);
      setPlaces(prev => prev.filter(p => p.id !== id));
    } catch {}
    finally { setDeletingId(null); }
  };

  return (
    <div style={{ background: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif', paddingBottom: 80 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', margin: '0 0 4px', letterSpacing: '-0.5px' }}>
            📍 Địa điểm đã lưu
          </h1>
          <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
            Những nơi bạn muốn ghé thăm trong chuyến đi
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0', gap: 12, color: '#64748b', fontSize: 14 }}>
            <div style={{ width: 22, height: 22, border: '2.5px solid #e2e8f0', borderTopColor: '#4f6ef7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            Đang tải…
          </div>
        )}

        {/* Empty */}
        {!loading && places.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>📍</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Chưa có địa điểm nào</h3>
            <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
              Lưu địa điểm từ trang chi tiết lịch trình để xem lại ở đây
            </p>
          </div>
        )}

        {/* Grid */}
        {!loading && places.length > 0 && (
          <>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {places.length} địa điểm
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {places.map(place => {
                const typeKey = place.place_type || 'other';
                const color = TYPE_COLORS[typeKey] || '#94a3b8';
                const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.place_name)}`;
                return (
                  <div key={place.id}
                    style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    {/* Icon */}
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: `${color}12`, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                      {TYPE_ICONS[typeKey] || '📍'}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {place.place_name}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: place.notes ? 6 : 0 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color, background: `${color}12`, padding: '2px 8px', borderRadius: 99 }}>
                          {TYPE_LABELS[typeKey] || 'Khác'}
                        </span>
                        {place.latitude && place.longitude && (
                          <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#60a5fa', textDecoration: 'none', fontWeight: 500 }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            Bản đồ
                          </a>
                        )}
                      </div>
                      {place.notes && (
                        <p style={{ fontSize: 12, color: '#64748b', margin: 0, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {place.notes}
                        </p>
                      )}
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(place.id)}
                      disabled={deletingId === place.id}
                      style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 8, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444', cursor: deletingId === place.id ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
                      {deletingId === place.id ? '…' : '🗑'}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
      <MobileNav />
    </div>
  );
}
