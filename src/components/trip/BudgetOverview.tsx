'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface Expense {
  amount: string;
  category: string;
}

interface TripBudgetData {
  food: string; transport: string; attraction: string;
  accommodation: string; other: string; total_estimated: string;
  food_actual?: string; transport_actual?: string; attraction_actual?: string;
  accommodation_actual?: string; other_actual?: string; total_actual?: string;
}

interface Props {
  tripId: number;
  budgetData: TripBudgetData | null;
  plannedBudget: number;      // user-entered budget
  numPeople: number;
  durationDays: number;
}

const CATEGORIES = [
  { key: 'food',          label: 'Ẩm thực',   emoji: '🍜', color: '#f97316', actual_key: 'food_actual' },
  { key: 'transport',     label: 'Di chuyển',  emoji: '🚗', color: '#6b7280', actual_key: 'transport_actual' },
  { key: 'attraction',    label: 'Tham quan',  emoji: '🏛️', color: '#3b82f6', actual_key: 'attraction_actual' },
  { key: 'accommodation', label: 'Lưu trú',    emoji: '🏨', color: '#10b981', actual_key: 'accommodation_actual' },
  { key: 'other',         label: 'Khác',       emoji: '🛍️', color: '#a78bfa', actual_key: 'other_actual' },
];

// Map expense categories -> budget categories
const EXPENSE_TO_BUDGET: Record<string, string> = {
  food: 'food', transport: 'transport', attraction: 'attraction',
  accommodation: 'accommodation', shopping: 'other', other: 'other',
};

const D = {
  surface2: '#1c2128', border: 'rgba(255,255,255,0.07)',
  text: '#e6edf3', textMuted: 'rgba(255,255,255,0.45)', textDim: 'rgba(255,255,255,0.22)',
  accent: '#4f6ef7',
};

export default function BudgetOverview({ tripId, budgetData, plannedBudget, numPeople, durationDays }: Props) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.get(`/trips/${tripId}/expenses`)
      .then(({ data }) => setExpenses(data.expenses ?? []))
      .catch(() => setExpenses([]))
      .finally(() => setLoaded(true));
  }, [tripId]);

  if (!loaded) return null;

  const totalEstimated = Number(budgetData?.total_estimated) || plannedBudget;
  const totalPlanned   = plannedBudget;

  // Tính thực tế từ expenses
  const actualByCategory: Record<string, number> = {};
  for (const exp of expenses) {
    const budgetCat = EXPENSE_TO_BUDGET[exp.category] ?? 'other';
    actualByCategory[budgetCat] = (actualByCategory[budgetCat] ?? 0) + Number(exp.amount);
  }
  const totalActual = Object.values(actualByCategory).reduce((s, v) => s + v, 0);

  // Tỷ lệ so với dự kiến
  const spentPct = totalEstimated > 0 ? Math.min(100, (totalActual / totalEstimated) * 100) : 0;
  const budgetPct = totalEstimated > 0 ? Math.min(100, (totalEstimated / totalPlanned) * 100) : 0;
  const isOverActual = totalActual > totalEstimated;
  const isOverPlanned = totalEstimated > totalPlanned;

  return (
    <div style={{ marginTop: 16 }}>
      {/* ─── Header ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: D.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 }}>
          💰 Ngân sách tổng quan
        </span>
        <Link href={`/trips/${tripId}/expenses`} style={{ fontSize: 11, color: D.accent, textDecoration: 'none', fontWeight: 600 }}>
          Chi tiết →
        </Link>
      </div>

      {/* ─── 3 Summary boxes ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
        {/* Kế hoạch người dùng nhập */}
        <div style={{ background: D.surface2, borderRadius: 12, padding: '10px 12px', border: `1px solid ${D.border}` }}>
          <div style={{ fontSize: 10, color: D.textDim, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
            Kế hoạch
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: D.text }}>{formatCurrency(totalPlanned)}</div>
          <div style={{ fontSize: 10, color: D.textDim, marginTop: 2 }}>Bạn đặt ra</div>
        </div>

        {/* Dự kiến AI */}
        <div style={{ background: D.surface2, borderRadius: 12, padding: '10px 12px', border: `1px solid ${isOverPlanned ? 'rgba(248,113,113,0.3)' : D.border}` }}>
          <div style={{ fontSize: 10, color: D.textDim, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
            Dự kiến AI
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: isOverPlanned ? '#f87171' : '#34d399' }}>
            {formatCurrency(totalEstimated)}
          </div>
          <div style={{ fontSize: 10, color: isOverPlanned ? 'rgba(248,113,113,0.6)' : D.textDim, marginTop: 2 }}>
            {isOverPlanned
              ? `+${formatCurrency(totalEstimated - totalPlanned)}`
              : budgetPct < 100 ? `Còn ${formatCurrency(totalPlanned - totalEstimated)}` : 'Đúng ngân sách'}
          </div>
        </div>

        {/* Thực chi */}
        <div style={{ background: D.surface2, borderRadius: 12, padding: '10px 12px', border: `1px solid ${isOverActual ? 'rgba(248,113,113,0.3)' : D.border}` }}>
          <div style={{ fontSize: 10, color: D.textDim, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
            Đã chi
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: isOverActual ? '#f87171' : totalActual > 0 ? '#fbbf24' : D.textDim }}>
            {totalActual > 0 ? formatCurrency(totalActual) : '–'}
          </div>
          <div style={{ fontSize: 10, color: D.textDim, marginTop: 2 }}>
            {totalActual > 0
              ? isOverActual
                ? `Vượt ${formatCurrency(totalActual - totalEstimated)}`
                : `Còn ${formatCurrency(totalEstimated - totalActual)}`
              : 'Chưa có'}
          </div>
        </div>
      </div>

      {/* ─── Progress bar: Actual vs Estimated ─── */}
      {totalActual > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 11, color: D.textDim }}>
              Đã chi {Math.round(spentPct)}% ngân sách dự kiến
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, color: isOverActual ? '#f87171' : '#34d399' }}>
              {formatCurrency(totalActual)} / {formatCurrency(totalEstimated)}
            </span>
          </div>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden', position: 'relative' }}>
            {/* Planned vs Estimated marker */}
            {budgetPct < 100 && (
              <div style={{
                position: 'absolute', top: 0, left: `${budgetPct}%`,
                height: '100%', width: 2, background: 'rgba(255,255,255,0.25)', zIndex: 2,
              }} />
            )}
            <div style={{
              height: '100%', width: `${spentPct}%`,
              background: isOverActual
                ? 'linear-gradient(90deg, #f97316, #ef4444)'
                : spentPct > 75
                  ? 'linear-gradient(90deg, #34d399, #fbbf24)'
                  : 'linear-gradient(90deg, #34d399, #4f6ef7)',
              borderRadius: 99, transition: 'width 0.5s ease',
            }} />
          </div>
        </div>
      )}

      {/* ─── Category breakdown: Estimated vs Actual ─── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {CATEGORIES.map(cat => {
          const estimated = Number((budgetData as Record<string, string> | null)?.[cat.key] ?? 0);
          const actual    = actualByCategory[cat.key] ?? 0;
          if (estimated === 0 && actual === 0) return null;
          const barPct    = estimated > 0 ? Math.min(100, (actual / estimated) * 100) : 0;
          const isOver    = actual > estimated && estimated > 0;

          return (
            <div key={cat.key} style={{ background: D.surface2, borderRadius: 10, padding: '10px 12px', border: `1px solid ${D.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>{cat.emoji}</span>
                <span style={{ flex: 1, fontSize: 12, color: D.text, fontWeight: 600 }}>{cat.label}</span>
                <div style={{ textAlign: 'right' }}>
                  {actual > 0 ? (
                    <>
                      <span style={{ fontSize: 12, fontWeight: 700, color: isOver ? '#f87171' : '#fbbf24' }}>
                        {formatCurrency(actual)}
                      </span>
                      <span style={{ fontSize: 11, color: D.textDim }}> / {formatCurrency(estimated)}</span>
                    </>
                  ) : (
                    <span style={{ fontSize: 12, fontWeight: 600, color: D.textDim }}>
                      {formatCurrency(estimated)}
                    </span>
                  )}
                </div>
              </div>
              {/* Bar */}
              <div style={{ height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden' }}>
                {actual > 0 ? (
                  <div style={{
                    height: '100%', width: `${barPct}%`,
                    background: isOver ? '#ef4444' : cat.color,
                    borderRadius: 99, transition: 'width 0.4s',
                  }} />
                ) : (
                  /* Show estimated as reference */
                  <div style={{
                    height: '100%', width: `${totalEstimated > 0 ? (estimated / totalEstimated) * 100 : 0}%`,
                    background: `${cat.color}50`, borderRadius: 99,
                  }} />
                )}
              </div>
              {actual > 0 && (
                <div style={{ marginTop: 4, fontSize: 10, color: isOver ? '#f87171' : '#34d399' }}>
                  {isOver
                    ? `⚠ Vượt ${formatCurrency(actual - estimated)}`
                    : `✓ Còn ${formatCurrency(estimated - actual)}`}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ─── Per person ─── */}
      {numPeople > 1 && totalEstimated > 0 && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${D.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: D.textDim }}>Mỗi người ({numPeople} người)</span>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: D.text }}>
              ~{formatCurrency(Math.round(totalEstimated / numPeople))}
            </span>
            {totalActual > 0 && (
              <span style={{ fontSize: 11, color: D.textDim, display: 'block' }}>
                Đã chi: ~{formatCurrency(Math.round(totalActual / numPeople))}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ─── No expenses CTA ─── */}
      {totalActual === 0 && expenses.length === 0 && (
        <div style={{ marginTop: 10, background: 'rgba(79,110,247,0.06)', border: `1px dashed rgba(79,110,247,0.25)`, borderRadius: 10, padding: '10px 12px', fontSize: 12, color: D.textDim }}>
          💡 Thêm chi tiêu thực tế để theo dõi ngân sách của bạn.{' '}
          <Link href={`/trips/${tripId}/expenses`} style={{ color: D.accent, fontWeight: 600 }}>Thêm ngay →</Link>
        </div>
      )}
    </div>
  );
}
