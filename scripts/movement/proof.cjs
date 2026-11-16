// Proof: track every astronaut's position every animation frame through all the movement scenarios.
// Usage: node proof.cjs [big|mid|phone] [shots]
const { open, richBase } = require('./setup.cjs');
const fs = require('fs');

const SIZES = { big: { width: 1600, height: 880 }, mid: { width: 1280, height: 720 }, phone: 'phone' };
const which = process.argv[2] || 'big';
const SHOTS = process.argv[3] === 'shots';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const { browser, ctx, page, errors } = await open(SIZES[which], { dsf: SHOTS ? 2 : 1 });
  const touch = which === 'phone';
  const cdp = touch ? await ctx.newCDPSession(page) : null;
  await richBase(page);
  // Keep the test steady: no landers, storms, finds or tiredness getting in the way.
  await page.evaluate(() => {
    setInterval(() => {
      const G = window.__game; const s = G.getState().game;
      if (!s || window.__keepOff) return;
      // Celebration cards hold the clock until tapped: tap them away.
      if (G.getState().moment) G.getState().endMoment();
      if (G.getState().panel && G.getState().panel.type !== 'cargo') G.getState().open(null);
      G.setState({ game: { ...s, cargoProgress: 0, life: 100, crew: s.crew.map((c) => (window.__tired === c.id ? { ...c, temp: 98.2, health: 100, noAir: 0 } : { ...c, energy: 100, mood: 90, temp: 98.2, health: 100, noAir: 0, exhausted: false })) } });
    }, 500);
  });
  // The tracker: every animation frame, where each body is drawn (world pixels, and on screen).
  await page.evaluate(() => {
    window.__trk = { on: true, mark: 'start', frames: [] };
    const loop = (t) => {
      const world = document.querySelector('.scene .world');
      if (world) {
        const wr = world.getBoundingClientRect();
        const k = wr.width / world.offsetWidth;
        const f = { t, m: window.__trk.mark, b: {} };
        for (const el of document.querySelectorAll('.crew-layer .body[data-crew]')) {
          const r = el.getBoundingClientRect();
          f.b[el.dataset.crew] = [(r.left - wr.left) / k, (r.top - wr.top) / k, el.className.replace(/\bbody\b/, '').trim()];
        }
        window.__trk.frames.push(f);
      }
      if (window.__trk.on) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
  const mark = (m) => page.evaluate((m) => { window.__trk.mark = m; }, m);
  const st = (fn, ...a) => page.evaluate(fn, ...a);
  const crew = (id) => st((id) => { const c = window.__game.getState().game.crew.find((x) => x.id === id); return { at: c.at, arriving: c.arriving, trip: c.trip && { phase: c.trip.phase, x: c.trip.x } }; }, id);
  const settled = async (id, timeout = 60000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      const ok = await st((id) => { const c = window.__game.getState().game.crew.find((x) => x.id === id); const b = window.__movement.debugBodies().find((x) => x.id === id); return !c.trip && c.arriving <= 0 && b && !b.legs.length && b.mode === 'free'; }, id);
      if (ok) return true;
      await sleep(100);
    }
    const diag = await st((id) => { const S = window.__game.getState(); const b = window.__movement.debugBodies().find((x) => x.id === id); return { panel: S.panel, moment: S.moment, coach: S.coach, paused: S.paused, editing: S.editing, settingsOpen: S.settingsOpen, tour: S.tour, offer: !!S.game.offer, status: S.game.status, time: S.game.time, body: b }; }, id);
    const t1 = await st(() => window.__game.getState().game.time); await sleep(1000); const t2 = await st(() => window.__game.getState().game.time);
    const b2 = await st(() => window.__movement.debugBodies());
    console.error('clock moved', t2 - t1, JSON.stringify(b2));
    const rate = await st(() => { const S = window.__game.getState(); return { speed: S.speed, slowmo: S.slowmo, party: S.party, crew: S.game.crew.map((c) => [c.id, c.energy, c.exhausted, c.noAir, c.health]) }; });
    throw new Error(`${id} did not settle in ${timeout} ms: ${JSON.stringify(await crew(id))} ${JSON.stringify(diag)} ${JSON.stringify(rate)} ERRORS ${JSON.stringify(errors.slice(-5))}`);
  };
  const bodyScreen = (id) => st((id) => { const el = document.querySelector(`.crew-layer .body[data-crew="${id}"] > .sprite`); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * 0.45 }; }, id);
  const modScreen = (id) => st((id) => { const el = document.querySelector(`.mod[data-mod="${id}"] .mod-hit`) ?? document.querySelector(`[data-mod="${id}"]`); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, id);
  const camHome = () => st(() => { window.__camera.follow(null); window.__camera.jumpHome(); });
  const shot = async (name) => { if (SHOTS) await page.screenshot({ path: `shot-${which}-${name}.png` }); };

  // Drag slowly (about 6 px per frame), with a mouse or a finger.
  async function drag(from, to, opts = {}) {
    const steps = Math.max(8, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 6));
    if (touch) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x, y: from.y }] });
      for (let i = 1; i <= steps; i++) {
        const x = from.x + ((to.x - from.x) * i) / steps; const y = from.y + ((to.y - from.y) * i) / steps;
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
        await sleep(16);
        if (opts.mid && i === Math.floor(steps / 2)) await opts.mid();
      }
      await sleep(250);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } else {
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      for (let i = 1; i <= steps; i++) {
        await page.mouse.move(from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps);
        await sleep(16);
        if (opts.mid && i === Math.floor(steps / 2)) await opts.mid();
      }
      await sleep(250);
      await page.mouse.up();
    }
  }
  const tap = async (p) => { if (touch) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y); };
  /** A screen point over open crater ground where a drop means "walk here". */
  const groundPoint = (id) => st((id) => {
    const scene = document.querySelector('.scene').getBoundingClientRect();
    const dirt = document.querySelector('.scene .dirt').getBoundingClientRect();
    for (let x = scene.right - 60; x > scene.left + 40; x -= 10) {
      const y = dirt.top - 30;
      const r = window.__drag.resolveDrop(id, x, y);
      if (r && r.startsWith('ground:')) return { x, y };
    }
    return null;
  }, id);

  const log = [];
  const step = async (name, fn) => { await mark(name); const t0 = Date.now(); await fn(); log.push(`${name}: ${((Date.now() - t0) / 1000).toFixed(1)} s`); };

  await settled('ada');
  await settled('c2');
  await settled('c3');
  await camHome();

  await step('room to room (Hab to Hydroponics)', async () => {
    await st(() => window.__game.getState().assign('ada', 'm-hydro'));
    await sleep(700); await shot('mid-walk');
    await settled('ada');
    await shot('arrived');
  });
  await step('room to a dug-in room (down the ladder)', async () => {
    await st(() => window.__game.getState().assign('ada', 'm-oxygen'));
    for (let i = 0; i < 80; i++) { const b = await st(() => window.__movement.debugBodies().find((x) => x.id === 'ada')); if (b.loc === 'ladder') { await shot('ladder'); break; } await sleep(50); }
    await settled('ada');
  });
  await step('change of mind halfway (Lab, then back to the Hab)', async () => {
    await st(() => window.__game.getState().assign('ada', 'm-lab'));
    await sleep(1400);
    await st(() => window.__game.getState().assign('ada', 'hab'));
    await settled('ada');
  });
  await step('drag and drop onto a room (Science Lab)', async () => {
    const from = await bodyScreen('ada');
    const to = await modScreen('m-lab');
    await drag(from, to);
    await settled('ada');
  });
  await step('drag and drop onto open crater ground', async () => {
    await camHome(); await sleep(300);
    const from = await bodyScreen('ada');
    const to = await groundPoint('ada');
    if (!to) throw new Error('no open ground on screen');
    await drag(from, to);
    // Walks there, through the airlock, and looks around.
    for (let i = 0; i < 400; i++) { const c = await crew('ada'); if (c.trip && c.trip.phase === 'work') break; const b = await st(() => window.__movement.debugBodies().find((x) => x.id === 'ada')); if (b.loc === 'door' && i % 1 === 0) await shot('airlock'); await sleep(100); }
    await st(() => window.__game.getState().recall('ada'));
    await settled('ada');
  });
  await step('a bad drop (onto a room M.A.R.V. is not allowing right now)', async () => {
    await camHome(); await sleep(300);
    // A lesson that only allows digging: dropping on a room is refused.
    await st(() => window.__game.setState({ coach: { lesson: 'dig', step: 0 } }));
    await sleep(200);
    const from = await bodyScreen('ada');
    const to = await modScreen((await crew('ada')).at === 'm-lab' ? 'm-hydro' : 'm-lab');
    const before = await crew('ada');
    await drag(from, to);
    await sleep(500); await shot('bad-drop');
    await st(() => window.__game.setState({ coach: null }));
    await settled('ada');
    const after = await crew('ada');
    log.push(`bad drop: ${before.at} -> ${after.at}`);
  });
  await step('tap, then tap a place (Oxygen Maker)', async () => {
    await camHome(); await sleep(300);
    await tap(await bodyScreen('ada'));
    await sleep(300);
    const z = await st(() => { const el = document.querySelector('.drop-zone[data-mod="m-oxygen"]'); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await tap(z);
    await settled('ada');
    if ((await crew('ada')).at !== 'm-oxygen') throw new Error('tap-then-tap did not send them');
  });
  await step('out to a rock pile and home again', async () => {
    await st(() => { const s = window.__game.getState().game; const d = s.deposits.filter((x) => x.left > 0).sort((a, b) => Math.abs(a.x - 0.5) - Math.abs(b.x - 0.5))[0]; window.__game.getState().dig(d.id, 'ada'); });
    await sleep(500);
    if (!(await crew('ada')).trip) throw new Error('did not go out');
    await settled('ada', 120000);
  });
  await step('called back mid-walk', async () => {
    await st(() => window.__game.getState().goTo('ada', 0.92));
    for (let i = 0; i < 200; i++) { const c = await crew('ada'); if (c.trip && c.trip.phase === 'out' && c.arriving <= 0) break; await sleep(100); }
    await sleep(2500);
    await st(() => window.__game.getState().recall('ada'));
    await settled('ada', 90000);
  });
  await step('two astronauts arriving in the same room (the Hab, where Ada is)', async () => {
    await st(() => window.__game.getState().assign('ada', 'hab'));
    await settled('ada');
    await st(() => { window.__game.getState().assign('c2', 'hab'); window.__game.getState().assign('c3', 'hab'); });
    await settled('c2'); await settled('c3');
    await sleep(800);
    await shot('three-in-hab');
  });
  await step('idle wandering for 10 seconds (Hydroponics switched off)', async () => {
    await st(() => { const G = window.__game; const s = G.getState().game; G.setState({ game: { ...s, modules: s.modules.map((m) => (m.id === 'm-hydro' ? { ...m, on: false } : m)) } }); G.getState().assign('ada', 'm-hydro'); });
    await settled('ada');
    await sleep(10000);
  });
  await mark('end');
  await page.evaluate(() => { window.__trk.on = false; });
  const frames = await page.evaluate(() => window.__trk.frames);
  const speed = await page.evaluate(() => window.__engine.walkSpeed(window.__game.getState().game.difficulty));
  await browser.close();

  fs.writeFileSync(`frames-${which}.json`, JSON.stringify(frames));
  const { analyse } = require('./analyse.cjs');
  const { worst, jumps, runs, short, long, spread } = analyse(frames);
  const out = {
    size: which, frames: frames.length, seconds: ((frames[frames.length - 1].t - frames[0].t) / 1000).toFixed(1),
    expectedSpeed: speed, worstJump: worst, perScenarioMaxJump: jumps,
    shortWalk: short, longWalk: long, speedDifference: `${(spread * 100).toFixed(1)}%`,
    allWalks: runs.map((r) => `${r.id} ${r.len}px @ ${r.speed.toFixed(1)} px/s (${r.scene})`),
    steps: log, errors,
  };
  fs.writeFileSync(`proof-${which}.json`, JSON.stringify(out, null, 2));
  console.log(JSON.stringify({ ...out, allWalks: undefined }, null, 2));
  const pass = worst.d <= 10 && spread <= 0.15 && !errors.filter((e) => !e.includes('403')).length;
  console.log(pass ? 'PASS' : 'FAIL');
  process.exit(pass ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
