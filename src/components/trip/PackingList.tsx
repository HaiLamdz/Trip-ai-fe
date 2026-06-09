'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface PackingItem {
  name: string;
  quantity: string;
  essential: boolean;
  note?: string;
}

interface PackingCategory {
  name: string;
  emoji: string;
  items: PackingItem[];
}

interface PackingListData {
  categories: PackingCategory[];
  tips: string[];
}

interface Props {
  tripId: number;
  onClose: () => void;
}

export default function PackingList({ tripId, onClose }: Props) {
  const [data, setData] = useState<PackingListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.get(`/trips/${tripId}/packing-list`)
      .then(({ data: res }) => setData(res.packing_list))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [tripId]);

  const toggle = (key: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const totalItems = data?.categories.reduce((s, c) => s + c.items.length, 0) ?? 0;
  const packedCount = checked.size;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">🎒 Danh sách đồ cần mang</h2>
            {!loading && data && (
              <p className="text-xs text-gray-500 mt-0.5">
                {packedCount}/{totalItems} đã chuẩn bị
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        {/* Progress bar */}
        {!loading && data && totalItems > 0 && (
          <div className="px-6 pt-3">
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${(packedCount / totalItems) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
              <div className="w-8 h-8 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
              <span className="text-sm">Trip AI đang tạo danh sách…</span>
            </div>
          )}

          {!loading && !data && (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-3">😕</div>
              <p>Không thể tải danh sách. Vui lòng thử lại.</p>
            </div>
          )}

          {!loading && data && (
            <>
              {data.categories.map((cat, ci) => (
                <div key={ci}>
                  <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <span>{cat.emoji}</span>
                    <span>{cat.name}</span>
                    <span className="text-xs text-gray-400 font-normal">
                      ({cat.items.filter(item => checked.has(`${ci}-${item.name}`)).length}/{cat.items.length})
                    </span>
                  </h3>
                  <div className="space-y-1.5">
                    {cat.items.map((item, ii) => {
                      const key = `${ci}-${item.name}`;
                      const isDone = checked.has(key);
                      return (
                        <label
                          key={ii}
                          className={`flex items-start gap-3 p-2.5 rounded-xl cursor-pointer transition-colors
                            ${isDone ? 'bg-emerald-50' : 'bg-gray-50 hover:bg-gray-100'}`}
                        >
                          <input
                            type="checkbox"
                            checked={isDone}
                            onChange={() => toggle(key)}
                            className="mt-0.5 w-4 h-4 rounded accent-emerald-500 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-sm font-medium ${isDone ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                {item.name}
                              </span>
                              {item.essential && !isDone && (
                                <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">
                                  Bắt buộc
                                </span>
                              )}
                              {item.quantity && (
                                <span className="text-xs text-gray-400">{item.quantity}</span>
                              )}
                            </div>
                            {item.note && (
                              <p className="text-xs text-gray-400 mt-0.5">{item.note}</p>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}

              {data.tips.length > 0 && (
                <div className="bg-blue-50 rounded-xl p-4">
                  <h3 className="font-semibold text-blue-800 mb-2 text-sm">💡 Mẹo du lịch</h3>
                  <ul className="space-y-1">
                    {data.tips.map((tip, i) => (
                      <li key={i} className="text-xs text-blue-700 flex gap-2">
                        <span className="shrink-0">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && data && (
          <div className="px-6 py-3 border-t border-gray-100 flex justify-between items-center">
            <button
              onClick={() => setChecked(new Set())}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Bỏ chọn tất cả
            </button>
            <button
              onClick={() => {
                const allKeys = new Set(
                  data.categories.flatMap((cat, ci) => cat.items.map(item => `${ci}-${item.name}`))
                );
                setChecked(allKeys);
              }}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
            >
              Chọn tất cả ✓
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
