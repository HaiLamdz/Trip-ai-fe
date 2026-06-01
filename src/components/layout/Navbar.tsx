'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useNotifications } from '@/hooks/useNotifications';
import api from '@/lib/api';
import { useState } from 'react';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { unreadCount } = useNotifications(!!user);
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    logout();
    router.push('/');
  };

  const navLinks = [
    { href: '/dashboard', label: 'Lịch trình' },
    { href: '/saved-places', label: 'Khám phá' },
    { href: '/favorites', label: 'Đã lưu' },
  ];

  return (
    <nav style={{
      background: 'rgba(13,17,23,0.95)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 40,
    }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', gap: 32 }}>
        {/* Logo */}
        <Link href="/dashboard" style={{ fontWeight: 700, fontSize: 16, color: '#fff', textDecoration: 'none', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: 6 }}>
          ✈ TripAI
        </Link>

        {/* Nav links */}
        <div style={{ display: 'flex', gap: 4 }}>
          {navLinks.map(link => {
            const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname?.startsWith(link.href));
            return (
              <Link key={link.href} href={link.href} style={{
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#fff' : 'rgba(255,255,255,0.45)',
                textDecoration: 'none',
                padding: '4px 12px',
                borderRadius: 6,
                borderBottom: isActive ? '2px solid #4f6ef7' : '2px solid transparent',
                transition: 'color 0.15s',
              }}>
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Search bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 14px', width: 220 }}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.3)" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>Tìm kiếm điểm đến...</span>
        </div>

        {/* Right actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Notification */}
          <Link href="/notifications" style={{ position: 'relative', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, color: 'rgba(255,255,255,0.5)', textDecoration: 'none', background: 'rgba(255,255,255,0.04)' }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: '50%', background: '#ef4444', border: '1.5px solid #0d1117' }} />
            )}
          </Link>

          {/* User avatar */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowMenu(!showMenu)} style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #4f6ef7, #7c3aed)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700 }}>
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </button>
            {showMenu && (
              <div style={{ position: 'absolute', right: 0, top: 40, width: 200, background: '#161b22', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '6px', zIndex: 50, boxShadow: '0 16px 40px rgba(0,0,0,0.5)' }}>
                {[
                  { href: '/profile', label: '👤 Hồ sơ' },
                  { href: '/saved-places', label: '📍 Địa điểm đã lưu' },
                  { href: '/favorites', label: '❤️ Yêu thích' },
                ].map(item => (
                  <Link key={item.href} href={item.href} onClick={() => setShowMenu(false)} style={{ display: 'block', padding: '8px 12px', fontSize: 13, color: 'rgba(255,255,255,0.7)', textDecoration: 'none', borderRadius: 8 }}>
                    {item.label}
                  </Link>
                ))}
                <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
                <button onClick={handleLogout} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: 13, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 8 }}>
                  🚪 Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
