'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

const TripMap = dynamic(() => import('@/components/trip/TripMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
      Đang tải bản đồ…
    </div>
  ),
});

interface Activity {
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
interface TripDetail {
  id: number; destination: string; start_date: string;
  duration_days: number; budget: number; status: string;
  days: TripDay[];
}

const WEATHER_ICONS: Record<string, string> = {
  '01d': '☀️', '02d': '⛅', '03d': '☁️', '04d': '☁️',
  '09d': '🌧️', '10d': '🌦️', '11d': '⛈️', '13d': '❄️', '50d': '🌫️',
};

const PLACE_TYPE_CONFIG: Record<string, { emoji: string; bg: string; text: string }> = {
  food:       { emoji: '🍜', bg: 'bg-orange-100', text: 'text-orange-700' },
  cafe:       { emoji: '☕', bg: 'bg-purple-100', text: 'text-purple-700' },
  attraction: { emoji: '🏛️', bg: 'bg-blue-100',   text: 'text-blue-700'   },
  hotel:      { emoji: '🏨', bg: 'bg-indigo-100', text: 'text-indigo-700' },
  transport:  { emoji: '🚗', bg: 'bg-gray-100',   text: 'text-gray-600'   },
  other:      { emoji: '📍', bg: 'bg-teal-100',   text: 'text-teal-700'   },
};

export default function SharedTripPage() {
  const { token } = useParams<{ token: string }>();
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeDay, setActiveDay] = useState(1);

  useEffect(() => {
    api.get(`/trips/share/${token}`)
      .then(({ data }) => {
        setTrip(data.trip);
        if (data.trip?.days?.length > 0) setActiveDay(data.trip.days[0].day_number);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Đang tải lịch trình…</p>
        </div>
      </div>
    );
  }

  if (notFound || !trip) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-sm px-4">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Lịch trình không tồn tại</h1>
          <p className="text-gray-500 text-sm mb-6">Link này đã hết hạn hoặc chưa được chia sẻ công khai.</p>
          <Link href="/" className="btn-primary text-sm">Về trang chủ</Link>
        </div>
      </div>
    );
  }

  const allPlaces = trip.days.flatMap(d => d.places.map(p => ({ ...p, day: d.day_number })));
  const currentDay = trip.days.find(d => d.day_number === activeDay);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-blue-600">✈️ TripAI</Link>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">Lịch trình được chia sẻ</span>
            <Link href="/register" className="btn-primary text-xs py-1.5">Tạo lịch trình của bạn</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Hero */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 text-white rounded-2xl px-6 py-5 mb-6">
          <h1 className="text-2xl font-bold">📍 {trip.destination}</h1>
          <div className="flex flex-wrap gap-3 mt-2 text-sm text-blue-100">
            <span>📅 {formatDate(trip.start_date)}</span>
            <span className="opacity-40">·</span>
            <span>🗓 {trip.duration_days} ngày</span>
            <span className="opacity-40">·</span>
            <span>💰 {formatCurrency(trip.budget)}</span>
          </div>
        </div>

        {/* Day tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-hide">
          {trip.days.map(day => (
            <button
              key={day.id}
              onClick={() => setActiveDay(day.day_number)}
              className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium border transition-all
                ${activeDay === day.day_number
                  ? 'bg-blue-600 text-white border-transparent shadow'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
            >
              Ngày {day.day_number}
              {day.weather && (
                <span className="ml-1.5 opacity-75">
                  {WEATHER_ICONS[day.weather.icon] || '🌤️'} {Math.round(day.weather.temperature_high)}°
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Split layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Timeline */}
          <div className="space-y-3">
            {currentDay?.places.map((place, i) => {
              const config = PLACE_TYPE_CONFIG[place.place_type] || PLACE_TYPE_CONFIG.other;
              return (
                <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-center shrink-0">
                      <span className="text-xs font-mono font-semibold text-gray-500">{place.time}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.bg} ${config.text}`}>
                          {config.emoji} {place.place_type}
                        </span>
                        {place.estimated_cost > 0 && (
                          <span className="text-xs text-emerald-600 font-medium">
                            {formatCurrency(place.estimated_cost)}
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-gray-900 text-sm">{place.title}</p>
                      <p className="text-xs text-gray-400">{place.place_name}</p>
                      {place.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{place.description}</p>
                      )}
                    </div>
                  </div>
                  {place.transport_to_next && i < (currentDay.places.length - 1) && (
                    <div className="mt-2 pt-2 border-t border-gray-50 text-xs text-gray-400">
                      → {place.transport_to_next} · {place.distance_to_next_km}km
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Map */}
          <div className="h-[500px] lg:sticky lg:top-20 rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            <TripMap
              places={allPlaces}
              days={trip.days}
              activeDayNumber={activeDay}
            />
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-6 text-center">
          <p className="text-lg font-bold text-gray-900 mb-1">Muốn tạo lịch trình của riêng bạn?</p>
          <p className="text-sm text-gray-500 mb-4">TripAI dùng AI để tạo lịch trình cá nhân hóa trong 30 giây.</p>
          <Link href="/register" className="btn-primary">Bắt đầu miễn phí →</Link>
        </div>
      </div>
    </div>
  );
}
