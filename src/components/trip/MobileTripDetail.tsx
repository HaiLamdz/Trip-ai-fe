'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { formatCurrency } from '@/lib/utils';
import { useUnsplashImage } from '@/hooks/useUnsplashImage';
import api from '@/lib/api';

const TripMap = dynamic(() => import('./TripMap'), {
  ssr: false,
  loading: () => (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#161b22' }}>
      <div style={{ width: 24, height: 24, border: '2px solid #4f6ef7', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  ),
});

/* ─── Types ─────────────────────────────────────────────────────────── */
interface Activity {
  id?: number;
  time: string; title: string; description: string;
  place_name: string; place_type: string;
  estimated_cost: number; duration_minutes: number;
  transport_to_next: string | null; distance_to_next_km: number;
  latitude: number | null; longitude: number | null;
  sort_order: number;
  checked_in_at?: string | null;
  checkin_photo_url?: string | null;
  checkin_note?: string | null;
  actual_time?: string | null;
}
interface TripDay {
  id: number; day_number: number; date: string;
  weather: { summary: string; icon: string; temperature_high: number; temperature_low: number; rain_probability: number } | null;
  places: Activity[];
}
interface TripBudgetData {
  id: number; trip_id: number;
  food: string; transport: string; attraction: string;
  accommodation: string; other: string;
  total_estimated: string; total_actual?: string;
}
interface TripDetail {
  id: number; destination: string; start_date: string;
  duration_days: number; budget: number; num_people: number;
  budget_data?: TripBudgetData | null;
  status: string; days: TripDay[];
  user_notes: string | null; preferences: string[];
  cover_image_url?: string | null;
}
interface ChatMessage { role: 'user' | 'ai'; content: string; }

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

interface Expense {
  id: number;
  amount: string;
  category: string;
  note: string | null;
  paid_by: string | null;
  expense_date: string;
  trip_place_id: number | null;
  place?: { id: number; title: string; place_type: string; place_name: string } | null;
}

interface ExpenseSummary {
  total: number;
  by_category: Record<string, number>;
  count: number;
}

interface PackingItem { name: string; quantity: string; essential: boolean; note?: string; }
interface PackingCategory { name: string; emoji: string; items: PackingItem[]; }
interface PackingListData { categories: PackingCategory[]; tips: string[]; }

interface Props {
  trip: TripDetail;
  onBack: () => void;
  onActivityUpdated: (dayId: number, updated: Activity) => void;
  onActivityDeleted: (dayId: number, placeId: number) => void;
  onActivityAdded: (dayId: number, newPlace: Activity) => void;
}

/* ─── Constants ─────────────────────────────────────────────────────── */
const WEATHER_ICONS: Record<string, string> = {
  '01d': '☀️', '01n': '🌙', '02d': '⛅', '02n': '🌙',
  '03d': '☁️', '03n': '☁️', '04d': '☁️', '04n': '☁️',
  '09d': '🌧️', '09n': '🌧️', '10d': '🌦️', '10n': '🌧️',
  '11d': '⛈️', '11n': '⛈️', '13d': '❄️', '13n': '❄️', '50d': '🌫️', '50n': '🌫️',
};
const TYPE_ICONS: Record<string, string> = {
  food: '🍽', cafe: '☕', attraction: '🏛', hotel: '🏨',
  transport: '🚗', nightlife: '🌙', shopping: '🛍', other: '📍',
};
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
const EXPENSE_CATEGORIES: Record<string, { label: string; emoji: string; color: string }> = {
  food:          { label: 'Ẩm thực',   emoji: '🍜', color: '#f97316' },
  transport:     { label: 'Di chuyển',  emoji: '🚗', color: '#6b7280' },
  attraction:    { label: 'Tham quan',  emoji: '🏛️', color: '#3b82f6' },
  accommodation: { label: 'Lưu trú',   emoji: '🏨', color: '#10b981' },
  shopping:      { label: 'Mua sắm',   emoji: '🛍️', color: '#eab308' },
  other:         { label: 'Khác',       emoji: '📦', color: '#94a3b8' },
};

const CHAT_LIMIT = 50;

const D = {
  bg: '#f8fafc', surface: '#ffffff', surface2: '#f1f5f9',
  border: 'rgba(0,0,0,0.06)', border2: '#e2e8f0',
  text: '#1e293b', textMuted: '#64748b', textDim: '#94a3b8',
  accent: '#4f6ef7', accentBg: 'rgba(79,110,247,0.08)',
};

/* ─── Helpers ────────────────────────────────────────────────────────── */
function formatShortDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function formatFullDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  return `${days[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}`;
}

function formatCheckinTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatTripDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });
}

/* ─── Add Expense Modal ──────────────────────────────────────────────── */
const EMPTY_FORM = { amount: '', category: 'food', note: '', paid_by: '', expense_date: '' };

function AddExpenseModal({
  tripId, defaultDate, editItem, placeId,
  onSaved, onClose,
}: {
  tripId: number;
  defaultDate?: string;
  editItem?: Expense | null;
  placeId?: number | null;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    expense_date: defaultDate || new Date().toISOString().split('T')[0],
    ...(editItem ? {
      amount: String(Number(editItem.amount)),
      category: editItem.category,
      note: editItem.note ?? '',
      paid_by: editItem.paid_by ?? '',
      expense_date: editItem.expense_date,
    } : {}),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      setError('Vui lòng nhập số tiền hợp lệ.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        amount: Number(form.amount),
        category: form.category,
        note: form.note || null,
        paid_by: form.paid_by || null,
        expense_date: form.expense_date,
        trip_place_id: editItem ? editItem.trip_place_id : (placeId ?? null),
      };
      if (editItem) {
        await api.put(`/trips/${tripId}/expenses/${editItem.id}`, payload);
      } else {
        await api.post(`/trips/${tripId}/expenses`, payload);
      }
      onSaved();
    } catch {
      setError('Không thể lưu. Vui lòng thử lại.');
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }} onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} />
      <div style={{ position: 'relative', background: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 'env(safe-area-inset-bottom, 20px)', maxHeight: '90dvh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: '#e2e8f0' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 16px' }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1e293b', margin: 0 }}>{editItem ? '✏️ Sửa chi phí' : 'Thêm chi phí'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 22, lineHeight: 1, padding: 4 }}>✕</button>
        </div>
        <div style={{ padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={lbSt}>Số tiền</label>
            <div style={{ position: 'relative' }}>
              <input type="number" placeholder="0" value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                style={{ ...inSt, fontSize: 20, fontWeight: 700, paddingRight: 48 }} />
              <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>₫</span>
            </div>
          </div>
          <div>
            <label style={lbSt}>Danh mục</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {Object.entries(EXPENSE_CATEGORIES).map(([key, cat]) => (
                <button key={key} onClick={() => setForm(f => ({ ...f, category: key }))}
                  style={{ padding: '10px 6px', borderRadius: 12, border: form.category === key ? `1.5px solid ${D.accent}` : '1px solid #e2e8f0', background: form.category === key ? D.accentBg : '#f8fafc', color: form.category === key ? '#4f6ef7' : '#64748b', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 20 }}>{cat.emoji}</span>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={lbSt}>Người trả</label>
            <input type="text" placeholder="Tên người trả (không bắt buộc)" value={form.paid_by}
              onChange={e => setForm(f => ({ ...f, paid_by: e.target.value }))} style={inSt} />
          </div>
          <div>
            <label style={lbSt}>Ngày</label>
            <input type="date" value={form.expense_date}
              onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))}
              style={{ ...inSt, colorScheme: 'light' }} />
          </div>
          <div>
            <label style={lbSt}>Ghi chú</label>
            <textarea placeholder="Ghi chú thêm (không bắt buộc)" value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))} rows={2}
              style={{ ...inSt, resize: 'none', lineHeight: 1.5 }} />
          </div>
          {error && <p style={{ fontSize: 13, color: '#f87171', margin: 0 }}>{error}</p>}
          <button onClick={handleSave} disabled={saving}
            style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: saving ? '#e2e8f0' : D.accent, color: saving ? '#94a3b8' : '#fff', fontSize: 15, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Đang lưu…' : editItem ? 'Lưu thay đổi' : 'Lưu chi phí'}
          </button>
        </div>
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CheckinModalLazy(props: any) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const CheckinModal = require('./CheckinModal').default;
  return <CheckinModal {...props} />;
}

/* ─── Plan Activity Row (collapsed → expanded on tap) ───────────────── */
function PlanActivityRow({
  activity, isLast, isNext, isCompleted,
  tripId, dayId, dayDate, totalExpense,
  onUpdated, onDeleted, onExpenseAdded, onViewJournal,
}: {
  activity: Activity; isLast: boolean; isNext: boolean; isCompleted: boolean;
  tripId: number; dayId: number; dayDate: string;
  totalExpense: number;
  onUpdated: (a: Activity) => void;
  onDeleted: () => void;
  onExpenseAdded: () => void;
  onViewJournal: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { url: imgUrl, fallbackColor } = useUnsplashImage(activity.place_type, activity.title);
  const typeColor = TYPE_COLORS[activity.place_type] || '#94a3b8';
  const typeLabel = TYPE_LABELS[activity.place_type] || 'Khác';
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.place_name)}`;
  const hasTickets = ['attraction', 'nightlife'].includes(activity.place_type);

  // Truncate description to ~50 chars
  const shortDesc = activity.description
    ? activity.description.length > 52
      ? activity.description.slice(0, 50) + '…'
      : activity.description
    : '';

  const handleDelete = async () => {
    if (!activity.id) return;
    setDeleting(true);
    try {
      await api.delete(`/trips/${tripId}/days/${dayId}/places/${activity.id}`);
      onDeleted();
    } catch { setDeleting(false); setConfirmDelete(false); }
  };

  const dotBg     = isCompleted ? '#10b981' : isNext ? '#4f6ef7' : '#e2e8f0';
  const dotBorder = isCompleted ? '#10b981' : isNext ? '#4f6ef7' : '#cbd5e1';

  return (
    <>
      <div style={{ display: 'flex', gap: 0, marginBottom: 2 }}>
        {/* ── Timeline rail ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 36, flexShrink: 0 }}>
          <div style={{
            width: 14, height: 14, borderRadius: '50%',
            background: dotBg, border: `2px solid ${dotBorder}`,
            boxShadow: isNext ? '0 0 0 4px rgba(79,110,247,0.15)' : 'none',
            flexShrink: 0, zIndex: 1, marginTop: 20,
          }} />
          {!isLast && <div style={{ width: 2, flex: 1, minHeight: 20, background: '#e2e8f0', margin: '4px 0' }} />}
        </div>

        {/* ── Content ── */}
        <div style={{ flex: 1, paddingBottom: isLast ? 0 : 16 }}>
          {/* Time */}
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6, letterSpacing: 0.2 }}>
            {activity.actual_time ?? activity.time}
          </div>

          {/* Card */}
          <div
            onClick={() => setExpanded(v => !v)}
            style={{
              background: '#fff',
              borderRadius: 14,
              border: expanded
                ? '1.5px solid #4f6ef7'
                : isNext
                  ? '1.5px solid rgba(79,110,247,0.35)'
                  : '1px solid #e2e8f0',
              overflow: 'hidden',
              boxShadow: expanded
                ? '0 4px 20px rgba(79,110,247,0.12)'
                : '0 1px 4px rgba(0,0,0,0.05)',
              cursor: 'pointer',
              transition: 'box-shadow 0.15s, border-color 0.15s',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {/* ══ COLLAPSED VIEW ══ */}
            <div style={{ display: 'flex', gap: 0, alignItems: 'stretch' }}>
              {/* Thumbnail — chỉ render khi có ảnh */}
              <div style={{
                width: imgUrl ? 84 : 0,
                flexShrink: 0,
                position: 'relative',
                background: fallbackColor,
                overflow: 'hidden',
                display: imgUrl ? 'block' : 'none',
              }}>
                {imgUrl && (
                  <Image src={imgUrl} alt={activity.title} fill className="object-cover" sizes="84px" unoptimized style={{ objectFit: 'cover' }} />
                )}
                {/* checked-in overlay tick */}
                {isCompleted && imgUrl && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(16,185,129,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                  </div>
                )}
              </div>

              {/* Info */}
              <div style={{ flex: 1, padding: '10px 12px 10px', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, marginBottom: 3 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: 0, lineHeight: 1.3 }}>
                    {activity.title}
                  </h3>
                  {/* TIẾP THEO / đã đến badge — top right */}
                  {isCompleted ? (
                    <div style={{ flexShrink: 0, width: 26, height: 26, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                  ) : isNext ? (
                    <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, color: '#4f6ef7', background: 'rgba(79,110,247,0.1)', padding: '2px 7px', borderRadius: 99, whiteSpace: 'nowrap' }}>
                      TIẾP THEO
                    </span>
                  ) : null}
                </div>

                {/* Short description — ẩn khi đã expanded */}
                {shortDesc && !expanded && (
                  <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 6px', lineHeight: 1.5 }}>
                    {shortDesc}
                  </p>
                )}

                {/* Tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: typeColor, background: `${typeColor}12`, padding: '2px 8px', borderRadius: 99 }}>
                    {typeLabel}
                  </span>
                  {isCompleted && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: 99 }}>
                      Đã đến ✓
                    </span>
                  )}
                  {hasTickets && !isCompleted && (
                    <span style={{ fontSize: 11, color: '#818cf8', background: 'rgba(129,140,248,0.1)', padding: '2px 8px', borderRadius: 99 }}>
                      🎟 Đặt vé
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ══ EXPANDED DETAIL (ẩn khi chưa ấn) ══ */}
            {expanded && (
              <div
                onClick={e => e.stopPropagation()}
                style={{ borderTop: '1px solid #f1f5f9', padding: '12px 14px 14px' }}
              >
                {/* Full description */}
                {activity.description && (
                  <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 10px', lineHeight: 1.6 }}>
                    {activity.description}
                  </p>
                )}

                {/* Meta row */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12, fontSize: 12, color: '#94a3b8' }}>
                  {activity.estimated_cost > 0 && (
                    <span style={{ fontWeight: 700, color: '#10b981' }}>💰 {formatCurrency(activity.estimated_cost)}</span>
                  )}
                  {activity.duration_minutes > 0 && (
                    <span>⏱ {activity.duration_minutes >= 60
                      ? `${Math.floor(activity.duration_minutes / 60)}h${activity.duration_minutes % 60 > 0 ? activity.duration_minutes % 60 + 'm' : ''}`
                      : `${activity.duration_minutes}m`}
                    </span>
                  )}
                  {activity.place_name && (
                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#60a5fa', textDecoration: 'none', fontWeight: 500 }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      Chỉ đường
                    </a>
                  )}
                  {isNext && activity.transport_to_next && (
                    <span style={{ fontStyle: 'italic' }}>🚶 Trip AI gợi ý: {activity.transport_to_next}</span>
                  )}
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 8 }}>
                  {activity.id && (
                    isCompleted ? (
                      <button onClick={onViewJournal}
                        style={{ flex: 1, padding: '8px 0', borderRadius: 10, background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)', color: '#7c3aed', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        📔 Xem nhật ký
                      </button>
                    ) : (
                      <button onClick={() => setCheckinOpen(true)}
                        style={{ flex: 1, padding: '8px 0', borderRadius: 10, background: '#f0fdf4', border: '1px solid rgba(16,185,129,0.3)', color: '#059669', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        📍 Check-in
                      </button>
                    )
                  )}
                  <button onClick={() => setExpenseOpen(true)}
                    style={{ flex: 1, padding: '8px 0', borderRadius: 10, background: totalExpense > 0 ? 'rgba(16,185,129,0.08)' : '#f8fafc', border: totalExpense > 0 ? '1px solid rgba(16,185,129,0.2)' : '1px solid #e2e8f0', color: totalExpense > 0 ? '#10b981' : '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    {totalExpense > 0 ? `💸 ${formatCurrency(totalExpense)}` : '💸 Chi phí'}
                  </button>
                  <button onClick={() => setConfirmDelete(true)}
                    style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444', fontSize: 13, cursor: 'pointer' }}>
                    🗑
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Transport hint */}
          {!isLast && activity.transport_to_next && !expanded && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 4px 0' }}>
              <span style={{ fontSize: 11 }}>🚶</span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>
                {activity.transport_to_next}
                {activity.distance_to_next_km > 0 && ` · ${activity.distance_to_next_km} km`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirm */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setConfirmDelete(false)}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: 20, padding: '24px', maxWidth: 340, width: '100%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Xóa hoạt động?</h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>&ldquo;{activity.title}&rdquo; sẽ bị xóa khỏi lịch trình.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, padding: '12px', borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#1e293b', fontSize: 14, cursor: 'pointer' }}>Hủy</button>
              <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, padding: '12px', borderRadius: 12, background: '#dc2626', border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, cursor: deleting ? 'not-allowed' : 'pointer' }}>
                {deleting ? 'Đang xóa…' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {checkinOpen && activity.id && (
        <CheckinModalLazy
          tripId={tripId}
          place={{
            id: activity.id, title: activity.title, place_name: activity.place_name,
            place_type: activity.place_type, time: activity.time,
            checked_in_at: activity.checked_in_at,
            checkin_photo_url: activity.checkin_photo_url,
            checkin_note: activity.checkin_note,
            actual_time: activity.actual_time,
          }}
          onSaved={(updated: {
            checked_in_at?: string | null;
            checkin_photo_url?: string | null;
            checkin_note?: string | null;
            actual_time?: string | null;
          }) => { setCheckinOpen(false); onUpdated({ ...activity, ...updated } as Activity); }}
          onClose={() => setCheckinOpen(false)}
        />
      )}

      {expenseOpen && (
        <AddExpenseModal
          tripId={tripId}
          defaultDate={dayDate}
          placeId={activity.id ?? null}
          onSaved={() => { setExpenseOpen(false); onExpenseAdded(); }}
          onClose={() => setExpenseOpen(false)}
        />
      )}
    </>
  );
}

/* ─── Journal Tab ────────────────────────────────────────────────────── */
function JournalTab({ tripId }: { tripId: number }) {
  const [entries, setEntries] = useState<CheckinEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    api.get(`/trips/${tripId}/checkins`)
      .then(({ data }) => setEntries(data.checkins ?? []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [tripId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
        <div style={{ width: 28, height: 28, border: '2px solid #e2e8f0', borderTopColor: '#4f6ef7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: '#64748b' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📷</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Nhật ký trống</div>
        <div style={{ fontSize: 14, lineHeight: 1.7 }}>
          Check-in tại các địa điểm trong lịch trình<br />để tạo nhật ký ảnh của bạn.
        </div>
      </div>
    );
  }

  return (
    <>

      {/* Timeline entries */}
      {entries.map((entry, idx) => {
        const typeColor = TYPE_COLORS[entry.place_type] || '#94a3b8';
        const typeLabel = TYPE_LABELS[entry.place_type] || 'Khác';
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(entry.place_name)}`;
        return (
          <div key={entry.id} style={{ display: 'flex', gap: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 44, flexShrink: 0 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: `${typeColor}15`, border: `2px solid ${typeColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, zIndex: 1, boxShadow: '0 0 0 4px #f8fafc' }}>✅</div>
              {idx < entries.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 24, background: `${typeColor}25`, margin: '4px 0' }} />}
            </div>
            <div style={{ flex: 1, marginBottom: idx < entries.length - 1 ? 20 : 0, paddingLeft: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.3, color: typeColor, background: `${typeColor}15`, padding: '3px 9px', borderRadius: 99 }}>{typeLabel}</span>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>
                  {entry.actual_time
                    ? <><span style={{ textDecoration: 'line-through', marginRight: 4, opacity: 0.5 }}>{entry.time}</span>{entry.actual_time}</>
                    : entry.time}
                </span>
                <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 'auto' }}>{formatCheckinTime(entry.checked_in_at)}</span>
              </div>
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                {entry.checkin_photo_url && (
                  <div onClick={() => setLightbox(entry.checkin_photo_url!)} style={{ position: 'relative', width: '100%', height: 200, cursor: 'zoom-in', overflow: 'hidden', background: '#f1f5f9' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={entry.checkin_photo_url} alt={entry.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.25) 0%, transparent 50%)' }} />
                  </div>
                )}
                <div style={{ padding: '12px 14px 14px' }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>{entry.title}</h3>
                  {entry.place_name && (
                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#60a5fa', textDecoration: 'none', marginBottom: 8 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      {entry.place_name}
                    </a>
                  )}
                  {entry.checkin_note && (
                    <div style={{ marginTop: 4, padding: '10px 12px', background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 10, fontSize: 13, color: '#1e293b', lineHeight: 1.65 }}>
                      <span style={{ fontSize: 14, marginRight: 6 }}>💬</span>{entry.checkin_note}
                    </div>
                  )}
                  {!entry.checkin_note && !entry.checkin_photo_url && (
                    <div style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>Chưa có ghi chú hay ảnh.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, cursor: 'zoom-out' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="Ảnh check-in" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: 12 }} />
          <button onClick={() => setLightbox(null)} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
      )}
    </>
  );
}

/* ─── Expenses Tab ───────────────────────────────────────────────────── */
function ExpensesTab({ tripId, tripBudget }: { tripId: number; tripBudget: number }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState('all');
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      const { data } = await api.get(`/trips/${tripId}/expenses`);
      setExpenses(data.expenses ?? []);
      setSummary(data.summary ?? null);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [tripId]); // eslint-disable-line

  const handleDelete = async (expId: number) => {
    setDeleting(expId);
    try {
      await api.delete(`/trips/${tripId}/expenses/${expId}`);
      await fetchData();
    } catch { /* ignore */ }
    finally { setDeleting(null); }
  };

  const filtered = filterCat === 'all' ? expenses : expenses.filter(e => e.category === filterCat);
  const grouped = filtered.reduce<Record<string, Expense[]>>((acc, exp) => {
    if (!acc[exp.expense_date]) acc[exp.expense_date] = [];
    acc[exp.expense_date].push(exp);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  // Budget comparison
  const totalSpent = summary?.total ?? 0;
  const budgetSet = tripBudget > 0;
  const overBudget = budgetSet && totalSpent > tripBudget;
  const budgetPct = budgetSet && tripBudget > 0 ? Math.min((totalSpent / tripBudget) * 100, 100) : 0;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
        <div style={{ width: 28, height: 28, border: '2px solid #e2e8f0', borderTopColor: '#4f6ef7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <>
      {/* Budget vs actual card */}
      {budgetSet && (
        <div style={{ background: '#fff', border: `1px solid ${overBudget ? 'rgba(239,68,68,0.25)' : '#e2e8f0'}`, borderRadius: 16, padding: '16px 18px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Ngân sách</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#1e293b' }}>{formatCurrency(tripBudget)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Đã chi</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: overBudget ? '#ef4444' : '#10b981' }}>{formatCurrency(totalSpent)}</div>
            </div>
          </div>
          {/* Progress bar */}
          <div style={{ height: 8, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
            <div style={{ height: '100%', width: `${budgetPct}%`, background: overBudget ? 'linear-gradient(90deg,#ef4444,#f87171)' : budgetPct > 80 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#10b981,#34d399)', borderRadius: 99, transition: 'width 0.4s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: '#94a3b8' }}>{Math.round(budgetPct)}% đã dùng</span>
            {overBudget
              ? <span style={{ color: '#ef4444', fontWeight: 600 }}>⚠️ Vượt {formatCurrency(totalSpent - tripBudget)}</span>
              : <span style={{ color: '#10b981', fontWeight: 600 }}>Còn lại {formatCurrency(tripBudget - totalSpent)}</span>
            }
          </div>
        </div>
      )}

      {/* Category filter */}
      <div className="m-scroll" style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 16, paddingBottom: 2, scrollbarWidth: 'none' }}>
        <button onClick={() => setFilterCat('all')} style={{ flexShrink: 0, padding: '6px 14px', borderRadius: 99, border: `1px solid ${filterCat === 'all' ? '#4f6ef7' : '#e2e8f0'}`, background: filterCat === 'all' ? 'rgba(79,110,247,0.08)' : '#fff', color: filterCat === 'all' ? '#4f6ef7' : '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          Tất cả ({expenses.length})
        </button>
        {Object.entries(EXPENSE_CATEGORIES).map(([key, cat]) => {
          const count = expenses.filter(e => e.category === key).length;
          if (!count) return null;
          const active = filterCat === key;
          return (
            <button key={key} onClick={() => setFilterCat(key)}
              style={{ flexShrink: 0, padding: '6px 14px', borderRadius: 99, border: `1px solid ${active ? cat.color : '#e2e8f0'}`, background: active ? `${cat.color}12` : '#fff', color: active ? cat.color : '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {cat.emoji} {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Add button */}
      <button onClick={() => { setEditItem(null); setAddOpen(true); }}
        style={{ width: '100%', padding: '12px', borderRadius: 14, border: '1.5px dashed rgba(16,185,129,0.4)', background: '#fff', color: '#10b981', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 16 }}>
        + Thêm chi phí
      </button>

      {/* List */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🧾</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>Chưa có chi phí nào</div>
          <div style={{ fontSize: 13 }}>Thêm chi phí thực tế trong chuyến đi.</div>
        </div>
      ) : sortedDates.map(date => {
        const dayTotal = grouped[date].reduce((s, e) => s + Number(e.amount), 0);
        const d = new Date(date);
        const dateLabel = d.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' });
        return (
          <div key={date} style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'capitalize' }}>{dateLabel}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>{formatCurrency(dayTotal)}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {grouped[date].map(exp => {
                const cat = EXPENSE_CATEGORIES[exp.category] ?? EXPENSE_CATEGORIES.other;
                return (
                  <div key={exp.id} onClick={() => { setEditItem(exp); setAddOpen(true); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '12px 14px', cursor: 'pointer', WebkitTapHighlightColor: 'transparent', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: `${cat.color}12`, border: `1px solid ${cat.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>{cat.emoji}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{exp.note || cat.label}</div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 2, fontSize: 12, color: '#94a3b8' }}>
                        {exp.paid_by && <span>👤 {exp.paid_by}</span>}
                      </div>
                    </div>
                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#1e293b' }}>{formatCurrency(Number(exp.amount))}</div>
                      <div style={{ fontSize: 11, color: cat.color, marginTop: 1 }}>{cat.label}</div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(exp.id); }}
                      disabled={deleting === exp.id}
                      style={{ flexShrink: 0, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8, color: '#ef4444', cursor: 'pointer', padding: '8px 10px', fontSize: 13, lineHeight: 1 }}>
                      {deleting === exp.id ? '…' : '🗑'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {addOpen && (
        <AddExpenseModal
          tripId={tripId}
          editItem={editItem}
          onSaved={() => { setAddOpen(false); setEditItem(null); fetchData(); }}
          onClose={() => { setAddOpen(false); setEditItem(null); }}
        />
      )}
    </>
  );
}

/* ─── Hero Banner ────────────────────────────────────────────────────── */
function HeroBanner({ destination, startDate, durationDays, coverImageUrl, onBack, onShare, shareCopied }: {
  destination: string; startDate: string; durationDays: number;
  coverImageUrl?: string | null;
  onBack: () => void; onShare: () => void; shareCopied: boolean;
}) {
  const { url: unsplashImg, fallbackColor } = useUnsplashImage('attraction', destination);
  const heroImg = coverImageUrl || unsplashImg;
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + durationDays - 1);
  const fmtRange = (s: string, e: Date) => {
    const sd = new Date(s);
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${sd.toLocaleDateString('vi-VN', opts)} — ${e.toLocaleDateString('vi-VN', { ...opts, year: 'numeric' })}`;
  };

  return (
    <div style={{ position: 'relative', height: 260, overflow: 'hidden', flexShrink: 0, background: fallbackColor }}>
      {heroImg && (
        <Image src={heroImg} alt={destination} fill className="object-cover" sizes="100vw" unoptimized
          style={{ objectFit: 'cover' }} />
      )}
      {/* Gradient overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.1) 40%, rgba(13,17,23,0.92) 100%)' }} />

      {/* Top bar: back + share */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
        <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
          ←
        </button>
        <button onClick={onShare} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', border: 'none', color: shareCopied ? '#34d399' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {shareCopied ? (
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          ) : (
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" /></svg>
          )}
        </button>
      </div>

      {/* Bottom text */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 16px 20px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(79,110,247,0.85)', backdropFilter: 'blur(6px)', borderRadius: 20, padding: '4px 12px', marginBottom: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: 0.5 }}>Đang diễn ra</span>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff', margin: '0 0 6px', letterSpacing: '-0.5px', lineHeight: 1.15 }}>{destination}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" /></svg>
          <span>{fmtRange(startDate, endDate)}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Budget Bar ─────────────────────────────────────────────────────── */
function BudgetBar({ spent, total }: { spent: number; total: number }) {
  if (total <= 0) return null;
  const pct = Math.min((spent / total) * 100, 100);
  const over = spent > total;
  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: '14px 16px', margin: '0 16px 4px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8 }}>Ngân sách</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: over ? '#ef4444' : '#1e293b' }}>
          {formatCurrency(spent)} / {formatCurrency(total)}
        </span>
      </div>
      <div style={{ height: 8, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: over ? 'linear-gradient(90deg,#ef4444,#f87171)' : 'linear-gradient(90deg,#4f6ef7,#818cf8)', borderRadius: 99, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────── */
type MainTab = 'overview' | 'plan' | 'map' | 'journal' | 'expenses' | 'notes';

export default function MobileTripDetail({ trip, onBack, onActivityUpdated, onActivityDeleted, onActivityAdded }: Props) {
  const [localDays, setLocalDays] = useState<TripDay[]>(trip.days);
  const [activeTab, setActiveTab] = useState<MainTab>('plan');
  const [activeDay, setActiveDay] = useState<number>(trip.days[0]?.day_number ?? 1);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatCount, setChatCount] = useState(0);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // Notes & packing
  const [notes, setNotes] = useState(trip.user_notes ?? '');
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [packingData, setPackingData] = useState<PackingListData | null>(null);
  const [packingLoading, setPackingLoading] = useState(false);
  const [packingLoaded, setPackingLoaded] = useState(false);
  const [packingChecked, setPackingChecked] = useState<Set<string>>(new Set());

  // place_id → tổng chi phí thực tế đã ghi nhận
  const [placeExpenses, setPlaceExpenses] = useState<Record<number, number>>({});

  const currentDay = trip.days.find(d => d.day_number === activeDay);
  const allPlaces = trip.days.flatMap(d => d.places.map(p => ({ ...p, day: d.day_number })));
  const [activePlace, setActivePlace] = useState<Activity | null>(null);

  const tripBudget = Number(trip.budget) || 0;
  const totalEstimated = Number(trip.budget_data?.total_estimated) || 0;
  const budgetDisplay = totalEstimated > 0 ? totalEstimated : tripBudget;

  // Fetch expenses để build map place_id → total
  const fetchPlaceExpenses = useCallback(async () => {
    try {
      const { data } = await api.get(`/trips/${trip.id}/expenses`);
      const expenses: Expense[] = data.expenses ?? [];
      const map: Record<number, number> = {};
      for (const exp of expenses) {
        if (exp.trip_place_id != null) {
          map[exp.trip_place_id] = (map[exp.trip_place_id] ?? 0) + Number(exp.amount);
        }
      }
      setPlaceExpenses(map);
    } catch { /* ignore */ }
  }, [trip.id]);

  useEffect(() => { fetchPlaceExpenses(); }, [fetchPlaceExpenses]);

  const handleNotesChange = (val: string) => {
    setNotes(val); setNotesSaved(false);
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(async () => {
      setNotesSaving(true);
      try { await api.put(`/trips/${trip.id}/notes`, { notes: val }); setNotesSaved(true); setTimeout(() => setNotesSaved(false), 2000); }
      catch { /* ignore */ } finally { setNotesSaving(false); }
    }, 1500);
  };

  const loadPacking = () => {
    if (packingLoaded || packingLoading) return;
    setPackingLoading(true);
    api.get(`/trips/${trip.id}/packing-list`)
      .then(({ data }) => setPackingData(data.packing_list))
      .catch(() => setPackingData(null))
      .finally(() => { setPackingLoading(false); setPackingLoaded(true); });
  };

  const togglePackingItem = (key: string) => {
    setPackingChecked(prev => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; });
  };

  const handleShare = async () => {
    try {
      const { data } = await api.post(`/trips/${trip.id}/share`);
      if (data.share_url) {
        await navigator.clipboard.writeText(data.share_url).catch(() => {});
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 3000);
      }
    } catch { /* ignore */ }
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading || chatCount >= CHAT_LIMIT) return;
    const msg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: msg }]);
    setChatLoading(true);
    try {
      const { data } = await api.post(`/trips/${trip.id}/chat`, { message: msg });
      setChatMessages(prev => [...prev, { role: 'ai', content: data.message }]);
      setChatCount(data.chat_count || chatCount + 1);
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setChatMessages(prev => [...prev, { role: 'ai', content: status === 429 ? 'Đã đạt giới hạn chỉnh sửa.' : 'Đã có lỗi xảy ra.' }]);
    } finally { setChatLoading(false); }
  };

  const TABS: { key: MainTab; label: string }[] = [
    { key: 'overview', label: 'Tổng quan' },
    { key: 'plan',     label: 'Kế hoạch' },
    { key: 'map',      label: 'Bản đồ' },
    { key: 'journal',  label: 'Nhật ký' },
    { key: 'expenses', label: 'Chi phí' },
    { key: 'notes',    label: 'Ghi chú' },
  ];

  // Find "next" activity (first unchecked-in)
  const nextActivityIdx = currentDay?.places.findIndex(p => !p.checked_in_at) ?? -1;

  void localDays; // used internally

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#f1f5f9', fontFamily: 'Inter, system-ui, sans-serif', overflowX: 'hidden' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .m-scroll::-webkit-scrollbar { display: none; }
        .m-list::-webkit-scrollbar { width: 2px; }
        .m-list::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); border-radius: 99px; }
      `}</style>

      {/* Scrollable area */}
      <div className="m-list" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* ══ HERO BANNER ══════════════════════════════════════════════ */}
        <HeroBanner
          destination={trip.destination}
          startDate={trip.start_date}
          durationDays={trip.duration_days}
          coverImageUrl={trip.cover_image_url}
          onBack={onBack}
          onShare={handleShare}
          shareCopied={shareCopied}
        />

        {/* ══ BUDGET BAR ═══════════════════════════════════════════════ */}
        <div style={{ background: '#0d1117', paddingBottom: 0 }}>
          <BudgetBar
            spent={Object.values(placeExpenses).reduce((a, b) => a + b, 0)}
            total={budgetDisplay}
          />
        </div>

        {/* ══ TAB BAR ══════════════════════════════════════════════════ */}
        <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 30 }}>
          <div className="m-scroll" style={{ display: 'flex', overflowX: 'auto', scrollbarWidth: 'none', padding: '0 16px' }}>
            {TABS.map(tab => {
              const active = activeTab === tab.key;
              return (
                <button key={tab.key}
                  onClick={() => { setActiveTab(tab.key); if (tab.key === 'notes') loadPacking(); }}
                  style={{ flexShrink: 0, padding: '13px 14px', fontSize: 13, fontWeight: active ? 700 : 500, border: 'none', background: 'transparent', cursor: 'pointer', color: active ? '#4f6ef7' : '#64748b', borderBottom: active ? '2.5px solid #4f6ef7' : '2.5px solid transparent', whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ══ TAB CONTENT ══════════════════════════════════════════════ */}

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <div style={{ flex: 1, padding: '16px 16px 100px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Meta chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {[
                { icon: '📅', label: formatTripDate(trip.start_date) },
                { icon: '🗓', label: `${trip.duration_days} ngày` },
                { icon: '👥', label: `${trip.num_people} người` },
                { icon: '💰', label: formatCurrency(tripBudget) },
              ].map((chip, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', borderRadius: 20, padding: '7px 14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <span style={{ fontSize: 14 }}>{chip.icon}</span>
                  <span style={{ fontSize: 13, color: '#1e293b', fontWeight: 500 }}>{chip.label}</span>
                </div>
              ))}
              {totalEstimated > 0 && totalEstimated !== tripBudget && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: totalEstimated > tripBudget ? 'rgba(248,113,113,0.1)' : 'rgba(52,211,153,0.1)', borderRadius: 20, padding: '7px 14px', border: `1px solid ${totalEstimated > tripBudget ? 'rgba(248,113,113,0.3)' : 'rgba(52,211,153,0.3)'}` }}>
                  <span style={{ fontSize: 13, color: totalEstimated > tripBudget ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                    {totalEstimated > tripBudget ? '⚠️' : '✓'} {formatCurrency(totalEstimated)} dự kiến
                  </span>
                </div>
              )}
            </div>

            {/* Day overview cards */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>Tổng quan từng ngày</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {trip.days.map(day => {
                  const dayCost = day.places.reduce((s, p) => s + (Number(p.estimated_cost) || 0), 0);
                  return (
                    <button key={day.id} onClick={() => { setActiveDay(day.day_number); setActiveTab('plan'); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '12px 14px', cursor: 'pointer', textAlign: 'left', width: '100%', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                      <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(79,110,247,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#4f6ef7', flexShrink: 0 }}>
                        {day.day_number}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{formatFullDate(day.date)}</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{day.places.length} địa điểm{dayCost > 0 ? ` · ${formatCurrency(dayCost)}` : ''}</div>
                      </div>
                      {day.weather && (
                        <div style={{ flexShrink: 0, textAlign: 'right' }}>
                          <div style={{ fontSize: 20 }}>{WEATHER_ICONS[day.weather.icon] || '🌤️'}</div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>{Math.round(day.weather.temperature_high)}°</div>
                        </div>
                      )}
                      <span style={{ fontSize: 16, color: '#cbd5e1', flexShrink: 0 }}>›</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action pills */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={handleShare}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: '8px 16px', fontSize: 13, color: shareCopied ? '#10b981' : '#64748b', cursor: 'pointer', fontWeight: 500 }}>
                🔗 {shareCopied ? 'Đã sao chép' : 'Chia sẻ'}
              </button>
              <button onClick={() => api.post(`/trips/${trip.id}/favorites`).catch(() => {})}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(79,110,247,0.08)', border: 'none', borderRadius: 20, padding: '8px 16px', fontSize: 13, color: '#4f6ef7', cursor: 'pointer', fontWeight: 600 }}>
                🔖 Lưu lịch trình
              </button>
            </div>
          </div>
        )}

        {/* ── PLAN TAB ── */}
        {activeTab === 'plan' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Day selector tabs */}
            <div className="m-scroll" style={{ display: 'flex', gap: 6, padding: '12px 16px', overflowX: 'auto', flexShrink: 0, background: '#f8fafc', borderBottom: '1px solid #e2e8f0', scrollbarWidth: 'none' }}>
              {trip.days.map(day => {
                const isActive = day.day_number === activeDay;
                const shortDate = formatShortDate(day.date);
                return (
                  <button key={day.id} onClick={() => setActiveDay(day.day_number)}
                    style={{ flexShrink: 0, padding: '7px 16px', borderRadius: 22, border: isActive ? 'none' : '1px solid #e2e8f0', background: isActive ? '#4f6ef7' : '#fff', color: isActive ? '#fff' : '#64748b', fontSize: 13, fontWeight: isActive ? 700 : 500, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: isActive ? '0 2px 8px rgba(79,110,247,0.35)' : 'none' }}>
                    {shortDate || `Ngày ${day.day_number}`}
                    {day.weather && <span style={{ marginLeft: 5, opacity: 0.85 }}>{WEATHER_ICONS[day.weather.icon] || '🌤️'}</span>}
                  </button>
                );
              })}
            </div>

            {/* Day header */}
            {currentDay && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 8px', background: '#fff', borderBottom: '1px solid #f1f5f9' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>
                    Day {currentDay.day_number}
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b' }}>{formatFullDate(currentDay.date)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {currentDay.weather?.rain_probability != null && currentDay.weather.rain_probability >= 0.5 && (
                    <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>⚠️ Có mưa</span>
                  )}
                  {currentDay.weather && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 20 }}>{WEATHER_ICONS[currentDay.weather.icon] || '🌤️'}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{Math.round(currentDay.weather.temperature_high)}°</span>
                    </div>
                  )}
                  <button
                    onClick={() => setAddOpen(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#4f6ef7', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 700, padding: 0 }}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    Chỉnh sửa
                  </button>
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="m-list" style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 120px', background: '#f8fafc' }}>
              {currentDay?.places.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8', fontSize: 14 }}>Ngày này chưa có hoạt động nào.</div>
              )}
              {currentDay?.places.map((place, i) => {
                const isNext = i === nextActivityIdx;
                const isCompleted = !!place.checked_in_at;
                const isLast = i === currentDay.places.length - 1;
                return (
                  <PlanActivityRow
                    key={place.id ?? i}
                    activity={place}
                    isLast={isLast}
                    isNext={isNext}
                    isCompleted={isCompleted}
                    tripId={trip.id}
                    dayId={currentDay.id}
                    dayDate={currentDay.date}
                    totalExpense={place.id ? (placeExpenses[place.id] ?? 0) : 0}
                    onUpdated={updated => onActivityUpdated(currentDay.id, updated)}
                    onDeleted={() => place.id && onActivityDeleted(currentDay.id, place.id)}
                    onExpenseAdded={fetchPlaceExpenses}
                    onViewJournal={() => setActiveTab('journal')}
                  />
                );
              })}

              {/* Add activity */}
              <button onClick={() => setAddOpen(true)}
                style={{ width: '100%', padding: '13px', marginTop: 8, borderRadius: 14, border: '1.5px dashed #cbd5e1', background: '#fff', color: '#94a3b8', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <span style={{ fontSize: 16 }}>+</span> Thêm hoạt động
              </button>
            </div>
          </div>
        )}

        {/* ── MAP TAB ── */}
        {activeTab === 'map' && (
          <div style={{ flex: 1, minHeight: 0, height: 'calc(100dvh - 320px)' }}>
            <TripMap
              places={allPlaces} days={trip.days}
              activePlace={activePlace} activeDayNumber={activeDay}
              onMarkerClick={place => {
                const match = allPlaces.find(p => p.title === place.title && p.time === place.time);
                if (match) setActivePlace(match);
                if (place.day) setActiveDay(place.day);
              }}
            />
          </div>
        )}

        {/* ── JOURNAL TAB ── */}
        {activeTab === 'journal' && (
          <div className="m-list" style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 80px', background: '#f8fafc' }}>
            <JournalTab tripId={trip.id} />
          </div>
        )}

        {/* ── EXPENSES TAB ── */}
        {activeTab === 'expenses' && (
          <div className="m-list" style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 80px', background: '#f8fafc' }}>
            <ExpensesTab tripId={trip.id} tripBudget={tripBudget} />
          </div>
        )}

        {/* ── NOTES TAB ── */}
        {activeTab === 'notes' && (
          <div className="m-list" style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 80px', background: '#f8fafc' }}>
            {/* Ghi chú cá nhân */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>📝 Ghi chú cá nhân</span>
                <span style={{ fontSize: 12, color: notesSaving ? '#60a5fa' : notesSaved ? '#10b981' : 'transparent', transition: 'color 0.2s' }}>
                  {notesSaving ? 'Đang lưu…' : '✓ Đã lưu'}
                </span>
              </div>
              <textarea
                value={notes}
                onChange={e => handleNotesChange(e.target.value)}
                rows={5}
                placeholder="Ghi chú: đặt bàn trước, mang theo ô, đổi tiền ở đâu…"
                style={{ width: '100%', boxSizing: 'border-box', resize: 'none', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '12px 14px', fontSize: 14, color: '#1e293b', outline: 'none', lineHeight: 1.6, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
              />
            </div>

            {/* Danh sách đồ cần mang */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>🎒 Đồ cần mang</span>
              {packingData && (() => {
                const total = packingData.categories.reduce((s, c) => s + c.items.length, 0);
                return <span style={{ fontSize: 12, color: '#64748b' }}>{packingChecked.size}/{total} đã chuẩn bị</span>;
              })()}
            </div>

            {packingLoading && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '40px 0', color: '#64748b', fontSize: 13 }}>
                <div style={{ width: 18, height: 18, border: '2px solid #e2e8f0', borderTopColor: '#4f6ef7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Trip AI đang tạo danh sách…
              </div>
            )}

            {!packingLoading && !packingLoaded && (
              <button onClick={loadPacking}
                style={{ width: '100%', padding: '13px', borderRadius: 14, border: '1px dashed rgba(79,110,247,0.35)', background: 'rgba(79,110,247,0.06)', color: '#4f6ef7', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                ✨ Tạo danh sách bằng Trip AI
              </button>
            )}

            {!packingLoading && packingData && packingData.categories.map((cat, ci) => (
              <div key={ci} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>{cat.emoji} {cat.name}</div>
                {cat.items.map((item, ii) => {
                  const key = `${ci}-${item.name}`;
                  const isDone = packingChecked.has(key);
                  return (
                    <label key={ii} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, cursor: 'pointer', background: isDone ? 'rgba(16,185,129,0.06)' : '#fff', marginBottom: 4, border: `1px solid ${isDone ? 'rgba(16,185,129,0.2)' : '#e2e8f0'}` }}>
                      <input type="checkbox" checked={isDone} onChange={() => togglePackingItem(key)}
                        style={{ accentColor: '#10b981', width: 16, height: 16, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 14, color: isDone ? '#94a3b8' : '#1e293b', textDecoration: isDone ? 'line-through' : 'none' }}>
                        {item.name}
                        {item.quantity && item.quantity !== '1' && (
                          <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 6 }}>× {item.quantity}</span>
                        )}
                      </span>
                      {item.essential && !isDone && (
                        <span style={{ fontSize: 10, background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '2px 8px', borderRadius: 99, flexShrink: 0, fontWeight: 700 }}>Thiết yếu</span>
                      )}
                    </label>
                  );
                })}
              </div>
            ))}

            {/* Tips */}
            {!packingLoading && packingData?.tips && packingData.tips.length > 0 && (
              <div style={{ marginTop: 8, padding: '14px 16px', background: 'rgba(79,110,247,0.06)', border: '1px solid rgba(79,110,247,0.15)', borderRadius: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#4f6ef7', marginBottom: 10 }}>💡 Bí kíp chuyến đi</div>
                {packingData.tips.map((tip, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: i < packingData.tips.length - 1 ? 8 : 0 }}>
                    <span style={{ color: '#4f6ef7', flexShrink: 0, fontSize: 13 }}>·</span>
                    <span style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{tip}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══ FLOATING AI BUTTON ══════════════════════════════════════════ */}
      <button onClick={() => setChatOpen(true)}
        style={{ position: 'fixed', bottom: 24, right: 20, width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,#4f6ef7,#818cf8)', border: 'none', boxShadow: '0 4px 20px rgba(79,110,247,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
        <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
      </button>

      {/* ══ AI CHAT (bottom sheet) ═══════════════════════════════════════ */}
      {chatOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div onClick={() => setChatOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
          <div style={{ position: 'relative', background: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, height: '72dvh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 6px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 99, background: '#e2e8f0' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px 12px', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 5px #10b981' }} />
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>Trợ lý TripAI</span>
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{chatCount}/{CHAT_LIMIT} lượt chỉnh sửa</div>
              </div>
              <button onClick={() => setChatOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 22, padding: 4 }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {chatMessages.length === 0 && (
                <div style={{ textAlign: 'center', padding: '28px 0', color: '#94a3b8' }}>
                  <div style={{ fontSize: 30, marginBottom: 10 }}>✦</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>Hỏi Trip AI để chỉnh sửa lịch trình</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6, lineHeight: 1.7 }}>Ví dụ: &quot;Thêm quán cafe buổi sáng&quot;<br />&quot;Giảm chi phí ngày 2&quot;</div>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 8 }}>
                  {msg.role === 'ai' && <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(79,110,247,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0 }}>✦</div>}
                  <div style={{ maxWidth: '80%', padding: '10px 14px', borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: msg.role === 'user' ? '#4f6ef7' : '#f8fafc', fontSize: 14, color: msg.role === 'user' ? '#fff' : '#1e293b', lineHeight: 1.55 }}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(79,110,247,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>✦</div>
                  <div style={{ padding: '10px 14px', borderRadius: '16px 16px 16px 4px', background: '#f8fafc', fontSize: 14, color: '#94a3b8' }}>Đang suy nghĩ…</div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>
            <div style={{ padding: '10px 14px 24px', borderTop: '1px solid #f1f5f9' }}>
              {chatCount >= CHAT_LIMIT ? (
                <div style={{ fontSize: 12, color: '#f59e0b', textAlign: 'center', padding: '10px', background: 'rgba(245,158,11,0.08)', borderRadius: 10 }}>
                  Đã đạt giới hạn {CHAT_LIMIT} lượt chỉnh sửa.
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} placeholder="Nhập yêu cầu chỉnh sửa..." disabled={chatLoading}
                    style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '12px 14px', fontSize: 14, color: '#1e293b', outline: 'none' }} />
                  <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()}
                    style={{ width: 44, height: 44, borderRadius: 12, background: chatInput.trim() ? '#4f6ef7' : '#e2e8f0', border: 'none', color: chatInput.trim() ? '#fff' : '#94a3b8', cursor: chatInput.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>↑</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ ADD ACTIVITY MODAL ══════════════════════════════════════════ */}
      {addOpen && currentDay && (
        <AddActivityModalLazy
          tripId={trip.id}
          dayId={currentDay.id}
          onSaved={(newPlace: Activity) => { setAddOpen(false); onActivityAdded(currentDay.id, newPlace); }}
          onClose={() => setAddOpen(false)}
        />
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AddActivityModalLazy(props: any) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ActivityEditModal = require('./ActivityEditModal').default;
  return <ActivityEditModal {...props} />;
}

const lbSt: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: '#64748b',
  display: 'block', marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.5,
};
const inSt: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: '#f8fafc', border: '1px solid #e2e8f0',
  borderRadius: 10, padding: '11px 13px',
  fontSize: 14, color: '#1e293b', outline: 'none',
};
