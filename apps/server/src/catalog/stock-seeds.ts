/** Starting state of a stock. The first nine match the reference design exactly. */
export interface StockSeed {
  symbol: string;
  name: string;
  ltp: number;
  /** Optional: when omitted the values are generated around `ltp`. */
  day?: { pct: number; high: number; low: number; vol: number; h52: number; l52: number };
}

export const STOCK_SEEDS: readonly StockSeed[] = [
  { symbol: 'RELIANCE', name: 'Reliance Industries', ltp: 1425.6, day: { pct: 2.35, high: 1430, low: 1398.2, vol: 12_500_000, h52: 1620, l52: 1210.3 } },
  { symbol: 'TCS', name: 'Tata Consultancy Services', ltp: 3467.8, day: { pct: 1.21, high: 3480, low: 3420.5, vol: 8_700_000, h52: 3950, l52: 2850.1 } },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', ltp: 1892.25, day: { pct: -0.72, high: 1905, low: 1880.3, vol: 10_100_000, h52: 2000, l52: 1580.2 } },
  { symbol: 'INFY', name: 'Infosys', ltp: 1523.1, day: { pct: 0.88, high: 1530, low: 1505.2, vol: 7_300_000, h52: 1780, l52: 1320.4 } },
  { symbol: 'ICICIBANK', name: 'ICICI Bank', ltp: 1305.75, day: { pct: -0.15, high: 1314.2, low: 1298, vol: 6_200_000, h52: 1520.5, l52: 1180.25 } },
  { symbol: 'SBIN', name: 'State Bank of India', ltp: 812.4, day: { pct: 1.47, high: 816.6, low: 799.75, vol: 9_800_000, h52: 950, l52: 680.2 } },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel', ltp: 1732.2, day: { pct: -0.33, high: 1739, low: 1720.1, vol: 5_500_000, h52: 1980, l52: 1420.3 } },
  { symbol: 'ITC', name: 'ITC Limited', ltp: 412.15, day: { pct: 0.56, high: 414, low: 408.2, vol: 4_100_000, h52: 460, l52: 360.25 } },
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', ltp: 2028.7, day: { pct: -1.12, high: 2046.3, low: 2015.4, vol: 3_900_000, h52: 2380, l52: 1720.1 } },
  { symbol: 'WIPRO', name: 'Wipro', ltp: 258.4 },
  { symbol: 'HCLTECH', name: 'HCL Technologies', ltp: 1548.3 },
  { symbol: 'AXISBANK', name: 'Axis Bank', ltp: 1182.6 },
  { symbol: 'LT', name: 'Larsen & Toubro', ltp: 3624.9 },
  { symbol: 'MARUTI', name: 'Maruti Suzuki India', ltp: 12480.55 },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever', ltp: 2412.75 },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance', ltp: 934.2 },
  { symbol: 'ASIANPAINT', name: 'Asian Paints', ltp: 2486.1 },
  { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical', ltp: 1694.45 },
  { symbol: 'TITAN', name: 'Titan Company', ltp: 3418.8 },
  { symbol: 'ULTRACEMCO', name: 'UltraTech Cement', ltp: 11840.0 },
  { symbol: 'NESTLEIND', name: 'Nestle India', ltp: 1268.35 },
  { symbol: 'ONGC', name: 'Oil & Natural Gas Corp', ltp: 246.7 },
  { symbol: 'NTPC', name: 'NTPC', ltp: 334.15 },
  { symbol: 'POWERGRID', name: 'Power Grid Corporation', ltp: 288.9 },
  { symbol: 'M&M', name: 'Mahindra & Mahindra', ltp: 3156.25 },
  { symbol: 'TATASTEEL', name: 'Tata Steel', ltp: 168.4 },
  { symbol: 'JSWSTEEL', name: 'JSW Steel', ltp: 1092.5 },
  { symbol: 'ADANIENT', name: 'Adani Enterprises', ltp: 2438.6 },
  { symbol: 'ADANIPORTS', name: 'Adani Ports & SEZ', ltp: 1426.8 },
  { symbol: 'COALINDIA', name: 'Coal India', ltp: 391.35 },
  { symbol: 'BAJAJFINSV', name: 'Bajaj Finserv', ltp: 1984.7 },
  { symbol: 'TECHM', name: 'Tech Mahindra', ltp: 1462.9 },
  { symbol: 'GRASIM', name: 'Grasim Industries', ltp: 2764.4 },
  { symbol: 'HINDALCO', name: 'Hindalco Industries', ltp: 748.25 },
  { symbol: 'CIPLA', name: 'Cipla', ltp: 1518.6 },
  { symbol: 'DRREDDY', name: "Dr. Reddy's Laboratories", ltp: 1247.3 },
  { symbol: 'EICHERMOT', name: 'Eicher Motors', ltp: 6842.5 },
  { symbol: 'HEROMOTOCO', name: 'Hero MotoCorp', ltp: 5214.75 },
  { symbol: 'BRITANNIA', name: 'Britannia Industries', ltp: 5876.2 },
  { symbol: 'APOLLOHOSP', name: 'Apollo Hospitals', ltp: 7432.1 },
  { symbol: 'DIVISLAB', name: "Divi's Laboratories", ltp: 6418.35 },
  { symbol: 'INDUSINDBK', name: 'IndusInd Bank', ltp: 842.9 },
  { symbol: 'SBILIFE', name: 'SBI Life Insurance', ltp: 1824.6 },
  { symbol: 'HDFCLIFE', name: 'HDFC Life Insurance', ltp: 764.15 },
  { symbol: 'BPCL', name: 'Bharat Petroleum', ltp: 352.8 },
  { symbol: 'TATACONSUM', name: 'Tata Consumer Products', ltp: 1156.45 },
  { symbol: 'BAJAJ-AUTO', name: 'Bajaj Auto', ltp: 8924.3 },
  { symbol: 'SHRIRAMFIN', name: 'Shriram Finance', ltp: 724.6 },
  { symbol: 'TRENT', name: 'Trent', ltp: 4682.55 },
  { symbol: 'BEL', name: 'Bharat Electronics', ltp: 412.9 },
];

/** Returns `count` stocks; synthetic ones are appended beyond the named list. */
export function buildSeeds(count: number): StockSeed[] {
  const seeds = STOCK_SEEDS.slice(0, count);
  for (let i = seeds.length + 1; i <= count; i += 1) {
    const symbol = `SIM${String(i).padStart(4, '0')}`;
    seeds.push({ symbol, name: `Simulated Stock ${i}`, ltp: 100 + ((i * 137) % 4900) });
  }
  return seeds;
}
