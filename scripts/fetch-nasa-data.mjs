#!/usr/bin/env node
// Pulls real NASA records into src/data/ so the game never depends on a live
// connection during play.
//
// Run:
//   npm run fetch-nasa
//   npm run fetch-nasa -- donki
//   npm run fetch-nasa -- osdr
//
// Set NASA_API_KEY in the environment to use your NASA key.
// If the NASA gateway returns 404, try NASA's current public DONKI service.

import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const OUT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'data'
);

// NASA_API_KEY=none sends no key, for networks that attach one for you.
const KEY =
  process.env.NASA_API_KEY?.trim() === 'none'
    ? ''
    : process.env.NASA_API_KEY?.trim() || 'DEMO_KEY'; // trimmed: a pasted secret often ends in a newline

const only = process.argv[2]; // optional: "donki" or "osdr"

const DONKI_GATEWAY = 'https://api.nasa.gov/DONKI/';
const DONKI_DIRECT = 'https://ccmc.gsfc.nasa.gov/DONKI-API/get/';

// Once the gateway returns 404, use the replacement for remaining requests.
let useDirectDonki = false;

// Stretches of real solar history worth replaying.
const WINDOWS = [
  {
    name: 'September 2017 storms',
    start: '2017-09-04',
    end: '2017-09-11',
  },
  {
    name: 'October 2021 flare',
    start: '2021-10-26',
    end: '2021-10-30',
  },
  {
    name: 'May 2024 superstorm',
    start: '2024-05-08',
    end: '2024-05-21',
  },
  {
    name: 'October 2024 storms',
    start: '2024-10-01',
    end: '2024-10-10',
  },
];

// These teaching summaries are written for the game.
// Study metadata comes from NASA OSDR.
const OSDR_STUDIES = [
  {
    id: 'OSD-198',
    system: 'air',
    teaches: 'In a pretend planetary habitat, 14 volunteers lived with low oxygen for 21 days and scientists found changes inside their muscles. That is why crew get weak when the air runs thin.',
  },
  {
    id: 'OSD-720',
    system: 'radiation',
    teaches: 'In mice, one dose of space-type radiation left changes in the heart that were still there almost two years later. That is why radiation damage in the game never heals.',
  },
  {
    id: 'OSD-360',
    system: 'radiation',
    teaches: 'In mice, even low doses of space radiation changed how the body works. That is why the small dose your crew soak up every sol still counts.',
  },
  {
    id: 'OSD-569',
    system: 'vitals',
    teaches: 'Doctors tracked the blood of the four Inspiration4 astronauts before, during and after flight. Watching vitals is how real mission doctors spot trouble early.',
  },
  {
    id: 'OSD-268',
    system: 'food',
    teaches: 'Astronauts grew and ate red romaine lettuce on the International Space Station. Your greenhouse does the same job.',
  },
  {
    id: 'OSD-581',
    system: 'food',
    teaches: 'Scientists grew ryegrass in pretend Mars dirt to see how plants cope. Your Hydroponics Bay is how the crew gets fresh food.',
  },
  {
    id: 'OSD-417',
    system: 'tenure',
    teaches: 'Mice that flew in space lost bone, and the microbes in their gut changed too. That is why astronauts who have been on Mars longer need more food and care.',
  },
  {
    id: 'OSD-195',
    system: 'tenure',
    teaches: 'After 21 days of bed rest, human muscles changed the way they do in space. Bodies that do less work get weaker, so long-stay crew wear down.',
  },
  {
    id: 'OSD-343',
    system: 'tenure',
    teaches: 'Looking across many spaceflight experiments, scientists found that the tiny power plants inside cells get stressed in space. Long missions wear the body down from the inside.',
  },
  {
    id: 'OSD-134',
    system: 'food',
    teaches: 'Plants get stressed in thin, low-pressure air like the air on Mars. That is why the greenhouse needs power to keep plants happy.',
  },
];

async function getJson(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url);

    if (res.ok) {
      return res.json();
    }

    if (res.status === 429) {
      throw new Error(
        'Rate limited by NASA (HTTP 429). Set NASA_API_KEY or wait an hour.'
      );
    }

    if (i === tries - 1) {
      const safeUrl = KEY ? url.replace(KEY, '***') : url;
      throw new Error(`HTTP ${res.status} for ${safeUrl}`);
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 1500 * (i + 1));
    });
  }
}

async function donki(kind, start, end) {
  const query = new URLSearchParams({
    startDate: start,
    endDate: end,
  });

  if (!useDirectDonki) {
    const gatewayUrl = new URL(kind, DONKI_GATEWAY);
    gatewayUrl.search = query.toString();

    if (KEY) {
      gatewayUrl.searchParams.set('api_key', KEY);
    }

    try {
      return await getJson(gatewayUrl.toString());
    } catch (error) {
      // Only fall back for a missing gateway endpoint.
      // Authentication, rate-limit and other errors stay visible.
      if (
        !(error instanceof Error) ||
        !error.message.startsWith('HTTP 404 ')
      ) {
        throw error;
      }

      useDirectDonki = true;

      console.log(
        '\nNASA gateway returned 404. Trying NASA’s current DONKI service...'
      );
    }
  }

  const directUrl = new URL(kind, DONKI_DIRECT);
  directUrl.search = query.toString();

  // Do not forward the private API key to the public fallback.
  return await getJson(directUrl.toString());
}

/** X9.3 -> 9.3e-4 W/m2. */
function flareFlux(cls) {
  const m = /^([ABCMX])(\d+(\.\d+)?)$/.exec(cls || '');

  if (!m) {
    return 0;
  }

  return (
    Number(m[2]) *
    {
      A: 1e-8,
      B: 1e-7,
      C: 1e-6,
      M: 1e-5,
      X: 1e-4,
    }[m[1]]
  );
}

async function fetchDonki() {
  const flares = [];
  const cmes = [];

  for (const w of WINDOWS) {
    process.stdout.write(`DONKI ${w.name} ... `);

    const flr = await donki('FLR', w.start, w.end);
    const cme = await donki('CME', w.start, w.end);

    if (
      (flr != null && !Array.isArray(flr)) ||
      (cme != null && !Array.isArray(cme))
    ) {
      throw new Error(
        `NASA returned an unexpected response for ${w.name}. Expected event arrays.`
      );
    }

    for (const f of flr ?? []) {
      // Keep M5 and bigger.
      if (flareFlux(f.classType) < 5e-5) {
        continue;
      }

      flares.push({
        id: f.flrID,
        window: w.name,
        classType: f.classType,
        beginTime: f.beginTime,
        peakTime: f.peakTime,
        endTime: f.endTime,
        sourceLocation: f.sourceLocation,
        activeRegion: f.activeRegionNum,
        link: f.link,
      });
    }

    for (const c of cme ?? []) {
      const analyses = c.cmeAnalyses ?? [];
      const a =
        analyses.find((analysis) => analysis.isMostAccurate) ??
        analyses[0];

      if (!a || !a.speed) {
        continue;
      }

      let marsArrival = null;

      for (const run of a.enlilList ?? []) {
        const hit = (run.impactList ?? []).find(
          (impact) => impact.location === 'Mars'
        );

        if (hit) {
          marsArrival = {
            time: hit.arrivalTime,
            glancing: !!hit.isGlancingBlow,
          };
        }
      }

      // Keep fast CMEs and ones modeled to reach Mars.
      if (a.speed < 900 && !marsArrival) {
        continue;
      }

      cmes.push({
        id: c.activityID,
        window: w.name,
        startTime: c.startTime,
        speedKmS: a.speed,
        halfAngleDeg: a.halfAngle,
        type: a.type,
        sourceLocation: c.sourceLocation,
        activeRegion: c.activeRegionNum,
        marsArrival,
        linkedFlare:
          (c.linkedEvents ?? [])
            .map((event) => event.activityID)
            .find((id) => id?.includes('-FLR-')) ?? null,
        link: c.link,
      });
    }

    console.log(
      `ok (${flr?.length ?? 0} flares, ${cme?.length ?? 0} CMEs seen)`
    );
  }

  // Do not publish an empty archive as a successful download.
  if (!flares.length || !cmes.length) {
    throw new Error(
      `NASA archive is incomplete: ${flares.length} qualifying flares and ${cmes.length} qualifying CMEs. Existing archive was not replaced.`
    );
  }

  console.log(
    `Keeping ${flares.length} real flares and ${cmes.length} real CMEs.`
  );

  return {
    source:
      'NASA DONKI (Space Weather Database Of Notifications, Knowledge, Information)',
    sourceUrl: 'https://ccmc.gsfc.nasa.gov/DONKI/',
    api: useDirectDonki ? DONKI_DIRECT : DONKI_GATEWAY,
    fetchedAt: new Date().toISOString(),
    filter:
      'Flares of class M5 or bigger. CMEs faster than 900 km/s, or predicted by the WSA-ENLIL model to reach Mars.',
    windows: WINDOWS,
    flares,
    cmes,
  };
}

const clean = (s) =>
  String(s ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

async function fetchOsdr() {
  const studies = [];

  for (const s of OSDR_STUDIES) {
    process.stdout.write(`OSDR ${s.id} ... `);

    const num = s.id.replace('OSD-', '');

    const j = await getJson(
      `https://osdr.nasa.gov/osdr/data/osd/meta/${num}`
    );

    const st = j.study?.[s.id]?.studies?.[0];

    if (!st) {
      console.log('missing');
      continue;
    }

    const desc = clean(st.description);

    studies.push({
      id: s.id,
      system: s.system,
      teaches: s.teaches,
      title: clean(st.title),
      summary:
        desc.length > 420
          ? desc.slice(0, desc.lastIndexOf(' ', 420)) + ' ...'
          : desc,
      releaseDate: st.publicReleaseDate ?? null,
      factors: (st.factors ?? [])
        .map((factor) => clean(factor.factorName))
        .filter(Boolean),
      publications: (st.publications ?? [])
        .slice(0, 2)
        .map((publication) => ({
          title: clean(publication.title),
          doi: publication.doi || null,
        })),
      link: `https://osdr.nasa.gov/bio/repo/data/studies/${s.id}`,
    });

    console.log('ok');
  }

  return {
    source: 'NASA Open Science Data Repository (OSDR)',
    sourceUrl: 'https://osdr.nasa.gov/',
    fetchedAt: new Date().toISOString(),
    studies,
  };
}

await mkdir(OUT, { recursive: true });

if (only !== 'donki') {
  const osdrData = await fetchOsdr();

  await writeFile(
    path.join(OUT, 'osdr-studies.json'),
    JSON.stringify(osdrData, null, 2) + '\n'
  );
}

if (only !== 'osdr') {
  const donkiData = await fetchDonki();

  await writeFile(
    path.join(OUT, 'donki-events.json'),
    JSON.stringify(donkiData, null, 2) + '\n'
  );
}

console.log('Saved to src/data/');
