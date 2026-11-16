import { describe, expect, it } from 'vitest';
import { EARL_CATALOG, EARL_FAMILY } from './earl';
import { addDays } from './dates';
import { dueOn, generate, rotationWeek, tierDiff, visibleOn } from './schedule';
import { resolve } from './status';
import type { FamilyConfig, TaskInstance } from './types';

const owner = (date: string, templateId: string, fam: FamilyConfig = EARL_FAMILY) =>
  dueOn(EARL_CATALOG, fam, date).find(t => t.templateId === templateId)?.assignees;

describe('kitchen rotation', () => {
  // Week of Nov 29, 2026: Sun 29 .. Sat Dec 5
  it.each([
    ['2026-11-29', 'angela', 'max'],
    ['2026-11-30', 'max', 'andrew'],
    ['2026-12-01', 'andrew', 'max'],
    ['2026-12-02', 'max', 'andrew'],
    ['2026-12-03', 'andrew', 'max'],
    ['2026-12-04', 'max', 'andrew'],
  ])('%s dishes %s, sweep %s', (d, dishes, sweep) => {
    expect(owner(d, 'kitchen-dishes')).toEqual([dishes]);
    expect(owner(d, 'kitchen-sweep')).toEqual([sweep]);
  });
  it('has no rotation on Saturday', () => {
    expect(owner('2026-12-05', 'kitchen-dishes')).toBeUndefined();
  });
  it('gives Tuesday a 10 PM deadline', () => {
    expect(dueOn(EARL_CATALOG, EARL_FAMILY, '2026-12-01').find(t => t.templateId === 'kitchen-dishes')?.dueAt).toBe('2026-12-01T22:00');
  });
});

describe('weekly rotation', () => {
  it('moves every Sunday and covers all three kids', () => {
    const jobs = ['guest-bath-weekly', 'foyer-weekly', 'laundry-weekly'];
    const weeks = ['2026-12-04', '2026-12-11', '2026-12-18'];
    const grid = weeks.map(fri => jobs.map(j => owner(fri, j)![0]));
    for (const row of grid) expect(new Set(row).size).toBe(3);
    // Each person does each job once over three weeks.
    for (let j = 0; j < 3; j++) expect(new Set(grid.map(r => r[j])).size).toBe(3);
  });
  it('alternates the boys bathroom weekly', () => {
    expect(rotationWeek(EARL_FAMILY, '2026-11-29')).toBe(0);
    expect(owner('2026-12-04', 'boys-bath-weekly')).toEqual(['andrew']);
    expect(owner('2026-12-11', 'boys-bath-weekly')).toEqual(['max']);
  });
});

describe('front of the house', () => {
  it('nightly reset goes to whoever has the foyer that week', () => {
    for (const d of ['2026-11-30', '2026-12-07', '2026-12-14']) {
      const friday = addDays(d, 4);
      expect(owner(d, 'front-reset')).toEqual(owner(friday, 'foyer-weekly'));
    }
    expect(owner('2026-12-05', 'front-reset')).toBeUndefined(); // Saturday
  });
  it('living and dining room belong to Angela, kitchen monthly to Vanilla', () => {
    expect(owner('2026-12-04', 'living-weekly')).toEqual(['angela']);
    expect(owner('2026-12-21', 'kitchen-monthly')).toEqual(['vanilla']);
    expect(owner('2026-12-06', 'kitchen-towels')).toEqual(['vanilla']);
  });
});

describe("Andrew's tiers", () => {
  const at = (tier: 500 | 700 | 1000): FamilyConfig => ({ ...EARL_FAMILY, tiers: [{ tier, from: '2026-01-01' }] });
  it('$700 moves cooktop to Angela on Sunday and appliances to Max', () => {
    expect(owner('2026-12-04', 'kitchen-cooktop', at(700))).toBeUndefined();
    expect(owner('2026-12-06', 'kitchen-cooktop-sunday', at(700))).toEqual(['angela']);
    expect(owner('2026-12-04', 'kitchen-appliances', at(700))).toEqual(['max']);
    expect(owner('2026-12-04', 'kitchen-mop', at(700))).toEqual(['andrew']);
  });
  it('$1,000 moves mopping, bins and Uso mornings', () => {
    expect(owner('2026-12-04', 'kitchen-mop', at(1000))).toEqual(['vanilla']);
    expect(owner('2026-12-02', 'trash-out', at(1000))).toEqual(['max']);
    expect(owner('2026-12-02', 'uso-morning', at(1000))).toEqual(['josh']);
    expect(owner('2026-11-21', 'gutters', at(1000))).toEqual(['andrew']);
    expect(owner('2026-12-21', 'storage-room', at(1000))).toBeUndefined();
  });
  it('diff lists what changes', () => {
    const d = tierDiff(EARL_CATALOG, EARL_FAMILY, 500, 700, '2026-12-01').map(c => c.templateId).sort();
    expect(d).toEqual(['kitchen-appliances', 'kitchen-cooktop', 'kitchen-cooktop-sunday', 'smoke-detectors']);
  });
});

describe('windows', () => {
  it('shows weekly jobs all week and monthly jobs from the 1st', () => {
    const ids = visibleOn(EARL_CATALOG, EARL_FAMILY, '2026-12-01').map(t => t.templateId);
    expect(ids).toContain('max-room-weekly');
    expect(ids).toContain('max-room-monthly');
    expect(ids).toContain('uso-afternoon');
  });
  it('generates every scheduled template at least once a year', () => {
    const seen = new Set(generate(EARL_CATALOG, EARL_FAMILY, '2027-01-01', '2027-12-31').map(t => t.templateId));
    const scheduled = EARL_CATALOG.filter(t => t.schedule.kind !== 'asNeeded').map(t => t.id);
    expect(scheduled.filter(id => !seen.has(id) && id !== 'kitchen-cooktop-sunday')).toEqual([]);
  });
});

describe('status rules', () => {
  const inst: TaskInstance = {
    id: 'x@2026-12-01', templateId: 'x', title: 'x', area: 'x', checklist: [], proof: 'photo', assignees: ['max'],
    start: '2026-12-01', dueDate: '2026-12-01', dueAt: '2026-12-01T21:00', cadence: 'daily', points: 1,
  };
  const sub = (at: string) => ({ at, by: 'max', checked: [] });
  it('upcoming, due soon, overdue, missed', () => {
    expect(resolve(inst, undefined, '2026-12-01T18:00').status).toBe('upcoming');
    expect(resolve(inst, undefined, '2026-12-01T20:15').status).toBe('due_soon');
    expect(resolve(inst, undefined, '2026-12-01T22:00').status).toBe('overdue');
    expect(resolve(inst, undefined, '2026-12-02T00:01').status).toBe('missed');
  });
  it('on time after approval, late for half', () => {
    const ok = { instanceId: inst.id, submissions: [sub('2026-12-01T20:30')], review: { by: 'josh', at: '2026-12-01T20:40', decision: 'approved' as const } };
    expect(resolve(inst, ok, '2026-12-01T21:30')).toMatchObject({ status: 'done_on_time', points: 1 });
    const late = { ...ok, submissions: [sub('2026-12-01T21:30')], review: { ...ok.review, at: '2026-12-01T21:40' } };
    expect(resolve(inst, late, '2026-12-01T22:00')).toMatchObject({ status: 'done_late', points: 0.5 });
  });
  it('auto-approves pending proof at midnight', () => {
    const p = { instanceId: inst.id, submissions: [sub('2026-12-01T20:30')] };
    expect(resolve(inst, p, '2026-12-01T23:00').status).toBe('pending');
    expect(resolve(inst, p, '2026-12-02T00:00')).toMatchObject({ status: 'done_on_time', autoApproved: true });
  });
  it('a rejected task redone counts late; not redone is missed', () => {
    const rej = { instanceId: inst.id, submissions: [sub('2026-12-01T20:30')], review: { by: 'vanilla', at: '2026-12-01T20:45', decision: 'rejected' as const } };
    expect(resolve(inst, rej, '2026-12-01T20:50').status).toBe('rejected');
    expect(resolve(inst, rej, '2026-12-02T00:00').status).toBe('missed');
    const redo = { ...rej, submissions: [...rej.submissions, sub('2026-12-01T20:55')] };
    expect(resolve(inst, redo, '2026-12-01T21:00').status).toBe('pending');
    expect(resolve(inst, redo, '2026-12-02T00:00')).toMatchObject({ status: 'done_late', points: 0.5 });
  });
});
