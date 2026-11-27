const decimal = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatPrice = (value: number): string => `₹ ${decimal.format(value)}`;

export const formatSigned = (value: number): string => `${value > 0 ? '+' : ''}${decimal.format(value)}`;

export const formatPercent = (value: number): string => `${formatSigned(value)}%`;

export function formatVolume(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

export type Trend = 'up' | 'down' | 'flat';
export const trendOf = (value: number): Trend => (value > 0 ? 'up' : value < 0 ? 'down' : 'flat');

const date = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const time = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export const formatDate = (value: Date): string => date.format(value);
export const formatTime = (value: Date): string => time.format(value);
