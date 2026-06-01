'use client';

import { useEffect, useRef } from 'react';
import { PLACE_TYPE_COLORS } from '@/lib/utils';

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

const DAY_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
];

export default function TripMap({ places, days, activePlace, activeDayNumber, onMarkerClick }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const markersRef = useRef<Map<string, unknown>>(new Map());
  const polylinesRef = useRef<unknown[]>([]);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    import('leaflet').then((L) => {
      // Fix default icon paths
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;

      const map = L.map(mapRef.current!, {
        zoomControl: false,
        attributionControl: false,
      }).setView([16.0544, 108.2022], 12);

      mapInstanceRef.current = map;

      // Add zoom control bottom-right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Attribution bottom-left, minimal
      L.control.attribution({ position: 'bottomleft', prefix: false })
        .addAttribution('© <a href="https://openstreetmap.org">OSM</a>')
        .addTo(map);

      // Tile layer — CartoDB Positron for clean look
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        { subdomains: 'abcd', maxZoom: 19 }
      ).addTo(map);

      const bounds: [number, number][] = [];

      days.forEach((day, dayIdx) => {
        const color = DAY_COLORS[dayIdx % DAY_COLORS.length];
        const validPlaces = day.places
          .filter(p => p.latitude && p.longitude)
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

        const coords: [number, number][] = validPlaces.map(p => [p.latitude!, p.longitude!]);

        // Draw polyline — hidden by default, shown only for active day
        if (coords.length > 1) {
          const line = L.polyline(coords, {
            color,
            weight: 3,
            opacity: 0,          // start hidden
            dashArray: undefined,
            lineJoin: 'round',
            lineCap: 'round',
          }).addTo(map);
          // tag with day number for later toggling
          (line as unknown as { _dayNumber: number })._dayNumber = day.day_number;
          polylinesRef.current.push(line);
        }

        // Numbered markers
        validPlaces.forEach((place, placeIdx) => {
          if (!place.latitude || !place.longitude) return;
          bounds.push([place.latitude, place.longitude]);

          const num = placeIdx + 1;
          const typeColor = PLACE_TYPE_COLORS[place.place_type] || color;

          const icon = L.divIcon({
            html: `
              <div style="
                position:relative;
                width:32px;height:32px;
                display:flex;align-items:center;justify-content:center;
              ">
                <div style="
                  width:28px;height:28px;
                  background:${typeColor};
                  border-radius:50% 50% 50% 0;
                  transform:rotate(-45deg);
                  border:2px solid white;
                  box-shadow:0 2px 8px rgba(0,0,0,0.25);
                "></div>
                <span style="
                  position:absolute;
                  color:white;
                  font-size:11px;
                  font-weight:700;
                  font-family:system-ui,sans-serif;
                  line-height:1;
                  transform:translateY(-2px);
                ">${num}</span>
              </div>
            `,
            className: '',
            iconSize: [32, 32],
            iconAnchor: [14, 28],
            popupAnchor: [2, -28],
          });

          const marker = L.marker([place.latitude, place.longitude], { icon })
            .addTo(map)
            .bindPopup(`
              <div style="min-width:200px;font-family:system-ui,sans-serif">
                <div style="font-weight:700;font-size:13px;color:#111;margin-bottom:2px">${place.title}</div>
                <div style="font-size:11px;color:#555;margin-bottom:6px;font-style:italic">${place.place_name}</div>
                <div style="display:flex;gap:8px;font-size:11px;color:#555;margin-bottom:6px">
                  <span>🕐 ${place.time}</span>
                  ${place.estimated_cost > 0 ? `<span>💰 ${place.estimated_cost.toLocaleString('vi-VN')}đ</span>` : ''}
                </div>
                ${place.description ? `<div style="font-size:11px;color:#666;margin-bottom:8px;line-height:1.4">${place.description.slice(0, 100)}${place.description.length > 100 ? '…' : ''}</div>` : ''}
                <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.place_name)}" target="_blank" rel="noopener"
                  style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;color:#4285f4;text-decoration:none;background:#f0f4ff;padding:4px 10px;border-radius:6px">
                  🗺 Mở Google Maps
                </a>
              </div>
            `, { maxWidth: 240 });

          if (onMarkerClick) {
            marker.on('click', () => onMarkerClick(place));
          }

          const key = `${place.latitude},${place.longitude},${place.title}`;
          markersRef.current.set(key, marker);
        });
      });

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [40, 40] });
      }

      // Show first day's polyline by default
      const initialDay = activeDayNumber ?? days[0]?.day_number ?? 1;
      polylinesRef.current.forEach((line) => {
        const pl = line as unknown as { _dayNumber: number; setStyle: (s: object) => void };
        pl.setStyle({ opacity: pl._dayNumber === initialDay ? 0.85 : 0 });
      });
    });

    return () => {
      if (mapInstanceRef.current) {
        (mapInstanceRef.current as { remove: () => void }).remove();
        mapInstanceRef.current = null;
        markersRef.current.clear();
        polylinesRef.current = [];
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Highlight active place
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    import('leaflet').then((L) => {
      const map = mapInstanceRef.current as ReturnType<typeof L.map>;

      if (activePlace?.latitude && activePlace?.longitude) {
        map.flyTo([activePlace.latitude!, activePlace.longitude!], 15, { duration: 0.8 });
      }
    });
  }, [activePlace]);

  // Show only active day's polyline, hide others
  useEffect(() => {
    if (!mapInstanceRef.current || activeDayNumber == null) return;
    import('leaflet').then((L) => {
      polylinesRef.current.forEach((line) => {
        const pl = line as unknown as { _dayNumber: number; setStyle: (s: object) => void };
        pl.setStyle({ opacity: pl._dayNumber === activeDayNumber ? 0.85 : 0 });
      });
    });
  }, [activeDayNumber]);

  // Fit to active day
  useEffect(() => {
    if (!mapInstanceRef.current || activeDayNumber == null) return;
    import('leaflet').then((L) => {
      const map = mapInstanceRef.current as ReturnType<typeof L.map>;
      const day = days.find(d => d.day_number === activeDayNumber);
      if (!day) return;
      const coords: [number, number][] = day.places
        .filter(p => p.latitude && p.longitude)
        .map(p => [p.latitude!, p.longitude!]);
      if (coords.length > 0) {
        map.fitBounds(coords, { padding: [50, 50], duration: 0.8 } as Parameters<typeof map.fitBounds>[1]);
      }
    });
  }, [activeDayNumber, days]);

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div ref={mapRef} className="w-full h-full" />
    </>
  );
}
