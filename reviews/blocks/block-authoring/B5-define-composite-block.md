# B5 — `defineCompositeBlock()`: new blocks from existing ones, no layout math · M · DX

Depends on: **B2** (containers accept/stack children), **B4** (`toggles`/`isShown`).

## Problem

Composition works (`tls-c-kpi-row` → `layoutChild('tls.c.kpi-tile')`), but every composite is a
hand-written `layout()` with box arithmetic. "A card with an icon, a title and a number" should be
a 20-line file: a schema and a function returning a spec tree of existing blocks.

## Design

New file `blocks/define-composite.ts`:

```ts
export interface CompositeBlockConfig<P> {
  type: string; name: string; summary: string; keywords: string[]
  family?: BlockFamily            // default 'composite'
  schema: BlockSchema; defaults: P
  size: BlockDefinition['size']
  describe?: BlockDefinition['describe']
  motion?: MotionRecipe
  /** Pure: props → one BlockSpec tree built from registered blocks. No geometry. */
  build(props: P): BlockSpec
}
export function defineCompositeBlock<P>(cfg: CompositeBlockConfig<P>): BlockDefinition<P>
```

- Generated `layout(props, ctx)` = `ctx.layoutChild(cfg.build(props), { x: 0, y: 0, ...ctx.box })`,
  then re-tag the returned root group `part: 'root'`.
- Generated `intrinsicSize(props, ctx)` = `ctx.measureIntrinsicSize?.(cfg.build(props))` so the
  composite participates in `sizing: 'content'` and V2.1 reflow.
- `tier: 'A'` if every block type in the built tree is Tier A, else `'B'` — compute from the tree
  at registration time using `describe.example`/`defaults`, or simply require the author to pass
  `tier` (simpler; choose and document).
- Parts: child parts are nested under wrapper groups; document that motion `parts` target the
  **child ids** the author gives in `build()` (e.g. `id: 'value'` → part). Check how
  `motion/timeline.ts` resolves parts through `layoutChild` wrapper groups before deciding; if ids
  don't surface as parts, have the generated layout set `part = spec.id` on each wrapper group
  (walk the tree once).
- Toggles: `build()` simply omits a child when `!isShown(props, 'showX')` — reflow is automatic
  because the stack/row container lays out what's there.
- Depth: a composite adds 1–2 levels; `MAX_DEPTH = 4`. Document it; conformance must catch a
  composite whose example hits the depth-overflow node (grep how depth overflow is reported in
  `layout-child.ts` and assert it's absent).

## Deliverables

1. `define-composite.ts` + spec (build → layout equals manual `layoutChild` of the same tree;
   intrinsicSize; toggle omits part).
2. **One real new block built with it**, proving the path end to end — suggestion
   `tls.c.stat-card`: `tls.l.card` → `tls.l.stack` → [`tls.m.icon` (toggle), `tls.t.hero-number`,
   `tls.t.caption` (toggle)]. Register it in `composite/index.ts`, bump the conformance count
   (40 → 41), add it to a demo slide (both copies byte-identical), screenshot and open the PNG.
3. Docs: add a "Composite in 20 lines" section to `../CURRENT-STATE.md` "Before writing a new
   block" and to `guides/blocks-authoring.md`, with the stat-card as the example. State when to
   use `defineCompositeBlock` (arrangement of existing blocks) vs a hand-written `layout()`
   (new drawing primitives, charts, custom geometry) vs Tier B (CSS-only layouts).

## Done when

- [ ] Helper + spec merged; stat-card built with it, registered, conformance 41, screenshot checked.
- [ ] Docs updated with the recipe.
- [ ] tsc 0; targeted + one full suite green; ledger row filled.
