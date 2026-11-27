import { QuoteField } from '@market/shared';
import { Layout } from '../../hooks/useLayout';
import { formatPrice, formatSigned, formatVolume } from '../../utils/format';
import { SortKey } from '../../utils/sort';

type Widths = Record<Layout, number>;

export type Column = { id: string; label: string; width: Widths; sortKey?: SortKey } & (
  | { kind: 'symbol' | 'company' | 'percent' }
  | { kind: 'value'; field: QuoteField; format: (value: number) => string; strong?: boolean; signed?: boolean }
);

/** The first three columns stay fixed while the others scroll. */
export const STICKY_COUNT = 3;

/** `narrow` (under 360 px) defaults to the phone width. */
const w = (desktop: number, tablet: number, phone: number, narrow = phone): Widths => ({ desktop, tablet, phone, narrow });
const price = (id: string, label: string, field: QuoteField, width: Widths): Column => ({ id, label, width, kind: 'value', field, format: formatPrice });

export const COLUMNS: readonly Column[] = [
  { id: 'symbol', label: 'Symbol', width: w(147, 124, 90, 80), kind: 'symbol', sortKey: 'symbol' },
  { id: 'company', label: 'Company', width: w(216, 150, 88, 70), kind: 'company' },
  { id: 'ltp', label: 'LTP', width: w(128, 116, 94, 84), kind: 'value', field: 'ltp', format: formatPrice, strong: true, sortKey: 'ltp' },
  { id: 'pct', label: 'Change %', width: w(133, 118, 86), kind: 'percent', sortKey: 'pct' },
  { id: 'chg', label: 'Change ₹', width: w(120, 110, 90), kind: 'value', field: 'chg', format: formatSigned, signed: true },
  price('bid', 'Bid', 'bid', w(128, 122, 100)),
  price('ask', 'Ask', 'ask', w(128, 122, 100)),
  price('avg', 'Avg. Price', 'avg', w(130, 122, 100)),
  price('high', 'Day High', 'high', w(139, 122, 100)),
  price('low', 'Day Low', 'low', w(129, 122, 100)),
  { id: 'vol', label: 'Volume', width: w(115, 100, 80), kind: 'value', field: 'vol', format: formatVolume },
  price('h52', '52W High', 'h52', w(128, 122, 100)),
  price('l52', '52W Low', 'l52', w(126, 122, 100)),
  price('open', 'Open', 'open', w(128, 122, 100)),
  price('prev', 'Prev. Close', 'prev', w(132, 122, 100)),
];
