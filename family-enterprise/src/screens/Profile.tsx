import { useRef, useState } from 'react';
import type { Member } from '../engine/types';
import { haptic, sounds } from '../fx';
import { avatarFromFile } from '../proof';
import { useApp } from '../store';
import { Avatar, Sheet, toast } from '../ui';

/** Edit one person's picture and name. Each person can edit their own; parents can edit anyone's. */
export function ProfileSheet({ m, onClose }: { m: Member; onClose(): void }) {
  const app = useApp();
  const self = m.id === app.me;
  const [name, setName] = useState(m.name);
  const input = useRef<HTMLInputElement>(null);

  async function pick(f?: File) {
    if (!f) return;
    try {
      app.updateProfile(m.id, { photo: await avatarFromFile(f) });
      sounds.approve(); haptic(20);
      toast(self ? 'Looking good' : `${m.name}'s picture is set`);
    } catch { toast("That picture couldn't be read. Try another one.", undefined, true); }
  }

  return (
    <Sheet onClose={onClose}>
      <span className="eyebrow">{self ? 'Your profile' : `${m.name}'s profile`}</span>
      <div className="stack" style={{ justifyItems: 'center', gap: 12 }}>
        <button onClick={() => input.current?.click()} aria-label="Change picture" style={{ borderRadius: '50%' }}><Avatar m={m} size="xl" /></button>
        <div className="row">
          <button className="btn btn-ghost sm" onClick={() => input.current?.click()}>{m.photo ? 'Change picture' : 'Add a picture'}</button>
          {m.photo && <button className="btn btn-ghost sm" onClick={() => app.updateProfile(m.id, { photo: null })}>Remove</button>}
        </div>
        <input ref={input} type="file" accept="image/*" hidden onChange={e => { void pick(e.target.files?.[0]); e.target.value = ''; }} />
      </div>
      <label className="stack" style={{ gap: 6 }} htmlFor={`name-${m.id}`}>
        <span className="eyebrow">Name everyone sees</span>
        <input id={`name-${m.id}`} type="text" value={name} maxLength={24} onChange={e => setName(e.target.value)} />
      </label>
      <button className="btn btn-em" disabled={!name.trim() || name.trim() === m.name} onClick={() => { app.updateProfile(m.id, { name: name.trim() }); toast('Name saved'); onClose(); }}>Save name</button>
    </Sheet>
  );
}

export function FamilyMembers() {
  const app = useApp();
  const [edit, setEdit] = useState<Member | null>(null);
  const live = edit && app.family.members.find(x => x.id === edit.id);
  const missing = app.family.members.filter(m => !m.photo).length;
  return (
    <section className="card stack">
      <div className="row between"><h2 className="h2">Family members</h2>{missing > 0 && <span className="pill p-warn">{missing} need a picture</span>}</div>
      <p className="sub">Everyone can set their own picture and name. You can set them for anyone who hasn't.</p>
      {app.family.members.map(m => (
        <button key={m.id} className="row" style={{ textAlign: 'left' }} onClick={() => setEdit(m)}>
          <Avatar m={m} />
          <span className="grow"><b>{m.name}</b><div className="sub">{m.role === 'admin' ? 'Parent' : m.role === 'pet' ? 'The dog' : 'Family member'}{m.photo ? '' : ' · no picture yet'}</div></span>
          <span className="sub">Edit</span>
        </button>
      ))}
      {live && <ProfileSheet m={live} onClose={() => setEdit(null)} />}
    </section>
  );
}
