'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import api from '@/lib/api';
import { useTripStatus } from '@/hooks/useTripStatus';
import { formatCurrency, formatDate } from '@/lib/utils';
import ActivityCard from '@/components/trip/ActivityCard';
import CostSplit from '@/components/trip/CostSplit';
import DayCostBreakdown from '@/components/trip/DayCostBreakdown';
import ActivityEditModal from '@/components/trip/ActivityEditModal';

const TripMap = dynamic(() => import('@/components/trip/TripMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center" style={{ background: '#161b22' }}>
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

interface Activity {
  id?: number;
  time: string; title: string; description: string;
  place_name: string; place_type: string;
  estimated_cost: number; duration_minutes: number;
  transport_to_next: string | null; distance_to_next_km: number;
  latitude: number | null; longitude: number | null;
  sort_order: number;
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
  duration_days: number;
  budget: number;           // ngân sách kế hoạch người dùng nhập (số thực)
  budget_data: TripBudgetData | null;  // TripBudget model — chi phí thực tế từ AI
  num_people: number; status: string; days: TripDay[];
  user_notes: string | null;
  preferences: string[];
}
interface PackingItem { name: string; quantity: string; essential: boolean; note?: string; }
interface PackingCategory { name: string; emoji: string; items: PackingItem[]; }
interface PackingListData { categories: PackingCategory[]; tips: string[]; }
interface ChatMessage { role: 'user' | 'ai'; content: string; }

const WEATHER_ICONS: Record<string, string> = {
  '01d': '☀️', '02d': '⛅', '03d': '☁️', '04d': '☁️',
  '09d': '🌧️', '10d': '🌦️', '11d': '⛈️', '13d': '❄️', '50d': '🌫️',
};
const DAY_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
const CHAT_LIMIT = 50;

const D = {
  bg: '#0d1117', surface: '#161b22', surface2: '#1c2128',
  border: 'rgba(255,255,255,0.07)', border2: 'rgba(255,255,255,0.12)',
  text: '#e6edf3', textMuted: 'rgba(255,255,255,0.45)', textDim: 'rgba(255,255,255,0.25)',
  accent: '#4f6ef7', accentBg: 'rgba(79,110,247,0.12)',
};

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [leftTab, setLeftTab] = useState<'timeline' | 'packing'>('timeline');
  const [activeDay, setActiveDay] = useState<number>(1);
  const [activePlace, setActivePlace] = useState<Activity | null>(null);
  const [notes, setNotes] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [packingData, setPackingData] = useState<PackingListData | null>(null);
  const [packingLoading, setPackingLoading] = useState(false);
  const [packingLoaded, setPackingLoaded] = useState(false);
  const [packingChecked, setPackingChecked] = useState<Set<string>>(new Set());
  const [costSplitOpen, setCostSplitOpen] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [addActivityOpen, setAddActivityOpen] = useState(false);
  // AI Chat popup
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatCount, setChatCount] = useState(0);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const isProcessing = trip?.status === 'processing' || (!trip && loading);
  const { status: pollStatus } = useTripStatus(id, isProcessing);

  const fetchTrip = useCallback(async () => {
    try {
      const { data } = await api.get(`/trips/${id}`);
      setTrip(data.trip);
      setNotes(data.trip?.user_notes ?? '');
      if (data.trip?.days?.length > 0) setActiveDay(data.trip.days[0].day_number);
    } catch { router.push('/dashboard'); }
    finally { setLoading(false); }
  }, [id, router]);

  // Initial load
  useEffect(() => { fetchTrip(); }, [fetchTrip]);

  // When poll detects completed/failed → reload full trip data
  useEffect(() => {
    if (pollStatus?.status === 'completed' || pollStatus?.status === 'failed') {
      fetchTrip();
    }
  }, [pollStatus?.status, fetchTrip]);

  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const handleNotesChange = (val: string) => {
    setNotes(val); setNotesSaved(false);
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(async () => {
      if (!trip) return;
      setNotesSaving(true);
      try { await api.put(`/trips/${trip.id}/notes`, { notes: val }); setNotesSaved(true); setTimeout(() => setNotesSaved(false), 2000); }
      catch { /* ignore */ } finally { setNotesSaving(false); }
    }, 1500);
  };

  const handleSavePlace = async (place: Activity) => {
    try { await api.post('/places/save', { place_name: place.place_name, place_type: place.place_type, latitude: place.latitude, longitude: place.longitude }); }
    catch { /* ignore */ }
  };

  // Update a single activity in state
  const handleActivityUpdated = (dayId: number, updated: Activity) => {
    setTrip(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        days: prev.days.map(d =>
          d.id === dayId
            ? { ...d, places: d.places.map(p => (p.id === updated.id ? { ...p, ...updated } : p)) }
            : d
        ),
      };
    });
  };

  // Remove a single activity from state
  const handleActivityDeleted = (dayId: number, placeId: number) => {
    setTrip(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        days: prev.days.map(d =>
          d.id === dayId
            ? { ...d, places: d.places.filter(p => p.id !== placeId) }
            : d
        ),
      };
    });
  };

  // Add a new activity to state
  const handleActivityAdded = (dayId: number, newPlace: Activity) => {
    setTrip(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        days: prev.days.map(d =>
          d.id === dayId
            ? { ...d, places: [...d.places, newPlace].sort((a, b) => a.time.localeCompare(b.time)) }
            : d
        ),
      };
    });
  };

  const handleShare = async () => {
    if (!trip) return;
    setShareLoading(true);
    try {
      const { data } = await api.post(`/trips/${trip.id}/share`);
      if (data.share_url) { await navigator.clipboard.writeText(data.share_url).catch(() => {}); setShareCopied(true); setTimeout(() => setShareCopied(false), 3000); }
    } catch { /* ignore */ } finally { setShareLoading(false); }
  };

  const handleSwitchTab = (tab: 'timeline' | 'packing') => {
    setLeftTab(tab);
    if (tab === 'packing' && !packingLoaded && trip) {
      setPackingLoading(true);
      api.get(`/trips/${trip.id}/packing-list`)
        .then(({ data }) => setPackingData(data.packing_list))
        .catch(() => setPackingData(null))
        .finally(() => { setPackingLoading(false); setPackingLoaded(true); });
    }
  };

  const togglePackingItem = (key: string) => {
    setPackingChecked(prev => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; });
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading || chatCount >= CHAT_LIMIT || !trip) return;
    const msg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: msg }]);
    setChatLoading(true);
    try {
      const { data } = await api.post(`/trips/${trip.id}/chat`, { message: msg });
      setChatMessages(prev => [...prev, { role: 'ai', content: data.message }]);
      setChatCount(data.chat_count || chatCount + 1);
      if (data.updated_timeline?.days) setTrip(prev => prev ? { ...prev, days: data.updated_timeline.days } : prev);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setChatMessages(prev => [...prev, { role: 'ai', content: status === 429 ? 'Đã đạt giới hạn chỉnh sửa.' : 'Đã có lỗi xảy ra.' }]);
    } finally { setChatLoading(false); }
  };

  // ── Loading states ────────────────────────────────────────────────────────
  if (loading || trip?.status === 'processing') {
    const isCompleted = pollStatus?.status === 'completed';
    const isFailed    = pollStatus?.status === 'failed';

    // Tính progress dựa trên elapsed time (ước lượng 60s cho trip 4 ngày)
    // Dùng animated CSS thay vì JS timer cho smooth effect

    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: D.bg, fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        <style>{`
          @keyframes pulse-bot {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.08); }
          }
          @keyframes progress-indeterminate {
            0%   { left: -40%; width: 40%; }
            50%  { left: 20%;  width: 60%; }
            100% { left: 100%; width: 40%; }
          }
          @keyframes progress-fill {
            from { width: 5%; }
            to   { width: 92%; }
          }
          @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(12px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes dot-bounce {
            0%, 80%, 100% { transform: translateY(0); }
            40%           { transform: translateY(-8px); }
          }
        `}</style>

        <div style={{
          textAlign: 'center', maxWidth: 420, padding: '0 24px', width: '100%',
          animation: 'fade-in-up 0.5s ease both',
        }}>
          {/* Robot icon */}
          <div style={{
            fontSize: 72, marginBottom: 28, lineHeight: 1,
            animation: isCompleted ? 'none' : 'pulse-bot 2s ease-in-out infinite',
            filter: isCompleted ? 'drop-shadow(0 0 24px rgba(52,211,153,0.5))' : 'drop-shadow(0 0 20px rgba(79,110,247,0.4))',
          }}>
            🤖
          </div>

          {/* Title */}
          <h2 style={{
            fontSize: 26, fontWeight: 800, color: D.text,
            letterSpacing: '-0.8px', margin: '0 0 10px',
          }}>
            {isCompleted
              ? '✅ Lịch trình đã sẵn sàng!'
              : isFailed
                ? '😞 Tạo lịch trình thất bại'
                : 'AI đang tạo lịch trình'}
          </h2>

          {/* Subtitle */}
          <p style={{ fontSize: 15, color: D.textMuted, margin: '0 0 32px', lineHeight: 1.6 }}>
            {isCompleted
              ? 'Đang tải chi tiết lịch trình...'
              : isFailed
                ? 'Đã xảy ra lỗi. Vui lòng thử lại.'
                : (pollStatus?.progress_message || 'Đang phân tích điểm đến và lên kế hoạch…')}
          </p>

          {/* Progress bar */}
          {!isFailed && (
            <div style={{
              position: 'relative', width: '100%', height: 4,
              background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden',
              marginBottom: 16,
            }}>
              {isCompleted ? (
                /* Full bar khi xong */
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(90deg, #34d399, #4f6ef7)',
                  borderRadius: 99, transition: 'width 0.5s ease',
                }} />
              ) : (
                /* Indeterminate animation khi đang chạy */
                <div style={{
                  position: 'absolute', top: 0, bottom: 0,
                  background: 'linear-gradient(90deg, transparent, #4f6ef7, #818cf8, transparent)',
                  borderRadius: 99,
                  animation: 'progress-indeterminate 1.8s ease-in-out infinite',
                }} />
              )}
            </div>
          )}

          {/* Step dots */}
          {!isCompleted && !isFailed && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 20 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: D.accent, opacity: 0.7,
                  animation: `dot-bounce 1.4s ease-in-out ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
          )}

          <p style={{ fontSize: 13, color: D.textDim, margin: 0 }}>
            {isCompleted
              ? 'Chuyển trang trong giây lát...'
              : isFailed
                ? ''
                : 'Thường mất 20–60 giây tùy số ngày'}
          </p>

          {/* Failed action */}
          {isFailed && (
            <button
              onClick={() => router.push('/trips/create')}
              style={{
                marginTop: 24, padding: '11px 28px', borderRadius: 10,
                border: 'none', background: D.accent, color: '#fff',
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Tạo lại lịch trình
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!trip) return null;

  const allPlaces = trip.days.flatMap(d => d.places.map(p => ({ ...p, day: d.day_number })));
  const currentDay = trip.days.find(d => d.day_number === activeDay);
  const dayTotalCost = (day: TripDay) => day.places.reduce((s, p) => s + (Number(p.estimated_cost) || 0), 0);
  const tripBudget = Number(trip.budget) || 0;
  // Tổng chi phí thực tế từ AI (TripBudget model), fallback về ngân sách kế hoạch
  const totalEstimated = Number(trip.budget_data?.total_estimated) || tripBudget;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: D.bg }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: `1px solid ${D.border}`, flexShrink: 0 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
            <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: D.textMuted, cursor: 'pointer', fontSize: 18, padding: 0, lineHeight: 1 }}>←</button>
            <h1 style={{ fontSize: 19, fontWeight: 700, color: D.text, letterSpacing: '-0.4px', margin: 0 }}>{trip.destination}</h1>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 13, color: D.textMuted, paddingLeft: 28 }}>
            <span>{formatDate(trip.start_date)}</span>
            <span style={{ color: D.border2 }}>·</span>
            <span>{trip.duration_days} ngày</span>
            <span style={{ color: D.border2 }}>·</span>
            <span>{trip.num_people} người</span>
            <span style={{ color: D.border2 }}>·</span>
            <span>{formatCurrency(tripBudget)}</span>
            {totalEstimated > 0 && totalEstimated !== tripBudget && (
              <>
                <span style={{ color: D.border2 }}>·</span>
                <span style={{ color: totalEstimated > tripBudget ? '#f87171' : '#34d399' }}>
                  {formatCurrency(totalEstimated)} thực tế
                </span>
              </>
            )}
          </div>
        </div>  

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Share */}
          <button onClick={handleShare} disabled={shareLoading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: `1px solid ${D.border2}`, background: 'transparent', color: shareCopied ? '#34d399' : D.textMuted, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
            {shareCopied ? 'Đã sao chép!' : 'Chia sẻ'}
          </button>

          {/* Edit with AI — opens popup */}
          <button onClick={() => setChatOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: `1px solid rgba(79,110,247,0.4)`, background: D.accentBg, color: '#818cf8', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            Chỉnh sửa với AI
          </button>

          {/* Save */}
          <button onClick={() => api.post(`/trips/${trip.id}/favorites`).catch(() => {})}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 8, border: 'none', background: D.accent, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
            Lưu lịch trình
          </button>
        </div>
      </div>

      {/* ── 2-column body: 55% left | 45% map ── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* LEFT — 55% */}
        <div style={{ width: '55%', display: 'flex', flexDirection: 'column', borderRight: `1px solid ${D.border}`, background: D.surface, position: 'relative', zIndex: 10 }}>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: `1px solid ${D.border}`, flexShrink: 0 }}>
            {(['timeline', 'packing'] as const).map(tab => (
              <button key={tab} onClick={() => handleSwitchTab(tab)} style={{
                flex: 1, padding: '12px 0', fontSize: 13, fontWeight: 600, border: 'none', background: 'transparent', cursor: 'pointer',
                color: leftTab === tab ? D.text : D.textMuted,
                borderBottom: leftTab === tab ? `2px solid ${tab === 'timeline' ? D.accent : '#f97316'}` : '2px solid transparent',
              }}>
                {tab === 'timeline' ? '📅 Lịch trình' : '🎒 Ghi chú & bí kíp'}
              </button>
            ))}
          </div>

          {/* ── TIMELINE TAB ── */}
          {leftTab === 'timeline' && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              {/* Day tabs */}
              <div style={{ display: 'flex', gap: 6, padding: '10px 14px', borderBottom: `1px solid ${D.border}`, overflowX: 'auto', flexShrink: 0 }}>
                {trip.days.map((day, idx) => {
                  const isActive = day.day_number === activeDay;
                  const color = DAY_COLORS[idx % DAY_COLORS.length];
                  return (
                    <button key={day.id} onClick={() => setActiveDay(day.day_number)} style={{
                      flexShrink: 0, padding: '6px 16px', borderRadius: 8,
                      border: `1px solid ${isActive ? color : D.border}`,
                      background: isActive ? color : 'transparent',
                      color: isActive ? '#fff' : D.textMuted,
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}>
                      Ngày {day.day_number}
                      {day.weather && <span style={{ marginLeft: 5, opacity: 0.85 }}>{WEATHER_ICONS[day.weather.icon] || '🌤️'} {Math.round(day.weather.temperature_high)}°</span>}
                    </button>
                  );
                })}
              </div>

              {/* Day summary bar */}
              {currentDay && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', background: D.surface2, borderBottom: `1px solid ${D.border}`, flexShrink: 0 }}>
                  <span style={{ fontSize: 13, color: D.textMuted, fontWeight: 500 }}>{formatDate(currentDay.date)}</span>
                  <div style={{ display: 'flex', gap: 12, fontSize: 13, color: D.textMuted }}>
                    <span>{currentDay.places.length} địa điểm</span>
                    {dayTotalCost(currentDay) > 0 && <span style={{ color: '#34d399', fontWeight: 600 }}>{formatCurrency(dayTotalCost(currentDay))}</span>}
                    {currentDay.weather?.rain_probability != null && currentDay.weather.rain_probability >= 0.5 && <span style={{ color: '#fbbf24' }}>⚠️ Có mưa</span>}
                  </div>
                </div>
              )}

              {/* Activities */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 20px' }}>
                {currentDay?.places.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '48px 0', color: D.textMuted, fontSize: 14 }}>Ngày này chưa có hoạt động.</div>
                )}
                {currentDay?.places.map((place, i) => (
                  <ActivityCard key={place.id ?? i} activity={place} index={i}
                    isLast={i === currentDay.places.length - 1}
                    isActive={activePlace?.title === place.title && activePlace?.time === place.time}
                    tripId={trip.id} dayId={currentDay.id}
                    onHover={setActivePlace} onSave={handleSavePlace}
                    onUpdated={updated => handleActivityUpdated(currentDay.id, updated as Activity)}
                    onDeleted={() => place.id && handleActivityDeleted(currentDay.id, place.id)}
                  />
                ))}

                {/* Cost breakdown per day */}
                {currentDay && (
                  <DayCostBreakdown
                    places={currentDay.places}
                    numPeople={Number(trip.num_people) || 1}
                    budget={totalEstimated || tripBudget}
                    durationDays={Number(trip.duration_days) || 1}
                  />
                )}

                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  <button onClick={() => setAddActivityOpen(true)}
                    style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px dashed rgba(79,110,247,0.4)`, background: 'rgba(79,110,247,0.06)', color: '#818cf8', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    ➕ Thêm hoạt động
                  </button>
                  <button onClick={() => setCostSplitOpen(true)}
                    style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${D.border}`, background: 'transparent', color: D.textMuted, fontSize: 13, cursor: 'pointer' }}>
                    💸 Chia chi phí
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── PACKING TAB ── */}
          {leftTab === 'packing' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ padding: '14px 16px', borderBottom: `1px solid ${D.border}`, flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: D.text }}>📝 Ghi chú cá nhân</span>
                  <span style={{ fontSize: 12, color: notesSaving ? '#60a5fa' : notesSaved ? '#34d399' : 'transparent' }}>
                    {notesSaving ? 'Đang lưu…' : '✓ Đã lưu'}
                  </span>
                </div>
                <textarea value={notes} onChange={e => handleNotesChange(e.target.value)} rows={3}
                  placeholder="Ghi chú: đặt bàn trước, mang theo ô, đổi tiền ở đâu…"
                  style={{ width: '100%', resize: 'none', background: D.surface2, border: `1px solid ${D.border}`, borderRadius: 8, padding: '9px 12px', fontSize: 13, color: D.text, outline: 'none', lineHeight: 1.6, boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ padding: '10px 16px', borderBottom: `1px solid ${D.border}`, flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: D.text }}>🎒 Đồ cần mang</span>
                {packingData && (() => {
                  const total = packingData.categories.reduce((s, c) => s + c.items.length, 0);
                  const done = packingChecked.size;
                  return <span style={{ fontSize: 12, color: D.textMuted }}>{done}/{total} đã chuẩn bị</span>;
                })()}
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
                {packingLoading && <div style={{ textAlign: 'center', padding: '40px 0', color: D.textMuted }}>AI đang tạo danh sách…</div>}
                {!packingLoading && packingData && packingData.categories.map((cat, ci) => (
                  <div key={ci} style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: D.text, marginBottom: 8 }}>{cat.emoji} {cat.name}</div>
                    {cat.items.map((item, ii) => {
                      const key = `${ci}-${item.name}`;
                      const isDone = packingChecked.has(key);
                      return (
                        <label key={ii} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', background: isDone ? 'rgba(52,211,153,0.07)' : 'transparent', marginBottom: 2 }}>
                          <input type="checkbox" checked={isDone} onChange={() => togglePackingItem(key)} style={{ accentColor: '#34d399', width: 14, height: 14, flexShrink: 0 }} />
                          <span style={{ fontSize: 13, color: isDone ? D.textDim : D.text, textDecoration: isDone ? 'line-through' : 'none' }}>{item.name}</span>
                          {item.essential && !isDone && <span style={{ fontSize: 10, background: 'rgba(239,68,68,0.15)', color: '#f87171', padding: '2px 7px', borderRadius: 99, marginLeft: 'auto' }}>Bắt buộc</span>}
                        </label>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — 45% map */}
        <div style={{ width: '45%', position: 'relative', overflow: 'hidden', isolation: 'isolate' }}>
          {/* Day legend */}
          <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 1000, background: 'rgba(13,17,23,0.92)', backdropFilter: 'blur(8px)', border: `1px solid ${D.border2}`, borderRadius: 10, padding: '10px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: D.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Lộ trình</div>
            {trip.days.map((day, idx) => (
              <button key={day.id} onClick={() => setActiveDay(day.day_number)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '3px 0', fontSize: 12, color: activeDay === day.day_number ? D.text : D.textMuted, fontWeight: activeDay === day.day_number ? 600 : 400 }}>
                <span style={{ width: 16, height: 3, borderRadius: 99, background: DAY_COLORS[idx % DAY_COLORS.length], display: 'inline-block' }} />
                Ngày {day.day_number}
              </button>
            ))}
          </div>
          <TripMap places={allPlaces} days={trip.days} activePlace={activePlace} activeDayNumber={activeDay}
            onMarkerClick={(place) => {
              const match = allPlaces.find(p => p.title === place.title && p.time === place.time);
              if (match) { setActivePlace(match); setLeftTab('timeline'); }
              if (place.day) setActiveDay(place.day);
            }}
          />
        </div>
      </div>

      {/* ── AI Chat Popup ── */}
      {chatOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', padding: '0 24px 24px', pointerEvents: 'none' }}>
          {/* Backdrop — click to close */}
          <div onClick={() => setChatOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', pointerEvents: 'all' }} />

          {/* Chat panel */}
          <div style={{ position: 'relative', width: 400, height: 560, background: D.surface, border: `1px solid ${D.border2}`, borderRadius: 16, display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.6)', pointerEvents: 'all', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${D.border}`, flexShrink: 0 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 6px #34d399' }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: D.text }}>TripAI Assistant</span>
                </div>
                <div style={{ fontSize: 11, color: D.textMuted, marginTop: 2 }}>{chatCount}/{CHAT_LIMIT} lượt chỉnh sửa</div>
              </div>
              <button onClick={() => setChatOpen(false)} style={{ background: 'none', border: 'none', color: D.textMuted, cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 4 }}>✕</button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {chatMessages.length === 0 && (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: D.textMuted }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>✦</div>
                  <div style={{ fontSize: 14, lineHeight: 1.6, fontWeight: 500, color: D.text }}>Hỏi AI để chỉnh sửa lịch trình</div>
                  <div style={{ fontSize: 12, color: D.textDim, marginTop: 8, lineHeight: 1.6 }}>
                    Ví dụ: &quot;Thêm quán cafe buổi sáng&quot;,<br />&quot;Giảm chi phí ngày 2&quot;
                  </div>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 8 }}>
                  {msg.role === 'ai' && (
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: D.accentBg, border: `1px solid ${D.border2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>✦</div>
                  )}
                  <div style={{
                    maxWidth: '78%', padding: '10px 13px',
                    borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    background: msg.role === 'user' ? D.accent : D.surface2,
                    border: `1px solid ${msg.role === 'user' ? 'transparent' : D.border}`,
                    fontSize: 13, color: D.text, lineHeight: 1.55,
                  }}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: D.accentBg, border: `1px solid ${D.border2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>✦</div>
                  <div style={{ padding: '10px 13px', borderRadius: '14px 14px 14px 4px', background: D.surface2, border: `1px solid ${D.border}`, fontSize: 13, color: D.textMuted }}>
                    Đang suy nghĩ…
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '10px 12px', borderTop: `1px solid ${D.border}`, flexShrink: 0 }}>
              {chatCount >= CHAT_LIMIT ? (
                <div style={{ fontSize: 12, color: '#f59e0b', textAlign: 'center', padding: '8px', background: 'rgba(245,158,11,0.1)', borderRadius: 8 }}>
                  Đã đạt giới hạn {CHAT_LIMIT} lượt chỉnh sửa.
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChat()}
                    placeholder="Nhập yêu cầu chỉnh sửa..."
                    disabled={chatLoading}
                    style={{ flex: 1, background: D.surface2, border: `1px solid ${D.border2}`, borderRadius: 10, padding: '9px 13px', fontSize: 13, color: D.text, outline: 'none' }}
                  />
                  <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()}
                    style={{ width: 36, height: 36, borderRadius: 10, background: chatInput.trim() ? D.accent : D.surface2, border: `1px solid ${D.border}`, color: '#fff', cursor: chatInput.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16 }}>
                    ↑
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {costSplitOpen && <CostSplit tripId={trip.id} onClose={() => setCostSplitOpen(false)} />}

      {addActivityOpen && currentDay && (
        <ActivityEditModal
          tripId={trip.id} dayId={currentDay.id}
          onSaved={newPlace => { setAddActivityOpen(false); handleActivityAdded(currentDay.id, newPlace as Activity); }}
          onClose={() => setAddActivityOpen(false)}
        />
      )}
    </div>
  );
}
