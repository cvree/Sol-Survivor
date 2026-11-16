# Sol Survivor

**A Mars survival game for ages 7 to 12.** You land alone in Gale Crater with nothing but a
small capsule. You explore, earn cargo landers, build every module by hand with your own crew,
and keep everyone alive for 30 sols (Mars days) while the Sun throws storms at you.

Built for the 2026 NASA Space Apps Challenge, **Build a Junior Astronaut Mission Trainer**.

**Play it:** https://cvree.github.io/Sol-Survivor/ (runs in any modern browser, laptop, tablet or phone; no install)

## How to play (five lines)

1. M.A.R.V. the robot points at one thing at a time. Do what he points at; the first two minutes teach you everything.
2. Tap a **?** sparkle to send your astronaut out to explore. Discoveries bring the next cargo lander closer.
3. Pick building plans from the lander, tap a green spot to mark a building site, then **drag** an astronaut onto it (or tap them, then tap the site, or press **Send**).
4. Astronauts walk to their jobs, get tired, and need sleep. Drag them to the Oxygen Maker to make air, and to bed when they are sleepy.
5. When a storm fuse burns across the sky, switch on the Shield Dome before it lands. Survive 30 sols to win.

## The NASA data inside it

| Source | What it does in the game | How it gets in |
|---|---|---|
| [NASA DONKI](https://kauai.ccmc.gsfc.nasa.gov/DONKI/) space weather | Real solar flares and coronal mass ejections are meant to become the in-game storms, with their dates. The title screen asks DONKI live for the last 30 days of flares and makes storms stronger or weaker. | Live flare count from `api.nasa.gov` in the player's browser. The saved archive (`src/data/donki-events.json`) **could not be downloaded** for this build (see below), so every storm in the game is honestly labelled **"practice storm"**. |
| [NASA Open Science Data Repository (OSDR)](https://osdr.nasa.gov/) | Ten real space-biology studies (bed rest and low oxygen, space radiation in mice, lettuce grown on the Space Station, ryegrass in Mars soil simulant, Inspiration4 blood tests, bone loss in flown mice) sit behind the crew-health, food and long-stay rules. Each is shown to the player in the NASA Log with a kid-sized sentence and a link. | Saved snapshot in `src/data/osdr-studies.json` (fetched 15 November 2026). |
| Curiosity's RAD instrument | The everyday background radiation at the base, **0.67 mSv per sol**, is the dose RAD measured on the surface of Gale Crater ([Hassler et al., *Science*, 2014](https://www.science.org/doi/10.1126/science.1244797)). | Constant in `src/engine/constants.ts`. |
| NASA-STD-3001 | The 600 mSv career radiation limit that caps an astronaut's health. | Constant in `src/engine/constants.ts`. |
| NASA/JPL mission reports | Three real dust storms: Opportunity 2018, Spirit and Opportunity 2007, InSight 2022. | Typed in by hand in `src/data/records.ts`, checked against news and NASA reports on 16 Nov 2026. |
| Curiosity in Gale Crater | Twelve discoveries in the crater (Bagnold Dunes, iron meteorites, the 2024 sulfur crystals, ChemCam's laser, Mount Sharp...). | Typed in by hand in `src/data/discoveries.ts`, checked on 16 Nov 2026. |

## What is simplified (the game tells players this too, in the NASA Log)

- **Time is squeezed.** One sol passes in 8 seconds. Real cargo flights take about seven months, not a few sols.
- **Storm radiation is scaled up** so one storm matters in a short game. The Shield Dome and the way it covers neighbouring rooms are game rules.
- **Bodies are simplified.** Energy, mood, sleep and long-stay wear use game numbers, inspired by the OSDR studies but not calculated from them.
- **Practice storms.** Because the DONKI archive could not be downloaded, storms use made-up strengths and say so on screen. Running `npm run fetch-nasa` with a NASA API key replaces them with real dated records.
- **Where things sit** in the crater is made up; what they are is real.
- Crew names, personalities and jokes are invented.

## Run it yourself

```bash
npm install
npm run dev        # play locally at http://localhost:5173
npm test           # rules and balance tests (simulated players)
npm run build      # production build in dist/
NASA_API_KEY=your_key npm run fetch-nasa   # refresh the DONKI and OSDR snapshots
```

Pushing to `main` deploys to GitHub Pages automatically (`.github/workflows/deploy.yml`).

## How the code is laid out

```
src/engine/       Pure game rules, no React. constants.ts holds every balance number.
                  bots.ts + engine.test.ts: simulated players that check the balance.
src/data/         NASA snapshots, real records, discoveries, facts, characters.
src/components/   Screens. Guide.tsx is M.A.R.V.'s spotlight training; coach.ts holds the lessons.
                  Walk.tsx draws astronauts walking to their jobs and the glowing drop zones.
src/lib/          crewDrag.ts (drag or tap-then-tap), sound.ts (synth effects + music), camera.ts.
src/store/        Game state and the real-time clock.
public/music/     Five music tracks.
scripts/          fetch-nasa-data.mjs downloads the DONKI and OSDR snapshots.
```

## Team

Connor: health science, EMT, design direction, crew vitals model. Music made with Google Gemini.
Code written with Claude (Anthropic); see `docs/SUBMISSION.md` for how AI was used.
