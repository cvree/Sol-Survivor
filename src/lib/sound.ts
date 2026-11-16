/**
 * Sound for Sol Survivor.
 *
 * Effects are synthesised (no files): little arcade instruments built from oscillators,
 * a glassy FM bell, a warm square "chip" voice and filtered noise, all through a shared
 * room (a short reverb and a slapback echo) and a soft limiter so nothing ever clips or stings.
 * Everything sits on one friendly scale, so effects sound like part of the music.
 *
 * Music is five full tracks in `public/music`, crossfaded by what is happening:
 * the title, building the base, a storm, a dust storm, and the end of the mission.
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let fxBus: GainNode | null = null;
let musicBus: GainNode | null = null;
let bedBus: GainNode | null = null;
let verbSend: GainNode | null = null;
let echoSend: GainNode | null = null;

const MUTE_KEY = 'sol-survivor:muted';
let muted = (() => { try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; } })();
export const isMuted = () => muted;

export type Mood = 'off' | 'calm' | 'tension' | 'storm' | 'dust';
let mood: Mood = 'off';
let beds: { wind: GainNode; windTone: BiquadFilterNode; rumble: GainNode } | null = null;
let musicTimer: ReturnType<typeof setInterval> | null = null;
let beat = 0;

/** One friendly scale (C major pentatonic), low to high. Every effect picks its notes from here. */
const SCALE = [262, 294, 330, 392, 440, 523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760, 2093];
const LEVEL = { master: 0.9, fx: 2, music: 0.42, beds: 0.8 };

function ensure(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
      // A soft limiter on everything: loud moments stay round, quiet ones stay audible.
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -16;
      limiter.knee.value = 12;
      limiter.ratio.value = 5;
      limiter.attack.value = 0.004;
      limiter.release.value = 0.22;
      master = ctx.createGain();
      master.gain.value = muted ? 0 : LEVEL.master;
      master.connect(limiter).connect(ctx.destination);

      fxBus = ctx.createGain();
      fxBus.gain.value = LEVEL.fx;
      fxBus.connect(master);
      musicBus = ctx.createGain();
      musicBus.gain.value = LEVEL.music;
      musicBus.connect(master);
      bedBus = ctx.createGain();
      bedBus.gain.value = LEVEL.beds;
      bedBus.connect(master);

      // The room: a short, bright reverb tail and a quiet slapback echo, shared by every effect.
      const verb = ctx.createConvolver();
      verb.buffer = impulse(ctx, 1.6, 2.6);
      const verbOut = ctx.createGain();
      verbOut.gain.value = 0.5;
      verbSend = ctx.createGain();
      verbSend.connect(verb).connect(verbOut).connect(fxBus);

      const echo = ctx.createDelay(1);
      echo.delayTime.value = 0.19;
      const fb = ctx.createGain();
      fb.gain.value = 0.28;
      const tone = ctx.createBiquadFilter();
      tone.type = 'lowpass';
      tone.frequency.value = 2600;
      echoSend = ctx.createGain();
      const echoOut = ctx.createGain();
      echoOut.gain.value = 0.32;
      echoSend.connect(echo).connect(tone).connect(fb).connect(echo);
      tone.connect(echoOut).connect(fxBus);

      buildBeds();
      applyMood(0.05);
      // Browsers only let sound start after a tap. Keep trying on the next one.
      const wake = () => { if (ctx?.state === 'suspended') void ctx.resume(); retryMusic(); };
      window.addEventListener('pointerdown', wake, { passive: true });
      window.addEventListener('keydown', wake);
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null; // sound is a bonus; never break the game over it
  }
}

/** A generated reverb tail: decaying noise, darker towards the end. */
function impulse(c: AudioContext, seconds: number, decay: number) {
  const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const k = i / len;
      lp += ((Math.random() * 2 - 1) - lp) * (0.9 - 0.75 * k);
      d[i] = lp * Math.pow(1 - k, decay) * 0.6;
    }
  }
  return buf;
}

export function setMuted(m: boolean) {
  muted = m;
  try { localStorage.setItem(MUTE_KEY, m ? '1' : '0'); } catch { /* fine */ }
  if (ctx && master) master.gain.setTargetAtTime(m ? 0 : LEVEL.master, ctx.currentTime, 0.05);
  if (!m) { ensure(); retryMusic(); }
}

// ---------- instruments ----------

interface Voice {
  type?: OscillatorType;
  /** Start pitch, and an optional pitch to glide to. */
  f: number;
  to?: number;
  dur: number;
  gain?: number;
  delay?: number;
  attack?: number;
  /** Lowpass cutoff, sweeping from `cut` to `cutTo`. */
  cut?: number;
  cutTo?: number;
  q?: number;
  /** Two detuned copies, for a fat chorus. In cents. */
  detune?: number;
  vibrato?: number;
  pan?: number;
  /** How much goes to the reverb and the echo, 0 to 1. */
  verb?: number;
  echo?: number;
}

function route(c: AudioContext, node: AudioNode, v: { pan?: number; verb?: number; echo?: number }) {
  let out: AudioNode = node;
  if (v.pan && c.createStereoPanner) {
    const p = c.createStereoPanner();
    p.pan.value = v.pan;
    node.connect(p);
    out = p;
  }
  out.connect(fxBus!);
  if (v.verb && verbSend) { const g = c.createGain(); g.gain.value = v.verb; out.connect(g).connect(verbSend); }
  if (v.echo && echoSend) { const g = c.createGain(); g.gain.value = v.echo; out.connect(g).connect(echoSend); }
}

/** A shaped note: oscillator(s), optional filter sweep and glide, soft attack and release. */
function voice(v: Voice) {
  const c = ensure();
  if (!c || !fxBus || muted) return;
  const t = c.currentTime + (v.delay ?? 0) + 0.005;
  const dur = v.dur;
  const amp = c.createGain();
  const peak = v.gain ?? 0.08;
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(peak, t + (v.attack ?? 0.006));
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let head: AudioNode = amp;
  if (v.cut) {
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.Q.value = v.q ?? 1;
    f.frequency.setValueAtTime(v.cut, t);
    if (v.cutTo) f.frequency.exponentialRampToValueAtTime(v.cutTo, t + dur);
    f.connect(amp);
    head = f;
  }
  const copies = v.detune ? [-v.detune, v.detune] : [0];
  for (const cents of copies) {
    const o = c.createOscillator();
    o.type = v.type ?? 'sine';
    o.frequency.setValueAtTime(v.f, t);
    if (v.to) o.frequency.exponentialRampToValueAtTime(v.to, t + Math.max(0.03, dur * 0.8));
    o.detune.value = cents;
    if (v.vibrato) {
      const lfo = c.createOscillator();
      lfo.frequency.value = 6;
      const lg = c.createGain();
      lg.gain.value = v.vibrato;
      lfo.connect(lg).connect(o.frequency);
      lfo.start(t);
      lfo.stop(t + dur + 0.05);
    }
    const g = c.createGain();
    g.gain.value = 1 / copies.length;
    o.connect(g).connect(head);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  route(c, amp, { pan: v.pan, verb: v.verb ?? 0.2, echo: v.echo });
}

/** A glassy FM bell: the sparkle in every reward. */
function bell(f: number, dur = 0.9, gain = 0.06, delay = 0, pan = 0, ratio = 3.5) {
  const c = ensure();
  if (!c || !fxBus || muted) return;
  const t = c.currentTime + delay + 0.005;
  const car = c.createOscillator();
  const mod = c.createOscillator();
  const idx = c.createGain();
  const amp = c.createGain();
  car.frequency.value = f;
  mod.frequency.value = f * ratio;
  idx.gain.setValueAtTime(f * 2.2, t);
  idx.gain.exponentialRampToValueAtTime(f * 0.05, t + dur * 0.6);
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(gain, t + 0.004);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  mod.connect(idx).connect(car.frequency);
  car.connect(amp);
  car.start(t); mod.start(t);
  car.stop(t + dur + 0.05); mod.stop(t + dur + 0.05);
  route(c, amp, { pan, verb: 0.45, echo: 0.25 });
}

/** A warm chiptune note: a square wave tamed by a closing filter. The arcade voice. */
const chip = (f: number, dur: number, gain = 0.05, delay = 0, to?: number, pan = 0) =>
  voice({ type: 'square', f, to, dur, gain, delay, cut: Math.min(8000, f * 6), cutTo: f * 1.5, q: 2, pan, verb: 0.15, echo: 0.12 });

/** A soft plucked note. */
const pluck = (f: number, dur = 0.25, gain = 0.07, delay = 0, pan = 0) =>
  voice({ type: 'triangle', f, dur, gain, delay, cut: f * 8, cutTo: f * 1.2, pan, verb: 0.25 });

let noiseBuf: AudioBuffer | null = null;
function noiseBuffer(c: AudioContext) {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

/** Filtered noise: puffs, whooshes, thuds and booms. */
function noise(dur: number, gain: number, from: number, to: number, delay = 0, q = 0.8, kind: BiquadFilterType = 'lowpass', verb = 0.15) {
  const c = ensure();
  if (!c || !fxBus || muted) return;
  const t = c.currentTime + delay + 0.005;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  const f = c.createBiquadFilter();
  f.type = kind;
  f.Q.value = q;
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(Math.max(30, to), t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g);
  route(c, g, { verb });
  src.start(t, Math.random() * 1.5);
  src.stop(t + dur + 0.05);
}

/** A round, punchy kick: the "thump" under landings and buildings. */
const kick = (gain = 0.4, delay = 0, from = 150, to = 42) => voice({ type: 'sine', f: from, to, dur: 0.32, gain, delay, verb: 0.05 });

// ---------- looping beds (under the music) ----------

function buildBeds() {
  if (!ctx || !bedBus) return;
  const c = ctx;
  const bed = () => { const g = c.createGain(); g.gain.value = 0; g.connect(bedBus!); return g; };

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
  low.frequency.value = 140;
  rumbleSrc.connect(low).connect(rumble);
  rumbleSrc.start();

  beds = { wind, windTone, rumble };
  musicTimer ??= setInterval(musicTick, 300);
}

/** A soft heartbeat under the music while a storm is on its way. */
function musicTick() {
  if (!ctx || !beds || muted || mood === 'off' || ctx.state !== 'running') return;
  beat++;
  if (mood === 'tension' && beat % 3 === 0) {
    kick(0.16, 0, 90, 40);
    kick(0.1, 0.2, 80, 38);
  }
}

function applyMood(ramp = 0.9) {
  if (!ctx || !beds) return;
  const t = ctx.currentTime;
  const set = (g: GainNode, v: number) => g.gain.setTargetAtTime(v, t, ramp / 3);
  const m = mood;
  set(beds.wind, m === 'off' ? 0 : m === 'dust' ? 0.12 : m === 'storm' ? 0.05 : 0.014);
  beds.windTone.frequency.setTargetAtTime(m === 'dust' ? 380 : 700, t, 0.5);
  set(beds.rumble, m === 'storm' ? 0.14 : m === 'dust' ? 0.04 : 0);
}

/** Change the looping bed. Safe to call every frame. */
export function setMood(next: Mood) {
  if (next === mood) return;
  mood = next;
  applyMood();
}

// ---------- music ----------

export type Track = 'title' | 'base' | 'storm' | 'dust' | 'win' | 'lost';
/** Which file plays for which moment. Building the base takes turns between two bright tracks. */
const FILES: Record<Track, string[]> = {
  title: ['iron-horizon'],
  base: ['outpost-prime', 'victory-run'],
  storm: ['last-fleet'],
  dust: ['long-watch'],
  win: ['victory-run'],
  lost: ['long-watch'],
};
const TRACK_LEVEL: Record<Track, number> = { title: 0.85, base: 0.72, storm: 0.9, dust: 0.75, win: 1, lost: 0.7 };

interface Deck { el: HTMLAudioElement; gain: GainNode; file: string }
const decks = new Map<string, Deck>();
let wanted: Track | null = null;
let playing: Deck | null = null;
let baseTurn = 0;

function deck(file: string): Deck | null {
  const c = ensure();
  if (!c || !musicBus) return null;
  let d = decks.get(file);
  if (!d) {
    const el = new Audio(`${import.meta.env.BASE_URL}music/${file}.mp3`);
    el.preload = 'auto';
    const gain = c.createGain();
    gain.gain.value = 0;
    try { c.createMediaElementSource(el).connect(gain).connect(musicBus); } catch { return null; }
    d = { el, gain, file };
    decks.set(file, d);
    // When a base track ends, the other one takes over, so the base never loops the same song.
    el.addEventListener('ended', () => {
      if (playing?.file !== file) return;
      if (wanted === 'base') { baseTurn++; startTrack('base', 0.4); }
      else { el.currentTime = 0; void el.play().catch(() => undefined); }
    });
  }
  return d;
}

function startTrack(track: Track, fade = 1.6) {
  const c = ensure();
  if (!c) return;
  const files = FILES[track];
  const next = deck(files[baseTurn % files.length]);
  if (!next) return;
  const t = c.currentTime;
  if (playing && playing !== next) {
    const old = playing;
    old.gain.gain.cancelScheduledValues(t);
    old.gain.gain.setTargetAtTime(0, t, fade / 4);
    setTimeout(() => { if (playing !== old) old.el.pause(); }, fade * 1000 + 400);
  }
  playing = next;
  next.gain.gain.cancelScheduledValues(t);
  next.gain.gain.setTargetAtTime(TRACK_LEVEL[track], t, fade / 4);
  if (track === 'win' || track === 'lost') next.el.currentTime = 0;
  if (next.el.paused && !muted) void next.el.play().catch(() => undefined);
}

function retryMusic() {
  if (wanted && playing?.el.paused && !muted) void playing.el.play().catch(() => undefined);
}

/** Ask for a piece of music. Safe to call every frame: it only acts when the track changes. */
export function setMusic(track: Track | null) {
  if (track === wanted) return;
  wanted = track;
  if (!track) {
    if (playing && ctx) { const old = playing; old.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.3); setTimeout(() => old.el.pause(), 1500); }
    playing = null;
    return;
  }
  startTrack(track);
}

/** Dip the music for a moment so a big hit can be felt. */
function duck(depth = 0.25, hold = 0.9) {
  if (!ctx || !musicBus) return;
  const t = ctx.currentTime;
  musicBus.gain.cancelScheduledValues(t);
  musicBus.gain.setTargetAtTime(LEVEL.music * depth, t, 0.03);
  musicBus.gain.setTargetAtTime(LEVEL.music, t + hold, 0.4);
}

// ---------- effects ----------

const n = (i: number) => SCALE[Math.max(0, Math.min(SCALE.length - 1, i))];

export const sfx = {
  /** Switch on: a crisp click, then a bright chip blip that leaps up. */
  on: () => {
    noise(0.03, 0.12, 6000, 2500, 0, 2, 'highpass', 0.05);
    chip(n(4), 0.09, 0.05, 0.01, n(7));
    bell(n(9), 0.5, 0.035, 0.06);
  },
  /** Switch off: a soft click and a little falling sigh. */
  off: () => {
    noise(0.03, 0.09, 3000, 1500, 0, 2, 'highpass', 0.05);
    voice({ type: 'triangle', f: n(5), to: n(1), dur: 0.16, gain: 0.06, verb: 0.15 });
  },
  /** Picked up: a springy boing that rises, like being lifted off your feet. */
  pickup: () => {
    voice({ type: 'triangle', f: 300, to: 760, dur: 0.16, gain: 0.07, vibrato: 18, verb: 0.15 });
    chip(n(7), 0.07, 0.03, 0.08);
    noise(0.08, 0.04, 1200, 4000, 0, 1, 'bandpass', 0.05);
  },
  /** Hovering over a place they can go: a tiny pip. */
  hover: () => pluck(n(9), 0.08, 0.035),
  /** Off you go: a bouncy landing with a sparkle on top. */
  assign: () => {
    kick(0.22, 0, 180, 60);
    noise(0.16, 0.08, 900, 200, 0.01, 0.7, 'lowpass', 0.1);
    pluck(n(5), 0.18, 0.06, 0.04);
    pluck(n(7), 0.18, 0.06, 0.09);
    bell(n(10), 0.7, 0.04, 0.14, 0.2);
  },
  /** A bad drop: a friendly two-note "uh-uh" with a wobble, never a buzzer. */
  nope: () => {
    voice({ type: 'triangle', f: 330, dur: 0.12, gain: 0.07, vibrato: 10, verb: 0.1 });
    voice({ type: 'triangle', f: 247, dur: 0.2, gain: 0.07, delay: 0.12, vibrato: 14, verb: 0.15 });
    noise(0.12, 0.04, 400, 150, 0.2, 0.7);
  },
  denied: () => sfx.nope(),
  /** Arrived where they were sent: a soft little hop. */
  land: () => { kick(0.12, 0, 220, 90); noise(0.1, 0.035, 1500, 300, 0, 0.7, 'lowpass', 0.05); },
  /** Number pops landing on a bar. Tiny, so many of them never get tiring. */
  pop: (kind: 'good' | 'dull' = 'good') => {
    if (kind === 'dull') return pluck(n(2), 0.06, 0.02);
    pluck(n(7 + ((beat + (Math.random() * 3 | 0)) % 5)), 0.09, 0.035);
  },
  /** A mini-mission or reward: a coin-run arpeggio with a bell on top. */
  reward: () => {
    [5, 7, 9, 10].forEach((i, k) => chip(n(i), 0.12, 0.045, k * 0.06, undefined, (k - 1.5) * 0.25));
    bell(n(12), 1.1, 0.05, 0.24);
    bell(n(14), 0.9, 0.025, 0.3, 0.3);
  },
  /** Storm warning: a two-tone alarm, softened with a filter and room. */
  warning: () => {
    for (let i = 0; i < 3; i++) {
      voice({ type: 'sawtooth', f: 880, dur: 0.13, gain: 0.04, delay: i * 0.26, cut: 2400, cutTo: 1200, verb: 0.3 });
      voice({ type: 'sawtooth', f: 660, dur: 0.13, gain: 0.04, delay: i * 0.26 + 0.13, cut: 2000, cutTo: 900, verb: 0.3 });
    }
  },
  /** The fuse: one tick, higher and sharper the closer the storm is. `near` is 0-1. */
  tick: (near: number) => {
    const f = 520 + 900 * near * near;
    pluck(f, 0.05, 0.025 + 0.025 * near);
    if (near > 0.6) pluck(f * 1.5, 0.04, 0.015, 0.05);
  },
  /** Time slows just before the hit: everything drains down. */
  slowmo: () => { voice({ type: 'sine', f: 900, to: 80, dur: 0.5, gain: 0.07, verb: 0.5 }); noise(0.45, 0.05, 3000, 200, 0, 0.8, 'lowpass', 0.4); duck(0.35, 0.6); },
  /** The storm lands: a deep boom with a crack on top. */
  hit: () => {
    duck(0.2, 1.2);
    kick(0.32, 0, 120, 30);
    noise(1.2, 0.18, 1400, 50, 0, 0.7, 'lowpass', 0.4);
    noise(0.12, 0.12, 5000, 1500, 0, 1, 'highpass', 0.2);
    voice({ type: 'sawtooth', f: 110, to: 34, dur: 0.9, gain: 0.06, cut: 600, cutTo: 80, verb: 0.3 });
  },
  brownout: () => { voice({ type: 'sawtooth', f: 300, to: 60, dur: 0.5, gain: 0.04, cut: 1200, cutTo: 200 }); noise(0.3, 0.06, 1200, 100); },
  /** A module snapping into place: a heavy thump, a clank, then a bright click. */
  thump: () => {
    kick(0.3, 0, 140, 38);
    noise(0.22, 0.11, 800, 60, 0, 0.7, 'lowpass', 0.1);
    voice({ type: 'square', f: 1240, dur: 0.06, gain: 0.025, delay: 0.05, cut: 3000, cutTo: 1500, verb: 0.3 });
    pluck(n(9), 0.12, 0.05, 0.12);
  },
  /** A building finished: a thump, then a little fanfare that rings out. */
  built: () => {
    sfx.thump();
    [5, 7, 9].forEach((i, k) => chip(n(i), 0.1, 0.045, 0.18 + k * 0.08));
    chip(n(12), 0.3, 0.05, 0.42);
    bell(n(12), 1.2, 0.05, 0.42);
  },
  /** A button press: a soft double pop. */
  build: () => { pluck(n(5), 0.08, 0.05); pluck(n(7), 0.1, 0.05, 0.06); },
  /** M.A.R.V. has something to show you: a friendly two-bell chime. */
  ping: () => { bell(n(10), 0.7, 0.05); bell(n(12), 0.8, 0.04, 0.12, 0.2); },
  /** A lesson step done: a happy little "ta-da". */
  learn: () => { chip(n(7), 0.08, 0.045); chip(n(9), 0.08, 0.045, 0.07); chip(n(12), 0.18, 0.05, 0.14); bell(n(14), 0.9, 0.03, 0.18); },
  /** Jury-rig: a tape rip, two knocks, and it works. */
  patch: () => { noise(0.14, 0.12, 4000, 800, 0, 3, 'bandpass'); pluck(220, 0.05, 0.06, 0.16); pluck(220, 0.05, 0.06, 0.26); chip(n(6), 0.18, 0.05, 0.38, n(9)); },
  /** The lander's engines on the way down, then touchdown. */
  descent: () => {
    duck(0.45, 2.3);
    noise(2.1, 0.08, 500, 1800, 0, 1.5);
    voice({ type: 'sawtooth', f: 70, to: 120, dur: 2.1, gain: 0.035, cut: 500, cutTo: 900 });
    kick(0.25, 2.1, 130, 36);
    noise(0.35, 0.13, 700, 50, 2.1, 0.7, 'lowpass', 0.2);
  },
  /** A discovery: a magic glissando up the scale with a shimmer. */
  discover: () => {
    [3, 5, 6, 7, 9, 10, 12].forEach((i, k) => chip(n(i), 0.1, 0.035, k * 0.045, undefined, ((k % 3) - 1) * 0.3));
    bell(n(12), 1.4, 0.05, 0.34);
    bell(n(15), 1.1, 0.025, 0.4, -0.3);
    noise(0.6, 0.025, 9000, 4000, 0.3, 4, 'highpass', 0.5);
  },
  /** Losing a crewmate: slow, low, gentle. */
  mourn: () => [n(7), n(6), n(5), n(3)].forEach((f, i) => voice({ type: 'sine', f: f / 2, dur: 0.8, gain: 0.07, delay: i * 0.45, verb: 0.5, vibrato: 3 })),
  /** Perfect power: a short bright chord, like the base humming in tune. */
  tuned: () => [n(5), n(7), n(8)].forEach((f, i) => bell(f, 1, 0.03, i * 0.03)),
  /** A storm beaten or a big win: a chip fanfare with bells. */
  win: () => {
    [5, 7, 8, 10].forEach((i, k) => chip(n(i), 0.16, 0.05, k * 0.12));
    chip(n(12), 0.5, 0.055, 0.5);
    bell(n(12), 1.4, 0.05, 0.5);
    bell(n(15), 1.2, 0.03, 0.56, 0.3);
    kick(0.1, 0.5);
  },
  /** Stars landing on the held card, one pitch each. */
  star: (i: number) => { const f = [n(7), n(9), n(12)][i] ?? n(12); chip(f, 0.14, 0.05); bell(f * 2, 0.8, 0.035, 0.02); },
  lose: () => [n(5), n(4), n(3), n(1)].forEach((f, i) => voice({ type: 'triangle', f, dur: 0.42, gain: 0.06, delay: i * 0.24, vibrato: 4, verb: 0.4 })),
};
