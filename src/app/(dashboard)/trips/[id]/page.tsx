'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import api from '@/lib/api';
import { useTripStatus } from '@/hooks/useTripStatus';
import { useUnsplashImage } from '@/hooks/useUnsplashImage';
import { formatCurrency, formatDate } from '@/lib/utils';
import ActivityCard from '@/components/trip/ActivityCard';
import CostSplit from '@/components/trip/CostSplit';
import DayCostBreakdown from '@/components/trip/DayCostBreakdown';
import BudgetOverview from '@/components/trip/BudgetOverview';
import ActivityEditModal from '@/components/trip/ActivityEditModal';
import MobileTripDetail from '@/components/trip/MobileTripDetail';
import { useIsMobile } from '@/hooks/useIsMobile';

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
  // Check-in
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
  duration_days: number;
  budget: number;           // ngân sách kế hoạch người dùng nhập (số thực)
  budget_data: TripBudgetData | null;  // TripBudget model — chi phí thực tế từ AI
  num_people: number; status: string; days: TripDay[];
  user_notes: string | null;
  preferences: string[];
  cover_image_url?: string | null;
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

/* ── Desktop cover thumbnail in header ── */
function DesktopCoverThumb({ coverImageUrl, destination }: { coverImageUrl?: string | null; destination: string }) {
  const { url: unsplashUrl } = useUnsplashImage('attraction', destination);
  const imgUrl = coverImageUrl || unsplashUrl;
  if (!imgUrl) return null;
  return (
    <div style={{ position: 'relative', width: 52, height: 36, borderRadius: 8, overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)' }}>
      <Image src={imgUrl} alt={destination} fill sizes="52px" unoptimized style={{ objectFit: 'cover' }} />
    </div>
  );
}

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
  const [isPublished, setIsPublished] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishDesc, setPublishDesc] = useState('');
  const [addActivityOpen, setAddActivityOpen] = useState(false);
  // AI Chat popup
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatCount, setChatCount] = useState(0);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const isMobile = useIsMobile();
  const { status: pollStatus } = useTripStatus(id, trip?.status === 'processing' || (!trip && loading));
  const effectiveStatus = pollStatus?.status ?? trip?.status;
  const isProcessing = effectiveStatus === 'processing' || (!trip && loading);

  const fetchTrip = useCallback(async () => {
    try {
      const { data } = await api.get(`/trips/${id}`);
      setTrip(data.trip);
      setNotes(data.trip?.user_notes ?? '');
      setIsPublished(data.trip?.is_published ?? false);
      if (data.trip?.days?.length > 0) setActiveDay(data.trip.days[0].day_number);
    } catch { router.push('/dashboard'); }
    finally { setLoading(false); }
  }, [id, router]);

  // Initial load
  useEffect(() => { fetchTrip(); }, [fetchTrip]);

  // When poll detects completed/failed → refresh trip details
  useEffect(() => {
    if (!pollStatus) return;

    if (pollStatus.status === 'completed' || pollStatus.status === 'failed') {
      setTrip((prev) => (prev ? { ...prev, status: pollStatus.status } : prev));
      fetchTrip();
    }
  }, [pollStatus, fetchTrip]);

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

  const handlePublish = async () => {
    if (!trip) return;
    setPublishLoading(true);
    try {
      const { data } = await api.post(`/trips/${trip.id}/publish`, { description: publishDesc });
      setIsPublished(data.is_published);
      setPublishOpen(false);
    } catch { /* ignore */ } finally { setPublishLoading(false); }
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
      if (data.updated_days) {
        setTrip(prev => prev ? { ...prev, days: data.updated_days } : prev);
      }
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setChatMessages(prev => [...prev, { role: 'ai', content: status === 429 ? 'Đã đạt giới hạn chỉnh sửa.' : 'Đã có lỗi xảy ra.' }]);
    } finally { setChatLoading(false); }
  };

  // ── Loading states ────────────────────────────────────────────────────────
  if (isProcessing) {
    const isCompleted = effectiveStatus === 'completed';
    const isFailed = effectiveStatus === 'failed';

    const statusLabel = isCompleted
      ? 'Hoàn tất'
      : isFailed
        ? 'Thất bại'
        : (pollStatus?.progress_message || 'Trip AI đang chuẩn bị hành trình…');

    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: '#f8fafc',
        color: '#0f172a',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        <div style={{
          width: '100%',
          maxWidth: 960,
          display: 'grid',
          gap: 24,
        }}>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 20,
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div>
              <div style={{
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                fontSize: 12,
                fontWeight: 700,
                color: '#7dd3fc',
                marginBottom: 8,
              }}>
                Trip đang tải
              </div>
              <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.05 }}>
                Đang mở lịch trình của bạn
              </div>
            </div>

            <div style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              border: '1px solid rgba(15,23,42,0.08)',
              display: 'grid',
              placeItems: 'center',
              background: '#f8fafc',
            }}>
              <div style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                border: '3px solid rgba(125,211,252,0.85)',
                borderTopColor: 'transparent',
                animation: 'spin 0.9s linear infinite',
              }} />
            </div>
          </div>

          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
            @keyframes pulse-bg {
              0%, 100% { opacity: 0.55; }
              50% { opacity: 1; }
            }
          `}</style>

          <div style={{
            borderRadius: 24,
            border: '1px solid rgba(15,23,42,0.08)',
            background: '#ffffff',
            padding: 28,
            boxShadow: '0 24px 80px rgba(15,23,42,0.08)',
            overflow: 'hidden',
          }}>
            <div style={{
              display: 'grid',
              gap: 18,
            }}>
              <div style={{
                width: '100%',
                height: 18,
                borderRadius: 999,
                background: '#e2e8f0',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: isCompleted ? '100%' : '44%',
                  height: '100%',
                  borderRadius: 999,
                  background: 'linear-gradient(90deg, #6366f1, #7dd3fc)',
                  transition: 'width 0.5s ease',
                }} />
              </div>

              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                gap: 12,
                color: '#475569',
                fontSize: 13,
              }}>
                <span>{statusLabel}</span>
                <span>{isCompleted ? 'Đã hoàn tất' : 'Tự động làm mới khi có kết quả'}</span>
              </div>

              <div style={{
                display: 'grid',
                gap: 14,
                paddingTop: 4,
              }}>
                {['Đang tải lịch trình', 'Đang đồng bộ chi tiết hành trình', 'Đang nạp bản đồ và gợi ý'].map((label, index) => (
                  <div key={label} style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    alignItems: 'center',
                    gap: 12,
                  }}>
                    <div style={{ display: 'grid', placeItems: 'center', width: 12, height: 12, borderRadius: '50%', background: '#7dd3fc' }} />
                    <div style={{
                      minHeight: 18,
                      background: '#f1f5f9',
                      borderRadius: 10,
                      padding: '8px 12px',
                      color: '#0f172a',
                      fontSize: 14,
                    }}>
                      {label}
                    </div>
                    <div style={{
                      width: 48,
                      height: 6,
                      borderRadius: 99,
                      background: '#e2e8f0',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${40 + index * 15}%`,
                        height: '100%',
                        background: 'rgba(125,211,252,0.9)',
                      }} />
                    </div>
                  </div>
                ))}
              </div>

              <div style={{
                display: 'grid',
                gap: 16,
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                marginTop: 8,
              }}>
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} style={{
                    minHeight: 120,
                    borderRadius: 20,
                    background: '#f8fafc',
                    border: '1px solid rgba(15,23,42,0.06)',
                    padding: 18,
                    animation: 'pulse-bg 1.8s ease-in-out infinite',
                  }}>
                    <div style={{ width: '55%', height: 18, marginBottom: 12, borderRadius: 99, background: '#e2e8f0' }} />
                    <div style={{ width: '40%', height: 14, marginBottom: 16, borderRadius: 99, background: '#e2e8f0' }} />
                    <div style={{ display: 'grid', gap: 10 }}>
                      <div style={{ width: '100%', height: 10, borderRadius: 99, background: '#e2e8f0' }} />
                      <div style={{ width: '80%', height: 10, borderRadius: 99, background: '#e2e8f0' }} />
                      <div style={{ width: '90%', height: 10, borderRadius: 99, background: '#e2e8f0' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {isFailed && (
            <button
              onClick={() => router.push('/trips/create')}
              style={{
                width: '100%',
                maxWidth: 360,
                marginTop: 4,
                padding: '14px 20px',
                borderRadius: 16,
                border: 'none',
                background: '#7c3aed',
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 16px 32px rgba(124,58,237,0.24)',
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

  // ── Mobile layout ──────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <MobileTripDetail
        trip={trip}
        onBack={() => router.back()}
        onActivityUpdated={handleActivityUpdated}
        onActivityDeleted={handleActivityDeleted}
        onActivityAdded={handleActivityAdded}
      />
    );
  }

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
            <DesktopCoverThumb coverImageUrl={trip.cover_image_url} destination={trip.destination} />
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
          {/* Thành viên */}
          <button onClick={() => router.push(`/trips/${trip.id}/members`)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: `1px solid ${D.border2}`, background: 'transparent', color: D.textMuted, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
            👥 Thành viên
          </button>

          {/* Nhật ký */}
          <button onClick={() => router.push(`/trips/${trip.id}/journal`)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: `1px solid ${D.border2}`, background: 'transparent', color: D.textMuted, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
            📔 Nhật ký
          </button>

          {/* Chi phí */}
          <button onClick={() => router.push(`/trips/${trip.id}/expenses`)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: `1px solid ${D.border2}`, background: 'transparent', color: D.textMuted, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
            💸 Chi phí
          </button>

          {/* Share */}
          <button onClick={handleShare} disabled={shareLoading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: `1px solid ${D.border2}`, background: 'transparent', color: shareCopied ? '#34d399' : D.textMuted, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
            {shareCopied ? 'Đã sao chép!' : 'Chia sẻ'}
          </button>

          {/* Publish to community */}
          {trip.status === 'completed' && (
            <button
              onClick={() => isPublished ? handlePublish() : setPublishOpen(true)}
              disabled={publishLoading}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 8,
                border: `1px solid ${isPublished ? 'rgba(52,211,153,0.4)' : 'rgba(79,110,247,0.35)'}`,
                background: isPublished ? 'rgba(52,211,153,0.1)' : 'transparent',
                color: isPublished ? '#34d399' : '#818cf8',
                cursor: 'pointer', fontSize: 13, fontWeight: 600,
              }}>
              {isPublished ? '🌍 Đã publish' : '🌍 Publish'}
            </button>
          )}

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

                {/* Budget Overview — full trip comparison */}
                {trip.budget_data && (
                  <BudgetOverview
                    tripId={trip.id}
                    budgetData={trip.budget_data}
                    plannedBudget={tripBudget}
                    numPeople={Number(trip.num_people) || 1}
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
                {packingLoading && <div style={{ textAlign: 'center', padding: '40px 0', color: D.textMuted }}>Trip AI đang tạo danh sách…</div>}
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
                  <span style={{ fontSize: 14, fontWeight: 700, color: D.text }}>Trợ lý TripAI</span>
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
                  <div style={{ fontSize: 14, lineHeight: 1.6, fontWeight: 500, color: D.text }}>Hỏi Trip AI để chỉnh sửa lịch trình</div>
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

      {/* ── Publish Modal ── */}
      {publishOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setPublishOpen(false)}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
          <div
            style={{ position: 'relative', width: '100%', maxWidth: 440, background: D.surface, border: `1px solid ${D.border2}`, borderRadius: 18, padding: '24px', boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, color: D.text, margin: '0 0 6px' }}>🌍 Publish lên cộng đồng</h2>
            <p style={{ fontSize: 13, color: D.textMuted, margin: '0 0 18px', lineHeight: 1.6 }}>
              Lịch trình sẽ xuất hiện trong feed cộng đồng. Người khác có thể xem và clone về tài khoản của họ.
            </p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: D.textMuted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Mô tả (tùy chọn)
              </label>
              <textarea
                rows={3}
                placeholder="Chia sẻ kinh nghiệm, tips cho chuyến đi này..."
                value={publishDesc}
                onChange={e => setPublishDesc(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', background: D.surface2, border: `1px solid ${D.border2}`, borderRadius: 10, padding: '10px 12px', fontSize: 13, color: D.text, resize: 'none', outline: 'none', lineHeight: 1.6 }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setPublishOpen(false)}
                style={{ flex: 1, padding: '11px', borderRadius: 10, border: `1px solid ${D.border2}`, background: 'transparent', color: D.textMuted, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Hủy
              </button>
              <button onClick={handlePublish} disabled={publishLoading}
                style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none', background: '#059669', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                {publishLoading ? (
                  <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                ) : '🌍 Publish ngay'}
              </button>
            </div>
          </div>
        </div>
      )}

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
