/**
 * SalesBell domain helpers: labels, formatting and contest standings.
 * Data lives in Supabase; see `src/lib/api.ts`.
 */
import type { Tables } from '@/lib/database.types';

export type Period = 'd' | 'w' | 'm';
export type Metric = 'sales' | 'revenue' | 'points';
export type FeedKind = 'bell' | 'goal' | 'lead' | 'spin';
export type ContestType = 'most_sales' | 'highest_revenue' | 'product_challenge' | 'first_to_x' | 'lottery';
export type ContestStatus = 'active' | 'upcoming' | 'ended';

export type Product = Tables<'products'>;
export type Contest = Tables<'contests'>;
export type LeaderRow = {
  user_id: string;
  full_name: string;
  team: string;
  sales: number;
  revenue: number;
  points: number;
};

export const PERIODS: [Period, string][] = [
  ['d', 'Today'],
  ['w', 'This week'],
  ['m', 'This month'],
];

export const CANCEL_REASONS = [
  'Registered twice by mistake',
  'Wrong product or quantity',
  'Customer cancelled',
];

export const CONTEST_TYPES: Record<ContestType, { label: string; measure: string }> = {
  most_sales: { label: 'Most sales', measure: 'Number of sales' },
  highest_revenue: { label: 'Highest revenue', measure: 'Revenue' },
  product_challenge: { label: 'Product challenge', measure: 'Product units' },
  first_to_x: { label: 'First to X', measure: 'Sales toward target' },
  lottery: { label: 'Lottery', measure: 'Tickets' },
};

export function contestTypeDescription(type: ContestType, product?: string, target?: number) {
  switch (type) {
    case 'most_sales':
      return 'The seller with the most registered sales in the period wins.';
    case 'highest_revenue':
      return 'The seller with the highest total revenue in the period wins.';
    case 'product_challenge':
      return `The seller who sells the most units of ${product ?? 'the chosen product'} wins.`;
    case 'first_to_x':
      return `The first seller to reach ${target ?? 50} sales in the period wins.`;
    case 'lottery':
      return `Every sale earns 1 ticket (${product ?? 'the chosen product'} earns 3). A winner is drawn when the contest ends.`;
  }
}

export function fmt(n: number) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' kr';
}

export function ptsLabel(n: number) {
  return n + (n === 1 ? ' pt' : ' pts');
}

export function spinsLabel(n: number) {
  return n + ' spin' + (n > 1 ? 's' : '');
}

export function validEmail(v: string) {
  return /.+@.+\..+/.test(v || '');
}

// ---------------------------------------------------------------------------
// Dates. Formatted by hand so output is identical on Hermes, JSC and web.
// ---------------------------------------------------------------------------

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad = (n: number) => String(n).padStart(2, '0');

/** `YYYY-MM-DD` for a local date. */
export function isoDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parses a `YYYY-MM-DD` string as a local date (not UTC). */
export function parseDate(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function isValidIsoDate(s: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = parseDate(s);
  return isoDate(d) === s;
}

/** "Mon 21 Sep" */
export function dayLabel(d: Date) {
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function timeLabel(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "Today", "Yesterday" or "Thu 24 Sep". */
export function relativeDay(d: Date, now = new Date()) {
  const days = Math.round((parseDate(isoDate(now)).getTime() - parseDate(isoDate(d)).getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return dayLabel(d);
}

/** Feed timestamps: "Now", "12 min", "10:42" or "Thu 10:42". */
export function feedTime(iso: string, now = new Date()) {
  const d = new Date(iso);
  const mins = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (mins < 1) return 'Now';
  if (mins < 60) return `${mins} min`;
  if (isoDate(d) === isoDate(now)) return timeLabel(d);
  return `${DAYS[d.getDay()]} ${timeLabel(d)}`;
}

// ---------------------------------------------------------------------------
// Contests
// ---------------------------------------------------------------------------

export type StandingRow = { rank: number; userId: string; name: string; me: boolean; value: number; val: string; pct: number };

export function contestStatus(c: Contest, today = isoDate(new Date())): ContestStatus {
  if (c.starts_on > today) return 'upcoming';
  if (c.ends_on < today) return 'ended';
  return 'active';
}

export function contestWhen(c: Contest, today = new Date()): string {
  const status = contestStatus(c, isoDate(today));
  if (status === 'upcoming') return 'Starts ' + dayLabel(parseDate(c.starts_on));
  if (status === 'ended') {
    const end = parseDate(c.ends_on);
    return `Ended ${end.getDate()} ${MONTHS[end.getMonth()]}`;
  }
  const left = Math.round((parseDate(c.ends_on).getTime() - parseDate(isoDate(today)).getTime()) / 86400000);
  return left === 0 ? 'Ends today' : left === 1 ? 'Ends tomorrow' : `${left} days left`;
}

function unitFor(c: Contest) {
  switch (c.type as ContestType) {
    case 'highest_revenue':
      return 'kr';
    case 'product_challenge':
      return 'units';
    case 'first_to_x':
      return `/ ${c.target ?? 50}`;
    case 'lottery':
      return 'tickets';
    default:
      return 'sales';
  }
}

export function standings(
  c: Contest,
  rows: { user_id: string; full_name: string; value: number }[],
  meId: string | undefined,
): StandingRow[] {
  const unit = unitFor(c);
  const sorted = [...rows].sort(
    (a, b) => b.value - a.value || (a.user_id === meId ? -1 : b.user_id === meId ? 1 : 0),
  );
  const top = c.type === 'first_to_x' ? (c.target ?? 50) : sorted[0]?.value || 1;
  return sorted.map((r, i) => ({
    rank: i + 1,
    userId: r.user_id,
    name: r.full_name,
    me: r.user_id === meId,
    value: r.value,
    val: unit === 'kr' ? fmt(r.value) : `${r.value} ${unit}`,
    pct: Math.min(100, Math.round((r.value / top) * 100)),
  }));
}

export function myStanding(rows: StandingRow[]) {
  const me = rows.find((r) => r.me);
  return { line: me ? `You're #${me.rank} · ${me.val}` : '', pct: me ? me.pct : 0 };
}

export function contestWinner(rows: StandingRow[]) {
  return rows[0] && rows[0].value > 0 ? rows[0].name : null;
}

export function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}
