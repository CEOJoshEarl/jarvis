// Status rules agreed with Josh:
// - Done by the deadline and approved: on time, full point.
// - Done after the deadline but before midnight: late, half point.
// - Rejected by Josh or Vanilla: must be redone; a redo counts as late.
// - Nothing approved or waiting by midnight: missed, zero.
// - Proof nobody reviewed by midnight is approved automatically.

import { minutesBetween } from './dates';
import type { Status, TaskInstance, TaskState } from './types';

export const DUE_SOON_MINUTES = 60;

export interface Resolved {
  status: Status;
  points: number;
  autoApproved: boolean;
}

export function resolve(inst: TaskInstance, state: TaskState | undefined, now: string): Resolved {
  const today = now.slice(0, 10);
  const pastMidnight = today > inst.dueDate;
  const subs = state?.submissions ?? [];
  const review = state?.review;
  const last = subs[subs.length - 1];
  const waiting = last && (!review || last.at > review.at);
  const everRejected = review?.decision === 'rejected' || subs.length > 1;

  const finish = (auto: boolean): Resolved => {
    const onTime = !everRejected && subs.length === 1 && subs[0].at <= inst.dueAt;
    return { status: onTime ? 'done_on_time' : 'done_late', points: onTime ? inst.points : inst.points / 2, autoApproved: auto };
  };

  if (waiting) return pastMidnight ? finish(true) : { status: 'pending', points: 0, autoApproved: false };
  if (review?.decision === 'approved') return finish(review.by === 'auto');
  if (pastMidnight) return { status: 'missed', points: 0, autoApproved: false };
  if (review?.decision === 'rejected') return { status: 'rejected', points: 0, autoApproved: false };
  if (now > inst.dueAt) return { status: 'overdue', points: 0, autoApproved: false };
  if (minutesBetween(now, inst.dueAt) <= DUE_SOON_MINUTES) return { status: 'due_soon', points: 0, autoApproved: false };
  return { status: 'upcoming', points: 0, autoApproved: false };
}

export const isDone = (s: Status) => s === 'done_on_time' || s === 'done_late';
export const needsAction = (s: Status) => s === 'upcoming' || s === 'due_soon' || s === 'overdue' || s === 'rejected';
