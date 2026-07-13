'use client';

import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';

/* ─── Nominatim (OpenStreetMap) Autocomplete ─────────────────────────── */
interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

function PlaceAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  hasError,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (name: string) => void;
  placeholder?: string;
  hasError?: boolean;
}) {
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (v: string) => {
    onChange(v);
    if (debounce.current) clearTimeout(debounce.current);
    if (v.length < 2) { setSuggestions([]); setShow(false); return; }
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        // Nominatim OpenStreetMap geocoding — miễn phí, không cần API key
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(v)}&format=json&limit=5&accept-language=vi`,
          { headers: { 'User-Agent': 'TripAI-App/1.0' } },
        );
        const data: NominatimResult[] = await res.json();
        setSuggestions(data);
        setShow(data.length > 0);
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    }, 400);
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 15, pointerEvents: 'none' }}>📍</span>
        <input
          autoFocus
          value={value}
          onChange={e => handleChange(e.target.value)}
          onBlur={() => setTimeout(() => setShow(false), 200)}
          onFocus={() => { if (suggestions.length > 0) setShow(true); }}
          autoComplete="off"
          placeholder={placeholder ?? 'Nhập tên địa điểm...'}
          style={{
            ...inputStyle,
            paddingLeft: 36,
            fontSize: 15,
            borderColor: hasError ? D.error : D.border2,
          }}
        />
        {loading && (
          <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
            <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.15)', borderTopColor: D.accent, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          </span>
        )}
      </div>

      {show && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', zIndex: 50, width: '100%', background: '#161b22',
          border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, marginTop: 4,
          maxHeight: 220, overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          {suggestions.map((s, i) => (
            <button
              key={s.place_id} type="button"
              onMouseDown={e => {
                e.preventDefault();
                // Lấy tên ngắn gọn từ display_name (phần đầu trước dấu phẩy đầu tiên)
                const shortName = s.display_name.split(',')[0].trim();
                onSelect(shortName);
                setShow(false);
                setSuggestions([]);
              }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '10px 14px', fontSize: 13, color: '#e6edf3',
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: i < suggestions.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
              }}
            >
              📍 {s.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export interface ActivityFormData {
  time: string;
  title: string;
  description: string;
  place_name: string;
  place_type: string;
  estimated_cost: number;
  duration_minutes: number;
  transport_to_next: string;
  distance_to_next_km: number;
  latitude: number | null;
  longitude: number | null;
}

interface Props {
  tripId: number;
  dayId: number;
  placeId?: number;          // undefined = add mode
  initial?: Partial<ActivityFormData>;
  onSaved: (place: ActivityFormData & { id?: number }) => void;
  onClose: () => void;
}

const PLACE_TYPES = [
  { value: 'food',       label: '🍽 Ăn uống' },
  { value: 'cafe',       label: '☕ Cafe' },
  { value: 'attraction', label: '🏛 Tham quan' },
  { value: 'hotel',      label: '🏨 Lưu trú' },
  { value: 'transport',  label: '🚗 Di chuyển' },
  { value: 'shopping',   label: '🛍 Mua sắm' },
  { value: 'nightlife',  label: '🌙 Về đêm' },
  { value: 'other',      label: '📍 Khác' },
];

const EMPTY: ActivityFormData = {
  time: '09:00', title: '', description: '', place_name: '',
  place_type: 'attraction', estimated_cost: 0,
  duration_minutes: 60, transport_to_next: '', distance_to_next_km: 0,
  latitude: null, longitude: null,
};

const D = {
  bg: '#0d1117', surface: '#161b22', surface2: '#1c2128',
  border: 'rgba(255,255,255,0.08)', border2: 'rgba(255,255,255,0.14)',
  text: '#e6edf3', textMuted: 'rgba(255,255,255,0.45)',
  accent: '#4f6ef7', error: '#f87171',
};

export default function ActivityEditModal({ tripId, dayId, placeId, initial, onSaved, onClose }: Props) {
  const [form, setForm] = useState<ActivityFormData>({ ...EMPTY, ...initial });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isEdit = !!placeId;

  useEffect(() => {
    setForm({ ...EMPTY, ...initial });
  }, [initial]);

  const set = (key: keyof ActivityFormData, val: string | number | null) =>
    setForm(f => ({ ...f, [key]: val }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.time) e.time = 'Bắt buộc';
    if (!form.place_name.trim()) e.place_name = 'Bắt buộc';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      // Khi thêm mới: chỉ gửi place_name + time + place_type, backend tự geocode & dùng place_name làm title
      // Khi sửa: gửi toàn bộ form để giữ nguyên các trường đã có
      const payload = isEdit ? { ...form } : {
        time:       form.time,
        place_name: form.place_name.trim(),
        place_type: form.place_type,
      };

      let res;
      if (isEdit) {
        res = await api.put(`/trips/${tripId}/days/${dayId}/places/${placeId}`, payload);
      } else {
        res = await api.post(`/trips/${tripId}/days/${dayId}/places`, payload);
      }
      onSaved(res.data.place);
    } catch {
      setErrors({ _: 'Lưu thất bại, vui lòng thử lại.' });
    } finally {
      setSaving(false);
    }
  };

  // ─── Chế độ thêm mới: form tối giản ──────────────────────────────
  if (!isEdit) {
    return (
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
        onClick={onClose}
      >
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)' }} />
        <div
          style={{ position: 'relative', background: D.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 'env(safe-area-inset-bottom, 20px)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Handle bar */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
            <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.12)' }} />
          </div>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 16px' }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: D.text, margin: 0 }}>➕ Thêm địa điểm</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: D.textMuted, cursor: 'pointer', fontSize: 22, lineHeight: 1, padding: 4 }}>✕</button>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Tên địa điểm */}
              <div>
                <label style={labelStyle}>Tên địa điểm *</label>
                <PlaceAutocomplete
                  value={form.place_name}
                  onChange={v => set('place_name', v)}
                  onSelect={v => set('place_name', v)}
                  placeholder="VD: Phở Bát Đàn, Hồ Hoàn Kiếm..."
                  hasError={!!errors.place_name}
                />
                {errors.place_name && <p style={errStyle}>{errors.place_name}</p>}
                <p style={{ fontSize: 11, color: D.textMuted, marginTop: 4 }}>
                  Nhập đủ tên để bản đồ tự định vị chính xác hơn
                </p>
              </div>

              {/* Giờ đến */}
              <div>
                <label style={labelStyle}>Giờ đến *</label>
                <input
                  type="time"
                  value={form.time}
                  onChange={e => set('time', e.target.value)}
                  style={{ ...inputStyle, colorScheme: 'dark', borderColor: errors.time ? D.error : D.border2 }}
                />
                {errors.time && <p style={errStyle}>{errors.time}</p>}
              </div>

              {/* Loại địa điểm */}
              <div>
                <label style={labelStyle}>Loại</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {PLACE_TYPES.map(t => (
                    <button
                      key={t.value} type="button"
                      onClick={() => set('place_type', t.value)}
                      style={{
                        padding: '10px 4px', borderRadius: 12,
                        border: form.place_type === t.value ? `1.5px solid ${D.accent}` : `1px solid ${D.border}`,
                        background: form.place_type === t.value ? 'rgba(79,110,247,0.12)' : D.surface2,
                        color: form.place_type === t.value ? '#818cf8' : D.textMuted,
                        cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                      }}
                    >
                      <span style={{ fontSize: 18 }}>{t.label.split(' ')[0]}</span>
                      <span style={{ fontSize: 10, fontWeight: 600 }}>{t.label.slice(t.label.indexOf(' ') + 1)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {errors._ && <p style={{ ...errStyle, textAlign: 'center' }}>{errors._}</p>}

              <button
                type="submit" disabled={saving}
                style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: saving ? 'rgba(79,110,247,0.4)' : D.accent, color: '#fff', fontSize: 15, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', marginTop: 4 }}
              >
                {saving ? 'Đang thêm…' : 'Thêm vào lịch trình'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ─── Chế độ chỉnh sửa: form đầy đủ (giữ nguyên cho power user) ───
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 520, background: D.surface, border: `1px solid ${D.border2}`, borderRadius: 18, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${D.border}` }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: D.text, margin: 0 }}>✏️ Chỉnh sửa hoạt động</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: D.textMuted, cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 4 }}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '70vh', overflowY: 'auto' }}>

            {/* Row: time + type */}
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Giờ *</label>
                <input type="time" value={form.time} onChange={e => set('time', e.target.value)}
                  style={{ ...inputStyle, borderColor: errors.time ? D.error : D.border2, colorScheme: 'dark' }} />
                {errors.time && <p style={errStyle}>{errors.time}</p>}
              </div>
              <div>
                <label style={labelStyle}>Loại địa điểm</label>
                <select value={form.place_type} onChange={e => set('place_type', e.target.value)} style={inputStyle}>
                  {PLACE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>

            {/* Title */}
            <div>
              <label style={labelStyle}>Tiêu đề *</label>
              <input value={form.title} onChange={e => set('title', e.target.value)}
                placeholder="VD: Ăn sáng Phở Bát Đàn"
                style={{ ...inputStyle, borderColor: errors.title ? D.error : D.border2 }} />
              {errors.title && <p style={errStyle}>{errors.title}</p>}
            </div>

            {/* Place name */}
            <div>
              <label style={labelStyle}>Tên địa điểm</label>
              <PlaceAutocomplete
                value={form.place_name}
                onChange={v => set('place_name', v)}
                onSelect={v => set('place_name', v)}
                placeholder="VD: Phở Bát Đàn, 49 Bát Đàn, Hoàn Kiếm"
              />
            </div>

            {/* Description */}
            <div>
              <label style={labelStyle}>Mô tả</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)}
                rows={2} placeholder="Ghi chú thêm..."
                style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }} />
            </div>

            {/* Row: cost + duration */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Chi phí ước tính (VND)</label>
                <input type="number" min={0} step={10000} value={form.estimated_cost}
                  onChange={e => set('estimated_cost', +e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Thời gian (phút)</label>
                <input type="number" min={0} step={15} value={form.duration_minutes}
                  onChange={e => set('duration_minutes', +e.target.value)} style={inputStyle} />
              </div>
            </div>

            {errors._ && <p style={{ ...errStyle, textAlign: 'center' }}>{errors._}</p>}
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', gap: 10, padding: '14px 20px', borderTop: `1px solid ${D.border}` }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: '10px', borderRadius: 10, background: D.surface2, border: `1px solid ${D.border2}`, color: D.textMuted, fontSize: 14, cursor: 'pointer' }}>
              Hủy
            </button>
            <button type="submit" disabled={saving}
              style={{ flex: 2, padding: '10px', borderRadius: 10, background: saving ? 'rgba(79,110,247,0.5)' : D.accent, border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600,
  color: 'rgba(255,255,255,0.45)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5,
};
const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: '#1c2128', border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 9, padding: '9px 12px', fontSize: 13,
  color: '#e6edf3', outline: 'none',
};
const errStyle: React.CSSProperties = { color: '#f87171', fontSize: 11, marginTop: 3 };
