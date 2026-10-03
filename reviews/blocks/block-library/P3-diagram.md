# P3 · Diagrams — 21 blocks

**Depends on:** P0.1–P0.3, **P0.8 diagram helpers** (connectors, radial, DAG, tree, chevron and
trapezoid paths), and P0.5 for any icon slot.
**Folder:** `library/diagram/` (prefix `g`). **Reference:** `tls-g-steps/` (numbered nodes +
connectors) and `composite/tls-c-steps/`.

Block entry format and the standard tests are defined in [P1-text-lists.md](P1-text-lists.md#how-to-read-a-block-entry-same-in-every-phase-file).

**Extra rule for diagrams:** the AI picks by relationship (01-taxonomy §1 picking rule), so
every `describe.when` starts with the relationship word: *order*, *dated order*, *cycle*,
*parent/child*, *level*, *overlap*, *contrast* or *centre/satellite*.

**Extra tests for every diagram:** no node box overlaps another (collision helper); connectors
never cross their own endpoint boxes; minimum and maximum item counts both lay out without
error nodes; the text in every node respects its `maxChars` at `size.min`.

---

## Status

| # | Block | Category | Priority | Status | Commit | Blocked / notes |
|---|---|---|---|---|---|---|
| 1 | `tls.g.chevrons` | process | must | ✅ | c581d2b7 | Parts `chevron[i]`/`label[i]`/`text[i]` (bracket convention, not `chevron-<i>`). Last segment keeps a pointed head. Current phase = full `accent`, others a 22% tint of their ramp colour. Notes inside narrow chevrons are clipped (guidance: use `textPlacement: below` for longer notes). Motion is `wipe-x` on the whole block. |
| 2 | `tls.g.cycle` | process | must | ✅ | b58834f9 | Ring is a circle (circle nodes) or an ellipse (cards); arrows are elliptical arcs trimmed to the node edges plus a filled head, so no `arcPath`/`ringArcPath` needed. Parts `node[i]`, `arrow[i]`, `arrow[i].head`, `label[i]`, `text[i]`, `center`. 3-6 steps; cards cap their height at H/3 so neighbours cannot touch. |
| 3 | `tls.g.timeline` | timeline | must | ✅ | 559a2a85 | Min card width kept at 180 (capacity); card width solved so same-side cards never touch (`(2W-g(N-1))/(N+1)` alternating, `(W-g(N-1))/N` one side). Cards are date/title/text parts (`date[i]`/`title[i]`/`text[i]`), no `card-<i>` part. Defaults to `alternate: true`. Vertical date column in the non-alternate vertical mode. |
| 4 | `tls.g.roadmap` | timeline | must | ✅ | a4afbdf2 | Nested lanes/items validate; the digest shows only `object (name, items)`, so the item fields live in the `lanes` guidance text. Parts `lane[l]`, `bar[l][i]`, `bar[l][i].label`, `grid[j]`, `period[j]`, `today`. Bars are inset 1px so touching periods stay distinct. Extra: a status legend under the lanes (only when `statusColors` is on). Rows scale to the box height, floor = one text line. |
| 5 | `tls.g.tree` | hierarchy | must | ⬜ | | |
| 6 | `tls.g.pyramid` | hierarchy | must | ⬜ | | |
| 7 | `tls.g.matrix-2x2` | comparison | must | ⬜ | | |
| 8 | `tls.g.swot` | comparison | must | ⬜ | | composite over matrix-2x2 |
| 9 | `tls.g.pros-cons` | comparison | must | ⬜ | | |
| 10 | `tls.g.venn` | relationship | must | ⬜ | | |
| 11 | `tls.g.flow` | process | should | ✅ | a4ac5204 | `lint`: `flow/unknown-node` (error), `flow/cycle`, `flow/duplicate-id`, `flow/self-loop` (warnings); unknown/self/duplicate edges are skipped by `layout`. Back edges are cubic curves below (LR) or beside (TB) the nodes with a reserved margin. Known DAG-helper limit stays: an edge that skips layers can pass behind a node in an intermediate layer. Parts `node[<id>]`, `edge[<i>]` (index in the edges slot). |
| 12 | `tls.g.funnel` | process | should | ✅ | 96fcb496 | Even taper to 30% of the first stage; `trapezoidPath` for vertical, own polygon for horizontal. Side notes get a hairline leader (`leader[i]`). |
| 13 | `tls.g.milestones` | timeline | should | ✅ | a69129eb | Open (not done) diamonds are a surface fill plus accent stroke on one `path`. Vertical `labels: below` = date left, label right; `alternate` swaps sides of a centre line. |
| 14 | `tls.g.hub-spoke` | relationship | should | ⬜ | | |
| 15 | `tls.g.layers` | hierarchy | should | ⬜ | | |
| 16 | `tls.g.before-after` | comparison | should | ⬜ | | |
| 17 | `tls.g.breakdown` | hierarchy | should | ⬜ | | |
| 18 | `tls.g.mindmap` | hierarchy | could | ⬜ | | |
| 19 | `tls.g.arrow` | decoration | could | ⬜ | | |
| 20 | `tls.g.bracket` | relationship | could | ⬜ | | |
| 21 | `tls.g.iceberg` | comparison | could | ⬜ | | |
| — | Demo slides (process, timeline, hierarchy, strategy) + screenshots | | | 🔶 | 56bba414 | Part A slides sl_22-sl_28 (process x2, cycle+funnel, flow, timeline, vertical timeline+milestones, roadmap, milestones) in `colorful-blocks-demo.json`, scenario `tools/visual/scenarios/p3-diagram.js`, every PNG opened. Hierarchy and strategy slides belong to part B. |

---

## Process

### 1. `tls.g.chevrons` · process · group · layout · must
- **short:** `Arrow-shaped chevron segments in a row, one highlighted as the current phase`
- **Slots:** `steps!: list<object{ label!: text maxChars 30, text: text maxChars 90 }>` (3–7)
- **Options:** `currentIndex: number` (−1 = none); `fill: enum[gradient, single, series]`
  (gradient = accent→accent2 interpolated via color-math); `textPlacement: enum[inside, below]`
- **Toggles:** `showText` → `text`.
- **Parts / motion:** `chevron-<i>`, `label-<i>`, `text-<i>`; `wipe-x`.
- **Build:** `chevronPath` (P0.8). The first segment has a flat left edge; the others are notched.
- **when:** Order: phases of a project or method, with an optional "we are here".
- **avoid:** Steps that need descriptions longer than one line, so use `tls.c.steps`. Dated
  phases go in `tls.g.roadmap`.

### 2. `tls.g.cycle` · process · group · layout · must
- **short:** `Steps arranged on a circle with arrows looping back to the start`
- **Slots:** `steps!: list<object{ label!: text maxChars 30, text: text maxChars 80, icon: icon }>` (3–6);
  `center: text maxChars 30`
- **Options:** `direction: enum[clockwise, counter]`; `nodeStyle: enum[circle, card]`;
  `arrowStyle: enum[arc, none]`
- **Toggles:** `showCenter` → `center`; `showText` → `text`.
- **Parts / motion:** `node-<i>`, `arrow-<i>`, `center`; `sweep-nodes`.
- **Build:** `ringBoxes` + arcs between nodes (`arcPath` from P0.6, with an arrow-head path).
  Labels go outside the ring when `nodeStyle: circle`.
- **when:** Cycle: continuous loops (PDCA, product lifecycle, feedback loop).
- **avoid:** A process with a clear end, so use `tls.g.chevrons` or `tls.g.steps`.

### 11. `tls.g.flow` · process · group · layout · should
- **short:** `Flowchart of boxes and decisions joined by labelled arrows`
- **Slots:** `nodes!: list<object{ id!: text, label!: text maxChars 40, kind: enum[step, decision, start, end] }>`
  (2–12); `edges!: list<object{ from!: text, to!: text, label: text maxChars 20 }>` (1–16)
- **Options:** `direction: enum[LR, TB]`; `routing: enum[elbow, straight]`
- **Parts / motion:** `node-<id>`, `edge-<i>`; `stagger-children` (in topological order).
- **Build:** `layeredDag` (P0.8). Decision = diamond `path`; start/end = pill `rect`.
- **Lint/validate:** an edge naming an unknown node id → error finding (not a crash), and that
  edge is skipped. Cycles in the graph → warning; the back edge is drawn as a curve.
- **when:** Order with branches: decision logic, algorithms, approval paths.
- **avoid:** A straight sequence, so use `tls.g.steps` or `tls.g.chevrons`.

### 12. `tls.g.funnel` · process · group · layout · should
- **short:** `Narrowing stages from broad to focused, with a note per stage`
- **Slots:** `stages!: list<object{ label!: text maxChars 30, text: text maxChars 90 }>` (3–6)
- **Options:** `orientation: enum[vertical, horizontal]`; `notes: enum[side, inside]`
- **Parts / motion:** `stage-<i>`, `note-<i>`; `stagger-children`.
- **Build:** `trapezoidPath` per stage.
- **when:** Order with narrowing: marketing funnel, selection process (no numbers).
- **avoid:** Funnels with real values, so use `tls.d.funnel-chart`.

## Timeline

### 3. `tls.g.timeline` · timeline · group · layout · must
- **short:** `Dated events on one axis with a title and note per event; optional today marker`
- **Slots:** `events!: list<object{ date!: text maxChars 20, title!: text maxChars 40, text: text maxChars 110, icon: icon }>` (3–8)
- **Options:** `axis: enum[horizontal, vertical]`; `alternate: boolean` (cards above/below or
  left/right); `nowIndex: number` (−1 = none; events after it render `textMuted`);
  `nodeStyle: enum[dot, icon, number]`
- **Toggles:** `showText` → `text`.
- **Parts / motion:** `axis`, `node-<i>`, `card-<i>`; `draw-axis-then-nodes`.
- **Capacity:** horizontal: min card width 180, so the max events follows from the width; remedy
  `axis: vertical`, then `alternate: true`, then truncate.
- **when:** Dated order: history, project timeline, course schedule.
- **avoid:** Undated steps, so use `tls.g.steps`. Overlapping periods go in `tls.g.roadmap`.
- **Tests:** alternate placement never overlaps neighbouring cards at the max count.

### 4. `tls.g.roadmap` · timeline · group · layout · must
- **short:** `Gantt-style lanes of bars over time periods, with status colours`
- **Slots:** `periods!: list<text>` (2–12, e.g. Q1…Q4 or months); `lanes!: list<object{ name!: text maxChars 24,
  items!: list<object{ label!: text maxChars 30, start!: number, end!: number, status: enum[done, active, planned, risk] }> }>`
  (1–6 lanes, ≤ 5 items each). `start`/`end` are period indices (0-based, end inclusive, fractional
  allowed).
- **Options:** `todayAt: number` (period index, fractional; −1 = none); `statusColors: boolean`
  (done positive, active accent, planned neutral, risk negative); `laneLabels: enum[left, none]`
- **Parts / motion:** `grid`, `lane-<i>`, `bar-<l>-<i>`, `today`; `grow-bars-x`.
- **Capacity:** bar label wider than bar → label outside the bar on the right; overlapping bars in
  one lane get stacked sub-rows (and the lane height grows); total height check.
- **when:** Dated order with overlap: product roadmap, project plan, semester plan.
- **avoid:** Single-point events, so use `tls.g.timeline` or `tls.g.milestones`.

### 13. `tls.g.milestones` · timeline · group · layout · should
- **short:** `Diamond milestone markers along a line, done ones filled`
- **Slots:** `items!: list<object{ date!: text, label!: text maxChars 30, done: boolean }>` (2–8)
- **Options:** `axis: enum[horizontal, vertical]`; `labels: enum[alternate, below]`
- **Parts / motion:** `line`, `ms-<i>`; `stagger-children`.
- **when:** Dated order of key checkpoints only (no descriptions).
- **avoid:** Events that need descriptions, so use `tls.g.timeline`.

## Hierarchy

### 5. `tls.g.tree` · hierarchy · group · layout · must
- **short:** `Org chart or hierarchy of boxes linked from one root, top-down or left-right`
- **Slots:** `root!: object{ label!: text maxChars 30, sub: text maxChars 30, children: list<object{…same, recursive…}> }`
  The recursive object has to be expressed with the existing `object`/`list` kinds. Declare 3
  levels explicitly in the schema (root → children → grandchildren), which matches the depth cap of 4.
- **Options:** `direction: enum[TB, LR]`; `nodeStyle: enum[card, pill, avatar]` (avatar adds an
  `image` slot per node, optional); `compact: boolean`
- **Parts / motion:** `node-<path>`, `link-<path>`; `grow-branches`.
- **Capacity:** max 15 nodes, max 6 children per node; remedy `direction: LR`, then
  `compact: true`, then split.
- **when:** Parent/child: org charts, taxonomy, decomposition of a goal.
- **avoid:** Free association around one idea, so use `tls.g.mindmap`.

### 6. `tls.g.pyramid` · hierarchy · group · layout · must
- **short:** `Stacked pyramid levels from base to tip, each with label and note`
- **Slots:** `levels!: list<object{ label!: text maxChars 30, text: text maxChars 100 }>` (3–6), listed top to bottom
- **Options:** `direction: enum[up, down]` (down = inverted); `notes: enum[side, inside, none]`;
  `fill: enum[gradient, series, single]`
- **Parts / motion:** `level-<i>`, `note-<i>`; `stagger-children` (from the base).
- **when:** Level: Maslow, priority tiers, foundation-to-goal stacks.
- **avoid:** Equal-weight layers, so use `tls.g.layers`.

### 15. `tls.g.layers` · hierarchy · group · layout · should
- **short:** `Stacked horizontal layers like a tech stack, each with label and note`
- **Slots:** `layers!: list<object{ label!: text maxChars 30, text: text maxChars 100, icon: icon }>` (2–7), top to bottom
- **Options:** `style: enum[flat, perspective]` (perspective = parallelogram paths);
  `notes: enum[side, inside]`
- **Parts / motion:** `layer-<i>`; `reveal-down`.
- **when:** Level: architecture stacks, layered models (OSI).
- **avoid:** Narrowing levels, so use `tls.g.pyramid`.

### 17. `tls.g.breakdown` · hierarchy · group · layout · should
- **short:** `One whole split into parts with values, shown as a bracketed breakdown`
- **Slots:** `whole!: object{ label!: text, value: text }`; `parts!: list<object{ label!: text, value: text, note: text }>` (2–6)
- **Options:** `direction: enum[LR, TB]`; `showShare: boolean` (computes % when the values are numeric)
- **Parts / motion:** `whole`, `bracket`, `part-<i>`; `stagger-children`.
- **when:** Parent/child, one level: cost breakdown, components of a metric.
- **avoid:** Several levels, so use `tls.g.tree`. Exact shares go in `tls.d.pie`.

### 18. `tls.g.mindmap` · hierarchy · group · layout · could
- **short:** `Central idea with curved branches out to topics and subtopics`
- **Slots:** `center!: text maxChars 30`; `branches!: list<object{ label!: text maxChars 24, children: list<text maxChars 24> (≤4) }>` (2–6)
- **Options:** `balance: enum[both, right]`; `curve: boolean`
- **Parts / motion:** `center`, `branch-<i>`; `grow-branches`.
- **when:** Parent/child brainstorm: topic overview, course map.
- **avoid:** Formal reporting lines, so use `tls.g.tree`.

## Relationship & comparison

### 7. `tls.g.matrix-2x2` · comparison · group · layout · must
- **short:** `Two-by-two quadrant grid with axis labels and optional plotted items`
- **Slots:** `xAxis!: object{ low!: text, high!: text, title: text }`; `yAxis!: object{ low!: text, high!: text, title: text }`;
  `quadrants!: list<object{ label!: text maxChars 30, text: text maxChars 100 }>` (exactly 4, order
  TL, TR, BL, BR); `items: list<object{ label!: text, x!: number 0–1, y!: number 0–1 }>` (0–12)
- **Options:** `highlight: enum[none, TL, TR, BL, BR]`; `style: enum[tinted, lines]`
- **Toggles:** `showItems` → `items`; `showAxisTitles` → `axis-title`.
- **Parts / motion:** `axes`, `q-<i>`, `item-<i>`; `draw-axis-then-nodes`.
- **when:** Contrast on two dimensions: effort/impact, BCG, Eisenhower.
- **avoid:** Strengths/weaknesses/opportunities/threats, so use `tls.g.swot` (same geometry,
  fixed labels and colours).

### 8. `tls.g.swot` · comparison · group · composite · must
- **short:** `SWOT grid of strengths, weaknesses, opportunities and threats as bullet lists`
- **Slots:** `strengths!`, `weaknesses!`, `opportunities!`, `threats!`: each `list<text maxChars 80>` (1–5)
- **Options:** `style: enum[tinted, outline]`; `letters: boolean` (big S/W/O/T watermark letters)
- **Build:** `defineCompositeBlock` → `tls.l.grid` (2×2) of `tls.l.card` → `tls.l.stack` [`tls.t.kicker`, `tls.t.bullets`].
  Colour per quadrant: S positive, W negative, O accent, T warning, all as roles.
- **Motion:** composite (`stagger-grid` as one unit, v1 limitation).
- **when:** Contrast: strategic assessment of an organisation or idea.
- **avoid:** Any other 2×2, so use `tls.g.matrix-2x2`.

### 9. `tls.g.pros-cons` · comparison · group · layout · must
- **short:** `Two columns of advantages and disadvantages with check and cross icons`
- **Slots:** `prosTitle: text` (default "Pros"); `consTitle: text` (default "Cons");
  `pros!: list<text maxChars 90>` (1–6); `cons!: list<text maxChars 90>` (1–6); `verdict: text maxChars 120`
- **Options:** `style: enum[columns, cards]`; `balance: enum[equal, auto]`
- **Toggles:** `showVerdict` → `verdict`.
- **Parts / motion:** `pros`, `cons`, `verdict`; `split-in`.
- **when:** Contrast of one option's upsides and downsides.
- **avoid:** Comparing several options, so use `tls.c.comparison` or `tls.d.compare-table`.

### 16. `tls.g.before-after` · comparison · group · layout · should
- **short:** `Before and after panels joined by an arrow, text or image in each`
- **Slots:** `before!: object{ label: text, title!: text, text: text, image: image }`; `after!` (same)
- **Options:** `arrow: enum[arrow, chevron, none]`; `emphasis: enum[after, none]` (after gets the accent)
- **Parts / motion:** `before`, `arrow`, `after`; `split-in`.
- **when:** Contrast over time: transformation, redesign, problem → solution.
- **avoid:** Numeric before/after, so use `tls.d.stat-compare`.

### 10. `tls.g.venn` · relationship · group · layout · must
- **short:** `Two or three overlapping circles with labels and a label for the overlap`
- **Slots:** `sets!: list<object{ label!: text maxChars 24, text: text maxChars 60 }>` (2–3);
  `overlap: text maxChars 30` (centre); `pairOverlaps: list<text>` (3-set only: AB, BC, AC)
- **Options:** `opacity: enum[soft, medium]`; `labels: enum[inside, outside]`
- **Build:** circle `path`s with fill alpha from color-math. There's no blend mode, so the
  overlap tint comes from stacking the alpha fills, which is consistent in DOM and SVG.
- **Parts / motion:** `set-<i>`, `overlap`; `fade-up` per set (stagger).
- **when:** Overlap: shared traits, intersection of skills or markets.
- **avoid:** More than 3 sets, so use `tls.d.compare-table`.

### 14. `tls.g.hub-spoke` · relationship · group · layout · should
- **short:** `Central hub with satellite nodes radiating out on connecting lines`
- **Slots:** `hub!: object{ label!: text maxChars 24, icon: icon }`; `spokes!: list<object{ label!: text maxChars 24, text: text maxChars 70, icon: icon }>` (3–8)
- **Options:** `layout: enum[circle, half]`; `connector: enum[line, arrow-out, arrow-in, none]`
- **Parts / motion:** `hub`, `spoke-<i>`, `link-<i>`; `sweep-nodes`.
- **when:** Centre/satellite: ecosystem, stakeholders around a product, core + modules.
- **avoid:** Ordered loops, so use `tls.g.cycle`.

### 20. `tls.g.bracket` · relationship · group · layout · could
- **short:** `Curly brace grouping several items under one label`
- **Slots:** `label!: text maxChars 40`; `items!: list<text maxChars 60>` (2–6)
- **Options:** `side: enum[right, left, top]`; `style: enum[brace, bracket]`
- **Parts / motion:** `items`, `brace`, `label`; `draw-path`.
- **when:** Membership: these items together form one thing.
- **avoid:** Values to sum up, so use `tls.g.breakdown`.

### 21. `tls.g.iceberg` · comparison · group · layout · could
- **short:** `Iceberg split at the waterline into visible and hidden items`
- **Slots:** `above!: object{ label!: text, items!: list<text> (1–4) }`; `below!` (same, 1–6)
- **Options:** `waterline: enum[third, half]`
- **Parts / motion:** `above`, `water`, `below`; `reveal-down`.
- **when:** Contrast of visible symptoms vs hidden causes.
- **avoid:** Two equal sides, so use `tls.g.pros-cons`.

### 19. `tls.g.arrow` · decoration · element · layout · could
- **short:** `Standalone straight, curved or elbow arrow with an optional label`
- **Slots:** `label: text maxChars 30`
- **Options:** `kind: enum[straight, curved, elbow]`; `direction: enum[right, left, up, down]`;
  `heads: enum[end, both, none]`; `weight: enum[md, sm, lg]`; `tone: enum[accent, text, muted]`
- **Parts / motion:** `arrow`, `label`; `draw-path`.
- **when:** Pointing from one block to another on a free layout.
- **avoid:** Connecting steps, because diagrams draw their own connectors.

---

## Phase done when
- [ ] Must blocks ✅ (part A: chevrons, cycle, timeline, roadmap done; tree, pyramid, matrix-2x2, swot, pros-cons, venn open); four demo slides screenshotted and opened (process and timeline slides done, hierarchy and strategy open).
- [ ] Every block's `describe.when` starts with its relationship word.
- [ ] Full suite, tsc 0, README counts and session log updated.
