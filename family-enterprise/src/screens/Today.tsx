import { useState } from 'react';
import { minutesBetween, prettyDate } from '../engine/dates';
import { isDone, needsAction } from '../engine/status';
import { memberOf, useApp, type Task } from '../store';
import { Avatars, dueLabel, Ring, StatusPill } from '../ui';
import { TaskSheet } from './TaskSheet';

function countdown(now: string, due: string): string {
  const m = minutesBetween(now, due);
  if (m < 0) return 'PAST DUE';
  if (m < 60) return `DUE IN ${m} MIN`;
  if (m < 24 * 60) return `DUE IN ${Math.floor(m / 60)}H ${m % 60}M`;
  return `DUE IN ${Math.floor(m / 1440)} DAYS`;
}

function greet(now: string) {
  const h = Number(now.slice(11, 13));
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export function TaskRow({ t, onOpen, showWho }: { t: Task; onOpen(t: Task): void; showWho?: boolean }) {
  const { family, today } = useApp();
  const color = memberOf(family, t.assignees[0])?.color ?? 'var(--line)';
  const done = isDone(t.status);
  return (
    <button className={`task ${done ? 'done' : ''}`} onClick={() => onOpen(t)}>
      <i className="bar" style={{ background: t.area === 'Uso' ? '#D9A36A' : color }} />
      <span className="grow">
        <b>{t.title}</b>
        <small>{done ? (t.status === 'done_on_time' ? 'Done · on time' : 'Done · late') : dueLabel(t, today)}</small>
      </span>
      {showWho && <Avatars ms={t.assignees.map(a => memberOf(family, a))} size="sm" />}
      {done ? <span className="check on" /> : t.status === 'pending' ? <span className="check wait" /> : <StatusPill s={t.status} />}
    </button>
  );
}

export function Today() {
  const app = useApp();
  const { me, now, today, family } = app;
  const [open, setOpen] = useState<Task | null>(null);
  const tasks = app.visible(today, me!);
  const todays = tasks.filter(t => t.dueDate === today);
  const week = tasks.filter(t => t.dueDate !== today && (t.cadence === 'weekly' || t.cadence === 'biweekly'));
  const month = tasks.filter(t => t.dueDate !== today && (t.cadence === 'monthly' || t.cadence === 'once'));
  const next = todays.filter(t => needsAction(t.status)).sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0]
    ?? week.filter(t => needsAction(t.status))[0];
  const doneCount = todays.filter(t => isDone(t.status) || t.status === 'pending').length;
  const name = memberOf(family, me!)?.name;
  // Keep the open sheet in sync with live status.
  const live = open && tasks.find(t => t.id === open.id);

  return (
    <div className="page">
      <div className="row between">
        <div className="stack" style={{ gap: 4 }}>
          <span className="eyebrow">{prettyDate(today, true)}</span>
          <h1 className="h1">{greet(now)}, {name}</h1>
        </div>
        <Ring done={doneCount} total={todays.length} />
      </div>

      {next ? (
        <button className="card hero stack" style={{ textAlign: 'left', gap: 6 }} onClick={() => setOpen(next)}>
          <div className="row between"><span className="eyebrow" style={{ color: 'var(--ember)' }}>Next up</span><span className="pill p-warn">{countdown(now, next.dueAt)}</span></div>
          <h2 className="h2">{next.title}</h2>
          <span className="sub">{dueLabel(next, today)} · {next.proof === 'either' ? 'photo or video' : next.proof}</span>
        </button>
      ) : todays.length > 0 ? (
        <div className="card hero"><h2 className="h2">All done for today</h2><p className="sub">Everything is in. Nice work.</p></div>
      ) : null}

      <Section title="Today" tasks={todays} onOpen={setOpen} empty="Nothing due today." />
      {week.length > 0 && <Section title="This week" tasks={week} onOpen={setOpen} />}
      {month.length > 0 && <Section title="This month" tasks={month} onOpen={setOpen} />}
      {live && <TaskSheet task={live} onClose={() => setOpen(null)} />}
    </div>
  );
}

export function Section({ title, tasks, onOpen, empty, showWho }: { title: string; tasks: Task[]; onOpen(t: Task): void; empty?: string; showWho?: boolean }) {
  return (
    <section className="stack" style={{ gap: 8 }}>
      <span className="eyebrow">{title} · {tasks.length}</span>
      <div className="card tight">
        {tasks.length ? tasks.map(t => <TaskRow key={t.id} t={t} onOpen={onOpen} showWho={showWho} />) : <p className="sub" style={{ padding: '12px 0' }}>{empty}</p>}
      </div>
    </section>
  );
}
