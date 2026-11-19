import { useState } from 'react';
import { prettyDate } from './engine/dates';
import { sounds } from './fx';
import { Approvals } from './screens/Approvals';
import { More } from './screens/More';
import { Today } from './screens/Today';
import { Week } from './screens/Week';
import { useApp } from './store';
import { Avatar, Icon, Logo, Toaster } from './ui';

type Tab = 'today' | 'family' | 'approve' | 'more';

function SignIn() {
  const app = useApp();
  const people = app.family.members;
  return (
    <div className="page" style={{ alignContent: 'center', minHeight: '100%', gap: 22 }}>
      <Logo family={app.family.name} />
      <div className="stack" style={{ gap: 6 }}>
        <span className="eyebrow">Sign in</span>
        <h1 className="h1" style={{ fontSize: 34 }}>Who's checking in?</h1>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {people.map(p => (
          <button key={p.id} className="card stack" style={{ justifyItems: 'center', gap: 8, padding: '16px 6px' }} onClick={() => { sounds.tap(); app.setMe(p.id); }}>
            <Avatar m={p} size="lg" /><b>{p.name}</b>
          </button>
        ))}
      </div>
      <div className="banner">Demo mode: pick a person to try the app. Google sign-in turns on when the family database is connected.</div>
    </div>
  );
}

export function App() {
  const app = useApp();
  const [tab, setTab] = useState<Tab>('today');
  if (!app.me) return <div className="app"><SignIn /><Toaster /></div>;
  const pendingCount = app.isAdmin ? app.pending().length : 0;
  const tabs: [Tab, string, () => JSX.Element, number?][] = [
    ['today', 'Today', Icon.today],
    ['family', 'Family', Icon.family],
    ...(app.isAdmin ? [['approve', 'Approvals', Icon.approve, pendingCount] as [Tab, string, () => JSX.Element, number]] : []),
    ['more', 'More', Icon.more],
  ];
  const current = tab === 'approve' && !app.isAdmin ? 'today' : tab;
  return (
    <div className="app">
      {app.previewDate && <div className="banner" style={{ margin: 'calc(env(safe-area-inset-top) + 8px) 18px 0', borderColor: 'var(--ember)', color: 'var(--ember)' }}>Previewing {prettyDate(app.previewDate, true)} <button className="btn btn-ghost sm" style={{ marginLeft: 'auto' }} onClick={() => app.setPreviewDate(null)}>Today</button></div>}
      {current === 'today' && <Today key={app.me + app.today} />}
      {current === 'family' && <Week key={app.today} />}
      {current === 'approve' && <Approvals />}
      {current === 'more' && <More />}
      <nav className="tabs">
        {tabs.map(([id, label, I, badge]) => (
          <button key={id} className={current === id ? 'on' : ''} onClick={() => { setTab(id); sounds.tap(); }} aria-current={current === id ? 'page' : undefined}>
            <I />{label}{badge ? <span className="badge">{badge}</span> : null}
          </button>
        ))}
      </nav>
      <Toaster />
    </div>
  );
}
