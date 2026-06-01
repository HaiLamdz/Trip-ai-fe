'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface BreakdownItem {
  category: string;
  label: string;
  emoji: string;
  total_estimated: number;
  total_actual: number;
  per_person_estimated: number;
  per_person_actual: number;
}

interface CostSplitData {
  num_people: number;
  total_estimated: number;
  total_actual: number;
  per_person_estimated: number;
  per_person_actual: number;
  breakdown: BreakdownItem[];
}

interface Props {
  tripId: number;
  onClose: () => void;
}

export default function CostSplit({ tripId, onClose }: Props) {
  const [data, setData] = useState<CostSplitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'estimated' | 'actual'>('estimated');

  useEffect(() => {
    api.get(`/trips/${tripId}/cost-split`)
      .then(({ data: res }) => setData(res))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [tripId]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">💸 Chia chi phí</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
          </div>
        )}

        {!loading && !data && (
          <div className="text-center py-10 text-gray-500">
            <p>Không thể tải dữ liệu.</p>
          </div>
        )}

        {!loading && data && (
          <>
            {/* Toggle */}
            <div className="px-5 pt-4">
              <div className="flex bg-gray-100 rounded-xl p-1 text-sm">
                <button
                  onClick={() => setMode('estimated')}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${mode === 'estimated' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
                >
                  Dự kiến
                </button>
                <button
                  onClick={() => setMode('actual')}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${mode === 'actual' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
                >
                  Thực tế
                </button>
              </div>
            </div>

            {/* Hero: per person */}
            <div className="mx-5 mt-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-5 text-white text-center">
              <p className="text-sm opacity-80 mb-1">Mỗi người ({data.num_people} người)</p>
              <p className="text-3xl font-bold">
                {formatCurrency(mode === 'estimated' ? data.per_person_estimated : data.per_person_actual)}
              </p>
              <p className="text-xs opacity-70 mt-1">
                Tổng: {formatCurrency(mode === 'estimated' ? data.total_estimated : data.total_actual)}
              </p>
            </div>

            {/* Breakdown */}
            <div className="px-5 py-4 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Chi tiết theo danh mục</p>
              {data.breakdown.map(item => {
                const perPerson = mode === 'estimated' ? item.per_person_estimated : item.per_person_actual;
                const total     = mode === 'estimated' ? item.total_estimated : item.total_actual;
                const grandTotal = mode === 'estimated' ? data.total_estimated : data.total_actual;
                const pct = grandTotal > 0 ? (total / grandTotal) * 100 : 0;

                if (total === 0) return null;

                return (
                  <div key={item.category} className="flex items-center gap-3">
                    <span className="text-xl w-7 text-center shrink-0">{item.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">{item.label}</span>
                        <span className="font-medium text-gray-900">{formatCurrency(perPerson)}/người</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="bg-blue-400 h-1.5 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0 w-10 text-right">{Math.round(pct)}%</span>
                  </div>
                );
              })}
            </div>

            {/* Note */}
            {mode === 'actual' && data.total_actual === 0 && (
              <div className="mx-5 mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
                Chưa có chi tiêu thực tế. Cập nhật trong phần Ngân sách.
              </div>
            )}
          </>
        )}

        <div className="px-5 py-3 border-t border-gray-100">
          <button onClick={onClose} className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
