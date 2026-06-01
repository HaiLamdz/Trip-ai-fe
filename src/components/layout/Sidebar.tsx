'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

const D = {
  bg: '#0d1117', surface: '#161b22', border: 'rgba(255,255,255,0.07)',
  text: '#e6edf3', textMuted: 'rgba(255,255,255,0.45)', accent: '#4f6ef7',
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    logout();
    router.push('/');
  };

  const mainLinks = [
    { href: '/dashboard', label: 'Lịch trình', icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
    )},
    { href: '/saved-places', label: 'Khám phá', icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
    )},
    { href: '/favorites', label: 'Đã lưu', icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
    )},
  ];

  const statusLinks = [
    { href: '/dashboard?status=processing', label: 'Đang xử lý', icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2"/></svg>
    )},
    { href: '/dashboard?status=completed', label: 'Đã lưu trữ', icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
    )},
    { href: '/profile', label: 'Cài đặt', icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" /></svg>
    )},
  ];

  return (
    <aside style={{ width: 220, flexShrink: 0, background: D.bg, borderRight: `1px solid ${D.border}`, display: 'flex', flexDirection: 'column', padding: '20px 12px', gap: 0 }}>

      {/* AI Assistant card */}
      <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #4f6ef7, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>✦</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: D.text }}>TripAI Assistant</div>
            <div style={{ fontSize: 11, color: D.textMuted }}>Sẵn sàng lên kế hoạch chuyến đi tiếp theo</div>
          </div>
        </div>
        <Link href="/trips/create" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          width: '100%', padding: '8px 0', borderRadius: 8,
          background: D.accent, color: '#fff', fontSize: 13, fontWeight: 600,
          textDecoration: 'none', border: 'none',
        }}>
          ✦ Gợi ý mới từ AI
        </Link>
      </div>

      {/* MAIN section */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: D.textMuted, letterSpacing: 1.2, textTransform: 'uppercase', padding: '0 8px', marginBottom: 6 }}>Chính</div>
        {mainLinks.map(link => {
          const isActive = pathname === link.href;
          return (
            <Link key={link.href} href={link.href} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 10px', borderRadius: 8, marginBottom: 2,
              background: isActive ? D.accent : 'transparent',
              color: isActive ? '#fff' : D.textMuted,
              textDecoration: 'none', fontSize: 14, fontWeight: isActive ? 600 : 400,
              transition: 'background 0.15s, color 0.15s',
            }}>
              {link.icon}
              {link.label}
            </Link>
          );
        })}
      </div>

      {/* STATUS section */}
      <div style={{ marginBottom: 'auto' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: D.textMuted, letterSpacing: 1.2, textTransform: 'uppercase', padding: '0 8px', marginBottom: 6 }}>Trạng thái</div>
        {statusLinks.map(link => {
          const isActive = pathname === link.href;
          return (
            <Link key={link.href} href={link.href} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 10px', borderRadius: 8, marginBottom: 2,
              background: isActive ? D.accent : 'transparent',
              color: isActive ? '#fff' : D.textMuted,
              textDecoration: 'none', fontSize: 14, fontWeight: isActive ? 600 : 400,
              transition: 'background 0.15s, color 0.15s',
            }}>
              {link.icon}
              {link.label}
            </Link>
          );
        })}
      </div>

      {/* Bottom: Help + Feedback + Logout */}
      <div style={{ borderTop: `1px solid ${D.border}`, paddingTop: 12, marginTop: 12 }}>
        <Link href="/notifications" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, color: D.textMuted, textDecoration: 'none', fontSize: 13, marginBottom: 2 }}>
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01"/></svg>
          Trợ giúp
        </Link>
        <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, color: D.textMuted, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, width: '100%', textAlign: 'left' }}>
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
