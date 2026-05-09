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
  index.{html,ts,css}              app entry, bootstrap, tokens, shell
  manifest.json                    web app manifest
  service-worker.ts                offline cache worker
  theme.ts                         theme preference helpers
  components/
    connected-pill.ts              joined two-part toggle primitive
    flip.ts                        FLIP animation helper
    icons.ts                       inline icon helpers
    input-with-suffix.ts           labeled numeric input primitive
    interaction.ts                 shared interaction helpers
    locale.ts                      locale-aware number helpers
    navigation.ts                  app navigation shell
    preferences-popover.ts         theme preference popover
    toggle-pill.ts                 two-state pill primitive
    tooltip.ts                     tooltip primitive
    unit-toggle.ts                 text unit toggle
  views/
    exceptions/
      not-found.ts                 unknown route recovery view
    firing-calculator/
      comparison.ts                object comparison data
      controls.ts                  studio-level controls
      derived.ts                   derived view data
      firing-calculator.ts         orchestrator view
      pieces.ts                    per-piece controls
      pricing.ts                   quantity, rate, and price math
      silhouettes.ts               object silhouettes
      state.ts                     state and handlers
      total.ts                     multi-piece total band
      types.ts                     shared firing calculator types
    landing/
      landing.ts                   suite landing page
    shrinkage-calculator/
      clay-selection.ts            ClayBodyField, ShrinkageField
      controls.ts                  ClayControls, shape/direction/unit/dimension inputs
      derived.ts                   derived view data
      math.ts                      shrinkage and volume math
      results.ts                   ResultsCard, ResultItem
      shrinkage-calculator.ts      orchestrator view
      shrinkage-stages.ts          StageInputs, StagesCard, TimelineStage
      state.ts                     state and handlers

styles/
  controls.css                     shared controls
  typography.css                   shared text styles
  css.d.ts                         CSS module declaration
  components/
    connected-pill.css             joined toggle styles
    navigation.css                 navigation styles
    preferences-popover.css        theme popover styles
    tooltip.css                    tooltip styles
  views/
    exceptions/
      not-found.css                unknown route recovery styles
    firing-calculator.css          view styles, scoped under .firing-calculator
    shrinkage-calculator.css       view styles, scoped under .shrinkage-calculator
```

TypeScript lives in `source/`, CSS lives in `styles/`, both as peers at the
repo root. The `@css` alias in package.json maps imports like
`@css/views/shrinkage-calculator.css` to the styles directory. Each tool
lives in `source/views/` as a directory of Mithril components with a shared
`state.ts` for the model layer. Reusable primitives live in
`source/components/`. Routes are wired in `source/index.ts` via `m.route`;
see `docs/notes.md` for project-wide design notes and `docs/<tool-name>/`
for per-tool reference material.
