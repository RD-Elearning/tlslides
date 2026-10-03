# P2 · Metrics, charts, tables — 24 blocks

**Depends on:** P0.1–P0.3, **P0.6 chart engine** (all charts), **P0.7 table engine** (tables).
**Folder:** `library/data/` (prefix `d`). **Reference:** `tls-d-bar/` (axis, scale, value labels),
`tls-d-donut/` (arcs, centre label), `composite/tls-c-kpi-tile/` (delta + polarity + format).

Block entry format and the standard tests are defined in [P1-text-lists.md](P1-text-lists.md#how-to-read-a-block-entry-same-in-every-phase-file).
Shared chart options (`legend`, `valueLabels`, `gridlines`, `format`, `highlightIndex`, `sort`,
`axisTitleX/Y`) and the multi-series slot convention
`series: list<object{ name, values: list<number> }>` + `categories: list<text>` are defined in
[P0-foundation.md §P0.6](P0-foundation.md#p06--chart-engine-v2). They are written as
"*chart options*" below rather than repeated.

**Extra tests for every chart:** empty series and all-zero series render a "no data" text node,
not NaN boxes; negative values (where allowed); long category labels wrap or rotate without
overlap; 6 series use 6 distinct hues; highlightIndex dims the others via `highlightColor`.

---

## Status

| # | Block | Category | Priority | Status | Commit | Blocked / notes |
|---|---|---|---|---|---|---|
| 1 | `tls.d.progress-bar` | metric | must | ⬜ | | |
| 2 | `tls.d.progress-ring` | metric | must | ⬜ | | |
| 3 | `tls.d.stat-compare` | metric | must | ⬜ | | |
| 4 | `tls.d.line` | chart | must | ⬜ | | |
| 5 | `tls.d.area` | chart | must | ⬜ | | |
| 6 | `tls.d.grouped-bar` | chart | must | ⬜ | | |
| 7 | `tls.d.stacked-bar` | chart | must | ⬜ | | |
| 8 | `tls.d.pie` | chart | must | ⬜ | | |
| 9 | `tls.d.table` | table | must | ⬜ | | |
| 10 | `tls.d.compare-table` | comparison | must | ⬜ | | |
| 11 | `tls.d.pricing` | comparison | must | ⬜ | | |
| 12 | `tls.d.scorecard` | table | must | ⬜ | | |
| 13 | `tls.d.gauge` | metric | should | ⬜ | | |
| 14 | `tls.d.sparkline` | chart | should | ⬜ | | |
| 15 | `tls.d.waterfall` | chart | should | ⬜ | | |
| 16 | `tls.d.funnel-chart` | chart | should | ⬜ | | |
| 17 | `tls.d.scatter` | chart | should | ⬜ | | |
| 18 | `tls.d.radar` | chart | should | ⬜ | | |
| 19 | `tls.d.ranking` | table | should | ⬜ | | |
| 20 | `tls.d.heatmap` | chart | should | ⬜ | | |
| 21 | `tls.d.trend-badge` | metric | could | ⬜ | | |
| 22 | `tls.d.slope` | chart | could | ⬜ | | |
| 23 | `tls.d.bubble` | chart | could | ⬜ | | |
| 24 | `tls.d.bullet-chart` | metric | could | ⬜ | | |
| — | Phase demo slides (metrics, charts, tables) + screenshots | | | ⬜ | | 3 slides |

---

## Metrics

### 1. `tls.d.progress-bar` · metric · element · layout · must
- **short:** `Labelled horizontal bars showing progress toward a target`
- **Slots:** `items!: list<object{ label!: text maxChars 40, value!: number, max: number }>` (1–6)
- **Options:** `showValue: enum[percent, value, none]`; `thickness: enum[md, sm, lg]`;
  `tone: enum[accent, status]` (status: <33 % negative, <66 % warning, else positive);
  `labelPos: enum[above, left]`; `track: boolean` (default true)
- **Parts / motion:** `label-<i>`, `track-<i>`, `fill-<i>`, `value-<i>`; `grow-bars-x`.
- **Capacity:** rows vs height; remedy `labelPos: 'left'`, then truncate.
- **when:** Completion of goals, budgets spent, survey agreement levels.
- **avoid:** Comparing categories with no target, so use `tls.d.bar` with `orientation: horizontal`.

### 2. `tls.d.progress-ring` · metric · element · layout · must
- **short:** `Ring filled to a percentage with the number in the centre`
- **Slots:** `value!: number`; `max: number` (default 100); `label: text maxChars 40`;
  `caption: text maxChars 80`
- **Options:** `thickness: enum[md, sm, lg]`; `cap: enum[round, flat]` (round = small circle
  paths at the ends, since there's no line-cap field); `tone: enum[accent, status]`; `format`
- **Parts / motion:** `track`, `arc`, `value`, `label`, `caption`; `grow-segments`. Check that
  `sweep` exists first; it doesn't (presets list), so use `grow-segments` or `draw-path`.
- **when:** One completion rate or score shown as a dial.
- **avoid:** Shares of several parts, so use `tls.d.donut` or `tls.d.pie`.
- **Tests:** 0 %, 100 % and >100 % (clamped, with an overflow marker); round caps in both
  renderers.

### 3. `tls.d.stat-compare` · metric · group · layout · must
- **short:** `Two numbers side by side with the change between them`
- **Slots:** `left!: object{ label!: text, value!: number }`; `right!: object{ label!: text,
  value!: number }`; `caption: text maxChars 100`
- **Options:** `format`; `delta: enum[percent, absolute, none]`; `polarity: enum[upGood, downGood,
  neutral]` (same vocabulary as kpi-tile); `connector: enum[arrow, vs, none]`
- **Parts / motion:** `left`, `connector`, `right`, `delta`, `caption`; `count-up`.
- **when:** Before vs after, last year vs this year, us vs benchmark.
- **avoid:** More than two values, so use `tls.c.kpi-row` or `tls.d.bar`.

### 13. `tls.d.gauge` · metric · element · layout · should
- **short:** `Half-circle dial with coloured bands and a needle at the current value`
- **Slots:** `value!: number`; `min: number`; `max: number`; `label: text`;
  `bands: list<object{ to!: number, tone!: enum[negative, warning, positive, neutral] }>` (0–5)
- **Options:** `needle: enum[needle, marker]`; `showTicks: boolean`; `format`
- **Parts / motion:** `bands`, `needle`, `value`, `label`; `draw-path`.
- **when:** A score against thresholds (NPS, health, risk level).
- **avoid:** Plain completion with no thresholds, so use `tls.d.progress-ring`.

### 21. `tls.d.trend-badge` · metric · element · layout · could
- **short:** `Small pill with an up or down arrow and a change value`
- **Slots:** `delta!: number`; `label: text maxChars 30`
- **Options:** `format`; `polarity: enum[upGood, downGood, neutral]`; `size: enum[md, sm, lg]`
- **Parts / motion:** `badge`; `fade-up`.
- **when:** Annotating a number elsewhere on the slide with its trend.
- **avoid:** A standalone metric, so use `tls.c.kpi-tile`.

### 24. `tls.d.bullet-chart` · metric · group · layout · could
- **short:** `Bars against target markers over qualitative range bands`
- **Slots:** `items!: list<object{ label!: text, value!: number, target!: number, max: number }>` (1–5)
- **Options:** `bands: enum[three, none]`; `format`
- **Parts / motion:** `row-<i>`; `grow-bars-x`.
- **when:** Several KPIs each against its own target.
- **avoid:** Progress with no target, so use `tls.d.progress-bar`.

## Charts

### 4. `tls.d.line` · chart · group · layout · must
- **short:** `Lines over ordered categories, one per series, labelled at the line ends`
- **Slots:** `categories!: list<text>` (2–24); `series!: list<object{ name!, values! }>` (1–6)
- **Options:** chart options + `curve: enum[linear, monotone]`; `markers: enum[none, last, all]`;
  `endLabels: boolean` (default true, which replaces the legend); `baseline: enum[auto, zero]`
- **Parts / motion:** `axis`, `grid`, `series-<i>`, `label-<i>`; `draw-path`.
- **Capacity:** if category labels collide, show every n-th label (never overlap); more than 6
  series → `fits: false`, remedy `truncate series`.
- **when:** Change over time, trends, comparing trajectories.
- **avoid:** Unordered categories, so use `tls.d.bar`. Two time points only go in `tls.d.slope`.
- **Tests:** null values break the line (gap, no drop to 0); end-label collision nudging.

### 5. `tls.d.area` · chart · group · layout · must
- **short:** `Filled areas under lines over time, overlapping or stacked`
- **Slots:** as `line`.
- **Options:** chart options + `mode: enum[overlap, stacked, percent]`; `curve`; `opacity:
  enum[soft, solid]`
- **Parts / motion:** `axis`, `area-<i>`; `wipe-x`.
- **when:** Volume over time, composition over time (stacked).
- **avoid:** Precise comparison of series, so use `tls.d.line`.

### 6. `tls.d.grouped-bar` · chart · group · layout · must
- **short:** `Side-by-side bars per category, one colour per series`
- **Slots:** `categories!: list<text>` (2–12); `series!` (2–4)
- **Options:** chart options + `orientation: enum[vertical, horizontal]`; `groupGap: enum[md, sm, lg]`
- **Parts / motion:** `axis`, `bar-<s>-<c>`, `legend`; `grow-bars-y` (`grow-bars-x` when horizontal).
- **when:** Comparing 2–4 series across categories (region × year).
- **avoid:** One series, so use `tls.d.bar`. Parts of a total go in `tls.d.stacked-bar`.

### 7. `tls.d.stacked-bar` · chart · group · layout · must
- **short:** `Bars split into segments that add up to each category total`
- **Slots:** as grouped-bar (series 2–6).
- **Options:** chart options + `orientation`; `normalize: boolean` (100 %); `totals: boolean`
  (total label above each bar)
- **Parts / motion:** `axis`, `seg-<s>-<c>`, `total-<c>`, `legend`; `grow-segments`.
- **when:** Composition of a total across categories; with `normalize`, mix comparison.
- **avoid:** Comparing individual series values, so use `tls.d.grouped-bar`.

### 8. `tls.d.pie` · chart · group · layout · must
- **short:** `Pie of slices with labels and percentages outside the slices`
- **Slots:** `categories!: list<text>` (2–6); `values!: list<number>` (same length)
- **Options:** `labels: enum[outside, inside, legend]`; `showPercent: boolean`; `sort: enum[desc,
  none]`; `highlightIndex`; `startAngle: number`
- **Parts / motion:** `slice-<i>`, `label-<i>`; `grow-segments`.
- **Lint:** more than 6 slices → warning, "group small slices as Other".
- **when:** Share of a whole with up to 6 parts.
- **avoid:** Comparing similar-sized shares, so use `tls.d.bar`. A ring with a centre number goes
  in `tls.d.donut`.

### 14. `tls.d.sparkline` · chart · element · layout · should
- **short:** `Tiny axis-free line showing a trend, with the last value marked`
- **Slots:** `values!: list<number>` (3–60); `label: text maxChars 30`
- **Options:** `fill: boolean`; `endDot: boolean`; `showLast: enum[none, value, delta]`; `format`
- **Parts / motion:** `line`, `dot`, `label`; `draw-path`.
- **when:** A trend hint next to a number, in tables or tiles.
- **avoid:** A chart someone must read values from, so use `tls.d.line`.

### 15. `tls.d.waterfall` · chart · group · layout · should
- **short:** `Running total built up from increases and decreases between two totals`
- **Slots:** `steps!: list<object{ label!: text, value!: number, kind: enum[delta, total] }>` (3–12)
- **Options:** chart options + `connectors: boolean`; `colorBy: enum[sign, single]`
  (sign: positive/negative roles, total: accent)
- **Parts / motion:** `bar-<i>`, `connector-<i>`; `stagger-children`.
- **when:** Bridge from one figure to another (revenue bridge, budget variance).
- **avoid:** Independent values, so use `tls.d.bar`.

### 16. `tls.d.funnel-chart` · chart · group · layout · should
- **short:** `Tapering stages sized by value, with drop-off between stages`
- **Slots:** `stages!: list<object{ label!: text, value!: number }>` (3–7)
- **Options:** `shape: enum[funnel, bars]`; `showDropoff: enum[percent, none]`; `format`
- **Parts / motion:** `stage-<i>`, `dropoff-<i>`; `stagger-children`.
- **when:** Conversion pipelines with real numbers.
- **avoid:** A qualitative funnel without values, so use `tls.g.funnel`.

### 17. `tls.d.scatter` · chart · group · layout · should
- **short:** `Points on two numeric axes, optionally grouped, with quadrant lines`
- **Slots:** `points!: list<object{ x!: number, y!: number, label: text, group: text }>` (3–60)
- **Options:** chart options + `quadrants: boolean`; `trendline: boolean` (least squares);
  `labelPoints: enum[none, highlighted, all]`
- **Parts / motion:** `axis`, `point-<i>`, `trend`; `pop-points`.
- **when:** Correlation, positioning of items on two measures.
- **avoid:** Qualitative positioning, so use `tls.g.matrix-2x2`.

### 18. `tls.d.radar` · chart · group · layout · should
- **short:** `Spider chart comparing series across radial axes`
- **Slots:** `axes!: list<text>` (3–8); `series!` (1–3)
- **Options:** `max: number`; `fill: boolean`; `rings: number` (default 4); `legend`
- **Parts / motion:** `grid`, `series-<i>`, `axis-label-<i>`; `draw-path`.
- **when:** Profiles on several criteria (skills, product scores).
- **avoid:** More than 3 series or more than 8 axes, so use `tls.d.compare-table`.

### 20. `tls.d.heatmap` · chart · group · layout · should
- **short:** `Grid of cells shaded by value, rows by columns`
- **Slots:** `rows!: list<text>` (2–12); `cols!: list<text>` (2–12); `values!: list<list<number>>`
  (check: `list` of `list` is allowed by `SlotType`; it is)
- **Options:** `ramp: enum[accent, diverging]` (diverging: negative → neutral → positive);
  `showValues: boolean`; `format`
- **Parts / motion:** `cell-<r>-<c>`, `labels`; `stagger-grid`.
- **when:** Patterns across two dimensions (weekday × hour, team × skill).
- **avoid:** Exact values, so use `tls.d.table`.

### 22. `tls.d.slope` · chart · group · layout · could
- **short:** `Lines connecting two time points per item, showing who rose or fell`
- **Slots:** `startLabel!: text`; `endLabel!: text`; `items!: list<object{ name!, start!: number, end!: number }>` (2–10)
- **Options:** `highlight: enum[none, risers, fallers]`; `format`
- **Parts / motion:** `line-<i>`; `draw-path`.
- **when:** Change between exactly two points for several items.
- **avoid:** Many time points, so use `tls.d.line`.

### 23. `tls.d.bubble` · chart · group · layout · could
- **short:** `Scatter plot whose circle sizes show a third value`
- **Slots:** `points!: list<object{ x!, y!, r!: number, label }>` (3–30)
- **Options:** chart options + `sizeLegend: boolean`
- **Parts / motion:** `point-<i>`; `pop-points`.
- **when:** Portfolio views (market size × growth × share).
- **avoid:** Two measures only, so use `tls.d.scatter`.

## Tables

### 9. `tls.d.table` · table · group · layout (table engine) · must
- **short:** `Table with header row, aligned numbers, zebra rows and an emphasised row`
- **Slots:** `columns!: list<object{ label!: text, kind: enum[text, number, status, rating, check], align:
  enum[auto, start, center, end], width: number }>` (1–8); `rows!: list<list<text>>` (1–14);
  `footer: list<text>` (totals row)
- **Options:** `zebra: boolean`; `rules: enum[horizontal, grid, none]`; `header: enum[filled, bold,
  none]`; `emphasisRow: number`; `emphasisCol: number`; `density: enum[default, compact]`; `format`
- **Toggles:** `showFooter` → `footer`.
- **Parts / motion:** `head`, `row-<i>`, `footer`; `stagger-lines`.
- **Capacity:** `capacityForTable`; remedies `density: compact`, then `split rows` (suggest a
  continuation slide).
- **when:** Exact values in rows and columns; schedules, specs, results.
- **avoid:** Fewer than 3 values, so use metrics. Options against criteria go in
  `tls.d.compare-table`.
- **Tests:** number cells right-aligned and formatted; a cell value that doesn't parse as a
  number in a `number` column renders as text; status/rating/check cells render as icons.

### 10. `tls.d.compare-table` · comparison · group · layout (table engine) · must
- **short:** `Feature matrix of options against criteria, ticks, crosses or ratings`
- **Slots:** `options!: list<text>` (2–5); `criteria!: list<text>` (2–12);
  `cells!: list<list<text>>` (values `yes` / `no` / `partial` / 1–5 / free text)
- **Options:** `cellKind: enum[check, rating, text]`; `winner: number` (column highlighted with
  accent header + tint); `stickyLabels: boolean`
- **Parts / motion:** `head`, `row-<i>`, `winner`; `stagger-lines`.
- **when:** Us vs competitors, plan features, tool selection.
- **avoid:** Free-form pros and cons, so use `tls.g.pros-cons`. Prices go in `tls.d.pricing`.

### 11. `tls.d.pricing` · comparison · group · layout · must
- **short:** `Plan cards with price, period, feature list and one featured plan`
- **Slots:** `plans!: list<object{ name!: text, price!: text, period: text, description: text,
  features!: list<text> (≤8), cta: text, featured: boolean }>` (2–4)
- **Options:** `featuredStyle: enum[raised, outline, filled]`; `checkIcon: icon`; `align: enum[top, stretch]`
- **Toggles:** `showCta` → `cta`; `showDescription` → `description`.
- **Build:** a row of `tls.l.card`s via `ctx.layoutChild` (cards equalise height under
  `align: stretch`). Not the table engine, despite the name.
- **Parts / motion:** `plan-<i>`; `stagger-children`.
- **when:** Pricing tiers, packages, offer levels.
- **avoid:** Comparing many features across plans, so use `tls.d.compare-table`.

### 12. `tls.d.scorecard` · table · group · layout (table engine) · must
- **short:** `Metric rows with value, target and a red/amber/green status`
- **Slots:** `items!: list<object{ label!: text, value!: text, target: text, status!: enum[good, watch, bad, none], note: text }>` (2–10)
- **Options:** `showTarget: boolean`; `statusStyle: enum[dot, pill, bar]`; `showNote: boolean`
- **Parts / motion:** `row-<i>`; `stagger-lines`.
- **when:** OKR reviews, project health, SLA reports.
- **avoid:** Raw data tables, so use `tls.d.table`.

### 19. `tls.d.ranking` · table · group · layout · should
- **short:** `Ranked leaderboard with position, name, value bar and medal for the top three`
- **Slots:** `items!: list<object{ label!: text, value!: number, note: text }>` (3–10)
- **Options:** `showBars: boolean`; `medals: boolean`; `sort: enum[desc, asc, none]`; `format`
- **Parts / motion:** `row-<i>`; `stagger-lines`.
- **when:** Top-N lists, leaderboards, top products.
- **avoid:** No ranking intent, so use `tls.d.bar`.

---

## Phase done when
- [ ] Must blocks ✅; three demo slides (metrics / charts / tables) screenshotted and opened.
- [ ] Every chart passes the chart-rule lint (single series without a legend, ≤ 6 hues, zero
  baseline for bars).
- [ ] Full suite, tsc 0, README counts and session log updated.
