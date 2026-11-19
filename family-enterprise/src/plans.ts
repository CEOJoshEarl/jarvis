// PRIVATE: what Andrew's plan costs and what comes with it.
// Shown only to parents and to Andrew himself. Once the app is connected to the database these come
// from the `member_plans` table, which siblings cannot read; the copy here is for demo mode.

import type { MemberId, Tier } from './engine/types';

export interface PlanOption { level: Tier; monthlyCents: number; perks: string[] }

export const PLAN_HOLDER: MemberId = 'andrew';

export const PLAN_OPTIONS: PlanOption[] = [
  { level: 1, monthlyCents: 50000, perks: ['Curfew 12 AM', 'Buys and cooks his own food', 'Does his own laundry'] },
  { level: 2, monthlyCents: 70000, perks: ['No curfew. Tells Josh if he will be late or not home', 'Food bought and cooked for him', 'Does his own laundry'] },
  { level: 3, monthlyCents: 100000, perks: ['No curfew. Tells Josh if he will be late or not home', 'Food bought and cooked for him', 'Laundry done for him'] },
];
export const EVERY_PLAN = "Every plan: chores, buying Uso's food, no overnight guests.";

export const planFor = (level: Tier) => PLAN_OPTIONS.find(p => p.level === level)!;
export const money = (cents: number) => '$' + (cents / 100).toLocaleString();

/** Parents always; the plan holder for their own plan; nobody else. */
export const canSeePlan = (viewer: MemberId | null, isAdmin: boolean) => isAdmin || viewer === PLAN_HOLDER;
