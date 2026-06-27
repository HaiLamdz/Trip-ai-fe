'use client';

import { useEffect, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
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
  // check-in
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
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const polylinesRef = useRef<{ polyline: google.maps.Polyline; dayNumber: number }[]>([]);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
      version: 'weekly',
      libraries: ['places'],
    });

    loader.load().then(() => {
      const map = new google.maps.Map(mapRef.current!, {
        center: { lat: 16.0544, lng: 108.2022 },
        zoom: 12,
        zoomControl: true,
        zoomControlOptions: { position: google.maps.ControlPosition.BOTTOM_RIGHT },
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }],
          },
        ],
      });

      mapInstanceRef.current = map;

      const bounds = new google.maps.LatLngBounds();

      days.forEach((day, dayIdx) => {
        const color = DAY_COLORS[dayIdx % DAY_COLORS.length];
        const validPlaces = day.places
          .filter(p => p.latitude !== null && p.longitude !== null && !isNaN(p.latitude) && !isNaN(p.longitude))
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

        const coords = validPlaces.map(p => ({ lat: Number(p.latitude), lng: Number(p.longitude) }));

        // Draw polyline — hidden by default, shown only for active day
        if (coords.length > 1) {
          const polyline = new google.maps.Polyline({
            path: coords,
            strokeColor: color,
            strokeOpacity: 0,
            strokeWeight: 3,
            map: map,
          });
          polylinesRef.current.push({ polyline, dayNumber: day.day_number });
        }

        // Numbered markers
        validPlaces.forEach((place, placeIdx) => {
          const lat = Number(place.latitude);
          const lng = Number(place.longitude);
          bounds.extend({ lat, lng });

          const num = placeIdx + 1;
          const typeColor = PLACE_TYPE_COLORS[place.place_type] || color;

          // Create custom marker using SVG
          const markerIcon = {
            path: `M 0 0 C -10 -10 -10 -25 0 -35 C 10 -25 10 -10 0 0 Z`,
            fillColor: typeColor,
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
            scale: 1.2,
            anchor: new google.maps.Point(0, 35),
          };

          const marker = new google.maps.Marker({
            position: { lat, lng },
            map,
            icon: markerIcon,
            label: {
              text: num.toString(),
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: '700',
              className: 'custom-marker-label',
            },
          });

          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div style="min-width:200px;font-family:system-ui,sans-serif;padding:8px">
                <div style="font-weight:700;font-size:13px;color:#111;margin-bottom:2px">${place.title}</div>
                <div style="font-size:11px;color:#555;margin-bottom:6px;font-style:italic">${place.place_name}</div>
                <div style="display:flex;gap:8px;font-size:11px;color:#555;margin-bottom:6px">
                  <span>🕐 ${place.time}</span>
                  ${place.estimated_cost > 0 ? `<span>💰 ${place.estimated_cost.toLocaleString('vi-VN')}đ</span>` : ''}
                </div>
                ${place.description ? `<div style="font-size:11px;color:#666;margin-bottom:8px;line-height:1.4">${place.description.slice(0, 100)}${place.description.length > 100 ? '…' : ''}</div>` : ''}
                <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.place_name)}" target="_blank" rel="noopener"
                  style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;color:#4285f4;text-decoration:none;background:#f0f4ff;padding:4px 10px;border-radius:6px;margin-top:4px">
                  🗺 Mở Google Maps
                </a>
              </div>
            `,
            maxWidth: 240,
          });

          marker.addListener('click', () => {
            infoWindow.open(map, marker);
            if (onMarkerClick) onMarkerClick(place);
          });

          const key = `${place.latitude},${place.longitude},${place.title}`;
          markersRef.current.set(key, marker);

          // ── Check-in photo overlay marker ──
          if (place.checked_in_at && place.checkin_photo_url) {
            const checkinMarker = new google.maps.Marker({
              position: { lat, lng },
              map,
              icon: {
                url: place.checkin_photo_url,
                scaledSize: new google.maps.Size(48, 48),
                anchor: new google.maps.Point(24, 48),
              },
              zIndex: 500,
            });

            const checkinNote = place.checkin_note ? `<div style="font-size:11px;color:#34d399;margin-top:6px;font-style:italic">"${place.checkin_note}"</div>` : '';

            const checkinInfoWindow = new google.maps.InfoWindow({
              content: `
                <div style="min-width:200px;font-family:system-ui,sans-serif;padding:8px">
                  <img src="${place.checkin_photo_url}" style="width:100%;height:140px;object-fit:cover;border-radius:6px;margin-bottom:8px;display:block" />
                  <div style="font-weight:700;font-size:13px;color:#111;margin-bottom:2px">📍 ${place.title}</div>
                  <div style="font-size:11px;color:#555">${place.place_name}</div>
                  ${checkinNote}
                </div>
              `,
              maxWidth: 220,
            });

            checkinMarker.addListener('click', () => {
              checkinInfoWindow.open(map, checkinMarker);
            });
          }
        });
      });

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, 40);
      }

      // Show first day's polyline by default
      const initialDay = activeDayNumber ?? days[0]?.day_number ?? 1;
      polylinesRef.current.forEach(({ polyline, dayNumber }) => {
        polyline.setOptions({ strokeOpacity: dayNumber === initialDay ? 0.85 : 0 });
      });
    });

    return () => {
      if (mapInstanceRef.current) {
        markersRef.current.forEach(marker => marker.setMap(null));
        polylinesRef.current.forEach(({ polyline }) => polyline.setMap(null));
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
    if (activePlace && activePlace.latitude !== null && activePlace.longitude !== null && !isNaN(activePlace.latitude) && !isNaN(activePlace.longitude)) {
      mapInstanceRef.current.panTo({ lat: Number(activePlace.latitude), lng: Number(activePlace.longitude) });
      mapInstanceRef.current.setZoom(15);
    }
  }, [activePlace]);

  // Show only active day's polyline, hide others
  useEffect(() => {
    if (!mapInstanceRef.current || activeDayNumber == null) return;
    polylinesRef.current.forEach(({ polyline, dayNumber }) => {
      polyline.setOptions({ strokeOpacity: dayNumber === activeDayNumber ? 0.85 : 0 });
    });
  }, [activeDayNumber]);

  // Fit to active day
  useEffect(() => {
    if (!mapInstanceRef.current || activeDayNumber == null) return;
    const day = days.find(d => d.day_number === activeDayNumber);
    if (!day) return;
    const coords = day.places
      .filter(p => p.latitude !== null && p.longitude !== null && !isNaN(p.latitude) && !isNaN(p.longitude))
      .map(p => ({ lat: Number(p.latitude), lng: Number(p.longitude) }));
    if (coords.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      coords.forEach(coord => bounds.extend(coord));

      mapInstanceRef.current?.fitBounds(bounds, 50);
    }
  }, [activeDayNumber, days]);

  return <div ref={mapRef} className="w-full h-full" />;
}
