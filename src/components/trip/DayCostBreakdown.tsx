'use client';

import { formatCurrency } from '@/lib/utils';

interface Activity {
  place_type: string;
  estimated_cost: number;
  title: string;
}

interface Props {
  places: Activity[];
  numPeople: number;
  budget: number;
  durationDays: number;
}

const CATEGORIES = [
  { key: 'food',       types: ['food', 'cafe'],  label: 'Ăn uống',   emoji: '🍜', color: '#f97316' },
  { key: 'attraction', types: ['attraction'],     label: 'Tham quan', emoji: '🏛', color: '#3b82f6' },
  { key: 'transport',  types: ['transport'],      label: 'Di chuyển', emoji: '🚗', color: '#6b7280' },
  { key: 'hotel',      types: ['hotel'],          label: 'Lưu trú',   emoji: '🏨', color: '#10b981' },
  { key: 'other',      types: ['shopping', 'nightlife', 'other'], label: 'Khác', emoji: '🛍', color: '#a78bfa' },
];

const D = {
  surface2: '#1c2128', border: 'rgba(255,255,255,0.07)',
  text: '#e6edf3', textMuted: 'rgba(255,255,255,0.45)', textDim: 'rgba(255,255,255,0.22)',
};

export default function DayCostBreakdown({ places, numPeople, budget, durationDays }: Props) {
  // budget từ API có thể là string ("5000000.00") do Laravel decimal cast
  const budgetNum = Number(budget) || 0;
  const daysNum   = Math.max(1, Number(durationDays) || 1);
  const peopleNum = Math.max(1, Number(numPeople) || 1);

  const total = places.reduce((s, p) => s + (Number(p.estimated_cost) || 0), 0);
  const budgetPerDay = budgetNum / daysNum;
  const overBudget = total > budgetPerDay;

  const cats = CATEGORIES.map(cat => ({
    ...cat,
    amount: places
      .filter(p => cat.types.includes(p.place_type))
      .reduce((s, p) => s + (Number(p.estimated_cost) || 0), 0),
  })).filter(c => c.amount > 0);

  if (total === 0) return null;

  return (
    <div style={{ background: D.surface2, border: `1px solid ${D.border}`, borderRadius: 12, padding: '14px 16px', marginTop: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: D.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 }}>
          💰 Chi phí ngày này
        </span>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: overBudget ? '#f87171' : '#34d399' }}>
            {formatCurrency(total)}
          </span>
          {numPeople > 1 && (
            <span style={{ fontSize: 11, color: D.textDim, display: 'block' }}>
              ~{formatCurrency(Math.round(total / peopleNum))}/người
            </span>
          )}
        </div>
      </div>

      {/* Category bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {cats.map(cat => {
          const pct = total > 0 ? (cat.amount / total) * 100 : 0;
          return (
            <div key={cat.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, width: 18, textAlign: 'center', flexShrink: 0 }}>{cat.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 11, color: D.textMuted }}>{cat.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: D.text }}>{formatCurrency(cat.amount)}</span>
                </div>
                <div style={{ height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: cat.color, borderRadius: 99, transition: 'width 0.4s ease' }} />
                </div>
              </div>
              <span style={{ fontSize: 10, color: D.textDim, width: 28, textAlign: 'right', flexShrink: 0 }}>
                {Math.round(pct)}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Budget comparison */}
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${D.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: D.textDim }}>
          Ngân sách/ngày: {formatCurrency(Math.round(budgetPerDay))}
        </span>
        {overBudget ? (
          <span style={{ fontSize: 11, fontWeight: 600, color: '#f87171', background: 'rgba(248,113,113,0.1)', padding: '2px 8px', borderRadius: 99 }}>
            ⚠️ Vượt {formatCurrency(Math.round(total - budgetPerDay))}
          </span>
        ) : (
          <span style={{ fontSize: 11, fontWeight: 600, color: '#34d399', background: 'rgba(52,211,153,0.1)', padding: '2px 8px', borderRadius: 99 }}>
            ✓ Còn {formatCurrency(Math.round(budgetPerDay - total))}
          </span>
        )}
      </div>
    </div>
  );
}
