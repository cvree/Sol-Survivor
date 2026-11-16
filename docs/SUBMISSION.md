# Sol Survivor: Space Apps 2026 submission text

Paste-ready text for the NASA Space Apps form. Live game: https://cvree.github.io/Sol-Survivor/
Code: https://github.com/cvree/Sol-Survivor

## One-sentence pitch

Sol Survivor is a Mars survival game for 7 to 12 year olds where you land alone in Gale Crater, earn every building by exploring, carry your astronauts to their jobs by hand, and learn real Mars science by keeping your crew alive through solar storms.

## Summary (150 words)

Sol Survivor turns a junior astronaut's first Mars mission into a game a child can't put down. You land alone in Gale Crater with only a capsule whose air is running out. A friendly robot, M.A.R.V., dims the screen and points at one thing at a time, so even a seven-year-old learns by doing: explore a sparkle, unpack a cargo lander, mark a building site, and drag your astronaut there to build it. Crew walk to their jobs, get tired, need sleep and can be lost, so every choice matters. When the Sun flares, a fuse burns across the sky and the player must power the Shield Dome in time. The rules are grounded in NASA data: Curiosity's radiation measurements, ten Open Science Data Repository studies on space biology, real dust storms that struck Opportunity and InSight, and twelve real discoveries from Gale Crater, each explained in kid-sized words.

(149 words.)

## How it answers "Build a Junior Astronaut Mission Trainer"

- **It trains, not tells.** The first two minutes are a hands-on lesson. Each step dims the scene, spotlights one target, and only lets the player do that one thing; nothing ends on a timer and nothing can be skipped the first time. After that, new lessons appear the first time a situation comes up (a tired astronaut, the first night, the first Shield Dome).
- **It trains real mission skills for a child's age:** managing scarce power, keeping life support up, scheduling work and sleep, sending the right specialist to the right job, preparing for a space-weather warning, and making do (spare-part patches) when things break.
- **The consequences are real but kind.** Astronauts can die; the game says gently what would have saved them, and "Try again" restarts in under a second with a practice goal for what went wrong.
- **The science is collectable.** Discoveries go into an album that keeps between missions, and the NASA Log explains the real data behind whatever is happening on screen.
- **It works where children are:** in a browser, on a school laptop (1366x768), a tablet or a phone, with mouse, trackpad or touch, and it respects reduced-motion settings.

## NASA data and resources used

| Resource | Link | How it is used |
|---|---|---|
| DONKI (Space Weather Database Of Notifications, Knowledge, Information) | https://kauai.ccmc.gsfc.nasa.gov/DONKI/ and https://api.nasa.gov/ | Live: the title screen asks DONKI for the last 30 days of solar flares and scales storm strength. Archive: meant to supply real dated flares and CMEs as the in-game storms (see "Honesty notes"). |
| NASA Open Science Data Repository (OSDR) | https://osdr.nasa.gov/ | Ten studies saved in `src/data/osdr-studies.json`: OSD-198, OSD-195 (bed rest and low oxygen, PlanHab), OSD-720, OSD-360 (space radiation), OSD-569 (Inspiration4 blood), OSD-268 (Veggie lettuce on the ISS), OSD-581 (ryegrass in Mars regolith simulant), OSD-134 (plants in low pressure), OSD-417 (bone loss and gut microbes in flown mice), OSD-343 (mitochondrial stress). They sit behind the health, food and long-stay rules and are shown to players. |
| Curiosity RAD (Radiation Assessment Detector) | https://www.science.org/doi/10.1126/science.1244797 | 0.67 mSv per sol everyday dose at Gale Crater. |
| NASA-STD-3001 (crew health standard) | https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf | 600 mSv career radiation limit. |
| Opportunity and the 2018 global dust storm | https://science.nasa.gov/mission/mer-opportunity/ | A dust storm record: tau 10.8, power fell from 645 to 22 watt-hours a day, last contact 10 June 2018. |
| Spirit and Opportunity, July 2007 dust storms | https://www.jpl.nasa.gov/news/nasa-mars-rovers-braving-severe-dust-storms | A dust storm record: Opportunity's power fell from about 700 to 128 watt-hours a day. |
| InSight, January 2022 dust storm | https://science.nasa.gov/mission/insight/ | A dust storm record: InSight entered safe mode on 7 January 2022. |
| Curiosity mission discoveries | https://science.nasa.gov/mission/msl-curiosity/ | Twelve finds in the crater, including the 2024 elemental sulfur crystals, iron meteorites, Bagnold Dunes, ChemCam's laser, organic molecules (2018) and Mount Sharp. |

## How AI was used

- **Code:** most of the game's code was written by Claude (Anthropic) working as a coding assistant over several sessions, under the direction of Connor, who set the design, the age group, the health model and every decision about what the game should feel like, and who reviewed the results by playing. The submission-night session (spotlight training, carrying and walking astronauts, the new sound effects, phone layout, these documents) was also done by Claude.
- **Music:** the five music tracks were made by Connor with Google Gemini.
- **Facts:** the science facts were typed by hand from NASA pages and checked against NASA and news sources with web search on 16 November 2026 (see below). No AI-generated numbers are presented as NASA data.
- **Art:** all art is hand-coded flat SVG shapes; no AI image generation.

## Honesty notes (please read)

- **The DONKI archive download failed.** The NASA API key on the build machine was rejected, and on submission night `api.nasa.gov` and `osdr.nasa.gov` were blocked from the build environment. So `src/data/donki-events.json` does not exist, and every solar storm in the game is labelled **"practice storm"** on screen. The live 30-day flare count on the title screen is requested from the player's own browser and may or may not reach NASA.
- **Facts checked on 16 November 2026:** Gale Crater's namesake (Walter F. Gale), the 2024 sulfur crystals (cracked open on 30 May 2024), RAD's 0.67 mSv/day, the radio delay (about 3 to 22 minutes each way; two lines in the game said 4 to 24 and 48 minutes and were corrected), Opportunity 2018 (tau 10.8, 645 to 22 Wh), Opportunity 2007 (128 Wh low; an unconfirmed "tau above 5" was removed and replaced with the confirmed "about 700 Wh before the storm"). The other discovery and Mars facts match well-known NASA statements but were not each re-checked line by line tonight; the Daily Sol Check word hints are general knowledge.
- **No child has play-tested it yet,** so difficulty numbers are first guesses.
- **The sound effects were checked by measurement, not by ear:** every effect was rendered offline and measured (nothing clips; the loudest peak is about -5 dBFS), but no person has listened to them on speakers yet.

## 30-second demo script (what to click, in order)

Record in a **fresh private/incognito window** so the training plays (it is skipped for people who have finished it once). Laptop screen, sound on.

| Time | Do this | What the viewer sees |
|---|---|---|
| 0-4 s | Press **Play**, pick **Ada**, press **Next** three times, then **Start the mission**. | Title music, the commander cards, a four-card briefing. |
| 4-7 s | Press **Step outside**, then **Got it**, **Got it**. | The capsule lands; M.A.R.V. dims the screen and points at the capsule, then at the air bar. |
| 7-12 s | Tap the **arrow**, then the **?** sparkle the hand points at. | The camera slides across the crater; Ada walks out to the discovery. |
| 12-17 s | Click the discovery card. When the cargo lander lands, pick **Hab** and **Oxygen Maker** and press **Unpack the lander**. | A real Curiosity discovery card, a lander descending with its shadow growing. |
| 17-20 s | Tap the glowing **green spot**, choose **Hab**. | A building site appears; the ghost hand shows how to drag Ada onto it. |
| 20-27 s | **Drag Ada** onto the site slowly, wiggle her once, let go. | She dangles and kicks, says "Where to, boss?", the site lights up "Build", dust puffs, and she walks over and builds. |
| 27-30 s | Wait. | The Hab finishes with a "Built!" stamp and a fanfare. End on the base. |
