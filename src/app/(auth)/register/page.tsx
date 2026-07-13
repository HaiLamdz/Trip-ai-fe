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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.22),_transparent_35%),linear-gradient(135deg,_#f8fbff_0%,_#eef4ff_100%)] px-3 py-4 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[24px] border border-white/70 bg-white/80 shadow-[0_30px_80px_rgba(15,23,42,0.16)] backdrop-blur sm:rounded-[32px] xl:grid-cols-[0.95fr_1.05fr]">
        <div className="hidden bg-slate-950 px-8 py-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-200">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              Thiết kế cho hành trình mới
            </div>
            <h1 className="mt-8 text-4xl font-semibold leading-tight">Bắt đầu hành trình với một tài khoản thông minh.</h1>
            <p className="mt-4 max-w-md text-sm leading-7 text-slate-300">
              Lưu các điểm đến, chia sẻ ý tưởng và để AI đề xuất trải nghiệm phù hợp nhất cho bạn.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/10 p-5 text-sm text-slate-300">
            <p className="font-medium text-white">Mọi thứ bạn cần trong một nơi.</p>
            <ul className="mt-3 space-y-2">
              <li>• Hướng dẫn cập nhật theo thời gian thật.</li>
              <li>• Lưu trữ chuyến đi và cảm xúc bên lề.</li>
              <li>• Hoàn toàn tối ưu cho di động và máy tính.</li>
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
              <h2 className="mt-5 text-3xl font-semibold text-slate-900">Tạo tài khoản</h2>
              <p className="mt-2 text-sm text-slate-500">Nhập thông tin để bắt đầu một hành trình mới.</p>
            </div>

            <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[24px] sm:p-6">
              {errors.general && (
                <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errors.general}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Họ tên</label>
                  <input type="text" className="input" placeholder="Nguyễn Văn A" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
                </div>
                <div>
                  <label className="label">Email</label>
                  <input type="email" className="input" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                  {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
                </div>
                <div>
                  <label className="label">Mật khẩu</label>
                  <input type="password" className="input" placeholder="Tối thiểu 8 ký tự" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
                  {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
                </div>
                <div>
                  <label className="label">Xác nhận mật khẩu</label>
                  <input type="password" className="input" placeholder="Nhập lại mật khẩu" value={form.password_confirmation} onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })} required />
                  {errors.password_confirmation && <p className="mt-1 text-xs text-red-500">{errors.password_confirmation}</p>}
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
                  {loading ? 'Đang tạo tài khoản...' : 'Đăng ký miễn phí'}
                </button>
              </form>

              <p className="mt-5 text-center text-sm text-slate-600">
                Đã có tài khoản?{' '}
                <Link href="/login" className="font-semibold text-blue-600 hover:underline">Đăng nhập</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
