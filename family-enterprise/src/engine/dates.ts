// Calendar math on plain YYYY-MM-DD strings, so nothing drifts with the
// device's time zone. "Now" is read in the family's time zone.

import type { Weekday } from './types';

export function parse(d: string): [number, number, number] {
  const [y, m, day] = d.split('-').map(Number);
  return [y, m, day];
}

function toUTC(d: string): number {
  const [y, m, day] = parse(d);
  return Date.UTC(y, m - 1, day);
}

export function fmt(ms: number): string {
  const dt = new Date(ms);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

export function addDays(d: string, n: number): string {
  return fmt(toUTC(d) + n * 86400000);
}

export function weekday(d: string): Weekday {
  return new Date(toUTC(d)).getUTCDay() as Weekday;
}

export function daysBetween(a: string, b: string): number {
  return Math.round((toUTC(b) - toUTC(a)) / 86400000);
}

/** Sunday on or before the date. */
export function weekStart(d: string): string {
  return addDays(d, -weekday(d));
}

export function month(d: string): number {
  return parse(d)[1];
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** The family's current local date and time as 'YYYY-MM-DDTHH:MM'. */
export function zonedNow(tz: string, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const g = (t: string) => parts.find(p => p.type === t)?.value ?? '00';
  return `${g('year')}-${g('month')}-${g('day')}T${g('hour')}:${g('minute')}`;
}

/** Minutes from a to b, both 'YYYY-MM-DDTHH:MM'. */
export function minutesBetween(a: string, b: string): number {
  const ms = (s: string) => {
    const [d, t] = s.split('T');
    const [h, mi] = t.split(':').map(Number);
    return toUTC(d) + (h * 60 + mi) * 60000;
  };
  return Math.round((ms(b) - ms(a)) / 60000);
}

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const dayShort = (d: string) => DAY[weekday(d)];
export const dayLong = (d: string) => DAY_LONG[weekday(d)];
export function prettyDate(d: string, long = false): string {
  const [, m, day] = parse(d);
  return `${long ? DAY_LONG[weekday(d)] : DAY[weekday(d)]}, ${MON[m - 1]} ${day}`;
}
export function prettyTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12} ${ap}` : `${h12}:${String(m).padStart(2, '0')} ${ap}`;
}
