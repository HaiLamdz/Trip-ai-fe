'use client';

import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { PREFERENCES } from '@/lib/utils';

interface UserProfile {
  id: number; name: string; email: string;
  avatar?: string; phone?: string; bio?: string;
  preferences?: { preferences: string[] };
}

export default function ProfilePage() {
  const setUser = useAuthStore(s => s.setUser);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', bio: '' });
  const [prefs, setPrefs] = useState<string[]>([]);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [success, setSuccess] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get('/profile').then(({ data }) => {
      setProfile(data.user);
      setForm({ name: data.user.name || '', phone: data.user.phone || '', bio: data.user.bio || '' });
      setPrefs(data.user.preferences?.preferences || []);
    });
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('phone', form.phone);
      fd.append('bio', form.bio);
      if (avatarFile) fd.append('avatar', avatarFile);

      const { data } = await api.put('/profile', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setProfile(data.user);
      setUser(data.user);
      setSuccess('Đã cập nhật hồ sơ!');
      setTimeout(() => setSuccess(''), 3000);
    } catch {}
    finally { setSaving(false); }
  };

  const handleSavePrefs = async () => {
    setSavingPrefs(true);
    try {
      await api.put('/profile/preferences', { preferences: prefs });
      setSuccess('Đã cập nhật sở thích!');
      setTimeout(() => setSuccess(''), 3000);
    } catch {}
    finally { setSavingPrefs(false); }
  };

  const togglePref = (v: string) =>
    setPrefs(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]);

  if (!profile) return <div className="text-center py-20 text-gray-500">Đang tải...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">👤 Hồ sơ cá nhân</h1>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          ✅ {success}
        </div>
      )}

      {/* Profile form */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4">Thông tin cá nhân</h2>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div
              className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-3xl cursor-pointer overflow-hidden border-2 border-blue-200 hover:border-blue-400 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {avatarPreview || profile.avatar
                ? <img src={avatarPreview || profile.avatar} alt="avatar" className="w-full h-full object-cover" />
                : <span>{profile.name?.[0]?.toUpperCase()}</span>
              }
            </div>
            <div>
              <button type="button" onClick={() => fileRef.current?.click()} className="btn-outline text-sm">
                Đổi ảnh đại diện
              </button>
              <p className="text-xs text-gray-500 mt-1">JPEG, PNG, WebP · Tối đa 5MB</p>
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
          </div>

          <div>
            <label className="label">Họ tên</label>
            <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Số điện thoại</label>
            <input className="input" type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+84..." />
          </div>
          <div>
            <label className="label">Giới thiệu bản thân</label>
            <textarea className="input resize-none" rows={3} value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} placeholder="Tôi thích du lịch..." />
          </div>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </form>
      </div>

      {/* Preferences */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4">🎯 Sở thích du lịch</h2>
        <p className="text-sm text-gray-600 mb-4">AI sẽ dùng thông tin này để cá nhân hóa lịch trình cho bạn.</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {PREFERENCES.map(p => (
            <button key={p.value} type="button" onClick={() => togglePref(p.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                prefs.includes(p.value) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button onClick={handleSavePrefs} disabled={savingPrefs} className="btn-primary text-sm">
          {savingPrefs ? 'Đang lưu...' : 'Lưu sở thích'}
        </button>
      </div>
    </div>
  );
}
