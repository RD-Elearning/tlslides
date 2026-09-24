# Current state — the block catalog as actually built

**This is what exists today, verified by reading the real registry, not a plan.**
[03-block-catalog.md](03-block-catalog.md) and [04-block-anatomy.md](04-block-anatomy.md) are the
**original 170-block, 8-family target plan** written before implementation started — do not treat
either as a description of what's shipped. Notable gaps between plan and reality:

- Plan targets 170 blocks across 8 families (`l t d g m c x v`); **40 blocks across 7 families are
  actually built** (`v`/"live" doesn't exist yet).
- Plan's file root is `packages/blocks/src/<family>/<name>/`; the **actual root is
  `packages/tldraw/src/blocks/library/<family>/<name>/`** — the separate `packages/blocks` package
  was never split out.
- Plan's file anatomy includes a `<name>.parity.spec.ts` and `__snapshots__/` per block; in
  practice most blocks have one `.spec.ts` covering everything, no separate parity file.
- Many block names in the plan don't exist (`tls.l.thirds`, `tls.l.band`, `tls.l.frame`,
  `tls.l.masonry`, ...); many shipped blocks aren't in the plan (`tls.l.safe-area`,
  `tls.l.grid-guide`, `tls.l.sidebar`, `tls.l.footer`, ...) — the catalog evolved independently of
  the original doc, which was never updated to track it.

Verified by running a script against the real `BUILT_IN_BLOCKS` export
(`packages/tldraw/src/blocks/library/index.ts`), 2026-09-24 — not by reading directory listings.

---

## Naming and structure

`tls.<family-prefix>.<name>`, lowercase, kebab-case name. A block that isn't spread into
`BUILT_IN_BLOCKS` **does not exist** as far as the editor/AI is concerned — a folder with code in
it is not enough (see "Wiring" below).

**File anatomy**, one folder per block:

```
packages/tldraw/src/blocks/library/<family>/tls-<f>-<name>/
├── index.ts                     # BlockDefinition — the only export; registers type/family/
│                                 #   tier/schema/size/describe/layout/motion
├── schema.ts                    # BlockSchema (for AI/form field discovery) + defaults +
│                                 #   the TS Props interface
├── layout.ts                    # Tier A: pure layout(props, ctx) → LayoutNode. No document/
│                                 #   window/Date.now()/Math.random(), never throws.
│                                 # Tier B: template.ts + <Name>.tsx + poster.ts instead
├── motion.ts                    # MotionRecipe — named parts + default choreography
└── tls-<f>-<name>.spec.ts       # schema validation + layout geometry + capacity tests
```

**Wiring** (a block "exists" only once every step below is done):

```
tls-t-takeaway/index.ts
        │ imported by
        ▼
text/index.ts  →  exports `textBlocks: BlockDefinition[]`
        │ spread into
        ▼
library/index.ts  →  BUILT_IN_BLOCKS: BlockDefinition[]  (all 7 families spread here)
        │ consumed by
        ▼
registerBuiltInBlocks(registry)  →  registry.get('tls.t.takeaway') now resolves
```

`packages/tldraw/src/blocks/library/catalog-conformance.spec.ts` is the gate: for every block in
`BUILT_IN_BLOCKS` it asserts `registry.get(type)` resolves, `describe.example` passes
`validateDeckSpec`, `size.min <= size.preferred`, Tier B implies a poster, `capabilityDigest()`
doesn't throw, plus a hardcoded count assertion (currently `40`) and that every `type` used by
every deck JSON fixture resolves in the registry.

**Tier A vs Tier B:**
- **Tier A** (36 of 40) — pure `layout()` function returning a `LayoutNode` tree. Both the DOM and
  SVG renderers consume the same tree, so parity is enforced by a test, not by eye.
- **Tier B** (4 of 40 — `tls.c.hero`, `tls.c.feature-grid`, `tls.c.testimonial`, `tls.c.big-stat`,
  all in the composite family) — an HTML template rendered as real DOM, with a generated poster
  for SVG/export. Used when a pure `layout()` can't express the needed CSS (flex-wrap, CSS grid).

---

## The catalog — 40 blocks, 7 families

| Family | Prefix | Count | Blocks |
|---|---|---|---|
| **layout** | `l` | 14 | `stack` `row` `grid` `split` `overlay` `card` `section` `repeater` `spacer` `field` `safe-area` `grid-guide` `sidebar` `footer` |
| **text** | `t` | 9 | `title` `subtitle` `kicker` `body` `bullets` `caption` `hero-number` `quote` `takeaway` |
| **data** | `d` | 2 | `bar` `donut` |
| **diagram** | `g` | 1 | `steps` |
| **composite** | `c` | 10 | `hero`(B) `kpi-tile` `kpi-row` `image-text` `comparison` `agenda` `steps` `feature-grid`(B) `testimonial`(B) `big-stat`(B) |
| **media** | `m` | 3 | `image` `icon` `icon-label` |
| **chrome** | `x` | 1 | `page-number` |

All layout, text, data, diagram, media, and chrome blocks are Tier A. In composite, `hero`,
`feature-grid`, `testimonial`, and `big-stat` are Tier B (HTML); the other 6 are Tier A.

**Housekeeping note:** `packages/tldraw/src/blocks/library/layout/` contains one empty stray
directory literally named `{tls-l-stack,tls-l-row,tls-l-grid,tls-l-split,tls-l-overlay,tls-l-card,
tls-l-section,tls-l-repeater,tls-l-spacer,tls-l-field,tls-l-safe-area,tls-l-grid-guide,
tls-l-sidebar,tls-l-footer}` — a leftover from a shell brace-expansion that failed to expand
(dated 2026-09-16). It is empty, unregistered, and harmless; safe to `rmdir` whenever convenient.

---

## Before writing a new block

1. Pick the right family (table above) and prefix.
2. Read an existing block in the same family as your template — e.g. for a new text block, read
   `library/text/tls-t-takeaway/` end to end (all 5 files).
3. Write the 5 files. Tier A unless you genuinely need HTML-only CSS.
4. Add it to its family's `index.ts` array export, confirm that family is already spread into
   `library/index.ts`'s `BUILT_IN_BLOCKS`.
5. Bump `catalog-conformance.spec.ts`'s hardcoded count assertion.
6. Run `packages/tldraw`'s targeted specs for your new block + `catalog-conformance.spec.ts`; run
   `tsc` production check; run the full suite once before committing (not per-edit — see
   [BACKLOG-visual-fix-2.md](BACKLOG-visual-fix-2.md)'s Working rules for the OOM guard).
7. Add it to a demo deck fixture if it should be visually exercised, and screenshot-verify it
   (`tools/visual/shoot.js`) — never trust that a block "looks right" without opening the PNG.

**Never invent a color role, a family prefix, a `LayoutNode.k` kind, or any other vocabulary** —
grep for it in `types.ts` first. This exact mistake (inventing `"accent1"`/`"accent3"`/`"accent4"`
as if they were real `ColorRole`s) shipped a demo slide with 3 of 4 chart segments rendering
solid black — see [BACKLOG-visual-fix-2-archive.md](BACKLOG-visual-fix-2-archive.md) §10.3.

### Composite in 20 lines

Skip step 3 (write `layout.ts` by hand) when the new block is purely an **arrangement of blocks
that already exist** — a card with an icon, a number and a caption. `defineCompositeBlock()`
(`blocks/layout/define-composite.ts`) turns a pure `build(props) → BlockSpec` function into a full
`BlockDefinition`: it generates `layout()` via `ctx.layoutChild` and `intrinsicSize()` via
`ctx.measureIntrinsicSize`, so there is no box arithmetic to write. `tls.c.stat-card`
(`library/composite/tls-c-stat-card/`) is the reference example — a `tls.l.card` → `tls.l.stack` →
[`tls.m.icon`, `tls.t.hero-number`] tree, ~20 lines of `build()`. Full recipe and rules (purity,
depth budget, `tier` is author-declared not inferred, motion animates as one unit in v1) in
[guides/blocks-authoring.md](../../guides/blocks-authoring.md) §2.8 and
[block-authoring/B5-define-composite-block.md](block-authoring/B5-define-composite-block.md).

Use a hand-written `layout()` instead when the block needs new geometry (a chart, custom shape,
non-standard text measurement); use Tier B (`kind: 'html'`) when the design genuinely needs CSS
the layout primitives can't produce.
