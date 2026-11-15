# Sol Survivor

Browser game for ages 7 to 12 (NASA Space Apps 2026). Read `docs/DESIGN_PLAN.md`
before changing anything; it holds the current state, the feature plan and the look-and-feel rules.

- Run `npm test` and `npm run build` before every commit.
- Game rules live in `src/engine/` and stay free of React. Balance numbers go in `src/engine/constants.ts`.
- Flat shapes, 4 px dark outlines, Fredoka and Space Mono, spring motion, click-only input.
- Plain language for a seven-year-old. One instruction at a time.
- Never invent NASA numbers. Real records come from `scripts/fetch-nasa-data.mjs`; anything typed by hand is labelled as such.
- `main` deploys to GitHub Pages automatically.
