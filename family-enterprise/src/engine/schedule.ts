// Turns chore templates into dated task instances for a family.
// Pure and deterministic: the same inputs always give the same tasks,
// which is what lets the nightly server job and the app agree.

import { addDays, daysBetween, daysInMonth, parse, weekStart, weekday, month } from './dates';
import type { ChoreTemplate, FamilyConfig, MemberId, OwnerRule, TaskInstance, Tier, Weekday } from './types';

export function tierOn(family: FamilyConfig, date: string): Tier {
  let t: Tier = family.tiers[0]?.tier ?? 500;
  for (const h of [...family.tiers].sort((a, b) => a.from.localeCompare(b.from))) {
    if (h.from <= date) t = h.tier;
  }
  return t;
}

/** Whole weeks since the rotation start Sunday (negative before it). */
export function rotationWeek(family: FamilyConfig, date: string): number {
  return Math.floor(daysBetween(family.rotation.start, weekStart(date)) / 7);
}

const mod = (a: number, n: number) => ((a % n) + n) % n;

export function resolveOwner(rule: OwnerRule, family: FamilyConfig, date: string): MemberId[] {
  switch (rule.kind) {
    case 'fixed': return rule.members;
    case 'byDay': return rule.map[weekday(date)] ?? [];
    case 'unassigned': return [];
    case 'alternate': return [rule.members[mod(rotationWeek(family, date), rule.members.length)]];
    case 'rotation': {
      const g = family.rotation.groups[rule.group] ?? [];
      if (!g.length) return [];
      return [g[mod(rule.slot - rotationWeek(family, date), g.length)]];
    }
  }
}

export function ownerFor(t: ChoreTemplate, family: FamilyConfig, date: string): MemberId[] | null {
  const tier = tierOn(family, date);
  if (t.byTier && tier in t.byTier) {
    const r = t.byTier[tier];
    if (r === null || r === undefined) return null;
    return resolveOwner(r, family, date);
  }
  return resolveOwner(t.owner, family, date);
}

function dueTime(t: ChoreTemplate, date: string): string {
  return t.dueOn?.[weekday(date)] ?? t.due;
}

/** Due dates of a template in [from, to] with the day each instance first shows. */
function occurrences(t: ChoreTemplate, family: FamilyConfig, from: string, to: string): { start: string; due: string }[] {
  const out: { start: string; due: string }[] = [];
  const s = t.schedule;
  if (s.kind === 'asNeeded') return out;
  if (s.kind === 'daily') {
    for (let d = from; d <= to; d = addDays(d, 1)) {
      if (!s.days || s.days.includes(weekday(d))) out.push({ start: d, due: d });
    }
  } else if (s.kind === 'weekly' || s.kind === 'everyNWeeks') {
    for (let ws = weekStart(from); ws <= to; ws = addDays(ws, 7)) {
      const due = addDays(ws, s.due);
      if (due < from || due > to) continue;
      if (s.kind === 'everyNWeeks') {
        if (mod(rotationWeek(family, due), s.n) !== 0) continue;
        if (s.months && !s.months.includes(month(due))) continue;
      }
      out.push({ start: ws, due });
    }
  } else if (s.kind === 'monthly') {
    let [y, m] = parse(from);
    for (let i = 0; i < 24; i++) {
      const first = `${y}-${String(m).padStart(2, '0')}-01`;
      if (first > to) break;
      const day = Math.min(s.dueDay, daysInMonth(y, m));
      const due = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (due >= from && due <= to && (!s.months || s.months.includes(m))) out.push({ start: first, due });
      m++; if (m > 12) { m = 1; y++; }
    }
  }
  return out;
}

const cadenceOf = (t: ChoreTemplate): TaskInstance['cadence'] =>
  t.schedule.kind === 'daily' ? 'daily'
    : t.schedule.kind === 'weekly' ? 'weekly'
      : t.schedule.kind === 'everyNWeeks' ? 'biweekly'
        : t.schedule.kind === 'monthly' ? 'monthly' : 'once';

/** All instances whose due date falls in [from, to]. */
export function generate(catalog: ChoreTemplate[], family: FamilyConfig, from: string, to: string): TaskInstance[] {
  const out: TaskInstance[] = [];
  for (const t of catalog) {
    for (const o of occurrences(t, family, from, to)) {
      const owners = ownerFor(t, family, o.due);
      if (owners === null) continue;
      out.push({
        id: `${t.id}@${o.due}`,
        templateId: t.id,
        title: t.title,
        area: t.area,
        checklist: t.checklist,
        proof: t.proof,
        assignees: owners,
        start: o.start,
        dueDate: o.due,
        dueAt: `${o.due}T${dueTime(t, o.due)}`,
        cadence: cadenceOf(t),
        note: t.note,
        points: t.points ?? 1,
      });
    }
  }
  return out.sort((a, b) => a.dueAt.localeCompare(b.dueAt) || a.title.localeCompare(b.title));
}

/** Tasks that show on a given day: due that day, or open in a window that includes it. */
export function visibleOn(catalog: ChoreTemplate[], family: FamilyConfig, date: string): TaskInstance[] {
  return generate(catalog, family, date, addDays(date, 45)).filter(i => i.start <= date && i.dueDate >= date);
}

/** Tasks due on a given day (for the week board and the scorecard). */
export function dueOn(catalog: ChoreTemplate[], family: FamilyConfig, date: string): TaskInstance[] {
  return generate(catalog, family, date, date);
}

export interface TierChange { templateId: string; title: string; from: MemberId[] | null; to: MemberId[] | null }

/**
 * What moves when Andrew's tier changes. Compares owners over the four weeks
 * after `date` with each tier, so rotations and alternations are accounted for.
 */
export function tierDiff(catalog: ChoreTemplate[], family: FamilyConfig, fromTier: Tier, toTier: Tier, date: string): TierChange[] {
  const with_ = (tier: Tier): FamilyConfig => ({ ...family, tiers: [{ tier, from: '0000-01-01' }] });
  const a = with_(fromTier), b = with_(toTier);
  const changes: TierChange[] = [];
  for (const t of catalog) {
    if (!t.byTier || !(fromTier in t.byTier || toTier in t.byTier)) continue;
    const ra = ownerFor(t, a, date), rb = ownerFor(t, b, date);
    const key = (x: MemberId[] | null) => (x === null ? 'none' : [...x].sort().join(','));
    if (key(ra) !== key(rb)) changes.push({ templateId: t.id, title: t.title, from: ra, to: rb });
  }
  return changes;
}

export const WEEKDAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];
