'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({ name: '', email: '', password: '', password_confirmation: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (form.password !== form.password_confirmation) {
      setErrors({ password_confirmation: 'Mật khẩu xác nhận không khớp' });
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      setAuth(data.user, data.token);
      router.push('/dashboard');
    } catch (err: unknown) {
      const apiErrors = (err as { response?: { data?: { errors?: Record<string, string[]> } } })?.response?.data?.errors;
      if (apiErrors) {
        const flat: Record<string, string> = {};
        Object.entries(apiErrors).forEach(([k, v]) => { flat[k] = v[0]; });
        setErrors(flat);
      } else {
        setErrors({ general: 'Đăng ký thất bại. Vui lòng thử lại.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-blue-600">✈️ TripAI</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-4">Tạo tài khoản</h1>
        </div>

        <div className="card">
          {errors.general && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Họ tên</label>
              <input type="text" className="input" placeholder="Nguyễn Văn A"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" placeholder="you@example.com"
                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="label">Mật khẩu</label>
              <input type="password" className="input" placeholder="Tối thiểu 8 ký tự"
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>
            <div>
              <label className="label">Xác nhận mật khẩu</label>
              <input type="password" className="input" placeholder="Nhập lại mật khẩu"
                value={form.password_confirmation} onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })} required />
              {errors.password_confirmation && <p className="text-red-500 text-xs mt-1">{errors.password_confirmation}</p>}
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? 'Đang tạo tài khoản...' : 'Đăng ký miễn phí'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-4">
            Đã có tài khoản?{' '}
            <Link href="/login" className="text-blue-600 hover:underline font-medium">Đăng nhập</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
