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
  bg: '#0d1117', bgMobile: '#0d1117',
  surface: '#161b22', surface2: '#1c2128',
  border: 'rgba(255,255,255,0.07)', border2: 'rgba(255,255,255,0.12)',
  text: '#e6edf3', textMuted: 'rgba(255,255,255,0.45)', textDim: 'rgba(255,255,255,0.25)',
  accent: '#4f6ef7',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  completed:  { label: 'ĐÃ LÊN KẾ HOẠCH', color: '#34d399', bg: 'rgba(52,211,153,0.18)' },
  processing: { label: 'ĐANG XỬ LÝ',      color: '#fbbf24', bg: 'rgba(251,191,36,0.18)' },
  failed:     { label: 'THẤT BẠI',         color: '#f87171', bg: 'rgba(248,113,113,0.18)' },
  draft:      { label: 'NHÁP',             color: '#94a3b8', bg: 'rgba(148,163,184,0.18)' },
};

// ─── Active Plan Card (large hero card) ───────────────────────────────────────
function ActivePlanCard({ trip, onDelete, onDuplicate }: {
  trip: Trip; onDelete: (id: number) => void; onDuplicate: (id: number) => void;
}) {
  const { url: imgUrl } = useUnsplashImage('attraction', trip.destination);
  const status = STATUS_CONFIG[trip.status] ?? STATUS_CONFIG.draft;
  const [menuOpen, setMenuOpen] = useState(false);

  const dateRange = (() => {
    const s = new Date(trip.start_date);
    const e = new Date(s);
    e.setDate(s.getDate() + trip.duration_days - 1);
    const fmt = (d: Date) => d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' });
    return `${fmt(s)} — ${fmt(e)}`;
  })();

  return (
    <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', background: D.surface2 }}>
      {/* Background image */}
      <div style={{ position: 'relative', height: 280 }}>
        {imgUrl && (
          <Image src={imgUrl} alt={trip.destination} fill className="object-cover" sizes="100vw" unoptimized />
        )}
        {/* Gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(8,8,16,0.95) 0%, rgba(8,8,16,0.4) 55%, rgba(8,8,16,0.1) 100%)' }} />

        {/* Status badge top-left */}
        <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '1.5px',
            color: status.color, background: status.bg,
            padding: '4px 10px', borderRadius: 99,
            backdropFilter: 'blur(8px)',
            border: `1px solid ${status.color}44`,
          }}>
            • {status.label}
          </span>
        </div>

        {/* 3-dot menu top-right */}
        <div style={{ position: 'absolute', top: 10, right: 10 }}
          onClick={e => { e.preventDefault(); setMenuOpen(v => !v); }}>
          <button style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
          }}>⋯</button>
          {menuOpen && (
            <div style={{
              position: 'absolute', top: 38, right: 0, background: D.surface,
              border: `1px solid ${D.border2}`, borderRadius: 12, padding: 6,
              zIndex: 20, minWidth: 150, boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
            }} onClick={e => e.preventDefault()}>
              <button onClick={() => { onDuplicate(trip.id); setMenuOpen(false); }}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 13, color: D.text, background: 'none', border: 'none', cursor: 'pointer', borderRadius: 8 }}>
                📋 Nhân bản
              </button>
              <button onClick={() => { onDelete(trip.id); setMenuOpen(false); }}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 13, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 8 }}>
                🗑 Xóa
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Card bottom content */}
      <div style={{ padding: '0 16px 16px', marginTop: -72, position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginBottom: 4, fontWeight: 500 }}>
          {dateRange}
        </div>
        <h3 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 14px', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
          {trip.destination}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href={`/trips/${trip.id}`} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '9px 20px', borderRadius: 99,
            background: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.18)',
            color: '#fff', fontSize: 13, fontWeight: 600,
            textDecoration: 'none',
          }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Xem chi tiết
          </Link>
          <button onClick={() => setMenuOpen(v => !v)}
            style={{ width: 36, height: 36, borderRadius: 99, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ⋯
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Past Journey Card (small horizontal) ────────────────────────────────────
function PastJourneyCard({ trip, onDelete, onDuplicate }: {
  trip: Trip; onDelete: (id: number) => void; onDuplicate: (id: number) => void;
}) {
  const { url: imgUrl } = useUnsplashImage('attraction', trip.destination);
  const year = new Date(trip.start_date).getFullYear();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Link href={`/trips/${trip.id}`} style={{ textDecoration: 'none', display: 'block', position: 'relative', borderRadius: 16, overflow: 'hidden', background: D.surface2, flexShrink: 0 }}>
      {/* Image */}
      <div style={{ position: 'relative', height: 130 }}>
        {imgUrl && (
          <Image src={imgUrl} alt={trip.destination} fill className="object-cover" sizes="50vw" unoptimized />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)' }} />
        {/* Year badge */}
        <div style={{ position: 'absolute', top: 8, right: 8, fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.8)', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', padding: '3px 8px', borderRadius: 6 }}>
          {year}
        </div>
        {/* Menu */}
        <div style={{ position: 'absolute', top: 8, left: 8 }}
          onClick={e => { e.preventDefault(); setMenuOpen(v => !v); }}>
          <button style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>⋯</button>
          {menuOpen && (
            <div style={{ position: 'absolute', top: 30, left: 0, background: D.surface, border: `1px solid ${D.border2}`, borderRadius: 10, padding: 4, zIndex: 20, minWidth: 130, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}
              onClick={e => e.preventDefault()}>
              <button onClick={() => { onDuplicate(trip.id); setMenuOpen(false); }}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 12px', fontSize: 12, color: D.text, background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6 }}>
                📋 Nhân bản
              </button>
              <button onClick={() => { onDelete(trip.id); setMenuOpen(false); }}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 12px', fontSize: 12, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6 }}>
                🗑 Xóa
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Text */}
      <div style={{ padding: '10px 12px 12px' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: D.text, marginBottom: 3, lineHeight: 1.3 }}>{trip.destination}</div>
        <div style={{ fontSize: 11, color: D.textMuted }}>{trip.duration_days} ngày • {trip.num_people ?? 1} người</div>
      </div>
    </Link>
  );
}

// ─── Desktop Trip Card ────────────────────────────────────────────────────────
function DesktopTripCard({ trip, onDelete, onDuplicate, large = false }: {
  trip: Trip; onDelete: (id: number) => void; onDuplicate: (id: number) => void; large?: boolean;
}) {
  const { url: imgUrl } = useUnsplashImage('attraction', trip.destination);
  const status = STATUS_CONFIG[trip.status] ?? STATUS_CONFIG.draft;
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Link href={`/trips/${trip.id}`} style={{ textDecoration: 'none', display: 'block', position: 'relative', borderRadius: 16, overflow: 'hidden', height: large ? 280 : 200, background: D.surface2, cursor: 'pointer' }}>
      {imgUrl && (
        <Image src={imgUrl} alt={trip.destination} fill className="object-cover" sizes="(max-width: 800px) 100vw, 50vw" unoptimized />
      )}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)' }} />
      <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: status.color, background: status.bg, padding: '3px 9px', borderRadius: 99, backdropFilter: 'blur(4px)' }}>
          {status.label}
        </span>
      </div>
      <div style={{ position: 'absolute', top: 10, right: 10 }} onClick={e => { e.preventDefault(); setMenuOpen(v => !v); }}>
        <button style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>⋯</button>
        {menuOpen && (
          <div style={{ position: 'absolute', top: 36, right: 0, background: D.surface, border: `1px solid ${D.border2}`, borderRadius: 10, padding: 6, zIndex: 10, minWidth: 140, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
            onClick={e => e.preventDefault()}>
            <button onClick={e => { e.preventDefault(); onDuplicate(trip.id); setMenuOpen(false); }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 12px', fontSize: 13, color: D.text, background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6 }}>📋 Nhân bản</button>
            <button onClick={e => { e.preventDefault(); onDelete(trip.id); setMenuOpen(false); }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 12px', fontSize: 13, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6 }}>🗑 Xóa</button>
          </div>
        )}
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: large ? '16px 16px 18px' : '12px 14px 14px' }}>
        {large && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>{formatDate(trip.start_date)} · {trip.duration_days} ngày</div>}
        <h3 style={{ fontSize: large ? 22 : 15, fontWeight: 700, color: '#fff', margin: '0 0 8px', letterSpacing: '-0.3px', lineHeight: 1.2 }}>{trip.destination}</h3>
        {large && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 99, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', color: '#fff', fontSize: 12, fontWeight: 600, border: '1px solid rgba(255,255,255,0.2)' }}>
            👁 Xem chi tiết
          </span>
        )}
        {!large && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>{formatDate(trip.start_date)}</div>}
      </div>
    </Link>
  );
}

// ─── Recent Memory Card ────────────────────────────────────────────────────────
function RecentMemoryCard({ trip, idx }: { trip: Trip; idx: number }) {
  const { url: imgUrl } = useUnsplashImage('attraction', trip.destination);
  return (
    <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', height: idx === 0 ? 180 : 140, cursor: 'pointer' }}>
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        {imgUrl && (
          <Image src={imgUrl} alt={trip.destination} fill className="object-cover" sizes="50vw" unoptimized />
        )}
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%)' }} />
      <div style={{ position: 'absolute', bottom: 10, left: 10, right: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{trip.destination}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{trip.duration_days} days</div>
      </div>
    </div>
  );
}

// ─── Featured Card (Mobile) ─────────────────────────────────────────────────────
function FeaturedCard({ trip }: { trip: Trip }) {
  const { url: imgUrl } = useUnsplashImage('attraction', trip.destination);
  const status = STATUS_CONFIG[trip.status] ?? STATUS_CONFIG.draft;

  return (
    <div style={{ padding: '0 20px', marginBottom: 20 }}>
      <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', background: D.surface2 }}>
        {/* Background image */}
        <div style={{ position: 'relative', height: 240 }}>
          {imgUrl && (
            <Image src={imgUrl} alt={trip.destination} fill className="object-cover" sizes="100vw" unoptimized />
          )}
          {/* Gradient overlay */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(13,17,23,0.95) 0%, rgba(13,17,23,0.5) 60%, rgba(13,17,23,0.1) 100%)' }} />

          {/* Status badge */}
          <div style={{ position: 'absolute', top: 12, left: 12 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '1.5px',
              color: status.color, background: status.bg,
              padding: '5px 12px', borderRadius: 99,
              backdropFilter: 'blur(8px)',
              border: `1px solid ${status.color}44`,
              textTransform: 'uppercase', display: 'inline-block'
            }}>
              {status.label}
            </span>
          </div>
        </div>

        {/* Card bottom content */}
        <div style={{ padding: '12px 16px 16px', marginTop: -60, position: 'relative', zIndex: 1 }}>
          <h3 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 12px', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
            {trip.destination}
          </h3>
          {/* Quick action buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              padding: '10px 14px', borderRadius: 11,
              background: 'rgba(79,110,247,0.2)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(79,110,247,0.4)',
              color: '#4f6ef7', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.2s'
            }}>
              ✓ Check-in
            </button>
            <button style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              padding: '10px 14px', borderRadius: 11,
              background: 'rgba(163,110,247,0.2)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(163,110,247,0.4)',
              color: '#a36ef7', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.2s'
            }}>
              💰 Add Expenses
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
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

  const firstName  = user?.name?.split(' ').pop()?.toUpperCase() || 'THERE';
  const totalTrips = pagination.total;
  const countries  = new Set(trips.map(t => t.destination.split(',').pop()?.trim() ?? t.destination)).size;
  const upcoming   = trips.find(t => t.status === 'completed' && new Date(t.start_date) >= new Date());
  const upcomingDays = upcoming
    ? Math.ceil((new Date(upcoming.start_date).getTime() - Date.now()) / 86400000)
    : null;

  const activePlans  = trips.filter(t => t.status === 'processing' || (t.status === 'completed' && new Date(t.start_date) >= new Date()));
  const pastJourneys = trips.filter(t => t.status === 'completed' && new Date(t.start_date) < new Date());

  const [firstActive, ...moreActive] = activePlans;
  const [firstTrip, ...restTrips]    = trips;

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Mobile layout ── */
        .dash-mobile { display: none; }
        .dash-desktop { display: block; }

        @media (max-width: 768px) {
          .dash-mobile  { display: block !important; }
          .dash-desktop { display: none !important; }
        }
      `}</style>

      {/* ════════════════════════════════════════════
          MOBILE LAYOUT
      ════════════════════════════════════════════ */}
      <div className="dash-mobile" style={{ background: D.bg, minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>

        {/* ── Welcome heading ── */}
        <div style={{ padding: '20px 20px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', color: D.accent, marginBottom: 6, textTransform: 'uppercase' }}>
                Good morning, {firstName}
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: D.text, letterSpacing: '-0.8px', lineHeight: 1.15 }}>
                Ready for your next adventure?
              </div>
            </div>
            <Link href="/trips/create" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 44, height: 44, borderRadius: 14,
              background: 'linear-gradient(135deg, #4f6ef7 0%, #7c3aed 100%)',
              boxShadow: '0 4px 16px rgba(79,110,247,0.35)',
              color: '#fff', fontSize: 18, fontWeight: 700,
              textDecoration: 'none', flexShrink: 0,
            }}>
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </Link>
          </div>
        </div>

        {/* ── Featured card with actions ── */}
        {firstActive && <FeaturedCard trip={firstActive} />}

        {/* ── Stats row ── */}
        <div style={{ padding: '0 20px', marginBottom: 20 }}>
          <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 18, padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
            {[
              { label: 'Total Trips', value: String(totalTrips).padStart(2, '0'), color: D.text, icon: '✈️' },
              { label: 'Destinations',  value: String(countries).padStart(2, '0'), color: '#06b6d4', icon: '🌍' },
            ].map((stat, i) => (
              <div key={stat.label} style={{ borderLeft: i > 0 ? `1px solid ${D.border}` : 'none', paddingLeft: i > 0 ? 20 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: D.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</span>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: D.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
                    {stat.icon}
                  </div>
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: stat.color, letterSpacing: '-1px', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Upcoming trip banner ── */}
        {upcoming && upcomingDays !== null && upcomingDays >= 0 && upcomingDays <= 30 && (
          <div style={{ padding: '0 20px', marginBottom: 24 }}>
            <Link href={`/trips/${upcoming.id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: D.surface, border: `1px solid ${D.border}`, borderRadius: 14, padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(79,110,247,0.15)', border: '1px solid rgba(79,110,247,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📅</div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: D.accent, marginBottom: 2 }}>Sắp tới trong {upcomingDays} ngày</div>
                  <div style={{ fontSize: 13, color: D.text, fontWeight: 500 }}>{upcoming.destination}</div>
                </div>
              </div>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.3)" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: D.textMuted }}>
            <div style={{ width: 24, height: 24, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: D.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 10px' }} />
            <div style={{ fontSize: 13 }}>Đang tải…</div>
          </div>
        )}

        {/* ── Active Plans section ── */}
        {!loading && activePlans.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', marginBottom: 14 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: D.text, letterSpacing: '-0.4px' }}>Upcoming Trips</span>
              <Link href="/favorites" style={{ fontSize: 12, fontWeight: 600, color: D.accent, textDecoration: 'none' }}>View all →</Link>
            </div>
            <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {moreActive.slice(0, 2).map(t => (
                <ActivePlanCard key={t.id} trip={t} onDelete={setDeleteId} onDuplicate={handleDuplicate} />
              ))}
            </div>
          </div>
        )}

        {/* ── Past Journeys section ── */}
        {!loading && pastJourneys.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', marginBottom: 14 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: D.text, letterSpacing: '-0.4px' }}>Recent Memories</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: D.textMuted }}>{pastJourneys.length} trips</span>
            </div>
            {/* Photo grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, padding: '0 20px' }}>
              {pastJourneys.slice(0, 4).map((t, idx) => <RecentMemoryCard key={t.id} trip={t} idx={idx} />)}
            </div>
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && trips.length === 0 && (
          <div style={{ padding: '0 20px', marginBottom: 28 }}>
            <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 18, padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✈️</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: D.text, marginBottom: 8 }}>Start Your First Adventure</h3>
              <p style={{ fontSize: 13, color: D.textMuted, marginBottom: 24, lineHeight: 1.6 }}>Let AI plan your perfect journey based on your preferences.</p>
              <Link href="/trips/create" style={{ display: 'inline-block', padding: '11px 28px', borderRadius: 99, background: 'linear-gradient(135deg, #4f6ef7, #7c3aed)', color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                Create Your First Trip
              </Link>
            </div>
          </div>
        )}

        {/* ── AI Suggestions section ── */}
        {!loading && activePlans.length > 0 && (
          <div style={{ marginBottom: 28, padding: '0 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{ width: 28, height: 28, borderRadius: 10, background: 'rgba(79,110,247,0.15)', border: '1px solid rgba(79,110,247,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🤖</div>
              <span style={{ fontSize: 18, fontWeight: 800, color: D.text, letterSpacing: '-0.4px' }}>AI Suggestions</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { icon: '📍', title: 'Explore Santorini', desc: 'Famous for sunset views and white buildings' },
                { icon: '🎭', title: 'Book Museum Pass', desc: 'Save 30% with combined city pass' },
              ].map((sugg, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', background: D.surface, border: `1px solid ${D.border}`, borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s' }}>
                  <div style={{ fontSize: 18, marginTop: 2 }}>{sugg.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: D.text, marginBottom: 3 }}>{sugg.title}</div>
                    <div style={{ fontSize: 12, color: D.textMuted }}>{sugg.desc}</div>
                  </div>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.3)" strokeWidth={2} style={{ marginTop: 2 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pagination */}
        {pagination.last > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '8px 20px 80px' }}>
            {Array.from({ length: pagination.last }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => fetchTrips(p)} style={{ width: 34, height: 34, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: p === pagination.current ? D.accent : D.surface, color: p === pagination.current ? '#fff' : D.textMuted }}>
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════
          DESKTOP LAYOUT (unchanged)
      ════════════════════════════════════════════ */}
      <div className="dash-desktop" style={{ width: '100%' }}>

        {/* ── Greeting ── */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: D.text, letterSpacing: '-1px', margin: '0 0 6px' }}>
            Xin chào, {user?.name?.split(' ').pop() || 'bạn'}. Hôm nay đi đâu?
          </h1>
          <p style={{ fontSize: 15, color: D.textMuted, margin: 0 }}>
            Lịch trình AI cá nhân hóa của bạn đã sẵn sàng.{' '}
            {activePlans.length > 0 && `Bạn có ${activePlans.length} chuyến đi sắp tới.`}
          </p>
        </div>

        {/* ── Stats row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'TỔNG CHUYẾN ĐI', value: String(totalTrips).padStart(2, '0'),         icon: '✈' },
            { label: 'ĐIỂM ĐẾN',       value: String(countries).padStart(2, '0'),          icon: '🌍' },
            { label: 'SẮP TỚI',        value: String(activePlans.length).padStart(2, '0'), icon: '📅' },
          ].map(stat => (
            <div key={stat.label} style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: D.textDim, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>{stat.label}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: D.text, letterSpacing: '-1px', fontVariantNumeric: 'tabular-nums' }}>{stat.value}</div>
              </div>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: D.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{stat.icon}</div>
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
          <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 16, padding: '48px 32px', textAlign: 'center' }}>
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

            <div style={{ marginTop: 12, background: D.surface, border: `1px solid ${D.border}`, borderRadius: 16, padding: '32px 28px', textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>✦✦</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: D.text, marginBottom: 8 }}>Tạo lịch trình mới</h3>
              <Link href="/trips/create" style={{ display: 'inline-block', padding: '9px 22px', borderRadius: 10, background: D.accent, color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                Bắt đầu ngay
              </Link>
            </div>

            {pagination.last > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
                {Array.from({ length: pagination.last }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => fetchTrips(p)} style={{ width: 34, height: 34, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: p === pagination.current ? D.accent : D.surface, color: p === pagination.current ? '#fff' : D.textMuted }}>
                    {p}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Delete confirm (shared) ── */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 16 }}>
          <div style={{ background: D.surface, border: `1px solid ${D.border2}`, borderRadius: 18, padding: '28px 28px 24px', maxWidth: 360, width: '100%' }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: D.text, marginBottom: 8 }}>Xóa lịch trình?</h3>
            <p style={{ fontSize: 14, color: D.textMuted, marginBottom: 24 }}>Hành động này không thể hoàn tác.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteId(null)} style={{ flex: 1, padding: '10px', borderRadius: 10, background: D.surface2, border: `1px solid ${D.border2}`, color: D.text, fontSize: 14, cursor: 'pointer' }}>Hủy</button>
              <button onClick={() => handleDelete(deleteId)} style={{ flex: 1, padding: '10px', borderRadius: 10, background: '#dc2626', border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Xóa</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
