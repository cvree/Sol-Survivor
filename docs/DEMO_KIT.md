# Sol Survivor: demo kit (checked 16 Nov 2026)

Everything here was checked by playing the current code (commit `2e4a30d`, the same game code the live site runs) in a browser at 1366x768, and by reading the GitHub Actions deploy logs. The live site itself could not be opened from the checking machine (its network blocks `github.io`), so do one quick run-through on https://cvree.github.io/Sol-Survivor/ before presenting.

## 1. Five features to show, with exact clicks

Use a **fresh private/incognito window**. Training only plays the first time.

1. **M.A.R.V.'s spotlight training**
   **Play** → **Be Ada** → **Next**, **Next**, **Next** → **Start the mission** → **Step outside** → **Got it** → **Got it** → tap the yellow arrow the hand points at → tap the **?** sparkle.
   *Risk:* the world is random. If M.A.R.V. says "No sparkles here", tap the arrow he points at again.
2. **Exploring and a real discovery**
   Wait about 20 seconds while Ada walks out. A **Discovery!** card shows a real Curiosity find → **Awesome!**
3. **Earn a cargo lander, choose a spot, and build it by hand**
   The lander lands → tap **Hab** and **Oxygen Maker** → **Unpack: Hab + Oxygen Maker** → tap the glowing **Hab?** spot (marked "Good spot") → pick **Hab** → **drag Ada** from the capsule onto the building site. (You can also tap Ada and then tap the site, or press **Send Ada**.) The building rises in about 40 seconds.
4. **Crew care**
   Tap Ada **twice**. The crew card shows **Chat**, **High five**, **Pep talk**, Health, Energy and Mood bars, **Health check**, and **Hab (sleep)**.
5. **Space weather school and the storm warning**
   Press **Double speed** (the ▷▷ button). On Easy, the first solar storm warning comes at about sol 6, roughly 1 to 2 minutes after training. The clock stops → **Next** through 6 cards → quiz "Which one gets to Mars first?" → **B. The flash from a flare** → green button → the warning card (labelled **Practice storm**) → **I am ready** → the fuse burns across the top toward the base.

Extra: **NASA Log** (bottom bar), or **Science Log** on the title screen, shows the sources.

## 2. Does `docs/SUBMISSION.md` still match the game?

Mostly yes for gameplay, but these parts are wrong or out of date:

| Item | Status |
|---|---|
| "Art: all art is hand-coded flat SVG shapes; no AI image generation" | **Wrong credit.** Claude generated all the art, written as SVG code. |
| "Music made by Connor with Google Gemini" | Change to "generated with Google Gemini". |
| Facts "typed by hand" | Unclear about who did the work. Say "entered manually (not downloaded), drafted with Claude from NASA pages, checked with web search". |
| Honesty note: "API key was rejected; osdr.nasa.gov blocked" | **Out of date.** OSDR was downloaded again on 16 Nov 06:05 UTC. The DONKI download now fails with **HTTP 404** (GitHub Actions run 15). |
| 30-second demo script | The clicks match the game: the unpack button now reads "Unpack: Hab + Oxygen Maker", and you choose a spot from a "What goes here?" menu. **The timing does not.** The walk to the discovery takes about 20 seconds, and the Hab takes about 40 more. Speed up the video in editing and say so. |
| Missing features (added after it was written) | Space weather school (lessons and a quiz), choosing where to build, the Esc settings menu, practice words and the Word Log, tapping scenery for facts, the trip tracker, slower days. |
| DONKI "Live" row | Unverified. The same `api.nasa.gov/DONKI/FLR` path returned 404 in CI. Check the title screen on the live site before claiming a live request works. |

## 3. NASA data status

**Downloaded records (made by `scripts/fetch-nasa-data.mjs`):**
- 10 NASA OSDR studies, in `src/data/osdr-studies.json`, fetched 2026-11-16 06:05 UTC. This is the only downloaded NASA data in the game.

**NASA facts entered manually (typed into the code, not downloaded):**
- Curiosity RAD dose of 0.67 mSv per sol, and the NASA-STD-3001 career limit of 600 mSv (`constants.ts`).
- 3 dust storm records: Opportunity 2018, Spirit and Opportunity 2007, InSight 2022 (`records.ts`). The game's dust storms replay these records.
- 12 Curiosity discoveries, the space weather school cards, the scenery facts, the "Real science" lines on building plans, and the word facts.

**Invented practice values:**
- Every solar flare and solar storm (CME). They use placeholder records (`no-snapshot-flare` and `no-snapshot-cme`) with made-up strengths, labelled "Practice storm" on screen.
- Storm timing, all balance numbers, energy, mood and sleep, the scaled-up storm radiation, where things sit in the crater, and the crew.

**Live request:**
- The title screen and NASA Log ask `api.nasa.gov/DONKI/FLR` for the last 30 days of flares, using `DEMO_KEY`. `VITE_NASA_API_KEY` is not set in the build. The result was **not verified**. CI got a 404 from the same path on 16 Nov.

**Was the DONKI archive downloaded and included in the deployed game? No.**
- `src/data/donki-events.json` is not in the repository.
- The live site comes from deploy run 14 (commit `2e4a30d`), which had no DONKI download step.
- Run 15 (commit `af200e5`, which added `npm run fetch-nasa -- donki`) **failed**: `HTTP 404 for https://api.nasa.gov/DONKI/FLR?startDate=2017-09-04...`. Nothing was deployed from that run.
- Because that step stops the build when it fails, **every future push to `main` will fail to deploy** until the step is made optional or fixed. One possible fix is NASA's direct DONKI endpoint (`https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get/FLR`), which was not tested.

## 4. Screenshots (`docs/demo-screenshots/`)

All six come from real play on the current code. No game state was edited. They were captured locally with scripted clicks at 1366x768 (2x resolution). Double speed was on from sol 3, and the game was paused for the crew card.

| File | Slide | How to reach it |
|---|---|---|
| `01-marv-training-drag-to-build.png` | 2 | Training step 7 of 8 (feature 3, just after picking Hab) |
| `02-discovery-card.png` | 3 | Feature 2 |
| `03-crew-card.png` | 4 | Tap Ada twice, during the first solar storm (about sol 8) |
| `04-space-weather-school-quiz.png` | 5 | Feature 5, the quiz card |
| `05-storm-warning-practice-storm.png` | 5 | Feature 5, the warning card. Shows "Practice storm: NASA record not downloaded yet". |
| `06-nasa-science-log-sources.png` | 6 | Title screen → **Science Log** → scroll to "Storms: NASA DONKI" |

Notes:
- In 06, "Live check: could not reach NASA" appears because the checking machine has no NASA access. It is not proof either way about the live site.
- 06 also shows a line that contradicts itself (see section 6).
- Extras: `extra-cargo-lander-crew-choice.png` and `extra-storm-fuse.png`.

## 5. Slide text

**1. Sol Survivor**
A Mars survival trainer for ages 7 to 12
Team: [TEAM NAME]: Connor, [OTHER MEMBERS]
NASA Space Apps 2026 · Build a Junior Astronaut Mission Trainer

**2. M.A.R.V.'s hands-on training**
- M.A.R.V. the robot points at one thing at a time
- The screen dims. You do the step to go on.
- 8 first steps: capsule, air, explore, place, build
- New lessons appear when needed: first night, a tired astronaut, the first storm
- The clock stops while you learn

**3. Exploration and building**
- Tap a ? sparkle. Your astronaut walks out to explore.
- 12 real Curiosity finds go into an album
- Explore to earn cargo landers, then choose 2 building plans
- Pick a spot, then drag an astronaut there to build

**4. Crew care and survival decisions**
- Air runs out. Power is never enough, so choose what to switch on.
- Astronauts get tired, need sleep and have moods
- Tap an astronaut: Chat, High five, Pep talk, Health check
- Astronauts can be lost. The game says what would have helped, then "Try again".

**5. Storm preparation**
- First storm: the clock stops for a short lesson and one quiz
- A warning card says what to do next
- A fuse burns toward the base
- Switch on the Shield Dome in time. It only covers nearby rooms.
- Solar storms are labelled "practice storms" for now

**6. NASA science and sources**
- Downloaded: 10 NASA OSDR space biology studies behind the health and food rules
- Entered by hand from NASA sources: Curiosity RAD dose (0.67 mSv a sol), NASA's 600 mSv career limit, 3 real Mars dust storms, 12 Curiosity finds
- Simplified for play: time, storm strength, crew bodies
- The DONKI storm archive is not in this version yet
- Not affiliated with or endorsed by NASA

**7. What's next, links and credits**
- Planned (not built yet): add real DONKI solar storms, play-test with children, a daily "Today's Sun" mission
- Play: https://cvree.github.io/Sol-Survivor/
- Code: https://github.com/cvree/Sol-Survivor
- AI credits: code and all game art (drawn as SVG code) generated with Claude (Anthropic), directed and reviewed by Connor. Music generated with Google Gemini.

## 6. AI labels, credits and rule risks

**Missing or wrong AI labels:**
- **In the game:** there is no credits text anywhere (title screen, settings, Help). Neither Claude nor Gemini is mentioned.
- **Music files:** the five MP3s have only encoder tags (`Lavf60.16.100` / `LAME3.100`). There is no title, artist or AI comment. Add an ID3 comment or a `public/music/CREDITS.txt`: "Generated with Google Gemini".
- **`SUBMISSION.md`:** the art line is wrong (see section 2).
- **`README.md`:** "Team" credits Claude for code but says nothing about the art.
- **`DESIGN_PLAN.md`:** says the music was "made by Connor with Gemini".

**Wrong text in the game:**
- `src/components/Panels.tsx:397` says "Every flare and solar storm in this game is a real one from DONKI." That is false while storms are practice storms, and it appears right above the "not downloaded" notice.

**NASA branding:**
- No NASA logo or insignia was found in the art or the favicon.
- The word "NASA" is used to name sources ("NASA Log", "NASA record").
- There is no "not affiliated with NASA" disclaimer anywhere. Adding one line is cheap.
- The exact Space Apps rule text was not checked.

**Under-18 likenesses:**
- None found. The crew are invented cartoon adult astronauts. There are no photos or voice recordings of people.
- Keep children's faces and voices out of any demo video.
