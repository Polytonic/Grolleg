# Grolleg

A multi-tool ceramics application for studio potters. The first tool is a
shrinkage calculator that converts between wet and fired clay dimensions,
breaks shrinkage into greenware/bisque/firing stages, and shows volumetric
shrinkage for cylindrical and rectangular forms.

## Develop

```
bun install
bun run start    # dev server on http://localhost:1234
bun run build    # production build to dist/
bun run clean    # remove .parcel-cache and dist
```

## Layout

```
source/
  index.{html,ts,css}              entry, mount, tokens + reset
  views/
    shrinkage-calculator/
      shrinkage-calculator.ts      orchestrator view
      state.ts                     types, constants, state, handlers, derived
      clay-selection.ts            ClayBodyField, ShrinkageField
      shrinkage-stages.ts          StageInputs, StagesCard, TimelineStage
      controls.ts                  ClayControls, shape/direction/unit/dim inputs
      results.ts                   ResultsCard, ResultItem
  components/
    tooltip.ts                     reusable primitive

styles/
  views/
    shrinkage-calculator.css       view styles, scoped under .shrinkage-calculator
  components/
    tooltip.css                    tooltip styles, scoped under .tooltip
  css.d.ts
```

TypeScript lives in `source/`, CSS lives in `styles/`, both as peers at the
repo root. The `@css` alias in package.json maps imports like
`@css/views/shrinkage-calculator.css` to the styles directory. Each tool
lives in `source/views/` as a directory of Mithril components with a shared
`state.ts` for the model layer. Reusable primitives live in
`source/components/`. When tool #2 lands, `index.ts` will switch from
`m.mount` to `m.route`; see `notes.md` for the plan.
