'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { PREFERENCES, formatCurrency } from '@/lib/utils';

interface NominatimResult { display_name: string; lat: string; lon: string; }

const TRANSPORT_MODES = [
  { value: 'motorbike', label: '🛵 Xe máy' },
  { value: 'car',       label: '🚗 Ô tô' },
  { value: 'bus',       label: '🚌 Xe buýt' },
  { value: 'plane',     label: '✈️ Máy bay' },
  { value: 'train',     label: '🚂 Tàu hỏa' },
];

const ACCOMMODATION_TYPES = [
  { value: 'hotel',    label: '🏨 Khách sạn',  desc: 'Tiện nghi đầy đủ' },
  { value: 'homestay', label: '🏡 Homestay',   desc: 'Gần gũi, địa phương' },
  { value: 'hostel',   label: '🛏 Hostel',     desc: 'Tiết kiệm, giao lưu' },
  { value: 'resort',   label: '🌴 Resort',     desc: 'Nghỉ dưỡng cao cấp' },
  { value: 'airbnb',   label: '🏠 Airbnb',     desc: 'Căn hộ riêng' },
  { value: 'villa',    label: '🏰 Villa',      desc: 'Biệt thự riêng' },
];

const TRENDING = ['Hà Nội', 'Paris', 'Đà Nẵng', 'Tokyo', 'Phú Quốc'];

const BUDGET_LEVELS = [
  { label: 'Tiết kiệm', value: 'budget' },
  { label: 'Thoải mái', value: 'comfort' },
  { label: 'Sang trọng', value: 'luxury' },
];

const D = {
  bg: '#0d1117', surface: '#161b22', surface2: '#1c2128',
  border: 'rgba(255,255,255,0.07)', border2: 'rgba(255,255,255,0.12)',
  text: '#e6edf3', textMuted: 'rgba(255,255,255,0.45)', textDim: 'rgba(255,255,255,0.22)',
  accent: '#4f6ef7', accentBg: 'rgba(79,110,247,0.12)',
};

export default function CreateTripPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    destination: '', start_date: '', duration_days: 7,
    budget: 5000000, num_people: 2, transport_mode: '',
    accommodation_type: '', accommodation_area: '', arrival_time: '14:00',
    preferences: [] as string[], notes: '',
  });
  const [budgetLevel, setBudgetLevel] = useState<'budget' | 'comfort' | 'luxury'>('comfort');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const handleDestinationChange = (value: string) => {
    setForm({ ...form, destination: value });
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 2) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&format=json&limit=5`,
          { headers: { 'Accept-Language': 'vi' } }
        );
        const data: NominatimResult[] = await res.json();
        setSuggestions(data);
        setShowSuggestions(true);
      } catch {}
    }, 300);
  };

  const togglePref = (v: string) => {
    setForm(f => ({
      ...f,
      preferences: f.preferences.includes(v) ? f.preferences.filter(p => p !== v) : [...f.preferences, v],
    }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.destination) e.destination = 'Vui lòng nhập điểm đến';
    if (!form.start_date) e.start_date = 'Vui lòng chọn ngày khởi hành';
    else if (form.start_date < today) e.start_date = 'Ngày bắt đầu phải từ hôm nay trở đi';
    if (form.duration_days < 1 || form.duration_days > 30) e.duration_days = 'Số ngày phải từ 1 đến 30';
    if (form.budget <= 0) e.budget = 'Ngân sách phải là số dương';
    if (form.num_people < 1 || form.num_people > 20) e.num_people = 'Số người phải từ 1 đến 20';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const { data } = await api.post('/trips', form);
      router.push(`/trips/${data.trip_id}`);
    } catch (err: unknown) {
      const apiErrors = (err as { response?: { data?: { errors?: Record<string, string[]> } } })?.response?.data?.errors;
      if (apiErrors) {
        const flat: Record<string, string> = {};
        Object.entries(apiErrors).forEach(([k, v]) => { flat[k] = v[0]; });
        setErrors(flat);
      }
    } finally { setLoading(false); }
  };

  // Compute end date for preview
  const endDate = form.start_date
    ? new Date(new Date(form.start_date).getTime() + (form.duration_days - 1) * 86400000)
        .toLocaleDateString('vi-VN', { day: '2-digit', month: 'short' })
    : null;
  const startFmt = form.start_date
    ? new Date(form.start_date).toLocaleDateString('vi-VN', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;

  const vibeLabel = BUDGET_LEVELS.find(b => b.value === budgetLevel)?.label ?? 'Thoải mái';
  const avgBudget = form.duration_days * form.num_people * 500000;

  return (
    <div style={{ minHeight: '100vh', background: D.bg, color: D.text, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '36px 24px 60px' }}>

        {/* Page header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: D.text, letterSpacing: '-1.5px', margin: '0 0 6px' }}>
            Đi đâu tiếp theo?
          </h1>
          <p style={{ fontSize: 15, color: D.textMuted, margin: 0 }}>
            AI của chúng tôi sẽ kiến tạo hành trình hoàn hảo cho bạn trong vài giây.
          </p>
        </div>

        {/* 2-column layout */}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }}>

            {/* ── LEFT COLUMN ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Step 1 — Destination */}
              <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 16, padding: '24px 24px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                  <span style={{ width: 28, height: 28, borderRadius: '50%', background: D.accent, color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>1</span>
                  <h2 style={{ fontSize: 17, fontWeight: 700, color: D.text, margin: 0 }}>Chọn điểm đến</h2>
                </div>

                {/* Search input */}
                <div style={{ position: 'relative', marginBottom: 14 }}>
                  <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: D.textMuted, fontSize: 15, pointerEvents: 'none' }}>🔍</div>
                  <input
                    value={form.destination}
                    onChange={e => handleDestinationChange(e.target.value)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    autoComplete="off"
                    placeholder="Tìm thành phố, quốc gia hoặc vùng..."
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      background: D.surface2, border: `1px solid ${errors.destination ? '#f87171' : D.border2}`,
                      borderRadius: 10, padding: '12px 14px 12px 42px',
                      fontSize: 14, color: D.text, outline: 'none',
                    }}
                  />
                  {errors.destination && <p style={{ color: '#f87171', fontSize: 12, marginTop: 5 }}>{errors.destination}</p>}
                  {showSuggestions && suggestions.length > 0 && (
                    <div style={{ position: 'absolute', zIndex: 20, width: '100%', background: D.surface, border: `1px solid ${D.border2}`, borderRadius: 10, marginTop: 4, maxHeight: 200, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                      {suggestions.map((s, i) => (
                        <button key={i} type="button"
                          onClick={() => { setForm({ ...form, destination: s.display_name }); setShowSuggestions(false); }}
                          style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', fontSize: 13, color: D.text, background: 'none', border: 'none', cursor: 'pointer', borderBottom: `1px solid ${D.border}` }}>
                          📍 {s.display_name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Trending chips */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: D.textDim, textTransform: 'uppercase', letterSpacing: 1 }}>Xu hướng:</span>
                  {TRENDING.map(t => (
                    <button key={t} type="button" onClick={() => setForm({ ...form, destination: t })}
                      style={{ padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 500, background: D.surface2, border: `1px solid ${D.border2}`, color: D.textMuted, cursor: 'pointer' }}>
                      {t === 'Tokyo' ? '🇯🇵' : t === 'Paris' ? '🇫🇷' : t === 'Đà Nẵng' ? '🇻🇳' : t === 'Hà Nội' ? '🇻🇳' : '🌴'} {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2 — Dates */}
              <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 16, padding: '24px 24px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                  <span style={{ width: 28, height: 28, borderRadius: '50%', background: D.accent, color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>2</span>
                  <h2 style={{ fontSize: 17, fontWeight: 700, color: D.text, margin: 0 }}>Khi nào bạn đi?</h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: D.textMuted, display: 'block', marginBottom: 6 }}>Khởi hành</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, pointerEvents: 'none' }}>📅</span>
                      <input type="date" min={today} value={form.start_date}
                        onChange={e => setForm({ ...form, start_date: e.target.value })}
                        style={{ width: '100%', boxSizing: 'border-box', background: D.surface2, border: `1px solid ${errors.start_date ? '#f87171' : D.border2}`, borderRadius: 10, padding: '11px 12px 11px 38px', fontSize: 14, color: D.text, outline: 'none', colorScheme: 'dark' }} />
                    </div>
                    {errors.start_date && <p style={{ color: '#f87171', fontSize: 12, marginTop: 4 }}>{errors.start_date}</p>}
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: D.textMuted, display: 'block', marginBottom: 6 }}>Số ngày</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, pointerEvents: 'none' }}>🗓</span>
                      <input type="number" min={1} max={30} value={form.duration_days}
                        onChange={e => setForm({ ...form, duration_days: +e.target.value })}
                        style={{ width: '100%', boxSizing: 'border-box', background: D.surface2, border: `1px solid ${errors.duration_days ? '#f87171' : D.border2}`, borderRadius: 10, padding: '11px 12px 11px 38px', fontSize: 14, color: D.text, outline: 'none' }} />
                    </div>
                    {errors.duration_days && <p style={{ color: '#f87171', fontSize: 12, marginTop: 4 }}>{errors.duration_days}</p>}
                  </div>
                </div>
              </div>

              {/* Step 3 — Accommodation */}
              <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 16, padding: '24px 24px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                  <span style={{ width: 28, height: 28, borderRadius: '50%', background: D.accent, color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>3</span>
                  <div>
                    <h2 style={{ fontSize: 17, fontWeight: 700, color: D.text, margin: 0 }}>Chỗ ở & Giờ đến</h2>
                    <p style={{ fontSize: 12, color: D.textMuted, margin: '2px 0 0' }}>AI dùng thông tin này làm điểm xuất phát mỗi ngày để tính lộ trình tối ưu</p>
                  </div>
                </div>

                {/* Accommodation type grid */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: D.textMuted, display: 'block', marginBottom: 10 }}>Loại chỗ ở</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {ACCOMMODATION_TYPES.map(a => {
                      const active = form.accommodation_type === a.value;
                      return (
                        <button key={a.value} type="button" onClick={() => setForm(f => ({ ...f, accommodation_type: f.accommodation_type === a.value ? '' : a.value }))}
                          style={{ padding: '10px 8px', borderRadius: 10, border: `1px solid ${active ? D.accent : D.border2}`, background: active ? D.accentBg : D.surface2, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: active ? '#818cf8' : D.text, marginBottom: 2 }}>{a.label}</div>
                          <div style={{ fontSize: 11, color: D.textDim }}>{a.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Area input + arrival time */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: D.textMuted, display: 'block', marginBottom: 6 }}>
                      Khu vực / tên chỗ ở <span style={{ color: D.textDim, fontWeight: 400 }}>(tuỳ chọn — AI tự chọn nếu để trống)</span>
                    </label>
                    <input value={form.accommodation_area}
                      onChange={e => setForm({ ...form, accommodation_area: e.target.value })}
                      placeholder="VD: Phố cổ Hà Nội, gần biển Mỹ Khê..."
                      style={{ width: '100%', boxSizing: 'border-box', background: D.surface2, border: `1px solid ${D.border2}`, borderRadius: 10, padding: '11px 13px', fontSize: 13, color: D.text, outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: D.textMuted, display: 'block', marginBottom: 6 }}>Giờ đến nơi</label>
                    <input type="time" value={form.arrival_time}
                      onChange={e => setForm({ ...form, arrival_time: e.target.value })}
                      style={{ background: D.surface2, border: `1px solid ${D.border2}`, borderRadius: 10, padding: '11px 13px', fontSize: 13, color: D.text, outline: 'none', colorScheme: 'dark', width: 120 }} />
                  </div>
                </div>

                {/* Info hint */}
                <div style={{ marginTop: 14, padding: '10px 13px', background: 'rgba(79,110,247,0.08)', border: '1px solid rgba(79,110,247,0.2)', borderRadius: 10, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>💡</span>
                  <p style={{ fontSize: 12, color: D.textMuted, margin: 0, lineHeight: 1.6 }}>
                    AI sẽ chọn {form.accommodation_type ? ACCOMMODATION_TYPES.find(a => a.value === form.accommodation_type)?.label : 'chỗ ở'} cụ thể phù hợp ngân sách, rồi tính khoảng cách từ đó đến từng điểm tham quan mỗi ngày.
                  </p>
                </div>
              </div>

              {/* Step 4 — Traveler Details */}
              <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 16, padding: '24px 24px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                  <span style={{ width: 28, height: 28, borderRadius: '50%', background: D.accent, color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>4</span>
                  <h2 style={{ fontSize: 17, fontWeight: 700, color: D.text, margin: 0 }}>Chi tiết hành khách</h2>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  {/* People counter */}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: D.textMuted, display: 'block', marginBottom: 10 }}>Số hành khách?</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <button type="button" onClick={() => setForm(f => ({ ...f, num_people: Math.max(1, f.num_people - 1) }))}
                        style={{ width: 34, height: 34, borderRadius: 8, background: D.surface2, border: `1px solid ${D.border2}`, color: D.text, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>−</button>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 18 }}>{'👤'.repeat(Math.min(form.num_people, 3))}</span>
                        <span style={{ fontSize: 15, fontWeight: 700, color: D.text }}>{form.num_people} người</span>
                      </div>
                      <button type="button" onClick={() => setForm(f => ({ ...f, num_people: Math.min(20, f.num_people + 1) }))}
                        style={{ width: 34, height: 34, borderRadius: 8, background: D.surface2, border: `1px solid ${D.border2}`, color: D.text, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>+</button>
                    </div>
                    {errors.num_people && <p style={{ color: '#f87171', fontSize: 12, marginTop: 4 }}>{errors.num_people}</p>}
                  </div>

                  {/* Budget slider */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: D.textMuted }}>Mức ngân sách</label>
                      <span style={{ fontSize: 12, fontWeight: 700, color: D.accent }}>{vibeLabel}</span>
                    </div>
                    <input type="range" min={0} max={2} step={1}
                      value={['budget','comfort','luxury'].indexOf(budgetLevel)}
                      onChange={e => {
                        const lvl = (['budget','comfort','luxury'] as const)[+e.target.value];
                        setBudgetLevel(lvl);
                        setForm(f => ({ ...f, budget: lvl === 'budget' ? avgBudget * 0.6 : lvl === 'luxury' ? avgBudget * 2 : avgBudget }));
                      }}
                      style={{ width: '100%', accentColor: D.accent, cursor: 'pointer' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                      {BUDGET_LEVELS.map(b => (
                        <span key={b.value} style={{ fontSize: 11, color: budgetLevel === b.value ? D.accent : D.textDim }}>{b.label}</span>
                      ))}
                    </div>
                    <p style={{ fontSize: 12, color: D.textMuted, marginTop: 8 }}>
                      Ước tính: <span style={{ color: '#34d399', fontWeight: 600 }}>{formatCurrency(form.budget)}</span>
                    </p>
                    {errors.budget && <p style={{ color: '#f87171', fontSize: 12, marginTop: 2 }}>{errors.budget}</p>}
                  </div>
                </div>

                {/* Transport */}
                <div style={{ marginTop: 18 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: D.textMuted, display: 'block', marginBottom: 8 }}>Phương tiện di chuyển</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {TRANSPORT_MODES.map(m => (
                      <button key={m.value} type="button" onClick={() => setForm(f => ({ ...f, transport_mode: f.transport_mode === m.value ? '' : m.value }))}
                        style={{ padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: `1px solid ${form.transport_mode === m.value ? D.accent : D.border2}`, background: form.transport_mode === m.value ? D.accentBg : D.surface2, color: form.transport_mode === m.value ? '#818cf8' : D.textMuted }}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Step 5 — Interests */}
              <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 16, padding: '24px 24px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                  <span style={{ width: 28, height: 28, borderRadius: '50%', background: D.accent, color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>5</span>
                  <h2 style={{ fontSize: 17, fontWeight: 700, color: D.text, margin: 0 }}>Sở thích & Phong cách</h2>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 10, marginBottom: 18 }}>
                  {PREFERENCES.map(p => {
                    const active = form.preferences.includes(p.value);
                    return (
                      <button key={p.value} type="button" onClick={() => togglePref(p.value)}
                        style={{ padding: '14px 8px', borderRadius: 12, border: `1px solid ${active ? D.accent : D.border2}`, background: active ? D.accentBg : D.surface2, color: active ? '#818cf8' : D.textMuted, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: active ? 600 : 400, transition: 'all 0.15s' }}>
                        <span style={{ fontSize: 22 }}>{p.label.split(' ')[0]}</span>
                        <span>{p.label.split(' ').slice(1).join(' ') || p.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: D.textMuted, display: 'block', marginBottom: 6 }}>Ghi chú tùy chỉnh AI</label>
                  <textarea rows={3} maxLength={500} value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                    placeholder="Mô tả chuyến đi mơ ước của bạn..."
                    style={{ width: '100%', boxSizing: 'border-box', resize: 'none', background: D.surface2, border: `1px solid ${D.border2}`, borderRadius: 10, padding: '10px 13px', fontSize: 13, color: D.text, outline: 'none', lineHeight: 1.6 }} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    {['✨ Chill vibes', '👨‍👩‍👧 Gia đình', '🎒 Phượt thủ'].map(tag => (
                      <button key={tag} type="button" onClick={() => setForm(f => ({ ...f, notes: f.notes ? f.notes + ' ' + tag : tag }))}
                        style={{ padding: '4px 10px', borderRadius: 99, fontSize: 11, background: D.surface, border: `1px solid ${D.border2}`, color: D.textMuted, cursor: 'pointer' }}>
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div>
                <button type="submit" disabled={loading}
                  style={{ width: '100%', padding: '15px', borderRadius: 12, border: 'none', background: loading ? 'rgba(79,110,247,0.5)' : D.accent, color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: '-0.2px' }}>
                  {loading ? (
                    <>
                      <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      AI đang tạo lịch trình...
                    </>
                  ) : (
                    <>✦ Tạo lịch trình với AI</>
                  )}
                </button>
                <p style={{ textAlign: 'center', fontSize: 12, color: D.textDim, marginTop: 10 }}>
                  Thời gian tạo ước tính: 15–30 giây
                </p>
              </div>
            </div>

            {/* ── RIGHT COLUMN — Preview Panel ── */}
            <div style={{ position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Map preview card */}
              <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 16, overflow: 'hidden' }}>
                {/* Map area */}
                <div style={{ position: 'relative', height: 180, background: 'linear-gradient(135deg, #0a1628 0%, #0d1f3c 50%, #091420 100%)', overflow: 'hidden' }}>
                  <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.15 }}>
                    {[...Array(7)].map((_, i) => (
                      <line key={`h${i}`} x1="0" y1={`${i * 16}%`} x2="100%" y2={`${i * 16}%`} stroke="#4f6ef7" strokeWidth="0.5" />
                    ))}
                    {[...Array(10)].map((_, i) => (
                      <line key={`v${i}`} x1={`${i * 11}%`} y1="0" x2={`${i * 11}%`} y2="100%" stroke="#4f6ef7" strokeWidth="0.5" />
                    ))}
                    <polyline points="60,140 130,90 220,60 300,110 360,40" fill="none" stroke="#4f6ef7" strokeWidth="2" strokeDasharray="6,3" opacity="0.8" />
                  </svg>
                  {/* Pin */}
                  <div style={{ position: 'absolute', left: '50%', top: '40%', transform: 'translate(-50%,-50%)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)', background: '#4f6ef7', border: '2px solid rgba(255,255,255,0.4)', boxShadow: '0 0 16px rgba(79,110,247,0.7)' }} />
                  </div>
                  {/* Live badge */}
                  <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 99, padding: '4px 12px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: 1.5, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    {form.destination ? `📍 ${form.destination.split(',')[0]}` : 'Chọn điểm đến...'}
                  </div>
                </div>

                {/* Trip summary */}
                <div style={{ padding: '16px 18px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: D.textDim, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>Tóm tắt chuyến đi</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <h3 style={{ fontSize: 22, fontWeight: 800, color: D.text, margin: '0 0 3px', letterSpacing: '-0.5px' }}>
                        {form.destination ? form.destination.split(',')[0] : 'Điểm đến'}
                      </h3>
                      <p style={{ fontSize: 12, color: D.textMuted, margin: 0 }}>
                        {startFmt ? `${startFmt}${endDate ? ` — ${endDate}` : ''}` : 'Chọn ngày đi'} · {form.num_people} người
                      </p>
                    </div>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: D.accentBg, border: `1px solid ${D.border2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🗺</div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 11, color: D.textMuted }}>AI Logic Loading</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: D.accent }}>
                        {Math.min(100, [form.destination, form.start_date, form.num_people > 1].filter(Boolean).length * 33 + (form.preferences.length > 0 ? 1 : 0))}%
                      </span>
                    </div>
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: `linear-gradient(90deg, #4f6ef7, #06b6d4)`, borderRadius: 99, width: `${Math.min(100, [form.destination, form.start_date, form.num_people > 1].filter(Boolean).length * 33 + (form.preferences.length > 0 ? 1 : 0))}%`, transition: 'width 0.4s ease' }} />
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                    <div style={{ background: D.surface2, borderRadius: 10, padding: '10px 12px' }}>
                      <div style={{ fontSize: 10, color: D.textDim, marginBottom: 3 }}>Ngân sách</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: D.text }}>{formatCurrency(form.budget)}</div>
                    </div>
                    <div style={{ background: D.surface2, borderRadius: 10, padding: '10px 12px' }}>
                      <div style={{ fontSize: 10, color: D.textDim, marginBottom: 3 }}>Phong cách</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: D.text }}>{vibeLabel}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>

                  {/* Accommodation preview row */}
                  <div style={{ background: D.surface2, borderRadius: 10, padding: '9px 12px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 15 }}>
                      {ACCOMMODATION_TYPES.find(a => a.value === form.accommodation_type)?.label.split(' ')[0] || '🏨'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, color: D.textDim }}>Điểm gốc mỗi ngày</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: D.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {form.accommodation_type
                          ? ACCOMMODATION_TYPES.find(a => a.value === form.accommodation_type)?.label
                          : 'AI tự chọn chỗ ở'}
                        {form.accommodation_area && <span style={{ color: D.textMuted, fontWeight: 400 }}> · {form.accommodation_area}</span>}
                      </div>
                    </div>
                    {form.arrival_time && (
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 10, color: D.textDim }}>Đến lúc</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#34d399' }}>{form.arrival_time}</div>
                      </div>
                    )}
                  </div>

                  {/* Day preview */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {Array.from({ length: Math.min(form.duration_days, 3) }, (_, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: i === 2 ? D.textDim : D.accent, flexShrink: 0 }} />
                        <span style={{ color: i === 2 ? D.textDim : D.textMuted }}>
                          {i === 2 ? 'AI đang tạo thêm...' : `Ngày ${i + 1}: ${form.destination ? form.destination.split(',')[0] : '—'}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* AI Suggestion card */}
              <div style={{ background: D.surface, border: `1px solid rgba(79,110,247,0.3)`, borderRadius: 14, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: D.accentBg, border: `1px solid ${D.border2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>📍</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#818cf8', marginBottom: 4 }}>Gợi ý AI</div>
                  <p style={{ fontSize: 12, color: D.textMuted, margin: 0, lineHeight: 1.6 }}>
                    {form.destination && form.accommodation_type
                      ? `AI sẽ chọn ${ACCOMMODATION_TYPES.find(a => a.value === form.accommodation_type)?.label} tại ${form.destination.split(',')[0]}${form.accommodation_area ? ` (${form.accommodation_area})` : ''} làm điểm gốc, rồi tối ưu lộ trình từng ngày từ đó.`
                      : form.destination
                      ? `Chọn loại chỗ ở để AI tính lộ trình tối ưu từ điểm xuất phát mỗi ngày.`
                      : 'Nhập điểm đến và AI sẽ phân tích thời tiết, chọn chỗ ở phù hợp, rồi tối ưu lộ trình từng ngày.'}
                  </p>
                </div>
              </div>
            </div>

          </div>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0.5); cursor: pointer; }
        input::placeholder { color: rgba(255,255,255,0.25); }
        textarea::placeholder { color: rgba(255,255,255,0.25); }
        input[type=range] { height: 4px; }
      `}</style>
    </div>
  );
}