'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

interface Member {
  id: number;
  user: { id: number; name: string; email: string; avatar: string | null };
  role: 'editor' | 'viewer';
  status: 'pending' | 'accepted' | 'declined';
  invited_at: string;
  accepted_at: string | null;
}

interface Owner {
  id: number; name: string; email: string; avatar: string | null;
}

const D = {
  bg: '#0d1117', surface: '#161b22', surface2: '#1c2128',
  border: 'rgba(255,255,255,0.07)', border2: 'rgba(255,255,255,0.12)',
  text: '#e6edf3', textMuted: 'rgba(255,255,255,0.45)', textDim: 'rgba(255,255,255,0.22)',
  accent: '#4f6ef7', accentBg: 'rgba(79,110,247,0.12)',
};

const ROLE_CONFIG = {
  owner:  { label: 'Chủ sở hữu', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  editor: { label: 'Biên tập viên', color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  viewer: { label: 'Người xem', color: '#818cf8', bg: 'rgba(129,140,248,0.12)' },
};

const STATUS_CONFIG = {
  accepted: { label: 'Đã tham gia', color: '#34d399' },
  pending:  { label: 'Chờ chấp nhận', color: '#f59e0b' },
  declined: { label: 'Đã từ chối', color: '#f87171' },
};

function Avatar({ user }: { user: { name: string; avatar: string | null } }) {
  return (
    <div style={{
      width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
      background: D.accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {user.avatar ? (
        <Image src={user.avatar} alt={user.name} width={38} height={38} unoptimized style={{ objectFit: 'cover' }} />
      ) : (
        <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
          {user.name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}

export default function TripMembersPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const [owner, setOwner] = useState<Owner | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('viewer');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [removing, setRemoving] = useState<number | null>(null);
  const [tripName, setTripName] = useState('');

  const fetchData = async () => {
    try {
      const [tripRes, memberRes] = await Promise.all([
        api.get(`/trips/${id}`),
        api.get(`/trips/${id}/members`),
      ]);
      setTripName(tripRes.data.trip?.destination ?? '');
      setOwner(memberRes.data.owner);
      setMembers(memberRes.data.members ?? []);
    } catch {
      router.push(`/trips/${id}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]); // eslint-disable-line

  const isOwner = currentUser?.id === owner?.id;

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteMsg(null);
    try {
      const { data } = await api.post(`/trips/${id}/members/invite`, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setInviteMsg({ type: 'success', text: data.message });
      setInviteEmail('');
      await fetchData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setInviteMsg({ type: 'error', text: msg || 'Có lỗi xảy ra.' });
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (memberId: number) => {
    setRemoving(memberId);
    try {
      await api.delete(`/trips/${id}/members/${memberId}`);
      setMembers(prev => prev.filter(m => m.id !== memberId));
    } catch { /* ignore */ }
    finally { setRemoving(null); }
  };

  const handleRoleChange = async (memberId: number, role: 'editor' | 'viewer') => {
    try {
      await api.put(`/trips/${id}/members/${memberId}/role`, { role });
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role } : m));
    } catch { /* ignore */ }
  };

  return (
    <div style={{ minHeight: '100vh', background: D.bg, color: D.text, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 30,
        background: 'rgba(13,17,23,0.95)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${D.border}`, padding: '14px 20px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <Link href={`/trips/${id}`} style={{ color: D.textMuted, textDecoration: 'none', fontSize: 20 }}>←</Link>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 17, fontWeight: 700, color: D.text, margin: 0 }}>👥 Thành viên</h1>
          {tripName && <div style={{ fontSize: 12, color: D.textMuted, marginTop: 1 }}>{tripName}</div>}
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px 80px' }}>

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{ width: 28, height: 28, border: `2px solid ${D.border2}`, borderTopColor: D.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        )}

        {!loading && (
          <>
            {/* Owner */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: D.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                Chủ sở hữu
              </div>
              {owner && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: D.surface, border: `1px solid ${D.border}`, borderRadius: 14, padding: '12px 14px' }}>
                  <Avatar user={owner} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: D.text }}>{owner.name}</div>
                    <div style={{ fontSize: 12, color: D.textMuted }}>{owner.email}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: ROLE_CONFIG.owner.color, background: ROLE_CONFIG.owner.bg, padding: '3px 10px', borderRadius: 99 }}>
                    {ROLE_CONFIG.owner.label}
                  </span>
                </div>
              )}
            </div>

            {/* Invite form — chỉ owner mới thấy */}
            {isOwner && (
              <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 16, padding: '16px 18px', marginBottom: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: D.text, marginBottom: 14 }}>
                  ✉️ Mời thành viên mới
                </div>

                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <input
                    type="email"
                    placeholder="Email tài khoản..."
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleInvite()}
                    style={{
                      flex: 1, padding: '10px 12px',
                      background: D.surface2, border: `1px solid ${D.border2}`,
                      borderRadius: 10, fontSize: 13, color: D.text, outline: 'none',
                    }}
                  />
                  <select
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value as 'editor' | 'viewer')}
                    style={{
                      padding: '10px 10px', background: D.surface2, border: `1px solid ${D.border2}`,
                      borderRadius: 10, fontSize: 13, color: D.text, cursor: 'pointer', outline: 'none',
                    }}
                  >
                    <option value="viewer">👁 Xem</option>
                    <option value="editor">✏️ Sửa</option>
                  </select>
                  <button
                    onClick={handleInvite}
                    disabled={inviting || !inviteEmail.trim()}
                    style={{
                      padding: '10px 16px', borderRadius: 10, border: 'none',
                      background: inviting ? 'rgba(79,110,247,0.4)' : D.accent,
                      color: '#fff', fontSize: 13, fontWeight: 700,
                      cursor: inviting ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    {inviting ? (
                      <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                    ) : 'Mời'}
                  </button>
                </div>

                {inviteMsg && (
                  <div style={{
                    fontSize: 12, fontWeight: 500,
                    color: inviteMsg.type === 'success' ? '#34d399' : '#f87171',
                    background: inviteMsg.type === 'success' ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)',
                    border: `1px solid ${inviteMsg.type === 'success' ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'}`,
                    borderRadius: 8, padding: '8px 12px',
                  }}>
                    {inviteMsg.type === 'success' ? '✓' : '✕'} {inviteMsg.text}
                  </div>
                )}

                <div style={{ marginTop: 12, fontSize: 11, color: D.textDim }}>
                  <strong style={{ color: D.textMuted }}>Biên tập viên</strong> — có thể thêm/sửa hoạt động.{' '}
                  <strong style={{ color: D.textMuted }}>Người xem</strong> — chỉ xem lịch trình.
                </div>
              </div>
            )}

            {/* Members list */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: D.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                Thành viên ({members.length})
              </div>

              {members.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: D.textMuted }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>👤</div>
                  <div style={{ fontSize: 14 }}>Chưa có thành viên nào.</div>
                  {isOwner && <div style={{ fontSize: 12, marginTop: 4 }}>Mời bạn bè qua email để cùng lên kế hoạch.</div>}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {members.map(m => {
                    const roleConfig = ROLE_CONFIG[m.role];
                    const statusConfig = STATUS_CONFIG[m.status];
                    return (
                      <div key={m.id} style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        background: D.surface, border: `1px solid ${D.border}`,
                        borderRadius: 14, padding: '12px 14px',
                        opacity: m.status === 'declined' ? 0.5 : 1,
                      }}>
                        <Avatar user={m.user} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: D.text }}>{m.user.name}</div>
                          <div style={{ fontSize: 12, color: D.textMuted }}>{m.user.email}</div>
                          <div style={{ fontSize: 11, color: statusConfig.color, marginTop: 2 }}>
                            {statusConfig.label}
                          </div>
                        </div>
                        {/* Role badge / selector */}
                        {isOwner && m.status === 'accepted' ? (
                          <select
                            value={m.role}
                            onChange={e => handleRoleChange(m.id, e.target.value as 'editor' | 'viewer')}
                            style={{
                              padding: '5px 8px', background: roleConfig.bg, border: 'none',
                              borderRadius: 8, fontSize: 11, fontWeight: 600, color: roleConfig.color, cursor: 'pointer', outline: 'none',
                            }}
                          >
                            <option value="viewer">👁 Xem</option>
                            <option value="editor">✏️ Sửa</option>
                          </select>
                        ) : (
                          <span style={{ fontSize: 11, fontWeight: 600, color: roleConfig.color, background: roleConfig.bg, padding: '3px 10px', borderRadius: 99 }}>
                            {roleConfig.label}
                          </span>
                        )}
                        {/* Remove button */}
                        {(isOwner || m.user.id === currentUser?.id) && (
                          <button
                            onClick={() => handleRemove(m.id)}
                            disabled={removing === m.id}
                            title={m.user.id === currentUser?.id ? 'Rời nhóm' : 'Xóa thành viên'}
                            style={{
                              background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
                              borderRadius: 8, color: '#f87171', cursor: 'pointer', padding: '5px 8px', fontSize: 12,
                              flexShrink: 0,
                            }}
                          >
                            {removing === m.id ? '…' : m.user.id === currentUser?.id ? '🚪' : '✕'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Info box */}
            <div style={{
              marginTop: 24, background: D.surface2, border: `1px solid ${D.border}`,
              borderRadius: 12, padding: '12px 14px',
            }}>
              <div style={{ fontSize: 11, color: D.textDim, lineHeight: 1.6 }}>
                💡 Người được mời sẽ nhận lời mời qua tài khoản của họ.
                Họ có thể chấp nhận từ mục <strong style={{ color: D.textMuted }}>Lời mời đang chờ</strong> trong trang hồ sơ.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
