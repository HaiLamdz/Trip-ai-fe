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
  const [menuOpen, setMenuOpen] = useState(false);

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

  const menuLinks = [
    { href: '/dashboard', label: 'Trang chủ' },
    { href: '/saved-places', label: 'Khám phá' },
    { href: '/favorites', label: 'Đã lưu' },
    { href: '/notifications', label: 'Thông báo' },
    { href: '/profile', label: 'Hồ sơ cá nhân' },
  ];

  return (
    <>
      <nav className="lg:hidden">
        <div className="sticky top-0 z-50 flex h-14 items-center justify-between rounded-[20px] border border-slate-200/80 bg-white/85 px-3 shadow-sm backdrop-blur">
          <button onClick={() => setMenuOpen((v) => !v)} className="flex h-9 w-9 items-center justify-center rounded-2xl text-slate-700 hover:bg-slate-100">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>

          <Link href="/dashboard" className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-blue-600 text-sm font-semibold text-white">✈</span>
            TripAI
          </Link>

          <Link href="/notifications" className="relative flex h-9 w-9 items-center justify-center rounded-2xl text-slate-700 hover:bg-slate-100">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            {unreadCount > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />}
          </Link>
        </div>
      </nav>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-slate-950/30 lg:hidden" onClick={() => setMenuOpen(false)} />
          <div className="fixed left-0 right-0 top-14 z-50 border-b border-slate-200 bg-white/95 px-3 py-2 shadow-lg lg:hidden">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <Link href="/profile" onClick={() => setMenuOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-500 text-sm font-semibold text-white">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </Link>
              <div>
                <div className="text-sm font-semibold text-slate-900">{user?.name || 'Tài khoản'}</div>
                <div className="text-xs text-slate-500">{user?.email || ''}</div>
              </div>
            </div>
            <div className="mt-2 space-y-1">
              {menuLinks.map((link) => {
                const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname?.startsWith(link.href));
                return (
                  <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className={`flex items-center rounded-2xl px-3 py-2.5 text-sm font-medium ${isActive ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
                    {link.label}
                  </Link>
                );
              })}
              <button onClick={handleLogout} className="mt-1 flex w-full items-center rounded-2xl px-3 py-2.5 text-left text-sm font-medium text-red-500 hover:bg-red-50">
                Đăng xuất
              </button>
            </div>
          </div>
        </>
      )}

      <nav className="hidden rounded-[24px] border border-slate-200/80 bg-white/80 px-4 py-3 shadow-sm backdrop-blur lg:flex lg:items-center lg:gap-4">
        <Link href="/dashboard" className="text-sm font-semibold text-slate-900">TripAI</Link>
        <div className="flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname?.startsWith(link.href));
            return (
              <Link key={link.href} href={link.href} className={`rounded-full px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
                {link.label}
              </Link>
            );
          })}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/notifications" className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            {unreadCount > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />}
          </Link>
          <Link href="/profile" className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-500 text-sm font-semibold text-white">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </Link>
        </div>
      </nav>
    </>
  );
}
