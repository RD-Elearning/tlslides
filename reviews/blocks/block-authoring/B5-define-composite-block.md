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
- `tier`: **the author passes it** (required field). A conformance assertion walks
  `build(describe.example.props)` and fails if any node type in it is Tier B while the composite
  says `'A'`.
- **Motion (decided): v1 animates the composite as one unit.** `layoutChild` wrapper groups
  carry **no** `part`, so child ids don't surface as parts, and adding `part: spec.id` inside
  `layoutChild` would change `data-part` output for every existing container (motion regressions
  across both demo decks). So: `motion` = `{ preset, parts: ['root'] }`-style recipe on the
  composite only; per-child choreography is out of scope (write it in the ledger as a follow-up).
- Toggles: `build()` simply omits a child when `!isShown(props, 'showX')` — reflow is automatic
  because the stack/row container lays out what's there.
- Depth: a composite adds 1–2 levels; `MAX_DEPTH = 4`. Document it; conformance must catch a
  composite whose example hits the depth-overflow node (grep how depth overflow is reported in
  `layout-child.ts` and assert it's absent).

## ⚠️ Hard parts — decisions already made

**H1. `build()` must be pure and deterministic** — same props → deep-equal tree, fixed child ids
(`'icon'`, `'value'`…), no `Math.random`/`Date.now` (the layout purity rule; `measureIntrinsicSize`
caches by `hashValue(props)`).
**H2. Depth budget.** A composite placed in a region sits at depth 0; `card`(1) →
`stack`(2) → leaf(3). Placed inside a user's `row` it's one deeper. Rule for authors (put it in
the docs): **at most two container levels inside `build()`**. Conformance: lay out the example
at `depth: 1` and assert no depth-overflow node.
**H3. Theme colours.** Don't put colours in `build()` output except role names (`'accent'`), so
the composite follows the slide theme; the instance `style` of the composite reaches its root
only — children resolve roles against the resampled surface automatically (`layoutChild`).
**H4. `intrinsicSize` signature** is `(props, ctx) => Size` and is only called through
`measureIntrinsicSize`; `ctx.measureIntrinsicSize` exists on every ctx since G8.5 — no registry
access needed.
**H5. Registration:** a composite is an ordinary `BlockDefinition`; it goes into
`composite/index.ts` → `BUILT_IN_BLOCKS` like any block, and needs `describe` (conformance
requires `describe.example` to validate).

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

- [x] Helper + spec merged; stat-card built with it, registered, conformance 41, screenshot checked.
- [x] Docs updated with the recipe.
- [x] tsc 0; targeted + one full suite green; ledger row filled.
- [x] Added to a demo deck fixture (both copies byte-identical), screenshot verified, PNG deleted.

## Demo integration + docs (2026-09-24, completing the 2 deferred deliverables)

1. **Demo slide.** `sl_11` in `colorful-blocks-demo.json` (both copies) changed from `layout:
   'blank'` (single `content` region) to `layout: 'two-column'` (`title`/`left`/`right`), with the
   existing `tls.c.big-stat`-in-a-card on the left and the new `tls.c.stat-card` on the right.
   First attempt stacked title + big-stat card + stat-card in one `blank` region — that overflowed
   the 1080px slide frame (verified by screenshot, not assumed); switched to `two-column` (same
   pattern as `sl_02`) to fix it. Screenshot confirms: coral card, `zap` icon, `$4.2M` in accent
   colour, "Annual Revenue" / "FY2024 total", padding all correct. PNG viewed then deleted per
   instructions — not committed.
2. **Docs.** Added "Composite in 20 lines" to `reviews/blocks/CURRENT-STATE.md` (under "Before
   writing a new block") and §2.8 to `guides/blocks-authoring.md`, both using `tls.c.stat-card` as
   the worked example, with a table of when to use `defineCompositeBlock` vs. hand-written
   `layout()` vs. Tier B.
3. **Bug found while integrating (not part of the original B5 commit):** `composite/index.ts`
   failed to type-check — `BlockDefinition<StatCardProps>` (the type `defineCompositeBlock`
   declared its return as) isn't assignable to the untyped `BlockDefinition[]` array every other
   block registers into, because of `Component`'s contravariant parameter. Every other block in
   the codebase sidesteps this by declaring itself as the untyped `BlockDefinition` and casting
   just `layout`/`intrinsicSize` (`as BlockDefinition['layout']`); `defineCompositeBlock` was
   declared to return the typed `BlockDefinition<P>` instead. Fixed by changing its return type to
   the untyped `BlockDefinition`, matching every other block's pattern. This was a real (non-spec)
   `tsc` error the "tsc: 0" ledger claim missed — see the sibling note in B3's file for the other
   two (B2, B3) found in the same pass. Confirmed production `tsc` = 0 after the fix, full build
   (`yarn build` in `packages/tldraw`) succeeds, and targeted specs (`define-composite`,
   `tls-c-stat-card`, `catalog-conformance`) still green.
