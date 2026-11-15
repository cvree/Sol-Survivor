# Sol Survivor: design plan

Handoff for a fresh session. Read this first, then `README.md`, then look at the
images in `docs/drafts/`.

- **Game:** browser game for ages 7 to 12, NASA Space Apps 2026, challenge
  "Build a Junior Astronaut Mission Trainer".
- **Live:** https://cvree.github.io/Sol-Survivor/ (deploys from `main` on every push)
- **Owner:** Connor (health science, EMT, design direction)

## 1. Where the game is today

Images: `docs/drafts/current-1-intro.png`, `current-2-base.png`, `current-3-storm-warning.png`.

Working and tested (13 engine tests):

- Side-view cutaway base: glass domes on the surface, dug-in rooms below, gear in the yard.
- Play-first intro: lander, one BUILD button, the Hab thumps in, crew walk in.
- Three resources: Power, Life support, Shield. Power never covers everything.
- Cargo landers bring a new specialist and a pick of 2 blueprints from 4.
- Crew assignment with specialist boosts; vitals card (blood oxygen, heart rate,
  body temperature, radiation dose) from Connor's EMT model; long-stay wear.
- Real-record emergencies (solar storm, solar flare, dust storm) that stop the clock.
- NASA Science Log, mission log, debrief, Easy / Normal / Hard.
- M.A.R.V. the robot gives one piece of advice at a time.

Known gaps:

| Gap | Detail |
|---|---|
| DONKI data missing | The NASA key saved on the cloud environment is rejected as invalid, so `src/data/donki-events.json` does not exist and storms are labelled "practice storms". Fix the key, then run `npm run fetch-nasa`. |
| Dust storm numbers unverified | Three records in `src/data/records.ts` were typed from memory. Check against NASA pages. |
| Too easy for a good player | The simulated careful player wins 40 of 40 on every level. Not yet tested with real children. |
| Nothing to come back for | No progress survives a mission. No goals inside a mission beyond "survive". |
| Quiet moments are flat | Between storms and landers, nothing rewards the player for a well-run base. |
| Sound is thin | Synth beeps only. No music, no rising pitch, no storm rumble bed. |
| Crew are decoration | They pace, but do not act out their jobs or react to each other. |

## 2. North star

> A child should be unable to look away from their base, and should finish every
> mission knowing one true thing about living on Mars that they did not know before.

Three pillars, in priority order:

1. **The base is alive.** Every module and astronaut shows what is happening without text.
2. **Every choice answers back.** Within a quarter of a second, with motion and sound.
3. **The science is real and collectable.** Real NASA records are the prizes, not footnotes.

## 3. What SpellBomb does that we should copy

Read from the `cvree/spellbomb` source, not guessed.

| SpellBomb | Why it works | Sol Survivor version |
|---|---|---|
| One tense object everyone watches: the bomb and its burning fuse | Attention has a single home; tension is visible, not a number | The **storm countdown** becomes a physical thing in the sky: a growing flare on the Sun and a fuse-style bar that crawls, sparks and speeds up |
| Beats and moments have different lengths (pass pause 700 ms, boom pause 2,600 ms) | Quick actions stay quick; big events are held long enough to feel | Switch flips and assignments resolve in under 250 ms. "Storm survived" and "lander arrived" hold the screen for about 2.5 s |
| Sound in three pitches (`coin_lo`, `coin`, `coin_hi`; `fuse_tick_lo/hi`) | Repeats sound like progress instead of noise | Each consecutive good action plays a higher note; the storm tick climbs as it nears |
| Music per state (menu, lobby, game, tension, finals, victory) | The room's mood changes before you read anything | Calm base loop, tension layer during warnings, storm bed, victory sting |
| Chests, coin fly, combo pop-ups | Rewards travel across the screen to where they are counted | "+4 air" pops fly from a module up to its bar; XP stars fly to the level badge |
| Avatars, bomb skins, cosmetics, trophy case | Players come back to show what they own | Storm Card album, dome paint, M.A.R.V. hats, crew helmet stickers |
| Daily word, streak | A reason to open it tomorrow | "Today's Sun": one daily mission from live DONKI data |
| Emotes and reaction bubbles | Characters feel present | Crew bubbles and little actions (coffee, rock, wave, high five) |
| Living background, reduced-motion support | Motion everywhere, but never forced on anyone | Keep `prefers-reduced-motion` working for every new effect |

One warning from SpellBomb's own critique file: months went into the shop while the
core game stayed thin. **Rule for this project: the core loop gets juice first.
Collection comes second. No shop, no currency.**

## 4. The loops

Image: `docs/drafts/draft-d-loops.png`.

| Loop | Length | What the player does | What they get |
|---|---|---|---|
| Flip and fix | 10 s | Switch a module, move an astronaut | Lights, number pops, a face changes, a rising note |
| Beat a storm | 1 min | See the warning, re-route power, hold on | Held celebration, stars, that storm's card |
| Grow the base | 3 to 5 min | Unpack a lander, choose blueprints, build | A bigger, busier base and a new character |
| Level up | per mission (about 5 min) | Read the debrief | XP, a new level, cosmetics, a tip to try next |
| Today's Sun | daily | Play one mission seeded by yesterday's real solar activity | A dated result to share and a daily card |

A note on "addictive": the audience is 7 to 12. The plan aims for a game children
want to replay and return to. It deliberately leaves out timers that punish
absence, streaks that can be "lost", random paid rewards and anything that
interrupts play to sell something. A missed day costs nothing.

## 5. Feature plan

### P0: make every second feel good (do first)

1. **Number pops.** Working modules emit "+4 air", "+3 food", "+1 science" that
   float up and fly to the matching bar. Unstaffed modules emit a smaller grey pop.
2. **The storm as a fuse.** Replace the alert pill with a sky event: the Sun swells
   and pulses, a fuse bar crawls across the top of the scene with sparks, the tick
   sound climbs. When it lands, 300 ms of slow motion, then the hit.
3. **Sound pass.** Three-pitch variants for on/off, assign and reward. A looping
   base ambience, a tension layer and a storm bed (still synthesised, no files).
   A combo counter raises pitch for each good action inside 3 seconds.
4. **Crew that act.** Per-module idle actions (typing in the lab, watering in
   Hydroponics, wrench in the Oxygen Maker, sleeping in the Hab), a wave when two
   crew share a room, a celebration jump after a storm, arms crossed when cold.
5. **Mini-missions.** One small goal always on screen (image: draft A, top left):
   "Get a Botanist into Hydroponics", "Keep Life support above 50 for 3 sols",
   "Block 80% of the next storm". Completing one gives a burst and the next appears.
6. **Held moments.** "Storm survived" becomes a full-screen 2.5 s card with stars
   (image: draft B). "Lander arriving" gets a descent with a shadow growing on the ground.
7. **Fail softly, retry fast.** After a loss, one button restarts in under 2 seconds
   with the tip applied as the first mini-mission.

Done when: a first-time player on Easy touches something at least every 10 seconds
without being told to, and can say what the Shield Dome is for after one mission.

### P1: reasons to return

8. **Storm Cards.** Every DONKI and dust record is a collectible card with its real
   date, class or speed, and one true sentence. Surviving the event unlocks it.
   An album screen shows owned and missing cards. Stored in `localStorage`.
9. **Commander level.** XP from stars, mini-missions and cards. Levels unlock
   cosmetics only: dome paint, M.A.R.V. hats, crew helmet stickers.
10. **Today's Sun.** Daily mission seeded by the date, with storm strength set from
    the last 30 days of live DONKI flares. One scored attempt per day, a result line
    to copy ("Sol Survivor, 14 Nov: 3 stars, 6 crew, blocked 91%").
11. **Named bases.** Let the child name the base and each arriving astronaut.

Blocked by: the DONKI snapshot (item 8 and 10 need real records).

### P2: depth

12. **Module upgrades** (tier 2 Oxygen Maker, bigger Hydroponics) as later lander offers.
13. **The challenge author's dilemma:** during dust storms, choose to retract Solar
    Fields (no power now) or leave them out (risk damage after).
14. **Rover trips:** send one astronaut out for science, with radiation risk if a storm hits.
15. **Classroom mode:** a seed code so a whole class plays the same mission.

### Balance work (alongside P0)

- Watch three children play before changing numbers.
- Target for the simulated careful player: wins about 95% on Easy, 75% on Normal, 45% on Hard.
- All balance numbers live in `src/engine/constants.ts`; the simulated players are in `src/engine/bots.ts`.

## 6. Look and feel rules

- **Shapes:** flat fills, 4 px outline in `#1d1033`, hard drop shadow `0 5px 0`, radii 18 to 28 px. No gradients, no blur, no raster art.
- **Palette:** void `#2b1a4a`, dusk `#46306f`, rust `#c2512a`, dust red `#8f2f2a`, sand `#f2a65a`, clean `#f7f4ec`, go `#5ee6a0`, cyan `#4fd8ff`, volt `#ffd23f`, danger `#ff2e4d`. Tokens are in `src/styles/index.css` under `@theme`.
- **Type:** Fredoka for everything friendly; Space Mono only for data, numbers and NASA records.
- **Motion:** spring in (stiffness about 300, damping 13 to 20), press down on tap, overshoot on arrival. Every state change animates. Respect reduced motion.
- **Words:** one instruction at a time from M.A.R.V. Sentences a seven-year-old can read. Science words get a tooltip from `src/data/glossary.ts`.
- **Input:** click only. No drag and drop.
- **Honesty:** anything simplified is listed in the Science Log under "What we changed to make it a game". Never present saved data as live.

## 7. Goal drafts

| File | Shows |
|---|---|
| `docs/drafts/draft-a-hub.png` | Target hub: mini-mission card, number pops, crew chatter, level bar, Cards button |
| `docs/drafts/draft-b-reward.png` | "Storm survived" moment with a Storm Card and cosmetic rewards |
| `docs/drafts/draft-c-onboarding.png` | The first 30 seconds as four panels, then one lesson at a time |
| `docs/drafts/draft-d-loops.png` | The four loops plus the daily return |

These are layout and feature drafts drawn in code (`docs/drafts/concept.html`),
with emoji standing in for final art. The flare on the example Storm Card
(X8.2, 10 Sep 2017) is from memory and must be replaced with the real DONKI record.

## 8. Code map

```
src/engine/       Pure rules, no React. step(), toggleModule(), build(), assign(), acceptCargo().
  constants.ts    Every balance number.
  bots.ts         Simulated players used by the tests.
src/data/         NASA snapshots (osdr-studies.json; donki-events.json is missing), records, glossary, facts.
src/store/game.ts Zustand store: clock, panels, intro step, sounds.
src/components/   Diorama (scene), moduleArt (dome and room drawings), art (astronaut, M.A.R.V., lander),
                  Header, BottomBar (M.A.R.V., dock, vitals card), Panels (cargo, build, event, logs), Debrief, TitleScreen.
src/lib/          sound.ts (synth effects), liveSun.ts (live DONKI flare count).
scripts/          fetch-nasa-data.mjs (run with NASA_API_KEY).
docs/drafts/      Goal drafts and current screenshots.
```

Commands: `npm run dev`, `npm test`, `npm run build`, `npm run fetch-nasa`.

## 9. First steps for the next session

1. Fix the NASA key, run `npm run fetch-nasa`, confirm real storm records show in the event card.
2. Build P0 items 1 to 3 (number pops, storm fuse, sound pass) and play it.
3. Build P0 items 4 to 7.
4. Have Connor and at least one child play; adjust balance.
5. Start P1 with Storm Cards.

Suggested opening message for the new chat:

> Read docs/DESIGN_PLAN.md and look at the images in docs/drafts. Build P0 items
> 1 to 3, show me screenshots, then keep going through P0.

## 10. Decisions Connor still needs to make

- Should the 60-second "pack the lander" phase come back as an optional start?
- Is one evacuated astronaut still the end of the mission, or should the base limp on?
- Are cosmetics worth the build time before the hackathon deadline, or should Storm Cards be the only collectible?
- What is the submission deadline? P1 and P2 should be cut to fit it.
