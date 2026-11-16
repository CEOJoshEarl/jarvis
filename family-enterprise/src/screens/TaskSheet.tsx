import { useEffect, useRef, useState } from 'react';
import { confetti, haptic, sounds } from '../fx';
import { compressPhoto, getBlob, MAX_VIDEO_SECONDS, videoDuration } from '../proof';
import { memberOf, useApp, type Task } from '../store';
import { Avatars, dueLabel, Icon, Sheet, StatusPill, toast } from '../ui';
import { prettyTime } from '../engine/dates';

export function useProofUrl(key?: string) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    let u: string | undefined, live = true;
    if (key) void getBlob(key).then(b => { if (b && live) { u = URL.createObjectURL(b); setUrl(u); } });
    return () => { live = false; if (u) URL.revokeObjectURL(u); };
  }, [key]);
  return url;
}

export function ProofView({ k, type, stamp }: { k?: string; type?: 'photo' | 'video'; stamp?: string }) {
  const url = useProofUrl(k);
  if (!k) return <div className="vf"><span className="sub">No proof file (deleted after 14 days)</span></div>;
  return (
    <div className="vf">
      {url && (type === 'video' ? <video src={url} controls playsInline /> : <img src={url} alt="Proof" />)}
      {stamp && <span className="stamp">{stamp}</span>}
    </div>
  );
}

export function TaskSheet({ task, onClose }: { task: Task; onClose(): void }) {
  const app = useApp();
  const { family, me, today } = app;
  const mine = !!me && task.assignees.includes(me);
  const canDo = mine && ['upcoming', 'due_soon', 'overdue', 'rejected'].includes(task.status);
  const [checked, setChecked] = useState<string[]>([]);
  const [mode, setMode] = useState<'photo' | 'video'>(task.proof === 'video' ? 'video' : 'photo');
  const [file, setFile] = useState<{ blob: Blob; url: string; type: 'photo' | 'video' } | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const last = task.state?.submissions.at(-1);
  const needProof = task.proof !== 'none';
  const allChecked = checked.length === task.checklist.length;
  const ready = allChecked && (!needProof || !!file);

  useEffect(() => () => { if (file) URL.revokeObjectURL(file.url); }, [file]);

  async function pick(f?: File) {
    if (!f) return;
    const isVideo = f.type.startsWith('video/');
    if (isVideo) {
      const d = await videoDuration(f);
      if (d > MAX_VIDEO_SECONDS + 0.5) { toast(`Keep videos to ${MAX_VIDEO_SECONDS} seconds`, `${Math.round(d)}s`, true); return; }
    }
    const blob = isVideo ? f : await compressPhoto(f);
    setFile({ blob, url: URL.createObjectURL(blob), type: isVideo ? 'video' : 'photo' });
    haptic();
  }

  async function send() {
    if (!ready || busy) return;
    setBusy(true);
    await app.submit(task, { checked, blob: file?.blob, type: file?.type });
    sounds.submit(); haptic(30); confetti();
    toast(task.status === 'overdue' || task.status === 'rejected' ? 'Sent. This one counts as late.' : 'Sent for approval', task.status === 'overdue' || task.status === 'rejected' ? '½ PT' : '+1 PT');
    onClose();
  }

  const owners = task.assignees.map(a => memberOf(family, a));
  return (
    <Sheet onClose={onClose}>
      <div className="row between"><span className="eyebrow">{task.area}</span><StatusPill s={task.status} /></div>
      <div className="stack" style={{ gap: 6 }}>
        <h2 className="h1" style={{ fontSize: 26 }}>{task.title}</h2>
        <div className="row sub"><Avatars ms={owners} size="sm" /><span>{owners.map(o => o?.name).join(' and ') || 'No owner yet'}</span><span>·</span><span>{dueLabel(task, today)}</span></div>
      </div>
      {task.note && <div className="banner">{task.note}</div>}
      {task.status === 'overdue' && <div className="banner" style={{ color: 'var(--warn)' }}>Past the deadline. Finish before midnight for half a point.</div>}
      {task.status === 'rejected' && <div className="banner" style={{ color: 'var(--bad)' }}>Sent back by {memberOf(family, task.state!.review!.by as string)?.name}: {task.state?.review?.reason || 'Redo it'}. A redo counts as late.</div>}

      {canDo ? (
        <>
          <div className="card tight">
            {task.checklist.map(c => {
              const on = checked.includes(c);
              return (
                <button key={c} className="task" onClick={() => { setChecked(on ? checked.filter(x => x !== c) : [...checked, c]); sounds.tap(); haptic(8); }} aria-pressed={on}>
                  <span className="grow">{c}</span><span className={`check ${on ? 'on' : ''}`} />
                </button>
              );
            })}
          </div>
          {needProof && (
            <>
              {task.proof === 'either' && (
                <div className="seg">
                  <button className={mode === 'photo' ? 'on' : ''} onClick={() => setMode('photo')}>PHOTO</button>
                  <button className={mode === 'video' ? 'on' : ''} onClick={() => setMode('video')}>VIDEO {MAX_VIDEO_SECONDS}s</button>
                </div>
              )}
              <button className="vf" onClick={() => input.current?.click()}>
                {file ? (file.type === 'video' ? <video src={file.url} muted autoPlay loop playsInline /> : <img src={file.url} alt="Your proof" />)
                  : <span className="stack" style={{ justifyItems: 'center', gap: 6 }}><Icon.camera /><span>Tap to take a {mode}</span></span>}
                {file && <span className="stamp">{app.now.slice(11)} · {task.area.toUpperCase()}</span>}
              </button>
              <input ref={input} type="file" hidden accept={mode === 'video' ? 'video/*' : 'image/*'} capture="environment" onChange={e => { void pick(e.target.files?.[0]); e.target.value = ''; }} />
            </>
          )}
          <button className="btn btn-em" disabled={!ready || busy} onClick={send}>
            {!allChecked ? `Check all ${task.checklist.length} items` : needProof && !file ? `Add a ${mode}` : busy ? 'Sending…' : 'Submit proof'}
          </button>
        </>
      ) : (
        <>
          {last && <ProofView k={last.proofUrl} type={last.proofType} stamp={`${prettyTime(last.at.slice(11))} · ${memberOf(family, last.by)?.name}`} />}
          {task.status === 'pending' && app.isAdmin && last?.by !== me && <ReviewButtons task={task} onDone={onClose} />}
          {task.status === 'pending' && !(app.isAdmin && last?.by !== me) && <p className="sub">Waiting on Josh or Vanilla. If nobody reviews it by midnight, it's approved automatically.</p>}
          {task.state?.review && task.status.startsWith('done') && <p className="sub">Approved {task.autoApproved ? 'automatically at midnight' : `by ${memberOf(family, task.state.review.by as string)?.name}`}.</p>}
          {!mine && !last && <p className="sub">Nothing submitted yet.</p>}
          {task.checklist.length > 0 && <div className="card tight">{task.checklist.map(c => <div key={c} className="task"><span className="grow">{c}</span></div>)}</div>}
        </>
      )}
    </Sheet>
  );
}

const REASONS = ['Not finished', 'Photo is unclear', 'Wrong area', 'Not up to the standard'];

export function ReviewButtons({ task, onDone }: { task: Task; onDone?(): void }) {
  const app = useApp();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  if (rejecting) {
    return (
      <div className="stack">
        <div className="chips">{REASONS.map(r => <button key={r} className={`chip ${reason === r ? 'on' : ''}`} onClick={() => setReason(r)}>{r}</button>)}</div>
        <input type="text" placeholder="Or say what to fix" value={REASONS.includes(reason) ? '' : reason} onChange={e => setReason(e.target.value)} />
        <div className="row">
          <button className="btn btn-ghost" onClick={() => setRejecting(false)}>Cancel</button>
          <button className="btn btn-bad" onClick={() => { app.review(task, 'rejected', reason || 'Redo it'); sounds.reject(); toast('Sent back to redo', undefined, true); onDone?.(); }}>Send back</button>
        </div>
      </div>
    );
  }
  return (
    <div className="row">
      <button className="btn btn-bad" onClick={() => setRejecting(true)}>Send back</button>
      <button className="btn btn-ok" onClick={() => { app.review(task, 'approved'); sounds.approve(); haptic(20); toast('Approved'); onDone?.(); }}>Approve</button>
    </div>
  );
}
