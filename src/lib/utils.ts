export const formatCurrency = (amount: number): string => {
  const n = Number(amount);
  if (isNaN(n)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
};

export const formatDate = (date: string): string =>
  new Intl.DateTimeFormat('vi-VN', { dateStyle: 'long' }).format(new Date(date));

export const cn = (...classes: (string | undefined | null | false)[]): string =>
  classes.filter(Boolean).join(' ');

export const PLACE_TYPE_COLORS: Record<string, string> = {
  food:       '#f97316', // orange
  cafe:       '#a78bfa', // violet
  attraction: '#3b82f6', // blue
  hotel:      '#8b5cf6', // purple
  transport:  '#6b7280', // gray
  other:      '#10b981', // green
};

export const PREFERENCES = [
  { value: 'food',       label: 'Ẩm thực' },
  { value: 'cafe',       label: 'Cafe' },
  { value: 'nature',     label: 'Thiên nhiên' },
  { value: 'culture',    label: 'Văn hóa' },
  { value: 'adventure',  label: 'Phiêu lưu' },
  { value: 'shopping',   label: 'Mua sắm' },
  { value: 'nightlife',  label: 'Về đêm' },
  { value: 'budget',     label: 'Tiết kiệm' },
  { value: 'luxury',     label: 'Sang trọng' },
];
