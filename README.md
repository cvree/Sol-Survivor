# Sol Survivor

A browser game for ages 7 to 12, built for the 2026 NASA Space Apps Challenge
**Build a Junior Astronaut Mission Trainer**.

You command a Mars outpost at Gale Crater and must keep four astronauts alive for
30 sols. There is never enough power for everything, so every choice costs something.

**Play:** https://cvree.github.io/Sol-Survivor/ (live once the `main` branch is deployed)

## How it plays

1. **Land and build.** The game opens on bare Mars with a lander and two astronauts.
   M.A.R.V., the base robot, says one thing: "Build a Dome, Commander!" One click
   and the Hab thumps into place, the crew walk in, and the base is online.
2. **A living cutaway.** Glass domes sit on the surface, rooms are dug in below,
   and solar fields, batteries and the comms dish stand in the yard. Astronauts
   wander inside their modules. Lights go dark and a red lamp blinks when a module
   loses power.
3. **Cargo landers grow the base.** Every few sols a lander brings a new specialist
   (Engineer, Botanist, Medic, Scientist) and four blueprints, of which you may
   unpack two. A working Science Lab makes landers arrive sooner.
4. **Staff the modules.** Click an astronaut to see vitals and send them to work.
   An empty module works at half strength; the right specialist gives a boost.
5. **Growth has a cost.** Every astronaut uses air and food, long-stay crew need
   more of both, and one Shield Dome only covers four people. Power never covers
   everything, so raising the domes means switching life support off.
6. **Emergencies are real records.** Solar flares and solar storms come from NASA
   DONKI, dust storms from NASA rover and lander reports. Every warning stops the
   clock and shows the real record.
7. **NASA Science Log** shows the real data behind whatever is happening on the
   base right now. The **mission debrief** explains how the base's growth led to the result.

Three difficulty levels: Easy, Normal and Hard.

## NASA data used

| Source | What it gives the game | How it is loaded |
|---|---|---|
| [DONKI](https://kauai.ccmc.gsfc.nasa.gov/DONKI/) | Real solar flares (class) and coronal mass ejections (speed, Mars arrival) that become in-game storms | Saved snapshot in `src/data/donki-events.json`, plus a live 30-day flare count on the title screen |
| [OSDR](https://osdr.nasa.gov/) | Ten study records behind the crew-health, long-stay wear and food rules | Saved snapshot in `src/data/osdr-studies.json` |
| Curiosity RAD | 0.67 mSv per sol background dose at Gale Crater | Constant in `src/engine/constants.ts` |
| NASA-STD-3001 | 600 mSv career radiation limit | Constant in `src/engine/constants.ts` |
| NASA/JPL mission reports | Three dust storm records (Opportunity 2018 and 2007, InSight 2022) | Typed in by hand in `src/data/records.ts` |

Refresh the snapshots with:

```bash
NASA_API_KEY=your_key npm run fetch-nasa
```

**Status:** the OSDR snapshot is in the repo. The DONKI snapshot has not been
downloaded yet, so until `npm run fetch-nasa` is run with a key the game labels its
solar storms as practice storms.

### What is real and what is simplified

The game says this to players too, in the NASA data panel.

- Time is squeezed: one sol passes in 8 seconds, and the hypoxia timeline that
  takes minutes in real life is stretched over sols.
- Storm radiation doses are scaled up so one storm matters in a 30-sol game.
- The Shield Dome is simplified, long-stay wear rates are game numbers, and real
  cargo trips take about seven months, not five sols.
- The three dust storm records were entered by hand and should be checked against
  the linked NASA pages before judging.

## Run it

```bash
npm install
npm run dev      # play locally
npm test         # balance and rules tests
npm run build    # production build in dist/
```

## How the code is laid out

```
src/engine/      Pure game rules, no React. constants.ts holds every balance number.
src/engine/bots.ts + engine.test.ts
                 Simulated players that prove there is no "safe" strategy:
                 doing nothing always loses, and even the largest base cannot power
                 every module at once.
src/data/        NASA snapshots, glossary, Mars facts.
src/components/  The screens: HUD, outpost, crew vitals, alerts, data panel, debrief.
src/store/       Game state and the real-time clock.
scripts/         fetch-nasa-data.mjs downloads the DONKI and OSDR snapshots.
```

## Team

Connor: health science, EMT, design direction, crew vitals model.
