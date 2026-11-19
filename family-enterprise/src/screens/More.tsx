import { useState } from 'react';
import { addDays, parse, prettyDate } from '../engine/dates';
import { tierDiff, tierOn } from '../engine/schedule';
import type { MemberId, Tier } from '../engine/types';
import { memberOf, useApp } from '../store';
import { Avatar, Avatars, Logo, toast } from '../ui';
import { sounds } from '../fx';
import { FamilyMembers, ProfileSheet } from './Profile';
import { canSeePlan, EVERY_PLAN, money, PLAN_HOLDER, PLAN_OPTIONS, planFor } from '../plans';

function firstOfNextMonth(d: string) {
  let [y, m] = parse(d); m++; if (m > 12) { m = 1; y++; }
  return `${y}-${String(m).padStart(2, '0')}-01`;
}

function TierCard() {
  const app = useApp();
  const { family, today, catalog } = app;
  const current = app.tier;
  const startsOn = firstOfNextMonth(today);
  const scheduled = tierOn(family, startsOn);
  const [pick, setPick] = useState<Tier>(scheduled);
  const name = (ids: MemberId[] | null) => ids === null ? 'Off the list' : ids.length ? ids.map(i => memberOf(family, i)?.name).join(' and ') : 'No owner';
  // Merge a chore that leaves one person's list and lands on another's (same title, different day).
  const changes = Object.values(tierDiff(catalog, family, current, pick, addDays(startsOn, 3)).reduce<Record<string, ReturnType<typeof tierDiff>[number]>>((acc, c) => {
    const prev = acc[c.title];
    acc[c.title] = prev ? { ...prev, from: prev.from ?? c.from, to: prev.to ?? c.to } : c;
    return acc;
  }, {}));
  const andrew = memberOf(family, PLAN_HOLDER);
  const price = (t: Tier) => money(planFor(t).monthlyCents);
  return (
    <section className="card stack">
      <div className="row"><Avatar m={andrew} size="lg" /><div className="grow"><h2 className="h2">{andrew?.name}'s plan</h2><p className="sub">Now {price(current)} a month{scheduled !== current ? `. ${price(scheduled)} starts ${prettyDate(startsOn)}` : ''}</p></div><span className="pill p-dim">Private</span></div>
      <div className="seg">{PLAN_OPTIONS.map(o => <button key={o.level} className={pick === o.level ? 'on' : ''} onClick={() => { setPick(o.level); sounds.tap(); }}>{money(o.monthlyCents)}</button>)}</div>
      <div className="stack" style={{ gap: 6 }}>{planFor(pick).perks.map(p => <div key={p} className="row sub" style={{ color: 'var(--ink)' }}>· {p}</div>)}</div>
      {pick !== current && (
        <div className="stack" style={{ gap: 8 }}>
          <span className="eyebrow">{changes.length} chores change hands</span>
          {changes.map(c => (
            <div key={c.templateId} className="row between" style={{ fontSize: 13 }}>
              <span className="grow">{c.title}</span>
              <span className="row sub" style={{ gap: 6 }}><Avatars ms={(c.from ?? []).map(i => memberOf(family, i))} size="sm" />→<Avatars ms={(c.to ?? []).map(i => memberOf(family, i))} size="sm" /><span style={{ minWidth: 70, textAlign: 'right' }}>{name(c.to)}</span></span>
            </div>
          ))}
          {pick !== 1 && <p className="sub">Light bulbs in the shared rooms move to Josh too. Those are assigned by hand when one burns out.</p>}
        </div>
      )}
      {pick !== scheduled && (
        <button className="btn btn-em" onClick={() => { app.setTier(pick, startsOn); sounds.approve(); toast(`${price(pick)} starts ${prettyDate(startsOn)}`); }}>
          Start {price(pick)} on {prettyDate(startsOn)}
        </button>
      )}
      <p className="sub">{EVERY_PLAN} Changes start on the 1st so nobody's week moves under them. Only you, Vanilla and {andrew?.name} can see this card. Siblings only see which chores are theirs.</p>
    </section>
  );
}

function MyPlanCard() {
  const app = useApp();
  const plan = planFor(app.tier);
  return (
    <section className="card stack">
      <div className="row between"><h2 className="h2">My plan</h2><span className="pill p-dim">Private</span></div>
      <div className="row between"><span className="sub">Monthly</span><b className="mono">{money(plan.monthlyCents)}</b></div>
      <div className="stack" style={{ gap: 6 }}>{plan.perks.map(p => <div key={p} className="sub" style={{ color: 'var(--ink)' }}>· {p}</div>)}</div>
      <p className="sub">{EVERY_PLAN} Only you and your parents can see this. To change plans, talk to Josh. Changes start on the 1st.</p>
    </section>
  );
}

function RotationCard() {
  const app = useApp();
  const { family } = app;
  const order = family.rotation.groups.kids3;
  const jobs = ['Guest bathroom', 'Foyer, stairs and hallways', 'Laundry room'];
  return (
    <section className="card stack">
      <div className="row between"><h2 className="h2">Weekly rotation</h2><span className="pill p-dim">Starts {prettyDate(family.rotation.start)}</span></div>
      {jobs.map((j, i) => <div key={j} className="row between"><span>{j}</span><span className="row" style={{ gap: 6 }}><Avatar m={memberOf(family, order[i])} size="sm" />{memberOf(family, order[i])?.name}</span></div>)}
      <p className="sub">Week one, picked at random. Jobs move every Sunday. Andrew and Max swap their bathroom weekly, Andrew first.</p>
      <button className="btn btn-ghost" onClick={() => { app.shuffleRotation(); sounds.tap(); }}>Shuffle week one</button>
    </section>
  );
}

export function More() {
  const app = useApp();
  const me = memberOf(app.family, app.me!);
  const [editMe, setEditMe] = useState(false);
  return (
    <div className="page">
      <Logo family={app.family.name} />
      <div className="card row">
        <button onClick={() => setEditMe(true)} aria-label="Edit your profile" style={{ borderRadius: '50%' }}><Avatar m={me} size="lg" /></button>
        <div className="grow"><h2 className="h2">{me?.name}</h2><p className="sub">{me?.role === 'admin' ? 'Parent · approves proof' : 'Family member'}</p></div>
        <button className="btn btn-ghost sm" onClick={() => setEditMe(true)}>Edit</button>
        <button className="btn btn-ghost sm" onClick={() => app.setMe(null)}>Switch</button>
      </div>
      {editMe && me && <ProfileSheet m={me} onClose={() => setEditMe(false)} />}
      {app.isAdmin && <FamilyMembers />}
      {app.isAdmin && <TierCard />}
      {!app.isAdmin && canSeePlan(app.me, app.isAdmin) && <MyPlanCard />}
      {app.isAdmin && <RotationCard />}
      <section className="card stack">
        <h2 className="h2">Preview another day</h2>
        <p className="sub">See what the app looks like on any date, like the first rotation week. Uses the real time of day.</p>
        <input type="date" id="preview-date" value={app.previewDate ?? app.today} onChange={e => app.setPreviewDate(e.target.value || null)} />
        {app.previewDate && <button className="btn btn-ghost" onClick={() => app.setPreviewDate(null)}>Back to today</button>}
      </section>
      {app.isAdmin && <section className="card stack">
        <h2 className="h2">Filled in for now</h2>
        <p className="sub">The plan didn't say. Tell Claude to change any of these.</p>
        <ul className="stack" style={{ margin: 0, paddingLeft: 18, gap: 8, fontSize: 13.5 }}>{app.assumptions.map(a => <li key={a}>{a}</li>)}</ul>
      </section>}
      <section className="card stack">
        <h2 className="h2">Demo mode</h2>
        <p className="sub">Data stays on this device until the family database is connected. Proof photos delete after 14 days.</p>
        <button className="btn btn-bad" onClick={() => { app.resetDemo(); toast('Demo data cleared'); }}>Clear demo data</button>
      </section>
    </div>
  );
}
