# 3. The block catalog

**170 blocks across 8 families.** This is the target inventory, not a shopping list to be trimmed
casually — the families map onto `ppt-master`'s device menu, layout structures, page recipes and
image composition families, so a gap here is a slide somebody cannot build.

**How to read a row.** `id` is the registry key. **Slots** are `role: 'content'` unless marked
`(opt)`, which means `role: 'option'` — content is what an AI writes, options are what a
template/theme/user chooses ([01-architecture.md](01-architecture.md) §1.5). **Tier** A = pure
`layout()`, exports headlessly; B = DOM-only with a poster (§01 1.6). **Motion** is the *default*
recipe id from [05-motion-system.md](05-motion-system.md) §3 — every one is overridable and every
one is inert unless the deck opts into motion.

**Naming.** `tls.<family-prefix>.<name>`, lowercase, kebab. Prefixes: `l` layout, `t` text,
`d` data, `g` diagram, `m` media, `c` composite, `x` chrome, `v` live.

**Before implementing any block, read [04-block-anatomy.md](04-block-anatomy.md).** It carries the
authoring contract and ten fully worked definitions; these tables are the index, not the spec.

---

## A. Layout & container blocks — 14

The only blocks that accept `{ kind: 'blocks' }` children. They own arrangement and nothing else:
a container draws no text and, except `card`/`panel`/`section`, no fill.

| id | name | slots | key options | tier | motion |
|---|---|---|---|---|---|
| `tls.l.stack` | Vertical stack | `children` | `gap`(opt) `align`(opt) `distribute`(opt) | A | `stagger-children` |
| `tls.l.row` | Horizontal row | `children` | `gap`(opt) `align`(opt) `wrap`(opt) `itemWidths`(opt) | A | `stagger-children` |
| `tls.l.grid` | Grid | `children` | `cols`(opt) `rows`(opt) `gap`(opt) `flow`(opt) `equalHeight`(opt) | A | `stagger-grid` |
| `tls.l.split` | Two-pane split | `start` `end` | `ratio`(opt 1:1/3:7/2:8/…) `axis`(opt) `gutter`(opt) `swap`(opt) | A | `split-in` |
| `tls.l.thirds` | Three-pane split | `start` `middle` `end` | `ratios`(opt) `axis`(opt) | A | `stagger-children` |
| `tls.l.overlay` | Z-stacked overlay | `base` `over` | `anchor`(opt 9-point) `inset`(opt) `scrim`(opt) | A | `fade` |
| `tls.l.card` | Card / panel | `children` | `tone`(opt) `radius`(opt) `padding`(opt) `elevation`(opt) `border`(opt) | A | `fade-up` |
| `tls.l.section` | Titled section | `title` `children` | `rule`(opt) `titleSize`(opt) | A | `title-then-body` |
| `tls.l.band` | Full-width band | `children` | `fill`(opt) `height`(opt) `bleed`(opt) | A | `wipe-x` |
| `tls.l.field` | Page field | `children` | `shape`(opt rect/arc/aperture/blob) `fill`(opt) `bleed`(opt) | A | `field-in` |
| `tls.l.repeater` | Repeat one block over data | `template` `items` | `cols`(opt) `gap`(opt) `limit`(opt) | A | `stagger-grid` |
| `tls.l.spacer` | Explicit gap | — | `size`(opt) `axis`(opt) | A | `none` |
| `tls.l.frame` | Aspect-locked frame | `children` | `aspect`(opt) `fit`(opt) | A | `none` |
| `tls.l.masonry` | Masonry columns | `children` | `cols`(opt) `gap`(opt) | A | `stagger-grid` |

> `tls.l.field` is `ppt-master`'s *page field* — "one large surface, outline, aperture, or
> off-canvas contour organizing zones instead of a card per unit". It is the named antidote to the
> repeating-card-grid failure mode, so it exists as a first-class container rather than as a
> styling option on `card`.

---

## B. Text & typographic blocks — 24

| id | name | slots | key options | tier | motion |
|---|---|---|---|---|---|
| `tls.t.title` | Slide title | `text`(rich) | `size`(opt) `align`(opt) `rule`(opt) `maxLines`(opt) | A | `fade-up` |
| `tls.t.subtitle` | Subtitle | `text`(rich) | `align`(opt) | A | `fade-up` |
| `tls.t.kicker` | Kicker / eyebrow | `text` | `case`(opt) `tracking`(opt) `marker`(opt) | A | `fade` |
| `tls.t.heading` | Section heading | `text`(rich) | `level`(opt) `rule`(opt) | A | `fade-up` |
| `tls.t.lead` | Lead paragraph | `text`(rich) | `align`(opt) `dropCap`(opt) | A | `fade-up` |
| `tls.t.body` | Body copy | `text`(rich) | `columns`(opt) `align`(opt) `autoFit`(opt) | A | `fade` |
| `tls.t.bullets` | Bullet list | `items`(rich[]) | `marker`(opt dot/dash/chevron/icon) `indentLevels`(opt) `spacing`(opt) | A | `stagger-lines` |
| `tls.t.numbered` | Numbered list | `items`(rich[]) | `style`(opt 1./01/roman) `markerShape`(opt) | A | `stagger-lines` |
| `tls.t.checklist` | Checklist | `items[{text,checked}]` | `checkIcon`(opt) `strikeDone`(opt) | A | `stagger-lines` |
| `tls.t.statement` | Big statement | `text`(rich) | `size`(opt) `align`(opt) `emphasisWord`(opt) | A | `words-in` |
| `tls.t.quote` | Pull quote | `text`(rich) `attribution` `role` | `markStyle`(opt glyph/rule/none) `portrait`(opt) | A | `quote-in` |
| `tls.t.testimonial` | Testimonial | `text` `name` `role` `avatar` `logo` | `layout`(opt) | A | `quote-in` |
| `tls.t.takeaway` | Takeaway box | `text`(rich) | `tone`(opt) `icon`(opt) `label`(opt) | A | `fade-up` |
| `tls.t.callout` | Callout | `text`(rich) `title` | `variant`(opt info/warn/danger/success) `icon`(opt) | A | `fade-up` |
| `tls.t.hero-number` | Hero number | `value` `unit` `caption` | `format`(opt) `emphasis`(opt) | A | `count-up` |
| `tls.t.definition` | Term + definition | `term` `definition` | `layout`(opt inline/stacked) | A | `fade-up` |
| `tls.t.kv-list` | Key–value list | `items[{key,value}]` | `separator`(opt) `align`(opt) `leader`(opt) | A | `stagger-lines` |
| `tls.t.caption` | Caption | `text` | `align`(opt) `position`(opt) | A | `fade` |
| `tls.t.footnote` | Footnote / source | `text` | `marker`(opt) | A | `fade` |
| `tls.t.label` | Label / tag / chip | `text` | `tone`(opt) `shape`(opt pill/rect) `icon`(opt) | A | `pop` |
| `tls.t.code` | Code block | `code` `language` | `theme`(opt) `lineNumbers`(opt) `highlightLines`(opt) | A | `stagger-lines` |
| `tls.t.formula` | Formula | `latex` | `display`(opt inline/block) `numbered`(opt) | A | `fade` |
| `tls.t.lead-in` | Lead-in sentence | `text`(rich) | `rule`(opt) | A | `fade-up` |
| `tls.t.prose-columns` | Multi-column prose | `text`(rich) | `columns`(opt) `rule`(opt) `balance`(opt) | A | `fade` |

---

## C. Data & chart blocks — 32

Chart blocks share one `series` slot shape and one axis/legend engine (§04 §3), so adding the
18th chart type is small once the 1st exists. All Tier A: a chart is geometry plus text, which is
precisely what `layout()` produces. Hover/tooltip variants are Tier B and live in family H.

| id | name | slots | key options | tier | motion |
|---|---|---|---|---|---|
| `tls.d.kpi` | KPI tile | `label` `value` `unit` `delta` `deltaLabel` | `tone`(opt) `icon`(opt) `trendIcon`(opt) `sparkline`(opt) | A | `count-up` |
| `tls.d.kpi-row` | KPI row | `items[kpi]` | `cols`(opt) `divider`(opt) | A | `stagger-children` |
| `tls.d.stat-compare` | Stat comparison | `left{label,value}` `right{label,value}` | `emphasis`(opt) `connector`(opt) | A | `count-up` |
| `tls.d.big-number` | Number + sparkline | `value` `caption` `series` | `format`(opt) | A | `count-up` |
| `tls.d.scorecard` | Scorecard | `items[{label,value,target,status}]` | `showTarget`(opt) `statusMode`(opt) | A | `stagger-lines` |
| `tls.d.bar` | Bar chart (horizontal) | `series` `categories` | `sort`(opt) `valueLabels`(opt) `baseline`(opt) `highlightIndex`(opt) | A | `grow-bars-x` |
| `tls.d.column` | Column chart (vertical) | `series` `categories` | same as bar | A | `grow-bars-y` |
| `tls.d.grouped-bar` | Grouped bars | `series[]` `categories` | `legend`(opt) `gap`(opt) | A | `grow-bars-y` |
| `tls.d.stacked-bar` | Stacked bars | `series[]` `categories` | `normalize`(opt 100%) `legend`(opt) | A | `grow-segments` |
| `tls.d.line` | Line chart | `series[]` `categories` | `smooth`(opt) `markers`(opt) `endLabels`(opt) | A | `draw-path` |
| `tls.d.area` | Area chart | `series[]` `categories` | `stacked`(opt) `opacity`(opt) | A | `draw-path` |
| `tls.d.combo` | Line + column combo | `columns` `line` `categories` | `secondAxis`(opt) | A | `grow-bars-y` |
| `tls.d.pie` | Pie chart | `series` `categories` | `startAngle`(opt) `labels`(opt) | A | `sweep` |
| `tls.d.donut` | Donut chart | `series` `categories` `centerLabel` | `thickness`(opt) `centerValue`(opt) | A | `sweep` |
| `tls.d.progress-bar` | Progress bar | `value` `max` `label` | `showPercent`(opt) `thickness`(opt) | A | `grow-bars-x` |
| `tls.d.progress-ring` | Progress ring | `value` `max` `label` | `thickness`(opt) `cap`(opt) | A | `sweep` |
| `tls.d.gauge` | Gauge | `value` `min` `max` `bands` | `needle`(opt) `labels`(opt) | A | `sweep` |
| `tls.d.bullet` | Bullet chart | `value` `target` `bands` `label` | `orientation`(opt) | A | `grow-bars-x` |
| `tls.d.sparkline` | Sparkline | `series` | `fill`(opt) `endDot`(opt) | A | `draw-path` |
| `tls.d.waterfall` | Waterfall | `steps[{label,delta,isTotal}]` | `connectors`(opt) | A | `stagger-children` |
| `tls.d.funnel-chart` | Funnel (quantitative) | `stages[{label,value}]` | `showDropoff`(opt) | A | `stagger-children` |
| `tls.d.scatter` | Scatter plot | `points[{x,y,label,group}]` | `trendline`(opt) `quadrants`(opt) | A | `pop-points` |
| `tls.d.bubble` | Bubble chart | `points[{x,y,r,label}]` | `sizeLegend`(opt) | A | `pop-points` |
| `tls.d.heatmap` | Heatmap | `rows` `cols` `values` | `ramp`(opt) `showValues`(opt) | A | `stagger-grid` |
| `tls.d.dot-plot` | Dot / distribution plot | `series` `categories` | `connect`(opt) | A | `pop-points` |
| `tls.d.radar` | Radar chart | `series[]` `axes` | `fill`(opt) `maxValue`(opt) | A | `draw-path` |
| `tls.d.table` | Table | `head[]` `rows[][]` | `zebra`(opt) `align[]`(opt) `emphasisRow`(opt) `colWidths`(opt) | A | `stagger-lines` |
| `tls.d.compare-table` | Comparison table | `criteria[]` `options[]` `cells[][]` | `cellKind`(opt text/check/rating) `winner`(opt) | A | `stagger-lines` |
| `tls.d.pricing-table` | Pricing table | `plans[{name,price,period,features[],cta,featured}]` | `cols`(opt) | A | `stagger-children` |
| `tls.d.ranking` | Ranked list | `items[{rank,label,value}]` | `showBars`(opt) `medal`(opt) | A | `stagger-lines` |
| `tls.d.trend-badge` | Trend badge | `delta` `label` | `format`(opt) `arrow`(opt) | A | `pop` |
| `tls.d.legend` | Standalone legend | `items[{label,color}]` | `orientation`(opt) `shape`(opt) | A | `stagger-lines` |

> **Chart design rules are not per-block.** Direct-label single series instead of a legend; one
> recessive gridline set at most; never a 3D chart; never a dual axis without a stated reason;
> categorical hues capped at 6 (§02 2.2). These live once in the shared chart engine (§04 §3) so
> 18 charts cannot drift apart.

---

## D. Diagram & relationship blocks — 30

These carry `ppt-master`'s *topology* — `order`, `link`, `parent`, `membership`, `contrast`,
`overlap`. Picking the right one is picking the right relationship, which is why the AI contract
(§06 §5) asks for the relationship first and the block second.

| id | name | slots | key options | tier | motion | relationship |
|---|---|---|---|---|---|---|
| `tls.g.steps` | Step strip | `steps[{title,text,icon}]` | `numbered`(opt) `connector`(opt) `axis`(opt) | A | `stagger-children` | order |
| `tls.g.chevrons` | Chevron flow | `steps[{label}]` | `overlap`(opt) `currentIndex`(opt) | A | `stagger-children` | order |
| `tls.g.timeline-h` | Timeline (horizontal) | `events[{date,title,text}]` | `alternate`(opt) `axisStyle`(opt) `nowMarker`(opt) | A | `draw-axis-then-nodes` | order |
| `tls.g.timeline-v` | Timeline (vertical) | `events[…]` | `side`(opt) `density`(opt) | A | `draw-axis-then-nodes` | order |
| `tls.g.roadmap` | Roadmap / Gantt | `tracks[{name,bars[{label,start,end,status}]}]` | `periods`(opt) `todayLine`(opt) | A | `grow-bars-x` | order |
| `tls.g.milestones` | Milestone markers | `items[{date,label,done}]` | `axis`(opt) | A | `stagger-children` | order |
| `tls.g.cycle` | Cycle diagram | `steps[{label,text,icon}]` | `direction`(opt) `arrowStyle`(opt) | A | `sweep-nodes` | link |
| `tls.g.hub-spoke` | Hub & spoke | `hub` `spokes[{label,icon}]` | `radius`(opt) `connector`(opt) | A | `radiate` | link |
| `tls.g.flow` | Flowchart | `nodes[{id,label,kind}]` `edges[{from,to,label}]` | `direction`(opt) `autoRoute`(opt) | A | `stagger-children` | link |
| `tls.g.swimlane` | Swimlane process | `lanes[{name,steps[]}]` | `axis`(opt) | A | `stagger-children` | link |
| `tls.g.tree` | Org / hierarchy tree | `root{label,children[]}` | `direction`(opt) `compact`(opt) | A | `grow-branches` | parent |
| `tls.g.mindmap` | Mind map | `root{label,branches[]}` | `balance`(opt) `curve`(opt) | A | `grow-branches` | parent |
| `tls.g.breakdown` | Breakdown / decomposition | `whole{label,value}` `parts[{label,value}]` | `showShare`(opt) | A | `stagger-children` | parent |
| `tls.g.pyramid` | Pyramid | `levels[{label,text}]` | `direction`(opt) `labelSide`(opt) | A | `stagger-children` | parent |
| `tls.g.layers` | Layer stack | `layers[{label,text}]` | `perspective`(opt) `labelSide`(opt) | A | `stagger-children` | parent |
| `tls.g.funnel` | Funnel (qualitative) | `stages[{label,text}]` | `taper`(opt) | A | `stagger-children` | order |
| `tls.g.venn` | Venn diagram | `sets[{label}]` `intersections[{label}]` | `count`(opt 2/3) `opacity`(opt) | A | `pop` | overlap |
| `tls.g.matrix-2x2` | 2×2 matrix | `axes{x,y}` `quadrants[{label,text}]` `items[{label,x,y}]` | `labelAxes`(opt) `plotItems`(opt) | A | `draw-axis-then-nodes` | contrast |
| `tls.g.matrix-grid` | N×M matrix | `rows[]` `cols[]` `cells[][]` | `cellKind`(opt) | A | `stagger-grid` | membership |
| `tls.g.compare` | Side-by-side compare | `left{title,items[]}` `right{title,items[]}` | `divider`(opt) `verdict`(opt) | A | `split-in` | contrast |
| `tls.g.pros-cons` | Pros & cons | `pros[]` `cons[]` | `icons`(opt) `tone`(opt) | A | `split-in` | contrast |
| `tls.g.before-after` | Before / after | `before{label,content}` `after{label,content}` | `mode`(opt split/slider) `arrow`(opt) | A | `split-in` | contrast |
| `tls.g.journey` | Journey map | `stages[{name,actions,feeling}]` | `emotionCurve`(opt) | A | `draw-axis-then-nodes` | order |
| `tls.g.kanban` | Kanban board | `columns[{name,cards[]}]` | `wipLimits`(opt) | A | `stagger-grid` | membership |
| `tls.g.checklist-grid` | Feature matrix | `features[]` `columns[]` `marks[][]` | `markKind`(opt) | A | `stagger-grid` | membership |
| `tls.g.group-bracket` | Bracket group | `label` `items[]` | `side`(opt) `style`(opt brace/bracket) | A | `draw-path` | membership |
| `tls.g.callout-pin` | Annotation pin | `target{x,y}` `text` | `leader`(opt) `shape`(opt) | A | `draw-path` | annotation |
| `tls.g.arrow` | Standalone arrow | `label` | `kind`(opt straight/curved/elbow) `heads`(opt) | A | `draw-path` | direction |
| `tls.g.iceberg` | Iceberg | `above{label,items[]}` `below{label,items[]}` | `waterline`(opt) | A | `reveal-down` | contrast |
| `tls.g.stakeholders` | Stakeholder map | `center` `actors[{label,distance,influence}]` | `rings`(opt) | A | `radiate` | link |

---

## E. Media & icon blocks — 24

Option vocabulary follows `ppt-master`'s image composition families (§02 2.6): `P1` single visual,
`P2` image-as-canvas, `P3` multi-visual, with `M1/M2/M3` modifiers.

| id | name | slots | key options | tier | motion |
|---|---|---|---|---|---|
| `tls.m.image` | Image | `image` `alt` | `fit`(opt) `focalPoint`(opt) `radius`(opt) `frame`(opt) | A | `fade` |
| `tls.m.image-caption` | Image + caption | `image` `caption` `credit` `alt` | `captionPos`(opt) | A | `fade-up` |
| `tls.m.image-bleed` | Full-bleed image | `image` `alt` | `focalPoint`(opt) `scrim`(opt) | A | `ken-burns` |
| `tls.m.image-text` | Image + floating text | `image` `title` `text` | `scrimDirection`(opt) `textAnchor`(opt) | A | `scrim-then-text` |
| `tls.m.image-shaped` | Shaped image | `image` `alt` | `shape`(opt circle/arch/blob/hex) `ring`(opt) | A | `mask-reveal` |
| `tls.m.image-duotone` | Duotone image | `image` | `colors`(opt) `blend`(opt) | A | `fade` |
| `tls.m.image-grid` | Image grid | `images[]` | `cols`(opt) `gap`(opt) `uniformCrop`(opt) | A | `stagger-grid` |
| `tls.m.image-collage` | Collage | `images[]` | `pattern`(opt) `overlap`(opt) `rotation`(opt) | A | `stagger-children` |
| `tls.m.image-compare` | Before/after images | `before` `after` `labels` | `mode`(opt split/overlay) | A | `wipe-x` |
| `tls.m.image-sequence` | Image sequence | `images[]` `captions[]` | `arrows`(opt) | A | `stagger-children` |
| `tls.m.gallery-strip` | Thumbnail strip | `images[]` | `height`(opt) `scrollHint`(opt) | A | `stagger-children` |
| `tls.m.icon` | Icon | `icon` | `size`(opt) `tone`(opt) `background`(opt) | A | `pop` |
| `tls.m.icon-label` | Icon + label | `icon` `label` `text` | `layout`(opt stacked/inline) `shape`(opt) | A | `fade-up` |
| `tls.m.icon-grid` | Icon grid | `items[{icon,label,text}]` | `cols`(opt) `iconSize`(opt) | A | `stagger-grid` |
| `tls.m.icon-list` | Icon list | `items[{icon,text}]` | `spacing`(opt) | A | `stagger-lines` |
| `tls.m.avatar` | Avatar | `image` `name` `role` | `shape`(opt) `size`(opt) | A | `pop` |
| `tls.m.avatar-group` | Avatar group | `people[]` | `overlap`(opt) `max`(opt) `showOverflow`(opt) | A | `stagger-children` |
| `tls.m.logo` | Logo | `image` `alt` | `maxHeight`(opt) `mono`(opt) | A | `fade` |
| `tls.m.logo-wall` | Logo wall | `logos[]` | `cols`(opt) `mono`(opt) `uniformHeight`(opt) | A | `stagger-grid` |
| `tls.m.device-mock` | Device mockup | `image` | `device`(opt phone/laptop/browser) `angle`(opt) | A | `fade-up` |
| `tls.m.qr` | QR code | `url` `caption` | `ecLevel`(opt) `quietZone`(opt) | A | `pop` |
| `tls.m.map` | Static map | `image` `markers[]` `caption` | `style`(opt) | A | `pop-points` |
| `tls.m.decoration` | Decorative shape | — | `shape`(opt blob/arc/grid/dots/wave) `tone`(opt) `rotation`(opt) | A | `field-in` |
| `tls.m.pattern` | Background pattern | — | `pattern`(opt dots/lines/grid/noise) `opacity`(opt) `scale`(opt) | A | `none` |

---

## F. Composite slide blocks — 20

A composite is a **whole slide's worth of arrangement** built from the blocks above, exposed as
one insertable unit. These are what the AI reaches for first and what P29 rebuilds the twelve
Phase 13 starter templates on top of. Each is a container tree with named slots — no new
rendering code.

| id | name | slots | key options | tier | motion |
|---|---|---|---|---|---|
| `tls.c.cover` | Cover / title slide | `title` `subtitle` `kicker` `meta` `image` `logo` | `variant`(opt centered/split/bleed) | A | `cover-in` |
| `tls.c.section` | Section divider | `number` `title` `subtitle` `image` | `variant`(opt field/bleed/numeral) | A | `section-in` |
| `tls.c.agenda` | Agenda / TOC | `items[{title,text}]` | `numbered`(opt) `cols`(opt) `currentIndex`(opt) | A | `stagger-lines` |
| `tls.c.title-content` | Title + content | `title` `content`(blocks) | `contentWidth`(opt) | A | `title-then-body` |
| `tls.c.two-column` | Two columns | `title` `left`(blocks) `right`(blocks) | `ratio`(opt) `divider`(opt) | A | `title-then-split` |
| `tls.c.image-left` | Image + text | `title` `image` `content`(blocks) `caption` | `side`(opt) `ratio`(opt) `bleed`(opt) | A | `title-then-split` |
| `tls.c.statement` | Big statement slide | `statement` `attribution` | `variant`(opt plain/field/image) | A | `words-in` |
| `tls.c.quote-slide` | Quote slide | `quote` `name` `role` `portrait` | `variant`(opt) | A | `quote-in` |
| `tls.c.kpi-dashboard` | KPI dashboard | `title` `kpis[]` `chart` `note` | `layout`(opt row/grid) | A | `dashboard-in` |
| `tls.c.chart-insight` | Chart + insight | `title` `chart` `insight` `source` | `side`(opt) `ratio`(opt) | A | `title-then-split` |
| `tls.c.three-card` | Three cards | `title` `cards[{icon,title,text}]` | `tone`(opt) `equalHeight`(opt) | A | `stagger-children` |
| `tls.c.feature-grid` | Feature grid | `title` `features[{icon,title,text}]` | `cols`(opt) | A | `stagger-grid` |
| `tls.c.comparison` | Comparison slide | `title` `left` `right` `verdict` | `mode`(opt columns/table) | A | `split-in` |
| `tls.c.process-slide` | Process slide | `title` `steps[]` `note` | `axis`(opt) `numbered`(opt) | A | `stagger-children` |
| `tls.c.timeline-slide` | Timeline slide | `title` `events[]` `note` | `axis`(opt) | A | `draw-axis-then-nodes` |
| `tls.c.team` | Team grid | `title` `people[{avatar,name,role,bio}]` | `cols`(opt) `shape`(opt) | A | `stagger-grid` |
| `tls.c.table-slide` | Table slide | `title` `table` `note` `source` | — | A | `title-then-body` |
| `tls.c.closing` | Closing / CTA | `title` `text` `cta` `contact` `qr` | `variant`(opt) | A | `closing-in` |
| `tls.c.contact` | Contact | `name` `role` `email` `phone` `links[]` `avatar` | `layout`(opt) | A | `stagger-lines` |
| `tls.c.blank` | Blank content field | `content`(blocks) | `margin`(opt) | A | `none` |

---

## G. Chrome & master blocks — 14

These live on a **master** (§06 §3), not on a slide: edited in one place, rendered on every slide
that uses the master, not individually selectable on the slide. This closes the *"master/layout
slide — not built, still open"* follow-up named in `reviews/roadmap-slides.md` (Phase 13).

| id | name | slots | key options | tier | motion |
|---|---|---|---|---|---|
| `tls.x.header` | Header band | `title` `meta` | `rule`(opt) `height`(opt) `align`(opt) | A | `none` |
| `tls.x.footer` | Footer | `text` | `rule`(opt) `align`(opt) | A | `none` |
| `tls.x.page-number` | Page number | — | `format`(opt "3" / "3 / 24") `position`(opt) `skipOn`(opt) | A | `none` |
| `tls.x.logo-mark` | Logo mark | `image` | `position`(opt) `size`(opt) `mono`(opt) | A | `none` |
| `tls.x.watermark` | Watermark | `text` `image` | `opacity`(opt) `rotation`(opt) | A | `none` |
| `tls.x.section-tab` | Section indicator | `sections[]` | `currentIndex`(opt) `style`(opt dots/bar/tabs) | A | `none` |
| `tls.x.progress` | Deck progress bar | — | `position`(opt) `thickness`(opt) | A | `grow-bars-x` |
| `tls.x.confidential` | Confidentiality mark | `text` | `position`(opt) | A | `none` |
| `tls.x.date` | Date / version | `text` | `format`(opt) | A | `none` |
| `tls.x.speaker` | Speaker badge | `name` `role` `avatar` | `position`(opt) | A | `none` |
| `tls.x.rule` | Decorative rule | — | `axis`(opt) `weight`(opt) `tone`(opt) `gradient`(opt) | A | `wipe-x` |
| `tls.x.corner-mark` | Corner motif | — | `shape`(opt) `corner`(opt) `size`(opt) | A | `none` |
| `tls.x.safe-area` | Safe-area guide | — | `margin`(opt) | A | `none` (editor-only, never exported) |
| `tls.x.grid-guide` | Layout grid guide | — | `cols`(opt) `gutter`(opt) | A | `none` (editor-only, never exported) |

> The last two render only in the editor. They must be excluded from `renderPageToSvg`, export and
> presentation — implemented as a `editorOnly: true` flag on the definition, checked in one place.

---

## H. Live / interactive blocks — 12 (Tier B)

Every one of these needs interaction or a foreign runtime, and every one ships a `poster()` so
export and thumbnails still show something honest. **This family is capped**: adding a 13th
requires justifying why `layout()` cannot express it.

| id | name | slots | key options | why Tier B | poster |
|---|---|---|---|---|---|
| `tls.v.chart-live` | Interactive chart | same as its static twin | `tooltip`(opt) `drill`(opt) | pointer tooltips, hit-testing | the static chart |
| `tls.v.tabs` | Tabs | `tabs[{label,content}]` | `initialIndex`(opt) | click state | active tab |
| `tls.v.accordion` | Accordion | `items[{title,body}]` | `openIndex`(opt) | expand/collapse | all collapsed |
| `tls.v.carousel` | Carousel | `slides[blocks]` | `autoplay`(opt) `dots`(opt) | timed/paged state | first item |
| `tls.v.counter` | Animated counter | `from` `to` `unit` | `duration`(opt) `easing`(opt) | continuous animation | final value |
| `tls.v.countdown` | Countdown | `target` `labels` | `format`(opt) | wall-clock | static remaining |
| `tls.v.video` | Video | `assetId` `poster` `alt` | `autoplay`(opt) `loop`(opt) `muted`(opt) | media element | poster frame |
| `tls.v.embed` | Iframe embed | `url` `title` | `aspect`(opt) `sandbox`(opt) | foreign document | URL card |
| `tls.v.poll` | Live poll result | `question` `options[]` `results` | `source`(opt) | external data | last snapshot |
| `tls.v.map-live` | Interactive map | `center` `zoom` `markers` | `provider`(opt) | pan/zoom | static map tile |
| `tls.v.code-run` | Runnable code | `code` `language` | `runtime`(opt) | executes code | static code block |
| `tls.v.ticker` | Live data ticker | `source` `fields[]` | `interval`(opt) | polling | last values |

**Hard rules for Tier B, all from real traps already paid for in this repo** (§01 1.12):
any free-typed input uses `stopKeyPropagationUnlessEscape`; interactive controls
`stopPropagation` on pointer-down; overlays portal to `document.body`; every timer, interval,
subscription and animation is torn down on unmount *and* paused when not presenting, because
`isStateful = true` keeps blocks mounted off-screen forever.

---

## Coverage check against the sources

A sanity pass, so a missing family is caught now rather than in P28.

| `ppt-master` device | Covered by |
|---|---|
| Gradient block / band | `l.band`, `l.field`, `m.pattern` |
| Rounded card | `l.card` |
| Icon with label | `m.icon-label`, `m.icon-grid`, `m.icon-list` |
| Numbered circle / badge | `t.label`, `g.steps` (numbered), `g.milestones` |
| Color swatch | `d.legend`, `t.kv-list` (swatch variant) |
| KPI card | `d.kpi`, `d.kpi-row` |
| Takeaway box | `t.takeaway` |
| Divider / rule | `x.rule`, `l.section` (rule option) |
| Full-bleed image + scrim | `m.image-bleed`, `m.image-text` |
| Framed / shaped picture | `m.image-shaped`, `m.image-caption` |
| Quote block | `t.quote`, `t.testimonial`, `c.quote-slide` |
| Timeline / step strip | `g.timeline-h/-v`, `g.steps`, `g.chevrons` |
| Process / decision diagram | `g.flow`, `g.swimlane`, `g.cycle` |
| Callout / annotation | `t.callout`, `g.callout-pin`, `g.arrow` |
| Display text w/ gradient or glow | `t.statement`, `t.hero-number` (tone options) |
| Accent gradient rule / band | `x.rule` (gradient), `l.band` |
| Elevated primary object | any block, `elevation: 2` |
| Duotone / brand-wash image | `m.image-duotone`, `m.image-bleed` (wash) |

| `ppt-master` page type (all 5 layout systems) | Covered by |
|---|---|
| title_slide / cover / hero_full / hero_side_scrim | `c.cover` variants |
| section_header / chapter_full / section_divider | `c.section` variants |
| title_content / content_caption | `c.title-content` |
| two_content / split_bleed / editorial_split / stacked_split | `c.two-column`, `c.image-left` |
| comparison | `c.comparison`, `g.compare` |
| picture_caption / title_picture / two_picture_caption / screenshot_focus | `c.image-left`, `m.image-caption`, `m.device-mock` |
| hero_statement / full_statement / quote_over_image | `c.statement`, `c.quote-slide` |
| three_card / triptych | `c.three-card` |
| kpi_dashboard / kpi_grid / kpi_row | `c.kpi-dashboard`, `d.kpi-row` |
| process_timeline | `c.process-slide`, `c.timeline-slide` |
| data_story / chart_insight | `c.chart-insight` |
| table_summary | `c.table-slide` |
| matrix_2x2 | `g.matrix-2x2` |
| image_grid_four / image_center / image_full | `m.image-grid`, `m.image-bleed` |
| agenda / toc | `c.agenda` |
| appendix / blank | `c.blank` |
| closing / ending | `c.closing`, `c.contact` |

**Gaps knowingly left open**, to be reconsidered after P28 rather than guessed at now: musical/
score notation, chemical structures, engineering schematics, seating/floor plans, calendar grids,
and org-wide dashboards with live filters. Each is a vertical feature, not a general slide block.
</content>
