// Shared helpers: open the game at a given size with a ready-made base.
const { chromium, devices } = require('playwright');
const URL = process.env.URL || 'http://localhost:5173/';
async function open(size, opts = {}) {
  const browser = await chromium.launch();
  const ctx = size === 'phone'
    ? await browser.newContext({ ...devices['iPhone 13 landscape'] ?? {}, viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: opts.dsf ?? 1 })
    : await browser.newContext({ viewport: size, deviceScaleFactor: opts.dsf ?? 1 });
  await ctx.addInitScript(() => {
    localStorage.setItem('sol-survivor:trained', '1');
    localStorage.setItem('sol-survivor:lessons', JSON.stringify(['start','place','builder','switch','tired','night','grumpy','crew2','dig','upgrade','zone','rover']));
    localStorage.setItem('sol-survivor:weather-learned', JSON.stringify(['flare','cme','dust']));
    localStorage.setItem('sol-survivor:settings', JSON.stringify({ master: 0 }));
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(URL);
  await page.waitForFunction(() => window.__game && window.__engine);
  return { browser, ctx, page, errors };
}
/** Start a mission and give it a full base: Hab, two domes, three dug-in rooms, yard gear, three crew. */
async function richBase(page) {
  await page.evaluate(() => {
    const G = window.__game, E = window.__engine;
    G.getState().start();
    let s = G.getState().game;
    const mods = [
      ['hab', 2], ['hydro', 1], ['dome', 3], ['oxygen', 7], ['lab', 8], ['medbay', 6], ['solar', 101], ['battery', 102],
    ];
    s = structuredClone(s);
    for (const [kind, cell] of mods) {
      s.modules.push({ id: kind === 'hab' ? 'hab' : 'm-' + kind, kind, cell, on: true, buildLeft: 0, onSince: 0, patchedUntil: 0, level: 1, upgrading: false, buildTotal: 1, bin: 0 });
    }
    s.cargoProgress = 0; s.life = 100; s.time = 1.1;
    const base = s.crew[0];
    const mk = (id, name, at) => ({ ...structuredClone(base), id, name, commander: false, at, walkFrom: at, suit: '#4fd8ff' });
    s.crew.push(mk('c2', 'Bo', 'm-lab'), mk('c3', 'Cy', 'm-hydro'));
    s.crew[0].at = 'hab'; s.crew[0].walkFrom = 'hab';
    for (const c of s.crew) { c.energy = 100; c.mood = 90; }
    s.events = s.events.map((e) => ({ ...e, warnAt: e.warnAt + 100, startAt: e.startAt + 100, endAt: e.endAt + 100 }));
    G.setState({ game: s, tour: null, coach: null, panel: null, moment: null });
  });
  await page.waitForTimeout(800);
}
module.exports = { open, richBase };
