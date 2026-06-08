'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useNotifications } from '@/hooks/useNotifications';
import api from '@/lib/api';
import { useState } from 'react';

export default function Navbar() {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { unreadCount } = useNotifications(!!user);
  const [menuOpen, setMenuOpen]   = useState(false);

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    logout();
    router.push('/');
  };

  const navLinks = [
    { href: '/dashboard',    label: 'Lịch trình' },
    { href: '/saved-places', label: 'Khám phá'   },
    { href: '/favorites',    label: 'Đã lưu'      },
  ];

  const menuLinks = [
    { href: '/dashboard',    label: 'Trang chủ'        },
    { href: '/saved-places', label: 'Khám phá'          },
    { href: '/favorites',    label: 'Đã lưu'            },
    { href: '/notifications',label: 'Thông báo'         },
    { href: '/profile',      label: 'Hồ sơ cá nhân'    },
  ];

  return (
    <>
      <style>{`
        .navbar-mobile  { display: none !important; }
        .navbar-desktop { display: flex !important; }
        @media (max-width: 768px) {
          .navbar-mobile  { display: flex !important; }
          .navbar-desktop { display: none !important; }
        }
      `}</style>

      {/* ══════════════════════════════════════════
          MOBILE  — ≡  🌐 TripAI  ···  🔔  avatar
      ══════════════════════════════════════════ */}
      <nav className="navbar-mobile" style={{
        position: 'sticky', top: 0, zIndex: 50,
        height: 56,
        background: '#0d1117',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(12px)',
        alignItems: 'center',
        padding: '0 16px',
        gap: 12,
      }}>
        {/* Hamburger ≡ */}
        <button
          onClick={() => setMenuOpen(v => !v)}
          style={{ background: 'none', border: 'none', color: '#e6edf3', cursor: 'pointer', padding: 4, display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}
        >
          <span style={{ display: 'block', width: 20, height: 2, background: 'currentColor', borderRadius: 99 }} />
          <span style={{ display: 'block', width: 20, height: 2, background: 'currentColor', borderRadius: 99 }} />
          <span style={{ display: 'block', width: 20, height: 2, background: 'currentColor', borderRadius: 99 }} />
        </button>

        {/* Logo */}
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', flexShrink: 0 }}>
          {/* Globe-search icon */}
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
            <circle cx="12" cy="12" r="9" stroke="#e6edf3" strokeWidth="1.6"/>
            <path d="M3 12h18M12 3c-2 3-3 5.5-3 9s1 6 3 9M12 3c2 3 3 5.5 3 9s-1 6-3 9" stroke="#e6edf3" strokeWidth="1.4"/>
            <circle cx="19" cy="19" r="4" fill="#0d1117" stroke="#e6edf3" strokeWidth="1.6"/>
            <path d="M21.8 21.8l2 2" stroke="#e6edf3" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          <span style={{ fontSize: 19, fontWeight: 700, color: '#fff', letterSpacing: '-0.4px' }}>TripAI</span>
        </Link>

        <div style={{ flex: 1 }} />

        {/* Bell */}
        <Link
          href="/notifications"
          style={{ position: 'relative', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: 'rgba(255,255,255,0.75)', flexShrink: 0 }}
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {unreadCount > 0 && (
            <span style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: '50%', background: '#ef4444', border: '1.5px solid #0d1117' }} />
          )}
        </Link>

        {/* Avatar — click → profile */}
        <Link
          href="/profile"
          style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'linear-gradient(135deg, #4f6ef7, #7c3aed)',
            border: '2px solid rgba(255,255,255,0.15)',
            flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 13, fontWeight: 700,
            overflow: 'hidden', textDecoration: 'none',
          }}
        >
          {user?.avatar
            ? <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : (user?.name?.[0]?.toUpperCase() || 'U')
          }
        </Link>
      </nav>

      {/* Mobile slide-down menu */}
      {menuOpen && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 48 }}
            onClick={() => setMenuOpen(false)}
          />
          <div style={{
            position: 'fixed', top: 56, left: 0, right: 0, zIndex: 49,
            background: '#161b22',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          }}>
            {/* User info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <Link href="/profile" onClick={() => setMenuOpen(false)} style={{
                width: 42, height: 42, borderRadius: '50%',
                background: 'linear-gradient(135deg, #4f6ef7, #7c3aed)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 16, fontWeight: 700, flexShrink: 0,
                overflow: 'hidden', textDecoration: 'none',
              }}>
                {user?.avatar
                  ? <img src={user.avatar} alt={user?.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  : (user?.name?.[0]?.toUpperCase() || 'U')
                }
              </Link>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#e6edf3' }}>{user?.name || 'Tài khoản'}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{user?.email || ''}</div>
              </div>
            </div>

            {/* Nav links */}
            {menuLinks.map(link => {
              const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname?.startsWith(link.href));
              return (
                <Link
                  key={link.href} href={link.href}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: 'flex', alignItems: 'center',
                    padding: '13px 20px',
                    fontSize: 15, fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#fff' : 'rgba(255,255,255,0.55)',
                    textDecoration: 'none',
                    borderLeft: isActive ? '3px solid #4f6ef7' : '3px solid transparent',
                    background: isActive ? 'rgba(79,110,247,0.08)' : 'transparent',
                  }}
                >
                  {link.label}
                </Link>
              );
            })}

            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
            <button
              onClick={handleLogout}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '13px 20px', fontSize: 15, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Đăng xuất
            </button>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════
          DESKTOP  (unchanged layout)
      ══════════════════════════════════════════ */}
      <nav className="navbar-desktop" style={{
        background: 'rgba(13,17,23,0.95)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 40,
        alignItems: 'center',
      }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', gap: 32, width: '100%' }}>
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
                  fontSize: 14, fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.45)',
                  textDecoration: 'none', padding: '4px 12px', borderRadius: 6,
                  borderBottom: isActive ? '2px solid #4f6ef7' : '2px solid transparent',
                  transition: 'color 0.15s',
                }}>
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div style={{ flex: 1 }} />

          {/* Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 14px', width: 220 }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.3)" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>Tìm kiếm điểm đến...</span>
          </div>

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link href="/notifications" style={{ position: 'relative', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, color: 'rgba(255,255,255,0.5)', textDecoration: 'none', background: 'rgba(255,255,255,0.04)' }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: '50%', background: '#ef4444', border: '1.5px solid #0d1117' }} />
              )}
            </Link>

            <div style={{ position: 'relative' }}>
              <Link
                href="/profile"
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #4f6ef7, #7c3aed)',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 13, fontWeight: 700,
                  overflow: 'hidden', textDecoration: 'none', flexShrink: 0,
                }}
              >
                {user?.avatar
                  ? <img src={user.avatar} alt={user?.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  : (user?.name?.[0]?.toUpperCase() || 'U')
                }
              </Link>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
