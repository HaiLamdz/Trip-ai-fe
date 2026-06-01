'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { PLACE_TYPE_COLORS } from '@/lib/utils';

interface NearbyPlace {
  osm_id: number;
  name: string;
  place_type: string;
  latitude: number;
  longitude: number;
  address?: string;
  opening_hours?: string;
  phone?: string;
  website?: string;
  cuisine?: string;
}

interface Props {
  tripId: number;
  placeName: string;
  placeType: string;
  lat: number;
  lng: number;
  onClose: () => void;
  onSwap?: (place: NearbyPlace) => void;
}

const TYPE_LABELS: Record<string, string> = {
  food: 'Ẩm thực', cafe: 'Cafe', attraction: 'Tham quan',
  hotel: 'Lưu trú', shopping: 'Mua sắm', nightlife: 'Về đêm',
};

export default function NearbyPlaces({ tripId, placeName, placeType, lat, lng, onClose, onSwap }: Props) {
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/trips/${tripId}/nearby`, { params: { lat, lng, type: placeType } })
      .then(({ data }) => setPlaces(data.places ?? []))
      .catch(() => setPlaces([]))
      .finally(() => setLoading(false));
  }, [tripId, lat, lng, placeType]);

  const color = PLACE_TYPE_COLORS[placeType] || '#6b7280';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-900">📍 Địa điểm thay thế</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Gần <span className="font-medium">{placeName}</span> · {TYPE_LABELS[placeType] || placeType}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
          {loading && (
            <div className="flex flex-col items-center py-10 gap-3 text-gray-400">
              <div className="w-7 h-7 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
              <span className="text-sm">Đang tìm kiếm…</span>
            </div>
          )}

          {!loading && places.length === 0 && (
            <div className="text-center py-10 text-gray-500">
              <div className="text-3xl mb-2">🔍</div>
              <p className="text-sm">Không tìm thấy địa điểm nào trong bán kính 500m.</p>
            </div>
          )}

          {!loading && places.map((place, i) => (
            <div
              key={place.osm_id ?? i}
              className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors"
            >
              {/* Color dot */}
              <div
                className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold mt-0.5"
                style={{ background: color }}
              >
                {i + 1}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm">{place.name}</p>
                {place.address && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{place.address}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {place.opening_hours && (
                    <span className="text-xs text-gray-500">🕐 {place.opening_hours}</span>
                  )}
                  {place.cuisine && (
                    <span className="text-xs text-gray-500">🍽 {place.cuisine}</span>
                  )}
                  {place.phone && (
                    <a href={`tel:${place.phone}`} className="text-xs text-blue-500 hover:underline">
                      📞 {place.phone}
                    </a>
                  )}
                </div>
              </div>

              {onSwap && (
                <button
                  onClick={() => { onSwap(place); onClose(); }}
                  className="shrink-0 text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium px-3 py-1.5 rounded-lg transition-colors"
                >
                  Chọn
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">Dữ liệu từ OpenStreetMap · Bán kính 500m</p>
        </div>
      </div>
    </div>
  );
}
