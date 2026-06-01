'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useUnsplashImage } from '@/hooks/useUnsplashImage';

interface Trip {
  id: number;
  destination: string;
  start_date: string;
  duration_days: number;
  budget: number;
  status: 'draft' | 'processing' | 'completed' | 'failed';
  created_at: string;
}

interface PaginatedTrips {
  data: Trip[];
  current_page: number;
  last_page: number;
  total: number;
}

const D = {
  bg: '#0d1117', surface: '#161b22', surface2: '#1c2128',
  border: 'rgba(255,255,255,0.07)', border2: 'rgba(255,255,255,0.12)',
  text: '#e6edf3', textMuted: 'rgba(255,255,255,0.45)', textDim: 'rgba(255,255,255,0.25)',
  accent: '#4f6ef7',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  completed:  { label: 'Hoàn thành',  color: '#34d399', bg: 'rgba(52,211,153,0.15)' },
  processing: { label: 'Đang xử lý', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' },
  failed:     { label: 'Thất bại',     color: '#f87171', bg: 'rgba(248,113,113,0.15)' },
  draft:      { label: 'Nháp',      color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' },
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Chào buổi sáng';
  if (h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

// Trip card with Unsplash background image
function TripCard({ trip, onDelete, onDuplicate, large = false }: {
  trip: Trip; onDelete: (id: number) => void; onDuplicate: (id: number) => void; large?: boolean;
}) {
  const { url: imgUrl } = useUnsplashImage('attraction', trip.destination);
  const status = STATUS_CONFIG[trip.status] ?? STATUS_CONFIG.draft;
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Link href={`/trips/${trip.id}`} style={{ textDecoration: 'none', display: 'block', position: 'relative', borderRadius: 16, overflow: 'hidden', height: large ? 280 : 200, background: D.surface2, cursor: 'pointer' }}>
      {/* Background image */}
      {imgUrl && (
        <Image src={imgUrl} alt={trip.destination} fill className="object-cover" sizes="(max-width: 800px) 100vw, 50vw" unoptimized />
      )}
      {/* Dark overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)' }} />

      {/* Top badges */}
      <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: status.color, background: status.bg, padding: '3px 9px', borderRadius: 99, backdropFilter: 'blur(4px)' }}>
          {status.label}
        </span>
        {trip.status === 'completed' && (
          <span style={{ fontSize: 11, fontWeight: 600, color: '#818cf8', background: 'rgba(79,110,247,0.2)', padding: '3px 9px', borderRadius: 99, backdropFilter: 'blur(4px)' }}>
            AI Tạo
          </span>
        )}
      </div>

      {/* Menu button */}
      <div style={{ position: 'absolute', top: 10, right: 10 }} onClick={e => { e.preventDefault(); setMenuOpen(v => !v); }}>
        <button style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
          ✎
        </button>
        {menuOpen && (
          <div style={{ position: 'absolute', top: 36, right: 0, background: D.surface, border: `1px solid ${D.border2}`, borderRadius: 10, padding: 6, zIndex: 10, minWidth: 140, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
            onClick={e => e.preventDefault()}>
            <button onClick={e => { e.preventDefault(); onDuplicate(trip.id); setMenuOpen(false); }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 12px', fontSize: 13, color: D.text, background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6 }}>
              📋 Nhân bản
            </button>
            <button onClick={e => { e.preventDefault(); onDelete(trip.id); setMenuOpen(false); }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 12px', fontSize: 13, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6 }}>
              🗑 Xóa
            </button>
          </div>
        )}
      </div>

      {/* Bottom content */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: large ? '16px 16px 18px' : '12px 14px 14px' }}>
        {large && (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
            {formatDate(trip.start_date)} · {trip.duration_days} ngày
          </div>
        )}
        <h3 style={{ fontSize: large ? 22 : 15, fontWeight: 700, color: '#fff', margin: '0 0 8px', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
          {trip.destination}
        </h3>
        {large && (
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 99, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', color: '#fff', fontSize: 12, fontWeight: 600, border: '1px solid rgba(255,255,255,0.2)' }}>
              👁 Xem nhanh
            </span>
          </div>
        )}
        {!large && (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
            {formatDate(trip.start_date)}
          </div>
        )}
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [pagination, setPagination] = useState({ current: 1, last: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchTrips = async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await api.get<PaginatedTrips>('/trips', { params: { page } });
      setTrips(data.data);
      setPagination({ current: data.current_page, last: data.last_page, total: data.total });
    } catch { router.push('/login'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTrips(); }, []); // eslint-disable-line

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/trips/${id}`);
      setDeleteId(null);
      setTrips(prev => prev.filter(t => t.id !== id));
      setPagination(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }));
      fetchTrips(pagination.current);
    } catch {}
  };

  const handleDuplicate = async (id: number) => {
    try {
      const { data } = await api.post(`/trips/${id}/duplicate`);
      router.push(`/trips/${data.trip.id}`);
    } catch {}
  };

  const totalDays = trips.filter(t => t.status === 'completed').reduce((s, t) => s + t.duration_days, 0);
  const upcoming = trips.filter(t => t.status === 'processing' || (t.status === 'completed' && new Date(t.start_date) >= new Date())).length;
  const firstName = user?.name?.split(' ').pop() || 'there';

  // Layout: first trip = large, rest = small grid
  const [firstTrip, ...restTrips] = trips;

  return (
    <div style={{ width: '100%' }}>

      {/* ── Greeting ── */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: D.text, letterSpacing: '-1px', margin: '0 0 6px' }}>
          {greeting()}, {firstName}. Hôm nay đi đâu?
        </h1>
        <p style={{ fontSize: 15, color: D.textMuted, margin: 0 }}>
          Lịch trình AI cá nhân hóa của bạn đã sẵn sàng.{' '}
          {upcoming > 0 && `Bạn có ${upcoming} chuyến đi sắp tới trong tháng này.`}
        </p>
      </div>

      {/* ── Stats row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'TỔNG CHUYẾN ĐI', value: String(pagination.total).padStart(2, '0'), icon: '✈' },
          { label: 'NGÀY ĐÃ ĐI', value: String(totalDays).padStart(2, '0'), icon: '🌍' },
          { label: 'SẮP TỚI', value: String(upcoming).padStart(2, '0'), icon: '📅' },
        ].map(stat => (
          <div key={stat.label} style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: D.textDim, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>{stat.label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: D.text, letterSpacing: '-1px', fontVariantNumeric: 'tabular-nums' }}>{stat.value}</div>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: D.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      {/* ── Trip grid ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: D.textMuted }}>
          <div style={{ width: 28, height: 28, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: D.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          Đang tải lịch trình…
        </div>
      ) : trips.length === 0 ? (
        // Empty state — show only CTA
        <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 16, padding: '48px 32px', textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>✦✦</div>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: D.text, marginBottom: 8 }}>Bắt đầu hành trình AI tiếp theo</h3>
          <p style={{ fontSize: 14, color: D.textMuted, marginBottom: 24, maxWidth: 360, margin: '0 auto 24px', lineHeight: 1.6 }}>
            Chưa có ý tưởng? Để AI phân tích sở thích và đề xuất lịch trình phù hợp với phong cách du lịch và ngân sách của bạn.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <Link href="/trips/create" style={{ padding: '10px 24px', borderRadius: 10, background: D.accent, color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
              Bắt đầu ngay
            </Link>
            <Link href="/trips/create" style={{ padding: '10px 24px', borderRadius: 10, background: D.surface2, color: D.text, fontSize: 14, fontWeight: 500, textDecoration: 'none', border: `1px solid ${D.border2}` }}>
              Xem mẫu
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Main grid: large first card + smaller cards + CTA */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

            {/* Large first card */}
            {firstTrip && (
              <div style={{ gridRow: 'span 2' }}>
                <TripCard trip={firstTrip} onDelete={setDeleteId} onDuplicate={handleDuplicate} large />
              </div>
            )}

            {/* Second card */}
            {restTrips[0] && (
              <TripCard trip={restTrips[0]} onDelete={setDeleteId} onDuplicate={handleDuplicate} />
            )}

            {/* Third card */}
            {restTrips[1] && (
              <TripCard trip={restTrips[1]} onDelete={setDeleteId} onDuplicate={handleDuplicate} />
            )}
          </div>

          {/* More trips row */}
          {restTrips.length > 2 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 12 }}>
              {restTrips.slice(2).map(trip => (
                <TripCard key={trip.id} trip={trip} onDelete={setDeleteId} onDuplicate={handleDuplicate} />
              ))}
            </div>
          )}

          {/* CTA card */}
          <div style={{ marginTop: 12, background: D.surface, border: `1px solid ${D.border}`, borderRadius: 16, padding: '32px 28px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>✦✦</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: D.text, marginBottom: 8 }}>Bắt đầu hành trình AI tiếp theo</h3>
            <p style={{ fontSize: 13, color: D.textMuted, marginBottom: 20, maxWidth: 340, margin: '0 auto 20px', lineHeight: 1.6 }}>
              Chưa có ý tưởng? Để AI phân tích sở thích và đề xuất lịch trình phù hợp với phong cách du lịch và ngân sách của bạn.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <Link href="/trips/create" style={{ padding: '9px 22px', borderRadius: 10, background: D.accent, color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                Bắt đầu ngay
              </Link>
              <Link href="/trips/create" style={{ padding: '9px 22px', borderRadius: 10, background: D.surface2, color: D.text, fontSize: 13, fontWeight: 500, textDecoration: 'none', border: `1px solid ${D.border2}` }}>
                Xem mẫu
              </Link>
            </div>
          </div>

          {/* Pagination */}
          {pagination.last > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
              {Array.from({ length: pagination.last }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => fetchTrips(p)} style={{
                  width: 34, height: 34, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
                  background: p === pagination.current ? D.accent : D.surface,
                  color: p === pagination.current ? '#fff' : D.textMuted,
                }}>
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 16 }}>
          <div style={{ background: D.surface, border: `1px solid ${D.border2}`, borderRadius: 16, padding: '28px 28px 24px', maxWidth: 360, width: '100%' }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: D.text, marginBottom: 8 }}>Xóa lịch trình?</h3>
            <p style={{ fontSize: 14, color: D.textMuted, marginBottom: 24 }}>Hành động này không thể hoàn tác.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteId(null)} style={{ flex: 1, padding: '9px', borderRadius: 10, background: D.surface2, border: `1px solid ${D.border2}`, color: D.text, fontSize: 14, cursor: 'pointer' }}>Hủy</button>
              <button onClick={() => handleDelete(deleteId)} style={{ flex: 1, padding: '9px', borderRadius: 10, background: '#dc2626', border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Xóa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
