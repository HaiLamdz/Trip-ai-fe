'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useUnsplashImage } from '@/hooks/useUnsplashImage';

const TripMap = dynamic(() => import('@/components/trip/TripMap'), {
  ssr: false,
  loading: () => (
    <div style={{ height: '100%', background: '#161b22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 24, height: 24, border: '2px solid #4f6ef7', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  ),
});

interface Activity {
  id?: number; time: string; title: string; description: string;
  place_name: string; place_type: string; estimated_cost: number;
  duration_minutes: number; transport_to_next: string | null;
  distance_to_next_km: number; latitude: number | null; longitude: number | null; sort_order: number;
}
interface TripDay {
  id: number; day_number: number; date: string;
  weather: { summary: string; icon: string; temperature_high: number; temperature_low: number; rain_probability: number } | null;
  places: Activity[];
}
interface TripDetail {
  id: number; destination: string; origin: string | null; start_date: string;
  duration_days: number; budget: number; num_people: number;
  travel_type: string | null; preferences: string[]; days: TripDay[];
  publish_description: string | null; clone_count: number; view_count: number;
  published_at: string; cover_image_url: string | null;
  user: { id: number; name: string; avatar: string | null };
  budget_data: {
    food: string; transport: string; attraction: string;
    accommodation: string; other: string; total_estimated: string;
  } | null;
}

const WEATHER_ICONS: Record<string, string> = {
  '01d': '☀️', '02d': '⛅', '03d': '☁️', '04d': '☁️',
  '09d': '🌧️', '10d': '🌦️', '11d': '⛈️', '13d': '❄️', '50d': '🌫️',
};
const DAY_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const PLACE_CONFIG: Record<string, { emoji: string; color: string }> = {
  food: { emoji: '🍜', color: '#f97316' }, cafe: { emoji: '☕', color: '#a78bfa' },
  attraction: { emoji: '🏛️', color: '#3b82f6' }, hotel: { emoji: '🏨', color: '#10b981' },
  transport: { emoji: '🚗', color: '#6b7280' }, shopping: { emoji: '🛍️', color: '#eab308' },
  nightlife: { emoji: '🌃', color: '#ec4899' }, other: { emoji: '📍', color: '#06b6d4' },
};

const D = {
  bg: '#f5f6fa', surface: '#ffffff', border: 'rgba(0,0,0,0.07)',
  text: '#1a1d2e', textMuted: 'rgba(26,29,46,0.5)', accent: '#2563eb',
};

function CoverImage({ url, destination }: { url: string | null; destination: string }) {
  const { url: unsplash } = useUnsplashImage('attraction', destination);
  const img = url || unsplash;
  if (!img) return null;
  return (
    <Image src={img} alt={destination} fill unoptimized
      style={{ objectFit: 'cover' }} sizes="100vw" />
  );
}

export default function CommunityTripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [hasCloned, setHasCloned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cloning, setCloning] = useState(false);
  const [cloneSuccess, setCloneSuccess] = useState(false);
  const [activeDay, setActiveDay] = useState(1);

  useEffect(() => {
    api.get(`/community/${id}`)
      .then(({ data }) => {
        setTrip(data.trip);
        setHasCloned(data.has_cloned);
        if (data.trip?.days?.length > 0) setActiveDay(data.trip.days[0].day_number);
      })
      .catch(() => router.push('/community'))
      .finally(() => setLoading(false));
  }, [id, router]);

  const handleClone = async () => {
    if (hasCloned || cloning) return;
    setCloning(true);
    try {
      const { data } = await api.post(`/community/${id}/clone`);
      setHasCloned(true);
      setCloneSuccess(true);
      setTrip(prev => prev ? { ...prev, clone_count: prev.clone_count + 1 } : prev);
      setTimeout(() => {
        router.push(`/trips/${data.trip_id}`);
      }, 1200);
    } catch {
      setCloning(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: D.bg }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ width: 32, height: 32, border: '3px solid rgba(37,99,235,0.15)', borderTopColor: D.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  if (!trip) return null;

  const allPlaces = trip.days.flatMap(d => d.places.map(p => ({ ...p, day: d.day_number })));
  const currentDay = trip.days.find(d => d.day_number === activeDay);
  const totalEstimated = Number(trip.budget_data?.total_estimated) || Number(trip.budget);

  const budgetCategories = trip.budget_data ? [
    { key: 'food', label: 'Ẩm thực', emoji: '🍜', color: '#f97316', amount: Number(trip.budget_data.food) },
    { key: 'transport', label: 'Di chuyển', emoji: '🚗', color: '#6b7280', amount: Number(trip.budget_data.transport) },
    { key: 'attraction', label: 'Tham quan', emoji: '🏛️', color: '#3b82f6', amount: Number(trip.budget_data.attraction) },
    { key: 'accommodation', label: 'Lưu trú', emoji: '🏨', color: '#10b981', amount: Number(trip.budget_data.accommodation) },
    { key: 'other', label: 'Khác', emoji: '🛍️', color: '#a78bfa', amount: Number(trip.budget_data.other) },
  ].filter(c => c.amount > 0) : [];

  return (
    <div style={{ minHeight: '100vh', background: D.bg, fontFamily: '"Inter", system-ui, sans-serif' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 30, background: 'rgba(245,246,250,0.95)',
        backdropFilter: 'blur(10px)', borderBottom: `1px solid ${D.border}`,
        padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <Link href="/community" style={{ color: D.textMuted, textDecoration: 'none', fontSize: 20 }}>←</Link>
        <h1 style={{ flex: 1, fontSize: 17, fontWeight: 700, color: D.text, margin: 0 }}>
          {trip.destination}
        </h1>
        {/* Clone button */}
        <button
          onClick={handleClone}
          disabled={hasCloned || cloning}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '9px 20px', borderRadius: 10, border: 'none',
            background: cloneSuccess ? '#059669' : hasCloned ? '#e5e7eb' : D.accent,
            color: hasCloned && !cloneSuccess ? D.textMuted : '#fff',
            fontSize: 14, fontWeight: 700, cursor: hasCloned ? 'default' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {cloning ? (
            <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          ) : cloneSuccess ? (
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
          {cloneSuccess ? 'Đang chuyển hướng...' : hasCloned ? 'Đã clone' : `Clone về (${trip.clone_count})`}
        </button>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px 60px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24 }}>

          {/* LEFT: Main content */}
          <div>
            {/* Cover */}
            <div style={{ position: 'relative', height: 260, borderRadius: 20, overflow: 'hidden', marginBottom: 20 }}>
              <CoverImage url={trip.cover_image_url} destination={trip.destination} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 55%)' }} />
              <div style={{ position: 'absolute', bottom: 18, left: 20 }}>
                <h2 style={{ fontSize: 28, fontWeight: 900, color: '#fff', margin: 0 }}>📍 {trip.destination}</h2>
                <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>📅 {formatDate(trip.start_date)}</span>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>🗓 {trip.duration_days} ngày</span>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>👥 {trip.num_people} người</span>
                  <span style={{ fontSize: 13, color: '#86efac', fontWeight: 600 }}>{formatCurrency(trip.budget)}</span>
                </div>
              </div>
              {/* Author badge */}
              <div style={{
                position: 'absolute', top: 14, right: 14,
                display: 'flex', alignItems: 'center', gap: 7,
                background: 'rgba(0,0,0,0.5)', borderRadius: 99,
                padding: '6px 12px 6px 8px', backdropFilter: 'blur(8px)',
              }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: D.accent, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {trip.user.avatar ? (
                    <Image src={trip.user.avatar} alt={trip.user.name} width={24} height={24} unoptimized style={{ objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{trip.user.name.charAt(0)}</span>
                  )}
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{trip.user.name}</span>
              </div>
            </div>

            {/* Description */}
            {trip.publish_description && (
              <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 14, padding: '14px 16px', marginBottom: 20 }}>
                <p style={{ fontSize: 14, color: D.text, lineHeight: 1.6, margin: 0 }}>
                  💬 {trip.publish_description}
                </p>
              </div>
            )}

            {/* Day tabs */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
              {trip.days.map((day, idx) => {
                const isActive = day.day_number === activeDay;
                const color = DAY_COLORS[idx % DAY_COLORS.length];
                return (
                  <button key={day.id} onClick={() => setActiveDay(day.day_number)} style={{
                    flexShrink: 0, padding: '7px 16px', borderRadius: 8,
                    border: `1px solid ${isActive ? color : D.border}`,
                    background: isActive ? color : D.surface,
                    color: isActive ? '#fff' : D.textMuted,
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}>
                    Ngày {day.day_number}
                    {day.weather && <span style={{ marginLeft: 5, opacity: 0.9 }}>{WEATHER_ICONS[day.weather.icon] || '🌤️'} {Math.round(day.weather.temperature_high)}°</span>}
                  </button>
                );
              })}
            </div>

            {/* Timeline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {currentDay?.places.map((place, i) => {
                const cfg = PLACE_CONFIG[place.place_type] || PLACE_CONFIG.other;
                return (
                  <div key={i} style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 14, padding: '14px 16px', position: 'relative', paddingLeft: 20 }}>
                    {/* Timeline line */}
                    {i < (currentDay.places.length - 1) && (
                      <div style={{ position: 'absolute', left: 28, top: '100%', width: 1, height: 10, background: D.border }} />
                    )}
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        background: `${cfg.color}15`, border: `1px solid ${cfg.color}30`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                      }}>
                        {cfg.emoji}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 }}>
                          <div>
                            <span style={{ fontSize: 11, fontWeight: 600, color: D.textMuted, marginRight: 8 }}>{place.time}</span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: D.text }}>{place.title}</span>
                          </div>
                          {place.estimated_cost > 0 && (
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#059669', flexShrink: 0, marginLeft: 8 }}>
                              {formatCurrency(place.estimated_cost)}
                            </span>
                          )}
                        </div>
                        {place.place_name && (
                          <div style={{ fontSize: 12, color: D.textMuted, marginBottom: 3 }}>📍 {place.place_name}</div>
                        )}
                        {place.description && (
                          <div style={{ fontSize: 12, color: D.textMuted, lineHeight: 1.5 }}>{place.description}</div>
                        )}
                        {place.transport_to_next && i < currentDay.places.length - 1 && (
                          <div style={{ marginTop: 8, fontSize: 11, color: D.textMuted, background: '#f0f2f8', borderRadius: 6, padding: '3px 8px', display: 'inline-block' }}>
                            → {place.transport_to_next} · {place.distance_to_next_km} km
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Stats card */}
            <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 16, padding: '16px 18px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: D.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
                Thống kê
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Lượt xem', value: trip.view_count, emoji: '👁' },
                  { label: 'Đã clone', value: trip.clone_count, emoji: '📋' },
                  { label: 'Số ngày', value: trip.duration_days, emoji: '🗓' },
                  { label: 'Số người', value: trip.num_people, emoji: '👥' },
                ].map(s => (
                  <div key={s.label} style={{ background: '#f0f2f8', borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ fontSize: 20, marginBottom: 4 }}>{s.emoji}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: D.text }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: D.textMuted }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Budget breakdown */}
            {budgetCategories.length > 0 && (
              <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 16, padding: '16px 18px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: D.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
                  Phân bổ ngân sách
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, color: D.accent, marginBottom: 14 }}>
                  {formatCurrency(totalEstimated)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {budgetCategories.map(cat => {
                    const pct = totalEstimated > 0 ? (cat.amount / totalEstimated) * 100 : 0;
                    return (
                      <div key={cat.key}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, color: D.textMuted }}>{cat.emoji} {cat.label}</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: D.text }}>{formatCurrency(cat.amount)}</span>
                        </div>
                        <div style={{ height: 5, background: '#f0f2f8', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: cat.color, borderRadius: 99, transition: 'width 0.4s' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {trip.num_people > 1 && (
                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${D.border}`, fontSize: 12, color: D.textMuted }}>
                    ~{formatCurrency(Math.round(totalEstimated / trip.num_people))} / người
                  </div>
                )}
              </div>
            )}

            {/* Map */}
            <div style={{ height: 300, borderRadius: 16, overflow: 'hidden', border: `1px solid ${D.border}` }}>
              <TripMap places={allPlaces} days={trip.days} activeDayNumber={activeDay} />
            </div>

            {/* Clone CTA */}
            <div style={{
              background: hasCloned ? 'rgba(5,150,105,0.08)' : 'linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(124,58,237,0.08) 100%)',
              border: `1px solid ${hasCloned ? 'rgba(5,150,105,0.2)' : 'rgba(37,99,235,0.15)'}`,
              borderRadius: 16, padding: '18px',
            }}>
              {hasCloned ? (
                <>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#059669', marginBottom: 4 }}>
                    ✅ Bạn đã clone lịch trình này
                  </div>
                  <div style={{ fontSize: 12, color: D.textMuted, marginBottom: 12 }}>
                    Xem và tùy chỉnh trong danh sách lịch trình của bạn.
                  </div>
                  <Link href="/dashboard" style={{
                    display: 'block', textAlign: 'center', padding: '10px', borderRadius: 10,
                    background: '#059669', color: '#fff', fontSize: 13, fontWeight: 700,
                    textDecoration: 'none',
                  }}>
                    Đến trang chủ →
                  </Link>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 14, fontWeight: 700, color: D.text, marginBottom: 4 }}>
                    Thích lịch trình này?
                  </div>
                  <div style={{ fontSize: 12, color: D.textMuted, marginBottom: 12 }}>
                    Clone về và tùy chỉnh theo ý bạn — ngày đi, ngân sách, sở thích.
                  </div>
                  <button
                    onClick={handleClone}
                    disabled={cloning}
                    style={{
                      width: '100%', padding: '11px', borderRadius: 10, border: 'none',
                      background: D.accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    }}
                  >
                    {cloning ? (
                      <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                    ) : (
                      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                    {cloning ? 'Đang clone...' : 'Clone lịch trình này'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
