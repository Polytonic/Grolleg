# Grolleg

A multi-tool ceramics application for studio potters. Current tools include a
shrinkage calculator and a firing cost calculator, with a landing page for the
suite.

## Develop

```
bun install
bun test
bun run typecheck
bun run start    # dev server on http://localhost:1234
bun run build    # production build to dist/
bun run clean    # remove .parcel-cache and dist
```

Local routes:

- `/` — landing page
- `/t/shrinkage` — shrinkage calculator
- `/t/firing` — firing cost calculator

## Layout

```
source/
  index.{html,ts,css}              entry, bootstrap, tokens + reset
  routing.ts                       pure routing helpers
  components/
    navigation.ts                  site navigation
    tooltip.ts                     reusable tooltip primitive
  views/
    landing/
      landing.ts                   suite landing page
    shrinkage-calculator/
      shrinkage-calculator.ts      orchestrator view
      state.ts                     types, constants, state, handlers
      derived.ts                   derived view data
      clay-selection.ts            ClayBodyField, ShrinkageField
      shrinkage-stages.ts          StageInputs, StagesCard, TimelineStage
      controls.ts                  ClayControls, shape/direction/unit/dim inputs
      results.ts                   ResultsCard, ResultItem
    firing-calculator/
      firing-calculator.ts         orchestrator view
      state.ts                     state and handlers
      derived.ts                   derived view data
      pricing.ts                   quantity, rate, and price math
      comparison.ts                object comparison data and silhouettes
      controls.ts                  studio-level controls
      pieces.ts                    per-piece controls
      total.ts                     multi-piece total band
    exceptions/
      not-found.ts                 unknown route recovery view

styles/
  components/
    navigation.css                 navigation styles
    tooltip.css                    tooltip styles
  views/
    shrinkage-calculator.css       view styles, scoped under .shrinkage-calculator
    firing-calculator.css          view styles, scoped under .firing-calculator
    landing.css                    landing page styles
  css.d.ts
```

TypeScript lives in `source/`, CSS lives in `styles/`, both as peers at the
repo root. The `@css` alias in package.json maps imports like
`@css/views/shrinkage-calculator.css` to the styles directory. Each tool
lives in `source/views/` as a directory of Mithril components with a shared
`state.ts` for the model layer. Reusable primitives live in
`source/components/`. Routes are wired in `source/index.ts` via `m.route`;
see `docs/notes.md` for project-wide design notes and `docs/<tool-name>/`
for per-tool reference material.
