'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface SavedPlace {
  id: number; place_name: string; place_type: string | null;
  latitude: number | null; longitude: number | null; notes: string | null;
  created_at: string;
}

const TYPE_ICONS: Record<string, string> = {
  food: '🍜', cafe: '☕', attraction: '🏛️', hotel: '🏨', transport: '🚗', other: '📍',
};

export default function SavedPlacesPage() {
  const [places, setPlaces] = useState<SavedPlace[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/places/saved').then(({ data }) => setPlaces(data.data)).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: number) => {
    await api.delete(`/places/saved/${id}`);
    setPlaces(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">📍 Địa điểm đã lưu</h1>

      {loading ? (
        <div className="text-center py-20 text-gray-500">Đang tải...</div>
      ) : places.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-4xl mb-3">📍</p>
          <p>Chưa có địa điểm nào được lưu</p>
          <p className="text-sm mt-2">Lưu địa điểm từ trang chi tiết lịch trình</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {places.map(place => (
            <div key={place.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="flex gap-3">
                  <span className="text-2xl">{TYPE_ICONS[place.place_type || 'other'] || '📍'}</span>
                  <div>
                    <p className="font-medium text-gray-900">{place.place_name}</p>
                    {place.notes && <p className="text-xs text-gray-500 mt-0.5">{place.notes}</p>}
                    {place.latitude && place.longitude && (
                      <p className="text-xs text-gray-400 mt-0.5">{place.latitude.toFixed(4)}, {place.longitude.toFixed(4)}</p>
                    )}
                  </div>
                </div>
                <button onClick={() => handleDelete(place.id)} className="text-red-400 hover:text-red-600 text-sm shrink-0">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
