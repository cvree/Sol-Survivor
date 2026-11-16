// Frame-by-frame analysis of a proof run: the worst jump, and the steady walking speed of every walk.
function analyse(frames) {
  let worst = { d: 0 };
  const jumps = {};
  for (let i = 1; i < frames.length; i++) {
    const a = frames[i - 1]; const b = frames[i];
    for (const id of Object.keys(b.b)) {
      if (!a.b[id]) continue;
      const d = Math.hypot(b.b[id][0] - a.b[id][0], b.b[id][1] - a.b[id][1]);
      if (d > worst.d) worst = { d, id, scene: b.m, cls: b.b[id][2], dt: b.t - a.t, from: a.b[id].slice(0, 2), to: b.b[id].slice(0, 2) };
      jumps[b.m] = Math.max(jumps[b.m] ?? 0, d);
    }
  }
  // Steady walking speed: each stretch of level walking in one direction, the 75th percentile of 12-frame windows.
  const runs = [];
  for (const id of Object.keys(frames[frames.length - 1].b)) {
    let run = []; let dir = 0;
    const flush = () => {
      if (run.length >= 40) {
        const w = [];
        for (let i = 12; i < run.length; i += 3) { const a = run[i - 12]; const b = run[i]; w.push(Math.abs(b.x - a.x) / ((b.t - a.t) / 1000)); }
        w.sort((p, q) => p - q);
        runs.push({ id, scene: run[0].m, len: Math.round(Math.abs(run[run.length - 1].x - run[0].x)), speed: w[Math.floor(w.length * 0.75)], frames: run.length });
      }
      run = []; dir = 0;
    };
    for (let i = 1; i < frames.length; i++) {
      const p = frames[i].b[id]; const q = frames[i - 1].b[id];
      const ok = p && q && /\bmoving\b/.test(p[2]) && Math.abs(p[1] - q[1]) < 0.01 && Math.abs(p[0] - q[0]) > 0.02;
      const d = ok ? Math.sign(p[0] - q[0]) : 0;
      if (ok && (dir === 0 || d === dir)) { if (!run.length) run.push({ x: q[0], t: frames[i - 1].t, m: frames[i].m }); run.push({ x: p[0], t: frames[i].t, m: frames[i].m }); dir = d; }
      else { flush(); if (ok) { run.push({ x: q[0], t: frames[i - 1].t, m: frames[i].m }, { x: p[0], t: frames[i].t, m: frames[i].m }); dir = d; } }
    }
    flush();
  }
  const sorted = [...runs].filter((r) => r.len >= 120).sort((a, b) => a.len - b.len);
  const short = sorted[0]; const long = sorted[sorted.length - 1];
  const spread = short && long ? Math.abs(short.speed - long.speed) / long.speed : 1;
  return { worst, jumps, runs, short, long, spread };
}
module.exports = { analyse };
if (require.main === module) {
  const r = analyse(JSON.parse(require('fs').readFileSync(process.argv[2], 'utf8')));
  console.log(JSON.stringify({ ...r, runs: r.runs.map((x) => `${x.id} ${x.len}px @ ${x.speed.toFixed(1)} px/s (${x.scene})`) }, null, 2));
}
