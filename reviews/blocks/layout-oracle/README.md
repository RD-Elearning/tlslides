# Layout Oracle — let the AI *read* a slide's geometry instead of screenshotting it

**Date:** 2026-10-08 · **Branch:** `plan/block-system` · **Owner:** main session, implemented by subagents.

## 0. Problem

The FastAPI/LLM pipeline (see [../LLM-ARCHITECTURE.md](../LLM-ARCHITECTURE.md)) picks blocks and fills
content, but today it cannot know — without a screenshot — whether:

- a block's content (e.g. a 2-line title + 4 bullets) fits the box it was given, and how tall it
  actually is;
- two blocks overlap, or a block runs off the 1920×1080 frame;
- an overlap is a *mistake* (two text blocks colliding) or *intentional* (a decoration/backdrop
  under content, a badge over a card corner).

Screenshots are slow and the LLM is bad at pixel-reading. But this repo has an unusual asset: **every
block's look is a pure, headless `layout(props, ctx) → LayoutNode` tree** (`types.ts:313`) with
real per-glyph text metrics (`tableMetrics`, Inter table generated from the font binary, ~3% drift).
So almost everything the AI needs is *computable* in node in milliseconds. The screenshot step stays,
but only for what the report flags as uncertain.

## 1. Design principle — one oracle, not a formula zoo

Do **not** export hand-written per-block size formulas for Python to re-implement — they would drift
from the TypeScript layout the same week. Instead:

1. **The TS layout engine is the oracle.** A pure function `analyzeSlide(spec) → LayoutReport`
   compiles the slide with the same `compileSlide` the editor uses, re-lays each block at its final
   box, and reads geometry straight off the `LayoutNode` tree.
2. **Static "size cards" are *sampled from* the oracle, not authored.** A generator runs every block
   at reference widths with synthetic content and fits `height ≈ base + perLine·lines (+ perItem·items)`.
   The JSON is a *planning hint* the LLM uses before it calls the oracle; a test fails when it is stale.
3. **Text first, picture second.** The report has a compact text form (one line per block + findings
   + a coarse ASCII map) designed for an LLM prompt, plus full JSON for code. Each block carries a
   `confidence`; `needsVisualCheck` lists the only things worth a screenshot.

Flow:
```
LLM plans (reads size cards in digest) → DeckSpec → analyzeSlide (node, ~ms) → findings text
   → LLM fixes (shorten text / swap block / change layout) → repeat ≤ N → screenshot only flagged slides
```
Where it runs: the functions are exported from `@tlslides/tldraw`; a Next.js API route (or the CLI in
LO4) imports them; FastAPI calls that route / CLI. Next.js wiring itself stays deferred (scope decision
in `reviews/README.md`) — LO4 ships the CLI + exports, which is all FastAPI needs.

## 2. Phases

Each phase: compile (`tsc`), targeted jest, no weakened tests, commit per phase. Working rules:
[../BACKLOG-visual.md](../BACKLOG-visual.md) §2 (commands, ratchets, **OOM guard**) and
[../BACKLOG-visual-fix.md](../BACKLOG-visual-fix.md) §1. Additive schema only.

### LO0 — Natural size from the tree (`measure-block.ts`)
`measureBlock(def, props, width, ctx) → BlockMeasure`:
- `natural: {width, height}` = union bbox of the *painted leaves* (text/image/icon/path/line/rect that
  isn't a full-box backdrop) when laid out at `width` with a minimal height probe — NOT the root box,
  which many blocks return as `max(region, content)` (block-library README fact 6).
- `text[]`: per text leaf — `part`, `propPath`, `lines`, `lineHeight`, `maxLineWidth`, `box`.
- `confidence`: `'high'` (layout kind + tableMetrics), `'medium'` (html kind → poster tree, or
  `estimateMetrics`), `'low'` (host without poster / layout threw).
- Fix the `measuredTotal` reduce in `slide-compiler.ts` (`h > 0 ? sum + h : 0` resets the sum on one
  failed block).

**Done when:** spec covers ≥ 1 block per scope incl. an html-kind block; for a title block, adding a
line of text raises `natural.height` by ≈ one line-height; root-box-inflated blocks report content
height, not region height.

### LO1 — `analyzeSlide` + `formatLayoutReport` (`layout-report.ts`)
Input: `SlideSpec` (+ tokens/registry/metrics provider, default tableMetrics). Output `LayoutReport`:
- per block: `id/path, type, region, layer, box, natural, contentOverflow {dx, dy}`, `text[]`,
  `capacity()` result when defined (first production caller of `capacity`), `confidence`.
- slide: frame-overflow (`slide/overflow`, the unbuilt F5.3), region overflow (from compiler),
  pairwise overlaps (box ∩ box) **and** text-leaf collisions across blocks, each classified by layer
  policy (LO2; until then everything is `content`), bottom/side margins, free-space ratio.
- findings: `{code, severity, blockIds, message, fix}` where `fix` is concrete and numeric
  ("body needs +84 units; cut to ≤ 3 lines (~55 chars/line) or move to region `right`").
- `formatLayoutReport(report)`: compact, deterministic text for an LLM — a header, one line per
  block, findings, and a 48×27 ASCII occupancy map (one char per 40 units; letter per block, `#` for
  conflicts). Budget: ≤ 2.5k chars for a typical 5-block slide.

**Done when:** spec on all fixture decks (`__fixtures__/*.json`) produces reports; a hand-made
overlapping slide yields `layout/overlap` and `text/collision`; a too-long body yields
`text/overflow` with a numeric fix; text snapshot of one report is committed.

### LO1.5 — Compiler flow fixes (`slide-compiler.ts`)
The oracle's first findings were compiler bugs, not content problems:
1. **Column-aware re-flow.** When any region overflowed, pass 2 stacked *all* regions by y, so an
   overfull `left` pushed `right` below it. A region must only be pushed down by regions above it
   that horizontally overlap it.
2. **Fill blocks share a region.** A fill block (chart/image/donut — sizes to its box) stacked
   with siblings took the full region height and pushed them off the frame (demo `sl_08`: steps
   916 past the bottom; colorful `sl_06/20/24/25/27/28`: 4 past). Measure the non-fill blocks'
   natural heights first, then give the fill blocks what is left (≥ `def.size.min`). Pure and
   deterministic (reuse `measureBlock`'s elastic detection).
3. **Never silent.** A region that still overflows after 1+2 keeps today's behaviour (stack and
   push down), and the report flags it.

**Done when:** a unit test per rule (fails on the old compiler); the `collision.spec.ts`
frame-bounds gate (sl_05 only) is widened to every slide it now passes; fixture finding counts
before/after recorded here; demo `sl_05`/`sl_08` screenshotted before/after in the real app.

### LO2 — Layers & intentional overlap
Additive metadata: `BlockDefinition.layer?: 'backdrop' | 'content' | 'overlay'` (default derived:
category `decoration` → `backdrop`, else `content`) and `BlockSpec.layer?` instance override.
Policy in the report:
- content ∩ content → `layout/overlap` (error);
- backdrop ∩ anything → allowed (`info`), but backdrop must be *behind* (z-order) — else error;
- overlay ∩ content → allowed if it covers no text leaf of the content block, else `text/occluded`;
- any text leaf ∩ text leaf of another block → `text/collision` (error) regardless of layer —
  *amended by LO2.1:* `info` when one side is a backdrop painting behind the other.
Also `validateDeckSpec` accepts the new field; JSON schema + digest mention it.

**Done when:** a slide with a decoration block under a card reports no error; the same with a
badge over the card's title reports `text/occluded`.

### LO2.1 — Anchors, backdrop text, title band (follow-ups of LO2 / LO1.5)
1. **Anchor for layered blocks.** Additive `BlockSpec.anchor?: 'fill' | 'top-left' | 'top' |
   'top-right' | 'left' | 'center' | 'right' | 'bottom-left' | 'bottom' | 'bottom-right'` and
   `BlockSpec.anchorTo?: '<id>'` (a *stacked* block of the same region; its painted box becomes the
   anchor box, inset `space.sm`), plus `BlockDefinition.anchor?` as the type default. `'fill'` =
   LO2's whole box; anything else = natural size (`measureBlock`, grown until it paints unshrunk,
   clamped to the anchor box) at that edge/corner. Default: `def.anchor` ?? `'fill'`.
2. **Backdrop text policy.** Text ∩ text where one side is a backdrop painting *behind* →
   `text/collision` `info` (a watermark behind a title is intended); content/overlay text ∩ text
   stays an error; a backdrop painting over text stays an error.
3. **Title band = one title line.** `titleBand()` from `type.title` line height (LO1.5 open item),
   and `regionAlign` (`quote: 'center'`) actually offsets when the content is shorter than the region.

**Done when:** a badge with `anchorTo` sits in the card's corner with 0 errors; the watermark ×
title pair is `info`; fixture `text/shrunk` count drops with no new errors/warnings; validator,
JSON schema, SCHEMA.md and the digest name `anchor`/`anchorTo`; one screenshot each.

### LO3 — Size cards (`block-metrics.ts` + generated `block-metrics.json`)
For every block in `BUILT_IN_BLOCKS`, sampled via `measureBlock` from its `defaults` /
`describe.example`: `size.preferred/min/aspect`, `scope`, `layer`, and per text slot
`{fontSize, lineHeight, charsPerLine@[1728, 840, 544]}`, and a fitted height model
`{base, perLine, perItem?}` per reference width with fit error. Generator script writes the JSON;
a spec fails when the committed JSON is stale. Add a one-token size hint per block to the
capability-digest index without breaking its 20k budget (e.g. `h≈120+48/l @840`).

### LO4 — Headless entry for Next.js / FastAPI
Exports from the package index: `measureBlock, analyzeSlide, formatLayoutReport, buildBlockMetrics`.
A CLI `tools/layout-report/` : `node … deck.json [--slide N] [--format text|json]` → report on stdout.
Document the FastAPI loop in `LLM-ARCHITECTURE.md` (new section) and `guides/blocks-authoring.md`.

### LO5 — Calibration & when to screenshot
Compare report geometry with the real browser on the fixture decks (Playwright, existing
`tools/visual` harness): per block, DOM content height vs `natural.height`, text line counts.
Record error stats here; set `confidence` thresholds from data; `needsVisualCheck` = blocks with
`confidence != high` or within 5% of an overflow threshold. Fix the cheapest large gaps (e.g.
letter-spacing / bold in tableMetrics) if found.

## 3. Progress

| Phase | Status | Commit | Notes |
|---|---|---|---|
| LO0 | done | `3322e42a` | `layout/measure-block.ts` (+ spec, 13 tests). Three probes, path geometry, elastic flag — see Notes. `measuredTotal` reduce fixed + regression test in `slide-compiler.spec.ts` (fails on the old code). |
| LO1 | done | `3322e42a` | `layout-report.ts` (+ spec, 21 tests, snapshot of demo-deck `sl_03` and `sl_08`). `analyzeSlide`/`analyzeDeck`/`formatLayoutReport`/`layoutMap`, exported from `blocks/index.ts` only. All 95 fixture slides report in ~20 ms/slide. tsc: prod 0, spec 329 (= before). |
| LO1.5 | done | `525495b4` | Column-aware re-flow, fill-aware region sizing; see Notes — LO1.5. |
| LO2 | done | `415d86a6` | `BlockLayer` on `BlockDefinition`/`BlockSpec`, `block-layer.ts`; 7 non-content built-ins; AI-writable stacking = explicit `layer` on a region block (out of the stack, region box, z under/over the flow) in `compileLayered` (separate section of `slide-compiler.ts`); overlay occlusion judged by what it paints; map hides intended layering. `layout-layers.spec.ts` 17 tests + 1 snapshot. tsc prod 0, spec 329 (= before). See Notes — LO2. |
| LO2.1 | done | (this commit) | `anchor`/`anchorTo` on layered region blocks, backdrop-text `info`, title band = one title line, `regionAlign` fixed. `layout-anchor.spec.ts` 19 tests. Fixture `text/shrunk` 14 → 6, no new errors/warnings. tsc prod 0, spec 329 (= before). See Notes — LO2.1. |
| LO3 | todo | | |
| LO4 | todo | | |
| LO5 | todo | | |

### Notes — LO0 / LO1 (2026-10-08)

**Deviations from the plan, and why.**

1. **Tall probe, not a minimal one.** `tls.t.title` (and every autofit block) shrinks its type
   until the text fits the box, so a minimal height probe reports a *shrunk* height. `measureBlock`
   lays out at the requested width and 2160 units tall (no realistic content autofits there),
   then at 2880 (content that grows with the box = `elastic`), then at the real height (content
   that scales *down* to fit, e.g. a donut whose diameter is the shorter box side = also
   `elastic`, unless it got there by shrinking text). Elastic blocks have no natural height of
   their own; their `natural` is what they paint at the given height and the text form prints
   `fill`.
2. **Path geometry is parsed from `d`.** Many blocks emit a `path` whose node box is the whole
   block box (the DOM renderer draws `d` in a `viewBox="0 0 w h"` svg). Using the node box made
   the donut ring a "full-box backdrop" and its natural size its legend. `pathBounds()` parses
   M/L/H/V/C/S/Q/T/A/Z (abs + rel, arcs sampled), clipped to the node box.
3. **Backdrop = matches the layout box (98-102% per axis)**, not merely covers it: a card rect
   taller than its box is overflowing content. A block that paints *only* backdrops
   (`tls.m.decoration`, `tls.m.pattern`) falls back to the backdrop bounds.
4. **Boxes come from the editor's compile, text from `tableMetrics`.** `compileSlide` (and the
   editor, `DeckViewer`, export) never pass `measureText`, so they all use `estimateMetrics`.
   `analyzeSlide` keeps the compile untouched (its boxes are the editor's boxes) and re-lays each
   block at its box with the chosen provider (default `'table'`, option `'estimate'`). Caveat: the
   DOM renderer paints the layout's own line breaks (`white-space: pre`), so on screen the line
   *count* is estimateMetrics'. On the fixtures the two providers disagree on natural height by
   >10% for 11 of 210 text-bearing blocks (estimate wraps titles to 2 lines where table says 1).
   LO5 should decide whether the editor itself moves to `tableMetrics`.
5. **Coordinates follow the DOM renderer**: group children relative to the group origin (the
   SVG renderer does *not* translate groups — composites flatten, so it rarely matters).
6. **Extra finding codes** beyond the plan's list, all from data the report already has:
   `region/overflow` also for a region overfilled by a *stack* of blocks that each fit (the
   compiler only flags a single block taller than its region, and re-flows the stack silently);
   `region/displaced` (block moved out of its region by the re-flow); `text/shrunk` (info:
   autofit kicked in; when the text is already one line the fix says "height, not shorter
   text"); `content/overflow` (non-text overflow); `capacity/exceeded`; `block/layout-failed`;
   `block/unregistered`. Margins and free space are data, not findings.
7. **Map legend refined**: upper-case = the block paints here, lower-case = inside its box but
   unpainted (so `max(region, content)` root boxes are visible as such), `#` overlap, `!` content
   outside its own box. A 5-block slide formats to ~2.2k chars with the map.
8. **Layers**: `blockLayer()` returns `'content'` for every block; `classifyOverlap()` already
   implements the full LO2 policy table (backdrop behind/in front, overlay over text, overlay ×
   overlay, content × content with painted-meet downgrade to warning) and is unit-tested per
   row. LO2 only replaces `blockLayer()`'s body.

**What the oracle found on the fixtures (not fixed here — out of LO0/LO1 scope).**

- **Compiler re-flow stacks side-by-side regions.** When any region overflows, `compileSlide`'s
  pass 2 sorts *all* non-empty regions by y and stacks them, so an overfull `left` pushes
  `right` below it (a two-column slide becomes one column). The report flags it as
  `region/displaced`; demo-deck `sl_05` (quote 237 vs region 140 displaces the attribution).
- `blank` slides with a title + a fill block (colorful `sl_06/20/24/25/27/28`, demo `sl_08`):
  the fill block measures the full region (888), the stack is 100 over and ends 4 units past
  the frame; colorful/demo `sl_08` put a third block 916 units below the frame (invisible).
- Every `motion-showcase` content title autofits to 80%: the 88-unit title region is shorter
  than one 104-unit `title` line in `midnight`; shorter text cannot fix it.
- `tls.c.hero` measures 317-472 units in the 128-unit `title` region of the `title` layout.

**Scope cuts, named.**
- No visual scenario (§2.5): LO0/LO1 are headless and add no UI; LO5 is the browser
  calibration phase and owns the screenshot comparison.
- Masters (`masterId`) are not analyzed (`compileSlide` ignores them too).
- `needsVisualCheck` = blocks with confidence ≠ high only; the "within 5% of a threshold" rule
  is LO5's.
- `freeSpace` and the map sample cell centres (40 units): features thinner than a cell can
  vanish from the map; findings use exact geometry.
- Colour/contrast is not part of the report (the surface is a neutral white, as in
  `compileSlide`'s measuring pass).
- `turbo run build:packages` not run (no dist consumer changed; a rebuild races a running
  `next dev`). tsc prod 0 / spec 329 before and after; eslint 0 errors on touched files.

### Notes — LO2 (2026-10-08)

**Layer assignments (audit of all 129 `BUILT_IN_BLOCKS`).** Derivation: `def.layer` ?? category
`decoration` → `backdrop` ?? `content`. Non-content after the audit (pinned by a test):
- `backdrop`: `tls.l.field`, `tls.m.decoration`, `tls.m.pattern` (derived);
  `tls.x.watermark` (chrome, explicit), `tls.l.grid-guide` (structure, explicit).
- `overlay`: `tls.d.trend-badge` (metric, explicit), `tls.g.arrow` (decoration → explicit overlay:
  an annotation arrow is drawn over what it points at).
- `content` override: `tls.x.rule` (decoration → explicit content: a divider sits between blocks;
  behind text it would strike it through).
Everything else is content, including `tls.l.card`/`tls.l.overlay` (containers) and the chrome
corner blocks (they go in their own region, never over content).

**z-order, verified.** `compileSlide` emits regions in `Object.entries(spec.regions)` order, each
region's blocks top-down, then `free[]`, with one `childIndex` counter; the editor paints by
`childIndex`, and `documentToDeckSpec` walks shapes by it. So before LO2 z = authored order, and a
region's blocks never overlap each other at all (they stack).

**The AI-writable overlap path.** The AI never writes `free[]` (SCHEMA.md), and a region stacks,
so before LO2 the AI had no way to put a backdrop under content. Chosen: an explicit
`BlockSpec.layer: 'backdrop' | 'overlay'` on a **region** block takes it out of the stack. It gets
the region box (layout box ∪ the region's stacked shapes, so a re-flowed/overflowing region is
still covered), takes no stacking space, and z is fixed by layer: region backdrops under every
other shape, region overlays over every other shape, authored order within a layer; `childIndex`
is renumbered 1..n. Why this one: no coordinates, no cross-block references (an `anchor` to
another block's box would need id resolution, cycle checks and a second placement pass), the flow
compile is untouched (`compileLayered` compiles the flow with the layered blocks removed, then adds
them), and the result is a pure function of the spec. Only an *explicit* instance layer moves a
block: a decoration with no `layer` still stacks, so every existing deck compiles byte-identically
(the fixture suites pass unchanged). `layer` persists in `$block.layer`, so the editor round trip
keeps it.

**Report changes.** `blockLayer()` is real; `BlockReport.outOfFlow` marks layered region blocks,
which are excluded from region fill/overflow/displacement maths. An overlay covers text only where
it *paints* (`OverlapParty.painted`): a region overlay's box is the whole region, so box ∩ text
would flag every badge. The map draws backdrops only where no other block is and overlays only
where they paint, so intended layering is not a `#`.

**Validation/schema/digest.** `validateDeckSpec`: `block/layer` error for a value outside the
vocabulary, `block/layer-nested` warning for a non-content layer inside a container. JSON schema:
`layer` enum on every block node. Index: ` · backdrop`/` · overlay` on the 7 lines plus one
"Layers" rule paragraph (index still ≤ 20k, tested); full digest: same paragraph + `[backdrop]`
tags on block headings (digest snapshot updated).

**Stacked example** (`two-column`; `left` = decoration backdrop + stat-card, `right` = kpi-tile
+ trend-badge overlay): 0 errors, `I layout/overlap … backdrop blob sits behind card (intended)`,
`I layout/overlap … overlay badge over kpi covers no text (intended)` — snapshot in
`__snapshots__/layout-layers.spec.ts.snap`.

**Scope cuts, named.**
- **Overlay anchoring.** A region overlay gets the whole region box; where it paints is the
  block's own layout (the trend-badge centres vertically). A corner/edge anchor (`style.align`
  or a new `anchor` field) is the obvious next step for "badge on the card's corner".
- **Motion style** does not stagger layered region blocks (they keep their own/definition
  motion); adding them would renumber the flow's reading order.
- **Watermark × text** is a `text/collision` error by the plan's rule ("regardless of layer"),
  so a DRAFT watermark behind a title always errors; a faint-backdrop exception is a policy call.
- **Decompiler region order**: a round trip keeps `layer` and boxes, but rebuilds region keys in
  `childIndex` order (pre-existing), so flow z can permute between regions.
- Backdrop-only map cells under a full-region card are hidden by the card (block line shows it).
- No visual scenario: the change is headless compile/report; a browser check of a layered slide
  belongs with LO5's harness. `turbo run build:packages` not run (dist consumers unchanged).
- Touched `layout-report.spec.ts` in one line (the LO1 placeholder `expect(b.layer).toBe('content')`
  now expects the definition's layer); `layout-report.spec.ts.snap` not touched by LO2.

### Notes — LO1.5 (2026-10-08)

**What changed (`slide-compiler.ts` only).**
- `measureRegionBlocks` replaces the two duplicated measuring loops (pass 1 and placement used to
  lay every block out twice; now once, shared). A single block in a region is untouched. With 2+
  blocks, a block whose root claims the whole region (`root ≥ region height`) is re-measured
  with `measureBlock` at the region size:
  - `elastic` → **fill**: gets `(region − rigid/content siblings − gaps) / #fill`, at least
    `def.size.min[1]`, never more than its old root;
  - otherwise → **content** (root = `max(region, content)`, or a block that centres its content,
    e.g. `tls.g.steps`): its painted height, verified by laying it out at that height and growing
    by any spill (top inset / card padding), at least `size.min[1]`. If the region has **no** fill
    block, the leftover is shared among the content blocks instead, so a `title + steps` slide
    still gives steps the rest of the region (it centres there, as before) — just 100 units
    shorter so it ends at the region bottom, not 4 past the frame.
  The probe is only paid for region-claiming blocks in multi-block regions (deterministic, no
  DOM). `CompileFinding`'s per-block `region/overflow` rule is unchanged.
- `reflowRegions` (pass 2): regions are visited top to bottom; a region moves down only when a
  region above it that **horizontally overlaps** it ends lower than its layout box did (overflow,
  or itself pushed); it then starts at that bottom + `min(gap, layout spacing)` (regions that
  overlapped vertically in the layout keep their offset). Regions are never moved *up* any more
  (the old stack closed layout spacing between regions whenever anything overflowed).

**Before → after, all 4 fixture decks (95 slides), `analyzeDeck`, default `table` metrics:**

| code | before | after |
|---|---|---|
| error `slide/overflow` | 10 | **0** |
| warning `region/overflow` | 11 | 3 |
| warning `region/displaced` | 3 | 1 |
| info `text/shrunk` | 14 | 14 |

The 3 remaining `region/overflow` are real content-vs-region mismatches, not compiler bugs:
`tls.c.hero` (317 / 472 tall) in the 128-unit `title` region of the `title` layout (colorful and
demo `sl_01`), and demo `sl_05`'s 2-line quote (237) in the 140-unit `quote` region. The one
`region/displaced` is `sl_05`'s attribution: `quote` and `attribution` are *stacked* regions
(same x/width), so pushing it below the quote is correct — `sl_05` was never a side-by-side case
(the side-by-side case is now a unit test on `two-column`).

**Tests.** `slide-compiler.spec.ts` "LO1.5 flow fixes" (7 tests; 4 fail on the old compiler, 3
are guards for unchanged behaviour). `layout-report.spec.ts`: the test that pinned the column
bug as behaviour now asserts the fix (overflow still reported, `right` not displaced), plus a
stacked-region `region/displaced` test and a fill-min overflow test (rule 3: 4 bars ×
`min` 240 > region → `region/overflow` + `slide/overflow`). `sl_08` text snapshot updated (2
errors, 2 warnings → none). `collision.spec.ts` frame-bounds gate widened from `sl_05` to
**every slide of every fixture** (ratchet). tsc: prod 0, spec 329 (= before). eslint: 0 errors
on touched files.

**Visual check** (fixture demo deck served as a temporary `/view/` deck, `next dev -p 5433`,
temporary `tools/visual` scenario, both removed; `build:packages` run between shots).
`tools/visual/shots/lo15-{before,after}-sl_{05,08}.png` (git-ignored). `sl_08` before: title +
a full-height donut, the steps diagram invisible below the frame. After: title, a smaller donut,
and the 4-step diagram (Analyze → Validate) along the bottom, all inside the frame. `sl_05`:
identical before/after (quote, attribution below it, caption below that — correct).

**Not fixed, named.**
- **Title band vs. title line** (optional item): `titleBand()` in `slide-layouts.ts` is
  `type.heading.size + space.md`, but `tls.t.title` sets `type.title`; in `midnight` one title
  line (104) is taller than the band (88), so every `motion-showcase` content title autofits to
  80%. The principled fix is a band sized from the title line height, but that moves the body
  region of every titled layout on every deck — a layout change outside LO1.5 (and
  `slide-layouts.ts`) scope. Same for `tls.c.hero` in a `title` region: a cover block in a
  one-line region is a block-choice error the report already names.
- **`regionAlign` is dead with a registry**: placement aligns within the region's *natural*
  height, so `quote: 'center'` never offsets. Pre-existing; fixing it moves every quote slide.
- A `center`-aligned region that overflows grows downward only (pushes what is below) rather
  than symmetrically.
- Two LO1.5 assumptions to watch: content blocks are clamped to `size.min[1]` (e.g. `tls.g.steps`
  125 → 150), and only *region-claiming* blocks are re-measured (a block whose root is
  `region − 1` is treated as rigid).

### Notes — LO2.1 (2026-10-08)

**Anchors (`slide-compiler.ts` `anchoredBox`, `compileLayered`).** `BlockSpec.anchor` /
`BlockSpec.anchorTo` / `BlockDefinition.anchor` (types + `BLOCK_ANCHORS`, `blockAnchor()` in
`block-layer.ts`). Decision on the default: `def.anchor ?? 'fill'`. Only `tls.d.trend-badge` sets
`anchor: 'top-right'` (a pill with a natural size); `tls.g.arrow` stays `fill` (it draws across
whatever box it gets — it is elastic, so a corner anchor gives it `size.preferred`), as do the
backdrops. Natural size = `measureBlock`'s painted size, then grown (≤ 6 passes) until the block
paints that size unshrunk inside the box — the badge shrinks its type in a box only as tall as its
pill, so a plain natural box would draw a smaller badge. Clamped to the region, **not** raised to
`size.min` (deviation: the badge's min width 180 is wider than a `+5%` pill, and the pill is
left-aligned in its box, so clamping to min would move it off the corner).
`anchorTo` is resolved in the same single pass, after the flow is placed: target must be a
*stacked* block of the same region, so there are no chains or cycles. Its anchor box is the
target's **visible** extent (painted leaves ∪ full-box backdrops, clipped to its box): a card's
surface is its corner; a text-only block's corner is its text. Corner/edge anchors inside a
target are inset `space.sm`. Unknown/layered target → region box. Persisted in `$block.anchor` /
`$block.anchorTo`; the decompiler now assigns a layered block whose box is not region-wide to the
region whose x-range contains it (`matchLayeredToRegion`), so the round trip keeps it out of
`free[]` and recompiles to the same boxes (tested).

**Backdrop text policy (`layout-report.ts`).** `text/collision` is `info` (no fix) when exactly
one side is a backdrop with lower z; a backdrop above text, and content/overlay text ∩ text, stay
errors (tested both ways). LO2 policy text in §2 amended.

**Title band (`slide-layouts.ts`).** `titleBand = max(heading + md, ceil(title.size ×
title.lineHeight) + space.3xs)` = 108 at the default scale (was 88). The `3xs` is measuring slack:
the editor's `estimateMetrics` reports one line as `round(size × lh) + 2` = 106, so a band of
exactly one line (104) still autofit to 96%. Every titled layout's body regions start 20 units
lower and are 20 shorter. **`regionAlign`** now aligns within `max(layout box, natural)`;
`quote: 'center'` centres a short quote (tested). On the fixtures it changes nothing (the only
quote slide overflows its region).

**Before → after, 4 fixture decks (95 slides), `analyzeDeck`, table metrics:**

| code | before | after |
|---|---|---|
| error (any) | 0 | 0 |
| warning `region/overflow` | 3 | 3 |
| warning `region/displaced` | 1 | 1 |
| info `text/shrunk` | 14 | **6** |

The 8 gone are motion-showcase `ms_04`–`ms_11` (80% → 100%). Left: `ms_02/03` (long titles,
80/88% — content, not band), tour `tl_18/19` (96%), colorful `sl_21` (84%), demo `sl_04` kpi value.

**Validation / schema / digest.** `block/anchor` (error, vocabulary), `block/anchor-target`
(error: not a string, or not a stacked block of the region; with `suggestion`),
`block/anchor-unused` (warning: no backdrop/overlay layer, or inside a container). JSON schema:
`anchor` enum + `anchorTo`. SCHEMA.md `BlockSpec` + example. Digest: one sentence added to the
Layers paragraph (index still ≤ 20k, tested); digest snapshot updated for that line only.

**Tests.** New `layout-anchor.spec.ts` (19). Changed: `layout-layers.spec.ts` — the
"regardless of layer" test now asserts the new policy *and* that backdrop-above and
content×content collisions stay errors; its stacked-example snapshot moves the badge to the
right region's top-right (114×50 instead of the region box) and the 20-unit title-band shift;
`layout-report.spec.ts.snap` `sl_03`: same 20-unit shift only. Targeted suites (slide-compiler,
-decompiler, -layouts, -composition, layout-report/-layers/-anchor, collision, validate, digest,
shape-bridge, deck-document/-context, demo contract/roundtrip, motion*) pass with
`--maxWorkers=1`. `DeckViewer.spec.tsx` has one failure ("retreating into an auto build step")
in build-step navigation — that file has the user's uncommitted `DeckViewer.tsx` changes; not
geometry, not investigated. tsc prod 0 / spec 329; eslint 0 errors on touched files.

**Visual check** (temporary `/view/zz-lo21` deck + `tools/visual` scenario, both removed;
`build:packages` before the shots). `tools/visual/shots/lo21-anchor.png`: the `-3.2%` badge sits
in the stat card's top-right corner, 16 units in from both edges, clear of the icon and value;
the `+5%` badge (no `anchorTo`) at the right region's top-right, beside the kpi tile; the faint
DRAFT watermark shows behind the title text. First shot (before the fix below) put the badge
mid-card: the anchor box was the card's painted *content*, which excludes its full-box surface —
fixed to the visible extent. `lo21-after-ms_04.png` vs `lo21-before-ms_04.png` (the 2026-10-03
motion run, same title band as HEAD): title "Kết quả học tập — expressive" now at full size
(was visibly shrunk), body 20 units lower, nothing off-frame.

**Scope cuts, named.**
- Anchors only for *region* blocks with an explicit layer; `free[]` and container children
  ignore them. `anchorTo` cannot cross regions or target another layered block.
- No offset/overhang (a badge straddling a card's edge); inset is fixed `space.sm` for
  `anchorTo`, 0 for a region.
- A user who drags an anchored overlay in the editor gets it re-anchored on recompile (same
  known limitation as region snapping).
- Badge label widths: the anchored size is measured with the compile's `estimateMetrics`; the
  report re-lays with `tableMetrics`, which may differ by a few units (no finding seen).
- `tls.c.hero` in the `title` region and `sl_05`'s quote overflow remain (content choices).

