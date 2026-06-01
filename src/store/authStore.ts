import { create } from 'zustand';

interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  phone?: string;
  bio?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('jwt_token') : null,

  setAuth: (user, token) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('jwt_token', token);
      // Set cookie accessible by middleware (no HttpOnly so JS can read too)
      const maxAge = 60 * 60 * 24 * 30; // 30 days
      document.cookie = `jwt_token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
    }

    set({ user, token });
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('jwt_token');
      document.cookie = 'jwt_token=; path=/; max-age=0';
    }

    set({ user: null, token: null });
  },

  setUser: (user) => set({ user }),
}));
