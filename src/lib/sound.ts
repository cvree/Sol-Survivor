/**
 * All sound is synthesised here. No audio files, so nothing to download.
 *
 * Three ideas borrowed from SpellBomb:
 *  - every repeated action comes in rising pitches, so repeats sound like progress;
 *  - a combo counter lifts the pitch for each good action inside 3 seconds;
 *  - the room's mood (calm, tension, storm, dust) is a looping bed that changes before you read anything.
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

export type Mood = 'off' | 'calm' | 'tension' | 'storm' | 'dust';
let mood: Mood = 'off';
let beds: { pad: GainNode; wind: GainNode; windTone: BiquadFilterNode; rumble: GainNode; pulse: GainNode } | null = null;
let musicTimer: ReturnType<typeof setInterval> | null = null;
let beat = 0;

/** A friendly five-note scale (C major pentatonic), low to high. */
const SCALE = [262, 294, 330, 392, 440, 523, 587, 659, 784, 880, 1047, 1175, 1319];

function ensure(): AudioContext | null {
  try {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 1;
      master.connect(ctx.destination);
      buildBeds();
      applyMood(0.05);
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null; // sound is a bonus; never break the game over it
  }
}

export function setMuted(m: boolean) {
  muted = m;
  if (ctx && master) master.gain.setTargetAtTime(m ? 0 : 1, ctx.currentTime, 0.05);
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', gain = 0.06, slideTo?: number, delay = 0) {
  const c = ensure();
  if (!c || !master || muted) return;
  const t = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.03);
}

let noiseBuf: AudioBuffer | null = null;
function noiseBuffer(c: AudioContext) {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

/** A burst of filtered noise: thuds, whooshes and booms. */
function noise(dur: number, gain: number, from: number, to: number, delay = 0, q = 0.8) {
  const c = ensure();
  if (!c || !master || muted) return;
  const t = c.currentTime + delay;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.Q.value = q;
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(Math.max(30, to), t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t);
  src.stop(t + dur + 0.05);
}

// ---------- combo ----------

let comboLevel = 0;
let comboAt = 0;
const COMBO_WINDOW = 3000;

/** Call for every good action. Returns how many good actions have landed inside the window. */
function bumpCombo(): number {
  const now = performance.now();
  comboLevel = now - comboAt < COMBO_WINDOW ? Math.min(comboLevel + 1, 8) : 0;
  comboAt = now;
  return comboLevel;
}
export const combo = () => (performance.now() - comboAt < COMBO_WINDOW ? comboLevel + 1 : 0);

// ---------- looping beds ----------

function buildBeds() {
  if (!ctx || !master) return;
  const c = ctx;
  const bed = (g = 0) => { const n = c.createGain(); n.gain.value = g; n.connect(master!); return n; };

  // Calm pad: two soft notes a fifth apart, slowly breathing. The base is humming along.
  const pad = bed();
  const padFilter = c.createBiquadFilter();
  padFilter.type = 'lowpass';
  padFilter.frequency.value = 520;
  padFilter.connect(pad);
  for (const [f, type] of [[98, 'triangle'], [147, 'sine'], [196.6, 'sine']] as const) {
    const o = c.createOscillator();
    o.type = type;
    o.frequency.value = f;
    const og = c.createGain();
    og.gain.value = 0.33;
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.07 + f / 3000;
    const lg = c.createGain();
    lg.gain.value = 0.2;
    lfo.connect(lg).connect(og.gain);
    o.connect(og).connect(padFilter);
    o.start();
    lfo.start();
  }

  // Mars wind: thin, because the air is thin. Louder and lower in a dust storm.
  const wind = bed();
  const windSrc = c.createBufferSource();
  windSrc.buffer = noiseBuffer(c);
  windSrc.loop = true;
  const windTone = c.createBiquadFilter();
  windTone.type = 'bandpass';
  windTone.frequency.value = 700;
  windTone.Q.value = 0.7;
  const gust = c.createOscillator();
  gust.frequency.value = 0.13;
  const gustGain = c.createGain();
  gustGain.gain.value = 260;
  gust.connect(gustGain).connect(windTone.frequency);
  windSrc.connect(windTone).connect(wind);
  windSrc.start();
  gust.start();

  // Storm bed: a deep rumble you feel more than hear.
  const rumble = bed();
  const rumbleSrc = c.createBufferSource();
  rumbleSrc.buffer = noiseBuffer(c);
  rumbleSrc.loop = true;
  const low = c.createBiquadFilter();
  low.type = 'lowpass';
  low.frequency.value = 150;
  rumbleSrc.connect(low).connect(rumble);
  rumbleSrc.start();
  const sub = c.createOscillator();
  sub.type = 'sawtooth';
  sub.frequency.value = 46;
  const subLfo = c.createOscillator();
  subLfo.frequency.value = 3.1;
  const subDepth = c.createGain();
  subDepth.gain.value = 5;
  subLfo.connect(subDepth).connect(sub.frequency);
  const subGain = c.createGain();
  subGain.gain.value = 0.35;
  const subLow = c.createBiquadFilter();
  subLow.type = 'lowpass';
  subLow.frequency.value = 200;
  sub.connect(subLow).connect(subGain).connect(rumble);
  sub.start();
  subLfo.start();

  // Tension layer: a low heartbeat, played by the music timer.
  const pulse = bed(1);

  beds = { pad, wind, windTone, rumble, pulse };

  musicTimer ??= setInterval(musicTick, 300);
}

/** Little notes over the beds: a slow tune when calm, a heartbeat when a storm is coming. */
function musicTick() {
  if (!ctx || !beds || muted || mood === 'off' || ctx.state !== 'running') return;
  beat++;
  if (mood === 'calm' && beat % 8 === 0) {
    const n = [0, 2, 3, 5, 4, 2, 5, 7][(beat / 8) % 8 | 0];
    tone(SCALE[n] / 2, 1.6, 'sine', 0.022);
    if ((beat / 8) % 4 === 3) tone(SCALE[n + 2], 1.2, 'sine', 0.012, undefined, 0.6);
  }
  if (mood === 'tension' && beat % 3 === 0) {
    tone(62, 0.22, 'sine', 0.2, 40);
    tone(58, 0.2, 'sine', 0.13, 38, 0.2);
  }
  if (mood === 'storm' && beat % 2 === 0) tone(49, 0.3, 'triangle', 0.12, 36);
  if (mood === 'dust' && beat % 10 === 0) tone(110, 1.8, 'sine', 0.03, 98);
}

function applyMood(ramp = 0.9) {
  if (!ctx || !beds) return;
  const t = ctx.currentTime;
  const set = (g: GainNode, v: number) => g.gain.setTargetAtTime(v, t, ramp / 3);
  const m = mood;
  set(beds.pad, m === 'calm' ? 0.05 : m === 'tension' ? 0.03 : m === 'dust' ? 0.02 : 0);
  set(beds.wind, m === 'off' ? 0 : m === 'dust' ? 0.16 : m === 'storm' ? 0.07 : 0.022);
  beds.windTone.frequency.setTargetAtTime(m === 'dust' ? 380 : 700, t, 0.5);
  set(beds.rumble, m === 'storm' ? 0.2 : m === 'dust' ? 0.06 : 0);
}

/** Change the looping bed. Safe to call every frame. */
export function setMood(next: Mood) {
  if (next === mood) return;
  mood = next;
  applyMood();
}

// ---------- effects ----------

/** Low, middle or high version of a sound, picked by the combo. */
const step3 = (level: number) => (level <= 0 ? 0 : level <= 2 ? 1 : 2);

export const sfx = {
  /** Switch on: a rising blip that climbs the scale with the combo. */
  on: () => {
    const n = bumpCombo();
    const f = SCALE[Math.min(n + 3, SCALE.length - 2)];
    tone(f, 0.1, 'triangle', 0.08, f * 1.5);
    tone(f * 2, 0.16, 'sine', 0.03, undefined, 0.05);
    noise(0.05, 0.05, 2400, 900);
  },
  off: () => { tone(392, 0.11, 'triangle', 0.06, 220); noise(0.06, 0.04, 900, 200); },
  /** An astronaut heads to a new job. */
  assign: () => {
    const v = step3(bumpCombo());
    const f = [330, 392, 494][v];
    tone(f, 0.08, 'triangle', 0.07);
    tone(f * 1.25, 0.08, 'triangle', 0.07, undefined, 0.07);
    tone(f * 1.5, 0.14, 'triangle', 0.07, undefined, 0.14);
  },
  /** Number pops landing on a bar. Tiny, so many of them never get tiring. */
  pop: (kind: 'good' | 'dull' = 'good') => {
    if (kind === 'dull') return tone(300, 0.05, 'sine', 0.018);
    const f = SCALE[5 + ((beat + (Math.random() * 3 | 0)) % 5)];
    tone(f, 0.07, 'sine', 0.03);
  },
  /** A mini-mission or reward: three rising notes, higher with the combo. */
  reward: () => {
    const v = step3(bumpCombo());
    const base = [523, 659, 784][v];
    [1, 1.25, 1.5, 2].forEach((m, i) => tone(base * m, 0.2, 'triangle', 0.07, undefined, i * 0.08));
    tone(base * 3, 0.5, 'sine', 0.03, undefined, 0.32);
  },
  denied: () => { tone(150, 0.16, 'square', 0.04); tone(120, 0.18, 'square', 0.04, undefined, 0.12); },
  warning: () => { for (let i = 0; i < 3; i++) tone(880, 0.14, 'square', 0.035, 660, i * 0.22); },
  /** The fuse: one tick, higher and sharper the closer the storm is. `near` is 0-1. */
  tick: (near: number) => {
    const f = 420 + 1100 * near * near;
    tone(f, 0.05, 'square', 0.03 + 0.03 * near);
    if (near > 0.6) tone(f * 1.5, 0.04, 'square', 0.02, undefined, 0.05);
  },
  /** Time slows just before the hit. */
  slowmo: () => { tone(900, 0.45, 'sine', 0.07, 70); noise(0.4, 0.05, 3000, 200); },
  hit: () => { noise(1.1, 0.5, 900, 40); tone(110, 0.9, 'sawtooth', 0.12, 32); tone(55, 1.2, 'sine', 0.25, 30); },
  brownout: () => { tone(300, 0.5, 'sawtooth', 0.05, 60); noise(0.3, 0.08, 1200, 100); },
  /** A module snapping into place: a heavy thump, then a bright click. */
  thump: () => { tone(130, 0.28, 'sine', 0.4, 38); noise(0.2, 0.3, 700, 60); tone(660, 0.07, 'triangle', 0.05, 990, 0.12); },
  build: () => { tone(330, 0.08, 'triangle', 0.06); tone(494, 0.12, 'triangle', 0.06, undefined, 0.09); },
  /** Data upload: a clean ping with an echo. */
  ping: () => { tone(1319, 0.3, 'sine', 0.06); tone(1319, 0.25, 'sine', 0.025, undefined, 0.18); tone(1976, 0.2, 'sine', 0.02, undefined, 0.02); },
  /** Jury-rig: tape rip, two knocks, and it works. */
  patch: () => { noise(0.14, 0.14, 4000, 800, 0, 3); tone(220, 0.05, 'square', 0.06, undefined, 0.16); tone(220, 0.05, 'square', 0.06, undefined, 0.26); tone(587, 0.2, 'triangle', 0.07, 880, 0.38); },
  /** The lander's engines on the way down, then touchdown. */
  descent: () => { noise(2.1, 0.22, 500, 1800, 0, 1.5); tone(70, 2.1, 'sawtooth', 0.06, 120); noise(0.3, 0.35, 600, 50, 2.1); tone(90, 0.3, 'sine', 0.3, 40, 2.1); },
  /** A discovery: a sparkly run up the scale and a shimmer. */
  discover: () => {
    bumpCombo();
    [0, 2, 4, 5, 7, 9].forEach((n, i) => tone(SCALE[n + 2], 0.18, 'triangle', 0.06, undefined, i * 0.06));
    tone(SCALE[12], 0.9, 'sine', 0.035, undefined, 0.36);
    noise(0.5, 0.03, 9000, 3000, 0.3, 4);
  },
  /** Losing a crewmate: slow, low, gentle. */
  mourn: () => [330, 294, 262, 196].forEach((f, i) => tone(f, 0.7, 'sine', 0.07, undefined, i * 0.45)),
  /** Perfect power: a short bright chord, like the base humming in tune. */
  tuned: () => [523, 659, 784].forEach((f) => tone(f, 0.6, 'sine', 0.035)),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', 0.07, undefined, i * 0.14)),
  /** Stars landing on the held card, one pitch each. */
  star: (i: number) => { tone([784, 988, 1319][i] ?? 1319, 0.3, 'triangle', 0.08); tone(([784, 988, 1319][i] ?? 1319) * 2, 0.4, 'sine', 0.03, undefined, 0.04); },
  lose: () => [392, 330, 262].forEach((f, i) => tone(f, 0.35, 'triangle', 0.06, undefined, i * 0.22)),
};
