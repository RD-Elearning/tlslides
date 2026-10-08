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

### LO2 — Layers & intentional overlap
Additive metadata: `BlockDefinition.layer?: 'backdrop' | 'content' | 'overlay'` (default derived:
category `decoration` → `backdrop`, else `content`) and `BlockSpec.layer?` instance override.
Policy in the report:
- content ∩ content → `layout/overlap` (error);
- backdrop ∩ anything → allowed (`info`), but backdrop must be *behind* (z-order) — else error;
- overlay ∩ content → allowed if it covers no text leaf of the content block, else `text/occluded`;
- any text leaf ∩ text leaf of another block → `text/collision` (error) regardless of layer.
Also `validateDeckSpec` accepts the new field; JSON schema + digest mention it.

**Done when:** a slide with a decoration block under a card reports no error; the same with a
badge over the card's title reports `text/occluded`.

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
| LO0 | done | (this commit) | `layout/measure-block.ts` (+ spec, 13 tests). Three probes, path geometry, elastic flag — see Notes. `measuredTotal` reduce fixed + regression test in `slide-compiler.spec.ts` (fails on the old code). |
| LO1 | done | (this commit) | `layout-report.ts` (+ spec, 21 tests, snapshot of demo-deck `sl_03` and `sl_08`). `analyzeSlide`/`analyzeDeck`/`formatLayoutReport`/`layoutMap`, exported from `blocks/index.ts` only. All 95 fixture slides report in ~20 ms/slide. tsc: prod 0, spec 329 (= before). |
| LO2 | todo | | |
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
