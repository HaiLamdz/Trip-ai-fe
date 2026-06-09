'use client';

import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { PREFERENCES } from '@/lib/utils';
import MobileNav from '@/components/layout/MobileNav';

interface UserProfile {
  id: number; name: string; email: string;
  avatar?: string; phone?: string; bio?: string;
  preferences?: { preferences: string[] };
}

const L = {
  bg: '#f8fafc',
  surface: '#ffffff',
  surface2: '#f1f5f9',
  border: '#e2e8f0',
  text: '#1e293b',
  muted: '#64748b',
  dim: '#94a3b8',
  accent: '#4f6ef7',
  accentBg: 'rgba(79,110,247,0.08)',
  green: '#10b981',
};

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
  const [error, setError] = useState('');
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
    setError('');
    try {
      const fd = new FormData();
      // Laravel method spoofing — PUT không hỗ trợ multipart/form-data
      fd.append('_method', 'PUT');
      fd.append('name', form.name);
      fd.append('phone', form.phone);
      fd.append('bio', form.bio);
      if (avatarFile) fd.append('avatar', avatarFile);
      const { data } = await api.post('/profile', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setProfile(data.user);
      setUser(data.user);
      setSuccess('Đã cập nhật hồ sơ!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Không thể lưu. Vui lòng thử lại.');
    }
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

  if (!profile) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
      <div style={{ width: 28, height: 28, border: '2.5px solid #e2e8f0', borderTopColor: L.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ background: L.bg, fontFamily: 'Inter, system-ui, sans-serif', paddingBottom: 80 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} input::placeholder,textarea::placeholder{color:#94a3b8}`}</style>
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Header */}
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: L.text, margin: '0 0 4px', letterSpacing: '-0.5px' }}>Hồ sơ cá nhân</h1>
          <p style={{ fontSize: 14, color: L.muted, margin: 0 }}>Quản lý thông tin và sở thích du lịch của bạn</p>
        </div>

        {/* Success toast */}
        {success && (
          <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', color: '#059669', fontSize: 13, fontWeight: 500 }}>
            ✅ {success}
          </div>
        )}

        {/* Error toast */}
        {error && (
          <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#dc2626', fontSize: 13, fontWeight: 500 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Profile card */}
        <div style={{ background: L.surface, border: `1px solid ${L.border}`, borderRadius: 20, padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: L.accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: L.accent, fontWeight: 700, flexShrink: 0 }}>1</div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: L.text, margin: 0 }}>Thông tin cá nhân</h2>
          </div>

          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div
                onClick={() => fileRef.current?.click()}
                style={{ width: 72, height: 72, borderRadius: '50%', background: L.accentBg, border: `2px solid ${L.border}`, overflow: 'hidden', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: L.accent, fontWeight: 700 }}
              >
                {avatarPreview || profile.avatar
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={avatarPreview || profile.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : profile.name?.[0]?.toUpperCase()
                }
              </div>
              <div>
                <button type="button" onClick={() => fileRef.current?.click()}
                  style={{ padding: '7px 16px', borderRadius: 10, background: L.surface2, border: `1px solid ${L.border}`, color: L.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Đổi ảnh đại diện
                </button>
                <p style={{ fontSize: 11, color: L.dim, marginTop: 4 }}>JPEG, PNG, WebP · Tối đa 5MB</p>
              </div>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleAvatarChange} />
            </div>

            {/* Email (readonly) */}
            <div>
              <label style={lbSt}>Email</label>
              <input value={profile.email} readOnly style={{ ...inSt, color: L.dim, cursor: 'default' }} />
            </div>

            <div>
              <label style={lbSt}>Họ tên</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inSt} placeholder="Tên của bạn" />
            </div>

            <div>
              <label style={lbSt}>Số điện thoại</label>
              <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+84..." style={inSt} />
            </div>

            <div>
              <label style={lbSt}>Giới thiệu bản thân</label>
              <textarea rows={3} value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} placeholder="Tôi thích du lịch..." style={{ ...inSt, resize: 'none', lineHeight: 1.6 }} />
            </div>

            <button type="submit" disabled={saving}
              style={{ padding: '12px', borderRadius: 12, border: 'none', background: saving ? '#93a5fb' : L.accent, color: '#fff', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {saving ? (
                <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Đang lưu…</>
              ) : 'Lưu thay đổi'}
            </button>
          </form>
        </div>

        {/* Preferences card */}
        <div style={{ background: L.surface, border: `1px solid ${L.border}`, borderRadius: 20, padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: L.accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: L.accent, fontWeight: 700, flexShrink: 0 }}>2</div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: L.text, margin: 0 }}>🎯 Sở thích du lịch</h2>
          </div>
          <p style={{ fontSize: 13, color: L.muted, margin: '0 0 16px' }}>Trip AI sẽ dùng thông tin này để cá nhân hóa lịch trình cho bạn.</p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {PREFERENCES.map(p => {
              const active = prefs.includes(p.value);
              return (
                <button key={p.value} type="button" onClick={() => togglePref(p.value)}
                  style={{ padding: '7px 14px', borderRadius: 99, fontSize: 13, fontWeight: active ? 600 : 500, cursor: 'pointer', border: `1px solid ${active ? L.accent : L.border}`, background: active ? L.accentBg : L.surface2, color: active ? L.accent : L.muted, transition: 'all 0.15s' }}>
                  {p.label}
                </button>
              );
            })}
          </div>

          <button onClick={handleSavePrefs} disabled={savingPrefs}
            style={{ padding: '11px 24px', borderRadius: 12, border: 'none', background: savingPrefs ? '#93a5fb' : L.accent, color: '#fff', fontSize: 14, fontWeight: 700, cursor: savingPrefs ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            {savingPrefs ? (
              <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Đang lưu…</>
            ) : 'Lưu sở thích'}
          </button>
        </div>

      </div>
      {/* Mobile bottom nav — chỉ hiện trên mobile */}
      <div className="mobile-only-nav">
        <MobileNav />
      </div>
      <style>{`.mobile-only-nav{display:none}@media(max-width:768px){.mobile-only-nav{display:block}}`}</style>
    </div>
  );
}

const lbSt: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: '#64748b',
  display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4,
};
const inSt: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: '#f8fafc', border: '1px solid #e2e8f0',
  borderRadius: 10, padding: '10px 13px',
  fontSize: 14, color: '#1e293b', outline: 'none',
};
