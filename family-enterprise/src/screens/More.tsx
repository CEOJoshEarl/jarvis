import { useState } from 'react';
import { addDays, parse, prettyDate } from '../engine/dates';
import { tierDiff, tierOn } from '../engine/schedule';
import type { MemberId, Tier } from '../engine/types';
import { memberOf, useApp } from '../store';
import { Avatar, Avatars, Logo, toast } from '../ui';
import { sounds } from '../fx';

const TIER_PERKS: Record<Tier, string[]> = {
  500: ['Curfew 12 AM', 'Buys and cooks his own food', 'Does his own laundry'],
  700: ['No curfew. Tells Josh if he will be late or not home', 'Food bought and cooked for him', 'Does his own laundry'],
  1000: ['No curfew. Tells Josh if he will be late or not home', 'Food bought and cooked for him', 'Laundry done for him'],
};

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
  const andrew = memberOf(family, 'andrew');
  return (
    <section className="card stack">
      <div className="row"><Avatar m={andrew} size="lg" /><div><h2 className="h2">Andrew's tier</h2><p className="sub">Now ${current.toLocaleString()} a month{scheduled !== current ? `. $${scheduled.toLocaleString()} starts ${prettyDate(startsOn)}` : ''}</p></div></div>
      <div className="seg">{([500, 700, 1000] as Tier[]).map(t => <button key={t} className={pick === t ? 'on' : ''} onClick={() => { setPick(t); sounds.tap(); }}>${t.toLocaleString()}</button>)}</div>
      <div className="stack" style={{ gap: 6 }}>{TIER_PERKS[pick].map(p => <div key={p} className="row sub" style={{ color: 'var(--ink)' }}>· {p}</div>)}</div>
      {pick !== current && (
        <div className="stack" style={{ gap: 8 }}>
          <span className="eyebrow">{changes.length} chores change hands</span>
          {changes.map(c => (
            <div key={c.templateId} className="row between" style={{ fontSize: 13 }}>
              <span className="grow">{c.title}</span>
              <span className="row sub" style={{ gap: 6 }}><Avatars ms={(c.from ?? []).map(i => memberOf(family, i))} size="sm" />→<Avatars ms={(c.to ?? []).map(i => memberOf(family, i))} size="sm" /><span style={{ minWidth: 70, textAlign: 'right' }}>{name(c.to)}</span></span>
            </div>
          ))}
          {pick !== 500 && <p className="sub">Light bulbs in the shared rooms move to Josh too. Those are assigned by hand when one burns out.</p>}
        </div>
      )}
      {pick !== scheduled && (
        <button className="btn btn-em" onClick={() => { app.setTier(pick, startsOn); sounds.approve(); toast(`$${pick.toLocaleString()} starts ${prettyDate(startsOn)}`); }}>
          Start ${pick.toLocaleString()} on {prettyDate(startsOn)}
        </button>
      )}
      <p className="sub">Every tier: chores, buying Uso's food, no overnight guests. Changes start on the 1st so nobody's week moves under them.</p>
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
  return (
    <div className="page">
      <Logo family={app.family.name} />
      <div className="card row">
        <Avatar m={me} size="lg" />
        <div className="grow"><h2 className="h2">{me?.name}</h2><p className="sub">{me?.role === 'admin' ? 'Parent · approves proof' : 'Family member'}</p></div>
        <button className="btn btn-ghost sm" onClick={() => app.setMe(null)}>Switch</button>
      </div>
      {app.isAdmin && <TierCard />}
      {app.isAdmin && <RotationCard />}
      <section className="card stack">
        <h2 className="h2">Preview another day</h2>
        <p className="sub">See what the app looks like on any date, like the first rotation week. Uses the real time of day.</p>
        <input type="date" id="preview-date" value={app.previewDate ?? app.today} onChange={e => app.setPreviewDate(e.target.value || null)} />
        {app.previewDate && <button className="btn btn-ghost" onClick={() => app.setPreviewDate(null)}>Back to today</button>}
      </section>
      <section className="card stack">
        <h2 className="h2">Filled in for now</h2>
        <p className="sub">The plan didn't say. Tell Claude to change any of these.</p>
        <ul className="stack" style={{ margin: 0, paddingLeft: 18, gap: 8, fontSize: 13.5 }}>{app.assumptions.map(a => <li key={a}>{a}</li>)}</ul>
      </section>
      <section className="card stack">
        <h2 className="h2">Demo mode</h2>
        <p className="sub">Data stays on this device until the family database is connected. Proof photos delete after 14 days.</p>
        <button className="btn btn-bad" onClick={() => { app.resetDemo(); toast('Demo data cleared'); }}>Clear demo data</button>
      </section>
    </div>
  );
}
