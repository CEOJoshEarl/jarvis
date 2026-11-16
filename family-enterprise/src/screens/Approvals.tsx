import { prettyTime } from '../engine/dates';
import { memberOf, useApp } from '../store';
import { Avatar, dueLabel } from '../ui';
import { ProofView, ReviewButtons } from './TaskSheet';

export function Approvals() {
  const app = useApp();
  const list = app.pending().sort((a, b) => (a.state!.submissions.at(-1)!.at).localeCompare(b.state!.submissions.at(-1)!.at));
  return (
    <div className="page">
      <div className="stack" style={{ gap: 4 }}>
        <span className="eyebrow">Josh and Vanilla</span>
        <h1 className="h1">Approvals</h1>
        <p className="sub">Anything not reviewed by midnight is approved automatically.</p>
      </div>
      {list.length === 0 && <div className="card"><h2 className="h2">You're all caught up</h2><p className="sub">New proof shows up here as soon as someone submits it.</p></div>}
      {list.map(t => {
        const s = t.state!.submissions.at(-1)!;
        const who = memberOf(app.family, s.by);
        const late = s.at > t.dueAt || (t.state!.submissions.length > 1);
        return (
          <article key={t.id} className="card stack">
            <div className="row">
              <Avatar m={who} />
              <div className="grow"><b>{t.title}</b><div className="sub">{who?.name} · sent {prettyTime(s.at.slice(11))} · {dueLabel(t, app.today)}</div></div>
              <span className={`pill ${late ? 'p-warn' : 'p-ok'}`}>{late ? 'Late' : 'On time'}</span>
            </div>
            <ProofView k={s.proofUrl} type={s.proofType} stamp={`${prettyTime(s.at.slice(11))} · ${t.area.toUpperCase()}`} />
            <ReviewButtons task={t} />
          </article>
        );
      })}
    </div>
  );
}
