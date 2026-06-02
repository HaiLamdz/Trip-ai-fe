'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Syncs jwt_token from localStorage → cookie on every page load.
 * Needed because Next.js middleware can only read cookies (not localStorage).
 *
 * Flow khi mở tab mới:
 * 1. Middleware (server) đọc cookie → không có → redirect /login?redirect=...
 * 2. Trang login detect localStorage vẫn có token → tự redirect về trang gốc
 * 3. Lần này cookie đã được set → middleware cho qua
 */
export default function AuthSync() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('jwt_token');
    if (!token) return;

    // Sync localStorage → cookie để middleware đọc được
    const maxAge = 60 * 60 * 24 * 30; // 30 days
    document.cookie = `jwt_token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;

    // Nếu đang ở trang login nhưng có token → redirect về đích
    if (window.location.pathname === '/login' || window.location.pathname === '/register') {
      const params = new URLSearchParams(window.location.search);
      const redirectTo = params.get('redirect') || '/dashboard';
      router.replace(redirectTo);
    }
  }, [router]);

  return null;
}
