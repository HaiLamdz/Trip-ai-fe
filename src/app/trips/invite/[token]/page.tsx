'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

interface Trip {
  id: number;
  destination: string;
  start_date: string;
  duration_days: number;
  cover_image_url: string | null;
  user: {
    id: number;
    name: string;
    avatar: string | null;
  };
}

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasAttemptedJoin, setHasAttemptedJoin] = useState(false);
  const [authHydrated, setAuthHydrated] = useState(false);

  useEffect(() => {
    const fetchTrip = async () => {
      console.log('Current URL:', window.location.href);
      console.log('Pathname:', pathname);
      console.log('Token from useParams:', token);

      if (!token) {
        setError('Token không được tìm thấy trong URL');
        setLoading(false);
        return;
      }

      try {
        // Decode token nếu cần thiết
        const decodedToken = decodeURIComponent(token);
        console.log('Decoded token:', decodedToken);
        const { data } = await api.get(`/trips/invite/${decodedToken}`);
        console.log('Trip data:', data);
        setTrip(data.trip);
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        console.error('Error fetching trip:', msg);
        setError(msg || 'Không thể tải thông tin lịch trình');
      } finally {
        setLoading(false);
      }
    };

    fetchTrip();
  }, [token, pathname]);

  // Đợi auth store được hydrate từ localStorage
  useEffect(() => {
    // Đợi một chút để zustand persist hydrate xong
    const timer = setTimeout(() => {
      setAuthHydrated(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Auto-join khi đã đăng nhập và đã load trip
  useEffect(() => {
    const autoJoin = async () => {
      // Kiểm tra xem đã thử join chưa bằng localStorage
      const joinKey = `invite_join_attempt_${token}`;
      const alreadyAttempted = localStorage.getItem(joinKey);

      if (trip && authHydrated && user && !joining && !success && !error && !hasAttemptedJoin && !alreadyAttempted) {
        setHasAttemptedJoin(true);
        localStorage.setItem(joinKey, 'true');
        setJoining(true);
        try {
          const { data } = await api.post(`/trips/members/accept/${token}`);
          console.log('Join success:', data);
          setSuccess(true);
          setTimeout(() => {
            localStorage.removeItem(joinKey);
            router.push(`/trips/${data.trip_id}`);
          }, 2000);
        } catch (err: unknown) {
          const errorResponse = err as { response?: { status?: number; data?: { message?: string } } };
          const status = errorResponse?.response?.status;
          const msg = errorResponse?.response?.data?.message;
          console.error('Join error:', { status, msg });
          localStorage.removeItem(joinKey);

          // 409: Đã là thành viên → Chuyển thẳng đến trip
          if (status === 409) {
            router.push(`/trips/${trip.id}`);
          }
          // 404: Link không hợp lệ → Hiển thị error
          else if (status === 404) {
            setError(msg || 'Link mời không hợp lệ hoặc đã hết hạn');
          }
          // Lỗi khác → Hiển thị error
          else {
            setError(msg || 'Không thể tham gia lịch trình');
          }
        } finally {
          setJoining(false);
        }
      }
    };

    autoJoin();
  }, [trip, authHydrated, user, token, router, hasAttemptedJoin]);

  const handleJoin = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    setJoining(true);
    try {
      const { data } = await api.post(`/trips/members/accept/${token}`);
      console.log('Join success:', data);
      setSuccess(true);
      setTimeout(() => {
        router.push(`/trips/${data.trip_id}`);
      }, 2000);
    } catch (err: unknown) {
      const errorResponse = err as { response?: { status?: number; data?: { message?: string } } };
      const status = errorResponse?.response?.status;
      const msg = errorResponse?.response?.data?.message;
      console.error('Join error:', { status, msg });

      // 409: Đã là thành viên → Chuyển thẳng đến trip
      if (status === 409 && trip) {
        router.push(`/trips/${trip.id}`);
      }
      // 404: Link không hợp lệ → Hiển thị error
      else if (status === 404) {
        setError(msg || 'Link mời không hợp lệ hoặc đã hết hạn');
      }
      // Lỗi khác → Hiển thị error
      else {
        setError(msg || 'Không thể tham gia lịch trình');
      }
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#4f6ef7', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#64748b', fontSize: 14 }}>Đang tải thông tin lịch trình...</p>
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: 20 }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Link mời không hợp lệ</h1>
          <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
            {error || 'Link này đã hết hạn hoặc không tồn tại.'}
          </p>
          <Link href="/" style={{ display: 'inline-block', padding: '12px 24px', background: '#4f6ef7', color: '#fff', borderRadius: 10, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
            Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: 20 }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Đã tham gia thành công!</h1>
          <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>
            Đang chuyển đến trang lịch trình...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: 20 }}>
      <div style={{ maxWidth: 500, margin: '0 auto', paddingTop: 40 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>👥</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>
            Bạn được mời tham gia chuyến đi
          </h1>
          <p style={{ color: '#64748b', fontSize: 14 }}>
            {trip.user.name} mời bạn cùng tham gia lịch trình
          </p>
        </div>

        {/* Trip Card */}
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginBottom: 24 }}>
          {trip.cover_image_url && (
            <div style={{ width: '100%', height: 180, borderRadius: 12, overflow: 'hidden', marginBottom: 16, background: '#f1f5f9' }}>
              <img
                src={trip.cover_image_url}
                alt={trip.destination}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          )}

          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
            {trip.destination}
          </h2>

          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 13 }}>
              📅 {new Date(trip.start_date).toLocaleDateString('vi-VN')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 13 }}>
              🗓 {trip.duration_days} ngày
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px', background: '#f8fafc', borderRadius: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#4f6ef7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff' }}>
              {trip.user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{trip.user.name}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Người mời</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        {!user ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 16 }}>
              Bạn cần đăng nhập để tham gia chuyến đi này
            </p>
            <Link
              href={`/login?redirect_url=${encodeURIComponent(`/trips/invite/${token}`)}`}
              style={{ display: 'inline-block', width: '100%', padding: '14px', background: '#4f6ef7', color: '#fff', borderRadius: 12, textDecoration: 'none', fontSize: 15, fontWeight: 700, textAlign: 'center' }}
            >
              Đăng nhập ngay
            </Link>
          </div>
        ) : (
          <button
            onClick={handleJoin}
            disabled={joining}
            style={{
              width: '100%',
              padding: '14px',
              background: joining ? '#e2e8f0' : '#4f6ef7',
              color: joining ? '#94a3b8' : '#fff',
              borderRadius: 12,
              border: 'none',
              fontSize: 15,
              fontWeight: 700,
              cursor: joining ? 'not-allowed' : 'pointer',
            }}
          >
            {joining ? 'Đang tham gia...' : 'Tham gia chuyến đi'}
          </button>
        )}

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Link href="/" style={{ color: '#94a3b8', fontSize: 13, textDecoration: 'none' }}>
            Về trang chủ
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
