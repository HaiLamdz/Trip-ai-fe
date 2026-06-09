'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import MobileNav from '@/components/layout/MobileNav';

interface Trip {
  id: number; destination: string; start_date: string;
  duration_days: number; budget: number; status: string;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  completed:  { label: 'Hoàn thành', color: '#059669', bg: 'rgba(5,150,105,0.1)' },
  processing: { label: 'Đang xử lý', color: '#d97706', bg: 'rgba(217,119,6,0.1)' },
  failed:     { label: 'Thất bại',   color: '#dc2626', bg: 'rgba(220,38,38,0.1)' },
  draft:      { label: 'Nháp',       color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
};

export default function FavoritesPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/favorites')
      .then(({ data }) => setTrips(data.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ background: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif', paddingBottom: 80 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', margin: '0 0 4px', letterSpacing: '-0.5px' }}>
            ❤️ Lịch trình yêu thích
          </h1>
          <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
            Những chuyến đi bạn đã đánh dấu yêu thích
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
        {!loading && trips.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>❤️</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Chưa có lịch trình yêu thích</h3>
            <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 20px' }}>
              Lưu lịch trình từ trang chi tiết để xem lại ở đây
            </p>
            <Link href="/trips/create"
              style={{ display: 'inline-block', padding: '10px 24px', borderRadius: 12, background: '#4f6ef7', color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
              Tạo lịch trình mới
            </Link>
          </div>
        )}

        {/* Grid */}
        {!loading && trips.length > 0 && (
          <>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {trips.length} lịch trình
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {trips.map(trip => {
                const st = STATUS_MAP[trip.status] || STATUS_MAP.draft;
                return (
                  <Link key={trip.id} href={`/trips/${trip.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'box-shadow 0.15s, border-color 0.15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(79,110,247,0.12)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(79,110,247,0.3)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'; (e.currentTarget as HTMLDivElement).style.borderColor = '#e2e8f0'; }}>

                      {/* Destination + status */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: 0, lineHeight: 1.3, flex: 1 }}>
                          📍 {trip.destination}
                        </h3>
                        <span style={{ fontSize: 11, fontWeight: 600, color: st.color, background: st.bg, padding: '3px 9px', borderRadius: 99, flexShrink: 0, whiteSpace: 'nowrap' }}>
                          {st.label}
                        </span>
                      </div>

                      {/* Meta */}
                      <div style={{ display: 'flex', gap: 12, fontSize: 13, color: '#64748b', marginBottom: 10, flexWrap: 'wrap' }}>
                        <span>📅 {formatDate(trip.start_date)}</span>
                        <span>🗓 {trip.duration_days} ngày</span>
                      </div>

                      {/* Budget */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: '#10b981' }}>
                          {formatCurrency(trip.budget)}
                        </span>
                        <span style={{ fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                          Xem chi tiết
                          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                        </span>
                      </div>
                    </div>
                  </Link>
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
