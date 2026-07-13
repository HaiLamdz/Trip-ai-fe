'use client';

/**
 * TripMap — Leaflet + OpenStreetMap + OpenRouteService
 *
 * Behaviour:
 *  - Only renders markers for the active day (activeDayNumber).
 *  - If a place has been checked in AND has a photo → uses the checkin photo
 *    as the marker icon (replaces the numbered pin entirely).
 *  - If a place has been checked in but NO photo → numbered pin gets a green
 *    ring to signal "done".
 *  - Route polyline drawn only for the active day via OpenRouteService.
 *  - When activeDayNumber changes, all markers + polyline are cleared and
 *    redrawn for the new day (map instance is NOT recreated).
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

/* ─── Day accent colors ──────────────────────────────────────── */
const DAY_COLORS = [
  '#3b5bdb', '#0f766e', '#d97706',
  '#dc2626', '#7c3aed', '#be185d', '#0369a1',
];

/* ─── Numbered pin SVG ───────────────────────────────────────── */
function createNumberedIcon(
  num: number,
  color: string,
  isCheckedIn: boolean,
  L: typeof import('leaflet'),
) {
  const ring  = isCheckedIn ? `<circle cx="16" cy="16" r="15" fill="none" stroke="#0d9488" stroke-width="3"/>` : '';
  const badge = isCheckedIn
    ? `<circle cx="26" cy="6" r="6" fill="#0d9488"/><path d="M23 6l2 2 4-3" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`
    : '';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="46" viewBox="0 0 36 46">
      <path d="M18 0 C8.059 0 0 8.059 0 18 C0 32 18 46 18 46 C18 46 36 32 36 18 C36 8.059 27.941 0 18 0 Z"
        fill="${color}" stroke="#ffffff" stroke-width="2"/>
      ${ring}
      <text x="18" y="21" text-anchor="middle" dominant-baseline="middle"
        font-family="system-ui,sans-serif" font-size="14" font-weight="700" fill="#ffffff">
        ${num}
      </text>
      ${badge}
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [36, 46],
    iconAnchor: [18, 46],
    popupAnchor: [0, -48],
  });
}

/* ─── Checkin photo marker ───────────────────────────────────── */
function createCheckinPhotoIcon(photoUrl: string, L: typeof import('leaflet')) {
  // Circular photo with green ring + small pin tail
  const html = `
    <div style="position:relative;width:52px;height:58px">
      <div style="
        width:48px;height:48px;border-radius:50%;
        border:3px solid #0d9488;
        overflow:hidden;
        box-shadow:0 3px 10px rgba(0,0,0,0.35);
        background:#f1f5f9;
        position:absolute;top:0;left:2px;
      ">
        <img src="${photoUrl}" style="width:100%;height:100%;object-fit:cover;display:block" />
      </div>
      <svg style="position:absolute;bottom:0;left:50%;transform:translateX(-50%)" width="12" height="12" viewBox="0 0 12 12">
        <path d="M6 0 L10 8 L6 12 L2 8 Z" fill="#0d9488"/>
      </svg>
    </div>
  `;
  return L.divIcon({
    html,
    className: '',
    iconSize: [52, 58],
    iconAnchor: [26, 58],
    popupAnchor: [0, -60],
  });
}

/* ─── ORS route fetcher ──────────────────────────────────────── */
async function fetchOrsRoute(
  coords: [number, number][],
  apiKey: string,
): Promise<[number, number][]> {
  try {
    const res = await fetch(
      'https://api.openrouteservice.org/v2/directions/driving-car/geojson',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: apiKey },
        body: JSON.stringify({ coordinates: coords }),
      },
    );
    if (!res.ok) throw new Error(`ORS ${res.status}`);
    const json = await res.json();
    const geometry: [number, number][] = json.features?.[0]?.geometry?.coordinates ?? [];
    return geometry.map(([lng, lat]) => [lat, lng]);
  } catch {
    return coords.map(([lng, lat]) => [lat, lng]);
  }
}

/* ─── Main component ─────────────────────────────────────────── */
export default function TripMap({
  places,
  days,
  activePlace,
  activeDayNumber,
  onMarkerClick,
}: Props) {
  const mapRef         = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstance    = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef     = useRef<Map<string, any>>(new Map());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const polylineRef    = useRef<any>(null);
  const initializedRef = useRef(false);
  // Keep latest values in refs — prevents stale closures in effects
  const onMarkerClickRef   = useRef(onMarkerClick);
  const daysRef            = useRef(days);
  const activeDayNumberRef = useRef(activeDayNumber);
  // Sync refs immediately on every render (before effects run)
  onMarkerClickRef.current   = onMarkerClick;
  daysRef.current            = days;
  activeDayNumberRef.current = activeDayNumber;

  /* ── Init map once ── */
  useEffect(() => {
    if (!mapRef.current || initializedRef.current) return;
    initializedRef.current = true;

    import('leaflet').then((L) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      const map = L.map(mapRef.current!, {
        center: [16.0544, 108.2022],
        zoom: 12,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstance.current = map;
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        markersRef.current.clear();
        polylineRef.current = null;
        initializedRef.current = false;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Redraw markers when active day OR day data changes ── */
  useEffect(() => {
    if (!mapInstance.current) {
      const timer = setTimeout(() => drawDayMarkers(), 500);
      return () => clearTimeout(timer);
    }
    drawDayMarkers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDayNumber, days]);

  function drawDayMarkers() {
    // Always read from refs so we never have stale data
    const currentDays      = daysRef.current;
    const currentActiveDay = activeDayNumberRef.current;

    if (!mapInstance.current || !currentDays.length) return;

    import('leaflet').then((L) => {
      const map = mapInstance.current;

      // 1. Clear existing markers
      markersRef.current.forEach(m => m.remove());
      markersRef.current.clear();

      // 2. Clear existing polyline
      if (polylineRef.current) {
        polylineRef.current.remove();
        polylineRef.current = null;
      }

      // 3. Find the active day — use ref values (never stale)
      const dayIdx   = currentDays.findIndex(d => d.day_number === (currentActiveDay ?? currentDays[0]?.day_number));
      const day      = dayIdx >= 0 ? currentDays[dayIdx] : currentDays[0];
      if (!day) return;

      const color = DAY_COLORS[dayIdx % DAY_COLORS.length] ?? '#3b5bdb';

      const validPlaces = day.places
        .filter(p => p.latitude != null && p.longitude != null
          && !isNaN(Number(p.latitude)) && !isNaN(Number(p.longitude)))
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

      const bounds: [number, number][] = [];

      validPlaces.forEach((place, idx) => {
        const lat = Number(place.latitude);
        const lng = Number(place.longitude);
        bounds.push([lat, lng]);

        const hasPhoto     = !!place.checkin_photo_url;
        const isCheckedIn  = !!place.checked_in_at;

        // Icon: photo if checked-in with photo, otherwise numbered pin
        const icon = hasPhoto
          ? createCheckinPhotoIcon(place.checkin_photo_url!, L)
          : createNumberedIcon(idx + 1, PLACE_TYPE_COLORS[place.place_type] ?? color, isCheckedIn, L);

        const marker = L.marker([lat, lng], { icon }).addTo(map);

        // Popup
        const osmUrl = `https://www.openstreetmap.org/search?query=${encodeURIComponent(place.place_name)}`;
        const checkinSection = hasPhoto
          ? `<img src="${place.checkin_photo_url}" style="width:100%;height:120px;object-fit:cover;border-radius:6px;margin-bottom:8px;display:block"/>`
          : '';
        const noteSection = place.checkin_note
          ? `<div style="font-size:11px;color:#0f766e;margin-top:6px;font-style:italic;line-height:1.4">"${place.checkin_note}"</div>`
          : '';

        const popupHtml = `
          <div style="min-width:200px;font-family:system-ui,sans-serif;padding:4px">
            ${checkinSection}
            <div style="font-weight:700;font-size:13px;color:#0f172a;margin-bottom:2px">${place.title}</div>
            <div style="font-size:11px;color:#64748b;margin-bottom:6px">${place.place_name}</div>
            <div style="display:flex;gap:8px;font-size:11px;color:#64748b;flex-wrap:wrap;margin-bottom:6px">
              <span>${place.time}</span>
              ${(place.estimated_cost ?? 0) > 0 ? `<span>${Number(place.estimated_cost).toLocaleString('vi-VN')}đ</span>` : ''}
              ${isCheckedIn ? '<span style="color:#0d9488;font-weight:600">Da check-in</span>' : ''}
            </div>
            ${place.description ? `<div style="font-size:11px;color:#475569;margin-bottom:8px;line-height:1.5">${place.description.slice(0, 100)}${place.description.length > 100 ? '...' : ''}</div>` : ''}
            ${noteSection}
            <a href="${osmUrl}" target="_blank" rel="noopener"
              style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;color:#3b5bdb;text-decoration:none;background:#eff6ff;padding:4px 10px;border-radius:6px;margin-top:6px">
              Chi duong
            </a>
          </div>
        `;
        marker.bindPopup(popupHtml, { maxWidth: 240 });

        marker.on('click', () => {
          if (onMarkerClickRef.current) onMarkerClickRef.current(place);
        });

        const key = `${lat},${lng},${place.title}`;
        markersRef.current.set(key, marker);
      });

      // 4. Fit to day bounds
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [44, 44], maxZoom: 15 });
      }

      // 5. Draw route polyline for the day
      if (validPlaces.length > 1) {
        const orsApiKey = process.env.NEXT_PUBLIC_OPENROUTESERVICE_API_KEY || '';
        const orsCoords: [number, number][] = validPlaces.map(p => [
          Number(p.longitude), Number(p.latitude),
        ]);

        fetchOrsRoute(orsCoords, orsApiKey).then(routeLatLngs => {
          if (!mapInstance.current) return;
          const pl = L.polyline(routeLatLngs, {
            color,
            weight: 3,
            opacity: 0.75,
            smoothFactor: 1,
            dashArray: '6 4',
          }).addTo(mapInstance.current);
          polylineRef.current = pl;
        });
      }
    });
  }

  /* ── Pan to active place ── */
  useEffect(() => {
    if (!mapInstance.current || !activePlace) return;
    const { latitude: lat, longitude: lng } = activePlace;
    if (lat == null || lng == null || isNaN(Number(lat)) || isNaN(Number(lng))) return;

    mapInstance.current.setView([Number(lat), Number(lng)], 16, { animate: true });

    const key    = `${lat},${lng},${activePlace.title}`;
    const marker = markersRef.current.get(key);
    if (marker) marker.openPopup();
  }, [activePlace]);

  // `places` prop kept for interface compatibility — filtering is done via `days` + `activeDayNumber`
  void places;

  return (
    <>
      {/* Contain Leaflet's z-index inside the map column so modals can appear on top */}
      <style>{`
        .leaflet-pane { z-index: 4 !important; }
        .leaflet-top,
        .leaflet-bottom { z-index: 5 !important; }
        .leaflet-control { z-index: 5 !important; }
      `}</style>
      <div ref={mapRef} className="w-full h-full" />
    </>
  );
}
