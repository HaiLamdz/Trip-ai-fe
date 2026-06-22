'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useUnsplashImage } from '@/hooks/useUnsplashImage';

interface CommunityTrip {
  id: number;
  destination: string;
  origin: string | null;
  start_date: string;
  duration_days: number;
  budget: number;
  num_people: number;
  travel_type: string | null;
  preferences: string[];
  publish_description: string | null;
  clone_count: number;
  view_count: number;
  published_at: string;
  cover_image_url: string | null;
  user: { id: number; name: string; avatar: string | null };
}

interface Pagination {
  current_page: number;
  last_page: number;
  total: number;
  data: CommunityTrip[];
}

const PREFERENCES = [
  { key: 'food', label: 'Ẩm thực', emoji: '🍜' },
  { key: 'nature', label: 'Thiên nhiên', emoji: '🌿' },
  { key: 'culture', label: 'Văn hóa', emoji: '🏛️' },
  { key: 'adventure', label: 'Phiêu lưu', emoji: '🧗' },
  { key: 'cafe', label: 'Café', emoji: '☕' },
  { key: 'shopping', label: 'Mua sắm', emoji: '🛍️' },
  { key: 'beach', label: 'Biển', emoji: '🏖️' },
  { key: 'luxury', label: 'Sang trọng', emoji: '✨' },
];

const SORTS = [
  { key: 'latest', label: 'Mới nhất' },
  { key: 'popular', label: 'Phổ biến' },
  { key: 'budget_asc', label: 'Ngân sách thấp' },
  { key: 'budget_desc', label: 'Ngân sách cao' },
];

const D = {
  bg: '#f5f6fa',
  surface: '#ffffff',
  border: 'rgba(0,0,0,0.07)',
  text: '#1a1d2e',
  textMuted: 'rgba(26,29,46,0.5)',
  accent: '#2563eb',
};

function TripCard({ trip }: { trip: CommunityTrip }) {
  const { url: unsplashUrl } = useUnsplashImage('attraction', trip.destination);
  const imgUrl = trip.cover_image_url || unsplashUrl;

  return (
    <Link href={`/community/${trip.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{
        background: D.surface,
        borderRadius: 16,
        overflow: 'hidden',
        border: `1px solid ${D.border}`,
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
        cursor: 'pointer',
      }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 28px rgba(0,0,0,0.12)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)';
        }}
      >
        {/* Cover image */}
        <div style={{ position: 'relative', height: 180 }}>
          {imgUrl ? (
            <Image src={imgUrl} alt={trip.destination} fill unoptimized
              style={{ objectFit: 'cover' }} sizes="(max-width:768px) 100vw, 33vw" />
          ) : (
            <div style={{ height: '100%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }} />
          )}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 55%)',
          }} />
          {/* Stats overlay */}
          <div style={{ position: 'absolute', bottom: 10, left: 12, right: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.4px' }}>
                {trip.destination}
              </div>
              {trip.origin && (
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>
                  Từ {trip.origin}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ background: 'rgba(0,0,0,0.45)', borderRadius: 8, padding: '3px 8px', backdropFilter: 'blur(4px)' }}>
                <span style={{ fontSize: 11, color: '#fff' }}>👁 {trip.view_count}</span>
              </div>
              <div style={{ background: 'rgba(37,99,235,0.75)', borderRadius: 8, padding: '3px 8px', backdropFilter: 'blur(4px)' }}>
                <span style={{ fontSize: 11, color: '#fff' }}>📋 {trip.clone_count}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '12px 14px 14px' }}>
          {/* Meta row */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: D.textMuted, background: '#f0f2f8', padding: '2px 8px', borderRadius: 99 }}>
              🗓 {trip.duration_days} ngày
            </span>
            <span style={{ fontSize: 11, color: D.textMuted, background: '#f0f2f8', padding: '2px 8px', borderRadius: 99 }}>
              👥 {trip.num_people} người
            </span>
            <span style={{ fontSize: 11, color: '#059669', background: 'rgba(5,150,105,0.1)', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>
              {formatCurrency(trip.budget)}
            </span>
          </div>

          {/* Preferences */}
          {trip.preferences?.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
              {trip.preferences.slice(0, 3).map(p => {
                const pref = PREFERENCES.find(x => x.key === p);
                return pref ? (
                  <span key={p} style={{ fontSize: 10, color: D.accent, background: 'rgba(37,99,235,0.08)', padding: '2px 6px', borderRadius: 99 }}>
                    {pref.emoji} {pref.label}
                  </span>
                ) : null;
              })}
            </div>
          )}

          {/* Description */}
          {trip.publish_description && (
            <p style={{ fontSize: 12, color: D.textMuted, margin: '0 0 10px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {trip.publish_description}
            </p>
          )}

          {/* Author */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 10, borderTop: `1px solid ${D.border}` }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%',
              background: D.accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', flexShrink: 0,
            }}>
              {trip.user.avatar ? (
                <Image src={trip.user.avatar} alt={trip.user.name} width={26} height={26} unoptimized style={{ objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>
                  {trip.user.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: D.text }}>{trip.user.name}</span>
            <span style={{ fontSize: 11, color: D.textMuted, marginLeft: 'auto' }}>
              {formatDate(trip.published_at)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function CommunityPage() {
  const [data, setData] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [preference, setPreference] = useState('');
  const [sort, setSort] = useState('latest');
  const [page, setPage] = useState(1);

  const fetchTrips = useCallback(async (reset = false) => {
    const targetPage = reset ? 1 : page;
    setLoading(true);
    try {
      const { data: res } = await api.get('/community', {
        params: { search, preference, sort, page: targetPage },
      });
      setData(res);
      if (reset) setPage(1);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [search, preference, sort, page]);

  useEffect(() => { fetchTrips(true); }, [search, preference, sort]); // eslint-disable-line
  useEffect(() => { if (page > 1) fetchTrips(); }, [page]); // eslint-disable-line

  return (
    <div style={{ minHeight: '100vh', background: D.bg, fontFamily: '"Inter", system-ui, sans-serif' }}>

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #7c3aed 100%)',
        padding: '40px 24px 36px',
        textAlign: 'center',
      }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: '#fff', margin: '0 0 8px', letterSpacing: '-1px' }}>
          🌍 Cộng Đồng Du Lịch
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.75)', margin: '0 0 24px' }}>
          Khám phá lịch trình từ cộng đồng, clone về và tùy chỉnh theo ý bạn
        </p>

        {/* Search bar */}
        <div style={{ maxWidth: 480, margin: '0 auto', position: 'relative' }}>
          <input
            type="text"
            placeholder="Tìm điểm đến... (Đà Nẵng, Hội An...)"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '13px 18px 13px 44px',
              borderRadius: 99, border: 'none',
              fontSize: 14, background: '#fff',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              outline: 'none',
            }}
          />
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth={2}
            style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)' }}>
            <circle cx="11" cy="11" r="8" />
            <path strokeLinecap="round" d="m21 21-4.35-4.35" />
          </svg>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px 60px' }}>

        {/* Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20, alignItems: 'center' }}>
          {/* Sort */}
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            style={{
              padding: '7px 12px', borderRadius: 8,
              border: `1px solid ${D.border}`, background: '#fff',
              fontSize: 13, color: D.text, cursor: 'pointer', outline: 'none',
            }}
          >
            {SORTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>

          {/* Preference chips */}
          <button
            onClick={() => setPreference('')}
            style={{
              padding: '6px 14px', borderRadius: 99,
              border: `1px solid ${preference === '' ? D.accent : D.border}`,
              background: preference === '' ? 'rgba(37,99,235,0.08)' : '#fff',
              color: preference === '' ? D.accent : D.textMuted,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Tất cả
          </button>
          {PREFERENCES.map(p => (
            <button
              key={p.key}
              onClick={() => setPreference(p.key === preference ? '' : p.key)}
              style={{
                padding: '6px 14px', borderRadius: 99,
                border: `1px solid ${preference === p.key ? D.accent : D.border}`,
                background: preference === p.key ? 'rgba(37,99,235,0.08)' : '#fff',
                color: preference === p.key ? D.accent : D.textMuted,
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {p.emoji} {p.label}
            </button>
          ))}
        </div>

        {/* Results count */}
        {data && (
          <div style={{ fontSize: 13, color: D.textMuted, marginBottom: 16 }}>
            {data.total} lịch trình
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ borderRadius: 16, overflow: 'hidden', background: D.surface, border: `1px solid ${D.border}` }}>
                <div style={{ height: 180, background: '#e5e7eb', animation: 'pulse 1.5s infinite' }} />
                <div style={{ padding: '12px 14px 14px' }}>
                  <div style={{ height: 14, background: '#e5e7eb', borderRadius: 4, marginBottom: 8, animation: 'pulse 1.5s infinite' }} />
                  <div style={{ height: 10, background: '#e5e7eb', borderRadius: 4, width: '60%', animation: 'pulse 1.5s infinite' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Grid */}
        {!loading && data && data.data.length > 0 && (
          <>
            <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
              {data.data.map(trip => <TripCard key={trip.id} trip={trip} />)}
            </div>

            {/* Pagination */}
            {data.last_page > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 32 }}>
                {[...Array(data.last_page)].map((_, i) => {
                  const pg = i + 1;
                  return (
                    <button
                      key={pg}
                      onClick={() => setPage(pg)}
                      style={{
                        width: 36, height: 36, borderRadius: 8,
                        border: `1px solid ${pg === data.current_page ? D.accent : D.border}`,
                        background: pg === data.current_page ? D.accent : '#fff',
                        color: pg === data.current_page ? '#fff' : D.text,
                        fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      {pg}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Empty */}
        {!loading && (!data || data.data.length === 0) && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🗺️</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: D.text, marginBottom: 8 }}>
              Chưa có lịch trình nào
            </h3>
            <p style={{ fontSize: 14, color: D.textMuted, marginBottom: 24 }}>
              Hãy là người đầu tiên chia sẻ lịch trình của bạn!
            </p>
            <Link href="/trips/create" style={{
              display: 'inline-block', padding: '12px 28px', borderRadius: 99,
              background: D.accent, color: '#fff', fontSize: 14, fontWeight: 700,
              textDecoration: 'none',
            }}>
              Tạo lịch trình mới
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
