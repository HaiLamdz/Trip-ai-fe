'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Trip {
  id: number; destination: string; start_date: string;
  duration_days: number; budget: number; status: string;
}

export default function FavoritesPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/favorites').then(({ data }) => setTrips(data.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">❤️ Lịch trình yêu thích</h1>

      {loading ? (
        <div className="text-center py-20 text-gray-500">Đang tải...</div>
      ) : trips.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-4xl mb-3">❤️</p>
          <p>Chưa có lịch trình yêu thích nào</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trips.map(trip => (
            <Link key={trip.id} href={`/trips/${trip.id}`} className="card hover:shadow-md transition-shadow block">
              <h3 className="font-semibold text-gray-900 mb-2">📍 {trip.destination}</h3>
              <p className="text-sm text-gray-600">{formatDate(trip.start_date)} · {trip.duration_days} ngày</p>
              <p className="text-sm text-teal-600 font-medium mt-1">{formatCurrency(trip.budget)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
