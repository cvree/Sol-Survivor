# Prompt for the next session (submission night)

Open a new session on `cvree/Sol-Survivor` and paste everything below the line.

---

Sol Survivor is due for NASA Space Apps 2026 submission TONIGHT. It is a browser game for ages 7 to 12 where you land on Mars alone, earn cargo landers, build a base by hand and keep your crew alive. Read `CLAUDE.md`, then `docs/DESIGN_PLAN.md` (what exists, by build pass), then skim `docs/ROADMAP.md`. Run the game (`npm run dev`) and play the first three minutes yourself in the browser before changing anything, so you see what a new player sees.

There are three jobs, in this order. Quality matters more than quantity: a judge will play for about two minutes, so those two minutes must be clear and must not break. If time runs short, finish job 1 properly and cut from job 2, never the other way round.

**Job 1: guide the player so they cannot get lost.**
Right now a first-time player is confused about what to do and where to look. The training lives in `src/components/coach.ts` and is shown as text in M.A.R.V.'s bubble in the bottom bar, far from the thing it talks about. Fix that:
- Remove every way to skip. That means the "Skip" button on the briefing (`Briefing.tsx`) and "Skip this lesson" in the bottom bar. The first-run training must be completed. (Keep "Try again" after a loss fast: a returning player who has finished training once should not have to redo it. Remember completion in `localStorage`.)
- Point at the thing on the screen. Each lesson step should dim the rest of the scene and spotlight its target, with a big bouncing arrow or hand on it and the instruction in a bubble right next to it, not only in the bottom bar. For drag steps, show a ghost hand that plays the drag from the astronaut to the target on a loop until the player does it.
- Block everything except the target during a paused lesson step, so a wrong click cannot derail the lesson.
- One instruction at a time, in words a seven-year-old can read. Every step must be finished by doing the thing, never by waiting for a timer; several current steps end on a timer (`ms > 8500` and similar), and those should become "do it" steps or a single "Got it" button.
- After training, there must always be one obvious next thing to do on screen. Check that the mission card and M.A.R.V. never contradict each other.

**Job 2: make moving astronauts feel great.**
Dragging is in `src/lib/crewDrag.ts`, the carried astronaut in `CrewGhost.tsx`, crater trips in `World.tsx`, and the rules in `src/engine/engine.ts` (`assign`, `sendOut`, `arriving`). Today an astronaut dropped on a module simply appears there. I want it to feel physical and alive:
- When picked up, the astronaut should dangle and wiggle from the pointer, legs kicking, and say something short in their own voice.
- Every place they can go should light up clearly with a label of what they would do there ("Sleep", "Build", "Make air", "Dig bricks"); places they cannot go should dim.
- When dropped, they should visibly walk from where they were to the new place (along the surface, down the ladder shaft for underground rooms), then start working. No teleporting. The engine already delays work by `arriving`; make the picture match it.
- A drop should land with a bounce, a puff of dust and a sound. A bad drop should bounce them back home with a head shake.
- Tapping an astronaut and then tapping a place should work as well as dragging, for small hands and trackpads.
- It must work with touch as well as a mouse.

**Job 3: wrap up for submission.**
- Make sure `npm test` and `npm run build` pass and the game plays start to finish with no console errors: a full win, a loss, and "Try again".
- Check it at 1366x768 (a school laptop) and on a phone-sized screen; fix anything that overlaps or falls off screen.
- Rewrite `README.md` for a judge: what it is, the live link (https://cvree.github.io/Sol-Survivor/), how to play in five lines, what NASA data it uses (DONKI space weather, the Open Science Data Repository studies in `src/data/osdr-studies.json`, Curiosity's RAD dose), what is simplified, and how to run it.
- Write `docs/SUBMISSION.md` with text I can paste into the Space Apps form: a one-sentence pitch, a 150-word summary, how it answers the "Build a Junior Astronaut Mission Trainer" challenge, the NASA data and resources used with links, and a plain statement of how AI was used to build it. Add a 30-second demo script (what to click, in order) I can record.
- Then merge to `main` and push so the live site updates, and confirm the deploy finished.

**Things you must know.**
- Honesty rules from `CLAUDE.md` are not optional: never invent a NASA number, and label anything typed by hand. Many facts in `src/data/discoveries.ts`, `src/data/facts.ts` and `src/lib/daily.ts` were typed from memory and never checked. If you have web access, verify the ones a judge will see first (the discoveries and the briefing) and fix or remove any you cannot confirm. If you cannot verify, say so in `SUBMISSION.md` rather than hiding it.
- The NASA DONKI download has never worked here (the API key was rejected, and `api.nasa.gov` was blocked from the build environment), so storms are labelled "practice storms". Try `npm run fetch-nasa` once. If it still fails, leave the honest "practice storm" label and say so in the submission text.
- Nobody has ever listened to the sound (`src/lib/sound.ts`); it was written blind. Do not add more sound. If anything is likely to be harsh, turn it down.
- No child has played the game, so balance is untested. Do not retune numbers tonight unless something is plainly broken.
- When editing files with a script, never rewrite a file from an unset variable; two files were wiped that way in the last session and had to be restored from git. Prefer the Edit tool.
- Look-and-feel rules are in section 6 of `DESIGN_PLAN.md`: flat shapes, 4 px dark outlines, Fredoka and Space Mono, spring motion, respect reduced motion.
- There is a test hook in dev builds (`window.__game`, `__engine`, `__bots` in `src/main.tsx`) that lets you fast-forward a game from Playwright to reach any state for screenshots.

Work on a new branch, show me screenshots of the new guided intro and a short clip or frame sequence of an astronaut being dragged and walking, then merge to `main` when the checks pass. Tell me plainly at the end what you finished, what you cut, and anything a judge might trip over.
