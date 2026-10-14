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

### LO5b — Composition hints
Pure, in `layout-report.ts`: `layout/unbalanced` (info; big empty band below/right), `region/empty`
(info; a large declared region with no block), `layout/crowded` (warning; free < 10%), each with a
numeric fix. Conservative thresholds; counts on the fixtures recorded in the notes.

### LO5 — Calibration & when to screenshot
Compare report geometry with the real browser on the fixture decks (Playwright, existing
`tools/visual` harness): per block, DOM content height vs `natural.height`, text line counts.
Record error stats here; set `confidence` thresholds from data; `needsVisualCheck` = blocks with
`confidence != high` or within 5% of an overflow threshold. Fix the cheapest large gaps (e.g.
letter-spacing / bold in tableMetrics) if found.

### Next (open, in priority order)
- **Card height vs compiled height for padded blocks.** Size-card models fit the *painted* height
  (`natural`); a block with invisible padding stacks taller in `compileSlide` (`tls.c.testimonial`
  @840: model 458 for 4 lines, root 554). `atMin.h` already reports the occupied height; the
  models do not. Fix: fit `max(painted bottom + painted top, …)` or add an `occupied` model.
- **Shrink-wrapped labels ≤ 12 units past their box** (26 lines: scorecard/table heads +2-4,
  team text +6-12, before-after +9, closing +8). Invisible (`white-space: pre`, not clipped);
  a per-kit slack would move 26 layouts for no visible gain. Leave unless a shot shows it.
- **ESM dist in plain node** (`import()` of `dist/index.mjs`): every lask-built workspace package
  ships CJS whose named exports node cannot read; patching core alone cascades to vec, then to
  `default` re-exports. Build-pipeline change across packages; bundlers and the CJS entry are fine
  (`tools/layout-report/smoke-dist.js`). The real Next.js API-route import stays untested (needs a
  `next build` of the sample; Next wiring is deferred).
- **Committed size cards are default-theme only** — `cli.js --metrics --theme <id>` samples any
  built-in theme on demand; the digest hints stay default-theme.
- **Machine rule:** WSL has ~4.9 GB RAM, no swap. Run ONE code-writing agent at a time; jest
  targeted with `--maxWorkers=1` (since LO8 it exits on its own; `--forceExit` no longer needed);
  one tsc at a time; never jest/tsc while the dev server + Chromium run. Parallel agents thrashed
  the disk and froze the machine on 2026-10-08. The whole parity set (102 spec files) now runs in
  three chunks of `-t 'parity|DOM and SVG|assertParity|agree'` (~25-40 s each).

## 3. Progress

| Phase | Status | Commit | Notes |
|---|---|---|---|
| LO0 | done | `3322e42a` | `layout/measure-block.ts` (+ spec, 13 tests). Three probes, path geometry, elastic flag — see Notes. `measuredTotal` reduce fixed + regression test in `slide-compiler.spec.ts` (fails on the old code). |
| LO1 | done | `3322e42a` | `layout-report.ts` (+ spec, 21 tests, snapshot of demo-deck `sl_03` and `sl_08`). `analyzeSlide`/`analyzeDeck`/`formatLayoutReport`/`layoutMap`, exported from `blocks/index.ts` only. All 95 fixture slides report in ~20 ms/slide. tsc: prod 0, spec 329 (= before). |
| LO1.5 | done | `525495b4` | Column-aware re-flow, fill-aware region sizing; see Notes — LO1.5. |
| LO2 | done | `415d86a6` | `BlockLayer` on `BlockDefinition`/`BlockSpec`, `block-layer.ts`; 7 non-content built-ins; AI-writable stacking = explicit `layer` on a region block (out of the stack, region box, z under/over the flow) in `compileLayered` (separate section of `slide-compiler.ts`); overlay occlusion judged by what it paints; map hides intended layering. `layout-layers.spec.ts` 17 tests + 1 snapshot. tsc prod 0, spec 329 (= before). See Notes — LO2. |
| LO2.1 | done | `e3fb6ace` | `anchor`/`anchorTo` on layered region blocks, backdrop-text `info`, title band = one title line, `regionAlign` fixed. `layout-anchor.spec.ts` 19 tests. Fixture `text/shrunk` 14 → 6, no new errors/warnings. tsc prod 0, spec 329 (= before). See Notes — LO2.1. |
| LO3 | done | `770808fb` | `block-metrics.ts` `buildBlockMetrics` → committed `__generated__/block-metrics.json` (129 cards, 64 KB, one line per block) + `block-size-hints.ts`; staleness spec; index hint `[h≈0+104/L@840]`, index 18.8k chars (≤ 20k). `block-metrics.spec.ts` 13 tests. See Notes — LO3/LO4. |
| LO4 | done | `770808fb` | Size-card API exported from `blocks/index.ts` (package root re-exports it); `turbo build:packages` exit 0, dist CJS verified. CLI `tools/layout-report/cli.js` (+ `load.js`, `gen-block-metrics.js`), 0.4-0.8 s per fixture deck. Docs: `LLM-ARCHITECTURE.md` §S4.1, `guides/blocks-authoring.md` §2.10. |
| LO5 | done | `7e3acc6f` | Browser calibration (289 blocks, 95 slides, 1 Chromium page); `tableMetrics` re-based on browser-measured Inter + letter-spacing + bold; exact Bézier `pathBounds`; `needsVisualCheck: {blockId, reason}[]`; LO5b composition hints. `layout-calibration.spec.ts` 14 tests. See Notes — LO5. |
| LO6 | done | `62c80440` | `createLayoutContext` defaults to `editorMetrics` (= `tableMetrics`); report's editor-disagreement check is a no-op by default; fixtures needsVisualCheck 21/95 → 9/95. See Notes — LO6. |
| LO7 | done | `8c88e4c4` | Templates paint the poster's lines and metrics (`ctx.poster`, `posterText`, host flag `posterGeometry`); all 8 html blocks; html parts vs Chromium: line mismatches 2 → 0, top/bottom p95 9.4/12.6 → 1.0/1.0 units; fixtures needsVisualCheck 9/95 → 0/95. See Notes — LO7. |
| LO8 | done | `53982d76` `46997d80` `32351fec` `eeccebea` `4ac7b5e3` `669e0ed6` | Resize re-wrap pinned (no bug); dragged layered block keeps its place; SVG group/host origins + probe in Inter → every parity probe passes; parity worker no longer keeps jest alive; honest size cards (`samples`, `atMin`, 3 min sizes); `smoke-dist.js`; `--theme` cards. ESM dist, label slack, padded-card heights deferred. See Notes — LO8. |

### Notes — LO8 (2026-10-09)

**1. Resize after LO7 — verified, no bug** (`53982d76`). `ComponentUtil` re-lays the block at the
shape's live size every render; `htmlHostNode` builds a new poster for that box and `HostMount`'s
update key is `width×height|posterTextSignature` — so a resize, a region width change, a props edit
or a theme switch re-templates from the new poster. New `ComponentUtil.html-resize.spec.tsx` (5)
drives the real editor path (wide → narrow → wide for hero, testimonial, feature-grid; a text edit;
mono-grid → midnight) and checks the DOM's no-wrap lines equal the *last* poster's and no poster
line is wider than the box. Mutation check: with `renderer.update` commented out, all 5 fail.

**2. Dragged layered block** (`46997d80`). Decision: a move in the editor is kept, the way other
blocks keep a move out of their region — it becomes a `free[]` block at its box. `compileSlide`
records where it placed a layered block in `$block.placed = {box, from: 'region' | 'free'}`
(compiler-derived, never in the `BlockSpec`, like `styleMotion`). The decompiler: a region-placed
layered shape whose box differs from `placed.box` by > 1 unit was moved/resized by hand → `free[]`
at its box, `layer` kept, `anchor`/`anchorTo` dropped (re-anchoring would snap it back), finding
`shape/layered-moved` (info); an untouched one stays in its region and is re-anchored (so it still
follows its target when the flow changes); a `from: 'free'` shape stays free on every later round
trip. A free `backdrop` paints under the flow (`childIndex` renumbered), as it did in the region.
Fixture boxes byte-identical. 4 tests in `layout-anchor.spec.ts`.

**3. Parity probes** (`32351fec`). `tls.t.statement`: root cause in `render-svg.ts` — a `group` at
x/y ≠ 0 drew its children at the parent's origin (the DOM nests them in a positioned div). Groups
now get `transform="translate(x y)"` (clip rect moved into the translated space); a host's poster
is translated by the host box too (an html block nested in a composite). `render-svg.spec`: 2 new
tests; "renders a group node" now expects the transform (its fixture group sits at 10,20) and the
defs-before-`<g` check matches `<g` with attributes. `tls.c.stat-spotlight` (49.8) and
`tls.c.kinetic-title` (2.7): the probe font, not a renderer. The harness page had no Inter, so the
SVG poster text painted in Chromium's default sans, 3-5 % wider than the `tableMetrics` (Inter)
widths the poster was wrapped and sized with, and the host's ink box ran past the host box. The
worker now loads the repo's committed `examples/nextjs-sample/public/fonts/Inter-Regular.ttf` as a
data: `@font-face` and the probe lays out with `PROBE_TOKENS` (= `TEST_TOKENS` with the Inter
family; `TEST_TOKENS` itself, used by ~170 non-probe tests, is unchanged). Proven by removing the
file: both fail again with the old numbers. `tls.d.progress-bar` passes. **All 102 parity-probe
spec files pass** (data 26, composite 26, the rest 50; three chunks, ~25-40 s each).

**4. Parity worker vs jest** (same commit). Only `parity.spec.ts` ever called `shutdownWorker`;
every other probe (the standard suite imports the harness inside a test) left a forked node +
Chromium whose IPC channel and stdio pipes kept jest's loop alive. Now the child, its pipes and its
channel are unref'd except while a request is pending; an idle timer (3 s, Node's real `timers`,
since jsdom timers die with the environment) shuts the worker down; `afterAll` is registered when
the harness is imported at a spec's top level (not inside a test — jest-circus fails the test);
the worker closes Chromium and exits on `disconnect`. Result: targeted runs exit by themselves
(68 suites in 22 s with no `--forceExit`), no `headless_shell` left after any run.

**5. Size cards** (`eeccebea`). The linear model cannot describe step shapes (`tls.g.steps` turns
vertical when narrow: @840 5 steps 187, 8 steps 333; `tls.c.team` wraps to a second row at 5:
@1728 4 → 332, 5 → 845), so a poor fit now carries every measured `samples: [x, h][]` — the
planner reads the table, the hint keeps the range. New `atMin: {h, fits}`: the example laid out in
exactly its `size.min` box; `h` = what it occupies there (root, or painted bottom). Autofit blocks
shrink into it (all but 3 of 81 cards). The 3 that did not were wrong mins, fixed at the root:
`tls.c.testimonial` 400×300 → **840×554** (950 tall at 400: an html poster does not shrink its
type; 554 = 458 painted + 2×48 padding), preferred → max(poster, min) = 554;
`tls.c.feature-grid` min height 242 → **251** (a cell title wraps at 1120), preferred max(derived,
min); `tls.c.problem-solution` 320 → **332**. Spec: every poor fit has exact samples (steps @840
re-measured), every measurable example fits its own min box; the testimonial min test now asserts
containment like its RV09 neighbours (it accepted any growth); the two derived-preferred tests
follow max(poster, min) (as hero in LO6). JSON regenerated; hints file unchanged; fixture reports
byte-identical (boxes and findings, checked against a `git archive` of 33589a79).

**6. Shrink-wrapped labels** — documented, not changed (§2 Next): 26 lines, ≤ 12 units, invisible.

**7. dist** (`4ac7b5e3`). `turbo run build:packages` (alone, 13 s, exit 0).
`tools/layout-report/smoke-dist.js`: `require(dist/index.js)` exposes the oracle API, `analyzeDeck`
on the demo fixture equals the source build's findings, `buildBlockMetrics` from dist reproduces
four committed cards; it reports (does not fail on) the ESM limitation. ESM investigated on a
scratch copy: appending node's `0 && (module.exports = {…})` annotation to core's CJS fixes core,
then `@tlslides/vec` fails, then a `default` re-export — every lask-built package would need it:
not contained, deferred. Next.js route import not exercised.

**8. Theme** (`669e0ed6`). `cli.js --metrics --theme <id>` samples cards with a built-in theme;
`LLM-ARCHITECTURE.md` §S4.1 names it, `samples`, `atMin` and `smoke-dist.js`.

**Gates.** tsc prod 0, spec 329 (= before; `tsconfig.tsbuildinfo` restored to the user's copy after
each run). eslint: 0 errors on touched files. jest `--maxWorkers=1` (no `--forceExit`), non-parity:
layout-report/-layers/-anchor/-calibration, block-metrics, capability-digest, slide-compiler/
-decompiler/-layouts/-composition, collision, render-svg, html-poster-geometry, shape-bridge,
deck-document, demo contract/roundtrip, validate, motion-showcase, tour, catalog-conformance,
`library/composite`, `ComponentUtil`, `layout/` (68 suites, 3189 tests) and `library/` data,
diagram, text, chrome, media, layout (106 suites, 2096 tests): pass. Parity: all 102 probe files
pass. Fixture CLI (4 decks, 95 slides): 0 errors, 3 `region/overflow`, 1 `region/displaced`,
4 `text/shrunk`, 13 `layout/unbalanced`, 3 `region/empty` (= LO7), needsVisualCheck 0/95.
Calibration harness re-run: identical stats (html parts 0 line mismatches, top/bottom p95 1.0;
26 rendered lines past their box). **Shots looked at** (`--shots`): demo `sl_07` feature-grid
(3 cells, icons, titles, 2-line descriptions, nothing clipped), motion `ms_02` stat-spotlight
(ring, 92%, label, context line on one line, three stats), tour `tl_05` (statement on 3 lines with
both highlights, definition, callout, source), demo `sl_05` (quote on 2 lines, attribution,
caption) — all as at LO7 (no DOM path changed).
Out of scope, pre-existing: `DeckViewer.spec` (user's uncommitted change), `BlockInserter.spec`.

### Notes — LO7 (2026-10-09)

**Survey (HEAD 76941ffc, before).** The 9 fixture html blocks (2 hero, 2 feature-grid, kinetic-title,
2 stat-spotlight, journey, feature-reveal) are laid out by `htmlHostNode` → host node with the
block's `poster` (what the compiler, the oracle and SVG export measure), while the live DOM is the
block's `template()` HTML, wrapped and spaced by the browser. Template vs poster differed in every
block: line-heights (hero title 1.1 vs the display token 1.02; feature-grid 1.3/1.5 vs 1.2/1.45),
tracking (the poster's default −0.03 em, templates 0), gaps (big-stat label 8 vs `space.sm` 16;
testimonial a different stack altogether, its text measured at w−96 but drawn at x 0), the
`tableMetrics` +2 per text node, layout quirks (feature-grid's `inline-block` icon sat on the line
baseline, the strut pushed the title 3 units down; hero's CTA pill, a flex item, stretched to the
full width while the poster drew a centred pill; the split hero title painted two blocks, the
poster one wrapped title; testimonial `padding:48px` on a `height:100%` content-box root — the
column was offset 48 down and overflowed the host). The LO5 "4/9 line counts differ" was half a
harness artefact: it summed lines per element, so `<strong>`/word `<span>`s on one row counted as
extra lines (hero, kinetic-title). Measured per `data-part` (new in `measure.js`/`stats.js`): **2
real wrap differences** (feature-grid `cells.1.desc`, feature-reveal `items.3.text`: table said 1
line at 100%/95% of the box, Chromium 2) and positions off by up to 12 units (top) / 50 (bottom).

**Approach chosen: (c) = (a) + the template paints the poster's lines.** (a) alone — poster
metrics = template CSS — still lets the browser re-wrap: table vs Chromium line widths are ±5% at
p95, and both real mismatches above were lines within 5% of their box, so a share of lines would
keep breaking differently and the block could never be `high`. (b) alone has the same hole. So
the template gets the poster (`HtmlTemplateContext.poster`, handed over by `HostMount` from the host
node — the same layout pass, same box) and paints each text part with exactly the poster's lines
(`<br>` between, `white-space:nowrap`) and its font-size/line-height/letter-spacing
(`posterText(ctx)` in `html-block.ts`: `pt.css(key, fallback)`, `pt.html(key, fallback)`, keyed by
the poster text node's `propPath`). That is the layout-kind contract (the DOM renderer paints the
layout's lines with `white-space: pre`): line counts equal **by construction**. The vertical stack
is then (a): each poster uses its template's numbers (one exported constant set per block —
`HERO_LH`, `FG_*`, `KT`, `JOURNEY_LABEL`, `SPOT`, `REVEAL`, `TESTIMONIAL`, `BIG_STAT`) and advances
by CSS line boxes (`cssTextHeight` = lines × size × line-height, not the +2 `height`). Where a
template positioned something the poster computed differently, the template now takes the poster's
value (journey label top, incl. the poster's clamp into the box; stat-spotlight column
`justify-content: safe center` = the poster's `max(0, …)`). Templates keep their look: the posters
adopted the templates' values, not the other way round (screenshots below identical except the
fixes). Without a poster (a direct `template()` call) every helper returns the old markup, so the
browser wraps as before. The host node says it: `htmlHostNode(…, { posterGeometry: true })` →
`measureBlock` confidence `high`; a poster host without the flag stays `medium` and is screenshot.
TS stays the single source of truth: the browser no longer decides any html line break.

**Before → after.** Calibration harness (`calibrate/run.js`, 1 Chromium page, Inter loaded):

| html kind (9 blocks, 50 text parts) | before | after |
|---|---|---|
| line-count mismatches, per `data-part` | 2 | **0** |
| part top \|err\| median / p95 / max (units) | 1.0 / 9.4 / 11.8 | **0.4 / 1.0 / 1.0** |
| part bottom \|err\| median / p95 / max | 2.2 / 12.6 / 49.6 | **0.4 / 1.0 / 1.1** |
| painted height poster vs DOM median / p95 | 2.1% / 4.4% (20 units) | 0.0% / 2.5% (4.0 units) |
| old per-element total-line metric (LO5 "4/9") | 4/9 | 2/9 (hero, kinetic-title: the inline-run artefact) |

The remaining 2.5% is feature-grid's icon: the harness measures the SVG glyph's ink (≈ 4 units
inside its 48-unit box), the poster the icon box — not text. Layout kind unchanged (median 0.0%,
p95 0.5%, rendered lines ≠ table 0, table ≠ browser wrap 3/1595). Non-fixture html blocks
(testimonial ×2, big-stat ×2, hero `split` with CTA; a scratch deck through the same harness):
every part within 1 unit, line counts equal.

Fixtures, `cli.js` (4 decks, 95 slides): finding counts identical (3 `region/overflow`, 1
`region/displaced`, 4 `text/shrunk`, 13 `layout/unbalanced`, 3 `region/empty`, 0 errors);
**needsVisualCheck 9/95 → 0/95**. Boxes moved: hero demo `sl_01` 472 → 490 (its new min), colorful
`sl_01` 317 → 323 (title line-height 1.1, as the live hero always painted); feature-grid demo
`sl_07` 206 → 209, colorful `sl_05` 166 → 167.

**Screenshots looked at** (`--shots`, session scratchpad, before and after side by side):
motion `ms_01` kinetic-title (identical: kicker, 2-line title with the accent words, rule,
subtitle), `ms_02`/`ms_03` stat-spotlight (identical; ring, value, label, context, three stats),
`ms_06` journey (identical; five labels above/below the path), `ms_07` feature-reveal (identical;
"Biến ý tưởng … một / tuần." on 2 lines both times — the poster now says 2 as well), demo `sl_01`
hero (identical), demo `sl_07` / colorful `sl_05` feature-grid (titles ~4 units higher: the icon
strut is gone), colorful `sl_01` hero (identical); scratch deck: testimonial (quote centred on 2
lines with the bold run, avatar, name, role — now inside its box), big-stat, hero `split` + CTA
(pill at the text's start edge, label width). Reduced motion, build step 999 = the animations'
final state; no clipped text in any.

**Fixed at the root on the way.** `tls.c.hero` `size.min` 472 → **490** (the example at 1280 is
490 tall at the template's line-height — the live hero always was); `tls.c.big-stat` `size.min`
265 → **246** (265 was the old poster: +2 per text and a 16-unit label gap the template never
had). `tls.c.testimonial` poster gains a transparent extent rect → its **parity probe passes**
(failed on HEAD); `collectPaintedLeaves` treats an invisible rect (transparent fill, no stroke) as
structure, never a painted leaf, so the size card is unchanged by it.

**Tests.** New `html-poster-geometry.spec.tsx` (28): all 8 html blocks declare `posterGeometry` and
measure `high`, a plain poster host stays `medium`; for every block at 1728×732, 840×600 and a
second theme, every poster text appears once in the template, line for line, with its size,
line-height and tracking, and nothing else is no-wrap; without a poster no forced lines; through
the real `HostMount` a narrow hero's title has the poster's line breaks. Changed, with reasons:
`tls-c-hero.spec` "poster unchanged regardless of variant" → classic/gradient-sweep unchanged,
split paints its two halves (the old assertion pinned the wrong poster); `measure-block.spec` hero
`high` + a no-flag host `medium`; `layout-report.spec` sl_01 hero trusted, the same hero without
the flag flagged; `layout-calibration.spec` ratchet < 0.12 → < 0.05 plus "no poster reasons". Size
cards regenerated: 8 html cards `high`; hints big-stat `h≈246@840`, feature-grid `h 167–442@1728`,
hero `h≈437+53/L@1728`, journey `h 360–450@840`, testimonial `h≈194+66/L@840`.

**Gates.** tsc prod 0, spec 329 (= before; `tsconfig.tsbuildinfo` restored to the user's copy).
jest `--maxWorkers=1 --forceExit`, non-parity: `library/composite` (all), `library/motion*`,
`motion/`, `layout/`, render-dom, host-registry, layout-report/-layers/-anchor/-calibration,
block-metrics, capability-digest, slide-compiler/-composition/-layouts/-decompiler, collision,
catalog-conformance, demo-deck, motion-showcase, block-library-tour, shape-bridge, deck-document/
-context, validate-deck-spec, render-svg, registry, html-poster-geometry: all pass (final runs: 74 + 9 suites, 4186 tests).
Parity probes run for the changed blocks, a few at a time: journey, feature-reveal, testimonial
pass; kinetic-title fails identically on HEAD (width 2.7, checked by swapping HEAD's files in);
stat-spotlight fails on HEAD (15.3) and now by 49.8 — the probe draws the context line "trong vòng
6 tháng sau khi" (table right edge 945 of 960 at the 960×540 probe) in its own font past the root;
tracking 0 (the template's look) made it 3% wider. In LO8. hero, feature-grid and big-stat have no
probe. eslint: 0 new errors (the one pre-existing in `tls-c-hero.spec.ts`, now line 958).

**Scope cuts / risks, named.**
- A no-wrap line can paint up to ~5% wider than the table measured (the layout-kind trade): centred
  texts (kinetic-title, journey, testimonial) overflow both sides via flex centring, start-aligned
  ones to the right; feature-reveal cards clip at their padding. The report does not see that.
- Weights the table does not model: kinetic-title title and stat-spotlight values are 800, the
  testimonial name 600 — measured as bold (700, ×1.05); ~2% narrow for 800.
- `posterText` keys are the poster nodes' `propPath`s; a template that asks for a missing key
  paints nothing (by design: a text the poster fit away is not painted live) — the spec catches a
  typo. Testimonial initials stay browser-laid (fixed 72-unit circle).
- `HostMount` re-templates when the poster's text changes (`posterTextSignature`), so a theme
  switch with another type scale re-wraps; colours still come from CSS vars.
- Not done: `tools/visual` scenario in the Next.js app (the calibration harness renders the real
  `<DeckViewer>` path and is the browser check, as LO5/LO6); `build:packages` not run.
- The scratch deck used for testimonial/big-stat/split is not committed (harness takes the 4
  fixtures); the jsdom spec covers those blocks line for line.

### Notes — LO6 (2026-10-09)

**What switched.** `layout/measure.ts` exports `editorMetrics` — one shared `tableMetrics()`
instance (stable identity, so `ctx.measureText === editorMetrics` is testable) — and
`createLayoutContext` defaults to it instead of `estimateMetrics`. That one default is the layout of
record for everything that does not inject a provider: `compileSlide` (both passes, anchors),
`deck-context`/`useDeckTokens` (editor shapes), DOM + SVG renderers (they paint the layout's lines),
export, autofit, motion part counts, parity harness, html-block posters and the hero/testimonial/
feature-grid `derivePreferredSize`. `block-metrics.ts` and `layout-report.ts` default to the same
instance. `estimateMetrics` stays exported (rich-text specs, `--text-metrics estimate`, the
calibration's comparison column, `createMetricsProvider('estimate')`).

**Consumers left as they were, and why.** The kits that already measured with their own table
(`chrome/_kit` `TABLE`, `composite/_kit` `lineWidth`, `tls-t-statement` `runWidth` × 1.08,
`_chart/kit` `withRealWidths` + `TEXT_SLACK`, `_table/kit` `withNumberMetrics`, `tls-c-closing`
label room) were compensating for the estimate; with the editor on the same widths they are now
consistent rather than corrective. They keep their slack factors (removing them would move boxes for
no visible gain; table vs browser p95 is still +5%), only stale comments were updated.
`renderPageToSvg.ts`'s `AVG_CHAR_WIDTH_EM` is tldraw's own text shape (Phase 15), not blocks.
`slide-layouts.ts`' title band `space.3xs` slack stays (`tableMetrics` also reports a line as
`round(size × lh) + 2`).

**Report.** `needsVisualCheck` reason 2 ("editor disagreement") now re-lays with `editorMetrics` and
runs only when the report's provider is *not* `editorMetrics` (default: skipped, zero cost). With
`metrics: 'estimate'` it still fires, worded "the editor wraps `text` to 1 line on screen; the
report's `estimate` metric needs 2". `measureBlock` confidence is `high` for the default context
(it was already `medium` only for an injected `estimateMetrics`).

**Fixtures, `cli.js --format json`, before → after (4 decks, 95 slides, 289 blocks):**

| | before | after |
|---|---|---|
| error (any) | 0 | 0 |
| warning `region/overflow` | 3 | 3 |
| warning `region/displaced` | 1 | 1 |
| info `text/shrunk` | 6 | **4** (colorful sl_21, motion ms_03 gone: their titles now fit at 100%) |
| info `layout/unbalanced` / `region/empty` | 13 / 3 | 13 / 3 |
| needsVisualCheck slides | 21/95 (22%) | **9/95 (9.5%)** — demo 2/8, tour 0/29, colorful 2/46, motion 5/12 |
| needsVisualCheck blocks | 26 (9 html poster, 10 editor wraps, 6 editor lines past box, 1 leaf count) | **9 (html poster only)** |

Only 8 of 289 compiled boxes moved: `tls.t.statement` tour tl_05 / colorful sl_12 (+115: 3 lines at
full size instead of 2 lines the DOM painted ~5% past the 544 box — the browser screenshot shows
3 lines), colorful sl_03 subtitle (−53 box, same 1 line), titles sl_21/ms_02/ms_03 (box ±12-17,
no longer shrunk), ms_11 takeaway/body (−39/−40: the editor's false 2-line wraps are gone).

**Calibration (re-run `calibrate/run.js`, 289 blocks, 1 Chromium page).** Painted height, layout
kind, table (= editor now): median 0.0%, p95 0.5% (0.7 units), > 5%: 1 (`tls.m.image` sl_06,
asset not resolvable in the harness — as at LO5); rigid p95 0.3%. **Rendered lines ≠ table
(sanity) = 0**: the DOM paints exactly the report's lines. Text line counts ≠ browser wrap: table
3/1595 (0.2%), estimate 12 (0.8%). The 3: both `tls.t.statement`s (table 3, the harness's plain-text
browser probe 2 — it ignores the **bold** emphasis runs; the DOM paints 3 lines, painted height 317
vs 317.6) and `tls.d.pricing` cta label (w 87, browser 2 lines). Line widths DOM ÷ table − 1: median
−0.3% [p05 −4.2%, p95 +5.1%] (estimate −8.4% [−22.3%, +25.5%]). Note the task framing "estimate
column equals table" does not hold: `compare.js` still re-lays the estimate column with
`estimateMetrics` explicitly; it is now the *pre-LO6 editor* column (label updated in `stats.js`).
html posters unchanged (4/9 wrap differently; LO7). Rendered lines wider than their box: 26 (was 23),
all ≤ 12 units, all shrink-wrapped labels/cells whose kit box = table width + small slack
(scorecard/table heads +2-4, team text +6-12, before-after +9, closing +8) — the ±5% table error,
`white-space: pre`, not clipped in the shots; left open (LO8).

**Screenshots looked at** (`--shots`, raw in the session scratchpad, not committed): tour `tl_05`
and colorful `sl_12` (statement "Make the / simplest option / the default." on 3 full-size lines,
attribution below, nothing overlapping the definition/callout columns), motion `ms_11` (Vietnamese
title one line, takeaway and caption each one line, chart labels clear), colorful `sl_21` (donut
title one line at full size, legends unclipped), demo `sl_03` (title, chart, callout, bullets,
source — all inside the frame).

**Regressions the true widths exposed, fixed at the root (not by loosening tests).**
- `tls.t.title` `size.min` 640 → **680**: its own example ("Revenue **grew 42%**") wraps at 640
  even at the 0.76 autofit floor (table 664 wide; the estimate said 629).
- `tls.t.statement` highlight rect clamped to the block box: true widths wrap the marked run to a
  line start, and the −pad pushed it to x −5 (standard-suite containment failed).
- `tls.c.kpi-tile` value: below the 0.5 shrink floor it now scales to fit exactly instead of
  wrapping "1234567890" mid-digits (the estimate kept one line while the DOM overflowed the tile).
  Size card kpi-row @544 improved (err 53 → 32).
- `tls.c.hero` `size.preferred` = max(poster, `size.min`): the default poster is 317 tall with true
  widths (title one line at 1920), below RV10's honest min 472 (catalog-conformance min ≤ preferred).
  `tls.c.testimonial` preferred 420 → 367 (poster, no min conflict).

**Tests re-baselined, with reasons.** `slide-compiler.spec` — two inputs lengthened (the "tall" body
now wraps; `long` 12 → 16 repeats so the left column really overflows). `layout-anchor.spec` — the
`metrics: 'estimate'` runs that stood for "what the compiler saw" now use the default.
`layout-calibration.spec` — the LO5 ms_11 "editor wraps" test now asserts no screenshot needed by
default and the reason still fires with `metrics: 'estimate'`; the fixture ratchet tightened
< 0.3 → < 0.12 plus "no editor reasons". `tls-t-statement.spec` — the ">200 units further right"
comparison calls `estimateMetrics` explicitly. `tls-c-hero.spec` — preferred = max(poster, min).
`tls-g-roadmap.spec` — the edge label lengthened so it really exceeds its bar. Snapshots: none
changed. Size cards: 3 entries (testimonial preferred, kpi-row @544, title min); hints file and
digest unchanged.

**Gates.** tsc prod 0, spec 329 (= before). Targeted jest, `--maxWorkers=1`, non-parity: all
`src/blocks/*.spec` (incl. layout-report/-layers/-anchor/-calibration, block-metrics,
capability-digest, slide-compiler, collision, slide-layouts, slide-composition, demo contract,
round trips, motion), `layout/`, `motion/`, `icons/`, and `src/blocks/library` in four chunks
(chrome+text+media+layout 55 suites, composite 33, data+diagram+conformance+list-sizes+motion 56):
pass. `chrome-sizes` passes. eslint: 0 new errors on touched files (1 pre-existing in
`tls-c-hero.spec.ts:947`). Parity probes run: `parity.spec`, kpi-tile, title pass;
**`tls.t.statement` "DOM and SVG agree" fails, and fails on HEAD too** (checked by swapping in
HEAD's `layout.ts`/`layout-child.ts`: off by 5 in x) — the `emphasis` group's offset is applied by
the DOM renderer and not by the SVG one (LO0 note 5); with true widths the highlighted run moves to
line 1, so the offset (and diff) is now 107.8 in y. Not fixed (SVG group translation is renderer
scope), added to LO8. `tls.c.testimonial` parity not re-run (known failing on HEAD).
Out of scope, pre-existing: `DeckViewer.spec` (user's uncommitted change), `BlockInserter.spec`
"hides empty categories" (expects no `timeline` category; unrelated to metrics).

**Scope cuts / open, named.**
- The full library parity run is too heavy for this box: a chunk with parity probes was reaped for
  low memory (probes timed out at 60 s while thrashing). Parity was run only for the blocks whose
  layout changed; the rest ran with `-t '^(?!.*parity)'`. `jest` also needs `--forceExit` (parity
  worker keeps it alive, LO8).
- Kit slack factors not retuned (above); 26 shrink-wrapped labels paint ≤ 12 units past their box.
- `estimateMetrics` itself not recalibrated; it is no longer on any default path.
- No `tools/visual` scenario in the Next.js app: the calibration harness bundles the same
  `<DeckViewer>` render path and was the browser check. `build:packages` not run.

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

### Notes — LO3 / LO4 (2026-10-08)

**Size cards (LO3).** Per block, at reference widths 1728/840/544 (`null` below `size.min[0]`):
the example (`describe.example.props` over `defaults`) is measured once per width; the model then
varies **one** prop — the first required content `list`/`series` slot (items, from its min ≥ 1 to
its max, capped at 8, example items cycled), else the content text slot with the largest
`maxChars` (synthetic text sized for 1-4 lines from the example's chars-per-line, capped at
`maxChars`), else nothing (`fixed`) — and fits `h ≈ base + per·x` by least squares with
`err = max |model − measured|`. `poor` when `err > max(8, 5% of the tallest sample)`; the index
then prints the sampled range (`h 164–222@840`) instead of a line. Built-in census: 21 lines,
45 items, 10 fixed, 48 `fill` (elastic at every usable width: charts, images, diagrams, stretch
containers), 5 containers with a `blocks` slot (no model, note says so); 9 cards have a model
`null` at some widths because the block is elastic there only (e.g. `tls.t.quote` clamps at its
preferred height when narrow). Html-kind blocks are measured from their poster → `confidence:
medium`. Generation: ~1 s in node, ~3 s inside jest.

**Deviation: two generated files.** `capability-digest.ts` cannot `import` the JSON — the package
tsconfig is `composite` and its `include` lists only `.ts`, so tsc fails with TS6307 (verified).
Rather than touch tsconfig, the generator also writes `__generated__/block-size-hints.ts`
(type → hint string). One script writes both, one spec checks both
(`node tools/layout-report/gen-block-metrics.js`). `CapabilityIndexEntry.size` is the hint; the
`capability-digest.spec.ts` kpi-row `toEqual` now includes it.

**Model vs `measureBlock` on content the generator never saw** (`block-metrics.spec.ts` pins
these; x_est = planner estimate `ceil(chars / (0.85·cpl))`):

| block @w | var | x | x_est | model | measured |
|---|---|---|---|---|---|
| tls.t.title @840 | lines | 6 | 6 | 622 | 622 |
| tls.t.callout @840 | lines | 4 | 4 | 259 | 259 |
| tls.t.body @1728 | lines | 3 | 4 | 122 (162 with x_est) | 122 |
| tls.c.testimonial @840 (html) | lines | 6 | 6 | 532 | 533 |
| tls.l.section @840 | lines | 2 | 3 | 298 (351 with x_est) | 299 |
| tls.t.bullets @840 | items | 5 | – | 277 | 277 |
| tls.d.ranking @840 | items | 6 | – | 504 | 504 |
| tls.c.contact @840 | items | 3 | – | 412 | 412 |

Given the true line/item count the model is within 1 unit; the error budget is the planner's
line estimate, which with the 0.85 factor over-counts (safe side) and never under-counted here.
Poor fits are where the shape is not linear: `tls.g.steps` (err 66 @840), `tls.c.team` (239
@1728, rows of 4), `tls.c.feature-grid` (100), `tls.c.kpi-row` @544 (wraps).

**CLI (LO4).** `node tools/layout-report/cli.js deck.json [--slide id|index] [--format text|json]
[--no-map] [--text-metrics table|estimate] [--dist]`, `--metrics [--types a,b]`, `-` = stdin. TS in
plain node: `load.js` bundles `src/blocks/index.ts` in memory with the repo's own esbuild 0.14
(the one `lask` uses) and `tsconfig.build.json` (paths + `jsx: react`), compiled as a module
inside the package so `react` resolves; `--dist` loads `dist/index.js` instead. `@swc-node/register`
(the parity worker's loader) was tried first and does not resolve the `~` path aliases. No
dependency added or changed. Fixture decks (whole deck, wall clock incl. bundling): demo 8 slides
0.43 s (3 warnings, screenshot sl_01, sl_07), tour 29 slides 0.58 s (clean), colorful 46 slides
0.74 s (1 warning), motion-showcase 12 slides 0.46 s. `--dist --metrics` output is byte-identical
to the committed JSON.

**Build/exports.** `measureBlock, analyzeSlide, analyzeDeck, formatLayoutReport, buildBlockMetrics`
(+ `sizeHint`, `blockSizeHints`, the stringifiers, `METRICS_WIDTHS`, all types) reach the package
root through `export * from './blocks'`. `turbo run build:packages` exit 0;
`require('packages/tldraw/dist/index.js')` exposes all of them in plain node.

**Scope cuts, named.**
- **ESM dist in raw node fails** (`import()` of `dist/index.mjs`: `@tlslides/core` is CJS without
  named ESM exports). Pre-existing, unrelated to LO4; bundlers (Next.js) are fine, and the CLI
  uses CJS. A Next.js API route import was not exercised (Next wiring stays deferred).
- One model per block, one varied prop. A card with title + body varies the body; an `items`
  model assumes example-length items (multi-line items are taller than `per`).
- Default theme only. A theme with a bigger type scale (midnight) changes heights; the oracle
  (`analyzeSlide` with the deck's tokens) is the answer there, not the card.
- Negative bases (`h≈-18+59/item`) are the honest least-squares intercept (no item → no gap),
  not clamped.
- The CLI's exit status ignores findings (FastAPI reads `summary`); no `--fail-on-error`.
- Not done here: no visual scenario (headless data + CLI; LO5 owns browser calibration).
- tsc prod 0, spec 329 (= before); eslint 0 errors on touched files (warnings: non-null
  assertions, same style as neighbours).

### Notes — LO5 / LO5b (2026-10-08)

**Harness.** `tools/layout-report/calibrate/run.js` bundles the real `<DeckViewer>` render path
(working tree, React 17 from the package) + the 4 fixture decks into a scratch dir with the Inter
woff2/@font-face that `examples/nextjs-sample` serves (`next/font`, Inter variable — Inter loaded,
checked via `document.fonts`), then ONE headless Chromium page at 1920×1080 (scale 1, reduced
motion, build step 999) visits all 95 slides (~40 s). Per block: union of painted DOM leaves (text
node `Range` rects expanded to the line-height, svg geometry `getBoundingClientRect`, img, any
box with a background/border; full-box backdrops excluded, as in `collectPaintedLeaves`); per
layout text leaf: rendered lines, rendered line widths, and the browser's own wrap of the same text
at the box width (+3% / +2 units tolerance, see below). `compare.js` joins with `analyzeDeck`
(`table` and `estimate`). Raw JSON stays in `$TMPDIR/tls-calibration` (not committed). All 289
compiled boxes matched the DOM wrappers exactly (0 units).

**Calibration (painted height, report vs DOM; 280 layout-kind + 9 html-kind blocks).**

| set | before LO5 fixes | after |
|---|---|---|
| layout kind, `table` (report default): median / p95 / blocks > 5% | 0.0% / 1.0% (6.0 units) / 9 | 0.0% / 0.6% (4.0 units) / 6 |
| layout rigid / elastic, `table` p95 | 0.5% / 3.3% | 0.5% / 0.6% |
| layout kind, `estimate` (= what the editor paints), abs p95 | 4.0 units | **0.7 units** |
| html kind (export poster vs live HTML) median / p95 | 2.1% / 4.4% (20 units) | same (not touched) |
| text line width, DOM ÷ `table` − 1: median [p05, p95] (1287 lines) | +4.9% [−3.0%, +22.3%] | **−0.2% [−4.2%, +5.0%]** |
| text line width, DOM ÷ `estimate` − 1 | −8.5% [−22.4%, +25.5%] | same (editor unchanged) |
| text lines ≠ browser wrap, `table` (1595 leaves) | 56 (3.5%, strict) | 2 (0.1%) |
| text lines ≠ browser wrap, `estimate` | 67 (4.2%, strict) | 13 (0.8%) |

"Strict" = wrap at exactly the box width; 50 of those 56 were shrink-wrapped labels (box = the
text's own estimated width: "Churn", "Enterprise") that the DOM paints unwrapped 1-3 px wider than
the box — invisible, so the after column uses +3%/+2 units. Line-count mismatch rate per block:
html 4 of 9 (hero 4 vs 5 lines, kinetic-title 4 vs 7, feature-reveal 12 vs 13, feature-grid 7 vs
8) — the poster wraps differently from the HTML template.

**Worst blocks, and why.**
- `tls.t.body`/`caption`/`subtitle`/`takeaway` (ms_11, sl_06, sl_03; 50% height): the *editor*
  (`estimateMetrics`, 0.5385 em average) wraps a line that really fits to 2 lines; the DOM paints
  that. Report (true width) says 1. Same root cause for `tls.c.team` tl_16 (8.5%: 18 text leaves
  on screen vs 16) and the 5 remaining > 5% layout blocks.
- `tls.g.arrow` sl_41 (82%) and `tls.m.decoration` sl_45 (9%): `pathBounds` used Bézier control
  points. **Fixed** (exact extrema) → 0.
- `tls.m.image` demo sl_06: asset not resolvable in the harness (alt text painted). Harness only.
- Old `tableMetrics` Inter table was ~10% narrow per glyph vs the Inter the app serves (c +30%,
  z +32%, "1" +47%, "%" +54%; accented Vietnamese/"…"/"→" used a 0.5385 default) and ignored
  `letterSpacing` (−0.03 em on every text node) and bold. **Fixed:** the browser-measured table
  (`_chart/inter-width.ts`, RV04 — re-measured here, identical) moved to `layout/inter-metrics.ts`
  (+ Đ đ © ® ™ ∞ ≈ ≤ ≥, NFD base for accented Latin) and `tableMetrics` uses it, adds letter-spacing
  per character, `INTER_BOLD_FACTOR` 1.05 for bold runs (measured 400→700: a-z 1.057, A-Z 1.029,
  digits 1.047) and run `size`. Consumers of `tableMetrics` (chrome/composite kits, statement,
  oracle, size cards) now measure true width. `estimateMetrics` and its average are untouched.
- Screen overflow the report could not see before: 23 rendered (estimate) lines wider than their
  box (score-pill/table headers +5-7%, ≤ 4 units) — under the 3-unit+tolerance check, left alone.

**Decision: the editor stays on `estimateMetrics` in LO5.** Data says `tableMetrics` is the
better editor metric (±5% vs −22/+25%; 0.1% vs 0.8% wrong line counts), but `estimateMetrics` is
the layout of record for compile, DOM, SVG, export, autofit and ~10 block kits (`slide-layouts`
title band slack, table kit, chart kit, closing …), so switching moves every fixture's boxes and
snapshot. That is its own phase (proposed **LO6 — editor on tableMetrics**: flip
`createLayoutContext`'s default, rebaseline goldens/collision, screenshot every fixture). Until then
the report detects the disagreement itself (below), which covers every > 5% layout error found.

**`needsVisualCheck: Array<{blockId, reason}>`** (was `string[]`; one entry per block, first
reason wins), formatted as one `screenshot: id (reason); …` / `screenshot: not needed` line:
1. confidence ≠ high (html poster ±5%; host without poster; layout threw);
2. editor disagreement (when the report's metric is not `estimate`): the block re-laid with
   `estimateMetrics` has a different text-leaf count or line count ("the editor wraps `text` to
   2 lines on screen; its real width needs 1"), or an editor line's true width runs > 3 units past
   its text box;
3. near threshold: a non-elastic, painting block whose content ends within `NEAR_MARGIN` of the
   frame edge or of the painted content of the next block below/beside it (`high`: max(4 units,
   2% of its height) ≈ 4× the measured p95 error; `medium` max(12, 5%); `low` max(24, 10%);
   horizontally 5% of its widest text line = the width p95).
Fraction of slides needing a screenshot: **demo 3/8 (38%), tour 8/29 (28%), colorful 4/46 (9%),
motion 6/12 (50%) — 21/95 (22%)**; 26 of 289 blocks (9 html poster, 10 editor wraps, 6 editor
lines past their box, 1 leaf count). Near-threshold fires on none of the fixtures (gaps are ≥ the
24-unit `space.md`), and on a synthetic body 2 units above the frame bottom (tested). The CLI's
`summary.needsVisualCheck` stays a slide-id list.

**LO5b composition hints** (thresholds in `layout-report.ts`): `layout/unbalanced` info when ≥ 60%
of the frame is free and the empty band below the content is ≥ 40% of the frame height and ≥ 2×
the top margin (fix: "fill ~N more units of height … or centre (move down ~N/2)"), else the same
for the right side (≥ 40% width, ≥ 2× left) except cover/section/closing slides (left-aligned
titles are a design choice) or when an empty region explains it; `region/empty` info for a
declared region ≥ 8% of the frame with no block; `layout/crowded` warning below 10% free. On the
fixtures (95 slides): **13 `layout/unbalanced`** (demo sl_02/04/07, tour tl_03/16/19/24/25,
colorful sl_03/04/10/27, motion ms_10), **3 `region/empty`** (colorful sl_04 `title`, sl_09
`text`, tour tl_26 `right`), **0 `layout/crowded`** (minimum free is 22%). Colorful sl_04: "content
ends at y 502: the bottom 578 units (54%) are empty, 276 at the top … fill ~302 more units of
height … or move it down ~151". Pinned as ratchets in `layout-calibration.spec.ts`.

**Tests / gates.** New `layout-calibration.spec.ts` (14). Changed: `layout-report.spec.ts`
(needsVisualCheck shape; the frame-edge test's title "Edge" → "Edge of the frame": with true widths
a 4-letter title no longer paints past x 1920, the box still does), snapshots of demo sl_03/sl_08
and the LO2 stacked example (true widths, the new `screenshot:` line), `capability-digest.spec.ts`
kpi-row size hint (regenerated card `h≈180-6/item@840`), `block-metrics.json`/`block-size-hints.ts`
regenerated (16 hints changed). **`tls.x.footer-text` `size.min` 380 → 400**: with true widths
its own example ("Annual review 2026 · Confidential") ellipsised at 380 (`chrome-sizes.spec.ts`
RV11 caught it; before, the narrow table hid that the DOM text was wider than its share). Passing with `--maxWorkers=1`: layout-report/-layers/-anchor/
-calibration, `layout/`, block-metrics, capability-digest, slide-compiler, collision,
slide-layouts, slide-composition, and `src/blocks/library` (144 suites, non-parity tests: 4838
pass). Parity probes:
`tls.c.testimonial` "DOM and SVG agree" fails (x off by 2) — **fails identically on HEAD**
(checked in a detached worktree), pre-existing. tsc: prod 0, spec 329 (= before).

**DeckViewer.spec.tsx verdict.** On HEAD (detached worktree, `git show`-equivalent, no stash):
17/17 pass. The failure "retreating into an auto build step" comes from the user's uncommitted
`DeckViewer.tsx` change (`retreat` now skips auto steps back to the last click), i.e. the spec
encodes the old behaviour. Not touched.

**Scope cuts / open, named.**
- Editor still `estimateMetrics` (LO6 above); `estimateMetrics` itself not recalibrated.
- html-kind posters not corrected (4/9 wrap differently); they stay `medium` → always screenshot.
- Harness reuses the Next sample's `.next` font files; `run.js --font-css` to point elsewhere.
- Kerning ignored (sum usually ≤ 3% wide); italic/other weights not measured.
- No `tools/visual` scenario: the calibration harness *is* the browser check (shots via
  `--shots`; colorful sl_04 and motion ms_04 looked at: Inter rendered, layout as the report says).
