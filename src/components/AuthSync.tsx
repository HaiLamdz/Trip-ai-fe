'use client';

import { useEffect } from 'react';

/**
 * Syncs jwt_token from localStorage → cookie on every page load.
 * Needed because Next.js middleware can only read cookies (not localStorage).
 * Without this, users who logged in before the cookie was set would get 404/redirect.
 */
export default function AuthSync() {
  useEffect(() => {
    const token = localStorage.getItem('jwt_token');
    if (token) {
      // Ensure cookie is always in sync with localStorage
      const maxAge = 60 * 60 * 24 * 30; // 30 days
      document.cookie = `jwt_token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
    }
  }, []);

  return null;
}
