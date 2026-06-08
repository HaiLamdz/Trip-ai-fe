'use client';

import { useRef, useState } from 'react';
import api from '@/lib/api';

export interface CheckinData {
  id: number;
  trip_id: number;
  checked_in_at: string;
  checkin_photo: string | null;
  checkin_photo_url: string | null;
  checkin_note: string | null;
  actual_time: string | null;
  place_name: string;
  title: string;
  latitude: number | null;
  longitude: number | null;
}

interface ExpensePayload {
  amount: number;
  category: string;
  note: string;
  paid_by: string;
  expense_date: string;
  trip_place_id: number;
}

interface Props {
  tripId: number;
  place: {
    id: number;
    title: string;
    place_name: string;
    place_type: string;
    time: string;
    checked_in_at?: string | null;
    checkin_photo_url?: string | null;
    checkin_note?: string | null;
    actual_time?: string | null;
  };
  onSaved: (updated: CheckinData) => void;
  onClose: () => void;
}

const D = {
  bg: '#f8fafc', surface: '#ffffff', surface2: '#f1f5f9',
  border: 'rgba(0,0,0,0.06)', border2: '#e2e8f0',
  text: '#1e293b', textMuted: '#64748b', textDim: '#94a3b8',
  accent: '#4f6ef7', accentBg: 'rgba(79,110,247,0.08)',
  green: '#10b981', greenBg: 'rgba(16,185,129,0.1)',
};

const EXPENSE_CATEGORIES = [
  { value: 'food',          label: '🍜 Ăn uống' },
  { value: 'transport',     label: '🚗 Di chuyển' },
  { value: 'attraction',    label: '🏛️ Tham quan' },
  { value: 'accommodation', label: '🏨 Lưu trú' },
  { value: 'shopping',      label: '🛍️ Mua sắm' },
  { value: 'other',         label: '📦 Khác' },
];

export default function CheckinModal({ tripId, place, onSaved, onClose }: Props) {
  const isCheckedIn = !!place.checked_in_at;

  // Check-in state
  const [note, setNote]                   = useState(place.checkin_note ?? '');
  const [actualTime, setActualTime]       = useState(place.actual_time ?? place.time ?? '');
  const [photoFile, setPhotoFile]         = useState<File | null>(null);
  const [photoPreview, setPhotoPreview]   = useState<string | null>(place.checkin_photo_url ?? null);
  const [saving, setSaving]               = useState(false);
  const fileInputRef                      = useRef<HTMLInputElement>(null);

  // Expense state
  const today = new Date().toISOString().split('T')[0];
  const [expenses, setExpenses]           = useState<ExpensePayload[]>([]);
  const [addingExp, setAddingExp]         = useState(false);
  const [expForm, setExpForm]             = useState<ExpensePayload>({
    amount: 0, category: 'food', note: '', paid_by: '',
    expense_date: today, trip_place_id: place.id,
  });

  /* ── Photo helpers ── */
  const handlePhoto = (file: File | null) => {
    setPhotoFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = e => setPhotoPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPhotoPreview(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) handlePhoto(file);
  };

  /* ── Expense helpers ── */
  const addExpense = () => {
    if (expForm.amount <= 0) return;
    setExpenses(prev => [...prev, { ...expForm }]);
    setExpForm({ amount: 0, category: 'food', note: '', paid_by: '', expense_date: today, trip_place_id: place.id });
    setAddingExp(false);
  };

  const removeExpense = (idx: number) =>
    setExpenses(prev => prev.filter((_, i) => i !== idx));

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);

  /* ── Submit ── */
  const handleSubmit = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      if (photoFile)    formData.append('photo', photoFile);
      if (note)         formData.append('note', note);
      if (actualTime)   formData.append('actual_time', actualTime);

      const { data } = await api.post(
        `/trips/${tripId}/places/${place.id}/checkin`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );

      // Lưu expenses song song
      await Promise.all(expenses.map(exp => api.post(`/trips/${tripId}/expenses`, exp)));

      onSaved(data.place as CheckinData);
    } catch { /* user can retry */ }
    finally { setSaving(false); }
  };

  /* ── UI ── */
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      {/* Backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }} />

      {/* Panel */}
      <div
        style={{
          position: 'relative', width: '100%', maxWidth: 520,
          maxHeight: '92vh', overflowY: 'auto',
          background: '#fff', border: '1px solid #e2e8f0',
          borderRadius: 18, boxShadow: '0 8px 40px rgba(0,0,0,0.15)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 14px', borderBottom: '1px solid #f1f5f9' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>📍</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>
                {isCheckedIn ? 'Cập nhật Check-in' : 'Check-in địa điểm'}
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 3, paddingLeft: 26 }}>{place.title}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 4 }}>✕</button>
        </div>

        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ── Giờ thực tế ── */}
          <div>
            <label style={labelSt}>⏰ Giờ thực tế đến nơi</label>
            <input
              type="time" value={actualTime}
              onChange={e => setActualTime(e.target.value)}
              style={{ ...inputSt, colorScheme: 'dark' }}
            />
            {place.time && actualTime !== place.time && (
              <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 4 }}>
                Kế hoạch: {place.time}
              </div>
            )}
          </div>

          {/* ── Upload ảnh ── */}
          <div>
            <label style={labelSt}>📷 Ảnh check-in</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              style={{
                border: `2px dashed ${photoPreview ? D.accent : '#e2e8f0'}`,
                borderRadius: 12, cursor: 'pointer', overflow: 'hidden', minHeight: 110,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: photoPreview ? 'transparent' : '#f8fafc', position: 'relative',
              }}
            >
              {photoPreview ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoPreview} alt="preview" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }} />
                  <button
                    onClick={e => { e.stopPropagation(); handlePhoto(null); }}
                    style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >✕</button>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 16px', color: '#94a3b8' }}>
                  <div style={{ fontSize: 26, marginBottom: 6 }}>🖼️</div>
                  <div style={{ fontSize: 13 }}>Nhấn hoặc kéo thả ảnh vào đây</div>
                  <div style={{ fontSize: 11, marginTop: 3 }}>JPG, PNG, WEBP · Tối đa 8MB</div>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => handlePhoto(e.target.files?.[0] ?? null)} />
          </div>

          {/* ── Ghi chú ── */}
          <div>
            <label style={labelSt}>📝 Ghi chú</label>
            <textarea
              value={note} onChange={e => setNote(e.target.value)}
              rows={3}
              placeholder="Địa điểm tuyệt vời, lần sau nhớ đặt bàn trước..."
              style={{ ...inputSt, resize: 'none', lineHeight: 1.6 }}
            />
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ padding: '14px 20px 18px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: '11px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', fontSize: 14, cursor: 'pointer' }}>
            Hủy
          </button>
          <button onClick={handleSubmit} disabled={saving}
            style={{
              flex: 2, padding: '11px', borderRadius: 10, border: 'none',
              background: saving ? '#e2e8f0' : '#10b981',
              color: saving ? '#94a3b8' : '#fff',
              fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
            {saving ? (
              <>
                <span style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,0.15)', borderTopColor: '#64748b', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                Đang lưu…
              </>
            ) : (
              <>
                {isCheckedIn ? '✓ Cập nhật' : '📍 Check-in'}
                {expenses.length > 0 && ` + ${expenses.length} chi phí`}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Shared styles ── */
const labelSt: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: '#64748b',
  display: 'block', marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.5,
};
const inputSt: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: '#f8fafc', border: '1px solid #e2e8f0',
  borderRadius: 10, padding: '9px 13px',
  fontSize: 13, color: '#1e293b', outline: 'none',
};
