'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { PREFERENCES, formatCurrency } from '@/lib/utils';

interface NominatimResult {
  place_id: number;
  display_name: string;
}

const TRANSPORT_MODES = [
  { value: 'motorbike', label: '🛵 Xe máy' },
  { value: 'car',       label: '🚗 Ô tô' },
  { value: 'bus',       label: '🚌 Xe buýt' },
  { value: 'plane',     label: '✈️ Máy bay' },
  { value: 'train',     label: '🚂 Tàu hỏa' },
  { value: 'mixed',     label: '🔀 Kết hợp' },
];

const ACCOMMODATION_TYPES = [
  { value: 'hotel',    label: '🏨 Khách sạn',  desc: 'Tiện nghi đầy đủ' },
  { value: 'homestay', label: '🏡 Homestay',   desc: 'Gần gũi, địa phương' },
  { value: 'hostel',   label: '🛏 Hostel',     desc: 'Tiết kiệm, giao lưu' },
  { value: 'resort',   label: '🌴 Resort',     desc: 'Nghỉ dưỡng cao cấp' },
  { value: 'airbnb',   label: '🏠 Airbnb',     desc: 'Căn hộ riêng' },
  { value: 'villa',    label: '🏰 Villa',      desc: 'Biệt thự riêng' },
];

const TRAVEL_TYPES = [
  { value: 'solo',   label: '🧍 Solo',      desc: 'Một mình' },
  { value: 'couple', label: '👫 Cặp đôi',   desc: 'Lãng mạn' },
  { value: 'family', label: '👨‍👩‍👧 Gia đình', desc: 'Có trẻ em' },
  { value: 'group',  label: '👥 Nhóm bạn',  desc: 'Vui vẻ' },
];

const TRENDING = ['Hà Nội', 'Paris', 'Đà Nẵng', 'Tokyo', 'Phú Quốc'];

const D = {
  bg: '#f8fafc', surface: '#ffffff', surface2: '#f1f5f9',
  border: 'rgba(0,0,0,0.06)', border2: '#e2e8f0',
  text: '#1e293b', textMuted: '#64748b', textDim: '#94a3b8',
  accent: '#4f6ef7', accentBg: 'rgba(79,110,247,0.08)',
};

export default function CreateTripPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    destination: '',
    origin: '',
    start_date: '',
    duration_days: 7,
    budget: 5000000,
    budget_input: '5000000',    // controlled text input for manual entry
    num_people: 2,
    travel_type: '',
    transport_mode: '',
    accommodation_type: '',
    accommodation_area: '',
    arrival_time: '14:00',
    preferences: [] as string[],
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Destination autocomplete state
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const destDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Origin autocomplete state
  const [originSuggestions, setOriginSuggestions] = useState<NominatimResult[]>([]);
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const originDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const today = new Date().toISOString().split('T')[0];

  // ── Destination autocomplete — Nominatim (OpenStreetMap) ──────────────
  const handleDestinationChange = (value: string) => {
    setForm(f => ({ ...f, destination: value }));
    if (destDebounce.current) clearTimeout(destDebounce.current);
    if (value.length < 2) { setSuggestions([]); return; }
    destDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&format=json&limit=5&accept-language=vi`,
          { headers: { 'User-Agent': 'TripAI-App/1.0' } },
        );
        const data: NominatimResult[] = await res.json();
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
      } catch {}
    }, 400);
  };

  // ── Origin autocomplete — Nominatim (OpenStreetMap) ────────────────────
  const handleOriginChange = (value: string) => {
    setForm(f => ({ ...f, origin: value }));
    if (originDebounce.current) clearTimeout(originDebounce.current);
    if (value.length < 2) { setOriginSuggestions([]); return; }
    originDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&format=json&limit=5&accept-language=vi`,
          { headers: { 'User-Agent': 'TripAI-App/1.0' } },
        );
        const data: NominatimResult[] = await res.json();
        setOriginSuggestions(data);
        setShowOriginSuggestions(data.length > 0);
      } catch {}
    }, 400);
  };

  // ── Budget manual input ───────────────────────────
  const handleBudgetInput = (raw: string) => {
    // Strip non-numeric except digits
    const digits = raw.replace(/\D/g, '');
    const num = digits === '' ? 0 : parseInt(digits, 10);
    setForm(f => ({ ...f, budget: num, budget_input: digits }));
  };

  // ── End-date helper ───────────────────────────────
  const handleEndDate = (endVal: string) => {
    if (!form.start_date || !endVal) return;
    const start = new Date(form.start_date);
    const end   = new Date(endVal);
    const diff  = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    if (diff >= 1 && diff <= 30) setForm(f => ({ ...f, duration_days: diff }));
  };

  const endDateValue = form.start_date && form.duration_days
    ? new Date(new Date(form.start_date).getTime() + (form.duration_days - 1) * 86400000)
        .toISOString().split('T')[0]
    : '';

  const togglePref = (v: string) =>
    setForm(f => ({
      ...f,
      preferences: f.preferences.includes(v)
        ? f.preferences.filter(p => p !== v)
        : [...f.preferences, v],
    }));

  // ── Validation ────────────────────────────────────
  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.destination.trim()) e.destination = 'Vui lòng nhập điểm đến';
    if (!form.start_date)         e.start_date = 'Vui lòng chọn ngày khởi hành';
    else if (form.start_date < today) e.start_date = 'Ngày bắt đầu phải từ hôm nay trở đi';
    if (form.duration_days < 1 || form.duration_days > 30) e.duration_days = 'Số ngày phải từ 1 đến 30';
    if (form.budget <= 0)         e.budget = 'Ngân sách phải là số dương';
    if (form.num_people < 1 || form.num_people > 20) e.num_people = 'Số người phải từ 1 đến 20';
    if (form.arrival_time && !/^\d{2}:\d{2}$/.test(form.arrival_time))
      e.arrival_time = 'Giờ đến phải theo định dạng HH:MM';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        destination:        form.destination,
        origin:             form.origin || undefined,
        start_date:         form.start_date,
        duration_days:      form.duration_days,
        budget:             form.budget,
        num_people:         form.num_people,
        travel_type:        form.travel_type || undefined,
        transport_mode:     form.transport_mode || undefined,
        accommodation_type: form.accommodation_type || undefined,
        accommodation_area: form.accommodation_area || undefined,
        arrival_time:       form.arrival_time || undefined,
        preferences:        form.preferences.length ? form.preferences : undefined,
        notes:              form.notes || undefined,
      };
      // Dùng timeout 60s riêng cho request tạo trip (backend có thể cold start trên Render)
      const { data } = await api.post('/trips', payload, { timeout: 60000 });
      // Redirect ngay sang trang detail — trang đó sẽ tự poll status và hiện loading
      router.push(`/trips/${data.trip_id}`);
    } catch (err: unknown) {
      console.error('[CreateTrip] submit error:', err);
      const apiErr = err as { response?: { status?: number; data?: { errors?: Record<string, string[]>; message?: string } }; code?: string; message?: string };

      // Timeout hoặc network error — request có thể đã gửi thành công
      // Kiểm tra xem có trip_id không trước khi báo lỗi
      if (apiErr.code === 'ECONNABORTED' || apiErr.code === 'ERR_NETWORK' || apiErr.message?.includes('timeout')) {
        setErrors({ _global: 'Server đang khởi động, vui lòng thử lại sau vài giây.' });
        return;
      }

      const apiErrors = apiErr.response?.data?.errors;
      if (apiErrors) {
        const flat: Record<string, string> = {};
        Object.entries(apiErrors).forEach(([k, v]) => { flat[k] = v[0]; });
        setErrors(flat);
      } else {
        const msg = apiErr.response?.data?.message || apiErr.message || 'Có lỗi xảy ra, vui lòng thử lại.';
        setErrors({ _global: msg });
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Preview helpers ───────────────────────────────
  const endDateDisplay = form.start_date
    ? new Date(new Date(form.start_date).getTime() + (form.duration_days - 1) * 86400000)
        .toLocaleDateString('vi-VN', { day: '2-digit', month: 'short' })
    : null;
  const startFmt = form.start_date
    ? new Date(form.start_date).toLocaleDateString('vi-VN', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;

  // Progress: destination + start_date + budget > 0 + preferences
  const progressFields = [
    !!form.destination,
    !!form.start_date,
    form.budget > 0,
    form.preferences.length > 0,
  ];
  const progressPct = Math.round((progressFields.filter(Boolean).length / progressFields.length) * 100);

  const travelTypeLabel = TRAVEL_TYPES.find(t => t.value === form.travel_type)?.label ?? '';

  return (
    <div style={{ minHeight: '100vh', background: D.bg, color: D.text, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(16px, 4vw, 36px) clamp(16px, 4vw, 24px) 60px' }}>

        {/* Page header */}
        <div className="create-header" style={{ marginBottom: 32 }}>
          <h1 style={{ fontWeight: 800, color: D.text, letterSpacing: '-1.5px', margin: '0 0 6px' }}>
            Đi đâu tiếp theo?
          </h1>
          <p style={{ fontSize: 15, color: D.textMuted, margin: 0 }}>
            Trip AI sẽ kiến tạo hành trình hoàn hảo cho bạn trong vài giây.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {errors._global && (
            <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 10, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', fontSize: 13 }}>
              ⚠️ {errors._global}
            </div>
          )}
          <div className="create-layout">

            {/* ── LEFT COLUMN ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* ─── Step 1 — Destination + Origin ─── */}
              <div style={{ background: D.surface, border: `1px solid ${D.border2}`, borderRadius: 16, padding: '24px 24px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <SectionHeader step={1} title="Chọn điểm đến & xuất phát" />

                {/* Destination */}
                <label style={labelStyle}>Điểm đến</label>
                <div style={{ position: 'relative', marginBottom: 14 }}>
                  <Prefix>🔍</Prefix>
                  <input
                    value={form.destination}
                    onChange={e => handleDestinationChange(e.target.value)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    autoComplete="off"
                    placeholder="Tìm thành phố, quốc gia hoặc vùng..."
                    style={inputStyle(!!errors.destination, true)}
                  />
                  {errors.destination && <FieldError>{errors.destination}</FieldError>}
                  {showSuggestions && suggestions.length > 0 && (
                    <AutocompleteDropdown
                      items={suggestions}
                      onSelect={name => { setForm(f => ({ ...f, destination: name })); setShowSuggestions(false); }}
                    />
                  )}
                </div>

                {/* Trending chips */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: D.textDim, textTransform: 'uppercase', letterSpacing: 1 }}>Xu hướng:</span>
                  {TRENDING.map(t => (
                    <button key={t} type="button" onClick={() => setForm(f => ({ ...f, destination: t }))}
                      style={chipStyle}>
                      {t === 'Tokyo' ? '🇯🇵' : t === 'Paris' ? '🇫🇷' : '🇻🇳'} {t}
                    </button>
                  ))}
                </div>

                {/* Origin */}
                <label style={labelStyle}>Điểm xuất phát <Opt /></label>
                <div style={{ position: 'relative' }}>
                  <Prefix>📍</Prefix>
                  <input
                    value={form.origin}
                    onChange={e => handleOriginChange(e.target.value)}
                    onBlur={() => setTimeout(() => setShowOriginSuggestions(false), 200)}
                    autoComplete="off"
                    placeholder="Bạn đang ở đâu? (để Trip AI ước tính chi phí di chuyển)"
                    style={inputStyle(false, true)}
                  />
                  {showOriginSuggestions && originSuggestions.length > 0 && (
                    <AutocompleteDropdown
                      items={originSuggestions}
                      onSelect={name => { setForm(f => ({ ...f, origin: name })); setShowOriginSuggestions(false); }}
                    />
                  )}
                </div>
              </div>


              {/* ─── Step 2 — Dates ─── */}
              <div style={{ background: D.surface, border: `1px solid ${D.border2}`, borderRadius: 16, padding: '24px 24px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <SectionHeader step={2} title="Khi nào bạn đi?" />
                <div className="create-dates-grid">
                  {/* Start date */}
                  <div>
                    <label style={labelStyle}>Ngày khởi hành</label>
                    <div style={{ position: 'relative' }}>
                      <Prefix>📅</Prefix>
                      <input type="date" min={today} value={form.start_date}
                        onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                        style={inputStyle(!!errors.start_date, true, { colorScheme: 'light' })} />
                    </div>
                    {errors.start_date && <FieldError>{errors.start_date}</FieldError>}
                  </div>

                  {/* End date — tính ngược ra duration_days */}
                  <div>
                    <label style={labelStyle}>Ngày kết thúc</label>
                    <div style={{ position: 'relative' }}>
                      <Prefix>📅</Prefix>
                      <input type="date"
                        min={form.start_date || today}
                        value={endDateValue}
                        onChange={e => handleEndDate(e.target.value)}
                        style={inputStyle(!!errors.duration_days, true, { colorScheme: 'light' })} />
                    </div>
                    {errors.duration_days && <FieldError>{errors.duration_days}</FieldError>}
                  </div>
                </div>

                {/* Duration badge — readonly, tự tính */}
                {form.duration_days > 0 && form.start_date && endDateValue && (
                  <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 99, background: 'rgba(79,110,247,0.08)', border: `1px solid rgba(79,110,247,0.3)` }}>
                    <span style={{ fontSize: 13 }}>🗓</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#4f6ef7' }}>{form.duration_days} ngày</span>
                  </div>
                )}
              </div>

              {/* ─── Step 3 — Accommodation ─── */}
              <div style={{ background: D.surface, border: `1px solid ${D.border2}`, borderRadius: 16, padding: '24px 24px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <SectionHeader step={3} title="Chỗ ở & Giờ đến"
                  sub="Trip AI dùng thông tin này làm điểm xuất phát mỗi ngày để tính lộ trình tối ưu" />

                <label style={labelStyle}>Loại chỗ ở</label>
                <div className="create-accom-grid">
                  {ACCOMMODATION_TYPES.map(a => {
                    const active = form.accommodation_type === a.value;
                    return (
                      <button key={a.value} type="button"
                        onClick={() => setForm(f => ({ ...f, accommodation_type: f.accommodation_type === a.value ? '' : a.value }))}
                        style={cardToggleStyle(active)}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: active ? '#4f6ef7' : D.text, marginBottom: 2 }}>{a.label}</div>
                        <div style={{ fontSize: 11, color: D.textDim }}>{a.desc}</div>
                      </button>
                    );
                  })}
                </div>

                <div className="create-accom-bottom">
                  <div>
                    <label style={labelStyle}>
                      Khu vực / tên chỗ ở <Opt />
                    </label>
                    <input value={form.accommodation_area}
                      onChange={e => setForm(f => ({ ...f, accommodation_area: e.target.value }))}
                      placeholder="VD: Phố cổ Hà Nội, gần biển Mỹ Khê..."
                      style={inputStyle(false)} />
                  </div>
                  <div>
                    <label style={labelStyle}>Giờ đến nơi</label>
                    <input type="time" value={form.arrival_time}
                      onChange={e => setForm(f => ({ ...f, arrival_time: e.target.value }))}
                      onBlur={e => {
                        if (e.target.value && !/^\d{2}:\d{2}$/.test(e.target.value))
                          setErrors(prev => ({ ...prev, arrival_time: 'Giờ đến phải theo định dạng HH:MM' }));
                        else
                          setErrors(prev => { const n = { ...prev }; delete n.arrival_time; return n; });
                      }}
                      style={{ ...inputStyle(!!errors.arrival_time), width: 120, colorScheme: 'light' as React.CSSProperties['colorScheme'] }} />
                    {errors.arrival_time && <FieldError>{errors.arrival_time}</FieldError>}
                  </div>
                </div>

                {/* <div style={{ marginTop: 14, padding: '10px 13px', background: 'rgba(79,110,247,0.08)', border: '1px solid rgba(79,110,247,0.2)', borderRadius: 10, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>💡</span>
                  <p style={{ fontSize: 12, color: D.textMuted, margin: 0, lineHeight: 1.6 }}>
                    AI sẽ chọn {form.accommodation_type ? ACCOMMODATION_TYPES.find(a => a.value === form.accommodation_type)?.label : 'chỗ ở'} phù hợp ngân sách, rồi tính khoảng cách từ đó đến từng điểm tham quan mỗi ngày.
                  </p>
                </div> */}
              </div>


              {/* ─── Step 4 — Traveler Details ─── */}
              <div style={{ background: D.surface, border: `1px solid ${D.border2}`, borderRadius: 16, padding: '24px 24px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <SectionHeader step={4} title="Chi tiết hành khách" />

                {/* Travel type */}
                <div style={{ marginBottom: 18 }}>
                  <label style={labelStyle}>Loại chuyến đi <Opt /></label>
                  <div className="create-travel-type">
                    {TRAVEL_TYPES.map(t => {
                      const active = form.travel_type === t.value;
                      return (
                        <button key={t.value} type="button"
                          onClick={() => {
                            const next = form.travel_type === t.value ? '' : t.value;
                            // Auto-set số người hợp lý khi chọn loại
                            const autoNum = next === 'solo' ? 1 : next === 'couple' ? 2 : form.num_people < 2 ? 2 : form.num_people;
                            setForm(f => ({ ...f, travel_type: next, num_people: autoNum }));
                          }}
                          style={cardToggleStyle(active)}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: active ? '#4f6ef7' : D.text, marginBottom: 2 }}>{t.label}</div>
                          <div style={{ fontSize: 11, color: D.textDim }}>{t.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Số hành khách — chỉ hiện khi family/group hoặc chưa chọn */}
                <div style={{ display: 'grid', gridTemplateColumns: (form.travel_type === 'solo' || form.travel_type === 'couple') ? '1fr' : '1fr 1fr', gap: 24 }}
                  className={`create-budget-row ${(form.travel_type === '' || form.travel_type === 'family' || form.travel_type === 'group') ? 'has-people' : 'no-people'}`}>
                  {(form.travel_type === '' || form.travel_type === 'family' || form.travel_type === 'group') && (
                    <div>
                      <label style={labelStyle}>Số hành khách</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <button type="button"
                          onClick={() => setForm(f => ({ ...f, num_people: Math.max(form.travel_type === 'family' ? 2 : 3, f.num_people - 1) }))}
                          style={counterBtnStyle}>−</button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 18 }}>{'👤'.repeat(Math.min(form.num_people, 4))}</span>
                          <span style={{ fontSize: 15, fontWeight: 700, color: D.text }}>{form.num_people} người</span>
                        </div>
                        <button type="button"
                          onClick={() => setForm(f => ({ ...f, num_people: Math.min(20, f.num_people + 1) }))}
                          style={counterBtnStyle}>+</button>
                      </div>
                      {errors.num_people && <FieldError>{errors.num_people}</FieldError>}
                    </div>
                  )}

                  {/* Budget — manual input */}
                  <div>
                    <label style={labelStyle}>Ngân sách (VNĐ)</label>
                    <div style={{ position: 'relative' }}>
                      <Prefix>💰</Prefix>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={form.budget_input === '' ? '' : Number(form.budget_input).toLocaleString('vi-VN')}
                        onChange={e => handleBudgetInput(e.target.value)}
                        placeholder="VD: 5,000,000"
                        style={inputStyle(!!errors.budget, true)}
                      />
                    </div>
                    {errors.budget
                      ? <FieldError>{errors.budget}</FieldError>
                      : form.budget > 0 && (
                        <p style={{ fontSize: 12, color: '#10b981', marginTop: 5 }}>
                          ≈ {formatCurrency(form.budget / form.num_people)} / người
                        </p>
                      )
                    }
                  </div>
                </div>

                {/* Transport */}
                <div style={{ marginTop: 18 }}>
                  <label style={labelStyle}>Phương tiện di chuyển <Opt /></label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {TRANSPORT_MODES.map(m => (
                      <button key={m.value} type="button"
                        onClick={() => setForm(f => ({ ...f, transport_mode: f.transport_mode === m.value ? '' : m.value }))}
                        style={toggleChipStyle(form.transport_mode === m.value)}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>


              {/* ─── Step 5 — Interests ─── */}
              <div style={{ background: D.surface, border: `1px solid ${D.border2}`, borderRadius: 16, padding: '24px 24px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <SectionHeader step={5} title="Sở thích & Phong cách" />

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                  {PREFERENCES.map(p => {
                    const active = form.preferences.includes(p.value);
                    return (
                      <button key={p.value} type="button" onClick={() => togglePref(p.value)}
                        style={{
                          padding: '8px 16px', borderRadius: 99, fontSize: 13,
                          fontWeight: active ? 600 : 400, cursor: 'pointer',
                          border: `1px solid ${active ? D.accent : D.border2}`,
                          background: active ? D.accentBg : D.surface2,
                          color: active ? D.accent : D.textMuted,
                          transition: 'all 0.15s',
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                        }}>
                        <span style={{ fontSize: 15 }}>{p.label.split(' ')[0]}</span>
                        <span>{p.label.split(' ').slice(1).join(' ') || p.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div>
                  <label style={labelStyle}>Ghi chú thêm cho Trip AI <Opt /></label>
                  <textarea rows={3} maxLength={1000} value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Mô tả yêu cầu đặc biệt, hạn chế ăn uống, mong muốn cụ thể..."
                    style={{ width: '100%', boxSizing: 'border-box', resize: 'none', background: '#f8fafc', border: `1px solid #e2e8f0`, borderRadius: 10, padding: '10px 13px', fontSize: 13, color: '#1e293b', outline: 'none', lineHeight: 1.6 }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {['✨ Chill vibes', '👨‍👩‍👧 Gia đình', '🎒 Phượt thủ'].map(tag => (
                        <button key={tag} type="button"
                          onClick={() => setForm(f => ({ ...f, notes: f.notes ? f.notes + ' ' + tag : tag }))}
                          style={chipStyle}>
                          {tag}
                        </button>
                      ))}
                    </div>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>{form.notes.length}/1000</span>
                  </div>
                </div>
              </div>

              {/* ─── Submit ─── */}
              <div>
                <button type="submit" disabled={loading}
                  style={{ width: '100%', padding: '15px', borderRadius: 12, border: 'none', background: loading ? '#93a5fb' : D.accent, color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: '-0.2px' }}>
                  {loading ? (
                    <>
                      <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      Đang gửi yêu cầu...
                    </>
                  ) : (
                    <>✦ Tạo lịch trình với Trip AI</>
                  )}
                </button>
                <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 10 }}>
                  Thời gian tạo ước tính: 15–45 giây
                </p>
              </div>
            </div>


            {/* ── RIGHT COLUMN — Preview Panel ── */}
            <div className="create-preview">

              {/* Map preview */}
              <div style={{ background: D.surface, border: `1px solid ${D.border2}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ position: 'relative', height: 180, background: 'linear-gradient(135deg, #0a1628 0%, #0d1f3c 50%, #091420 100%)', overflow: 'hidden' }}>
                  <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.15 }}>
                    {[...Array(7)].map((_, i) => <line key={`h${i}`} x1="0" y1={`${i * 16}%`} x2="100%" y2={`${i * 16}%`} stroke="#4f6ef7" strokeWidth="0.5" />)}
                    {[...Array(10)].map((_, i) => <line key={`v${i}`} x1={`${i * 11}%`} y1="0" x2={`${i * 11}%`} y2="100%" stroke="#4f6ef7" strokeWidth="0.5" />)}
                    <polyline points="60,140 130,90 220,60 300,110 360,40" fill="none" stroke="#4f6ef7" strokeWidth="2" strokeDasharray="6,3" opacity="0.8" />
                  </svg>
                  <div style={{ position: 'absolute', left: '50%', top: '40%', transform: 'translate(-50%,-50%)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)', background: '#4f6ef7', border: '2px solid rgba(255,255,255,0.4)', boxShadow: '0 0 16px rgba(79,110,247,0.7)' }} />
                  </div>
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
                        {startFmt ? `${startFmt}${endDateDisplay ? ` — ${endDateDisplay}` : ''}` : 'Chọn ngày đi'} · {form.num_people} người
                        {travelTypeLabel && ` · ${travelTypeLabel}`}
                      </p>
                    </div>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: D.accentBg, border: `1px solid ${D.border2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🗺</div>
                  </div>

                  {/* Progress bar — fixed max 100% */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 11, color: D.textMuted }}>Thông tin cần thiết</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: D.accent }}>{progressPct}%</span>
                    </div>
                    <div style={{ height: 4, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: 'linear-gradient(90deg, #4f6ef7, #06b6d4)', borderRadius: 99, width: `${progressPct}%`, transition: 'width 0.4s ease' }} />
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                    <div style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 12px' }}>
                      <div style={{ fontSize: 10, color: D.textDim, marginBottom: 3 }}>Ngân sách</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: D.text }}>{formatCurrency(form.budget)}</div>
                    </div>
                    <div style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 12px' }}>
                      <div style={{ fontSize: 10, color: D.textDim, marginBottom: 3 }}>Mỗi người</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: D.text }}>
                        {form.num_people > 0 ? formatCurrency(form.budget / form.num_people) : '—'}
                      </div>
                    </div>
                  </div>

                  {/* Accommodation row */}
                  <div style={{ background: '#f8fafc', borderRadius: 10, padding: '9px 12px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 15 }}>
                      {ACCOMMODATION_TYPES.find(a => a.value === form.accommodation_type)?.label.split(' ')[0] || '🏨'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, color: D.textDim }}>Điểm gốc mỗi ngày</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: D.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {form.accommodation_type
                          ? ACCOMMODATION_TYPES.find(a => a.value === form.accommodation_type)?.label
                          : 'Trip AI tự chọn chỗ ở'}
                        {form.accommodation_area && <span style={{ color: D.textMuted, fontWeight: 400 }}> · {form.accommodation_area}</span>}
                      </div>
                    </div>
                    {form.arrival_time && (
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 10, color: D.textDim }}>Đến lúc</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>{form.arrival_time}</div>
                      </div>
                    )}
                  </div>

                  {/* Day preview */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {Array.from({ length: Math.min(form.duration_days, 3) }, (_, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: i === 2 ? '#cbd5e1' : D.accent, flexShrink: 0 }} />
                        <span style={{ color: i === 2 ? '#94a3b8' : D.textMuted }}>
                          {i === 2 && form.duration_days > 3 ? `+ ${form.duration_days - 2} ngày nữa...` : `Ngày ${i + 1}: ${form.destination ? form.destination.split(',')[0] : '—'}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* AI suggestion card */}
              <div style={{ background: D.surface, border: '1px solid rgba(79,110,247,0.3)', borderRadius: 14, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: D.accentBg, border: `1px solid ${D.border2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>✦</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#4f6ef7', marginBottom: 4 }}>Gợi ý từ Trip AI</div>
                  <p style={{ fontSize: 12, color: D.textMuted, margin: 0, lineHeight: 1.6 }}>
                    {form.destination && form.accommodation_type
                      ? `Trip AI sẽ chọn ${ACCOMMODATION_TYPES.find(a => a.value === form.accommodation_type)?.label} tại ${form.destination.split(',')[0]}${form.accommodation_area ? ` (${form.accommodation_area})` : ''} làm điểm gốc${form.origin ? `, tính chi phí từ ${form.origin.split(',')[0]}` : ''}.`
                      : form.destination
                      ? 'Chọn loại chỗ ở để Trip AI tính lộ trình tối ưu từ điểm xuất phát mỗi ngày.'
                      : 'Nhập điểm đến và Trip AI sẽ phân tích thời tiết, chọn chỗ ở phù hợp, rồi tối ưu lộ trình từng ngày.'}
                  </p>
                </div>
              </div>
            </div>

          </div>
        </form>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input[type=date]::-webkit-calendar-picker-indicator,
        input[type=time]::-webkit-calendar-picker-indicator { cursor: pointer; }
        input::placeholder, textarea::placeholder { color: #94a3b8; }
        input[type=range] { height: 4px; }

        /* ── Responsive ── */
        .create-layout {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 24px;
          align-items: start;
        }
        .create-preview {
          position: sticky;
          top: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .create-header {
          margin-bottom: 32px;
        }
        .create-header h1 {
          font-size: 36px;
        }
        .create-dates-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        .create-accom-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 16px;
        }
        .create-accom-bottom {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 12px;
          align-items: end;
        }
        .create-travel-type {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }
        .create-budget-row {
          display: grid;
          gap: 24px;
        }
        .create-budget-row.has-people {
          grid-template-columns: 1fr 1fr;
        }
        .create-budget-row.no-people {
          grid-template-columns: 1fr;
        }

        @media (max-width: 768px) {
          .create-layout {
            grid-template-columns: 1fr !important;
          }
          .create-preview {
            position: static !important;
            order: -1;
          }
          .create-header h1 {
            font-size: 26px !important;
          }
          .create-dates-grid {
            grid-template-columns: 1fr 1fr;
          }
          .create-accom-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .create-accom-bottom {
            grid-template-columns: 1fr !important;
          }
          .create-travel-type {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .create-budget-row.has-people {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 480px) {
          .create-dates-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}


// ─── Shared style helpers ─────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: '#64748b',
  display: 'block', marginBottom: 6,
};

function Opt() {
  return <span style={{ color: '#94a3b8', fontWeight: 400 }}>(tuỳ chọn)</span>;
}

function Prefix({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, pointerEvents: 'none' }}>
      {children}
    </span>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p style={{ color: '#f87171', fontSize: 12, marginTop: 5 }}>{children}</p>;
}

function inputStyle(
  hasError: boolean,
  hasPrefix = false,
  extra: React.CSSProperties = {},
): React.CSSProperties {
  return {
    width: '100%', boxSizing: 'border-box',
    background: '#f8fafc',
    border: `1px solid ${hasError ? '#f87171' : '#e2e8f0'}`,
    borderRadius: 10,
    padding: `11px 13px 11px ${hasPrefix ? '38px' : '13px'}`,
    fontSize: 14, color: '#1e293b', outline: 'none',
    ...extra,
  };
}

function cardToggleStyle(active: boolean): React.CSSProperties {
  return {
    padding: '10px 8px', borderRadius: 10,
    border: `1px solid ${active ? '#4f6ef7' : '#e2e8f0'}`,
    background: active ? 'rgba(79,110,247,0.08)' : '#f8fafc',
    cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
  };
}

function toggleChipStyle(active: boolean): React.CSSProperties {
  return {
    padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
    cursor: 'pointer',
    border: `1px solid ${active ? '#4f6ef7' : '#e2e8f0'}`,
    background: active ? 'rgba(79,110,247,0.08)' : '#f8fafc',
    color: active ? '#4f6ef7' : '#64748b',
  };
}

const chipStyle: React.CSSProperties = {
  padding: '4px 10px', borderRadius: 99, fontSize: 11,
  background: '#f1f5f9', border: '1px solid #e2e8f0',
  color: '#64748b', cursor: 'pointer',
};

const counterBtnStyle: React.CSSProperties = {
  width: 34, height: 34, borderRadius: 8,
  background: '#f1f5f9', border: '1px solid #e2e8f0',
  color: '#1e293b', fontSize: 18, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ step, title, sub }: { step: number; title: string; sub?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
      <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#4f6ef7', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {step}
      </span>
      <div>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1e293b', margin: 0 }}>{title}</h2>
        {sub && <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>{sub}</p>}
      </div>
    </div>
  );
}

function AutocompleteDropdown({
  items,
  onSelect,
}: {
  items: NominatimResult[];
  onSelect: (name: string) => void;
}) {
  return (
    <div style={{ position: 'absolute', zIndex: 20, width: '100%', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, marginTop: 4, maxHeight: 200, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
      {items.map((s, i) => {
        // Lấy tên ngắn gọn: phần trước dấu phẩy đầu tiên
        const shortName = s.display_name.split(',')[0].trim();
        return (
          <button key={`${s.place_id}-${i}`} type="button"
            onClick={() => onSelect(shortName)}
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', fontSize: 13, color: '#1e293b', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}>
            📍 {s.display_name}
          </button>
        );
      })}
    </div>
  );
}
