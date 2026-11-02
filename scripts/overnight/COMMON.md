# Working rules for every overnight task

You are working unattended in the Edward's World repository (Next.js 16, React 19, strict TypeScript, Canvas 2D pixel art). Nobody will answer questions: take the most reasonable reading of the task, note the reading you took in your report, and carry on.

Read first:
- `AGENTS.md` (Next.js in this repo differs from your training data — read the guide it points to before writing Next code).
- `docs/ARCHITECTURE.md` for the component and domain boundaries.
- The files the task names.

Non-negotiable rules of this codebase:
- **Pure simulations own game rules, timers advance scripted states, animation only presents those states.** Keep logic in `lib/game/`, art in `lib/pixel/`, React in `components/`.
- **Everything on the art grid.** No sub-pixel positions, ever. Authored values are whole art pixels (`PIXEL_UNIT = 4` CSS px) and are brought to the live unit with `toCss` / `snapToCss`. Chips, sprites and tracks must land on multiples of `--unit`; `e2e/world-grid.spec.ts` enforces this.
- **Palette.** Draw only with tokens from `lib/pixel/palette.ts`. Add a token only if the task cannot be done without it, keep it as desaturated as the board, and document it in the file.
- **Accents mean interactive.** `signAccent` and `warmGlow` are spent only on the player and enterable/interactive things; `tests/palette-accents.test.ts` checks contrast and usage.
- **Accessibility stays.** Label chips are the objects' accessible names; dialogs keep focus management and Escape; reduced motion is honoured (ambient frame stops advancing).
- **Tests are part of the change.** Extend the Vitest suites under `tests/` for new data, geometry and art contracts, the same way the existing tests do (record the raster calls, assert on them). Do not delete or weaken an existing test to make it pass unless the task explicitly changes that contract — then update the test and say why in the report.

Quality gates the runner will execute after you finish — run them yourself before you stop, and fix what fails:

```
npm run lint
npm run typecheck
npm test
npm run build
npx playwright test     # production server on port 3100; run `npm run build` first
```

Do NOT:
- commit, push, create branches, or touch `.git` — the runner commits.
- edit `app/layout.tsx` font loading, `package.json` dependencies, CI config, or anything under `docs/predeploy/`.
- change `initialPlayer.size` (the 48x64 hitbox), `WORLD_CONFIG.width`, or the four-project contract of the index.
- leave `test-results/` or screenshots outside `docs/review/` in the tree.

When you finish, write a short report (Markdown) at the path given at the end of the task: what you changed (files), the reading you took of anything ambiguous, how you verified it, and what you deliberately left out. Keep it under 40 lines.
