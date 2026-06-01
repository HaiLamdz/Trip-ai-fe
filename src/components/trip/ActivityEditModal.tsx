'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

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
    if (!form.title.trim()) e.title = 'Bắt buộc';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = { ...form };
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

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 520, background: D.surface, border: `1px solid ${D.border2}`, borderRadius: 18, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${D.border}` }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: D.text, margin: 0 }}>
            {isEdit ? '✏️ Chỉnh sửa hoạt động' : '➕ Thêm hoạt động'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: D.textMuted, cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 4 }}>✕</button>
        </div>

        {/* Form */}
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
              <label style={labelStyle}>Tên địa điểm (để search Google Maps)</label>
              <input value={form.place_name} onChange={e => set('place_name', e.target.value)}
                placeholder="VD: Phở Bát Đàn, 49 Bát Đàn, Hoàn Kiếm, Hà Nội"
                style={inputStyle} />
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

            {/* Row: transport + distance */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 12 }}>
              <div>
                <label style={labelStyle}>Di chuyển đến điểm tiếp theo</label>
                <input value={form.transport_to_next} onChange={e => set('transport_to_next', e.target.value)}
                  placeholder="VD: Đi bộ, Grab xe máy..."
                  style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Khoảng cách (km)</label>
                <input type="number" min={0} step={0.1} value={form.distance_to_next_km}
                  onChange={e => set('distance_to_next_km', +e.target.value)} style={inputStyle} />
              </div>
            </div>

            {/* Row: lat + lng */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Vĩ độ (latitude)</label>
                <input type="number" step="any" value={form.latitude ?? ''}
                  onChange={e => set('latitude', e.target.value ? +e.target.value : null)}
                  placeholder="VD: 21.0285" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Kinh độ (longitude)</label>
                <input type="number" step="any" value={form.longitude ?? ''}
                  onChange={e => set('longitude', e.target.value ? +e.target.value : null)}
                  placeholder="VD: 105.8542" style={inputStyle} />
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
              {saving ? 'Đang lưu…' : isEdit ? 'Lưu thay đổi' : 'Thêm hoạt động'}
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
