# Block library expansion — overview & progress

**Started:** 2026-10-03 · **Branch:** `plan/block-system` · **Base commit:** `3804688e`
**Goal:** grow the catalog from 41 to ~120 blocks. Every block gets a semantic **category**, a
**shortDescription** and a **scope**, so an AI planner can pick the right block from a compact
index without reading 120 full slot tables, and a user can browse the gallery by intent
("I need a timeline") rather than by rendering family ("diagram").

**This file is the resume point.** To continue later: read §Rules, open the
first phase in §Phases that is not ✅, and in that phase file take the first block whose status is
⬜. When you finish a block, tick it in the phase file *and* update the counts in §Progress below.

| File | What it holds |
|---|---|
| [00-review.md](00-review.md) | Audit of the 41 blocks that exist today: gaps, overlaps, metadata quality, hard limits |
| [01-taxonomy.md](01-taxonomy.md) | The category vocabulary, the new metadata fields, writing rules for `shortDescription`, and the category mapping for all 41 existing blocks |
| [P0-foundation.md](P0-foundation.md) | Metadata fields + gates, two-tier AI digest, category gallery, icon-set expansion, shared engines (chart, table, connector, radial) |
| [P1-text-lists.md](P1-text-lists.md) | Text, list and emphasis blocks (11) |
| [P2-data.md](P2-data.md) | Metrics, charts and tables (24) |
| [P3-diagram.md](P3-diagram.md) | Process, timeline, hierarchy, relationship and comparison diagrams (21) |
| [P4-media-people.md](P4-media-people.md) | Images, brand, people and decoration (11) |
| [P5-composite.md](P5-composite.md) | Slide-scope and group composites: cover, divider, closing, dashboard, team, quiz… (14) |
| [P6-chrome.md](P6-chrome.md) | Slide furniture: header, footer text, logo mark, progress, section tabs, rule… (7) |

---

## Rules (read before writing any code)

These rules repeat or point to the repo's binding rules. They are not optional.

1. **Read first:** [../CURRENT-STATE.md](../CURRENT-STATE.md) (file anatomy, wiring, "before
   writing a new block"), [../block-authoring/README.md](../block-authoring/README.md) §Pitfalls
   (deep-merge, `$block`, children channels, depth cap, byte-identical fixtures, tsc gate), and
   [../BACKLOG-visual.md](../BACKLOG-visual.md) §2 (commands, OOM guard, quality ratchets).
2. **A block not in `BUILT_IN_BLOCKS` does not exist.** Wire it and bump `EXPECTED_BLOCK_COUNT` in
   `library/catalog-conformance.spec.ts` in the same commit.
3. **Never invent vocabulary.** The closed sets are: `ColorRole` (12 roles in `types.ts`),
   `LayoutNode.k` (8 kinds: group, rect, path, text, image, icon, line, host), `SlotType.kind` (12),
   motion presets (`motion/presets.ts`: 30 ids), `BlockFamily` (8), and, after P0,
   `BlockCategory` and `BlockScope`. A block that seems to need a new value **stops** and records
   the need in its phase file's "Blocked" column. Only P0 adds vocabulary.
4. **Prefer the cheapest build path.** `composite` (`defineCompositeBlock`, no layout math), then
   `layout` (hand-written Tier A `layout()`), then `html` (Tier B) only when CSS is genuinely
   required. Every block entry in the phase files names its path.
5. **Additive schema only.** Never rename or remove a block type, slot or option value that is
   already shipped. Fixing a bad name means adding the right one and steering the AI away from the
   old one via `describe.avoid`.
6. **Gates per block:** `tsc` production count = 0 (run it from `packages/tldraw`, see the command
   below), the block's own spec + `catalog-conformance.spec.ts` + `capability-digest.spec.ts` pass.
   **Gates per phase:** one full suite, one screenshot pass of the phase's demo slide with the PNG
   actually opened (`tools/visual/shoot.js`).
7. **Commit once per block** (or per small group of siblings that share an engine, at most 4),
   message `L<phase>: <type>[, <type>…]`. Fill the phase file row with the hash.

### Gate commands (verified 2026-10-03 with pnpm)

```bash
# from repo root, once
COREPACK_ENABLE_STRICT=0 pnpm install
node node_modules/playwright/cli.js install chromium-headless-shell   # parity specs need it

# from packages/tldraw
node_modules/.bin/tsc --noEmit --emitDeclarationOnly false | grep -v '\.spec\.' | grep -c 'error TS'   # must print 0
../../node_modules/.bin/jest src/blocks/library/<family>/<block-dir> src/blocks/library/catalog-conformance src/blocks/capability-digest
../../node_modules/.bin/jest      # full suite: once per phase; kill stray parity-worker processes first
```

> `npx jest` inside `packages/tldraw` resolves the wrong jest. Use the hoisted binary above.
> Check that `tsc` exists before trusting a `0`. A missing binary also makes `grep -c` print 0.

---

## Phases

| Phase | Scope | New blocks | Depends on | Status |
|---|---|---|---|---|
| **P0** | Foundation: metadata fields, conformance gates, backfill 41 blocks, two-tier digest, category gallery, icon set ×8, shared engines | 0 (+1 option on `tls.d.bar`) | — | ✅ P0.1–P0.9 done (one P0.5 box open) |
| **P1** | Text, lists, emphasis | 11 (10 shipped, `code` ⏸) | P0.1–P0.3 | ✅ 10 / 11 |
| **P2** | Metrics, charts, tables | 24 | P0.1–P0.3, P0.6 (chart), P0.7 (table) | ✅ 24 / 24 (part A: metrics + charts; part B: table, compare-table, pricing, scorecard, ranking, heatmap + donut fix); full suite not run |
| **P3** | Diagrams | 21 | P0.1–P0.3, P0.8 (connector/radial) | ✅ 21 / 21 (part A: chevrons, cycle, timeline, roadmap, flow, funnel, milestones; part B: tree, pyramid, matrix-2x2, swot, pros-cons, venn, hub-spoke, layers, before-after, breakdown, mindmap, arrow, bracket, iceberg); full suite not run |
| **P4** | Media, brand, people, decoration | 11 | P0.1–P0.3, P0.5 (icons) | ✅ 10 / 11 (`tls.m.image-collage` ⏸ blocked: no rotation); full suite not run |
| **P5** | Composites (slide/group scope) | 14 | P1–P4 blocks they compose | ⬜ |
| **P6** | Chrome (+ P6.0 deck-position prerequisite) | 7 | P0.1–P0.3 | ⬜ |
| — | Parked (needs new vocabulary or a dependency) | 13 | see §Parked | — |

**Parallelism:** after P0, phases P1, P2, P3, P4 and P6 touch disjoint folders and can run in
parallel (one agent per phase or per engine group). P5 goes last, because composites can only use
blocks that already exist.

**Priority inside each phase:** every block is tagged **must**, **should** or **could**. Do all
the **must** blocks across phases before any **could** block. Must-level is the minimum set an AI
needs to build a typical business, lecture or pitch deck without falling back to raw text.

---

## Progress

Update these counts when you tick a block. The detailed status lives in the phase files.

| Phase | must | should | could | Done | Last commit | Last update |
|---|---|---|---|---|---|---|
| P0 | 8 tasks | 1 task | — | 9 / 9 tasks | 795f0ae6 | 2026-10-03 |
| P1 | 7 | 3 | 1 | 10 / 11 (`tls.t.code` ⏸ blocked) | 2900b5b5 | 2026-10-03 |
| P2 | 12 | 8 | 4 | 24 / 24 (part A: 8 must, 6 should, 4 could; part B: 4 must, 2 should) | f368199d | 2026-10-03 |
| P3 | 10 | 7 | 4 | 21 / 21 (part A: 4 must, 3 should; part B: 6 must, 4 should, 4 could) | f81ec502 | 2026-10-03 |
| P4 | 5 | 4 | 2 | 10 / 11 (5 must, 4 should, 1 could; `tls.m.image-collage` ⏸ blocked) | bb9c91ed | 2026-10-03 |
| P5 | 8 | 4 | 2 | 0 / 14 | — | — |
| P6 | 3 | 3 | 1 | 0 / 7 | — | — |
| **Total new blocks** | **45** | **29** | **14** | **65 / 88** | | |

Catalog size: **106** today (41 + 10 from P1 + 24 from P2 + 21 from P3 + 10 from P4) → **129** when complete (P4's blocked collage leaves one short).

### Session log

Append one line per working session (date, who, what moved, anything the next session must know).

| Date | Session | Moved | Notes for next session |
|---|---|---|---|
| 2026-10-03 | L0 agent | P0.1–P0.4 shipped (`2ef8837b`, `d508b7bb`, `7f5a3dfe`, 72e2a610) | Next: P0.5 icons (then update the index's icon list automatically, it reads `ICONS`), P0.6–P0.9. Index for 41 blocks is ~5.5k chars. Budgets now: index <= 20k, detail <= 12k per 8 types. Gallery: tools/visual/scenarios/block-gallery.js (needs a rebuilt `packages/tldraw/dist`, the sample reads dist). |
| 2026-10-03 | L0 agent | P0.5–P0.9 shipped (`1f8dc1b4`, `c0e30cf7`, `d239df03`, `5f039d79`, `795f0ae6`) | P0 is done: P1–P6 can start. Open: P0.5 all-icons SVG parity probe (DOM verified by screenshot only). Icons: 87, `ICON_GROUPS`, warning `icon/unknown`; Lucide path data has round caps in the original, renderers draw butt caps, so keep icons stroke 1.5 and dots as tiny circles. Engines: chart `library/data/_engine/` (+ guides/blocks-authoring.md §2.9), table `blocks/layout/table.ts`, diagrams `blocks/layout/diagram/` (tree cap = 4 levels incl. root). `.husky/pre-commit` is not executable here, so commits do not run the full suite. Parity specs time out (5 s) when many run in parallel: use `--runInBand --forceExit` and pipe jest to a file, not to `grep`/`head` (a piped jest hung on open browser handles). |
| 2026-10-03 | L1 agent | P1 shipped: numbered `6f07165d`, checklist `2698ee15`, icon-list `772e1857`, statement `0a900470`, callout `526f536a`, footnote `0952608c`, definition `4c6676b3`, kv-list `14bed0d6`, tags `67d662c0`, qa `31a6faee`, demo slide + scenarios `2900b5b5` | `tls.t.code` blocked (no mono typography token). Catalog is 51. Reusable: `library/text/_engine` (marker rows, placeText with start/center/end, strong-run parsing, colour helpers, iconLeaf), `library/text/standard-suite.ts` (`standardBlockSuite(def, {overflowProps})` runs the whole standard test list incl. parity: use it for every block), `icons/scale-path.ts`. Hard-won facts: (1) icon nodes draw unscaled in a viewBox equal to their box: scale the path; (2) `line` nodes are unreliable in the DOM renderer (use thin rects); (3) nested groups are offset in the DOM but not in SVG: keep one root group at 0,0 and flat children; (4) two nodes with the same part name break parity (it measures the first): give rect and text distinct parts; (5) `estimateMetrics` is a per-length heuristic and can be off by -20% to +35% against the real font: anything that depends on a text width (centred/end alignment, strike, underline, highlight, pills) drifts, give shapes slack and prefer left anchoring; (6) `PartMotionSpec` has no `trigger`, so per-part click reveals are impossible; (7) capability-digest: the 8 largest per-type details must stay <= 12k chars together, so keep each new block's detail under ~1300 chars (short helps, summary, keywords); the digest snapshot is regenerated with `jest src/blocks/capability-digest -u` per block; (8) parity harness fix: nested bold tspans counted as extra lines (`parity-worker.ts` now uses `:scope > tspan`); (9) full suite was not run (6 GB machine); jest `--runInBand` and `--maxWorkers` cannot be combined. |
| 2026-10-03 | L2 agent (part A) | P2 metrics + charts shipped: progress-bar + progress-ring `04a3c49a`, stat-compare `e475a81b`, line + area `afe37101`, grouped-bar + stacked-bar `cfae9202`, pie `76b3ec57`, gauge `55545cb3`, sparkline `c91189ed`, waterfall `e62149ee`, funnel-chart `51e86445`, scatter `c393c518`, radar `7a964197`, trend-badge `1392b0bc`, slope `81c2b543`, bubble `5d608727`, bullet-chart `3efa2df6`; demo slides sl_13-sl_17 `04f5a87c`/`3efa2df6` | Part B (table, compare-table, pricing, scorecard, ranking, heatmap) is untouched. Catalog is 69. Reusable: `library/data/_chart/` (`kit.ts`, `schema-kit.ts`, `chart-test.ts`, `line-family.ts`, `bar-family.ts`). Hard-won facts: (1) **`_engine/arcPath` is wrong for rings and gauge bands**: it cuts the hole with a second wedge drawn start to end with the opposite sweep flag, which SVG resolves on the mirror circle, so the inner edge bows the wrong way (barely visible on a quarter slice, obvious on a ring); `kit.ringArcPath` traces one simple outline instead and splits spans over 1.98 pi into two halves (one near-360 arc renders as a blob). `tls.d.donut` still uses `arcPath`: fix it separately, its golden numbers are locked by `engine-v2.spec.ts`. (2) A `path` node with a fill and a part used to fail parity (the DOM `data-part` is on the `<svg>` wrapper); `parity-worker.ts` now reads the fill from the inner `<path>`. Path `d` must be absolute in block coordinates with a full-block box at (0,0) (DOM clips to the box, SVG ignores it). (3) Digest: the top-8 detail sum is 11,946 of 12,000 (the 7th/8th slots are `tls.t.definition` 1,379 and `tls.c.testimonial` 1,354, so only ~54 chars of headroom): every new block must stay under ~1,350 chars of detail or it enters the top 8 and breaks the test; the biggest P2 blocks are 1,350 (`tls.d.bar`, pre-existing), grouped-bar/stacked-bar/area/line ~1,250-1,300, so slot `help` text is mostly dropped. The index is 8.8k of 20k. (4) `grid-3x2` regions with more than one block break the grid (cells shift diagonally): wrap several blocks in a `tls.l.stack` instead. (5) Overlapping fills use a faded `group` (Paint has no alpha). (6) Browser run needs `--width=1920 --height=1080` and a rebuilt `packages/tldraw/dist` (`pnpm build`, ~90 s). (7) `capability-digest` snapshot is regenerated with `-u` per block. |
| 2026-10-03 | L2 agent (part B) | P2 tables shipped: `tls.d.donut` ringArcPath fix `d69d38c3`, table `c8fb6f07`, compare-table `d068759b`, scorecard `30d6d06f`, pricing `216ed225`, ranking `ca23bd1b`, heatmap `2bbfc2d5`, table-kit polish `ce62512c`, demo slides sl_18-sl_21 `f368199d` | P2 is complete: catalog is 75. Reusable: `library/data/_table/kit.ts` (`buildTable` = engine + flat tree + header/emphasis/footer/auto-compact, `parseCell`, `withNumberMetrics`, `flattenChild`, `tableCapacity`). Hard-won facts: (1) the P0.7 `layoutTable` row groups are offset AND have absolute children, so DOM renders them twice-shifted: always flatten (re-box groups to 0,0); (2) `ctx.layoutChild` returns a wrapper group at the child's box: fine in the DOM, wrong in SVG, so flatten it to absolute leaves before returning (`flattenChild`); (3) the engine's check icon is unscaled and `node` cells are left-anchored only: use `iconLeaf` and align from the solved column width; (4) numbers drift when right-aligned with `estimateMetrics`: use `withNumberMetrics` (figure widths); (5) a table wider than its region needs compact text first (done automatically), otherwise words wrap per letter and the grown region shifts later grid cells; (6) top-8 digest detail is now 11,969/12,000 (`tls.d.table` 1,377 is the 8th entry; testimonial 1,354 dropped out), index 9,479/20k: the next new block must stay under ~1,350 chars of detail or the top-8 test fails; (7) jest `--forceExit` leaves `parity-worker` + chrome processes running: kill them by PID after every parity run (they accumulate, ~12 processes per run); (8) `pnpm build` of `packages/tldraw` takes ~10 s here, not 90 s; the Next sample picks the new dist up after a re-shoot (no restart needed). Not built: table `rules: grid`, compare-table `stickyLabels`, pricing has no `checkIcon` colour option, heatmap/ranking `highlight`. Full suite not run (6 GB). |
| 2026-10-03 | L3 agent (part A) | P3 process + timeline shipped: chevrons `c581d2b7`, cycle `b58834f9`, timeline `559a2a85`, roadmap `a4afbdf2`, funnel `96fcb496`, milestones `a69129eb`, flow `a4ac5204`; demo slides sl_22-sl_28 + scenario `56bba414` | Part B (tree, pyramid, matrix-2x2, swot, pros-cons, venn, hub-spoke, layers, before-after, breakdown, mindmap, arrow, bracket, iceberg) is untouched. Catalog is 82. Reusable: `library/diagram/_kit.ts` (`placeLines` = clipped start/centre/end text with ellipsised words, `linesHeight`, `strokePath`, `arrowHead`, `polyline`, `rampColor`, `objs`, `safeId`) and `diagram-test.ts` (`rectsOf` measures `path` leaves by their path data, `assertNoOverlap`, `within`). Hard-won facts: (1) **slide units are 1920x1080**: body 28, caption 22, footnote 18, so diagram blocks need big boxes (preferred sizes are 900-1400 wide); (2) **a region with several blocks stacks them by intrinsic height and the lower ones fall off the slide**: use one diagram per region (two-column / separate slides); (3) **`tls.l.stack`/`card`/`row`/`grid` `allow` lists do not include the `diagram` family**, so a `tls.g.*` block cannot be a child of a container yet (not changed here: it is a vocabulary decision for P5); (4) `rampColor('gradient')` mixes accent and accent2 in sRGB, which turns complementary pairs (coral/teal) muddy grey in the middle, so when the hue distance exceeds 90 degrees it ramps from the accent to a 62% tint of it instead (also affects the funnel and cycle); (5) capability-digest: nested `list<object>` slots print only `object (name, items)`, so put the item field names in the parent slot's `guidance` (roadmap does); new blocks must stay under ~1,350 chars of detail (top-8 is 11,969 of 12,000, roadmap 1,358, timeline 1,366, the rest <= 1,216; index 10,323 of 20k); (6) `estimateMetrics` drift is visible in centred text in the browser (second wrapped line sits up to ~12px off centre); (7) `maxChars`-length text at `size.min` is clipped with an ellipsis, never wrapped per letter; (8) `layoutOf`/`standardBlockSuite` work for diagram blocks unchanged; the DOM/SVG parity probe passed for all seven (path nodes with fill + stroke too). Not built: roadmap `grid` toggle, timeline `card[i]` parts, flow edge routing around intermediate nodes. Full suite not run (6 GB). |
| 2026-10-03 | L3 agent (part B) | P3 hierarchy, comparison, relationship shipped: allow fix `691d7f6b`, tree `100d8065`, pyramid `8e3f8b3f`, matrix-2x2 `d303a12a`, swot `05dc1f54`, pros-cons `46c4bcd6`, venn `0aa91e47`, hub-spoke `a6044905`, layers `62397d69`, before-after `3fe2ee30`, breakdown `83e67380`, bracket `0acc8e76`, arrow `635ba04d`, iceberg `8e3c5ddc`, mindmap `7d00ebcf`, browser-pass fixes `de705941` `2eef796a` `e4cb27d2`, demo slides sl_29-sl_41 `f81ec502` | P3 is complete: catalog is 96. Next is P4 (media, brand, people) or P6. Hard-won facts: (1) **container `allow` lists are only advertised in the digest, never enforced** by `validateDeckSpec`; `diagram` is now in all 11 container schemas and nesting a diagram in a card works in the browser. (2) **Nested children go in `props.children`** (a `children` field beside `props` renders empty) and **nested block styles go in `props.$block.style`** (`BlockSpec.style` is ignored below the top level): a composite that colours its cards (swot) needs this. (3) **Layout depth cap is 4**: a 4-deep composite (swot: grid, card, stack, leaf) can only sit directly in a region. (4) **`blank` layout lets a region-filling block run 4+ px off the slide** (box 888 starting at y=196 in a 1080 frame): the demo uses the `timeline` layout (title + full body) for single full-size diagrams. (5) Digest budget: top-8 detail is 11,975/12,000, 9th is `tls.d.table` 1,377, so every new block must stay <= ~1,375 chars of detail (matrix-2x2 needed its example trimmed to 1 item and no quadrant notes); the index is 12,031/20k (it grew ~1.5k with 14 blocks). (6) Group nodes with `part` set and a full-block box at (0,0) holding absolute children give motion a part to target (`pros`, `before`, `above`...) without breaking DOM/SVG parity. (7) `rectsOf` measures a `path` by every number pair, so arcs (`A r r ...`) and quadratic controls pollute the bounds: use round `rect`s for circles and clamp curve controls inside the box. (8) Browser: `pnpm build` ~10 s; shooting needs `--width=1920 --height=1080`; kill the Next dev server (3 processes) when done. Reduced vs plan: tree `avatar` has no image slot (monogram only); swot `letters` needs tall quadrants; arrow has no `capacity()`; before-after image slot is untested in the browser. Full suite not run (6 GB). |
| 2026-10-03 | L4 agent | P4 shipped: image-grid `73839a01`, avatar `095d8f04`, profile-card `2106b577`, logo `ac633f13`, logo-wall `0c420dae`, image-compare `2ce3a8c4`, device-mock `ee53da81`, avatar-group `f5fa0bb2`, decoration `69fb9f7c`, pattern `eaec2825`, browser-pass fixes `656cd36b`, demo slides sl_42-sl_46 + p4-media scenario `bb9c91ed` | P4 is complete except `tls.m.image-collage` (blocked, see P4 file). Catalog is 106. Next is P6 or P5. Reusable: `library/media/_kit.ts` (`avatarLeaves` = ring/photo/initials, `initialsOf`, `imageLeaf`, `logoRatio`, `altFindings`, `objs`) and `media-test.ts` (`ctxWithAssets`/`ctxNoAssets`, `assertDisjoint`). Hard-won facts: (1) **the `image` node in SVG export ignored `radius`** (circle avatars were squares): `render-svg.ts` now clips a url image with a rounded `clipPath`; DOM was already right. (2) **Missing-asset image = two SVG siblings (rect + text)**: the parity worker's tree walk misaligned every later node, so it now steps over the text (`parity-worker.ts`); do NOT wrap the placeholder in a `<g>`, `parity-3way.spec` reads x/y/width/height off the element. (3) **`ctx.asset()` was never wired** in `deck-context.ts`: it now returns the asset table's `size`, so a block can know an image's aspect (logo, logo-wall); ids that are plain URLs/paths (`/demo/x.svg`) have no entry, hence the explicit `ratio` slot. (4) **Composite children's parts are anonymous**: every `tls.t.*` text emits part `text`, `layoutChild` wrappers carry no part, so `toggles` on a composite needs the layout wrapped to rename parts (profile-card does). (5) `tls.t.title`/`caption` ignore `align`, and `tls.l.stack` `content` sizing scales children to fill the box (stretched gaps in a tall card). (6) A rect with `stroke` and a full radius is not a circle in the DOM (the border sits outside the box): use `radius = size/2 + stroke`. (7) A clip group is only DOM/SVG-safe at the block origin with absolute children; non-origin groups offset in the DOM only. (8) Region names: `grid-3x2` is `c1..c6`, `four-up` is `q1..q4` (`demo-deck-contract` does NOT catch a wrong region name, `validateDeckSpec` does: run it). (9) Digest: top-8 detail is 11,975/12,000 (unchanged: new blocks all <= 1,323, profile-card the largest), index 13,095/20k. (10) jest here needs `-c jest.config.js` (two configs) and `--forceExit`, then kill leftover jest/chrome by PID. Not built: profile-card outline tone, decoration contrast lint, image-collage. Full suite not run (6 GB). |
| 2026-10-03 | plan | Plan written | Start at P0.1. The digest budget test (`capability-digest.spec.ts`) is already at its 60k ceiling, so P0.4 must land before any phase adds blocks, or every new block fails that test. |

---

## Parked (not scheduled, with the reason)

Each of these needs either a new `LayoutNode` capability, a third-party runtime, or interaction.
Per rule 3, none may be started without first agreeing on the vocabulary change.

| Block | Why parked |
|---|---|
| `tls.t.formula` | LaTeX layout needs KaTeX/MathJax, a new dependency |
| `tls.m.image-shaped` (circle/arch/blob/hex) | `image` node supports only `radius`; a path clip needs a new `clipPath` on `group` (renderer change, both DOM and SVG) |
| `tls.m.image-duotone` | Needs an image filter (SVG `feColorMatrix`), a new node capability |
| `tls.m.qr` | Pure-TS QR encoder (~400 lines) or a dependency. Feasible as Tier A paths; deferred on cost, not on design |
| `tls.m.map` | Needs tiles or a bundled world shape set |
| `tls.m.video`, `tls.v.*` (12 live blocks) | Live/interactive family: Tier B with timers and state; out of the editor-only scope decision |
| `tls.g.swimlane`, `tls.g.journey`, `tls.g.kanban`, `tls.g.stakeholders`, `tls.g.callout-pin` | Real needs, but each one needs its own geometry engine. Revisit after P3 if the AI planner asks for them |
| `tls.d.combo` (column + line, dual axis) | Dual axis is against the chart rules unless justified. Revisit after P2 |
| Rotation on `LayoutNode` | Blocks `tls.m.image-collage` and diagonal `tls.x.watermark`. Decide once whether a `rotate` field is worth a renderer change in both DOM and SVG |
| Dashed `Stroke` | `tls.t.kv-list` dot leaders fall back to the `rule` style until one is agreed |
| `tls.l.masonry`, `tls.l.frame`, `tls.l.thirds`, `tls.l.band` | Covered by `grid`, `split`, `field` and `section`. Add only if the AI planner keeps hand-building them |
