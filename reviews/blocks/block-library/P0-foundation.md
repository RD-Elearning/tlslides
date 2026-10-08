# P0 · Foundation

Nothing in P1–P6 should start before **P0.1–P0.4** land. P0.5–P0.8 are only needed by the
phases that list them as dependencies, so they can run in parallel with early P1 work.

| # | Task | Priority | Size | Status | Commit | Notes |
|---|---|---|---|---|---|---|
| P0.1 | `category` / `shortDescription` / `scope` / `related` on `BlockDefinition` + housekeeping | must | S | ✅ | 2ef8837b | Stray brace-expansion dir was already absent; empty channel/ml/visual dirs removed. |
| P0.2 | Conformance gates for the new metadata | must | S | ✅ | d508b7bb | Warning rule id is `block/scope-nested` (repo uses slash-style rule ids). Gates are red at this commit until P0.3 backfills. |
| P0.3 | Backfill the 41 existing blocks | must | M | ✅ | 7f5a3dfe | Fixture sl_11 nested slide-scope big-stat in a card; swapped for kpi-tile (both fixture copies). Digest budgets bumped, replaced in P0.4. |
| P0.4 | Two-tier AI digest (index + detail) and category gallery | must | M | ✅ | 72e2a610 | Index is ~5.5k chars for 41 blocks. Range comes from the first required content list/series slot (min<=1 dropped). Filtered detail is block-only with compact examples. Icon list is the existing 10 until P0.5. Scenario: tools/visual/scenarios/block-gallery.js. |
| P0.5 | Icon set 10 → ~80 | must | M | ✅ | 1f8dc1b4 | 87 icons (77 Lucide + original 10), `ICON_GROUPS`, rule id `icon/unknown`. Lucide uses round caps, the renderers draw butt caps, so dots are tiny circles; stroke is 1.5 not Lucide's 2. The original 10 (Material/Tabler fills) look odd when stroked; pre-existing, not touched. Scenario: tools/visual/scenarios/icon-sheet.js. |
| P0.6 | Chart engine v2 (multi-series, legend, arcs, paths, formatting) | must | M | ✅ | c0e30cf7 | `directLabel` takes `{labelHeight, gap}` opts and returns y values. `arcPath` has an optional `span` arg so the donut stays byte-identical (see spec). `formatValue` moved out of kpi-tile. Convention documented in guides/blocks-authoring.md §2.9. |
| P0.7 | Table engine (column solver + cell measurement) | must | M | ✅ | d239df03 | `blocks/layout/table.ts`. `capacityForTable` takes row heights (from `measureTable`), not rows. Extra cell kind `node` for injected children. Text alignment is done by moving the text node box (TextLine has no align). |
| P0.8 | Diagram helpers (connectors, radial placement, layered DAG) | must | M | ✅ | 5f039d79 | `blocks/layout/diagram/`. Tree cap = 4 levels including the root. DAG edges that skip layers can pass behind an intermediate node (documented); nodes never overlap. |
| P0.9 | `tls.d.bar` gets `orientation` + correct summary | should | S | ✅ | 795f0ae6 | Horizontal category labels use unique parts `label/<i>` (the parity harness matches by part; vertical keeps `label`). Old summary claimed value labels the chart never drew; fixed. Scenario: tools/visual/scenarios/bar-horizontal.js. |

---

## P0.1 · Metadata fields + housekeeping

**Files:** `packages/tldraw/src/blocks/types.ts`, `blocks/index.ts` (re-export the new types),
`blocks/registry.ts` (add `listByCategory()`), `docs` in `guides/blocks-authoring.md` §2.

Steps:
1. Add `BlockCategory`, `BlockScope` and the four optional fields exactly as in
   [01-taxonomy.md §1](01-taxonomy.md). Export `BLOCK_CATEGORIES: readonly BlockCategory[]` (with
   the order from the taxonomy table; the gallery and index use it) and
   `CATEGORY_INFO: Record<BlockCategory, { label: string; description: string }>`, where the
   description is the "Means" column.
2. `registry.listByCategory(): Map<BlockCategory, BlockDefinition[]>`. Blocks without a category
   go under `'structure'` for hosts, and the built-in gate below forbids that case.
3. `defineCompositeBlock` options accept and pass through the four fields.
4. Housekeeping (untracked or empty, so `rmdir` is enough): `library/channel/`, `library/ml/`,
   `library/visual/`, and the brace-expansion stray dir under `library/layout/`. Remove the
   housekeeping note from `CURRENT-STATE.md`.

Done when:
- [ ] tsc 0; types exported from `blocks/index.ts`.
- [ ] `registry.spec.ts` covers `listByCategory`.

## P0.2 · Conformance gates

**File:** `library/catalog-conformance.spec.ts`. For every block in `BUILT_IN_BLOCKS`:
- `category` ∈ `BLOCK_CATEGORIES`, `scope` ∈ `{element, group, slide}`.
- `shortDescription` is 12–90 chars, has no trailing `.`, and matches no denylist entry
  (`/\b(tier|html|poster|delegat|defineComposite|layout\(|editorOnly)\b/i`, backticks, and
  `/\b\d+\s*[–-]\s*\d+\b/`, since counts come from the schema).
- No two blocks share an identical `shortDescription`.
- every `related` entry resolves in the registry and is not the block itself.
- `scope === 'slide'` ⇒ the block's example is not nested in any fixture container (walk both
  demo deck fixtures).
- Every category with ≥1 block appears in `listByCategory()` (sanity check).

Also in `validate-deck-spec.ts`: a **warning** (not an error, so old decks keep validating),
`BLOCK_SCOPE_NESTED`, when a `slide`-scope block appears inside another block's `children`.

Done when:
- [ ] Gates fail on a deliberately bad fixture (test it, then remove the bad fixture).
- [ ] Warning covered by `validate-deck-spec.spec.ts`.

## P0.3 · Backfill existing blocks

Apply the [01-taxonomy.md §4](01-taxonomy.md) table to all 41 `index.ts` files (and to
`stat-card`'s `defineCompositeBlock` call). While you're in each file:
- Sharpen `describe.avoid` so it names the sibling to use instead, especially for the overlaps in
  [00-review.md §3](00-review.md).
- Strip implementation words from `summary` (it is still shown in the detail digest).
- `related` entries may only name blocks that already exist. Leave out future siblings for
  now; each later phase adds them back when the sibling lands (its entry says so).

Done when:
- [ ] P0.2 gates pass for all 41.
- [ ] `capability-digest.spec.ts` updated if the full-digest size changed (it'll be replaced in
  P0.4 anyway).

## P0.4 · Two-tier digest + category gallery

**Why:** the full digest is at its 60k ceiling with 41 blocks (00-review §5.1).

**Files:** `blocks/capability-digest.ts` (+ spec), `blocks/index.ts`,
`components/BlockInserter/BlockInserter.tsx` (+ spec), `reviews/blocks/LLM-ARCHITECTURE.md` §S2.

Digest:
1. `capabilityIndex(registry?, opts?: { categories?: BlockCategory[]; scopes?: BlockScope[] }):
   string`. A markdown header (picking rule from 01-taxonomy, scope rules), then one section per
   category in `BLOCK_CATEGORIES` order, one line per block in the format of
   [01-taxonomy.md §3](01-taxonomy.md). The **range** comes from the first `role: 'content'` slot
   whose type is `list` or `series` (`min`–`max`, `≤max`, or omitted). Then come the icon names
   (from P0.5), comma-separated, under one heading.
2. `capabilityIndexData()`: the same as structured JSON (`{ type, category, scope, range?,
   shortDescription, related? }[]`).
3. `capabilityDigest(registry?, opts?: { types?: string[]; categories?: BlockCategory[] })` and
   `capabilityDigestData(…)`: the existing full detail, now filterable. With no options the
   output is unchanged (backward compatible).
4. Budgets in the spec: **index ≤ 20k chars for the full catalog** (sized for 129 blocks), and
   detail ≤ 12k chars for any 8 types. The old full-digest budgets go: the full unfiltered digest
   stays available but no test caps it any more. Record that change in the spec comment.
5. `LLM-ARCHITECTURE.md` §S2: rewrite as S2a (pick categories, then blocks, from the index) →
   S2b (fetch detail for the shortlist) → fill. This is a doc-only change; the AI pipeline itself
   is deferred.

Gallery:
6. `BlockInserter` tabs become categories (label from `CATEGORY_INFO`, count), with an "All"
   tab first. Empty categories are hidden. Search matches `name`, `shortDescription` and
   `keywords`. The card subtitle shows `shortDescription` (not `summary`). A small scope badge
   (`Slide` / `Group`) on cards; nothing for `element`.
7. The family stays visible as a filter chip in the search row, for developers.

Done when:
- [ ] Index for 41 blocks is printed in the PR description / ledger note, and it reads well.
- [ ] Budgets enforced; old no-arg calls byte-identical (snapshot).
- [ ] Inserter spec updated (`'renders family tabs'` becomes category tabs); the B7 drag/click tests still pass.
- [ ] Screenshot of the gallery with category tabs opened and checked.

## P0.5 · Icon set → ~80

**File:** `blocks/icons/index.ts` (+ a spec that every icon path parses and fits 24×24).

- Source: Lucide (ISC). Copy path data only, with a header line per icon naming the source and
  licence (the file's existing convention). **No npm dependency** (binding rule: never touch
  dependency resolution).
- Merge multi-element Lucide icons into one `d` string. Stroke-only, so they match the existing
  set.
- Target list, grouped (the group is also exported as `ICON_GROUPS`, so the inspector/gallery can
  show a picker):
  - **arrows/status:** arrow-left, arrow-up, arrow-down, chevron-right, refresh, check-circle,
    x-circle, alert-triangle, info, help-circle, plus, minus
  - **business:** briefcase, building, chart-bar, chart-line, chart-pie, target, trophy, award,
    dollar, wallet, credit-card, shopping-cart, handshake, rocket, flag, gauge
  - **people:** user, user-plus, users (exists), heart, smile, message, mail, phone
  - **tech:** cpu, database, server, cloud, code, terminal, lock, key, wifi, smartphone, laptop,
    settings, layers, git-branch, bug
  - **education:** book, book-open, graduation-cap, lightbulb, pencil, clipboard, file-text,
    library, brain, puzzle
  - **time/place:** calendar, clock (exists), hourglass, map-pin, globe (exists), home
  - **misc:** star, sparkles, leaf, sun, eye, search, filter, link, download, share, image, video,
    mic
- `validate-deck-spec`: unknown icon name ⇒ warning `ICON_UNKNOWN` with a `nearest-name`
  suggestion (`nearest-name.ts` exists).

Done when:
- [ ] ≥ 75 icons (87, spec-enforced), all render in DOM and SVG. DOM verified in the browser; the SVG renderer path has no all-icons parity probe yet (open).
- [x] Screenshot of the icon sheet opened and checked (3 slides, all 87 rendered; the original 10 look odd when stroked, pre-existing).

## P0.6 · Chart engine v2

**Folder:** `library/data/_engine/` (+ specs). Pure functions only. Used by P2.

| Helper | Purpose | Used by |
|---|---|---|
| `multiSeriesDomain(series[], mode: 'grouped' \| 'stacked' \| 'percent')` | y-domain incl. stacking, negative values | grouped-bar, stacked-bar, area, line |
| `bandScale(categories, range, padding)` | categorical x positions + bandwidth | all bar-family, line |
| `layoutLegend(items, box, ctx, placement: 'top' \| 'bottom' \| 'right' \| 'none')` → `{ nodes, plotBox }` | legend as LayoutNodes, returns the remaining plot box | every multi-series chart |
| `arcPath(cx, cy, rOuter, rInner, a0, a1)` | SVG `d` for slices/rings/gauges (extract from donut) | pie, donut, progress-ring, gauge, radar |
| `linePath(points, curve: 'linear' \| 'monotone')` / `areaPath(top, bottom, curve)` | path `d` strings | line, area, sparkline, radar |
| `formatValue(v, format: 'plain' \| 'compact' \| 'percent' \| 'currency', opts)` | single formatter (reuse kpi-tile's if it exists, don't fork) | everything numeric |
| `directLabel(points, box)` | end-of-line labels with collision nudging | line, area, slope |

**Multi-series slot convention** (no new `SlotType`): `series: list<object{ name: text,
values: list<number> }>` + `categories: list<text>`. Series are capped at 6, matching `MAX_HUES`.
Document the convention in `guides/blocks-authoring.md` so every chart uses the same shape.

**Shared chart options** (each chart picks the ones it needs; the same key always means the same
thing): `legend` (top/bottom/right/none), `valueLabels` (none/end/inside), `gridlines`
(none/major), `format`, `highlightIndex`, `sort` (none/asc/desc), `axisTitleX`, `axisTitleY`.

**Chart design rules, enforced once in the engine:** direct labels instead of a legend when there
is one series; at most one recessive gridline set; categorical hues ≤ 6; zero baseline for bars;
no 3D, no dual axis.

Done when:
- [x] Each helper has a unit spec (golden numbers, not snapshots).
- [x] `tls.d.donut` refactored onto `arcPath` with byte-identical layout output (existing spec
  passes unchanged).

## P0.7 · Table engine

**Folder:** `blocks/layout/table.ts` (+ spec). Used by d.table, d.compare-table,
d.scorecard, d.ranking, d.pricing, t.kv-list.

- `solveColumns(cols: { min?: number; weight?: number; align }[], width, measuredMaxContent[])
  → widths[]`: min-content first, then distribute by weight, then shrink proportionally
  (wrapping text) when the content overflows.
- `layoutTable({ head?, rows, widths, cellPad, rowGap, zebra, rules }, ctx)` → `LayoutNode`
  group with parts `head`, `row-<i>`, `cell-<r>-<c>`. Every cell is a text node or an injected
  child node (check/cross/rating/dot icons), which lets compare-table and scorecard share it.
- Cell kinds: `text`, `number` (right-aligned, tabular, formatted), `check` (check / x / dash
  icon with positive/negative/neutral role), `rating` (1–5 filled dots), `status` (dot + label
  using positive/warning/negative).
- `capacityForTable(rows, box)` → `{ fits, maxRows }`, shared by all table blocks.

Done when:
- [x] Spec covers wrap, overflow-shrink, alignments, and each cell kind.

## P0.8 · Diagram helpers

**Folder:** `blocks/layout/diagram/` (+ specs). Used by P3.

- `connector(from: Box, to: Box, opts: { kind: 'straight' | 'elbow'; head: 'arrow' | 'none';
  sides?: 'auto' | … })` → `line`/`path` node, anchored on box edges, never crossing either box.
- `radial(n, center, radius, startAngle)` → points. `ringBoxes(n, box, nodeSize)` → boxes on a
  circle for cycle/hub-spoke.
- `layeredDag(nodes, edges, direction: 'TB' | 'LR', box)` → node boxes + edge routes. Longest-path
  layering, barycentre ordering in 2 sweeps, elbow routing. Capped at 12 nodes/16 edges (beyond
  that, `capacity` says it doesn't fit). No dependency (no dagre).
- `tidyTree(root, direction, box)` → node boxes for tree/mindmap (Reingold–Tilford-lite, depth ≤ 4).
- `chevronPath(box, notch, first, last)`, `trapezoidPath(box, topInset, bottomInset)` for
  chevrons, funnel and pyramid.

Done when:
- [x] Specs for each helper, incl. "connector never crosses its endpoint boxes" and "dag output
  has no overlapping node boxes" (reuse `collision.spec.ts` style).

## P0.9 · `tls.d.bar` orientation

Add option `orientation: enum['vertical', 'horizontal']`, defaulting to `'vertical'` so existing
decks render unchanged (additive). For horizontal: category labels on the left, values along x,
long labels wrapped to 2 lines. Rewrite the `summary`/`shortDescription` per 01-taxonomy. Add a
horizontal example to the spec, not to `describe.example` (keep that stable).

Done when:
- [x] Existing bar spec unchanged and green. New horizontal tests pass. Parity probe for horizontal.
