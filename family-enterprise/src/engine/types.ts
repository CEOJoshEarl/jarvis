// Core domain types. Everything is family-scoped so other families can use the
// same engine with their own catalog.

export type MemberId = string;
export type Tier = 500 | 700 | 1000;

export interface Member {
  id: MemberId;
  name: string;
  short: string; // two-letter avatar
  color: string;
  role: 'admin' | 'member' | 'pet';
}

/** 0 = Sunday ... 6 = Saturday. The family week starts on Sunday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type Schedule =
  | { kind: 'daily'; days?: Weekday[] }
  | { kind: 'weekly'; due: Weekday } // shows all week (Sun..due), due that day
  | { kind: 'everyNWeeks'; n: number; due: Weekday; months?: number[] }
  | { kind: 'monthly'; dueDay: number; months?: number[] } // shows from the 1st
  | { kind: 'asNeeded' }; // never auto-generated; admins assign by hand

export type OwnerRule =
  | { kind: 'fixed'; members: MemberId[] }
  | { kind: 'byDay'; map: Partial<Record<Weekday, MemberId[]>> }
  /** Weekly rotation among a group, `slot` picks which job of the rotation this is. */
  | { kind: 'rotation'; group: string; slot: number }
  /** Alternates weekly between members, starting with members[0] on the rotation start week. */
  | { kind: 'alternate'; members: MemberId[] }
  | { kind: 'unassigned' };

export type ProofKind = 'photo' | 'video' | 'either' | 'none';

export interface ChoreTemplate {
  id: string;
  title: string;
  area: string;
  checklist: string[];
  proof: ProofKind;
  schedule: Schedule;
  owner: OwnerRule;
  /** Override the owner per tier of Andrew's plan. `null` removes the chore at that tier. */
  byTier?: Partial<Record<Tier, OwnerRule | null>>;
  /** Default due time HH:MM, local family time. */
  due: string;
  /** Per-weekday due time overrides. */
  dueOn?: Partial<Record<Weekday, string>>;
  note?: string;
  /** Points when done on time. The plan says 1 for now. */
  points?: number;
}

export interface FamilyConfig {
  id: string;
  name: string; // "Earl"
  timezone: string;
  members: Member[];
  /** Tier history; the latest entry whose `from` <= date applies. */
  tiers: { tier: Tier; from: string }[];
  rotation: {
    /** Sunday the rotation starts, YYYY-MM-DD. */
    start: string;
    groups: Record<string, MemberId[]>; // order as of week 0
  };
  goLive: string; // YYYY-MM-DD
}

export interface TaskInstance {
  id: string; // `${templateId}@${dueDate}`
  templateId: string;
  title: string;
  area: string;
  checklist: string[];
  proof: ProofKind;
  assignees: MemberId[];
  /** First day the task shows up. */
  start: string;
  dueDate: string;
  /** Local wall-clock 'YYYY-MM-DDTHH:MM'. */
  dueAt: string;
  cadence: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'once';
  note?: string;
  points: number;
}

export type Status =
  | 'upcoming'
  | 'due_soon'
  | 'overdue' // past due, before midnight: still doable for half points
  | 'pending' // proof submitted, waiting on Josh or Vanilla
  | 'rejected'
  | 'done_on_time'
  | 'done_late'
  | 'missed';

export interface Submission {
  at: string; // local wall-clock 'YYYY-MM-DDTHH:MM'
  by: MemberId;
  proofUrl?: string;
  proofType?: 'photo' | 'video';
  checked: string[];
}

export interface TaskState {
  instanceId: string;
  submissions: Submission[];
  review?: { by: MemberId | 'auto'; at: string; decision: 'approved' | 'rejected'; reason?: string };
}
