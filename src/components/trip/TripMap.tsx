'use client';

/**
 * TripMap — Leaflet + OpenStreetMap + OpenRouteService
 *
 * Thay thế hoàn toàn Google Maps. Sử dụng:
 *  - Leaflet (bản đồ, marker, polyline)
 *  - OpenStreetMap tiles (nền bản đồ)
 *  - OpenRouteService Directions API (tuyến đường)
 */

import { useEffect, useRef } from 'react';
import { PLACE_TYPE_COLORS } from '@/lib/utils';

/* ─── Types ─────────────────────────────────────────────────── */
interface Place {
  place_name: string;
  place_type: string;
  title: string;
  time: string;
  estimated_cost: number;
  description: string;
  latitude: number | null;
  longitude: number | null;
  day?: number;
  sort_order?: number;
  duration_minutes?: number;
  transport_to_next?: string | null;
  distance_to_next_km?: number;
  checked_in_at?: string | null;
  checkin_photo_url?: string | null;
  checkin_note?: string | null;
}

interface TripDay {
  day_number: number;
  places: Place[];
}

interface Props {
  places: Place[];
  days: TripDay[];
  activePlace?: Place | null;
  activeDayNumber?: number | null;
  onMarkerClick?: (place: Place) => void;
}

/* ─── Màu cho từng ngày ──────────────────────────────────────── */
const DAY_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
];

/* ─── Tạo SVG marker icon dạng số ───────────────────────────── */
function createNumberedIcon(num: number, color: string, L: typeof import('leaflet')) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
      <path d="M16 0 C7.163 0 0 7.163 0 16 C0 28 16 42 16 42 C16 42 32 28 32 16 C32 7.163 24.837 0 16 0 Z"
        fill="${color}" stroke="#ffffff" stroke-width="2"/>
      <text x="16" y="20" text-anchor="middle" dominant-baseline="middle"
        font-family="system-ui,sans-serif" font-size="13" font-weight="700" fill="#ffffff">
        ${num}
      </text>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -42],
  });
}

/* ─── Tạo marker ảnh check-in ────────────────────────────────── */
function createCheckinIcon(photoUrl: string, L: typeof import('leaflet')) {
  return L.divIcon({
    html: `<div style="width:44px;height:44px;border-radius:50%;border:3px solid #10b981;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.4)">
      <img src="${photoUrl}" style="width:100%;height:100%;object-fit:cover" />
    </div>`,
    className: '',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -26],
  });
}

/* ─── Gọi OpenRouteService lấy route geometry ────────────────── */
async function fetchOrsRoute(
  coords: [number, number][],     // [lng, lat][]  — ORS nhận lng trước
  apiKey: string,
): Promise<[number, number][]> { // trả về [lat, lng][] cho Leaflet
  try {
    const res = await fetch(
      'https://api.openrouteservice.org/v2/directions/driving-car/geojson',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: apiKey,
        },
        body: JSON.stringify({ coordinates: coords }),
      },
    );
    if (!res.ok) throw new Error(`ORS ${res.status}`);
    const json = await res.json();
    const geometry: [number, number][] = json.features?.[0]?.geometry?.coordinates ?? [];
    // ORS trả [lng, lat] → đổi sang [lat, lng] cho Leaflet
    return geometry.map(([lng, lat]) => [lat, lng]);
  } catch {
    // Nếu ORS lỗi, fallback vẽ đường thẳng
    return coords.map(([lng, lat]) => [lat, lng]);
  }
}

/* ─── Component chính ────────────────────────────────────────── */
export default function TripMap({ places, days, activePlace, activeDayNumber, onMarkerClick }: Props) {
  const mapRef      = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstance = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef  = useRef<Map<string, any>>(new Map());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const polylinesRef = useRef<{ polyline: any; dayNumber: number }[]>([]);
  const initializedRef = useRef(false);

  /* ── Khởi tạo map một lần duy nhất ── */
  useEffect(() => {
    if (!mapRef.current || initializedRef.current) return;
    initializedRef.current = true;

    // Import Leaflet dynamic (chỉ chạy client-side)
    import('leaflet').then(async (L) => {
      // Fix icon path mặc định của Leaflet khi dùng webpack
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      // Inject Leaflet CSS nếu chưa có
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      /* Tạo map */
      const map = L.map(mapRef.current!, {
        center: [16.0544, 108.2022], // Mặc định: Đà Nẵng — sẽ fitBounds ngay sau
        zoom: 12,
        zoomControl: true,
      });

      /* OpenStreetMap tile layer */
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstance.current = map;

      const orsApiKey = process.env.NEXT_PUBLIC_OPENROUTESERVICE_API_KEY || '';
      const bounds: [number, number][] = [];

      /* Duyệt từng ngày để vẽ marker + route */
      for (let dayIdx = 0; dayIdx < days.length; dayIdx++) {
        const day = days[dayIdx];
        const color = DAY_COLORS[dayIdx % DAY_COLORS.length];

        const validPlaces = day.places
          .filter(p => p.latitude !== null && p.longitude !== null
            && !isNaN(p.latitude!) && !isNaN(p.longitude!))
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

        /* Vẽ marker cho từng địa điểm */
        validPlaces.forEach((place, placeIdx) => {
          const lat = Number(place.latitude);
          const lng = Number(place.longitude);
          bounds.push([lat, lng]);

          const num = placeIdx + 1;
          const typeColor = PLACE_TYPE_COLORS[place.place_type] || color;
          const icon = createNumberedIcon(num, typeColor, L);

          const marker = L.marker([lat, lng], { icon }).addTo(map);

          /* Popup nội dung */
          const osmUrl = `https://www.openstreetmap.org/search?query=${encodeURIComponent(place.place_name)}`;
          const popupHtml = `
            <div style="min-width:200px;font-family:system-ui,sans-serif;padding:4px">
              <div style="font-weight:700;font-size:13px;color:#111;margin-bottom:2px">${place.title}</div>
              <div style="font-size:11px;color:#555;margin-bottom:6px;font-style:italic">${place.place_name}</div>
              <div style="display:flex;gap:8px;font-size:11px;color:#555;margin-bottom:6px">
                <span>🕐 ${place.time}</span>
                ${place.estimated_cost > 0 ? `<span>💰 ${place.estimated_cost.toLocaleString('vi-VN')}đ</span>` : ''}
              </div>
              ${place.description ? `<div style="font-size:11px;color:#666;margin-bottom:8px;line-height:1.4">${place.description.slice(0, 100)}${place.description.length > 100 ? '…' : ''}</div>` : ''}
              <a href="${osmUrl}" target="_blank" rel="noopener"
                style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;color:#0078a8;text-decoration:none;background:#e8f4f8;padding:4px 10px;border-radius:6px;margin-top:4px">
                🗺 Xem trên OpenStreetMap
              </a>
            </div>
          `;
          marker.bindPopup(popupHtml, { maxWidth: 240 });

          marker.on('click', () => {
            if (onMarkerClick) onMarkerClick(place);
          });

          const key = `${lat},${lng},${place.title}`;
          markersRef.current.set(key, marker);

          /* Marker ảnh check-in (nếu có) */
          if (place.checked_in_at && place.checkin_photo_url) {
            const checkinIcon = createCheckinIcon(place.checkin_photo_url, L);
            const checkinMarker = L.marker([lat, lng], { icon: checkinIcon, zIndexOffset: 500 }).addTo(map);
            const noteHtml = place.checkin_note ? `<div style="font-size:11px;color:#34d399;margin-top:6px;font-style:italic">"${place.checkin_note}"</div>` : '';
            checkinMarker.bindPopup(`
              <div style="min-width:200px;font-family:system-ui,sans-serif;padding:4px">
                <img src="${place.checkin_photo_url}" style="width:100%;height:140px;object-fit:cover;border-radius:6px;margin-bottom:8px;display:block" />
                <div style="font-weight:700;font-size:13px;color:#111;margin-bottom:2px">📍 ${place.title}</div>
                <div style="font-size:11px;color:#555">${place.place_name}</div>
                ${noteHtml}
              </div>
            `, { maxWidth: 220 });
          }
        });

        /* Vẽ tuyến đường bằng OpenRouteService */
        if (validPlaces.length > 1) {
          // ORS nhận tọa độ theo thứ tự [lng, lat]
          const orsCoords: [number, number][] = validPlaces.map(p => [
            Number(p.longitude),
            Number(p.latitude),
          ]);

          // Gọi ORS và vẽ polyline (ẩn mặc định, chỉ hiện ngày active)
          fetchOrsRoute(orsCoords, orsApiKey).then(routeLatLngs => {
            const polyline = L.polyline(routeLatLngs, {
              color,
              weight: 4,
              opacity: 0,  // ẩn mặc định
              smoothFactor: 1,
            }).addTo(map);

            polylinesRef.current.push({ polyline, dayNumber: day.day_number });

            // Hiện polyline của ngày đang active
            const activeDay = activeDayNumber ?? days[0]?.day_number ?? 1;
            if (day.day_number === activeDay) {
              polyline.setStyle({ opacity: 0.85 });
            }
          });
        }
      }

      /* Fit bounds hiển thị tất cả địa điểm */
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    });

    /* Cleanup khi unmount */
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        markersRef.current.clear();
        polylinesRef.current = [];
        initializedRef.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Pan đến địa điểm đang active ── */
  useEffect(() => {
    if (!mapInstance.current) return;
    if (
      activePlace &&
      activePlace.latitude !== null && activePlace.longitude !== null &&
      !isNaN(activePlace.latitude) && !isNaN(activePlace.longitude)
    ) {
      mapInstance.current.setView(
        [Number(activePlace.latitude), Number(activePlace.longitude)],
        15,
        { animate: true },
      );
      // Mở popup của marker tương ứng
      const key = `${activePlace.latitude},${activePlace.longitude},${activePlace.title}`;
      const marker = markersRef.current.get(key);
      if (marker) marker.openPopup();
    }
  }, [activePlace]);

  /* ── Hiện/ẩn polyline theo ngày active ── */
  useEffect(() => {
    if (!mapInstance.current || activeDayNumber == null) return;
    polylinesRef.current.forEach(({ polyline, dayNumber }) => {
      polyline.setStyle({ opacity: dayNumber === activeDayNumber ? 0.85 : 0 });
    });
  }, [activeDayNumber]);

  /* ── Fit bounds theo ngày active ── */
  useEffect(() => {
    if (!mapInstance.current || activeDayNumber == null) return;
    const day = days.find(d => d.day_number === activeDayNumber);
    if (!day) return;
    const coords = day.places
      .filter(p => p.latitude !== null && p.longitude !== null && !isNaN(p.latitude!) && !isNaN(p.longitude!))
      .map(p => [Number(p.latitude), Number(p.longitude)] as [number, number]);
    if (coords.length > 0) {
      mapInstance.current.fitBounds(coords, { padding: [50, 50] });
    }
  }, [activeDayNumber, days]);

  return <div ref={mapRef} className="w-full h-full" />;
}
