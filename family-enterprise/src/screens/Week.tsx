import { useState } from 'react';
import { addDays, dayShort, parse, prettyDate, weekStart } from '../engine/dates';
import { dueOn, rotationWeek } from '../engine/schedule';
import { isDone } from '../engine/status';
import type { MemberId } from '../engine/types';
import { memberOf, useApp, type Task } from '../store';
import { Avatar, Avatars } from '../ui';
import { Section } from './Today';
import { TaskSheet } from './TaskSheet';

function cellClass(ts: Task[], future: boolean): string {
  if (!ts.length) return 'c-none';
  if (ts.some(t => t.status === 'missed')) return 'c-miss';
  if (ts.some(t => t.status === 'done_late')) return 'c-late';
  if (ts.every(t => isDone(t.status))) return 'c-ok';
  if (ts.some(t => t.status === 'pending')) return 'c-wait';
  return future ? 'c-up' : 'c-up';
}

export function Week() {
  const app = useApp();
  const { family, today } = app;
  const [start, setStart] = useState(weekStart(today));
  const [sel, setSel] = useState<{ who: MemberId; day: string } | null>({ who: app.me!, day: today });
  const [open, setOpen] = useState<Task | null>(null);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const people = family.members.filter(m => m.role !== 'pet');
  const byDay = Object.fromEntries(days.map(d => [d, app.due(d)]));
  const selTasks = sel ? (byDay[sel.day] ?? app.due(sel.day)).filter(t => t.assignees.includes(sel.who)) : [];
  const friday = addDays(start, 5);
  const rot = (id: string) => dueOn(app.catalog, family, friday).find(t => t.templateId === id)?.assignees[0];
  const wk = rotationWeek(family, start);
  const [, m, d] = parse(start);
  const live = open && selTasks.find(t => t.id === open.id);

  return (
    <div className="page">
      <div className="stack" style={{ gap: 4 }}>
        <span className="eyebrow">{wk >= 0 ? `Rotation week ${wk + 1}` : `Rotation starts ${prettyDate(family.rotation.start)}`}</span>
        <div className="row between">
          <h1 className="h1">Family week</h1>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn btn-ghost sm" aria-label="Previous week" onClick={() => setStart(addDays(start, -7))}>‹</button>
            <button className="btn btn-ghost sm" onClick={() => setStart(weekStart(today))}>{m}/{d}</button>
            <button className="btn btn-ghost sm" aria-label="Next week" onClick={() => setStart(addDays(start, 7))}>›</button>
          </div>
        </div>
      </div>

      <div className="card stack" style={{ gap: 6, overflowX: 'auto' }}>
        <div className="grid7"><span />{days.map(d => <span key={d} className={`d ${d === today ? 'today' : ''}`}>{dayShort(d)[0]}{dayShort(d)[1]}</span>)}</div>
        {people.map(p => (
          <div key={p.id} className="grid7">
            <span className="row" style={{ gap: 6 }}><Avatar m={p} size="sm" /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span></span>
            {days.map(d => {
              const ts = byDay[d].filter(t => t.assignees.includes(p.id));
              const on = sel?.who === p.id && sel.day === d;
              return (
                <button key={d} className={`cell ${cellClass(ts, d > today)} ${on ? 'c-sel' : ''}`} onClick={() => setSel({ who: p.id, day: d })} aria-label={`${p.name}, ${prettyDate(d)}: ${ts.length} tasks`}>
                  {ts.length || ''}
                </button>
              );
            })}
          </div>
        ))}
        <div className="row sub" style={{ gap: 12, flexWrap: 'wrap', fontSize: 11, marginTop: 4 }}>
          <span className="row" style={{ gap: 5 }}><i className="cell c-ok" style={{ width: 10, height: 10 }} />all on time</span>
          <span className="row" style={{ gap: 5 }}><i className="cell c-late" style={{ width: 10, height: 10 }} />some late</span>
          <span className="row" style={{ gap: 5 }}><i className="cell c-miss" style={{ width: 10, height: 10 }} />a miss</span>
          <span className="row" style={{ gap: 5 }}><i className="cell c-wait" style={{ width: 10, height: 10 }} />waiting</span>
        </div>
      </div>

      {sel && <Section title={`${memberOf(family, sel.who)?.name} · ${prettyDate(sel.day)}`} tasks={selTasks} onOpen={setOpen} empty="Nothing due." />}

      <section className="stack" style={{ gap: 8 }}>
        <span className="eyebrow">Rotation this week</span>
        <div className="card stack">
          {[['guest-bath-weekly', 'Guest bathroom'], ['foyer-weekly', 'Foyer, stairs and hallways'], ['laundry-weekly', 'Laundry room'], ['boys-bath-weekly', 'Andrew and Max\'s bathroom']].map(([id, label]) => {
            const who = memberOf(family, rot(id) ?? '');
            return <div key={id} className="row between"><span>{label}</span><span className="row" style={{ gap: 6 }}><Avatar m={who} size="sm" />{who?.name}</span></div>;
          })}
        </div>
      </section>

      {app.isAdmin && <Unassigned />}
      {live && <TaskSheet task={live} onClose={() => setOpen(null)} />}
    </div>
  );
}

function Unassigned() {
  const app = useApp();
  const list = app.unassigned();
  const [editing, setEditing] = useState<string | null>(null);
  const [pick, setPick] = useState<MemberId[]>([]);
  if (!list.length) return null;
  const people = app.family.members.filter(m => m.role !== 'pet');
  return (
    <section className="stack" style={{ gap: 8 }}>
      <span className="eyebrow">Needs an owner · {list.length}</span>
      <div className="card tight">
        {list.map(t => (
          <div key={t.id} className="task" style={{ display: 'grid', gap: 10 }}>
            <div className="row between">
              <span className="grow"><b>{t.title}</b><small>Not in the plan yet</small></span>
              {editing !== t.id && <button className="btn btn-ghost sm" onClick={() => { setEditing(t.id); setPick([]); }}>Assign</button>}
            </div>
            {editing === t.id && (
              <div className="stack">
                <div className="chips">{people.map(p => {
                  const on = pick.includes(p.id);
                  return <button key={p.id} className={`chip ${on ? 'on' : ''}`} onClick={() => setPick(on ? pick.filter(x => x !== p.id) : [...pick, p.id])}><Avatar m={p} size="sm" />{p.name}</button>;
                })}</div>
                <div className="row"><button className="btn btn-ghost sm" onClick={() => setEditing(null)}>Cancel</button><button className="btn btn-em sm" disabled={!pick.length} onClick={() => { app.setOwner(t.id, pick); setEditing(null); }}>Save <Avatars ms={pick.map(p => memberOf(app.family, p))} size="sm" /></button></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
