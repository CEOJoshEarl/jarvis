// App state. Runs fully on the device (demo mode) until Supabase is connected;
// the shape matches the database in supabase/migrations so the swap is a
// drop-in replacement of this file's persistence.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { EARL_ASSUMPTIONS, EARL_CATALOG, EARL_FAMILY } from './engine/earl';
import { addDays, zonedNow } from './engine/dates';
import { dueOn, generate, tierOn, visibleOn } from './engine/schedule';
import { resolve, type Resolved } from './engine/status';
import type { ChoreTemplate, FamilyConfig, MemberId, Submission, TaskInstance, TaskState, Tier } from './engine/types';
import { deleteBlobs, putBlob } from './proof';

const KEY = 'fe-state-v1';
export const PROOF_RETENTION_DAYS = 14;

interface Persisted {
  me: MemberId | null;
  states: Record<string, TaskState>;
  tiers: FamilyConfig['tiers'];
  rotation: FamilyConfig['rotation'];
  owners: Record<string, MemberId[]>; // owner set by an admin for templates the plan left open
  previewDate: string | null;
}

function load(): Persisted {
  const base: Persisted = { me: null, states: {}, tiers: EARL_FAMILY.tiers, rotation: EARL_FAMILY.rotation, owners: {}, previewDate: null };
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...base, ...JSON.parse(raw) } : base;
  } catch { return base; }
}

export interface Task extends TaskInstance, Resolved { state?: TaskState }

interface Ctx {
  family: FamilyConfig;
  catalog: ChoreTemplate[];
  assumptions: string[];
  now: string;
  today: string;
  me: MemberId | null;
  isAdmin: boolean;
  setMe(id: MemberId | null): void;
  tier: Tier;
  visible(date: string, who?: MemberId): Task[];
  due(date: string, who?: MemberId): Task[];
  pending(): Task[];
  unassigned(): ChoreTemplate[];
  submit(t: Task, s: { checked: string[]; blob?: Blob; type?: 'photo' | 'video' }): Promise<void>;
  review(t: Task, decision: 'approved' | 'rejected', reason?: string): void;
  setTier(tier: Tier, from: string): void;
  shuffleRotation(): void;
  setOwner(templateId: string, members: MemberId[]): void;
  previewDate: string | null;
  setPreviewDate(d: string | null): void;
  resetDemo(): void;
}

const C = createContext<Ctx | null>(null);
export const useApp = () => useContext(C)!;

export function AppProvider({ children }: { children: ReactNode }) {
  const [p, setP] = useState<Persisted>(load);
  const [clock, setClock] = useState(() => zonedNow(EARL_FAMILY.timezone));

  useEffect(() => {
    const t = setInterval(() => setClock(zonedNow(EARL_FAMILY.timezone)), 20_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* storage full or blocked */ } }, [p]);

  const now = p.previewDate ? `${p.previewDate}T${clock.slice(11)}` : clock;
  const today = now.slice(0, 10);

  const family = useMemo<FamilyConfig>(() => ({ ...EARL_FAMILY, tiers: p.tiers, rotation: p.rotation }), [p.tiers, p.rotation]);
  const catalog = useMemo(() => EARL_CATALOG.map(t => p.owners[t.id] ? { ...t, owner: { kind: 'fixed' as const, members: p.owners[t.id] } } : t), [p.owners]);

  // Delete proof files older than the retention window.
  useEffect(() => {
    const cutoff = addDays(today, -PROOF_RETENTION_DAYS);
    const stale: string[] = [];
    const states = { ...p.states };
    let changed = false;
    for (const [id, s] of Object.entries(states)) {
      if (s.submissions.some(x => x.proofUrl && x.at.slice(0, 10) < cutoff)) {
        states[id] = { ...s, submissions: s.submissions.map(x => {
          if (x.proofUrl && x.at.slice(0, 10) < cutoff) { stale.push(x.proofUrl); changed = true; return { ...x, proofUrl: undefined }; }
          return x;
        }) };
      }
    }
    if (changed) { void deleteBlobs(stale); setP(v => ({ ...v, states })); }
  }, [today]); // eslint-disable-line react-hooks/exhaustive-deps

  const decorate = useCallback((list: TaskInstance[]): Task[] =>
    list.map(i => {
      const r = resolve(i, p.states[i.id], now);
      // Before go-live nothing counts against anyone.
      const practice = i.dueDate < family.goLive && r.status === 'missed';
      return { ...i, ...r, ...(practice ? { status: 'upcoming' as const, points: 0 } : {}), state: p.states[i.id] };
    }), [p.states, now, family.goLive]);

  const mine = (who?: MemberId) => (t: TaskInstance) => !who || t.assignees.includes(who);

  const value: Ctx = {
    family, catalog, assumptions: EARL_ASSUMPTIONS, now, today,
    me: p.me,
    isAdmin: family.members.find(m => m.id === p.me)?.role === 'admin',
    setMe: me => setP(v => ({ ...v, me })),
    tier: tierOn(family, today),
    visible: (date, who) => decorate(visibleOn(catalog, family, date).filter(mine(who))),
    due: (date, who) => decorate(dueOn(catalog, family, date).filter(mine(who))),
    pending: () => decorate(generate(catalog, family, addDays(today, -1), addDays(today, 31)))
      .filter(t => t.status === 'pending' && t.state?.submissions.at(-1)?.by !== p.me),
    unassigned: () => catalog.filter(t => t.owner.kind === 'unassigned'),
    async submit(t, s) {
      let proofUrl: string | undefined;
      if (s.blob) { proofUrl = `proof/${t.id}/${Date.now()}`; await putBlob(proofUrl, s.blob); }
      const sub: Submission = { at: now, by: p.me!, proofUrl, proofType: s.type, checked: s.checked };
      setP(v => {
        const prev = v.states[t.id] ?? { instanceId: t.id, submissions: [] };
        return { ...v, states: { ...v.states, [t.id]: { ...prev, submissions: [...prev.submissions, sub] } } };
      });
    },
    review(t, decision, reason) {
      setP(v => ({ ...v, states: { ...v.states, [t.id]: { ...v.states[t.id], review: { by: v.me!, at: now, decision, reason } } } }));
    },
    setTier(tier, from) {
      setP(v => ({ ...v, tiers: [...v.tiers.filter(h => h.from !== from), { tier, from }].sort((a, b) => a.from.localeCompare(b.from)) }));
    },
    shuffleRotation() {
      setP(v => {
        const g = [...v.rotation.groups.kids3];
        for (let i = g.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [g[i], g[j]] = [g[j], g[i]]; }
        return { ...v, rotation: { ...v.rotation, groups: { ...v.rotation.groups, kids3: g } } };
      });
    },
    setOwner: (templateId, members) => setP(v => ({ ...v, owners: { ...v.owners, [templateId]: members } })),
    previewDate: p.previewDate,
    setPreviewDate: d => setP(v => ({ ...v, previewDate: d })),
    resetDemo: () => setP(v => ({ ...load(), states: {}, me: v.me, previewDate: null, tiers: EARL_FAMILY.tiers, rotation: EARL_FAMILY.rotation, owners: {} })),
  };

  return <C.Provider value={value}>{children}</C.Provider>;
}

export const memberOf = (family: FamilyConfig, id: MemberId) => family.members.find(m => m.id === id);
