// Sound and confetti. Synthesized, so there are no audio files to load.

let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
  try {
    const A = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!A) return null;
    ctx ??= new A();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch { return null; }
}

function tone(freqs: number[], step: number, type: OscillatorType, vol: number, len = 0.5) {
  const a = audio(); if (!a) return;
  const t = a.currentTime;
  freqs.forEach((f, i) => {
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.value = f;
    const s = t + i * step;
    g.gain.setValueAtTime(0, s);
    g.gain.linearRampToValueAtTime(vol, s + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0008, s + len);
    o.connect(g); g.connect(a.destination); o.start(s); o.stop(s + len + 0.05);
  });
}

export const sounds = {
  /** Proof submitted. */
  submit: () => tone([523.25, 659.25, 783.99, 1046.5], 0.07, 'triangle', 0.16),
  /** Approved by a parent. */
  approve: () => tone([659.25, 987.77], 0.09, 'sine', 0.18, 0.6),
  /** Sent back. */
  reject: () => tone([392, 311.13], 0.12, 'sine', 0.14, 0.4),
  tap: () => tone([880], 0, 'sine', 0.05, 0.08),
};

const reduce = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function confetti(x = window.innerWidth / 2, y = window.innerHeight * 0.6) {
  if (reduce()) return;
  const cv = document.createElement('canvas');
  const dpr = window.devicePixelRatio || 1;
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
  Object.assign(cv.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '100' });
  document.body.appendChild(cv);
  const c = cv.getContext('2d')!;
  const colors = ['#FF7A45', '#3DDC97', '#A98BFF', '#4DA3FF', '#F5B83D', '#FF7AA8', '#2FD3C5'];
  const parts = Array.from({ length: 140 }, (_, i) => {
    const a = Math.random() * Math.PI * 2, sp = 4 + Math.random() * 9;
    return { x: x * dpr, y: y * dpr, vx: Math.cos(a) * sp * dpr, vy: (Math.sin(a) * sp - 8) * dpr, r: (3 + Math.random() * 4) * dpr, c: colors[i % colors.length], rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, life: 1 };
  });
  const frame = () => {
    c.clearRect(0, 0, cv.width, cv.height);
    let alive = 0;
    for (const p of parts) {
      if (p.life <= 0) continue;
      alive++;
      p.vy += 0.32 * dpr; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= 0.008;
      c.save(); c.globalAlpha = Math.max(p.life, 0); c.translate(p.x, p.y); c.rotate(p.rot);
      c.fillStyle = p.c; c.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); c.restore();
    }
    if (alive) requestAnimationFrame(frame); else cv.remove();
  };
  requestAnimationFrame(frame);
}

export function haptic(ms = 12) {
  try { navigator.vibrate?.(ms); } catch { /* not supported */ }
}
