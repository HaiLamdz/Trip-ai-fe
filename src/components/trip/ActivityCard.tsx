'use client';

import { useState } from 'react';
import Image from 'next/image';
import { formatCurrency } from '@/lib/utils';
import NearbyPlaces from './NearbyPlaces';
import ActivityEditModal, { ActivityFormData } from './ActivityEditModal';
import CheckinModal, { CheckinData } from './CheckinModal';
import { useUnsplashImage } from '@/hooks/useUnsplashImage';

interface Activity {
  id?: number;
  time: string; title: string; description: string;
  place_name: string; place_type: string;
  estimated_cost: number; duration_minutes: number;
  transport_to_next: string | null; distance_to_next_km: number;
  latitude: number | null; longitude: number | null;
  sort_order: number;
  // Check-in fields
  checked_in_at?: string | null;
  checkin_photo_url?: string | null;
  checkin_note?: string | null;
  actual_time?: string | null;
}

interface Props {
  activity: Activity; index: number; isLast: boolean; isActive: boolean;
  tripId: number; dayId: number;
  onHover: (activity: Activity | null) => void;
  onSave: (activity: Activity) => void;
  onUpdated: (updated: Activity) => void;
  onDeleted: () => void;
}

const TYPE_ICONS: Record<string, string> = {
  food: '🍽', cafe: '☕', attraction: '🏛', hotel: '🏨',
  transport: '🚗', nightlife: '🌙', shopping: '🛍', other: '📍',
};

const TYPE_COLORS: Record<string, string> = {
  food: '#f97316', cafe: '#a78bfa', attraction: '#3b82f6',
  hotel: '#10b981', transport: '#6b7280', nightlife: '#ec4899',
  shopping: '#eab308', other: '#94a3b8',
};

function transportIcon(mode: string | null): string {
  if (!mode) return '🚶';
  const m = mode.toLowerCase();
  if (m.includes('walk') || m.includes('đi bộ')) return '🚶';
  if (m.includes('motorbike') || m.includes('xe máy') || m.includes('bike')) return '🛵';
  if (m.includes('taxi') || m.includes('grab') || m.includes('car') || m.includes('ô tô')) return '🚗';
  if (m.includes('bus') || m.includes('buýt')) return '🚌';
  if (m.includes('train') || m.includes('metro') || m.includes('tàu')) return '🚇';
  return '🚶';
}

export default function ActivityCard({ activity, isLast, isActive, tripId, dayId, onHover, onSave, onUpdated, onDeleted }: Props) {
  const [saved, setSaved] = useState(false);
  const [nearbyOpen, setNearbyOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const { url: imgUrl, fallbackColor, loading: imgLoading } = useUnsplashImage(activity.place_type, activity.title);

  const isCheckedIn = !!activity.checked_in_at;
  const typeColor = TYPE_COLORS[activity.place_type] || '#94a3b8';
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.place_name)}`;

  const handleDelete = async () => {
    if (!activity.id) return;
    setDeleting(true);
    try {
      const { default: api } = await import('@/lib/api');
      await api.delete(`/trips/${tripId}/days/${dayId}/places/${activity.id}`);
      onDeleted();
    } catch { setDeleting(false); setConfirmDelete(false); }
  };

  return (
    <div style={{ display: 'flex', gap: 0, marginBottom: 4 }}>

      {/* ── Left: vertical timeline ── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 40, flexShrink: 0 }}>
        {/* Type dot */}
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: `${typeColor}22`,
          border: `2px solid ${typeColor}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, flexShrink: 0, zIndex: 1,
        }}>
          {TYPE_ICONS[activity.place_type] || '📍'}
        </div>
        {/* Vertical line */}
        {!isLast && (
          <div style={{
            width: 2, flex: 1, minHeight: 24,
            background: 'rgba(255,255,255,0.07)',
            marginTop: 4,
          }} />
        )}
      </div>

      {/* ── Right: header + card ── */}
      <div style={{ flex: 1, paddingLeft: 12, paddingBottom: isLast ? 0 : 16 }}>

        {/* Header row: time + place name + maps link */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, minHeight: 32 }}>
          {/* Time chip */}
          <span style={{
            fontSize: 12, fontWeight: 700, color: '#e6edf3',
            background: '#1c2128', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '3px 10px',
            letterSpacing: 0.3, flexShrink: 0,
          }}>
            {activity.actual_time
              ? <><span style={{ textDecoration: 'line-through', opacity: 0.4, marginRight: 4 }}>{activity.time}</span>{activity.actual_time}</>
              : activity.time}
          </span>

          {/* Check-in badge */}
          {isCheckedIn && (
            <span style={{
              fontSize: 11, fontWeight: 600,
              background: 'rgba(52,211,153,0.15)', color: '#34d399',
              border: '1px solid rgba(52,211,153,0.3)',
              borderRadius: 8, padding: '3px 8px', flexShrink: 0,
            }}>✓ Đã đến</span>
          )}

          {/* Place name — main label, clickable → Google Maps */}
          {activity.place_name && (
            <a
              href={mapsUrl}
              target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              title={`Tìm "${activity.place_name}" trên Google Maps`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 12, fontWeight: 600,
                color: '#cbd5e1',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '3px 10px',
                textDecoration: 'none',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                maxWidth: 'calc(100% - 80px)',
                transition: 'background 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(96,165,250,0.12)';
                (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(96,165,250,0.35)';
                (e.currentTarget as HTMLAnchorElement).style.color = '#60a5fa';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.05)';
                (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.1)';
                (e.currentTarget as HTMLAnchorElement).style.color = '#cbd5e1';
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{ flexShrink: 0, opacity: 0.7 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {activity.place_name}
            </a>
          )}
        </div>

        {/* ── Main card ── */}
        <div
          onMouseEnter={() => onHover(activity)}
          onMouseLeave={() => onHover(null)}
          style={{
            background: isActive ? '#1e2535' : '#161b22',
            borderRadius: 14,
            overflow: 'hidden',
            cursor: 'pointer',
            border: isActive ? `1px solid ${typeColor}55` : '1px solid rgba(255,255,255,0.07)',
            transition: 'border-color 0.15s, background 0.15s',
          }}
        >
          {/* Image */}
          {(imgUrl || imgLoading) && (
            <div style={{ position: 'relative', width: '100%', height: 160, background: fallbackColor, overflow: 'hidden' }}>
              {imgUrl ? (
                <Image src={imgUrl} alt={activity.title} fill className="object-cover" sizes="40vw" unoptimized />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ width: 22, height: 22, border: '2px solid rgba(255,255,255,0.15)', borderTopColor: 'rgba(255,255,255,0.6)', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                </div>
              )}
            </div>
          )}

          {/* Body */}
          <div style={{ padding: '12px 14px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#e6edf3', margin: 0, letterSpacing: '-0.3px', lineHeight: 1.3 }}>
                {activity.title}
              </h3>
              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginLeft: 8 }}>
                {/* Check-in */}
                {activity.id && (
                  <button
                    onClick={e => { e.stopPropagation(); setCheckinOpen(true); }}
                    title={isCheckedIn ? 'Xem / cập nhật check-in' : 'Check-in địa điểm này'}
                    style={{
                      background: isCheckedIn ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${isCheckedIn ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: 6, cursor: 'pointer',
                      color: isCheckedIn ? '#34d399' : 'rgba(255,255,255,0.5)',
                      padding: '2px 7px', fontSize: 11, lineHeight: 1.6,
                    }}
                  >
                    {isCheckedIn ? '📍 ✓' : '📍'}
                  </button>
                )}
                <button
                  onClick={e => { e.stopPropagation(); onSave(activity); setSaved(true); setTimeout(() => setSaved(false), 2000); }}
                  title="Lưu địa điểm"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: saved ? '#60a5fa' : 'rgba(255,255,255,0.2)', padding: '2px 4px', fontSize: 13, lineHeight: 1 }}
                >
                  {saved ? '✓' : '🔖'}
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setEditOpen(true); }}
                  title="Chỉnh sửa"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, cursor: 'pointer', color: 'rgba(255,255,255,0.5)', padding: '2px 7px', fontSize: 11, lineHeight: 1.6 }}
                >
                  ✏️
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setConfirmDelete(true); }}
                  title="Xóa"
                  style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 6, cursor: 'pointer', color: '#f87171', padding: '2px 7px', fontSize: 11, lineHeight: 1.6 }}
                >
                  🗑
                </button>
              </div>
            </div>

            {activity.description && (
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '0 0 10px', lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {activity.description}
              </p>
            )}

            {/* Meta chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              {activity.duration_minutes > 0 && (
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  ⏱ {activity.duration_minutes >= 60
                    ? `${Math.floor(activity.duration_minutes / 60)}h${activity.duration_minutes % 60 > 0 ? activity.duration_minutes % 60 + 'm' : ''}`
                    : `${activity.duration_minutes}m`}
                </span>
              )}
              {activity.estimated_cost > 0 && (
                <span style={{ fontSize: 11, fontWeight: 600, color: '#34d399', background: 'rgba(52,211,153,0.1)', padding: '2px 8px', borderRadius: 99 }}>
                  {formatCurrency(activity.estimated_cost)}
                </span>
              )}
              {activity.latitude && activity.longitude && (
                <button
                  onClick={e => { e.stopPropagation(); setNearbyOpen(true); }}
                  style={{ fontSize: 11, color: '#818cf8', background: 'rgba(79,110,247,0.1)', border: 'none', padding: '2px 8px', borderRadius: 99, cursor: 'pointer' }}
                >
                  🔄 Địa điểm khác
                </button>
              )}
            </div>

            {/* Check-in note (if exists) */}
            {activity.checkin_note && (
              <div style={{ marginTop: 8, padding: '7px 10px', background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 8, fontSize: 12, color: 'rgba(52,211,153,0.85)', lineHeight: 1.5 }}>
                💬 {activity.checkin_note}
              </div>
            )}
          </div>
        </div>

        {/* ── Transport connector ── */}
        {!isLast && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', marginTop: 8,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: 10,
          }}>
            <span style={{ fontSize: 14, color: '#fff' }}>{transportIcon(activity.transport_to_next)}</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
              {activity.transport_to_next || 'Di chuyển'}
              {activity.distance_to_next_km > 0 && (
                <span style={{ color: 'rgba(255,255,255,0.2)', marginLeft: 4 }}>· {activity.distance_to_next_km} km</span>
              )}
            </span>
          </div>
        )}
      </div>

      {nearbyOpen && activity.latitude && activity.longitude && (
        <NearbyPlaces tripId={tripId} placeName={activity.place_name} placeType={activity.place_type}
          lat={activity.latitude} lng={activity.longitude} onClose={() => setNearbyOpen(false)} />
      )}

      {/* Edit modal */}
      {editOpen && (
        <ActivityEditModal
          tripId={tripId} dayId={dayId} placeId={activity.id}
          initial={{ ...activity, transport_to_next: activity.transport_to_next ?? '' }}
          onSaved={updated => { setEditOpen(false); onUpdated(updated as Activity); }}
          onClose={() => setEditOpen(false)}
        />
      )}

      {/* Check-in modal */}
      {checkinOpen && activity.id && (
        <CheckinModal
          tripId={tripId}
          place={{
            id: activity.id,
            title: activity.title,
            place_name: activity.place_name,
            place_type: activity.place_type,
            time: activity.time,
            checked_in_at: activity.checked_in_at,
            checkin_photo_url: activity.checkin_photo_url,
            checkin_note: activity.checkin_note,
            actual_time: activity.actual_time,
          }}
          onSaved={(updated: CheckinData) => {
            setCheckinOpen(false);
            onUpdated({
              ...activity,
              checked_in_at: updated.checked_in_at,
              checkin_photo_url: updated.checkin_photo_url,
              checkin_note: updated.checkin_note,
              actual_time: updated.actual_time,
            } as Activity);
          }}
          onClose={() => setCheckinOpen(false)}
        />
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setConfirmDelete(false)}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} />
          <div style={{ position: 'relative', background: '#161b22', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: '24px 24px 20px', maxWidth: 340, width: '100%' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#e6edf3', marginBottom: 8 }}>Xóa hoạt động?</h3>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 20 }}>
              &ldquo;{activity.title}&rdquo; sẽ bị xóa khỏi lịch trình.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmDelete(false)}
                style={{ flex: 1, padding: '9px', borderRadius: 9, background: '#1c2128', border: '1px solid rgba(255,255,255,0.12)', color: '#e6edf3', fontSize: 13, cursor: 'pointer' }}>
                Hủy
              </button>
              <button onClick={handleDelete} disabled={deleting}
                style={{ flex: 1, padding: '9px', borderRadius: 9, background: '#dc2626', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: deleting ? 'not-allowed' : 'pointer' }}>
                {deleting ? 'Đang xóa…' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
