// Random play: clicks, taps and drags all over the game for several minutes.
// Fails on any page error, an empty #root, or the .oops card. Also watches for jumps.
// Usage: node fuzz.cjs [big|mid|phone] [seconds] [seed]
const { open } = require('./setup.cjs');
const SIZES = { big: { width: 1600, height: 880 }, mid: { width: 1280, height: 720 }, phone: 'phone' };
const which = process.argv[2] || 'big';
const SECONDS = Number(process.argv[3] || 180);
let seed = Number(process.argv[4] || 7);
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const { browser, ctx, page, errors } = await open(SIZES[which]);
  const touch = which === 'phone';
  const cdp = touch ? await ctx.newCDPSession(page) : null;
  await page.evaluate(() => { localStorage.removeItem('sol-survivor:trained'); localStorage.removeItem('sol-survivor:lessons'); });
  await page.evaluate(() => { window.__game.getState().start(); });
  await sleep(500);
  // Jump watcher across the whole run (world pixels, every frame).
  await page.evaluate(() => {
    window.__worst = { d: 0 };
    let last = {};
    const loop = () => {
      const world = document.querySelector('.scene .world');
      if (world) {
        const wr = world.getBoundingClientRect(); const k = wr.width / world.offsetWidth;
        const now = {};
        for (const el of document.querySelectorAll('.crew-layer .body[data-crew]')) {
          const r = el.getBoundingClientRect();
          const p = [(r.left - wr.left) / k, (r.top - wr.top) / k, el.className];
          now[el.dataset.crew] = p;
          const q = last[el.dataset.crew];
          if (q && Math.abs(world.offsetWidth - (last.__w ?? world.offsetWidth)) < 1) {
            const d = Math.hypot(p[0] - q[0], p[1] - q[1]);
            if (d > window.__worst.d) window.__worst = { d, id: el.dataset.crew, cls: p[2], from: q.slice(0, 2), to: p.slice(0, 2) };
          }
        }
        now.__w = world.offsetWidth;
        last = now;
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
  const t0 = Date.now();
  let actions = 0;
  let problem = null;
  while (Date.now() - t0 < SECONDS * 1000 && !problem) {
    const vp = page.viewportSize();
    const r = rnd();
    // Prefer things that matter: astronauts, places, buttons; sometimes anywhere.
    const target = await page.evaluate((r) => {
      const pick = (sel) => { const all = [...document.querySelectorAll(sel)].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 2 && b.height > 2 && b.right > 0 && b.left < innerWidth && b.bottom > 0 && b.top < innerHeight; }); if (!all.length) return null; const e = all[Math.floor(r * 997) % all.length]; const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; };
      return { crew: pick('.crew-layer .sprite'), place: pick('.mod-hit, .prop-wrap, .pod, .deposit, .find, .drop-zone'), button: pick('button:not([disabled])') };
    }, r);
    const anywhere = { x: rnd() * vp.width, y: rnd() * vp.height };
    const kind = rnd();
    try {
      if (kind < 0.35 && target.crew) {
        // Drag an astronaut somewhere: a place, or anywhere.
        const to = rnd() < 0.6 && target.place ? target.place : anywhere;
        const from = target.crew;
        const steps = 6 + Math.floor(rnd() * 20);
        if (touch) {
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] });
          for (let i = 1; i <= steps; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps }] }); await sleep(10); }
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        } else {
          await page.mouse.move(from.x, from.y); await page.mouse.down();
          for (let i = 1; i <= steps; i++) { await page.mouse.move(from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps); await sleep(10); }
          await page.mouse.up();
        }
      } else if (kind < 0.55 && target.crew) {
        // Tap an astronaut, then a place.
        if (touch) await page.touchscreen.tap(target.crew.x, target.crew.y); else await page.mouse.click(target.crew.x, target.crew.y);
        await sleep(150);
        const p = target.place ?? anywhere;
        if (touch) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y);
      } else if (kind < 0.85 && target.button) {
        if (touch) await page.touchscreen.tap(target.button.x, target.button.y); else await page.mouse.click(target.button.x, target.button.y);
      } else if (kind < 0.93) {
        if (touch) await page.touchscreen.tap(anywhere.x, anywhere.y); else await page.mouse.click(anywhere.x, anywhere.y);
      } else {
        await page.keyboard.press(['Escape', 'ArrowLeft', 'ArrowRight', 'Home', 'p'][Math.floor(rnd() * 5)]);
      }
    } catch (e) { /* an element moved away: fine */ }
    actions++;
    await sleep(80 + rnd() * 400);
    const state = await page.evaluate(() => ({ empty: !document.querySelector('#root')?.children.length, oops: !!document.querySelector('.oops'), screen: window.__game.getState().screen, status: window.__game.getState().game?.status }));
    if (state.empty) problem = 'empty #root';
    if (state.oops) problem = '.oops card';
    // Keep playing: after the debrief or the title, start again.
    if (state.screen !== 'game' || state.status !== 'playing') {
      if (rnd() < 0.3 || state.screen !== 'game') await page.evaluate(() => window.__game.getState().start());
    }
  }
  const worst = await page.evaluate(() => window.__worst);
  const real = errors.filter((e) => !e.includes('403'));
  console.log(JSON.stringify({ size: which, seconds: SECONDS, actions, problem, pageErrors: real, worstJump: worst }, null, 2));
  await browser.close();
  process.exit(problem || real.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
