/**
 * Date helpers for sprout.
 *
 * All dates are worked with and stored as 'YYYY-MM-DD' strings. "Today" is
 * computed in the configured timezone (APP_TIMEZONE) so the day boundary is
 * correct for where the user lives.
 */

/** Returns today's date as 'YYYY-MM-DD' in the given IANA timezone. */
export function todayISO(timezone: string = 'UTC'): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Validates that a string is a well-formed, real 'YYYY-MM-DD' calendar date. */
export function isValidDateISO(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

export interface DayCell {
  dateISO: string;
  day: number; // day of month
  inMonth: boolean; // belongs to the displayed month
  isPast: boolean;
  isFuture: boolean;
  isToday: boolean;
}

/**
 * Builds a 6-week (42-cell) calendar grid for the given month.
 * Weeks start on Sunday. Leading/trailing days from adjacent months are
 * included (marked `inMonth: false`) so the grid is always a clean rectangle.
 * Comparisons use ISO string ordering, which is correct for YYYY-MM-DD.
 */
export function buildMonthGrid(
  year: number,
  month: number, // 0-indexed (0 = January)
  todayStr: string,
): DayCell[] {
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const startWeekday = firstOfMonth.getUTCDay(); // 0 = Sunday

  const start = new Date(firstOfMonth);
  start.setUTCDate(1 - startWeekday);

  const cells: DayCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    const day = d.getUTCDate();
    const dateISO = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push({
      dateISO,
      day,
      inMonth: m === month,
      isPast: dateISO < todayStr,
      isFuture: dateISO > todayStr,
      isToday: dateISO === todayStr,
    });
  }
  return cells;
}

/** Parses a 'YYYY-MM' query param into { year, month } (0-indexed) or null. */
export function parseMonthParam(
  value: string | undefined,
): { year: number; month: number } | null {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return null;
  const [year, month] = value.split('-').map(Number);
  if (month < 1 || month > 12) return null;
  return { year, month: month - 1 };
}

/** Encodes a { year, month } as 'YYYY-MM' (1-indexed month). */
export function monthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

/** Returns { year, month } for the previous month. */
export function prevMonth(year: number, month: number): { year: number; month: number } {
  return month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
}

/** Returns { year, month } for the next month. */
export function nextMonth(year: number, month: number): { year: number; month: number } {
  return month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };
}

/** Formats a month as a human label, e.g. "July 2026". */
export function formatMonthLabel(year: number, month: number): string {
  return new Date(Date.UTC(year, month, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Formats 'YYYY-MM-DD' as a long human date, e.g. "Friday, July 4, 2026". */
export function formatLongDate(dateISO: string): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Truncates text to a snippet for calendar preview, breaking on a word boundary. */
export function snippet(text: string, maxLen: number = 60): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return trimmed;
  const slice = trimmed.slice(0, maxLen);
  const lastSpace = slice.lastIndexOf(' ');
  return (lastSpace > 0 ? slice.slice(0, lastSpace) : slice) + '…';
}

/** Returns the current { year, month } (0-indexed) for the given timezone. */
export function currentMonth(timezone: string = 'UTC'): { year: number; month: number } {
  const [year, month] = todayISO(timezone).split('-').map(Number);
  return { year, month: month - 1 };
}
