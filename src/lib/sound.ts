/** Tiny synthesized sound effects. No audio files, so nothing to download. */
let ctx: AudioContext | null = null;
let muted = false;

export const setMuted = (m: boolean) => { muted = m; };

function tone(freq: number, dur: number, type: OscillatorType = 'sine', gain = 0.06, slideTo?: number, delay = 0) {
  if (muted) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  } catch {
    /* sound is a bonus; never break the game over it */
  }
}

export const sfx = {
  on: () => tone(520, 0.09, 'triangle', 0.07, 780),
  off: () => tone(420, 0.1, 'triangle', 0.06, 240),
  denied: () => { tone(150, 0.16, 'square', 0.04); tone(120, 0.18, 'square', 0.04, undefined, 0.12); },
  warning: () => { for (let i = 0; i < 3; i++) tone(880, 0.14, 'square', 0.035, 660, i * 0.22); },
  hit: () => tone(90, 0.7, 'sawtooth', 0.07, 40),
  brownout: () => tone(300, 0.5, 'sawtooth', 0.05, 60),
  build: () => { tone(330, 0.08, 'triangle', 0.06); tone(494, 0.12, 'triangle', 0.06, undefined, 0.09); },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', 0.07, undefined, i * 0.14)),
  lose: () => [392, 330, 262].forEach((f, i) => tone(f, 0.35, 'triangle', 0.06, undefined, i * 0.22)),
};
