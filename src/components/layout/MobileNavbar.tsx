'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useNotifications } from '@/hooks/useNotifications';
import api from '@/lib/api';
import { useState } from 'react';

const ALL_LINKS = [
  { href: '/dashboard',    label: 'Trang chủ'     },
  { href: '/saved-places', label: 'Khám phá'       },
  { href: '/favorites',    label: 'Đã lưu'         },
  { href: '/community',    label: 'Cộng đồng'     },
  { href: '/notifications',label: 'Thông báo'     },
  { href: '/profile',      label: 'Hồ sơ cá nhân' },
];

export default function MobileNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { unreadCount } = useNotifications(!!user);
  const [open, setOpen] = useState(false);
  const initial = user?.name?.[0]?.toUpperCase() || 'U';

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    logout();
    router.push('/');
  };

  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 52, padding: '0 16px',
        background: '#ffffff',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
        position: 'sticky', top: 0, zIndex: 40,
      }}>
        <button
          onClick={() => setOpen(v => !v)}
          style={{ width: 36, height: 36, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151' }}
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16"/>
          </svg>
        </button>

        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <span style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#2563eb,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>✦</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#111827', letterSpacing: '-0.3px' }}>TripAI</span>
        </Link>

        <Link href="/notifications" style={{ position: 'relative', width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151', textDecoration: 'none' }}>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
          </svg>
          {unreadCount > 0 && (
            <span style={{ position: 'absolute', top: 7, right: 7, width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />
          )}
        </Link>
      </div>

      {/* Drawer */}
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 49, background: 'rgba(0,0,0,0.2)' }}
          />
          <div style={{
            position: 'fixed', top: 52, left: 0, right: 0, zIndex: 50,
            background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.08)',
            padding: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          }}>
            {/* User */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: '#f9fafb', borderRadius: 12, marginBottom: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#2563eb,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                {initial}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{user?.name || 'Tài khoản'}</div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>{user?.email}</div>
              </div>
            </div>
            {ALL_LINKS.map(link => {
              const isActive = pathname === link.href;
              return (
                <Link key={link.href} href={link.href} onClick={() => setOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', borderRadius: 10, marginBottom: 2, fontSize: 14, fontWeight: isActive ? 600 : 500, color: isActive ? '#fff' : '#374151', background: isActive ? '#2563eb' : 'transparent', textDecoration: 'none' }}>
                  {link.label}
                </Link>
              );
            })}
            <button onClick={handleLogout}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 10, marginTop: 4, fontSize: 14, fontWeight: 500, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
              Đăng xuất
            </button>
          </div>
        </>
      )}
    </>
  );
}
