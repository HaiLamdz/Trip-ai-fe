'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

interface CommunityTrip {
  id: number;
  destination: string;
  start_date: string;
  duration_days: number;
  budget: number;
  num_people: number;
  publish_description: string | null;
  cover_image_url: string | null;
  published_at?: string | null;
  user: { id: number; name: string; avatar: string | null };
}

export default function MobileCommunity() {
  const [trips, setTrips] = useState<CommunityTrip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api.get('/community', { params: { page: 1 } })
      .then(({ data }) => {
        if (!mounted) return;
        setTrips(data.data?.slice(0, 6) || []);
      })
      .catch(() => { if (mounted) setTrips([]); })
      .finally(() => { if (mounted) setLoading(false); });

    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '0 20px' }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{ width: 140, borderRadius: 12, background: '#fff', height: 160 }} />
        ))}
      </div>
    );
  }

  if (!trips.length) return (
    <div style={{ padding: '0 20px', color: '#475569', fontSize: 13 }}>Chưa có nội dung từ cộng đồng.</div>
  );

  return (
    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '0 20px' }}>
      {trips.map(trip => {
        const img = trip.cover_image_url || null;
        return (
          <Link key={trip.id} href={`/community/${trip.id}`} style={{ width: 160, flexShrink: 0, textDecoration: 'none' }}>
            <div style={{ borderRadius: 12, overflow: 'hidden', background: '#fff', boxShadow: '0 4px 14px rgba(0,0,0,0.06)' }}>
              <div style={{ position: 'relative', height: 100 }}>
                {img ? (
                  <Image src={img} alt={trip.destination} fill sizes="160px" unoptimized style={{ objectFit: 'cover' }} />
                ) : (
                  <div style={{ height: '100%', background: 'linear-gradient(135deg,#667eea,#764ba2)' }} />
                )}
              </div>
              <div style={{ padding: '8px 10px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{trip.destination}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{formatDate(trip.published_at ?? trip.start_date)}</div>
                {trip.publish_description && (
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{trip.publish_description}</div>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
