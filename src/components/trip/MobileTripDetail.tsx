'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { formatCurrency } from '@/lib/utils';
import { useUnsplashImage } from '@/hooks/useUnsplashImage';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const TripMap = dynamic(() => import('./TripMap'), {
  ssr: false,
  loading: () => (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}>
      <MapSkeleton />
    </div>
  ),
});

/* ─── Design tokens ──────────────────────────────────────────────────── */
const T = {
  bg: '#f8fafc',
  surface: '#ffffff',
  surface2: '#f1f5f9',
  border: '#e2e8f0',
  borderLight: 'rgba(0,0,0,0.05)',
  text: '#0f172a',
  textSub: '#475569',
  textDim: '#94a3b8',
  accent: '#3b5bdb',       // blue - primary only
  accentBg: 'rgba(59,91,219,0.08)',
  success: '#0d9488',      // teal green
  successBg: 'rgba(13,148,136,0.08)',
  warning: '#d97706',
  warningBg: 'rgba(217,119,6,0.08)',
  danger: '#dc2626',
  dangerBg: 'rgba(220,38,38,0.06)',
  radius: {
    card: 16,
    btn: 12,
    pill: 999,
    sheet: 24,
  },
};

/* ─── Z-index scale ──────────────────────────────────────────────────── */
const Z = { tab: 30, mapSheet: 40, fab: 50, modal: 70, overlay: 80 };

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
  is_published?: boolean;
}
interface ChatMessage { role: 'user' | 'ai'; content: string; }
interface CheckinEntry {
  id: number; title: string; place_name: string; place_type: string;
  time: string; actual_time: string | null; checked_in_at: string;
  checkin_photo_url: string | null; checkin_note: string | null;
  latitude: number | null; longitude: number | null;
}
interface Expense {
  id: number; amount: string; category: string;
  note: string | null; paid_by: string | null;
  expense_date: string; trip_place_id: number | null;
  place?: { id: number; title: string; place_type: string; place_name: string } | null;
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
const TYPE_COLORS: Record<string, string> = {
  food: '#ea580c', cafe: '#7c3aed', attraction: '#1d4ed8',
  hotel: '#0f766e', transport: '#475569', nightlife: '#be185d',
  shopping: '#a16207', other: '#64748b',
};
const TYPE_LABELS: Record<string, string> = {
  food: 'Ẩm thực', cafe: 'Cà phê', attraction: 'Tham quan',
  hotel: 'Lưu trú', transport: 'Di chuyển', nightlife: 'Về đêm',
  shopping: 'Mua sắm', other: 'Khác',
};
const EXPENSE_CATEGORIES: Record<string, { label: string; emoji: string; color: string }> = {
  food:          { label: 'Ẩm thực',   emoji: '🍜', color: '#ea580c' },
  transport:     { label: 'Di chuyển',  emoji: '🚗', color: '#475569' },
  attraction:    { label: 'Tham quan',  emoji: '🏛️', color: '#1d4ed8' },
  accommodation: { label: 'Lưu trú',   emoji: '🏨', color: '#0f766e' },
  shopping:      { label: 'Mua sắm',   emoji: '🛍️', color: '#a16207' },
  other:         { label: 'Khác',       emoji: '📦', color: '#64748b' },
};
const BUDGET_CATEGORIES_CONFIG = [
  { key: 'food',          label: 'Ẩm thực',   emoji: '🍜', color: '#ea580c' },
  { key: 'transport',     label: 'Di chuyển',  emoji: '🚗', color: '#475569' },
  { key: 'attraction',    label: 'Tham quan',  emoji: '🏛️', color: '#1d4ed8' },
  { key: 'accommodation', label: 'Lưu trú',    emoji: '🏨', color: '#0f766e' },
  { key: 'other',         label: 'Khác',       emoji: '🛍️', color: '#64748b' },
];
const EXPENSE_TO_BUDGET: Record<string, string> = {
  food: 'food', transport: 'transport', attraction: 'attraction',
  accommodation: 'accommodation', shopping: 'other', other: 'other',
};
const CHAT_LIMIT = 50;
const ROLE_CONFIG = {
  owner:  { label: 'Chủ sở hữu',     color: '#d97706', bg: 'rgba(217,119,6,0.1)' },
  editor: { label: 'Biên tập viên',  color: '#0f766e', bg: 'rgba(15,118,110,0.1)' },
  viewer: { label: 'Người xem',      color: '#475569', bg: 'rgba(71,85,105,0.08)' },
};
const STATUS_CONFIG = {
  accepted: { label: 'Đã tham gia',     color: '#0f766e' },
  pending:  { label: 'Chờ chấp nhận',   color: '#d97706' },
  declined: { label: 'Đã từ chối',      color: '#dc2626' },
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
  return new Date(dateStr).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
function formatTripDate(dateStr: string) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });
}

/* ─── Skeleton helpers ───────────────────────────────────────────────── */
function Shimmer({ w, h, radius = 8 }: { w: string | number; h: number; radius?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius,
      background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s ease-in-out infinite',
    }} />
  );
}
function MapSkeleton() {
  return (
    <div style={{ width: '100%', height: '100%', background: '#e8edf2', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', justifyContent: 'center' }}>
      <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
      <span style={{ fontSize: 12, color: '#94a3b8' }}>Tải bản đồ...</span>
    </div>
  );
}
function ActivityCardSkeleton() {
  return (
    <div style={{ display: 'flex', gap: 0, marginBottom: 2 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 36, flexShrink: 0 }}>
        <Shimmer w={14} h={14} radius={99} />
        <div style={{ width: 2, flex: 1, minHeight: 20, background: '#e2e8f0', margin: '4px 0' }} />
      </div>
      <div style={{ flex: 1, paddingBottom: 16 }}>
        <Shimmer w={60} h={11} radius={6} />
        <div style={{ height: 8 }} />
        <div style={{ background: '#fff', borderRadius: T.radius.card, border: `1px solid ${T.border}`, padding: '12px', display: 'flex', gap: 10 }}>
          <Shimmer w={80} h={72} radius={10} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Shimmer w="70%" h={14} radius={6} />
            <Shimmer w="45%" h={11} radius={6} />
            <Shimmer w="30%" h={20} radius={99} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Shared form styles ─────────────────────────────────────────────── */
const lbSt: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: T.textSub,
  display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em',
};
const inSt: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: T.surface2, border: `1px solid ${T.border}`,
  borderRadius: T.radius.btn, padding: '11px 13px',
  fontSize: 14, color: T.text, outline: 'none',
  fontFamily: 'system-ui, -apple-system, sans-serif',
};

/* ─── Add Expense Modal ──────────────────────────────────────────────── */
const EMPTY_FORM = { amount: '', category: 'food', note: '', paid_by: '', expense_date: '' };
function AddExpenseModal({ tripId, defaultDate, editItem, placeId, onSaved, onClose }: {
  tripId: number; defaultDate?: string; editItem?: Expense | null;
  placeId?: number | null; onSaved: () => void; onClose: () => void;
}) {
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    expense_date: defaultDate || new Date().toISOString().split('T')[0],
    ...(editItem ? {
      amount: String(Number(editItem.amount)), category: editItem.category,
      note: editItem.note ?? '', paid_by: editItem.paid_by ?? '',
      expense_date: editItem.expense_date,
    } : {}),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      setError('Vui lòng nhập số tiền hợp lệ.'); return;
    }
    setSaving(true); setError('');
    try {
      const payload = {
        amount: Number(form.amount), category: form.category,
        note: form.note || null, paid_by: form.paid_by || null,
        expense_date: form.expense_date,
        trip_place_id: editItem ? editItem.trip_place_id : (placeId ?? null),
      };
      if (editItem) await api.put(`/trips/${tripId}/expenses/${editItem.id}`, payload);
      else await api.post(`/trips/${tripId}/expenses`, payload);
      onSaved();
    } catch { setError('Không thể lưu. Vui lòng thử lại.'); setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: Z.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 440, maxHeight: '90dvh', overflowY: 'auto', background: T.surface, borderRadius: T.radius.sheet, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 14px', borderBottom: `1px solid ${T.border}` }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{editItem ? 'Sửa chi phí' : 'Thêm chi phí'}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.textDim, cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 4 }}>✕</button>
        </div>
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={lbSt}>Số tiền</label>
            <div style={{ position: 'relative' }}>
              <input type="number" placeholder="0" value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                style={{ ...inSt, fontSize: 20, fontWeight: 700, paddingRight: 48 }} />
              <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: T.textDim, fontWeight: 600 }}>₫</span>
            </div>
          </div>
          <div>
            <label style={lbSt}>Danh mục</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {Object.entries(EXPENSE_CATEGORIES).map(([key, cat]) => (
                <button key={key} onClick={() => setForm(f => ({ ...f, category: key }))}
                  style={{ padding: '10px 6px', borderRadius: T.radius.btn, border: form.category === key ? `2px solid ${T.accent}` : `1px solid ${T.border}`, background: form.category === key ? T.accentBg : T.surface2, color: form.category === key ? T.accent : T.textSub, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, transition: 'all 0.12s' }}>
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
          {error && <p style={{ fontSize: 13, color: T.danger, margin: 0 }}>{error}</p>}
          <button onClick={handleSave} disabled={saving}
            style={{ width: '100%', padding: '14px', borderRadius: T.radius.btn, border: 'none', background: saving ? T.surface2 : T.accent, color: saving ? T.textDim : '#fff', fontSize: 15, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', transition: 'background 0.12s' }}>
            {saving ? 'Đang lưu...' : editItem ? 'Lưu thay đổi' : 'Lưu chi phí'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Lazy modals ────────────────────────────────────────────────────── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CheckinModalLazy(props: any) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const CheckinModal = require('./CheckinModal').default;
  return <CheckinModal {...props} />;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AddActivityModalLazy(props: any) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ActivityEditModal = require('./ActivityEditModal').default;
  return <ActivityEditModal {...props} />;
}

/* ─── PlanActivityRow ────────────────────────────────────────────────── */
function PlanActivityRow({
  activity, isLast, isNext, isCompleted,
  tripId, dayId, dayDate, totalExpense,
  onUpdated, onDeleted, onExpenseAdded, onViewJournal,
}: {
  activity: Activity; isLast: boolean; isNext: boolean; isCompleted: boolean;
  tripId: number; dayId: number; dayDate: string; totalExpense: number;
  onUpdated: (a: Activity) => void; onDeleted: () => void;
  onExpenseAdded: () => void; onViewJournal: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { url: imgUrl, fallbackColor } = useUnsplashImage(activity.place_type, activity.title);
  const typeColor = TYPE_COLORS[activity.place_type] || T.textDim;
  const typeLabel = TYPE_LABELS[activity.place_type] || 'Khác';
  const mapsUrl = `https://www.openstreetmap.org/search?query=${encodeURIComponent(activity.place_name)}`;
  const hasTickets = ['attraction', 'nightlife'].includes(activity.place_type);
  const shortDesc = activity.description?.length > 52
    ? activity.description.slice(0, 50) + '...'
    : (activity.description || '');

  // Left border color encodes status — no badge top-right
  const leftBorderColor = isCompleted ? T.success : isNext ? T.accent : 'transparent';
  const leftBorderWidth = (isCompleted || isNext) ? 3 : 0;

  const handleDelete = async () => {
    if (!activity.id) return;
    setDeleting(true);
    try {
      await api.delete(`/trips/${tripId}/days/${dayId}/places/${activity.id}`);
      onDeleted();
    } catch { setDeleting(false); setConfirmDelete(false); }
  };

  return (
    <>
      <div style={{ display: 'flex', gap: 0, marginBottom: 2 }}>
        {/* Timeline rail */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 32, flexShrink: 0 }}>
          <div style={{
            width: 12, height: 12, borderRadius: '50%', flexShrink: 0, zIndex: 1, marginTop: 22,
            background: isCompleted ? T.success : isNext ? T.accent : '#cbd5e1',
            boxShadow: isNext ? `0 0 0 3px ${T.accentBg}` : 'none',
          }} />
          {!isLast && <div style={{ width: 1.5, flex: 1, minHeight: 20, background: T.border, margin: '4px 0' }} />}
        </div>

        {/* Content */}
        <div style={{ flex: 1, paddingBottom: isLast ? 0 : 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.textDim, marginBottom: 5, letterSpacing: '0.04em', fontVariantNumeric: 'tabular-nums' }}>
            {activity.actual_time ?? activity.time}
          </div>

          <div
            onClick={() => setExpanded(v => !v)}
            style={{
              background: T.surface, borderRadius: T.radius.card,
              border: `1px solid ${expanded ? T.accent : T.border}`,
              borderLeft: `${leftBorderWidth}px solid ${leftBorderColor}`,
              overflow: 'hidden',
              boxShadow: expanded ? `0 4px 16px rgba(59,91,219,0.1)` : '0 1px 3px rgba(0,0,0,0.04)',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
              transition: 'border-color 0.12s, box-shadow 0.12s',
            }}
          >
            {/* Collapsed */}
            <div style={{ display: 'flex', alignItems: 'stretch', minHeight: 72 }}>
              {imgUrl && (
                <div style={{ width: 88, flexShrink: 0, position: 'relative', background: fallbackColor, overflow: 'hidden' }}>
                  <Image src={imgUrl} alt={activity.title} fill sizes="88px" unoptimized style={{ objectFit: 'cover' }} />
                  {isCompleted && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(13,148,136,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: T.success, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div style={{ flex: 1, padding: '11px 12px', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, marginBottom: 4 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0, lineHeight: 1.3, flex: 1, minWidth: 0 }}>
                    {activity.title}
                  </h3>
                  {isNext && !isCompleted && (
                    <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, color: T.accent, background: T.accentBg, padding: '2px 7px', borderRadius: T.radius.pill, whiteSpace: 'nowrap' }}>
                      Tiếp theo
                    </span>
                  )}
                </div>
                {shortDesc && !expanded && (
                  <p style={{ fontSize: 12, color: T.textSub, margin: '0 0 6px', lineHeight: 1.5 }}>{shortDesc}</p>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: typeColor, background: `${typeColor}14`, padding: '2px 8px', borderRadius: T.radius.pill }}>
                    {typeLabel}
                  </span>
                  {isCompleted && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: T.success, background: T.successBg, padding: '2px 8px', borderRadius: T.radius.pill }}>
                      Đã check-in
                    </span>
                  )}
                  {hasTickets && !isCompleted && (
                    <span style={{ fontSize: 11, color: '#6d28d9', background: 'rgba(109,40,217,0.08)', padding: '2px 8px', borderRadius: T.radius.pill }}>
                      Đặt vé
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Expanded */}
            {expanded && (
              <div onClick={e => e.stopPropagation()} style={{ borderTop: `1px solid ${T.surface2}`, padding: '12px 14px 14px' }}>
                {activity.description && (
                  <p style={{ fontSize: 13, color: T.textSub, margin: '0 0 10px', lineHeight: 1.65 }}>{activity.description}</p>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12, fontSize: 12, color: T.textDim }}>
                  {activity.estimated_cost > 0 && (
                    <span style={{ fontWeight: 700, color: T.success }}>
                      {formatCurrency(activity.estimated_cost)}
                    </span>
                  )}
                  {activity.duration_minutes > 0 && (
                    <span>{activity.duration_minutes >= 60
                      ? `${Math.floor(activity.duration_minutes / 60)}h${activity.duration_minutes % 60 > 0 ? activity.duration_minutes % 60 + 'm' : ''}`
                      : `${activity.duration_minutes}m`}
                    </span>
                  )}
                  {activity.place_name && (
                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      Chỉ đường
                    </a>
                  )}
                  {isNext && activity.transport_to_next && (
                    <span style={{ fontStyle: 'italic' }}>Gợi ý: {activity.transport_to_next}</span>
                  )}
                </div>
                {/* Action row - full height tap targets */}
                <div style={{ display: 'flex', gap: 8 }}>
                  {activity.id && (
                    isCompleted ? (
                      <button onClick={onViewJournal}
                        style={{ flex: 1, padding: '10px 0', borderRadius: T.radius.btn, background: 'rgba(109,40,217,0.07)', border: '1px solid rgba(109,40,217,0.18)', color: '#6d28d9', fontSize: 13, fontWeight: 600, cursor: 'pointer', minHeight: 44 }}>
                        Xem nhật ký
                      </button>
                    ) : (
                      <button onClick={() => setCheckinOpen(true)}
                        style={{ flex: 1, padding: '10px 0', borderRadius: T.radius.btn, background: T.successBg, border: `1px solid rgba(13,148,136,0.25)`, color: T.success, fontSize: 13, fontWeight: 600, cursor: 'pointer', minHeight: 44 }}>
                        Check-in
                      </button>
                    )
                  )}
                  <button onClick={() => setExpenseOpen(true)}
                    style={{ flex: 1, padding: '10px 0', borderRadius: T.radius.btn, background: totalExpense > 0 ? T.successBg : T.surface2, border: `1px solid ${totalExpense > 0 ? 'rgba(13,148,136,0.2)' : T.border}`, color: totalExpense > 0 ? T.success : T.textSub, fontSize: 13, fontWeight: 600, cursor: 'pointer', minHeight: 44 }}>
                    {totalExpense > 0 ? formatCurrency(totalExpense) : 'Chi phí'}
                  </button>
                  <button onClick={() => setConfirmDelete(true)}
                    style={{ padding: '10px 14px', borderRadius: T.radius.btn, background: T.dangerBg, border: `1px solid rgba(220,38,38,0.12)`, color: T.danger, fontSize: 13, cursor: 'pointer', minHeight: 44, lineHeight: 1 }}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Transport hint between cards */}
          {!isLast && activity.transport_to_next && !expanded && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 2px 0' }}>
              <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke={T.textDim} strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              <span style={{ fontSize: 11, color: T.textDim }}>
                {activity.transport_to_next}
                {activity.distance_to_next_km > 0 && ` · ${activity.distance_to_next_km} km`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirm sheet */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, zIndex: Z.modal, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setConfirmDelete(false)}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
          <div style={{ position: 'relative', background: T.surface, borderRadius: `${T.radius.sheet}px ${T.radius.sheet}px 0 0`, padding: '24px 20px 36px', width: '100%', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 36, height: 4, borderRadius: 99, background: T.border, margin: '0 auto 20px' }} />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 8 }}>Xoa hoat dong?</h3>
            <p style={{ fontSize: 13, color: T.textSub, marginBottom: 20 }}>&ldquo;{activity.title}&rdquo; se bi xoa khoi lich trinh.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, padding: '13px', borderRadius: T.radius.btn, background: T.surface2, border: `1px solid ${T.border}`, color: T.text, fontSize: 14, cursor: 'pointer', minHeight: 44 }}>Huy</button>
              <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, padding: '13px', borderRadius: T.radius.btn, background: T.danger, border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer', minHeight: 44 }}>
                {deleting ? 'Dang xoa...' : 'Xoa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {checkinOpen && activity.id && (
        <CheckinModalLazy tripId={tripId}
          place={{ id: activity.id, title: activity.title, place_name: activity.place_name, place_type: activity.place_type, time: activity.time, checked_in_at: activity.checked_in_at, checkin_photo_url: activity.checkin_photo_url, checkin_note: activity.checkin_note, actual_time: activity.actual_time }}
          onSaved={(updated: {
            checked_in_at?: string | null; checkin_photo_url?: string | null;
            checkin_note?: string | null; actual_time?: string | null;
            [key: string]: unknown;
          }) => {
            setCheckinOpen(false);
            onUpdated({ ...activity, ...updated } as Activity);
          }}
          onClose={() => setCheckinOpen(false)} />
      )}
      {expenseOpen && (
        <AddExpenseModal tripId={tripId} defaultDate={dayDate} placeId={activity.id ?? null}
          onSaved={() => { setExpenseOpen(false); onExpenseAdded(); }}
          onClose={() => setExpenseOpen(false)} />
      )}
    </>
  );
}

/* ─── Map Bottom Sheet (Option A: peek + expand) ─────────────────────── */
function MapBottomSheet({
  places, days, activeDay, activePlace,
  onMarkerClick, open, onToggle,
}: {
  places: (Activity & { day?: number })[];
  days: TripDay[];
  activeDay: number;
  activePlace: Activity | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onMarkerClick: (p: any) => void;
  open: boolean;
  onToggle: () => void;
}) {
  const handleRef = useRef<HTMLDivElement>(null);

  return (
    <div style={{
      position: 'relative',
      height: open ? 'calc(100dvh - 180px)' : 190,
      transition: 'height 0.28s cubic-bezier(0.4,0,0.2,1)',
      flexShrink: 0,
      overflow: 'hidden',
      borderRadius: open ? 0 : `0 0 0 0`,
    }}>
      {/* Map always mounted - no remount on toggle */}
      <TripMap
        places={places}
        days={days}
        activePlace={activePlace}
        activeDayNumber={activeDay}
        onMarkerClick={onMarkerClick}
      />

      {/* Handle bar - tap to toggle */}
      <div
        ref={handleRef}
        onClick={onToggle}
        style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: 36, cursor: 'pointer',
          background: 'linear-gradient(to bottom, rgba(248,250,252,0.92) 0%, rgba(248,250,252,0) 100%)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          paddingTop: 8, zIndex: 10,
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(0,0,0,0.18)' }} />
      </div>

      {/* Map label pill - visible when peeked */}
      {!open && (
        <div style={{
          position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
          borderRadius: T.radius.pill, padding: '6px 14px',
          display: 'flex', alignItems: 'center', gap: 6,
          boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
          zIndex: 10, cursor: 'pointer', border: `1px solid ${T.border}`,
        }} onClick={onToggle}>
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke={T.accent} strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <span style={{ fontSize: 12, fontWeight: 700, color: T.accent }}>Mo ban do</span>
          <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke={T.textDim} strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
        </div>
      )}

      {/* Close button when expanded */}
      {open && (
        <button onClick={onToggle} style={{
          position: 'absolute', top: 10, right: 12,
          width: 32, height: 32, borderRadius: '50%',
          background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(6px)',
          border: `1px solid ${T.border}`, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke={T.textSub} strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
        </button>
      )}
    </div>
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
      <div style={{ padding: '16px 16px 80px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ background: T.surface, borderRadius: T.radius.card, overflow: 'hidden', border: `1px solid ${T.border}` }}>
            <Shimmer w="100%" h={160} radius={0} />
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Shimmer w="60%" h={14} />
              <Shimmer w="40%" h={11} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 20px', color: T.textSub }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: T.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke={T.textDim} strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 6 }}>Nhat ky trong</div>
        <div style={{ fontSize: 13, color: T.textSub, textAlign: 'center', lineHeight: 1.7 }}>
          Check-in tai cac dia diem de tao nhat ky anh.
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{ padding: '16px 16px 80px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {entries.map((entry) => {
          const typeColor = TYPE_COLORS[entry.place_type] || T.textDim;
          const typeLabel = TYPE_LABELS[entry.place_type] || 'Khac';
          const mapsUrl = `https://www.openstreetmap.org/search?query=${encodeURIComponent(entry.place_name)}`;
          return (
            <div key={entry.id} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius.card, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              {entry.checkin_photo_url && (
                <div onClick={() => setLightbox(entry.checkin_photo_url!)} style={{ position: 'relative', width: '100%', height: 190, cursor: 'zoom-in', overflow: 'hidden', background: T.surface2 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={entry.checkin_photo_url} alt={entry.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.3) 0%, transparent 50%)' }} />
                </div>
              )}
              <div style={{ padding: '12px 14px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: typeColor, background: `${typeColor}14`, padding: '2px 8px', borderRadius: T.radius.pill }}>{typeLabel}</span>
                  <span style={{ fontSize: 11, color: T.textDim }}>{entry.actual_time ?? entry.time}</span>
                  <span style={{ fontSize: 11, color: T.textDim, marginLeft: 'auto' }}>{formatCheckinTime(entry.checked_in_at)}</span>
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: '0 0 4px' }}>{entry.title}</h3>
                {entry.place_name && (
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#3b82f6', textDecoration: 'none', marginBottom: 8 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    {entry.place_name}
                  </a>
                )}
                {entry.checkin_note && (
                  <div style={{ padding: '10px 12px', background: T.successBg, border: `1px solid rgba(13,148,136,0.15)`, borderRadius: 10, fontSize: 13, color: T.text, lineHeight: 1.65 }}>
                    {entry.checkin_note}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: 'fixed', inset: 0, zIndex: Z.overlay + 10, background: 'rgba(0,0,0,0.94)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, cursor: 'zoom-out' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="Anh check-in" style={{ maxWidth: '100%', maxHeight: '90dvh', objectFit: 'contain', borderRadius: 12 }} />
          <button onClick={() => setLightbox(null)} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
      )}
    </>
  );
}

/* ─── Members Tab ────────────────────────────────────────────────────── */
interface Member {
  id: number;
  user: { id: number; name: string; email: string; avatar: string | null };
  role: 'editor' | 'viewer';
  status: 'pending' | 'accepted' | 'declined';
  invited_at: string; accepted_at: string | null;
}
interface Owner { id: number; name: string; email: string; avatar: string | null; }

function MembersTab({ tripId }: { tripId: number }) {
  const [owner, setOwner] = useState<Owner | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('viewer');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [removing, setRemoving] = useState<number | null>(null);
  const { user: currentUser } = useAuthStore();

  const fetchData = useCallback(async () => {
    try {
      const { data } = await api.get(`/trips/${tripId}/members`);
      setOwner(data.owner);
      setMembers(data.members ?? []);
    } catch { setMembers([]); }
    finally { setLoading(false); }
  }, [tripId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const isOwner = currentUser?.id === owner?.id;

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true); setInviteMsg(null);
    try {
      const { data } = await api.post(`/trips/${tripId}/members/invite`, { email: inviteEmail.trim(), role: inviteRole });
      setInviteMsg({ type: 'success', text: data.message });
      setInviteEmail('');
      await fetchData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setInviteMsg({ type: 'error', text: msg || 'Co loi xay ra.' });
    } finally { setInviting(false); }
  };

  const handleRemove = async (memberId: number) => {
    setRemoving(memberId);
    try {
      await api.delete(`/trips/${tripId}/members/${memberId}`);
      setMembers(prev => prev.filter(m => m.id !== memberId));
    } catch { /* ignore */ }
    finally { setRemoving(null); }
  };

  const handleRoleChange = async (memberId: number, role: 'editor' | 'viewer') => {
    try {
      await api.put(`/trips/${tripId}/members/${memberId}/role`, { role });
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role } : m));
    } catch { /* ignore */ }
  };

  if (loading) return (
    <div style={{ padding: '16px 16px 80px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[1, 2].map(i => (
        <div key={i} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius.card, padding: '14px', display: 'flex', gap: 12, alignItems: 'center' }}>
          <Shimmer w={40} h={40} radius={99} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Shimmer w="50%" h={13} />
            <Shimmer w="70%" h={11} />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ padding: '16px 16px 80px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {owner && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.textDim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Chu so huu</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius.card, padding: '12px 14px' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: T.warning, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {owner.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{owner.name}</div>
              <div style={{ fontSize: 12, color: T.textSub }}>{owner.email}</div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: ROLE_CONFIG.owner.color, background: ROLE_CONFIG.owner.bg, padding: '4px 10px', borderRadius: T.radius.pill }}>{ROLE_CONFIG.owner.label}</span>
          </div>
        </div>
      )}

      {isOwner && (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius.card, padding: '16px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 12 }}>Moi thanh vien</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input type="email" placeholder="Email tai khoan..." value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)} style={inSt} />
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value as 'editor' | 'viewer')}
                style={{ ...inSt, flex: 1, cursor: 'pointer' }}>
                <option value="viewer">Nguoi xem</option>
                <option value="editor">Bien tap vien</option>
              </select>
              <button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}
                style={{ flex: 1, padding: '11px 16px', borderRadius: T.radius.btn, border: 'none', background: (inviting || !inviteEmail.trim()) ? T.surface2 : T.accent, color: (inviting || !inviteEmail.trim()) ? T.textDim : '#fff', fontSize: 13, fontWeight: 700, cursor: (inviting || !inviteEmail.trim()) ? 'not-allowed' : 'pointer', minHeight: 44 }}>
                {inviting ? 'Dang moi...' : 'Moi'}
              </button>
            </div>
          </div>
          {inviteMsg && (
            <div style={{ marginTop: 10, fontSize: 12, fontWeight: 500, color: inviteMsg.type === 'success' ? T.success : T.danger, background: inviteMsg.type === 'success' ? T.successBg : T.dangerBg, border: `1px solid ${inviteMsg.type === 'success' ? 'rgba(13,148,136,0.2)' : 'rgba(220,38,38,0.15)'}`, borderRadius: 8, padding: '8px 12px' }}>
              {inviteMsg.text}
            </div>
          )}
        </div>
      )}

      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.textDim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
          Thanh vien ({members.length})
        </div>
        {members.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 0', color: T.textSub, fontSize: 13 }}>
            Chua co thanh vien nao.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {members.map(m => {
              const roleConfig = ROLE_CONFIG[m.role];
              const statusConfig = STATUS_CONFIG[m.status];
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius.card, padding: '12px 14px', opacity: m.status === 'declined' ? 0.5 : 1 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {m.user.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{m.user.name}</div>
                    <div style={{ fontSize: 12, color: T.textSub }}>{m.user.email}</div>
                    <div style={{ fontSize: 11, color: statusConfig.color, marginTop: 2, fontWeight: 500 }}>{statusConfig.label}</div>
                  </div>
                  {isOwner && m.status === 'accepted' ? (
                    <select value={m.role} onChange={e => handleRoleChange(m.id, e.target.value as 'editor' | 'viewer')}
                      style={{ padding: '5px 8px', background: roleConfig.bg, border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 600, color: roleConfig.color, cursor: 'pointer', outline: 'none' }}>
                      <option value="viewer">Xem</option>
                      <option value="editor">Sua</option>
                    </select>
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 600, color: roleConfig.color, background: roleConfig.bg, padding: '4px 10px', borderRadius: T.radius.pill }}>{roleConfig.label}</span>
                  )}
                  {(isOwner || m.user.id === currentUser?.id) && (
                    <button onClick={() => handleRemove(m.id)} disabled={removing === m.id}
                      style={{ background: T.dangerBg, border: `1px solid rgba(220,38,38,0.15)`, borderRadius: 8, color: T.danger, cursor: 'pointer', padding: '7px 10px', fontSize: 13, flexShrink: 0, minHeight: 36, lineHeight: 1 }}>
                      {removing === m.id ? '...' : m.user.id === currentUser?.id ? 'Roi' : '✕'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Budget Overview (Expenses tab) ────────────────────────────────── */
function BudgetOverviewMobile({ expenses, budgetData, tripBudget, numPeople }: {
  expenses: Expense[]; budgetData?: TripBudgetData | null;
  tripBudget: number; numPeople: number;
}) {
  const [open, setOpen] = useState(true);
  const totalEstimated = Number(budgetData?.total_estimated) || tripBudget;
  const totalPlanned   = tripBudget;
  const totalActual    = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const actualByCategory: Record<string, number> = {};
  for (const exp of expenses) {
    const cat = EXPENSE_TO_BUDGET[exp.category] ?? 'other';
    actualByCategory[cat] = (actualByCategory[cat] ?? 0) + Number(exp.amount);
  }
  const spentPct    = totalEstimated > 0 ? Math.min(100, (totalActual / totalEstimated) * 100) : 0;
  const isOverActual  = totalActual > totalEstimated;
  const isOverPlanned = totalEstimated > totalPlanned;

  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius.card, overflow: 'hidden', marginBottom: 16 }}>
      <button onClick={() => setOpen(v => !v)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', minHeight: 48 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Ngan sach tong quan</span>
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke={T.textDim} strokeWidth={2.5} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${T.surface2}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 12, marginBottom: 14 }}>
            {[
              { label: 'Ke hoach', value: totalPlanned, sub: 'Ban dat ra', over: false },
              { label: 'Du kien AI', value: totalEstimated, sub: isOverPlanned ? `+${formatCurrency(totalEstimated - totalPlanned)}` : `Tiet kiem ${formatCurrency(totalPlanned - totalEstimated)}`, over: isOverPlanned },
              { label: 'Da chi', value: totalActual, sub: totalActual > 0 ? (isOverActual ? `Vuot ${formatCurrency(totalActual - totalEstimated)}` : `Con ${formatCurrency(totalEstimated - totalActual)}`) : 'Chua co', over: isOverActual },
            ].map((box, i) => (
              <div key={i} style={{ background: box.over ? T.dangerBg : T.surface2, border: box.over ? `1px solid rgba(220,38,38,0.15)` : 'none', borderRadius: T.radius.btn, padding: '10px' }}>
                <div style={{ fontSize: 10, color: T.textDim, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{box.label}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: box.over ? T.danger : i === 2 && box.value > 0 ? T.warning : i === 2 ? T.textDim : T.text }}>
                  {box.value > 0 ? formatCurrency(box.value) : '-'}
                </div>
                <div style={{ fontSize: 10, color: T.textDim, marginTop: 2, lineHeight: 1.3 }}>{box.sub}</div>
              </div>
            ))}
          </div>
          {totalActual > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 11 }}>
                <span style={{ color: T.textDim }}>Da chi {Math.round(spentPct)}%</span>
                <span style={{ fontWeight: 600, color: isOverActual ? T.danger : T.success }}>{formatCurrency(totalActual)} / {formatCurrency(totalEstimated)}</span>
              </div>
              <div style={{ height: 6, background: T.surface2, borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${spentPct}%`, borderRadius: 99, transition: 'width 0.5s', background: isOverActual ? T.danger : spentPct > 75 ? T.warning : T.success }} />
              </div>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {BUDGET_CATEGORIES_CONFIG.map(cat => {
              const estimated = Number((budgetData as Record<string, string> | null)?.[cat.key] ?? 0);
              const actual    = actualByCategory[cat.key] ?? 0;
              if (estimated === 0 && actual === 0) return null;
              const barPct = estimated > 0 ? Math.min(100, (actual / estimated) * 100) : 0;
              const isOver = actual > estimated && estimated > 0;
              return (
                <div key={cat.key} style={{ background: T.surface2, borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                    <span style={{ fontSize: 13 }}>{cat.emoji}</span>
                    <span style={{ flex: 1, fontSize: 12, color: T.text, fontWeight: 600 }}>{cat.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: isOver ? T.danger : actual > 0 ? T.warning : T.textSub }}>
                      {actual > 0 ? formatCurrency(actual) : '-'}
                      <span style={{ fontWeight: 400, color: T.textDim }}> / {formatCurrency(estimated)}</span>
                    </span>
                  </div>
                  <div style={{ height: 3, background: T.border, borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${actual > 0 ? barPct : (totalEstimated > 0 ? (estimated / totalEstimated) * 100 : 0)}%`, background: actual > 0 ? (isOver ? T.danger : cat.color) : `${cat.color}50`, borderRadius: 99, transition: 'width 0.4s' }} />
                  </div>
                  {actual > 0 && <div style={{ fontSize: 10, marginTop: 3, color: isOver ? T.danger : T.success }}>{isOver ? `Vuot ${formatCurrency(actual - estimated)}` : `Con ${formatCurrency(estimated - actual)}`}</div>}
                </div>
              );
            })}
          </div>
          {numPeople > 1 && totalEstimated > 0 && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.surface2}`, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, color: T.textDim }}>Moi nguoi ({numPeople} nguoi)</span>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>~{formatCurrency(Math.round(totalEstimated / numPeople))}</span>
                {totalActual > 0 && <span style={{ fontSize: 11, color: T.textDim, display: 'block' }}>Da chi: ~{formatCurrency(Math.round(totalActual / numPeople))}</span>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Expenses Tab ───────────────────────────────────────────────────── */
function ExpensesTab({ tripId, tripBudget, budgetData, numPeople }: {
  tripId: number; tripBudget: number;
  budgetData?: TripBudgetData | null; numPeople: number;
}) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState('all');
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const { data } = await api.get(`/trips/${tripId}/expenses`);
      setExpenses(data.expenses ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [tripId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (expId: number) => {
    setDeleting(expId);
    try { await api.delete(`/trips/${tripId}/expenses/${expId}`); await fetchData(); }
    catch { /* ignore */ }
    finally { setDeleting(null); }
  };

  const filtered = filterCat === 'all' ? expenses : expenses.filter(e => e.category === filterCat);
  const grouped = filtered.reduce<Record<string, Expense[]>>((acc, exp) => {
    if (!acc[exp.expense_date]) acc[exp.expense_date] = [];
    acc[exp.expense_date].push(exp);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  if (loading) return (
    <div style={{ padding: '16px 16px 80px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius.card, padding: '14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Shimmer w="40%" h={13} /><Shimmer w="100%" h={6} radius={99} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 4 }}>
          {[1,2,3].map(i => <Shimmer key={i} w="100%" h={60} radius={10} />)}
        </div>
      </div>
      {[1,2,3].map(i => <div key={i} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius.card, padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'center' }}>
        <Shimmer w={38} h={38} radius={10} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}><Shimmer w="55%" h={13} /><Shimmer w="30%" h={11} /></div>
        <Shimmer w={70} h={20} radius={6} />
      </div>)}
    </div>
  );

  return (
    <div style={{ padding: '16px 16px 80px' }}>
      <BudgetOverviewMobile expenses={expenses} budgetData={budgetData} tripBudget={tripBudget} numPeople={numPeople} />

      {/* Category filter pills */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 14, paddingBottom: 2, scrollbarWidth: 'none' }}>
        <button onClick={() => setFilterCat('all')} style={{ flexShrink: 0, padding: '6px 14px', borderRadius: T.radius.pill, border: `1px solid ${filterCat === 'all' ? T.accent : T.border}`, background: filterCat === 'all' ? T.accentBg : T.surface, color: filterCat === 'all' ? T.accent : T.textSub, fontSize: 12, fontWeight: 600, cursor: 'pointer', minHeight: 32 }}>
          Tat ca ({expenses.length})
        </button>
        {Object.entries(EXPENSE_CATEGORIES).map(([key, cat]) => {
          const count = expenses.filter(e => e.category === key).length;
          if (!count) return null;
          const active = filterCat === key;
          return (
            <button key={key} onClick={() => setFilterCat(key)}
              style={{ flexShrink: 0, padding: '6px 14px', borderRadius: T.radius.pill, border: `1px solid ${active ? cat.color : T.border}`, background: active ? `${cat.color}12` : T.surface, color: active ? cat.color : T.textSub, fontSize: 12, fontWeight: 600, cursor: 'pointer', minHeight: 32 }}>
              {cat.emoji} {cat.label} ({count})
            </button>
          );
        })}
      </div>

      <button onClick={() => { setEditItem(null); setAddOpen(true); }}
        style={{ width: '100%', padding: '12px', borderRadius: T.radius.btn, border: `1.5px dashed rgba(13,148,136,0.4)`, background: T.surface, color: T.success, fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 16, minHeight: 46 }}>
        + Them chi phi
      </button>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: T.textSub }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 4 }}>Chua co chi phi nao</div>
          <div style={{ fontSize: 12 }}>Them chi phi thuc te trong chuyen di.</div>
        </div>
      ) : sortedDates.map(date => {
        const dayTotal = grouped[date].reduce((s, e) => s + Number(e.amount), 0);
        const dateLabel = new Date(date).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' });
        return (
          <div key={date} style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: T.textSub, textTransform: 'capitalize' }}>{dateLabel}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: T.success }}>{formatCurrency(dayTotal)}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {grouped[date].map(exp => {
                const cat = EXPENSE_CATEGORIES[exp.category] ?? EXPENSE_CATEGORIES.other;
                return (
                  <div key={exp.id} onClick={() => { setEditItem(exp); setAddOpen(true); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius.card, padding: '12px 14px', cursor: 'pointer', WebkitTapHighlightColor: 'transparent', minHeight: 64 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: `${cat.color}12`, border: `1px solid ${cat.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>{cat.emoji}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{exp.note || cat.label}</div>
                      {exp.paid_by && <div style={{ fontSize: 12, color: T.textDim, marginTop: 2 }}>{exp.paid_by}</div>}
                    </div>
                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>{formatCurrency(Number(exp.amount))}</div>
                      <div style={{ fontSize: 11, color: cat.color, marginTop: 1 }}>{cat.label}</div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); handleDelete(exp.id); }} disabled={deleting === exp.id}
                      style={{ flexShrink: 0, background: T.dangerBg, border: `1px solid rgba(220,38,38,0.12)`, borderRadius: 8, color: T.danger, cursor: 'pointer', padding: '8px 10px', fontSize: 13, lineHeight: 1, minHeight: 36, minWidth: 36 }}>
                      {deleting === exp.id ? '...' : (
                        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {addOpen && (
        <AddExpenseModal tripId={tripId} editItem={editItem}
          onSaved={() => { setAddOpen(false); setEditItem(null); fetchData(); }}
          onClose={() => { setAddOpen(false); setEditItem(null); }} />
      )}
    </div>
  );
}

/* ─── Hero Banner ────────────────────────────────────────────────────── */
function HeroBanner({ destination, startDate, durationDays, numPeople, coverImageUrl, onBack, onMenuClick }: {
  destination: string; startDate: string; durationDays: number; numPeople: number;
  coverImageUrl?: string | null; onBack: () => void; onMenuClick: () => void;
}) {
  const { url: unsplashImg, fallbackColor } = useUnsplashImage('attraction', destination);
  const heroImg = coverImageUrl || unsplashImg;
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + durationDays - 1);
  const fmtRange = () => {
    const sd = new Date(startDate);
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    // no em-dash — use hyphen
    return `${sd.toLocaleDateString('vi-VN', opts)} - ${endDate.toLocaleDateString('vi-VN', { ...opts, year: 'numeric' })}`;
  };

  return (
    <div style={{ position: 'relative', height: 210, overflow: 'hidden', flexShrink: 0, background: fallbackColor }}>
      {heroImg && (
        <Image src={heroImg} alt={destination} fill sizes="100vw" unoptimized priority style={{ objectFit: 'cover' }} />
      )}
      {/* Gradient overlay - stronger bottom for text legibility */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.28) 0%, transparent 35%, rgba(0,0,0,0.75) 100%)' }} />

      {/* Top controls */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', paddingTop: 'calc(14px + env(safe-area-inset-top))' }}>
        <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <button onClick={onMenuClick} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2}><circle cx="12" cy="5" r="1" fill="#fff" /><circle cx="12" cy="12" r="1" fill="#fff" /><circle cx="12" cy="19" r="1" fill="#fff" /></svg>
        </button>
      </div>

      {/* Bottom info */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 16px 16px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: '0 0 5px', letterSpacing: '-0.4px', lineHeight: 1.15 }}>{destination}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" /></svg>
            <span>{fmtRange()}</span>
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>{durationDays} ngay</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>{numPeople} nguoi</div>
        </div>
      </div>
    </div>
  );
}

/* ─── Compact Budget Strip ───────────────────────────────────────────── */
function BudgetStrip({ spent, total }: { spent: number; total: number }) {
  if (total <= 0) return null;
  const pct  = Math.min((spent / total) * 100, 100);
  const over = spent > total;
  return (
    <div style={{ background: T.surface, padding: '10px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: T.textDim, whiteSpace: 'nowrap' }}>Ngan sach</span>
      <div style={{ flex: 1, height: 5, background: T.surface2, borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: over ? T.danger : pct > 80 ? T.warning : T.success, borderRadius: 99, transition: 'width 0.5s ease' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: over ? T.danger : T.text, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
        {formatCurrency(spent)} / {formatCurrency(total)}
      </span>
    </div>
  );
}

/* ─── Bottom Navigation ─────────────────────────────────────────────── */
type BottomTab = 'plan' | 'journal' | 'expenses' | 'more';
type MainTab   = 'plan' | 'overview' | 'journal' | 'expenses' | 'members' | 'notes';

function BottomNav({ active, onChange }: { active: BottomTab; onChange: (t: BottomTab) => void }) {
  const tabs: { key: BottomTab; label: string; icon: React.ReactNode }[] = [
    {
      key: 'plan', label: 'Ke hoach',
      icon: <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active === 'plan' ? 2.5 : 1.8}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" /></svg>,
    },
    {
      key: 'journal', label: 'Nhat ky',
      icon: <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active === 'journal' ? 2.5 : 1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    },
    {
      key: 'expenses', label: 'Chi phi',
      icon: <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active === 'expenses' ? 2.5 : 1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    },
    {
      key: 'more', label: 'Them',
      icon: <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active === 'more' ? 2.5 : 1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>,
    },
  ];

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: Z.tab,
      background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      borderTop: `1px solid ${T.border}`,
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {tabs.map(tab => {
        const isActive = active === tab.key;
        return (
          <button key={tab.key} onClick={() => onChange(tab.key)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 3, padding: '10px 0 8px', border: 'none', background: 'transparent',
              cursor: 'pointer', color: isActive ? T.accent : T.textDim,
              minHeight: 56, WebkitTapHighlightColor: 'transparent',
              transition: 'color 0.12s',
            }}>
            {tab.icon}
            <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500, letterSpacing: '0.02em' }}>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ─── More Drawer (secondary tabs) ──────────────────────────────────── */
function MoreDrawer({ onSelect, onClose }: { onSelect: (t: MainTab) => void; onClose: () => void }) {
  const items: { tab: MainTab; label: string; desc: string; icon: string }[] = [
    { tab: 'overview', label: 'Tong quan', desc: 'Thong tin chuyen di, lich tung ngay', icon: '📋' },
    { tab: 'members',  label: 'Thanh vien', desc: 'Moi ban dong hanh, quan ly quyen', icon: '👥' },
    { tab: 'notes',    label: 'Ghi chu', desc: 'Ghi chu ca nhan va danh sach do mang', icon: '📝' },
  ];
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: Z.modal, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }} onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />
      <div style={{ position: 'relative', background: T.surface, borderRadius: `${T.radius.sheet}px ${T.radius.sheet}px 0 0`, paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: T.border }} />
        </div>
        <div style={{ padding: '4px 16px 8px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.textDim, marginBottom: 8 }}>Chuyen den</div>
          {items.map(item => (
            <button key={item.tab} onClick={() => { onSelect(item.tab); onClose(); }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '13px 0', background: 'none', border: 'none', cursor: 'pointer', borderBottom: `1px solid ${T.surface2}`, WebkitTapHighlightColor: 'transparent' }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: T.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{item.icon}</div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{item.label}</div>
                <div style={{ fontSize: 12, color: T.textSub }}>{item.desc}</div>
              </div>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke={T.textDim} strokeWidth={2} style={{ marginLeft: 'auto', flexShrink: 0 }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────── */
export default function MobileTripDetail({ trip, onBack, onActivityUpdated, onActivityDeleted, onActivityAdded }: Props) {
  // Navigation
  const [activeTab, setActiveTab] = useState<MainTab>('plan');
  const [bottomTab, setBottomTab] = useState<BottomTab>('plan');
  const [moreOpen, setMoreOpen] = useState(false);

  // Plan tab state
  const [activeDay, setActiveDay] = useState<number>(trip.days[0]?.day_number ?? 1);
  const [activePlace, setActivePlace] = useState<(Activity & { day?: number }) | null>(null);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  // Chat
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatCount, setChatCount] = useState(0);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Share / publish
  const [shareCopied, setShareCopied] = useState(false);
  const [isPublished, setIsPublished] = useState(trip.is_published ?? false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishDesc, setPublishDesc] = useState('');
  const [publishLoading, setPublishLoading] = useState(false);

  // Menu / invite
  const [menuOpen, setMenuOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteTab, setInviteTab] = useState<'link' | 'email'>('link');
  const [inviteLink, setInviteLink] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('viewer');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  // Notes / packing
  const [notes, setNotes] = useState(trip.user_notes ?? '');
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [packingData, setPackingData] = useState<PackingListData | null>(null);
  const [packingLoading, setPackingLoading] = useState(false);
  const [packingLoaded, setPackingLoaded] = useState(false);
  const [packingChecked, setPackingChecked] = useState<Set<string>>(new Set());

  // Expenses per place
  const [placeExpenses, setPlaceExpenses] = useState<Record<number, number>>({});

  const currentDay  = trip.days.find(d => d.day_number === activeDay);
  const allPlaces   = trip.days.flatMap(d => d.places.map(p => ({ ...p, day: d.day_number })));
  const tripBudget  = Number(trip.budget) || 0;
  const totalEstimated = Number(trip.budget_data?.total_estimated) || 0;
  const budgetDisplay  = totalEstimated > 0 ? totalEstimated : tripBudget;
  const totalSpent     = Object.values(placeExpenses).reduce((a, b) => a + b, 0);
  const nextActivityIdx = currentDay?.places.findIndex(p => !p.checked_in_at) ?? -1;

  const fetchPlaceExpenses = useCallback(async () => {
    try {
      const { data } = await api.get(`/trips/${trip.id}/expenses`);
      const expenses: Expense[] = data.expenses ?? [];
      const map: Record<number, number> = {};
      for (const exp of expenses) {
        if (exp.trip_place_id != null) map[exp.trip_place_id] = (map[exp.trip_place_id] ?? 0) + Number(exp.amount);
      }
      setPlaceExpenses(map);
    } catch { /* ignore */ }
  }, [trip.id]);

  useEffect(() => { fetchPlaceExpenses(); }, [fetchPlaceExpenses]);
  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  // Sync bottom nav with active tab
  const handleBottomTab = (bt: BottomTab) => {
    setBottomTab(bt);
    setMoreOpen(false);
    if (bt === 'plan')     setActiveTab('plan');
    else if (bt === 'journal')  setActiveTab('journal');
    else if (bt === 'expenses') setActiveTab('expenses');
    else if (bt === 'more')     setMoreOpen(true);
  };
  const handleMoreSelect = (t: MainTab) => {
    setActiveTab(t);
    setBottomTab('more');
  };

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
      if (data.share_url) { await navigator.clipboard.writeText(data.share_url).catch(() => {}); setShareCopied(true); setTimeout(() => setShareCopied(false), 3000); }
    } catch { /* ignore */ }
  };
  const handlePublish = async () => {
    setPublishLoading(true);
    try {
      const { data } = await api.post(`/trips/${trip.id}/publish`, { description: publishDesc });
      setIsPublished(data.is_published); setPublishOpen(false);
    } catch { /* ignore */ } finally { setPublishLoading(false); }
  };
  const handleSaveTrip = async () => { try { await api.post(`/trips/${trip.id}/favorites`); setMenuOpen(false); } catch { /* ignore */ } };

  const handleInviteModalOpen = async () => {
    setInviteModalOpen(true); setMenuOpen(false); setInviteLoading(true);
    try { const { data } = await api.post(`/trips/${trip.id}/invite-link`); if (data.invite_url) setInviteLink(data.invite_url); }
    catch { /* ignore */ } finally { setInviteLoading(false); }
  };
  const handleCopyInviteLink = async () => {
    if (inviteLink) { await navigator.clipboard.writeText(inviteLink).catch(() => {}); setShareCopied(true); setTimeout(() => setShareCopied(false), 3000); }
  };
  const handleInviteByEmail = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true); setInviteMsg(null);
    try {
      const { data } = await api.post(`/trips/${trip.id}/members/invite`, { email: inviteEmail.trim(), role: inviteRole });
      setInviteMsg({ type: 'success', text: data.message }); setInviteEmail('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setInviteMsg({ type: 'error', text: msg || 'Co loi xay ra.' });
    } finally { setInviting(false); }
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading || chatCount >= CHAT_LIMIT) return;
    const msg = chatInput.trim(); setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: msg }]); setChatLoading(true);
    try {
      const { data } = await api.post(`/trips/${trip.id}/chat`, { message: msg });
      setChatMessages(prev => [...prev, { role: 'ai', content: data.message }]);
      setChatCount(data.chat_count || chatCount + 1);
      if (data.updated_days) { /* parent handles via onActivityUpdated */ }
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setChatMessages(prev => [...prev, { role: 'ai', content: status === 429 ? 'Da dat gioi han chinh sua.' : 'Da co loi xay ra.' }]);
    } finally { setChatLoading(false); }
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100dvh',
      background: T.bg, fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
      overflowX: 'hidden',
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .m-scroll::-webkit-scrollbar { display: none; }
        .m-list::-webkit-scrollbar { width: 2px; }
        .m-list::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); border-radius: 99px; }
      `}</style>

      {/* ── Scrollable area (leaves 56px for bottom nav) ── */}
      <div className="m-list" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', paddingBottom: 'calc(56px + env(safe-area-inset-bottom))' }}>

        {/* HERO */}
        <HeroBanner
          destination={trip.destination} startDate={trip.start_date}
          durationDays={trip.duration_days} numPeople={trip.num_people}
          coverImageUrl={trip.cover_image_url}
          onBack={onBack} onMenuClick={() => setMenuOpen(true)}
        />

        {/* BUDGET STRIP */}
        <BudgetStrip spent={totalSpent} total={budgetDisplay} />

        {/* ═══════════ PLAN TAB ═══════════ */}
        {activeTab === 'plan' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>

            {/* Day selector */}
            <div className="m-scroll" style={{ display: 'flex', gap: 6, padding: '10px 16px', overflowX: 'auto', flexShrink: 0, background: T.surface, borderBottom: `1px solid ${T.border}`, scrollbarWidth: 'none' }}>
              {trip.days.map(day => {
                const isActive = day.day_number === activeDay;
                return (
                  <button key={day.id} onClick={() => setActiveDay(day.day_number)}
                    style={{ flexShrink: 0, padding: '6px 14px', borderRadius: T.radius.pill, border: isActive ? 'none' : `1px solid ${T.border}`, background: isActive ? T.accent : T.surface, color: isActive ? '#fff' : T.textSub, fontSize: 13, fontWeight: isActive ? 700 : 500, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: isActive ? `0 2px 8px ${T.accentBg}` : 'none', minHeight: 34, transition: 'all 0.12s' }}>
                    {formatShortDate(day.date) || `Ngay ${day.day_number}`}
                    {day.weather && <span style={{ marginLeft: 5 }}>{WEATHER_ICONS[day.weather.icon] || '🌤️'}</span>}
                  </button>
                );
              })}
            </div>

            {/* Day header */}
            {currentDay && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 16px 8px', background: T.surface, borderBottom: `1px solid ${T.border}` }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Ngay {currentDay.day_number} - {formatFullDate(currentDay.date)}</div>
                  <div style={{ fontSize: 11, color: T.textDim, marginTop: 1 }}>{currentDay.places.length} dia diem{currentDay.weather?.rain_probability != null && currentDay.weather.rain_probability >= 0.5 ? ' · Co mua' : ''}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {currentDay.weather && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 18 }}>{WEATHER_ICONS[currentDay.weather.icon] || '🌤️'}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{Math.round(currentDay.weather.temperature_high)}°</span>
                    </div>
                  )}
                  <button onClick={() => setAddOpen(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: T.accent, background: T.accentBg, border: 'none', borderRadius: T.radius.pill, padding: '5px 10px', cursor: 'pointer', fontWeight: 700, minHeight: 28 }}>
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    Them
                  </button>
                </div>
              </div>
            )}

            {/* Map bottom sheet - peek + expand */}
            <MapBottomSheet
              places={allPlaces} days={trip.days}
              activeDay={activeDay} activePlace={activePlace}
              open={mapExpanded} onToggle={() => setMapExpanded(v => !v)}
              onMarkerClick={place => {
                const match = allPlaces.find(p => p.title === place.title && p.time === place.time);
                if (match) setActivePlace(match);
                if (place.day) setActiveDay(place.day);
              }}
            />

            {/* Activity timeline - only shown when map is not expanded */}
            {!mapExpanded && (
              <div className="m-list" style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 20px', background: T.bg }}>
                {currentDay?.places.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '48px 0', color: T.textDim, fontSize: 13 }}>Ngay nay chua co hoat dong.</div>
                )}
                {currentDay?.places.map((place, i) => (
                  <PlanActivityRow
                    key={place.id ?? i}
                    activity={place} isLast={i === currentDay.places.length - 1}
                    isNext={i === nextActivityIdx} isCompleted={!!place.checked_in_at}
                    tripId={trip.id} dayId={currentDay.id} dayDate={currentDay.date}
                    totalExpense={place.id ? (placeExpenses[place.id] ?? 0) : 0}
                    onUpdated={updated => onActivityUpdated(currentDay.id, updated)}
                    onDeleted={() => place.id && onActivityDeleted(currentDay.id, place.id)}
                    onExpenseAdded={fetchPlaceExpenses}
                    onViewJournal={() => { setActiveTab('journal'); setBottomTab('journal'); }}
                  />
                ))}
                {/* Add activity button */}
                <button onClick={() => setAddOpen(true)}
                  style={{ width: '100%', padding: '12px', marginTop: 6, borderRadius: T.radius.btn, border: `1.5px dashed ${T.border}`, background: T.surface, color: T.textDim, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44 }}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  Them hoat dong
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═══════════ JOURNAL TAB ═══════════ */}
        {activeTab === 'journal' && <JournalTab tripId={trip.id} />}

        {/* ═══════════ EXPENSES TAB ═══════════ */}
        {activeTab === 'expenses' && (
          <ExpensesTab tripId={trip.id} tripBudget={tripBudget} budgetData={trip.budget_data} numPeople={trip.num_people} />
        )}

        {/* ═══════════ OVERVIEW TAB ═══════════ */}
        {activeTab === 'overview' && (
          <div style={{ flex: 1, padding: '16px 16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: T.surface, borderRadius: T.radius.card, padding: '16px', border: `1px solid ${T.border}` }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                {[
                  { label: 'Ngay bat dau', value: formatTripDate(trip.start_date) },
                  { label: 'Thoi luong',   value: `${trip.duration_days} ngay` },
                  { label: 'So nguoi',     value: `${trip.num_people} nguoi` },
                  { label: 'Ngan sach',    value: formatCurrency(tripBudget) },
                ].map((chip, i) => (
                  <div key={i}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: T.textDim, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{chip.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{chip.value}</div>
                  </div>
                ))}
              </div>
              {totalEstimated > 0 && totalEstimated !== tripBudget && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.surface2}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: T.textSub }}>Du kien AI:</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: totalEstimated > tripBudget ? T.danger : T.success }}>{formatCurrency(totalEstimated)}</span>
                </div>
              )}
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 10 }}>Lich trinh tung ngay</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {trip.days.map(day => {
                  const dayCost = day.places.reduce((s, p) => s + (Number(p.estimated_cost) || 0), 0);
                  return (
                    <button key={day.id} onClick={() => { setActiveDay(day.day_number); setActiveTab('plan'); setBottomTab('plan'); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius.card, padding: '12px 14px', cursor: 'pointer', textAlign: 'left', width: '100%', minHeight: 64, WebkitTapHighlightColor: 'transparent' }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                        {day.day_number}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 2 }}>{formatFullDate(day.date)}</div>
                        <div style={{ fontSize: 12, color: T.textSub }}>{day.places.length} dia diem{dayCost > 0 ? ` · ${formatCurrency(dayCost)}` : ''}</div>
                      </div>
                      {day.weather && (
                        <div style={{ flexShrink: 0, textAlign: 'center' }}>
                          <div style={{ fontSize: 20 }}>{WEATHER_ICONS[day.weather.icon] || '🌤️'}</div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: T.textSub }}>{Math.round(day.weather.temperature_high)}°</div>
                        </div>
                      )}
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke={T.textDim} strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════ MEMBERS TAB ═══════════ */}
        {activeTab === 'members' && <MembersTab tripId={trip.id} />}

        {/* ═══════════ NOTES TAB ═══════════ */}
        {activeTab === 'notes' && (
          <div className="m-list" style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 20px' }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Ghi chu ca nhan</span>
                <span style={{ fontSize: 11, color: notesSaving ? T.accent : notesSaved ? T.success : 'transparent', transition: 'color 0.2s' }}>
                  {notesSaving ? 'Dang luu...' : 'Da luu'}
                </span>
              </div>
              <textarea value={notes} onChange={e => handleNotesChange(e.target.value)} rows={5}
                placeholder="Ghi chu: dat ban truoc, mang theo o, doi tien o dau..."
                style={{ ...inSt, resize: 'none', lineHeight: 1.6 }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Do can mang</span>
              {packingData && (() => {
                const total = packingData.categories.reduce((s, c) => s + c.items.length, 0);
                return <span style={{ fontSize: 12, color: T.textSub }}>{packingChecked.size}/{total} da chuan bi</span>;
              })()}
            </div>

            {packingLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1,2].map(i => <div key={i} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius.card, padding: '12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Shimmer w="40%" h={13} />
                  {[1,2,3].map(j => <Shimmer key={j} w="100%" h={44} radius={10} />)}
                </div>)}
              </div>
            )}
            {!packingLoading && !packingLoaded && (
              <button onClick={loadPacking}
                style={{ width: '100%', padding: '13px', borderRadius: T.radius.btn, border: `1px dashed ${T.accentBg.replace('0.08', '0.35')}`, background: T.accentBg, color: T.accent, fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 46 }}>
                Tao danh sach bang Trip AI
              </button>
            )}
            {!packingLoading && packingData && packingData.categories.map((cat, ci) => (
              <div key={ci} style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 8 }}>{cat.emoji} {cat.name}</div>
                {cat.items.map((item, ii) => {
                  const key = `${ci}-${item.name}`;
                  const isDone = packingChecked.has(key);
                  return (
                    <label key={ii} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, cursor: 'pointer', background: isDone ? T.successBg : T.surface, marginBottom: 4, border: `1px solid ${isDone ? 'rgba(13,148,136,0.2)' : T.border}`, minHeight: 44 }}>
                      <input type="checkbox" checked={isDone} onChange={() => togglePackingItem(key)} style={{ accentColor: T.success, width: 16, height: 16, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 14, color: isDone ? T.textDim : T.text, textDecoration: isDone ? 'line-through' : 'none' }}>
                        {item.name}
                        {item.quantity && item.quantity !== '1' && <span style={{ fontSize: 12, color: T.textDim, marginLeft: 6 }}>x{item.quantity}</span>}
                      </span>
                      {item.essential && !isDone && <span style={{ fontSize: 10, background: T.dangerBg, color: T.danger, padding: '2px 7px', borderRadius: T.radius.pill, fontWeight: 700, flexShrink: 0 }}>Can</span>}
                    </label>
                  );
                })}
              </div>
            ))}
            {!packingLoading && packingData?.tips && packingData.tips.length > 0 && (
              <div style={{ padding: '14px 16px', background: T.accentBg, border: `1px solid rgba(59,91,219,0.15)`, borderRadius: T.radius.card }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.accent, marginBottom: 8 }}>Bi kip chuyen di</div>
                {packingData.tips.map((tip, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: i < packingData.tips.length - 1 ? 6 : 0 }}>
                    <span style={{ color: T.accent, flexShrink: 0 }}>-</span>
                    <span style={{ fontSize: 13, color: T.textSub, lineHeight: 1.6 }}>{tip}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Bottom Navigation ── */}
      <BottomNav active={bottomTab} onChange={handleBottomTab} />

      {/* ── More Drawer ── */}
      {moreOpen && <MoreDrawer onSelect={handleMoreSelect} onClose={() => setMoreOpen(false)} />}

      {/* ── AI Chat FAB + Sheet ── */}
      <button onClick={() => setChatOpen(true)}
        style={{ position: 'fixed', bottom: `calc(72px + env(safe-area-inset-bottom))`, right: 18, width: 48, height: 48, borderRadius: '50%', background: T.accent, border: 'none', boxShadow: `0 4px 16px rgba(59,91,219,0.4)`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: Z.fab }}>
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
      </button>

      {/* ── AI Chat Bottom Sheet ── */}
      {chatOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: Z.modal, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div onClick={() => setChatOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />
          <div style={{ position: 'relative', background: T.surface, borderRadius: `${T.radius.sheet}px ${T.radius.sheet}px 0 0`, height: '72dvh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 6px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 99, background: T.border }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px 12px', borderBottom: `1px solid ${T.surface2}` }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Tro ly Trip AI</div>
                <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>{chatCount}/{CHAT_LIMIT} luot chinh sua</div>
              </div>
              <button onClick={() => setChatOpen(false)} style={{ background: 'none', border: 'none', color: T.textDim, cursor: 'pointer', fontSize: 22, padding: 4 }}>✕</button>
            </div>
            <div className="m-list" style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {chatMessages.length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px 0', color: T.textDim }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 6 }}>Hoi Trip AI de chinh sua lich trinh</div>
                  <div style={{ fontSize: 12, lineHeight: 1.7 }}>Vi du: &quot;Them quan cafe buoi sang&quot;</div>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 8, alignItems: 'flex-end' }}>
                  {msg.role === 'ai' && (
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: T.accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginBottom: 2 }}>
                      <svg width="11" height="11" fill={T.accent} viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke={T.accent} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                  )}
                  <div style={{ maxWidth: '80%', padding: '10px 13px', borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: msg.role === 'user' ? T.accent : T.surface2, fontSize: 14, color: msg.role === 'user' ? '#fff' : T.text, lineHeight: 1.55 }}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: T.accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <div style={{ width: 12, height: 12, border: `2px solid ${T.accent}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  </div>
                  <div style={{ padding: '10px 13px', borderRadius: '16px 16px 16px 4px', background: T.surface2, fontSize: 14, color: T.textDim }}>Dang suy nghi...</div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>
            <div style={{ padding: '10px 14px', paddingBottom: 'calc(10px + env(safe-area-inset-bottom))', borderTop: `1px solid ${T.surface2}` }}>
              {chatCount >= CHAT_LIMIT ? (
                <div style={{ fontSize: 12, color: T.warning, textAlign: 'center', padding: '10px', background: T.warningBg, borderRadius: 10 }}>
                  Da dat gioi han {CHAT_LIMIT} luot chinh sua.
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} placeholder="Nhap yeu cau chinh sua..." disabled={chatLoading}
                    style={{ ...inSt, flex: 1 }} />
                  <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()}
                    style={{ width: 44, height: 44, borderRadius: T.radius.btn, background: chatInput.trim() ? T.accent : T.surface2, border: 'none', color: chatInput.trim() ? '#fff' : T.textDim, cursor: chatInput.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.12s' }}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Publish Modal ── */}
      {publishOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: Z.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setPublishOpen(false)}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'relative', width: '100%', maxWidth: 440, background: T.surface, borderRadius: T.radius.sheet, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 14px', borderBottom: `1px solid ${T.border}` }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Publish len cong dong</span>
              <button onClick={() => setPublishOpen(false)} style={{ background: 'none', border: 'none', color: T.textDim, cursor: 'pointer', fontSize: 20, padding: 4 }}>✕</button>
            </div>
            <div style={{ padding: '18px 20px' }}>
              <p style={{ fontSize: 13, color: T.textSub, margin: '0 0 14px', lineHeight: 1.6 }}>Nguoi khac co the xem va clone lich trinh nay.</p>
              <label style={lbSt}>Mo ta (tuy chon)</label>
              <textarea rows={3} placeholder="Chia se kinh nghiem, tips..." value={publishDesc}
                onChange={e => setPublishDesc(e.target.value)}
                style={{ ...inSt, resize: 'none', lineHeight: 1.6, marginBottom: 14 }} />
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setPublishOpen(false)} style={{ flex: 1, padding: '12px', borderRadius: T.radius.btn, border: `1px solid ${T.border}`, background: T.surface2, color: T.text, fontSize: 14, cursor: 'pointer', minHeight: 44 }}>Huy</button>
                <button onClick={handlePublish} disabled={publishLoading}
                  style={{ flex: 2, padding: '12px', borderRadius: T.radius.btn, border: 'none', background: publishLoading ? T.surface2 : T.success, color: publishLoading ? T.textDim : '#fff', fontSize: 14, fontWeight: 700, cursor: publishLoading ? 'not-allowed' : 'pointer', minHeight: 44 }}>
                  {publishLoading ? 'Dang publish...' : 'Publish ngay'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Activity Modal ── */}
      {addOpen && currentDay && (
        <AddActivityModalLazy tripId={trip.id} dayId={currentDay.id}
          onSaved={(newPlace: Activity) => { setAddOpen(false); onActivityAdded(currentDay.id, newPlace); }}
          onClose={() => setAddOpen(false)} />
      )}

      {/* ── Menu Dropdown ── */}
      {menuOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: Z.modal - 5 }} onClick={() => setMenuOpen(false)}>
          <div style={{ position: 'absolute', top: 60, right: 16, background: T.surface, borderRadius: T.radius.card, boxShadow: '0 4px 24px rgba(0,0,0,0.15)', minWidth: 200, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            {[
              { label: 'Chia se lich trinh', action: () => { handleShare(); setMenuOpen(false); } },
              { label: 'Luu lich trinh',     action: handleSaveTrip },
              { label: 'Them thanh vien',    action: handleInviteModalOpen },
              ...(trip.status === 'completed' ? [{ label: isPublished ? 'Da publish' : 'Publish len cong dong', action: () => { setMenuOpen(false); if (!isPublished) setPublishOpen(true); } }] : []),
            ].map((item, i, arr) => (
              <button key={i} onClick={item.action}
                style={{ width: '100%', padding: '13px 16px', background: 'none', border: 'none', borderBottom: i < arr.length - 1 ? `1px solid ${T.surface2}` : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: T.text, textAlign: 'left', minHeight: 46, WebkitTapHighlightColor: 'transparent' }}>
                {item.label}
                {item.label.includes('Chia se') && shareCopied && <span style={{ fontSize: 11, color: T.success, marginLeft: 'auto' }}>Da copy</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Invite Modal ── */}
      {inviteModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: Z.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setInviteModalOpen(false)}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'relative', width: '100%', maxWidth: 480, maxHeight: '90dvh', overflowY: 'auto', background: T.surface, borderRadius: T.radius.sheet }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 14px', borderBottom: `1px solid ${T.border}` }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Moi ban dong hanh</span>
              <button onClick={() => setInviteModalOpen(false)} style={{ background: 'none', border: 'none', color: T.textDim, cursor: 'pointer', fontSize: 20, padding: 4 }}>✕</button>
            </div>
            <div style={{ padding: '16px 20px' }}>
              {/* Tab selector */}
              <div style={{ display: 'flex', gap: 0, marginBottom: 16, background: T.surface2, padding: 3, borderRadius: T.radius.btn }}>
                {(['link', 'email'] as const).map(tab => (
                  <button key={tab} onClick={() => setInviteTab(tab)}
                    style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', background: inviteTab === tab ? T.surface : 'transparent', color: inviteTab === tab ? T.accent : T.textSub, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.12s', boxShadow: inviteTab === tab ? '0 1px 4px rgba(0,0,0,0.06)' : 'none', minHeight: 36 }}>
                    {tab === 'link' ? 'Link moi' : 'Qua email'}
                  </button>
                ))}
              </div>

              {inviteTab === 'link' && (
                <div>
                  {inviteLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <Shimmer w="100%" h={44} radius={T.radius.btn} />
                      <Shimmer w="60%" h={13} />
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                        <input readOnly value={inviteLink} style={{ ...inSt, flex: 1 }} />
                        <button onClick={handleCopyInviteLink}
                          style={{ padding: '0 16px', borderRadius: T.radius.btn, border: 'none', background: shareCopied ? T.success : T.accent, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0, minHeight: 44, transition: 'background 0.12s' }}>
                          {shareCopied ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <div style={{ fontSize: 12, color: T.textDim }}>Chia se link nay de ban be tham gia lich trinh.</div>
                    </>
                  )}
                </div>
              )}

              {inviteTab === 'email' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={lbSt}>Email nguoi dung</label>
                    <input type="email" placeholder="email@example.com" value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)} style={inSt} />
                  </div>
                  <div>
                    <label style={lbSt}>Quyen han</label>
                    <select value={inviteRole} onChange={e => setInviteRole(e.target.value as 'editor' | 'viewer')}
                      style={{ ...inSt, cursor: 'pointer' }}>
                      <option value="viewer">Nguoi xem - chi xem lich trinh</option>
                      <option value="editor">Bien tap vien - co the chinh sua</option>
                    </select>
                  </div>
                  {inviteMsg && (
                    <div style={{ fontSize: 12, fontWeight: 500, color: inviteMsg.type === 'success' ? T.success : T.danger, background: inviteMsg.type === 'success' ? T.successBg : T.dangerBg, border: `1px solid ${inviteMsg.type === 'success' ? 'rgba(13,148,136,0.2)' : 'rgba(220,38,38,0.15)'}`, borderRadius: 8, padding: '8px 12px' }}>
                      {inviteMsg.text}
                    </div>
                  )}
                  <button onClick={handleInviteByEmail} disabled={inviting || !inviteEmail.trim()}
                    style={{ width: '100%', padding: '12px', borderRadius: T.radius.btn, border: 'none', background: (inviting || !inviteEmail.trim()) ? T.surface2 : T.accent, color: (inviting || !inviteEmail.trim()) ? T.textDim : '#fff', fontSize: 14, fontWeight: 700, cursor: (inviting || !inviteEmail.trim()) ? 'not-allowed' : 'pointer', minHeight: 46 }}>
                    {inviting ? 'Dang moi...' : 'Gui loi moi'}
                  </button>
                </div>
              )}

              <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${T.surface2}` }}>
                <button onClick={() => { setInviteModalOpen(false); handleMoreSelect('members'); }}
                  style={{ width: '100%', padding: '11px', borderRadius: T.radius.btn, border: `1px solid ${T.border}`, background: T.surface2, color: T.text, fontSize: 13, fontWeight: 600, cursor: 'pointer', minHeight: 42 }}>
                  Xem danh sach thanh vien
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
