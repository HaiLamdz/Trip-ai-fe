'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

const D = {
  bg: '#10141c', border: 'rgba(255,255,255,0.08)',
  text: '#e6edf3', textMuted: 'rgba(255,255,255,0.38)', accent: '#4f6ef7',
};

const NAV_ITEMS = [
  {
    href: '/dashboard', label: 'Trang chủ',
    icon: (active: boolean) => (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={active ? '#4f6ef7' : 'currentColor'} strokeWidth={active ? 2.2 : 1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: '/community', label: 'Cộng đồng',
    icon: (active: boolean) => (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={active ? '#4f6ef7' : 'currentColor'} strokeWidth={active ? 2.2 : 1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: '/trips/create', label: '', isCreate: true,
    icon: (_active: boolean) => (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    ),
  },
  {
    href: '/notifications', label: 'Thông báo',
    icon: (active: boolean) => (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={active ? '#4f6ef7' : 'currentColor'} strokeWidth={active ? 2.2 : 1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  {
    href: '/profile', label: 'Tôi',
    icon: (active: boolean) => (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={active ? '#4f6ef7' : 'currentColor'} strokeWidth={active ? 2.2 : 1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router   = useRouter();
  const { logout } = useAuthStore();

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    logout();
    router.push('/');
  };
  void handleLogout; // suppress unused warning — logout available via profile page

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
      height: 64,
      background: D.bg,
      borderTop: `1px solid ${D.border}`,
      display: 'flex', alignItems: 'center',
      paddingBottom: 'env(safe-area-inset-bottom)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
    }}>
      {NAV_ITEMS.map(item => {
        const isActive = pathname === item.href;

        if (item.isCreate) {
          return (
            <div key={item.href} style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <Link href={item.href} style={{
                width: 48, height: 48,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #4f6ef7 0%, #7c3aed 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(79,110,247,0.45)',
                textDecoration: 'none',
                marginTop: -16,
                border: '3px solid #10141c',
              }}>
                {item.icon(false)}
              </Link>
            </div>
          );
        }

        return (
          <Link key={item.href} href={item.href} style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 3,
            textDecoration: 'none', paddingTop: 4,
            color: isActive ? D.accent : D.textMuted,
          }}>
            {item.icon(isActive)}
            <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 400, letterSpacing: '0.2px' }}>
              {item.label}
            </span>
            {isActive && (
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: D.accent, marginTop: -1 }} />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
