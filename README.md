# Sol Survivor

A browser game for ages 7 to 12, built for the 2026 NASA Space Apps Challenge
**Build a Junior Astronaut Mission Trainer**.

You command a Mars outpost at Gale Crater and must keep four astronauts alive for
30 sols. There is never enough power for everything, so every choice costs something.

**Play:** https://cvree.github.io/Sol-Survivor/ (live once the `main` branch is deployed)

## How it plays

- **Three resources:** Power, Life support and Shield.
- **Click a room** to switch it on or off. The Storm Shield needs more power than
  anything else, so raising it means switching life support off.
- **Crew vitals** (blood oxygen, heart rate, body temperature, radiation dose) follow
  an EMT's field notes. A triage colour shows who needs help first, and the Med Bay
  has one bed.
- **Emergencies are real records.** Solar flares and solar storms come from NASA
  DONKI. Dust storms come from NASA rover and lander reports. Each alert has a
  button that shows the real record behind it.
- **Every mission is different.** Storms are picked and ordered at random, and the
  real Sun's last 30 days of flares (fetched live from DONKI) make storms a little
  stronger or weaker.
- **Mission debrief** explains why the mission went the way it did.

## NASA data used

| Source | What it gives the game | How it is loaded |
|---|---|---|
| [DONKI](https://kauai.ccmc.gsfc.nasa.gov/DONKI/) | Real solar flares (class) and coronal mass ejections (speed, Mars arrival) that become in-game storms | Saved snapshot in `src/data/donki-events.json`, plus a live 30-day flare count on the title screen |
| [OSDR](https://osdr.nasa.gov/) | Six study records behind the crew-health rules | Saved snapshot in `src/data/osdr-studies.json` |
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
- The Storm Shield is fictional technology.
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
                 doing nothing always loses, and not every system can be powered at once.
src/data/        NASA snapshots, glossary, Mars facts.
src/components/  The screens: HUD, outpost, crew vitals, alerts, data panel, debrief.
src/store/       Game state and the real-time clock.
scripts/         fetch-nasa-data.mjs downloads the DONKI and OSDR snapshots.
```

## Team

Connor: health science, EMT, design direction, crew vitals model.
