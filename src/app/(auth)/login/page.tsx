'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-500">Đang tải...</div>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const redirectUrl = searchParams.get('redirect_url') || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      setAuth(data.user, data.token);
      window.location.href = redirectUrl;
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.22),_transparent_35%),linear-gradient(135deg,_#f8fbff_0%,_#eef4ff_100%)] px-3 py-4 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[24px] border border-white/70 bg-white/80 shadow-[0_30px_80px_rgba(15,23,42,0.16)] backdrop-blur sm:rounded-[32px] xl:grid-cols-[1.05fr_0.95fr]">
        <div className="hidden bg-slate-950 px-8 py-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-200">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-400" />
              TripAI Assistant
            </div>
            <h1 className="mt-8 text-4xl font-semibold leading-tight">Tạo chuyến đi của bạn với sự hỗ trợ từ AI.</h1>
            <p className="mt-4 max-w-md text-sm leading-7 text-slate-300">
              Lập lịch trình, tìm điểm đến phù hợp và theo dõi ngân sách trong một trải nghiệm mượt mà và hiện đại.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/10 p-5 text-sm text-slate-300">
            <p className="font-medium text-white">Tại sao người dùng thích TripAI?</p>
            <ul className="mt-3 space-y-2">
              <li>• Gợi ý lịch trình cá nhân hóa theo sở thích.</li>
              <li>• Quản lý chi tiêu và điểm đến trong một nơi.</li>
              <li>• Giao diện vừa đẹp vừa dễ dùng trên mọi thiết bị.</li>
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-center bg-white/70 px-4 py-6 sm:px-8 sm:py-10 lg:px-10">
          <div className="w-full max-w-md">
            <div className="mb-8 text-center">
              <Link href="/" className="inline-flex items-center gap-2 text-2xl font-semibold text-slate-900">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-lg text-white">✈</span>
                TripAI
              </Link>
              <h2 className="mt-5 text-3xl font-semibold text-slate-900">Đăng nhập</h2>
              <p className="mt-2 text-sm text-slate-500">Chào mừng trở lại. Hãy tiếp tục hành trình.</p>
            </div>

            <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[24px] sm:p-6">
              {error && (
                <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Email</label>
                  <input type="email" className="input" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Mật khẩu</label>
                  <input type="password" className="input" placeholder="••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
                  {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                </button>
              </form>

              <p className="mt-5 text-center text-sm text-slate-600">
                Chưa có tài khoản?{' '}
                <Link href="/register" className="font-semibold text-blue-600 hover:underline">Đăng ký</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
