'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  {
    href: '/dashboard', label: 'Trang chủ',
    icon: (active: boolean) => (
      <svg width="22" height="22" fill={active ? '#2563eb' : 'none'} viewBox="0 0 24 24" stroke={active ? '#2563eb' : '#9ca3af'} strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: '/trips/create', label: 'Lịch trình',
    icon: (active: boolean) => (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={active ? '#2563eb' : '#9ca3af'} strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    href: '/saved-places', label: 'Đã lưu',
    icon: (active: boolean) => (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={active ? '#2563eb' : '#9ca3af'} strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
    ),
  },
  {
    href: '/favorites', label: 'Yêu thích',
    icon: (active: boolean) => (
      <svg width="22" height="22" fill={active ? '#2563eb' : 'none'} viewBox="0 0 24 24" stroke={active ? '#2563eb' : '#9ca3af'} strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
  },
  {
    href: '/profile', label: 'Hồ sơ',
    icon: (active: boolean) => (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={active ? '#2563eb' : '#9ca3af'} strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 60,
      background: '#fff',
      borderTop: '1px solid rgba(0,0,0,0.07)',
      display: 'flex', alignItems: 'center',
      padding: '8px 0 env(safe-area-inset-bottom, 8px)',
      boxShadow: '0 -4px 24px rgba(0,0,0,0.06)',
    }}>
      {TABS.map(tab => {
        const isActive =
          pathname === tab.href ||
          (tab.href !== '/dashboard' && tab.href !== '/trips/create' && pathname?.startsWith(tab.href)) ||
          (tab.href === '/trips/create' && (pathname === '/trips/create' || (pathname?.startsWith('/trips/') && pathname !== '/trips/create')));

        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, textDecoration: 'none', padding: '4px 0' }}
          >
            {tab.icon(isActive)}
            <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 400, color: isActive ? '#2563eb' : '#9ca3af' }}>
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
