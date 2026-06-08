'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
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
  num_people?: number;
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
  bg: '#f5f6fa',
  surface: '#ffffff',
  surface2: '#f0f2f8',
  border: 'rgba(0,0,0,0.07)',
  border2: 'rgba(0,0,0,0.12)',
  text: '#1a1d2e',
  textMuted: 'rgba(26,29,46,0.5)',
  textDim: 'rgba(26,29,46,0.3)',
  accent: '#2563eb',
  accentLight: '#eff3ff',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  completed:  { label: 'ĐÃ LÊN KẾ HOẠCH', color: '#059669', bg: 'rgba(5,150,105,0.15)' },
  processing: { label: 'ĐANG XỬ LÝ',       color: '#d97706', bg: 'rgba(217,119,6,0.15)' },
  failed:     { label: 'THẤT BẠI',          color: '#dc2626', bg: 'rgba(220,38,38,0.15)' },
  draft:      { label: 'NHÁP',              color: '#6b7280', bg: 'rgba(107,114,128,0.15)' },
};

/* ──────────────────────────────────────────
   MOBILE: Hero card (current trip)
────────────────────────────────────────── */
function MobileHeroCard({ trip }: { trip: Trip }) {
  const { url: imgUrl } = useUnsplashImage('attraction', trip.destination);

  const daysTo = Math.ceil(
    (new Date(trip.start_date).getTime() - Date.now()) / 86_400_000,
  );
  const isUpcoming = daysTo >= 0;

  return (
    <div style={{ margin: '0 20px 20px', borderRadius: 20, overflow: 'hidden', position: 'relative', height: 210, boxShadow: '0 8px 32px rgba(37,99,235,0.18)' }}>
      {imgUrl && (
        <Image src={imgUrl} alt={trip.destination} fill className="object-cover" sizes="100vw" unoptimized />
      )}
      {/* dark overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,14,40,0.85) 0%, rgba(10,14,40,0.35) 55%, transparent 100%)' }} />

      {/* bottom-left: label + name */}
      <div style={{ position: 'absolute', bottom: 16, left: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.2px', color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', marginBottom: 4 }}>
          Chuyến đi hiện tại
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
          {trip.destination}
        </div>
      </div>

      {/* top-right / bottom-right: days badge */}
      {isUpcoming && (
        <div style={{
          position: 'absolute', bottom: 20, right: 16,
          background: D.accent,
          borderRadius: 12,
          padding: '6px 12px',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(37,99,235,0.4)',
        }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{daysTo}</div>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>NGÀY NỮA</div>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────
   MOBILE: Upcoming trip card (horizontal scroll)
────────────────────────────────────────── */
function UpcomingTripCard({ trip }: { trip: Trip }) {
  const { url: imgUrl } = useUnsplashImage('attraction', trip.destination);

  const s = new Date(trip.start_date);
  const e = new Date(s);
  e.setDate(s.getDate() + trip.duration_days - 1);
  const fmt = (d: Date) =>
    d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' }).replace(' thg ', ' Th');
  const dateRange = `${fmt(s)} – ${fmt(e)}`;

  return (
    <Link href={`/trips/${trip.id}`} style={{ textDecoration: 'none', display: 'block', flexShrink: 0, width: 150 }}>
      <div style={{ borderRadius: 16, overflow: 'hidden', background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        <div style={{ position: 'relative', height: 110 }}>
          {imgUrl && (
            <Image src={imgUrl} alt={trip.destination} fill className="object-cover" sizes="160px" unoptimized />
          )}
        </div>
        <div style={{ padding: '8px 10px 10px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: D.text, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {trip.destination}
          </div>
          <div style={{ fontSize: 11, color: D.textMuted }}>{dateRange}</div>
        </div>
      </div>
    </Link>
  );
}

/* ──────────────────────────────────────────
   MOBILE: Recent memory photo (3-grid)
────────────────────────────────────────── */
function MemoryPhoto({ trip }: { trip: Trip }) {
  const { url: imgUrl } = useUnsplashImage('attraction', trip.destination);
  return (
    <Link href={`/trips/${trip.id}`} style={{ textDecoration: 'none', display: 'block', borderRadius: 12, overflow: 'hidden', position: 'relative', aspectRatio: '1', background: D.surface2 }}>
      {imgUrl && (
        <Image src={imgUrl} alt={trip.destination} fill className="object-cover" sizes="33vw" unoptimized />
      )}
    </Link>
  );
}

/* ──────────────────────────────────────────
   DESKTOP: Trip Card
────────────────────────────────────────── */
function DesktopTripCard({ trip, onDelete, onDuplicate, large = false }: {
  trip: Trip; onDelete: (id: number) => void; onDuplicate: (id: number) => void; large?: boolean;
}) {
  const { url: imgUrl } = useUnsplashImage('attraction', trip.destination);
  const status = STATUS_CONFIG[trip.status] ?? STATUS_CONFIG.draft;
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Link href={`/trips/${trip.id}`} style={{ textDecoration: 'none', display: 'block', position: 'relative', borderRadius: 16, overflow: 'hidden', height: large ? 280 : 200, background: '#e2e8f0', cursor: 'pointer' }}>
      {imgUrl && (
        <Image src={imgUrl} alt={trip.destination} fill className="object-cover" sizes="(max-width: 800px) 100vw, 50vw" unoptimized />
      )}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.18) 60%, transparent 100%)' }} />
      <div style={{ position: 'absolute', top: 12, left: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: status.color, background: status.bg, padding: '3px 9px', borderRadius: 99 }}>
          {status.label}
        </span>
      </div>
      <div style={{ position: 'absolute', top: 10, right: 10 }} onClick={e => { e.preventDefault(); setMenuOpen(v => !v); }}>
        <button style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>⋯</button>
        {menuOpen && (
          <div style={{ position: 'absolute', top: 36, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 6, zIndex: 10, minWidth: 140, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
            onClick={e => e.preventDefault()}>
            <button onClick={e => { e.preventDefault(); onDuplicate(trip.id); setMenuOpen(false); }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 12px', fontSize: 13, color: D.text, background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6 }}>📋 Nhân bản</button>
            <button onClick={e => { e.preventDefault(); onDelete(trip.id); setMenuOpen(false); }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 12px', fontSize: 13, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6 }}>🗑 Xóa</button>
          </div>
        )}
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: large ? '16px 16px 18px' : '12px 14px 14px' }}>
        {large && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginBottom: 4 }}>{formatDate(trip.start_date)} · {trip.duration_days} ngày</div>}
        <h3 style={{ fontSize: large ? 22 : 15, fontWeight: 700, color: '#fff', margin: '0 0 8px', letterSpacing: '-0.3px', lineHeight: 1.2 }}>{trip.destination}</h3>
        {large && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 99, background: 'rgba(255,255,255,0.18)', color: '#fff', fontSize: 12, fontWeight: 600 }}>
            👁 Xem chi tiết
          </span>
        )}
        {!large && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>{formatDate(trip.start_date)}</div>}
      </div>
    </Link>
  );
}

/* ──────────────────────────────────────────
   MOBILE: Bottom Navigation Bar
────────────────────────────────────────── */
function MobileBottomNav() {
  const pathname = usePathname();

  const tabs = [
    {
      href: '/dashboard', label: 'Trang chủ',
      icon: (active: boolean) => (
        <svg width="22" height="22" fill={active ? '#2563eb' : 'none'} viewBox="0 0 24 24" stroke={active ? '#2563eb' : '#9ca3af'} strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      href: '/trips/create', label: 'Lịch trình',
      icon: (active: boolean) => (
        <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={active ? '#2563eb' : '#9ca3af'} strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
    },
    {
      href: '/saved-places', label: 'Đã lưu',
      icon: (active: boolean) => (
        <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={active ? '#2563eb' : '#9ca3af'} strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      ),
    },
    {
      href: '/favorites', label: 'Yêu thích',
      icon: (active: boolean) => (
        <svg width="22" height="22" fill={active ? '#2563eb' : 'none'} viewBox="0 0 24 24" stroke={active ? '#2563eb' : '#9ca3af'} strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
    },
    {
      href: '/profile', label: 'Hồ sơ',
      icon: (active: boolean) => (
        <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={active ? '#2563eb' : '#9ca3af'} strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ];

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 60,
      background: '#fff',
      borderTop: '1px solid rgba(0,0,0,0.07)',
      display: 'flex', alignItems: 'center',
      padding: '8px 0 env(safe-area-inset-bottom, 8px)',
      boxShadow: '0 -4px 24px rgba(0,0,0,0.06)',
    }}>
      {tabs.map(tab => {
        const isActive = pathname === tab.href ||
        (tab.href !== '/dashboard' && tab.href !== '/trips/create' && pathname?.startsWith(tab.href)) ||
        (tab.href === '/trips/create' && (pathname === '/trips/create' || pathname?.startsWith('/trips/')));
        return (
          <Link key={tab.href} href={tab.href} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, textDecoration: 'none', padding: '4px 0' }}>
            {tab.icon(isActive)}
            <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 400, color: isActive ? '#2563eb' : '#9ca3af' }}>
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

/* ──────────────────────────────────────────
   MOBILE: Top header (Trip AI)
────────────────────────────────────────── */
function MobileHeader() {
  const { user } = useAuthStore();
  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 20px 12px',
      background: '#fff',
    }}>
      {/* hamburger */}
      <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', flexDirection: 'column', gap: 5 }}>
        <span style={{ display: 'block', width: 22, height: 2, background: D.text, borderRadius: 99 }} />
        <span style={{ display: 'block', width: 22, height: 2, background: D.text, borderRadius: 99 }} />
        <span style={{ display: 'block', width: 22, height: 2, background: D.text, borderRadius: 99 }} />
      </button>

      {/* logo */}
      <span style={{ fontSize: 18, fontWeight: 800, color: D.accent, letterSpacing: '-0.5px' }}>Trip AI</span>

      {/* bell */}
      <Link href="/notifications" style={{ position: 'relative', color: D.text, textDecoration: 'none', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      </Link>
    </header>
  );
}

/* ──────────────────────────────────────────
   MAIN PAGE
────────────────────────────────────────── */
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

  const firstName = user?.name?.split(' ').pop() || 'Bạn';
  const totalTrips = pagination.total;
  const countries = new Set(trips.map(t => t.destination.split(',').pop()?.trim() ?? t.destination)).size;

  const activePlans = trips.filter(
    t => t.status === 'processing' || (t.status === 'completed' && new Date(t.start_date) >= new Date()),
  );
  const pastJourneys = trips.filter(
    t => t.status === 'completed' && new Date(t.start_date) < new Date(),
  );

  const currentTrip = activePlans[0] ?? trips[0];
  const upcomingTrips = trips.filter(t => t.id !== currentTrip?.id).slice(0, 6);
  const memories = pastJourneys.slice(0, 3);

  const [firstTrip, ...restTrips] = trips;

  const totalMiles = totalTrips * 512; // rough estimate

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Chào buổi sáng';
    if (h < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        .dash-mobile  { display: none; }
        .dash-desktop { display: block; }

        @media (max-width: 768px) {
          .dash-mobile  { display: block !important; }
          .dash-desktop { display: none !important; }
        }

        /* hide scrollbar on horizontal scroll */
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* ═══════════════════════════════════════════
          MOBILE LAYOUT
      ═══════════════════════════════════════════ */}
      <div className="dash-mobile" style={{ background: D.bg, minHeight: '100vh', fontFamily: '"Inter", system-ui, sans-serif', paddingBottom: 80 }}>

        {/* Header */}
        <MobileHeader />

        {/* Greeting */}
        <div style={{ padding: '8px 20px 16px', background: '#fff' }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: D.text, margin: '0 0 4px', letterSpacing: '-0.5px' }}>
            {getGreeting()}, {firstName}
          </h1>
          <p style={{ fontSize: 14, color: D.textMuted, margin: 0 }}>Sẵn sàng cho chuyến phiêu lưu tiếp theo?</p>
        </div>

        <div style={{ height: 12, background: D.bg }} />

        {/* Loading spinner */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: D.textMuted }}>
            <div style={{ width: 28, height: 28, border: '2.5px solid rgba(37,99,235,0.15)', borderTopColor: D.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <div style={{ fontSize: 13 }}>Đang tải…</div>
          </div>
        )}

        {/* Hero – current trip card */}
        {!loading && currentTrip && <MobileHeroCard trip={currentTrip} />}

        {/* Check-in + Add Expense buttons */}
        {!loading && currentTrip && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '0 20px 20px' }}>
            <Link href={`/trips/${currentTrip.id}`} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '13px 0', borderRadius: 14,
              background: D.accent,
              color: '#fff', fontSize: 14, fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 4px 16px rgba(37,99,235,0.3)',
            }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Check-in
            </Link>
            <Link href={`/trips/${currentTrip.id}`} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '13px 0', borderRadius: 14,
              background: '#fff',
              color: D.text, fontSize: 14, fontWeight: 700,
              textDecoration: 'none',
              border: '1.5px solid rgba(0,0,0,0.1)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <path strokeLinecap="round" d="M2 10h20" />
              </svg>
              Thêm Chi Tiêu
            </Link>
          </div>
        )}

        {/* Upcoming Trips */}
        {!loading && upcomingTrips.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', marginBottom: 14 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: D.text, letterSpacing: '-0.3px' }}>Chuyến Sắp Tới</span>
              <Link href="/trips" style={{ fontSize: 13, fontWeight: 600, color: D.accent, textDecoration: 'none' }}>Xem tất cả</Link>
            </div>
            <div className="no-scrollbar" style={{ display: 'flex', gap: 14, overflowX: 'auto', padding: '0 20px', paddingBottom: 4 }}>
              {upcomingTrips.map(t => (
                <UpcomingTripCard key={t.id} trip={t} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && trips.length === 0 && (
          <div style={{ margin: '0 20px 24px' }}>
            <div style={{ background: '#fff', border: '1.5px solid rgba(37,99,235,0.1)', borderRadius: 20, padding: '48px 24px', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>✈️</div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: D.text, marginBottom: 8 }}>Bắt Đầu Hành Trình Của Bạn</h3>
              <p style={{ fontSize: 13, color: D.textMuted, marginBottom: 24, lineHeight: 1.6 }}>Để AI lên kế hoạch chuyến đi hoàn hảo cho bạn.</p>
              <Link href="/trips/create" style={{ display: 'inline-block', padding: '12px 32px', borderRadius: 99, background: D.accent, color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 16px rgba(37,99,235,0.3)' }}>
                Tạo Chuyến Đi Đầu Tiên
              </Link>
            </div>
          </div>
        )}

        {/* Recent Memories */}
        {!loading && memories.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', marginBottom: 14 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: D.text, letterSpacing: '-0.3px' }}>Ký Ức Gần Đây</span>
              {/* grid icon */}
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={D.textMuted} strokeWidth={1.8}>
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: '0 20px' }}>
              {memories.map(t => <MemoryPhoto key={t.id} trip={t} />)}
            </div>
          </div>
        )}

        {/* AI Suggestions */}
        {!loading && (
          <div style={{ marginBottom: 24, padding: '0 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              {/* sparkle icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill={D.accent}>
                <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z"/>
              </svg>
              <span style={{ fontSize: 18, fontWeight: 800, color: D.text, letterSpacing: '-0.3px' }}>Gợi Ý AI</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                {
                  icon: (
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={D.accent} strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                  ),
                  title: currentTrip ? `Đặt Omakase` : 'Khám Phá Ẩm Thực Địa Phương',
                  desc: currentTrip ? `Được gợi ý cho đêm đầu tiên tại ${currentTrip.destination}` : 'Tìm những nhà hàng được đánh giá cao',
                },
                {
                  icon: (
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={D.accent} strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                  ),
                  title: 'Lấy Thẻ Giao Thông',
                  desc: 'Thiết lập Apple Wallet để dễ dàng di chuyển',
                },
              ].map((sugg, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px',
                  background: '#fff',
                  border: '1.5px solid rgba(37,99,235,0.08)',
                  borderRadius: 14,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}>
                  {sugg.icon}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: D.text, marginBottom: 3 }}>{sugg.title}</div>
                    <div style={{ fontSize: 12, color: D.textMuted, lineHeight: 1.4 }}>{sugg.desc}</div>
                  </div>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke={D.textMuted} strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Travel Stats */}
        {!loading && (
          <div style={{ margin: '0 20px 32px' }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: D.text, letterSpacing: '-0.3px', display: 'block', marginBottom: 14 }}>Thống Kê Du Lịch</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ background: '#fff', borderRadius: 16, padding: '18px 18px 16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1.5px solid rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', color: D.textMuted, textTransform: 'uppercase', marginBottom: 8 }}>Quốc Gia</div>
                <div style={{ fontSize: 36, fontWeight: 900, color: D.text, letterSpacing: '-2px', lineHeight: 1 }}>{countries || totalTrips}</div>
              </div>
              <div style={{ background: '#fff', borderRadius: 16, padding: '18px 18px 16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1.5px solid rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', color: D.textMuted, textTransform: 'uppercase', marginBottom: 8 }}>Tổng Dặm</div>
                <div style={{ fontSize: 36, fontWeight: 900, color: D.accent, letterSpacing: '-2px', lineHeight: 1 }}>
                  {totalMiles >= 1000 ? `${(totalMiles / 1000).toFixed(1)}k` : totalMiles}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FAB */}
        <Link href="/trips/create" style={{
          position: 'fixed', bottom: 88, right: 20, zIndex: 50,
          width: 52, height: 52, borderRadius: '50%',
          background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 6px 20px rgba(37,99,235,0.4)',
          textDecoration: 'none',
        }}>
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </Link>

        {/* Bottom navigation */}
        <MobileBottomNav />
      </div>

      {/* ═══════════════════════════════════════════
          DESKTOP LAYOUT
      ═══════════════════════════════════════════ */}
      <div className="dash-desktop" style={{ width: '100%', fontFamily: '"Inter", system-ui, sans-serif' }}>

        {/* Greeting */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: D.text, letterSpacing: '-1px', margin: '0 0 6px' }}>
            Xin chào, {user?.name?.split(' ').pop() || 'bạn'}. Hôm nay đi đâu?
          </h1>
          <p style={{ fontSize: 15, color: D.textMuted, margin: 0 }}>
            Lịch trình AI cá nhân hóa của bạn đã sẵn sàng.{' '}
            {activePlans.length > 0 && `Bạn có ${activePlans.length} chuyến đi sắp tới.`}
          </p>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'TỔNG CHUYẾN ĐI', value: String(totalTrips).padStart(2, '0'), icon: '✈' },
            { label: 'ĐIỂM ĐẾN', value: String(countries).padStart(2, '0'), icon: '🌍' },
            { label: 'SẮP TỚI', value: String(activePlans.length).padStart(2, '0'), icon: '📅' },
          ].map(stat => (
            <div key={stat.label} style={{ background: '#fff', border: '1.5px solid rgba(0,0,0,0.07)', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: D.textDim, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>{stat.label}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: D.text, letterSpacing: '-1px' }}>{stat.value}</div>
              </div>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: D.accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{stat.icon}</div>
            </div>
          ))}
        </div>

        {/* Trip grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: D.textMuted }}>
            <div style={{ width: 28, height: 28, border: '2.5px solid rgba(37,99,235,0.12)', borderTopColor: D.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            Đang tải lịch trình…
          </div>
        ) : trips.length === 0 ? (
          <div style={{ background: '#fff', border: '1.5px solid rgba(0,0,0,0.07)', borderRadius: 16, padding: '48px 32px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 36, marginBottom: 16 }}>✦✦</div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: D.text, marginBottom: 8 }}>Bắt đầu hành trình AI tiếp theo</h3>
            <p style={{ fontSize: 14, color: D.textMuted, marginBottom: 24, maxWidth: 360, margin: '0 auto 24px', lineHeight: 1.6 }}>
              Chưa có ý tưởng? Để AI phân tích sở thích và đề xuất lịch trình phù hợp.
            </p>
            <Link href="/trips/create" style={{ padding: '10px 24px', borderRadius: 10, background: D.accent, color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
              Bắt đầu ngay
            </Link>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {firstTrip && (
                <div style={{ gridRow: 'span 2' }}>
                  <DesktopTripCard trip={firstTrip} onDelete={setDeleteId} onDuplicate={handleDuplicate} large />
                </div>
              )}
              {restTrips[0] && <DesktopTripCard trip={restTrips[0]} onDelete={setDeleteId} onDuplicate={handleDuplicate} />}
              {restTrips[1] && <DesktopTripCard trip={restTrips[1]} onDelete={setDeleteId} onDuplicate={handleDuplicate} />}
            </div>

            {restTrips.length > 2 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 12 }}>
                {restTrips.slice(2).map(trip => (
                  <DesktopTripCard key={trip.id} trip={trip} onDelete={setDeleteId} onDuplicate={handleDuplicate} />
                ))}
              </div>
            )}

            <div style={{ marginTop: 12, background: '#fff', border: '1.5px solid rgba(0,0,0,0.07)', borderRadius: 16, padding: '32px 28px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>✦✦</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: D.text, marginBottom: 8 }}>Tạo lịch trình mới</h3>
              <Link href="/trips/create" style={{ display: 'inline-block', padding: '9px 22px', borderRadius: 10, background: D.accent, color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                Bắt đầu ngay
              </Link>
            </div>

            {pagination.last > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
                {Array.from({ length: pagination.last }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => fetchTrips(p)} style={{ width: 34, height: 34, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: p === pagination.current ? D.accent : '#fff', color: p === pagination.current ? '#fff' : D.textMuted, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                    {p}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete confirm modal (shared) */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 16 }}>
          <div style={{ background: '#fff', border: '1.5px solid rgba(0,0,0,0.08)', borderRadius: 20, padding: '28px 28px 24px', maxWidth: 360, width: '100%', boxShadow: '0 24px 60px rgba(0,0,0,0.15)' }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: D.text, marginBottom: 8 }}>Xóa lịch trình?</h3>
            <p style={{ fontSize: 14, color: D.textMuted, marginBottom: 24 }}>Hành động này không thể hoàn tác.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteId(null)} style={{ flex: 1, padding: '10px', borderRadius: 10, background: '#f3f4f6', border: 'none', color: D.text, fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>Hủy</button>
              <button onClick={() => handleDelete(deleteId)} style={{ flex: 1, padding: '10px', borderRadius: 10, background: '#dc2626', border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Xóa</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
