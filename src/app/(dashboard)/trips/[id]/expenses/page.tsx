'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface Expense {
  id: number;
  amount: string;
  category: string;
  note: string | null;
  paid_by: string | null;
  expense_date: string;
  trip_place_id: number | null;
  place?: { id: number; title: string; place_type: string; place_name: string } | null;
}

interface Summary {
  total: number;
  by_category: Record<string, number>;
  count: number;
}

const CATEGORIES: Record<string, { label: string; emoji: string; color: string }> = {
  food:          { label: 'Ẩm thực',   emoji: '🍜', color: '#f97316' },
  transport:     { label: 'Di chuyển',  emoji: '🚗', color: '#6b7280' },
  attraction:    { label: 'Tham quan',  emoji: '🏛️', color: '#3b82f6' },
  accommodation: { label: 'Lưu trú',   emoji: '🏨', color: '#10b981' },
  shopping:      { label: 'Mua sắm',   emoji: '🛍️', color: '#eab308' },
  other:         { label: 'Khác',       emoji: '📦', color: '#94a3b8' },
};

const D = {
  bg: '#0d1117', surface: '#161b22', surface2: '#1c2128',
  border: 'rgba(255,255,255,0.07)', border2: 'rgba(255,255,255,0.12)',
  text: '#e6edf3', textMuted: 'rgba(255,255,255,0.45)', textDim: 'rgba(255,255,255,0.22)',
  accent: '#4f6ef7', accentBg: 'rgba(79,110,247,0.12)',
};

const EMPTY_FORM = { amount: '', category: 'food', note: '', paid_by: '', expense_date: '' };

export default function ExpensesPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [expenses, setExpenses]   = useState<Expense[]>([]);
  const [summary, setSummary]     = useState<Summary | null>(null);
  const [loading, setLoading]     = useState(true);
  const [tripName, setTripName]   = useState('');
  const [filterCat, setFilterCat] = useState<string>('all');
  const [addOpen, setAddOpen]     = useState(false);
  const [editItem, setEditItem]   = useState<Expense | null>(null);
  const [form, setForm]           = useState({ ...EMPTY_FORM, expense_date: new Date().toISOString().split('T')[0] });
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState<number | null>(null);

  const fetchData = async () => {
    try {
      const [tripRes, expRes] = await Promise.all([
        api.get(`/trips/${id}`),
        api.get(`/trips/${id}/expenses`),
      ]);
      setTripName(tripRes.data.trip?.destination ?? '');
      setExpenses(expRes.data.expenses ?? []);
      setSummary(expRes.data.summary ?? null);
    } catch {
      router.push(`/trips/${id}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]); // eslint-disable-line

  /* ── Filter ── */
  const filtered = filterCat === 'all'
    ? expenses
    : expenses.filter(e => e.category === filterCat);

  /* ── Group by date ── */
  const grouped = filtered.reduce<Record<string, Expense[]>>((acc, exp) => {
    const key = exp.expense_date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(exp);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  /* ── Save (add / edit) ── */
  const handleSave = async () => {
    if (!form.amount || Number(form.amount) <= 0 || !form.expense_date) return;
    setSaving(true);
    try {
      const payload = {
        amount: Number(form.amount),
        category: form.category,
        note: form.note || null,
        paid_by: form.paid_by || null,
        expense_date: form.expense_date,
      };
      if (editItem) {
        await api.put(`/trips/${id}/expenses/${editItem.id}`, payload);
      } else {
        await api.post(`/trips/${id}/expenses`, payload);
      }
      await fetchData();
      setAddOpen(false);
      setEditItem(null);
      setForm({ ...EMPTY_FORM, expense_date: new Date().toISOString().split('T')[0] });
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const openEdit = (exp: Expense) => {
    setEditItem(exp);
    setForm({
      amount: String(Number(exp.amount)),
      category: exp.category,
      note: exp.note ?? '',
      paid_by: exp.paid_by ?? '',
      expense_date: exp.expense_date,
    });
    setAddOpen(true);
  };

  const handleDelete = async (expId: number) => {
    setDeleting(expId);
    try {
      await api.delete(`/trips/${id}/expenses/${expId}`);
      await fetchData();
    } catch { /* ignore */ }
    finally { setDeleting(null); }
  };

  const closeForm = () => {
    setAddOpen(false);
    setEditItem(null);
    setForm({ ...EMPTY_FORM, expense_date: new Date().toISOString().split('T')[0] });
  };

  /* ── Render ── */
  return (
    <div style={{ minHeight: '100vh', background: D.bg, color: D.text, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 30,
        background: 'rgba(13,17,23,0.95)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${D.border}`,
        padding: '14px 20px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <Link href={`/trips/${id}`} style={{ color: D.textMuted, textDecoration: 'none', fontSize: 20 }}>←</Link>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 17, fontWeight: 700, color: D.text, margin: 0 }}>💸 Danh sách chi phí</h1>
          {tripName && <div style={{ fontSize: 12, color: D.textMuted, marginTop: 1 }}>{tripName}</div>}
        </div>
        <Link
          href={`/trips/${id}/journal`}
          style={{
            fontSize: 12, fontWeight: 600, color: '#818cf8',
            background: D.accentBg, border: `1px solid rgba(79,110,247,0.3)`,
            borderRadius: 8, padding: '6px 12px', textDecoration: 'none',
          }}
        >
          📔 Nhật ký
        </Link>
        <button
          onClick={() => setAddOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '7px 14px', borderRadius: 10, border: 'none',
            background: '#34d399', color: '#0d1117',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}
        >
          + Thêm
        </button>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px 80px' }}>

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{ width: 28, height: 28, border: `2px solid ${D.border2}`, borderTopColor: D.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        )}

        {!loading && (
          <>
            {/* ── Summary card ── */}
            {summary && summary.total > 0 && (
              <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 16, padding: '18px 20px', marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: D.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 }}>Tổng chi phí</span>
                  <span style={{ fontSize: 22, fontWeight: 800, color: '#34d399' }}>{formatCurrency(summary.total)}</span>
                </div>

                {/* Category breakdown bars */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {Object.entries(CATEGORIES).map(([key, cat]) => {
                    const amount = summary.by_category[key] ?? 0;
                    if (!amount) return null;
                    const pct = summary.total > 0 ? (amount / summary.total) * 100 : 0;
                    return (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 16, width: 22, textAlign: 'center', flexShrink: 0 }}>{cat.emoji}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 12, color: D.textMuted }}>{cat.label}</span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: D.text }}>{formatCurrency(amount)}</span>
                          </div>
                          <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: cat.color, borderRadius: 99, transition: 'width 0.4s ease' }} />
                          </div>
                        </div>
                        <span style={{ fontSize: 11, color: D.textDim, width: 30, textAlign: 'right', flexShrink: 0 }}>
                          {Math.round(pct)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Category filter ── */}
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 20, paddingBottom: 2, scrollbarWidth: 'none' }}>
              <button
                onClick={() => setFilterCat('all')}
                style={{
                  flexShrink: 0, padding: '6px 14px', borderRadius: 99,
                  border: `1px solid ${filterCat === 'all' ? D.accent : D.border}`,
                  background: filterCat === 'all' ? D.accentBg : 'transparent',
                  color: filterCat === 'all' ? '#818cf8' : D.textMuted,
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Tất cả ({expenses.length})
              </button>
              {Object.entries(CATEGORIES).map(([key, cat]) => {
                const count = expenses.filter(e => e.category === key).length;
                if (!count) return null;
                const active = filterCat === key;
                return (
                  <button
                    key={key}
                    onClick={() => setFilterCat(key)}
                    style={{
                      flexShrink: 0, padding: '6px 14px', borderRadius: 99,
                      border: `1px solid ${active ? cat.color : D.border}`,
                      background: active ? `${cat.color}18` : 'transparent',
                      color: active ? cat.color : D.textMuted,
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    {cat.emoji} {cat.label} ({count})
                  </button>
                );
              })}
            </div>

            {/* ── Expense list grouped by date ── */}
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: D.textMuted }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🧾</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: D.text, marginBottom: 6 }}>Chưa có chi phí nào</div>
                <div style={{ fontSize: 13 }}>Thêm chi phí thực tế trong chuyến đi.</div>
                <button onClick={() => setAddOpen(true)}
                  style={{ marginTop: 20, padding: '10px 24px', borderRadius: 10, border: 'none', background: D.accent, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  + Thêm chi phí đầu tiên
                </button>
              </div>
            ) : (
              sortedDates.map(date => {
                const dayTotal = grouped[date].reduce((s, e) => s + Number(e.amount), 0);
                const d = new Date(date);
                const dateLabel = d.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' });

                return (
                  <div key={date} style={{ marginBottom: 24 }}>
                    {/* Date header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: D.textMuted, textTransform: 'capitalize' }}>{dateLabel}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#34d399' }}>{formatCurrency(dayTotal)}</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {grouped[date].map(exp => {
                        const cat = CATEGORIES[exp.category] ?? CATEGORIES.other;
                        return (
                          <div key={exp.id} style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            background: D.surface, border: `1px solid ${D.border}`,
                            borderRadius: 14, padding: '12px 14px',
                          }}>
                            {/* Category icon */}
                            <div style={{
                              width: 40, height: 40, borderRadius: 12,
                              background: `${cat.color}15`, border: `1px solid ${cat.color}30`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 18, flexShrink: 0,
                            }}>
                              {cat.emoji}
                            </div>

                            {/* Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 600, color: D.text }}>
                                {exp.note || cat.label}
                              </div>
                              <div style={{ display: 'flex', gap: 8, marginTop: 2, fontSize: 12, color: D.textDim }}>
                                {exp.paid_by && <span>👤 {exp.paid_by}</span>}
                                {exp.place && <span>📍 {exp.place.title}</span>}
                              </div>
                            </div>

                            {/* Amount */}
                            <div style={{ flexShrink: 0, textAlign: 'right' }}>
                              <div style={{ fontSize: 15, fontWeight: 800, color: D.text }}>
                                {formatCurrency(Number(exp.amount))}
                              </div>
                              <div style={{ fontSize: 11, color: cat.color, marginTop: 1 }}>{cat.label}</div>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                              <button
                                onClick={() => openEdit(exp)}
                                style={{ background: D.surface2, border: `1px solid ${D.border2}`, borderRadius: 8, color: D.textMuted, cursor: 'pointer', padding: '5px 8px', fontSize: 12 }}
                              >✏️</button>
                              <button
                                onClick={() => handleDelete(exp.id)}
                                disabled={deleting === exp.id}
                                style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 8, color: '#f87171', cursor: 'pointer', padding: '5px 8px', fontSize: 12 }}
                              >
                                {deleting === exp.id ? '…' : '🗑'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}
      </div>

      {/* ── Add / Edit modal ── */}
      {addOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={closeForm}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
          <div
            style={{
              position: 'relative', width: '100%', maxWidth: 520,
              background: D.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
              border: `1px solid ${D.border2}`, padding: '0 0 28px',
              maxHeight: '92vh', overflowY: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 6px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.12)' }} />
            </div>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 20px 16px', borderBottom: `1px solid ${D.border}` }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: D.text, margin: 0 }}>
                {editItem ? '✏️ Sửa chi phí' : '+ Thêm chi phí'}
              </h2>
              <button onClick={closeForm} style={{ background: 'none', border: 'none', color: D.textMuted, cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>

            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Số tiền */}
              <div>
                <label style={lbSt}>Số tiền (VNĐ)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number" min={0} placeholder="0"
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    style={{ ...inSt, fontSize: 20, fontWeight: 700, paddingRight: 36 }}
                  />
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: D.textMuted }}>₫</span>
                </div>
              </div>

              {/* Danh mục */}
              <div>
                <label style={lbSt}>Danh mục</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {Object.entries(CATEGORIES).map(([key, cat]) => {
                    const active = form.category === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setForm(f => ({ ...f, category: key }))}
                        style={{
                          padding: '10px 6px', borderRadius: 12,
                          border: active ? `1.5px solid ${D.accent}` : 'none',
                          background: active ? D.accentBg : D.surface2,
                          color: active ? '#818cf8' : D.textMuted,
                          cursor: 'pointer',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                        }}
                      >
                        <span style={{ fontSize: 20 }}>{cat.emoji}</span>
                        <span style={{ fontSize: 11, fontWeight: 600 }}>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Người trả */}
              <div>
                <label style={lbSt}>Người trả</label>
                <input
                  type="text" placeholder="Tên người trả (không bắt buộc)"
                  value={form.paid_by}
                  onChange={e => setForm(f => ({ ...f, paid_by: e.target.value }))}
                  style={inSt}
                />
              </div>

              {/* Ngày */}
              <div>
                <label style={lbSt}>Ngày</label>
                <input
                  type="date" value={form.expense_date}
                  onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))}
                  style={{ ...inSt, colorScheme: 'dark' }}
                />
              </div>

              {/* Ghi chú */}
              <div>
                <label style={lbSt}>Ghi chú</label>
                <input
                  type="text" placeholder="Ghi chú thêm (không bắt buộc)"
                  value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  style={inSt}
                />
              </div>

              {/* Button */}
              <button
                onClick={handleSave}
                disabled={saving || !form.amount || Number(form.amount) <= 0}
                style={{
                  width: '100%', padding: '14px', borderRadius: 14, border: 'none',
                  background: saving ? 'rgba(79,110,247,0.4)' : D.accent,
                  color: '#fff', fontSize: 15, fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {saving ? (
                  <>
                    <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                    Đang lưu…
                  </>
                ) : (
                  editItem ? 'Lưu thay đổi' : 'Lưu chi phí'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const lbSt: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.45)',
  display: 'block', marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.5,
};
const inSt: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: '#1c2128', border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 10, padding: '11px 13px',
  fontSize: 14, color: '#e6edf3', outline: 'none',
};
