'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

interface CheckinEntry {
  id: number;
  title: string;
  place_name: string;
  place_type: string;
  time: string;
  actual_time: string | null;
  checked_in_at: string;
  checkin_photo_url: string | null;
  checkin_note: string | null;
  latitude: number | null;
  longitude: number | null;
}

const TYPE_COLORS: Record<string, string> = {
  food: '#f97316', cafe: '#a78bfa', attraction: '#3b82f6',
  hotel: '#10b981', transport: '#6b7280', nightlife: '#ec4899',
  shopping: '#eab308', other: '#94a3b8',
};
const TYPE_LABELS: Record<string, string> = {
  food: 'Ẩm thực', cafe: 'Cà phê', attraction: 'Tham quan',
  hotel: 'Lưu trú', transport: 'Di chuyển', nightlife: 'Về đêm',
  shopping: 'Mua sắm', other: 'Khác',
};

const D = {
  bg: '#0d1117', surface: '#161b22', surface2: '#1c2128',
  border: 'rgba(255,255,255,0.07)', border2: 'rgba(255,255,255,0.12)',
  text: '#e6edf3', textMuted: 'rgba(255,255,255,0.45)', textDim: 'rgba(255,255,255,0.22)',
  accent: '#4f6ef7',
};

function formatCheckinTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function JournalPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [entries, setEntries] = useState<CheckinEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tripName, setTripName] = useState('');
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [tripRes, checkinRes] = await Promise.all([
          api.get(`/trips/${id}`),
          api.get(`/trips/${id}/checkins`),
        ]);
        setTripName(tripRes.data.trip?.destination ?? '');
        setEntries(checkinRes.data.checkins ?? []);
      } catch {
        router.push(`/trips/${id}`);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, router]);

  return (
    <div style={{ minHeight: '100vh', background: D.bg, color: D.text, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 30,
        background: 'rgba(13,17,23,0.95)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${D.border}`,
        padding: '14px 20px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <Link href={`/trips/${id}`} style={{ color: D.textMuted, textDecoration: 'none', fontSize: 20 }}>←</Link>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 17, fontWeight: 700, color: D.text, margin: 0 }}>📔 Nhật ký hành trình</h1>
          {tripName && <div style={{ fontSize: 12, color: D.textMuted, marginTop: 1 }}>{tripName}</div>}
        </div>
        <Link
          href={`/trips/${id}/expenses`}
          style={{
            fontSize: 12, fontWeight: 600, color: '#34d399',
            background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)',
            borderRadius: 8, padding: '6px 12px', textDecoration: 'none',
          }}
        >
          💸 Chi phí
        </Link>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 60px' }}>

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{ width: 28, height: 28, border: `2px solid ${D.border2}`, borderTopColor: D.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        )}

        {!loading && entries.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: D.textMuted }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📷</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: D.text, marginBottom: 8 }}>Nhật ký trống</div>
            <div style={{ fontSize: 14, lineHeight: 1.7 }}>
              Check-in tại các địa điểm trong lịch trình<br />để tạo nhật ký ảnh của bạn.
            </div>
            <Link href={`/trips/${id}`} style={{
              display: 'inline-block', marginTop: 24,
              padding: '10px 24px', borderRadius: 10,
              background: D.accent, color: '#fff', fontSize: 14, fontWeight: 600,
              textDecoration: 'none',
            }}>
              Xem lịch trình
            </Link>
          </div>
        )}

        {!loading && entries.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {/* Summary */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28,
              padding: '14px 18px', background: D.surface, borderRadius: 14,
              border: `1px solid ${D.border}`,
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: D.accent }}>{entries.length}</div>
                <div style={{ fontSize: 11, color: D.textMuted }}>địa điểm</div>
              </div>
              <div style={{ width: 1, height: 32, background: D.border }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#a78bfa' }}>
                  {entries.filter(e => e.checkin_photo_url).length}
                </div>
                <div style={{ fontSize: 11, color: D.textMuted }}>có ảnh</div>
              </div>
              <div style={{ width: 1, height: 32, background: D.border }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#34d399' }}>
                  {entries.filter(e => e.checkin_note).length}
                </div>
                <div style={{ fontSize: 11, color: D.textMuted }}>có ghi chú</div>
              </div>
            </div>

            {/* Timeline entries */}
            {entries.map((entry, idx) => {
              const typeColor = TYPE_COLORS[entry.place_type] || '#94a3b8';
              const typeLabel = TYPE_LABELS[entry.place_type] || 'Khác';
              const mapsUrl = `https://www.openstreetmap.org/search?query=${encodeURIComponent(entry.place_name)}`;

              return (
                <div key={entry.id} style={{ display: 'flex', gap: 0 }}>
                  {/* Timeline spine */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 48, flexShrink: 0 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: `${typeColor}18`,
                      border: `2px solid ${typeColor}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, flexShrink: 0, zIndex: 1,
                      boxShadow: `0 0 0 4px ${D.bg}`,
                    }}>
                      ✅
                    </div>
                    {idx < entries.length - 1 && (
                      <div style={{ width: 2, flex: 1, minHeight: 24, background: `${typeColor}30`, margin: '4px 0' }} />
                    )}
                  </div>

                  {/* Card */}
                  <div style={{
                    flex: 1, marginBottom: idx < entries.length - 1 ? 20 : 0,
                    paddingLeft: 14,
                  }}>
                    {/* Meta row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
                        color: typeColor, background: `${typeColor}18`,
                        padding: '3px 9px', borderRadius: 99,
                      }}>
                        {typeLabel}
                      </span>
                      <span style={{ fontSize: 12, color: D.textDim }}>
                        {entry.actual_time
                          ? <><span style={{ textDecoration: 'line-through', marginRight: 4, opacity: 0.5 }}>{entry.time}</span>{entry.actual_time}</>
                          : entry.time}
                      </span>
                      <span style={{ fontSize: 11, color: D.textDim, marginLeft: 'auto' }}>
                        {formatCheckinTime(entry.checked_in_at)}
                      </span>
                    </div>

                    <div style={{
                      background: D.surface, border: `1px solid ${D.border}`,
                      borderRadius: 16, overflow: 'hidden',
                    }}>
                      {/* Photo */}
                      {entry.checkin_photo_url && (
                        <div
                          onClick={() => setLightbox(entry.checkin_photo_url!)}
                          style={{ position: 'relative', width: '100%', height: 220, cursor: 'zoom-in', overflow: 'hidden', background: D.surface2 }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={entry.checkin_photo_url}
                            alt={entry.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          />
                          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(22,27,34,0.6) 0%, transparent 50%)' }} />
                        </div>
                      )}

                      {/* Body */}
                      <div style={{ padding: '12px 14px 14px' }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: D.text, margin: '0 0 4px', letterSpacing: '-0.3px' }}>
                          {entry.title}
                        </h3>

                        {entry.place_name && (
                          <a
                            href={mapsUrl} target="_blank" rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              fontSize: 12, color: '#60a5fa', textDecoration: 'none', marginBottom: 8,
                            }}
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {entry.place_name}
                          </a>
                        )}

                        {entry.checkin_note && (
                          <div style={{
                            marginTop: 4, padding: '10px 12px',
                            background: 'rgba(52,211,153,0.07)',
                            border: '1px solid rgba(52,211,153,0.15)',
                            borderRadius: 10, fontSize: 14, color: D.text,
                            lineHeight: 1.65,
                          }}>
                            <span style={{ fontSize: 15, marginRight: 6 }}>💬</span>
                            {entry.checkin_note}
                          </div>
                        )}

                        {!entry.checkin_note && !entry.checkin_photo_url && (
                          <div style={{ fontSize: 13, color: D.textDim, fontStyle: 'italic' }}>
                            Chưa có ghi chú hay ảnh.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16, cursor: 'zoom-out',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="Ảnh check-in"
            style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: 12 }}
          />
          <button
            onClick={() => setLightbox(null)}
            style={{
              position: 'absolute', top: 16, right: 16,
              background: 'rgba(255,255,255,0.12)', border: 'none',
              color: '#fff', borderRadius: '50%', width: 36, height: 36,
              cursor: 'pointer', fontSize: 18, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}
          >✕</button>
        </div>
      )}
    </div>
  );
}
