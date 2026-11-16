import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Member, Status } from './engine/types';
import { prettyTime } from './engine/dates';
import type { Task } from './store';

export function Mark({ size = 34 }: { size?: number }) {
  return (
    <svg className="mark" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="fe-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FF8A4C" /><stop offset="1" stopColor="#FF3D6E" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#fe-g)" />
      <path d="M14 30 L32 15 L50 30" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="21" y="34" width="22" height="5" rx="2.5" fill="#fff" />
      <rect x="21" y="43" width="15" height="5" rx="2.5" fill="#fff" opacity=".85" />
    </svg>
  );
}

export function Logo({ family }: { family: string }) {
  return (
    <div className="logo"><Mark /><div className="word">The {family} Family Enterprise<span>Family Enterprise</span></div></div>
  );
}

export function Avatar({ m, size }: { m?: Member; size?: 'sm' | 'lg' | 'xl' }) {
  if (!m) return null;
  if (m.photo) return <img className={`av ${size ?? ''}`} src={m.photo} alt={m.name} title={m.name} style={{ boxShadow: `0 0 0 2px ${m.color}` }} />;
  return <span className={`av ${size ?? ''}`} style={{ background: m.color }} title={m.name}>{m.short}</span>;
}

export function Avatars({ ms, size }: { ms: (Member | undefined)[]; size?: 'sm' | 'lg' | 'xl' }) {
  return <span className="avs">{ms.map((m, i) => <Avatar key={m?.id ?? i} m={m} size={size} />)}</span>;
}

const STATUS: Record<Status, [string, string]> = {
  upcoming: ['p-dim', 'To do'],
  due_soon: ['p-warn', 'Due soon'],
  overdue: ['p-bad', 'Late now'],
  pending: ['p-warn', 'Waiting on approval'],
  rejected: ['p-bad', 'Redo'],
  done_on_time: ['p-ok', 'On time'],
  done_late: ['p-warn', 'Late'],
  missed: ['p-bad', 'Missed'],
};
export function StatusPill({ s }: { s: Status }) {
  const [c, l] = STATUS[s];
  return <span className={`pill ${c}`}>{l}</span>;
}

export function dueLabel(t: Task, today: string): string {
  const time = prettyTime(t.dueAt.slice(11));
  if (t.dueDate === today) return `Due ${time}`;
  const d = new Date(t.dueDate + 'T12:00:00');
  return `Due ${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}, ${time}`;
}

export function Ring({ done, total }: { done: number; total: number }) {
  const p = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="ring" style={{ background: `conic-gradient(var(--ember) ${p}%, var(--card2) 0)` }} aria-label={`${done} of ${total} done`}>
      <b>{done}/{total}</b>
    </div>
  );
}

export function Sheet({ onClose, children }: { onClose(): void; children: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    return () => { removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [onClose]);
  return createPortal(
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true"><div className="grip" />{children}</div>
    </>,
    document.body,
  );
}

let pushToast: ((t: { text: string; right?: string; bad?: boolean }) => void) | null = null;
export const toast = (text: string, right?: string, bad = false) => pushToast?.({ text, right, bad });
export function Toaster() {
  const [t, setT] = useState<{ text: string; right?: string; bad?: boolean; k: number } | null>(null);
  useEffect(() => { pushToast = x => setT({ ...x, k: Date.now() }); return () => { pushToast = null; }; }, []);
  useEffect(() => { if (!t) return; const h = setTimeout(() => setT(null), 2600); return () => clearTimeout(h); }, [t]);
  if (!t) return null;
  return <div key={t.k} className={`toast ${t.bad ? 'bad' : ''}`} role="status"><span>{t.text}</span>{t.right && <span className="mono">{t.right}</span>}</div>;
}

const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
export const Icon = {
  today: () => <svg viewBox="0 0 24 24" {...P}><path d="M5 12l4 4 10-10" /></svg>,
  family: () => <svg viewBox="0 0 24 24" {...P}><rect x="3" y="4" width="18" height="17" rx="3" /><path d="M3 9h18M9 4v17" /></svg>,
  approve: () => <svg viewBox="0 0 24 24" {...P}><rect x="3" y="5" width="18" height="14" rx="3" /><circle cx="9" cy="11" r="2" /><path d="M21 16l-5-5-8 8" /></svg>,
  more: () => <svg viewBox="0 0 24 24" {...P}><circle cx="5" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="19" cy="12" r="1.3" /></svg>,
  camera: () => <svg viewBox="0 0 24 24" {...P} width="28" height="28"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>,
};
