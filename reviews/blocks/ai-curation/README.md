# AI curation — a core block set, deck styles, and the picking pipeline

**Date:** 2026-10-09 · **Branch:** `plan/block-system` · **Against commit:** `a8281fdf` (LO8 done)
**Status:** AC0, AC1 done (2026-10-09); next AC2. Resume from [§7 Progress](#7-progress).

**Goal (product owner, 2026-10-09):** the html-kind blocks on the LO7 slides (hero, stat-spotlight
ring with three KPI columns, testimonial, kinetic-title, feature-grid, feature-reveal, big-stat)
look good. Now: (1) review the 129 blocks for redundancy and gaps; (2) give the LLM a **short
priority list** — few blocks, each with enough variants that the LLM can produce many looks and
customise easily; (3) let the user pick a **deck style** at deck creation (Premium & Elegant /
Modern & Digital / Playful & Creative / Professional & Corporate); (4) choose frontend libraries
that make slides more beautiful at low risk. The editor stays basic: everything here is blocks +
tokens + digest + pipeline, never editor UX
(memory: *editor stays basic, invest in blocks for AI*).

**Read before any phase:** [../README.md](../README.md) governing rules (one layout + two
renderers, spec-not-pixels, colors as roles, additive schema only),
[../block-library/README.md](../block-library/README.md) §Rules (closed vocabularies, cheapest
build path, digest budgets), [../block-review/README.md](../block-review/README.md) §3–4 (shared
working tree, locks, low-resource mode), [../layout-oracle/README.md](../layout-oracle/README.md)
§1–2 (size cards, `analyzeSlide`, the machine rule), [../LLM-ARCHITECTURE.md](../LLM-ARCHITECTURE.md)
§3–4 (profiles, S2 two-tier digest, S4.1 oracle loop).

---

## 0. What the survey found (facts this plan builds on)

| # | Fact | Where | Consequence |
|---|---|---|---|
| F1 | 129 blocks, 23 categories, 8 html-kind (`hero`, `feature-grid`, `testimonial`, `big-stat`, `kinetic-title`, `stat-spotlight`, `journey`, `feature-reveal`). All 129 reviewed ✅/🔧 in the block review; the human review board (artifact `GVkKV9dh…`, collection `reviews`) has **no verdicts recorded yet** | `block-review/README.md` §6; board db | Quality is "works in every use case"; *taste* verdicts are still missing — AC7 asks the user for them on the style decks instead |
| F2 | The blocks the user likes are the **least configurable**: `feature-grid`, `testimonial`, `stat-spotlight`, `journey`, `feature-reveal` have **zero** enum/boolean knobs; `agenda`, `comparison`, `kpi-row` have none or one | dump of `BUILT_IN_BLOCKS` schemas | The cheapest "many looks" win is knobs on the blocks already liked (AC4), not new blocks |
| F3 | A theme (`DeckTheme`, `state/shapes/shared/deck-theme.ts`) controls only **6 colours + 3 status colours, a heading/body `FontStyle` pair + optional CSS family, and `shapeDefaults`**. Five built-ins: `midnight`, `ivory-editorial`, `coral-pop`, `forest`, `mono-grid` (default) | `types.ts` `DeckTheme`, `deck-theme.ts` | A theme is a palette, not a style. Type scale, radius, elevation, density, motion live in `DeckTokens` (`DeckSpec.tokens`), which nothing presets today |
| F4 | `ResolvedTokens.fontFamily` is **one** family (`headingFamily ?? bodyFamily`) — blocks cannot use a serif display face with a sans body | `blocks/tokens.ts` `resolveTokens` | Styles need `headingFamily` + `bodyFamily` on `ResolvedTokens` (additive) and the text engine picking by type token |
| F5 | The oracle measures **Inter only** (`inter-metrics.ts`, browser-measured). `tableFaceKey` maps `"Crimson Pro"` to `inter` (no "serif" in the name) — `ivory-editorial` and `forest` headings are measured as Inter today | `layout/measure.ts:813` | New fonts need width tables (AC2) or the size cards and `analyzeSlide` lie |
| F6 | `rect` nodes have **no shadow**: neither renderer draws an elevation (the `ELEVATION_SCALE` token is unused by paint) | `render-dom.tsx`, `render-svg.ts` (0 hits for `shadow`) | Luxury/glass/corporate "lifted card" needs an additive `shadow` on `rect` (AC3, vocabulary change) |
| F7 | `Paint` = solid / linear / radial gradient; rgba fills pass DOM/SVG parity; `image` nodes accept `url`; `SlideSpec.background?: Paint`; **masters** (`MasterSpec`: background + regions + layout) exist | `types.ts` | Mesh gradients = stacked radial gradients; grain = an `image` node with a bundled data-URI SVG; per-style chrome/background = masters. No new runtime dependency |
| F8 | Index digest is 18.8k of its 20k budget with all 129 blocks + size hints | LO3 notes | A tier-1-only index (~45 blocks) frees ~11k chars for style cards and recipes |
| F9 | `LLM-ARCHITECTURE.md` §3.1 profiles name layouts that do not exist (`hero`, `big-stat`, `image-full`, `bullets`, `steps`) | `slide-layouts.ts` has 16 ids | Recipes (AC6) must name real layout ids; fix §3.1 in the same phase |
| F10 | Known open shared issues that hurt looks: S13 (`blank` layout margins break full-bleed), S28 (hug-content slide blocks sit top-left), S18 (chart labels go near-pure red) | `block-review/README.md` §5 | AC5's `image-full` needs S13; S28 is fixed by recipes picking layouts with `regionAlign` |

---

## 1. Inventory — 129 blocks, redundancy and gaps

### 1.1 How to read the table

- **Kind**: `html` = Tier B template + poster (richest visuals, CSS); `layout` = Tier A pure
  layout (composite or hand-written); `struct` = invisible container.
- **Look knobs**: enum slots with their option count and boolean toggles — what an LLM can turn
  to change the look without changing content. **none** = a single look.
- **Tier**: the proposed AI tier (§2). `1` = in the default digest; `2` = available on demand.
- **Absorbed by**: the tier-1 block (or mechanism) the LLM should use instead by default.

Review quality: every block passed the six-case review (C1–C6) after fixes; the per-block notes
live in `block-review/G01…G11`. Below, only blocks with a *standing* caveat are called out in §1.3.

### 1.2 The catalog by category

Generated from the live registry on 2026-10-09 (`BUILT_IN_BLOCKS`, 129 entries).

**structure** (13)

| Block | Kind | Scope | Look knobs (enum(n) / toggle) | Tier | Absorbed by (tier 2) |
|---|---|---|---|---|---|
| `tls.l.stack` | struct | element | gap(10), sizing(2) | 2 | layout regions + recipes |
| `tls.l.row` | struct | element | gap(10), sizing(2) | 2 | layout regions + recipes |
| `tls.l.grid` | struct | element | gap(10), sizing(2) | 2 | layout regions + recipes |
| `tls.l.split` | struct | element | gutter(10), axis(2) | 2 | layout regions + recipes |
| `tls.l.overlay` | struct | element | **none** | 2 | layout regions + recipes |
| `tls.l.card` | struct | element | padding(10) | 2 | layout regions + recipes |
| `tls.l.section` | struct | element | showTitle, showDivider, gap(10) | 2 | layout regions + recipes |
| `tls.l.repeater` | struct | element | direction(2), gap(10) | 2 | layout regions + recipes |
| `tls.l.spacer` | struct | element | **none** | 2 | layout regions + recipes |
| `tls.l.safe-area` | struct | element | inset(10) | 2 | editor guide: hide from AI |
| `tls.l.grid-guide` | struct | element | **none** | 2 | editor guide: hide from AI (S22) |
| `tls.l.sidebar` | struct | element | gutter(10), sidebarSide(2) | 2 | layout regions + recipes |
| `tls.l.footer` | struct | element | gutter(10) | 2 | layout regions + recipes |

**decoration** (5)

| Block | Kind | Scope | Look knobs (enum(n) / toggle) | Tier | Absorbed by (tier 2) |
|---|---|---|---|---|---|
| `tls.l.field` | struct | element | **none** | 2 | style masters (AC4) |
| `tls.g.arrow` | layout | element | kind(3), direction(4), heads(3), weight(3), tone(3) | 2 | style motifs / recipes |
| `tls.m.decoration` | layout | element | shape(6), tone(4), opacity(3) | **1** |  |
| `tls.m.pattern` | layout | element | pattern(4), scale(3), tone(3), opacity(2) | 2 | style masters (AC4) |
| `tls.x.rule` | layout | element | axis(2), weight(3), tone(3), length(2) | 2 | style masters |

**heading** (3)

| Block | Kind | Scope | Look knobs (enum(n) / toggle) | Tier | Absorbed by (tier 2) |
|---|---|---|---|---|---|
| `tls.t.title` | layout | element | size(4), align(3), rule | **1** |  |
| `tls.t.subtitle` | layout | element | align(3) | 2 | tls.c.hero/cover subtitle slots |
| `tls.t.kicker` | layout | element | case(4), tracking(3), marker | 2 | tls.c.hero/cover/divider kicker slots; tls.t.title |

**text** (4)

| Block | Kind | Scope | Look knobs (enum(n) / toggle) | Tier | Absorbed by (tier 2) |
|---|---|---|---|---|---|
| `tls.t.body` | layout | element | align(3), autoFit | **1** |  |
| `tls.t.caption` | layout | element | align(3), position(3) | 2 | caption slots of image/chart blocks |
| `tls.t.footnote` | layout | element | marker(4), align(2) | **1** |  |
| `tls.t.definition` | layout | element | layout(2), termTone(2), showPronunciation, showExample | 2 | tls.t.body / tls.t.statement |

**list** (9)

| Block | Kind | Scope | Look knobs (enum(n) / toggle) | Tier | Absorbed by (tier 2) |
|---|---|---|---|---|---|
| `tls.t.bullets` | layout | element | marker(5), indentLevels, spacing(4) | **1** |  |
| `tls.t.numbered` | layout | element | markerStyle(5), spacing(3), columns(2), markerTone(3) | 2 | tls.t.bullets (marker=number) |
| `tls.t.checklist` | layout | element | doneStyle(3), spacing(3), columns(2) | 2 | tls.t.bullets / tls.c.objectives |
| `tls.t.kv-list` | layout | element | leader(3), valueAlign(2), keyTone(2), columns(2) | 2 | tls.d.table |
| `tls.t.tags` | layout | element | tone(3), shape(2), size(3), align(2), colorBy(2) | 2 | tls.t.bullets |
| `tls.c.feature-grid` | html | group | **none** | **1** |  |
| `tls.c.cards` | layout | group | lead(4), tone(4), align(2) | **1** |  |
| `tls.c.feature-reveal` | html | group | **none** | **1** | (tier 1 until AC2 folds it into tls.c.feature-grid layout=reveal) |
| `tls.m.icon-list` | layout | element | iconStyle(3), iconTone(3), spacing(3), showText | **1** |  |

**metric** (13)

| Block | Kind | Scope | Look knobs (enum(n) / toggle) | Tier | Absorbed by (tier 2) |
|---|---|---|---|---|---|
| `tls.t.hero-number` | layout | element | format(4), emphasis(3) | 2 | tls.c.big-stat |
| `tls.d.progress-bar` | layout | element | showValue(3), thickness(3), tone(2), labelPos(2), track, format(4) | 2 | tls.c.stat-spotlight (visual=bar, AC2) |
| `tls.d.progress-ring` | layout | element | thickness(3), cap(2), tone(2), format(4) | 2 | tls.c.stat-spotlight |
| `tls.d.stat-compare` | layout | group | format(4), delta(3), polarity(3), connector(3) | 2 | tls.c.kpi-row |
| `tls.d.gauge` | layout | element | needle(2), showTicks, format(4) | 2 | tls.c.stat-spotlight |
| `tls.d.trend-badge` | layout | element | format(4), polarity(3), size(3) | 2 | tls.c.kpi-row (delta) |
| `tls.d.bullet-chart` | layout | group | bands(2), format(4) | 2 | specialist, on request |
| `tls.c.kpi-tile` | layout | element | showDelta, showLabel, showSparkline, polarity(2), format(4) | 2 | tls.c.kpi-row |
| `tls.c.kpi-row` | layout | group | gap(4) | **1** |  |
| `tls.c.big-stat` | html | slide | showLabel, showContext, format(4) | **1** |  |
| `tls.c.stat-card` | layout | element | showIcon, format(4), emphasis(3), padding(7) | 2 | tls.c.kpi-row / tls.c.cards |
| `tls.c.dashboard` | layout | slide | layout(2), chartRatio(2), showInsight | 2 | tls.c.chart-insight + tls.c.kpi-row (report profile promotes) |
| `tls.c.stat-spotlight` | html | group | **none** | **1** |  |

**emphasis** (5)

| Block | Kind | Scope | Look knobs (enum(n) / toggle) | Tier | Absorbed by (tier 2) |
|---|---|---|---|---|---|
| `tls.t.quote` | layout | element | markStyle(3) | **1** |  |
| `tls.t.takeaway` | layout | element | tone(4) | **1** |  |
| `tls.t.statement` | layout | element | size(3), align(2), emphasis(3), showAttribution, showMark | **1** |  |
| `tls.t.callout` | layout | element | variant(5), fill(3), showIcon, showTitle | 2 | tls.t.takeaway |
| `tls.c.quote-image` | layout | slide | anchor(3), scrim(2) | 2 | tls.c.testimonial (variant=photo, AC2) |

**learning** (2)

| Block | Kind | Scope | Look knobs (enum(n) / toggle) | Tier | Absorbed by (tier 2) |
|---|---|---|---|---|---|
| `tls.t.qa` | layout | element | marker(3) | 2 | promoted by teach profile |
| `tls.c.quiz` | layout | group | layout(2), reveal(2), showExplanation | 2 | promoted by teach profile |

**chart** (16)

| Block | Kind | Scope | Look knobs (enum(n) / toggle) | Tier | Absorbed by (tier 2) |
|---|---|---|---|---|---|
| `tls.d.bar` | layout | group | orientation(2), valueLabels(2) | **1** |  |
| `tls.d.donut` | layout | group | labels(2), showPercent | **1** |  |
| `tls.d.line` | layout | group | curve(2), markers(3), endLabels, baseline(2), gridlines(2), format(4), legend(4) | **1** |  |
| `tls.d.area` | layout | group | mode(3), curve(2), opacity(2), gridlines(2), format(4), legend(4) | 2 | tls.d.line |
| `tls.d.grouped-bar` | layout | group | orientation(2), groupGap(3), valueLabels(3), gridlines(2), format(4), legend(4) | **1** |  |
| `tls.d.stacked-bar` | layout | group | orientation(2), normalize, totals, valueLabels(2), gridlines(2), format(4), legend(4) | 2 | tls.d.grouped-bar |
| `tls.d.pie` | layout | group | labels(3), showPercent, sort(2) | 2 | tls.d.donut |
| `tls.d.sparkline` | layout | element | fill, endDot, showLast(3), format(4) | 2 | tls.d.line |
| `tls.d.waterfall` | layout | group | connectors, colorBy(2), valueLabels(2), gridlines(2), format(4) | 2 | specialist; consulting style promotes |
| `tls.d.funnel-chart` | layout | group | shape(2), showDropoff(2), format(4) | 2 | promoted by the sales profile (not a chart-insight kind) |
| `tls.d.scatter` | layout | group | quadrants, trendline, labelPoints(3), gridlines(2), format(4), legend(4) | 2 | specialist, on request |
| `tls.d.radar` | layout | group | fill, legend(4) | 2 | specialist, on request |
| `tls.d.slope` | layout | group | highlight(3), format(4) | 2 | tls.d.line |
| `tls.d.bubble` | layout | group | sizeLegend, gridlines(2), format(4) | 2 | specialist, on request |
| `tls.d.heatmap` | layout | group | ramp(2), showValues, format(4) | 2 | specialist, on request |
| `tls.c.chart-insight` | layout | group | side(3), ratio(3), showSource | **1** |  |

**table** (3)

| Block | Kind | Scope | Look knobs (enum(n) / toggle) | Tier | Absorbed by (tier 2) |
|---|---|---|---|---|---|
| `tls.d.table` | layout | group | zebra, rules(3), header(3), density(2), format(4), showFooter | **1** |  |
| `tls.d.scorecard` | layout | group | showTarget, statusStyle(3), showNote | 2 | tls.d.table |
| `tls.d.ranking` | layout | group | showBars, medals, sort(3), format(4) | 2 | tls.d.table |

**comparison** (10)

| Block | Kind | Scope | Look knobs (enum(n) / toggle) | Tier | Absorbed by (tier 2) |
|---|---|---|---|---|---|
| `tls.d.compare-table` | layout | group | cellKind(3), zebra, density(2) | **1** |  |
| `tls.d.pricing` | layout | group | featuredStyle(3), align(2), showCta, showDescription | **1** |  |
| `tls.g.matrix-2x2` | layout | group | highlight(5), style(2), showItems, showAxisTitles | **1** |  |
| `tls.g.swot` | layout | group | style(2), letters | 2 | tls.g.matrix-2x2 |
| `tls.g.pros-cons` | layout | group | style(2), balance(2), showVerdict | **1** |  |
| `tls.g.before-after` | layout | group | arrow(3), emphasis(2) | **1** |  |
| `tls.g.iceberg` | layout | group | waterline(2) | 2 | tls.g.before-after |
| `tls.c.comparison` | layout | group | **none** | **1** |  |
| `tls.c.case-study` | layout | slide | layout(2), emphasis(2), showMetric, showClient | 2 | tls.c.comparison / tls.g.before-after |
| `tls.c.problem-solution` | layout | group | showIcons, style(2) | 2 | tls.g.before-after |

**process** (6)

| Block | Kind | Scope | Look knobs (enum(n) / toggle) | Tier | Absorbed by (tier 2) |
|---|---|---|---|---|---|
| `tls.g.steps` | layout | group | direction(2), connector(3) | 2 | tls.c.steps |
| `tls.g.chevrons` | layout | group | fill(3), textPlacement(2), showText | **1** |  |
| `tls.g.cycle` | layout | group | direction(2), nodeStyle(2), arrowStyle(2), showCenter, showText | 2 | tls.c.steps (promote in teach profile) |
| `tls.g.funnel` | layout | group | orientation(2), notes(2) | 2 | tls.d.funnel-chart |
| `tls.g.flow` | layout | group | direction(2), routing(2) | 2 | tls.c.steps (workshop profile promotes) |
| `tls.c.steps` | layout | slide | orientation(2) | **1** |  |

**timeline** (4)

| Block | Kind | Scope | Look knobs (enum(n) / toggle) | Tier | Absorbed by (tier 2) |
|---|---|---|---|---|---|
| `tls.g.timeline` | layout | group | axis(2), alternate, nodeStyle(3), showText | **1** |  |
| `tls.g.roadmap` | layout | group | statusColors, laneLabels(2) | **1** |  |
| `tls.g.milestones` | layout | group | axis(2), labels(2) | 2 | tls.g.timeline |
| `tls.c.journey` | html | slide | **none** | 2 | tls.g.timeline |

**hierarchy** (5)

| Block | Kind | Scope | Look knobs (enum(n) / toggle) | Tier | Absorbed by (tier 2) |
|---|---|---|---|---|---|
| `tls.g.tree` | layout | group | direction(2), nodeStyle(3), compact | **1** |  |
| `tls.g.pyramid` | layout | group | direction(2), notes(3), fill(3) | **1** |  |
| `tls.g.layers` | layout | group | style(2), notes(2) | 2 | tls.g.pyramid |
| `tls.g.breakdown` | layout | group | direction(2), showShare | 2 | tls.g.pyramid |
| `tls.g.mindmap` | layout | group | balance(2), curve | 2 | tls.g.hub-spoke |

**relationship** (3)

| Block | Kind | Scope | Look knobs (enum(n) / toggle) | Tier | Absorbed by (tier 2) |
|---|---|---|---|---|---|
| `tls.g.venn` | layout | group | opacity(2), labels(2) | 2 | specialist, on request |
| `tls.g.hub-spoke` | layout | group | layout(2), connector(4) | 2 | tls.g.tree |
| `tls.g.bracket` | layout | group | side(3), style(2) | 2 | specialist, on request |

**cover** (3)

| Block | Kind | Scope | Look knobs (enum(n) / toggle) | Tier | Absorbed by (tier 2) |
|---|---|---|---|---|---|
| `tls.c.hero` | html | slide | showKicker, showSubtitle, showCta, variant(3) | **1** |  |
| `tls.c.cover` | layout | slide | variant(3), decoration(4), showKicker, showSubtitle, showMeta, showLogo, showImage | **1** |  |
| `tls.c.kinetic-title` | html | slide | align(2), decoration(2) | **1** |  |

**media** (7)

| Block | Kind | Scope | Look knobs (enum(n) / toggle) | Tier | Absorbed by (tier 2) |
|---|---|---|---|---|---|
| `tls.c.image-text` | layout | group | placement(3), showKicker, showTitle, showBody, gutter(5) | **1** |  |
| `tls.m.image` | layout | element | fit(2) | **1** |  |
| `tls.m.icon` | layout | element | size(4) | 2 | icon slots of icon-list / cards / feature-grid |
| `tls.m.icon-label` | layout | element | size(3) | 2 | tls.m.icon-list |
| `tls.m.image-grid` | layout | group | pattern(4), cols(4), gap(3), radius(3), captions(3) | **1** |  |
| `tls.m.image-compare` | layout | group | mode(2), divider | 2 | tls.g.before-after |
| `tls.m.device-mock` | layout | element | device(4), tone(2), shadow | 2 | tls.m.image (product profile promotes) |

**agenda** (2)

| Block | Kind | Scope | Look knobs (enum(n) / toggle) | Tier | Absorbed by (tier 2) |
|---|---|---|---|---|---|
| `tls.c.agenda` | layout | slide | **none** | **1** |  |
| `tls.c.objectives` | layout | slide | marker(3), cols(2), showIntro | 2 | tls.c.agenda |

**people** (5)

| Block | Kind | Scope | Look knobs (enum(n) / toggle) | Tier | Absorbed by (tier 2) |
|---|---|---|---|---|---|
| `tls.c.testimonial` | html | group | **none** | **1** |  |
| `tls.c.profile-card` | layout | element | layout(3), tone(2), showBio, showContact | 2 | tls.c.team |
| `tls.c.team` | layout | group | cols(4), card(2), showBio | **1** |  |
| `tls.m.avatar` | layout | element | shape(3), size(4), layout(2), align(2), ring, showName, showRole | 2 | tls.c.team |
| `tls.m.avatar-group` | layout | element | size(3), overlap(3) | 2 | tls.c.team |

**divider** (1)

| Block | Kind | Scope | Look knobs (enum(n) / toggle) | Tier | Absorbed by (tier 2) |
|---|---|---|---|---|---|
| `tls.c.divider` | layout | slide | variant(3), align(2), showNumber, showSubtitle | **1** |  |

**closing** (3)

| Block | Kind | Scope | Look knobs (enum(n) / toggle) | Tier | Absorbed by (tier 2) |
|---|---|---|---|---|---|
| `tls.c.closing` | layout | slide | variant(2), ctaStyle(2), showCta, showContacts, showPerson | **1** |  |
| `tls.c.recap` | layout | slide | style(2) | 2 | tls.c.closing / tls.c.cards |
| `tls.c.contact` | layout | group | showPerson | 2 | tls.c.closing |

**brand** (2)

| Block | Kind | Scope | Look knobs (enum(n) / toggle) | Tier | Absorbed by (tier 2) |
|---|---|---|---|---|---|
| `tls.m.logo` | layout | element | maxHeight(3), align(3), plate(3) | 2 | tls.m.logo-wall |
| `tls.m.logo-wall` | layout | group | cols(5), uniform(2), plates, dividers, showHeading | **1** |  |

**chrome** (5)

| Block | Kind | Scope | Look knobs (enum(n) / toggle) | Tier | Absorbed by (tier 2) |
|---|---|---|---|---|---|
| `tls.x.page-number` | layout | element | align(3) | 2 | style masters |
| `tls.x.footer-text` | layout | element | align(4), separator(3), showRule | 2 | style masters |
| `tls.x.logo-mark` | layout | element | size(2), corner(4) | 2 | style masters |
| `tls.x.header` | layout | element | showRule, tone(2) | 2 | style masters |
| `tls.x.watermark` | layout | element | opacity(2) | 2 | style masters |

### 1.3 Redundancy — near-duplicates and blocks better expressed as a knob

Nothing is deleted (additive schema). A redundant block moves to tier 2, gets `describe.avoid`
pointing at its tier-1 sibling, and is listed under that sibling's `absorbs`.

| Cluster | Blocks | Verdict |
|---|---|---|
| Opening slide | `tls.c.hero` (html, 3 variants), `tls.c.cover` (layout, centered/split/bleed + decoration + image), `tls.c.kinetic-title` (html, motion-led) | Keep **all three in tier 1**: they are the most visible slide and differ in kind (type-led / image-led / motion-led). Styles pick between them (§3.4). |
| Big number | `tls.c.big-stat` (slide), `tls.t.hero-number` (element), `tls.c.stat-spotlight` (ring + 3 stats), `tls.d.progress-ring`, `tls.c.stat-card`, `tls.c.kpi-tile` | Tier 1: `big-stat`, `stat-spotlight`, `kpi-row`. `hero-number`, `progress-ring`, `stat-card`, `kpi-tile` → tier 2 (they are the parts of the three). |
| Feature list | `tls.c.feature-grid` (html, no knobs), `tls.c.feature-reveal` (html, no knobs), `tls.c.cards`, `tls.m.icon-list`, `tls.m.icon-label` | Tier 1: `cards`, `feature-grid`, `icon-list`; `feature-reveal` becomes `feature-grid layout=reveal` in AC2 and then drops to tier 2. |
| Steps | `tls.c.steps` (slide), `tls.g.steps` (strip), `tls.g.chevrons`, `tls.g.cycle`, `tls.g.flow` | Tier 1: `c.steps`, `chevrons`. `g.steps` duplicates `c.steps` at group scope → tier 2. `cycle`, `flow` → tier 2 (promoted by the teach / workshop profiles). |
| Funnel | `tls.g.funnel` (narrative stages), `tls.d.funnel-chart` (valued) | Both tier 2; the sales profile promotes `funnel-chart`. |
| Dated events | `tls.g.timeline`, `tls.g.milestones`, `tls.c.journey` (html), `tls.g.roadmap` | Tier 1: `timeline`, `roadmap`. `milestones` = timeline with diamond nodes (a `nodeStyle` value away); `journey` → tier 2. |
| Two sides | `tls.g.before-after`, `tls.c.problem-solution`, `tls.m.image-compare`, `tls.c.case-study`, `tls.g.pros-cons`, `tls.c.comparison`, `tls.g.iceberg` | Tier 1: `before-after`, `pros-cons`, `comparison`. Others tier 2. `comparison` gains `style=versus` (AC2) for head-to-head. |
| Quadrants | `tls.g.matrix-2x2`, `tls.g.swot` | `matrix-2x2` tier 1; `swot` tier 2 (promoted by the consulting style). |
| Levels | `tls.g.pyramid`, `tls.g.layers`, `tls.g.breakdown`, `tls.g.iceberg` | `pyramid` tier 1; others tier 2. |
| Network | `tls.g.tree`, `tls.g.hub-spoke`, `tls.g.mindmap`, `tls.g.venn`, `tls.g.bracket` | `tree` tier 1 (org chart is the common ask); others tier 2. |
| Quote | `tls.t.quote`, `tls.c.testimonial` (html), `tls.c.quote-image` | Tier 1: `quote`, `testimonial`. `quote-image` becomes `testimonial variant=photo` (AC2), then tier 2. |
| Pie | `tls.d.pie`, `tls.d.donut` | `donut` tier 1 (centre label; reads better); `pie` tier 2. |
| Series over time | `tls.d.line`, `tls.d.area`, `tls.d.sparkline`, `tls.d.slope` | `line` tier 1; others tier 2. |
| Bars | `tls.d.bar`, `tls.d.grouped-bar`, `tls.d.stacked-bar`, `tls.d.waterfall`, `tls.d.bullet-chart` | `bar`, `grouped-bar` tier 1 (plus every kind inside `chart-insight`); others tier 2. |
| Agenda | `tls.c.agenda`, `tls.c.objectives`, `tls.t.numbered`, `tls.t.checklist` | `agenda` tier 1 (gains `variant` in AC2); others tier 2. |
| Ending | `tls.c.closing`, `tls.c.contact`, `tls.c.recap` | `closing` tier 1; `recap` promoted by the teach profile. |
| Chrome & backdrop | `tls.x.*` (6), `tls.l.field`, `tls.m.pattern` | Not picked per slide by the LLM at all: **the style's masters place them** (§3.3). `tls.m.decoration` stays tier 1 for one-off accents. |
| Structure | 13 `tls.l.*` | Tier 2. Layout regions + recipes cover arrangement; the compiler already stacks several blocks in one region. `grid-guide`/`safe-area` are editor guides (S22) and should never reach the LLM. |

### 1.4 Gaps — common slide needs against the catalog

| Need | Covered by | Gap? |
|---|---|---|
| Comparison / pros-cons / vs | `comparison`, `pros-cons`, `compare-table`, `stat-compare` | Head-to-head "A **vs** B" look → `comparison style=versus` (AC2) |
| Timeline / roadmap | `timeline`, `roadmap`, `milestones` | — |
| Agenda | `agenda` | No look knobs → `variant` (AC2) |
| Team | `team`, `profile-card` | — |
| Pricing | `pricing` | — |
| Quote | `quote`, `testimonial`, `quote-image` | Testimonial has no knobs → AC2 |
| Image + caption / photo-led | `image`, `image-text`, `image-grid`, cover `bleed` | **Full-bleed photo content slide** with headline panel → `tls.c.image-full` + a `full-bleed` layout (AC6; also closes S13) |
| Section divider | `divider` (numeral/field/minimal) | — |
| Charts | 16 chart blocks + `chart-insight` | Style-level chart look (bar radius, line weight, gridline weight) → tokens (AC4) |
| Process | `c.steps`, `chevrons`, `cycle`, `flow` | — |
| Matrix 2×2 | `matrix-2x2`, `swot` | — |
| Funnel | `funnel`, `funnel-chart` | — |
| Map | — | **Parked** (needs world shapes). Stays parked; a "locations" need is served by `icon-list` with `map-pin` |
| Icon grid | `feature-grid`, `cards lead=icon` | — |
| Logo wall | `logo-wall` | — |
| Before / after | `before-after`, `image-compare` | — |
| FAQ | `tls.t.qa` (≤ 5) | — |
| Closing / CTA | `closing`, `contact` | A big-type "Thank you" look → `closing variant=big-type` (AC2) |
| **Bento** (modern asymmetric grid mixing a stat, an icon point, an image, a quote) | — | **Missing**, and it is the signature layout of the Modern & Digital styles → `tls.c.bento` (AC6) |
| **Style motifs** (orbs, squiggles, stars, zigzags, grain, mesh glow, frame lines) | `decoration` has blob/arc/ring/dots/wave/corner | **Missing**; needed by luxury, gradient, doodle, memphis → new `shape` values (AC4) |
| Lifted / glass / outlined cards per deck | per-block `tone` knobs, no shadow paint (F6) | **Missing** deck-level card surface → token `surface.card` + rect `shadow` (AC4) |

---

## 2. The AI core set (tier 1)

### 2.1 Mechanism

Additive fields on `BlockDefinition` (types.ts), filled for all 129 in AC0:

```ts
/** AI curation (AC0). 1 = in the default AI digest; 2 = listed by name only, detail on request. */
aiTier?: 1 | 2
/** Tier-2 types this block replaces by default (shown in its digest detail as "use instead of"). */
absorbs?: string[]
/** The look knobs: slot names whose values change the look, not the content, in the order an
 *  LLM should try them. Drives the index line's `knobs:` hint and the style defaults (§3.3). */
looks?: string[]
```

- `catalog-conformance.spec.ts` gate: every built-in sets `aiTier`; `absorbs` names exist and are
  tier 2; `looks` names exist in the schema and are enum/boolean slots; tier-1 count within
  **35–48** (ratchet, so the set stays curated).
- `capabilityIndex(reg, { tier: 1, style?, profile? })`: tier-1 lines in full; tier-2 blocks as
  one line per category of bare type names (`also: tls.d.pie, tls.d.area, …`) so the LLM can
  still ask for them; a profile's or style's `prefer` list promotes named tier-2 types to full
  lines, its `avoid` list drops lines. Default call without options is unchanged (all 129) so
  existing snapshots and callers keep working.
- Budget (spec): tier-1 index incl. style card and recipes ≤ **16k chars**; the full index keeps
  its 20k ceiling; the 8-type detail keeps 12k.

### 2.2 The 45 tier-1 blocks

"Knobs" lists today's slots; *italic* = added by this plan (phase in brackets).

| # | Role | Block | Kind | Why it is in | Key knobs (looks) | Absorbs |
|---|---|---|---|---|---|---|
| 1 | cover | `tls.c.hero` | html | Type-led opener the user likes | `variant` classic/split/gradient-sweep, *`align`, `decoration` none/orbs/grid/lines* [AC2] | `t.kicker`, `t.subtitle` on covers |
| 2 | cover | `tls.c.cover` | layout | Image-led and split openers, logo + meta line | `variant` centered/split/bleed, `decoration`, `showImage`, `showLogo` | — |
| 3 | cover | `tls.c.kinetic-title` | html | Motion-led opener for expressive styles | `align`, `decoration`, *`effect` words/lines* [AC2] | — |
| 4 | agenda | `tls.c.agenda` | layout | Every report/teach deck | *`variant` list/cards/split/rail, `numbering`* [AC2] | `objectives`, `numbered`, `checklist` |
| 5 | section | `tls.c.divider` | layout | Section rhythm | `variant` numeral/field/minimal, `align` | — |
| 6 | closing | `tls.c.closing` | layout | Ending + CTA + contact | `variant` centered/split/*big-type* [AC2], `ctaStyle` | `contact`, `recap` |
| 7 | heading | `tls.t.title` | layout | Every content slide | `size`, `align`, `rule` | `kicker` |
| 8 | text | `tls.t.body` | layout | Running text | `align`, `autoFit` | — |
| 9 | list | `tls.t.bullets` | layout | Dense decks need it | `marker` dot/dash/chevron/number/icon, `spacing` | `numbered`, `checklist` |
| 10 | emphasis | `tls.t.statement` | layout | One-message slide, key words in accent | `size`, `align`, `emphasis` accent/underline/highlight, `showMark` | `callout` |
| 11 | emphasis | `tls.t.takeaway` | layout | The "so what" beside a chart | `tone` | `callout` |
| 12 | emphasis | `tls.t.quote` | layout | Pull quote in a region | `markStyle` | — |
| 13 | text | `tls.t.footnote` | layout | Sources (consulting, report, academic) | `marker`, `align` | — |
| 14 | list | `tls.c.cards` | layout | Workhorse 2–4 card row | `lead` icon/number/image/none, `tone`, `align`, *`numeral` normal/giant* [AC2] | `stat-card` |
| 15 | list | `tls.c.feature-grid` | html | Liked; icon grid | *`layout` grid/rows/reveal, `cell` plain/card/outline, `iconStyle`, `cols`, `align`* [AC2] | `feature-reveal` (after AC2), `icon-label` |
| 16 | list | `tls.c.feature-reveal` | html | Liked; until AC2 folds it into feature-grid | — | — |
| 17 | list | `tls.m.icon-list` | layout | Vertical icon points beside an image | `iconStyle`, `iconTone`, `spacing` | `icon-label` |
| 18 | metric | `tls.c.big-stat` | html | Liked; one giant number | `format`, `showContext`, *`variant` plain/gradient/outlined, `align`* [AC2] | `t.hero-number` |
| 19 | metric | `tls.c.stat-spotlight` | html | Liked; ring + 3 KPIs | *`visual` ring/bar/number, `statsPlacement` right/below* [AC2] | `progress-ring`, `gauge`, `progress-bar` |
| 20 | metric | `tls.c.kpi-row` | layout | 2–5 KPI tiles | `gap`, *`tile` plain/card/outline/divided* [AC2] | `kpi-tile`, `stat-card`, `stat-compare`, `trend-badge` |
| 21 | chart | `tls.c.chart-insight` | layout | Chart + takeaway + source in one pick; 7 chart kinds | `side`, `ratio`, `showSource`, chart `kind` | `dashboard` (report profile promotes it) |
| 22 | chart | `tls.d.bar` | layout | Single-series bars | `orientation`, `valueLabels` | — |
| 23 | chart | `tls.d.grouped-bar` | layout | Multi-series bars | `orientation`, `valueLabels`, `legend` | `stacked-bar` |
| 24 | chart | `tls.d.line` | layout | Trends | `curve`, `markers`, `endLabels`, `legend` | `area`, `sparkline`, `slope` |
| 25 | chart | `tls.d.donut` | layout | Shares of a whole | `labels`, `showPercent` | `pie` |
| 26 | table | `tls.d.table` | layout | Data tables | `zebra`, `rules`, `header`, `density` | `scorecard`, `ranking` |
| 27 | comparison | `tls.d.compare-table` | layout | Feature matrix | `cellKind`, `zebra`, `density` | — |
| 28 | comparison | `tls.c.comparison` | layout | 2–3 options | *`style` columns/cards/versus, `highlight`* [AC2] | `case-study` |
| 29 | comparison | `tls.g.pros-cons` | layout | Common ask | `style`, `balance`, `showVerdict` | — |
| 30 | comparison | `tls.g.before-after` | layout | Change story | `arrow`, `emphasis` | `problem-solution`, `image-compare` |
| 31 | comparison | `tls.g.matrix-2x2` | layout | Strategy decks | `highlight`, `style`, `showItems` | `swot` |
| 32 | comparison | `tls.d.pricing` | layout | Sales decks | `featuredStyle`, `align`, `showCta` | — |
| 33 | process | `tls.c.steps` | layout | Ordered steps, full slide | `orientation` | `g.steps`, `cycle` |
| 34 | process | `tls.g.chevrons` | layout | Phases with a current one | `fill`, `textPlacement` | — |
| 35 | timeline | `tls.g.timeline` | layout | Dated events | `axis`, `alternate`, `nodeStyle` | `milestones`, `journey` |
| 36 | timeline | `tls.g.roadmap` | layout | Plans over periods | `statusColors`, `laneLabels` | — |
| 37 | hierarchy | `tls.g.pyramid` | layout | Levels | `direction`, `notes`, `fill` | `layers`, `breakdown` |
| 38 | hierarchy | `tls.g.tree` | layout | Org chart | `direction`, `nodeStyle`, `compact` | `hub-spoke`, `mindmap` |
| 39 | media | `tls.c.image-text` | layout | Image beside text | `placement`, `gutter` | — |
| 40 | media | `tls.m.image` | layout | Image in a region | `fit`, caption | `device-mock` (product profile promotes) |
| 41 | media | `tls.m.image-grid` | layout | 2–9 photos | `pattern`, `cols`, `gap`, `radius`, `captions` | — |
| 42 | people | `tls.c.team` | layout | Team slide | `cols`, `card`, `showBio` | `profile-card`, `avatar` |
| 43 | people | `tls.c.testimonial` | html | Liked; social proof | *`variant` card/large/portrait/photo, `markStyle`* [AC2] | `quote-image` (after AC2) |
| 44 | brand | `tls.m.logo-wall` | layout | Clients/partners | `cols`, `plates`, `dividers` | `logo` |
| 45 | decoration | `tls.m.decoration` | layout | One-off accent; style motifs | `shape` (+ *orb, squiggle, star, sparkle, zigzag, triangle, half-circle, frame* [AC4]), `tone`, `opacity` | — |

After AC2 `feature-reveal` leaves; after AC6 `tls.c.bento` and `tls.c.image-full` join → **46**.

### 2.3 Missing blocks and variants to build, ranked

Ranked by (looks gained per unit of work) × (how often a deck needs it).

| Rank | What | Path | Phase |
|---|---|---|---|
| 1 | Look knobs on the liked html blocks: `feature-grid` (layout/cell/iconStyle/cols/align; absorbs `feature-reveal`), `testimonial` (variant incl. `photo`), `stat-spotlight` (visual, statsPlacement), `big-stat` (variant, align), `hero` (align, decoration) | edit html templates + posters (keep `posterGeometry`) | AC2 |
| 2 | Knobs on knob-less composites: `agenda` (variant, numbering), `comparison` (style incl. versus, highlight), `kpi-row` (tile), `closing` (`big-type`), `cards` (`numeral: giant`) | composite edits | AC2 |
| 3 | Deck-level card surface (`filled`/`outline`/`glass`/`ghost`/`raised`) read by every card-like block through one helper | token + `_kit` helper | AC4 |
| 4 | Decoration motifs: `orb` (pseudo-3D radial sphere), `squiggle`, `star`, `sparkle`, `zigzag`, `triangle`, `half-circle`, `frame`; backdrops `mesh` (stacked radial glows) and `grain` | new enum values on `tls.m.decoration` / `tls.m.pattern` | AC4 |
| 5 | `tls.c.bento` — 3–6 tiles in an asymmetric grid; each tile is `stat` / `point` (icon + title + text) / `image` / `quote`; patterns `2+1`, `1+2`, `hero+3`, `3+2` | composite | AC6 |
| 6 | `tls.c.image-full` — full-bleed photo with a headline panel (`panel` bottom-left/left/center, `scrim`) + `full-bleed` layout id (closes S13) | composite + layout | AC6 |
| 7 | Chart look tokens: bar corner radius, line weight, gridline weight/visibility per style | token reads in `_chart/kit.ts` | AC4 |
| — | Not building: map, video, formula, QR, rotation-based collage (stay parked, block-library §Parked) | | |

---

## 3. Deck style presets

### 3.1 Decision: 10 styles in 4 families

| Family | Style id | From the user's list | Decision |
|---|---|---|---|
| Premium & Elegant | `luxury` | Luxury | keep |
| | `minimal` | Elegant Minimalism | keep |
| | `editorial` | Editorial | keep |
| Modern & Digital | `gradient` | Linear Gradient **+ 3D Abstract** | merged: "3D" becomes the `orb` motif (pseudo-3D spheres from radial gradients, both renderers) inside `gradient`. A real 3D style needs rendered assets or WebGL (three.js: no SVG export, ≥ 600 KB) — revisit when a host asset pack exists |
| | `glass` | Glassmorphism | keep; shares `gradient`'s mesh backdrop, differs in card surface (translucent + highlight stroke) |
| | `swiss` | Swiss / International Typographic | keep |
| Playful & Creative | `doodle` | Doodle **+ Kids Cartoon** | merged: Kids Cartoon is the `doodle-kids` palette (brighter, rounder) of `doodle`. Cartoon characters need illustration assets the package cannot ship; they come from user images (§4) |
| | `memphis` | Memphis | keep |
| Professional & Corporate | `corporate` | Corporate | keep |
| | `consulting` | Consulting | keep |

Styles are **orthogonal to profiles** (LLM-ARCHITECTURE §3): the profile decides density and
structure (teach vs pitch), the style decides the look. A profile may *suggest* styles
(`theme.candidates` → `style.candidates`), the user's pick wins.

### 3.2 What a style controls

```ts
/** AC1 — data, not code; lives in blocks/styles/<id>.ts, registered in BUILT_IN_STYLES. */
interface DeckStyle {
  id: string                       // 'luxury'
  family: 'premium' | 'modern' | 'playful' | 'professional'
  name: string
  brief: string                    // ≤ 240 chars, given to the LLM verbatim (style card)
  palettes: DeckTheme[]            // 2–3 themes; [0] is the default. Ids are `<style>-<name>`
  fonts: { heading: FontRef; body: FontRef }   // FontRef = { family, fallback: FontStyle, metricsKey }
  tokens: DeckTokens               // type-scale tweaks, radius, elevation, density, motion ease/duration
  surface: {                       // NEW token group (AC4), read by every card-like block
    card: 'filled' | 'outline' | 'glass' | 'ghost' | 'raised'
    stroke: 'none' | 'hairline' | 'bold'
    shadow: 0 | 1 | 2 | 'hard'
  }
  masters: MasterSpec[]            // 'cover' | 'content' | 'section' | 'closing': background Paint,
                                   // backdrop blocks (mesh, grain, pattern, motifs) and chrome
  motionStyle: MotionStyle         // deck default
  blockDefaults: Record<string, Record<string, unknown>>  // knob defaults per type
  prefer: string[]; avoid: string[]                       // promote tier-2 / drop tier-1 lines
  rules: string[]                  // ≤ 4 short composition rules for the LLM and the critic
}
```

**Schema (additive):** `DeckSpec.style?: string` (a `BUILT_IN_STYLES` id). Resolution in
`deckSpecToDocument` / `compileSlide`, lowest to highest precedence:

1. style → `theme` default (`palettes[0]`) when `DeckSpec.theme` names none of the style's
   palettes, the validator warns `style/theme-mismatch`; the AI writes a palette id from the card.
2. style `tokens` < `DeckSpec.tokens` (deck overrides win).
3. style `masters` are appended to `DeckSpec.masters` under reserved names (`style:cover`, …);
   a slide's `masterId` defaults by `role`/layout (`title`/`blank`+cover block → `style:cover`,
   `section` → `style:section`, else `style:content`).
4. style `blockDefaults[type]` deep-merged **under** each block's authored props at compile time
   and stored like P7's `styleMotion` (`$block.styleDefaults`), never written into the authored
   `BlockSpec`, so `documentToDeckSpec` returns what the AI wrote (round-trip spec required).
5. style `motionStyle` < `DeckSpec.motionStyle` < `SlideSpec.motionStyle` < block `motion`.

`TDDocument` gets the resolved theme as today; the style id is stored on the document
(`TDDocument.styleId?`, additive) only so a re-compile finds it. No migration, `version` stays 16.

**Fonts in tokens (F4):** `ResolvedTokens.headingFamily` and `.bodyFamily` (additive;
`fontFamily` kept = heading for old callers). Text leaves pick the heading family for `display`,
`title`, `heading`, `subheading`, and the body family for `lead`, `body`, `caption`, `footnote`.
html templates get `--tls-font-heading` / `--tls-font-body` CSS vars next to `--tls-font-family`.

### 3.3 The ten styles

Palettes are first drafts; every palette must pass the existing contrast spec (text ≥ 4.5:1 on
background and surface, `resolveColor` solver) before it ships. Fonts: §4.1 (all OFL; each must
ship a Vietnamese subset, checked in AC3).

| Style | Palettes (bg / text / accent / accent2) | Heading / body | Type & shape | Surface | Background & motif | Motion |
|---|---|---|---|---|---|---|
| `luxury` | `luxury-noir` #0E0E10 / #F5F1E8 / #C8A96A gold / #8C6D3F; `luxury-ivory` #F7F3EC / #1C1917 / #9A7B4F / #1C1917 | Playfair Display / Inter | display 160 lh 1.0, tracking −0.02; title 88; radius 0–4 | outline, hairline gold `line`, shadow 0 | solid + soft radial vignette; motif: thin rules, `frame` corners | subtle; durations ×1.4, ease-out-quint; fades only |
| `minimal` | `minimal-white` #FFFFFF / #111111 / #111111 / #8A8A8A; `minimal-stone` #F5F3EF / #1C1C1C / #3F3F46 / #A8A29E | Be Vietnam Pro / Inter | density `roomy`; title 80; radius md 12 | ghost (no fill), stroke none | solid; no motif | subtle; short fades |
| `editorial` | `ivory-editorial` (existing); `editorial-ink` #FAF8F3 / #111111 / #C1272D / #1F3A5F | Fraunces / Inter | display 168 serif; kicker uppercase wide; radius 0 | ghost with top `rule` | solid paper; motif: hairline rules, giant numerals | subtle; `wipe-x` on rules |
| `gradient` | `gradient-night` #08090D / #EDEEF3 / #7C5CFF / #22D3EE; `gradient-dawn` #FAFAFC / #0B0B12 / #6D5DF6 / #F472B6 | Plus Jakarta Sans / Inter | title 96, tracking −0.02; radius lg 24 | filled surface + 1 px gradient edge, shadow 1 | `mesh` glows (2–3 radial accent/accent2 at 18–30 %) + `grain` 4 %; motif `orb` | expressive; count-ups, kinetic titles |
| `glass` | `glass-violet` gradient #4C1D95→#1E3A8A / #FFFFFF / #F0ABFC / #67E8F9; `glass-pastel` #E0E7FF→#FCE7F3 / #1E1B4B / #7C3AED / #DB2777 | Plus Jakarta Sans / Inter | radius xl 32 | glass: rgba white 12–18 % fill + rgba white 35 % hairline + shadow 1; DOM-only `backdrop-filter` in html blocks | `mesh` + large blurred-look `orb`s | expressive, softer eases |
| `swiss` | `swiss-red` #F4F4F0 / #111111 / #E3000F / #111111; `swiss-blue` #FFFFFF / #0A0A0A / #0047BB / #0A0A0A | Archivo / Archivo | flush-left (align start everywhere), display 176, radius 0 | ghost; bold `rule`s | solid; motif: red square, bold rules | static or subtle `wipe-x` |
| `doodle` | `doodle-paper` #FFFDF6 / #1F1F1F / #FF7A59 / #3DB8A6; `doodle-kids` #FFF8E7 / #1F1F1F / #EE4266 / #3BCEAC (+ yellow #FFD23F in `categorical`) | Patrick Hand / Nunito | radius xl 28; body 30 | filled + bold dark stroke (3 px) | paper; motifs `squiggle`, `star`, `sparkle`, curved `tls.g.arrow` | expressive, `ease-out-back` short pops |
| `memphis` | `memphis-pop` #FFF6E9 / #1B1B1B / #FF4F79 / #2EC4B6 (+ #FFC93C, #3A86FF) | Bricolage Grotesque / Nunito | radius 0–8; heavy weights | filled + bold stroke + **hard** offset shadow | motifs `zigzag`, `triangle`, `half-circle`, `dots` pattern | expressive, scale pop-ins, stagger |
| `corporate` | `corporate-navy` #FFFFFF / #0B1F33 / #0B5FFF / #00A3A1; `midnight`, `mono-grid` (existing) | Inter / Inter | radius sm 8 | filled `surfaceAlt`, shadow 1 | solid; master chrome: `header` + `footer-text` + `page-number` | subtle |
| `consulting` | `consulting-ink` #FFFFFF / #111827 / #00205B / #2BB3A3 | Source Serif 4 / Inter | titles may be 2-line action titles (`title size=heading`); radius 0 | outline hairline, shadow 0 | solid; chrome: `header` tracker + `footnote` source line | static |

Per-style block policy (fed to the digest and the critic):

| Style | Prefer (incl. tier-2 promoted) | Avoid | Key `blockDefaults` | Rules for the LLM |
|---|---|---|---|---|
| `luxury` | hero classic, cover bleed, big-stat, statement, quote, testimonial large, image-full, divider numeral | heatmap, bubble, scatter, tags, kpi-row > 3, memphis/doodle motifs | `divider.variant=numeral`, `title.rule=true`, `takeaway.tone=muted`, `big-stat.variant=outlined` | ≤ 1 accent use per slide; ≤ 40 words per slide; images full-bleed or not at all |
| `minimal` | statement, big-stat, cards outline, image, chart-insight | decoration, pattern, chevrons gradient, multi-hue charts | `cards.tone=outline`, `chevrons.fill=single`, categorical = accent shades | one idea per slide; whitespace over decoration |
| `editorial` | statement, quote, body columns, image-text, cards numeral giant, divider numeral, footnote | glass, orbs, pill tags, gradients | `cards.numeral=giant`, `statement.emphasis=underline`, `kicker` uppercase | kicker + title + rule; pull quotes |
| `gradient` | kinetic-title, hero gradient-sweep, stat-spotlight, feature-grid, big-stat gradient, bento, device-mock | serif fonts, tables > 6 rows, clip art | `hero.variant=gradient-sweep`, `big-stat.variant=gradient`, `feature-grid.cell=card` | dark first; one glow per slide |
| `glass` | feature-grid, cards, kpi-row, testimonial card, bento | dense tables, charts with > 3 series | `feature-grid.cell=card` (glass via surface), `kpi-row.tile=card` | content on glass cards over the mesh, never on bare mesh |
| `swiss` | statement start, big-stat, table rules=head, pros-cons columns, timeline | blobs, orbs, pill tags, centred text, gradients | `*.align=start`, `table.rules=head`, `chevrons.fill=single` | asymmetric grid, flush left, big type |
| `doodle` | cards icon, icon-list circle, steps, cycle, quiz, checklist, image-grid | dense tables, scatter, bubble, luxury serif | `icon-list.iconStyle=circle`, `cards.lead=icon`, `statement.emphasis=underline` (drawn as squiggle) | friendly, short sentences, one motif per slide |
| `memphis` | cards accent-first, feature-grid, big-stat, kinetic-title, tags solid | tables, footnote-heavy slides, hairlines | `cards.tone=accent-first`, `tags.tone=solid` | ≤ 3 motifs per slide, never over text |
| `corporate` | kpi-row, chart-insight, table, timeline, roadmap, agenda, team, logo-wall, dashboard | kinetic-title, motifs | `chart-insight.showSource=true` | every chart has a takeaway; consistent number formats |
| `consulting` | chart-insight right, table, compare-table, matrix-2x2, swot, waterfall, stacked-bar, scorecard, pros-cons, footnote | big-stat gradient, kinetic-title, decoration, image-grid | `chart-insight.side=right`, `table.rules=head`, `title.size=heading` | action title (a full sentence stating the insight); a source on every data slide |

### 3.4 How the LLM sees a style

A **style card** (≤ 1.2k chars) generated from the `DeckStyle` object, placed at the top of the
tier-1 index when `{ style }` is passed: `brief`, the palette ids, the four rules, prefer/avoid as
type lists, the knob defaults it does not need to set, and a `textWidth` line from AC3
(heading/body average width vs Inter, e.g. `heading ×1.08, body ×1.00`). The cover choice is
style-driven: `gradient`/`glass`/`memphis` → kinetic-title or hero; `luxury`/`editorial` →
hero classic or cover bleed; `corporate`/`consulting` → cover split; `doodle` → cover centered
with motifs.

### 3.5 Oracle validity per style

- Size cards change with the type scale and the font: `tools/layout-report/cli.js --metrics
  --style <id>` (extends LO8's `--theme`) samples cards with the style's resolved tokens and
  fonts. Committed `block-metrics.json` stays default-theme; the pipeline samples tier-1 cards
  per style on demand (~0.5 s, cached by style id + package version).
- A spec samples the tier-1 cards for every style and fails when an example no longer fits its
  `size.min` (`atMin.fits === false`) — a style whose type scale breaks a block's min is a wrong
  style, not a wrong block.
- `analyzeSlide` receives the style's tokens through `deckLayoutContext` (no API change: the
  tokens already flow from the `DeckSpec`).

---

## 4. Frontend libraries

Constraints: React 17 peer floor in `packages/tldraw` (peers 17–19); no new runtime dependency
without a named reason (governing rule 6); one layout → DOM + SVG parity; no dependency-resolution
hacks. Today `packages/tldraw` has **no** font, icon, chart or animation dependency (icons are
vendored Lucide path data, charts in-house, GSAP host-injected).

### 4.1 Fonts

| Candidate | Decision | Reason |
|---|---|---|
| `@fontsource-variable/*` (Playfair Display, Fraunces, Source Serif 4, Be Vietnam Pro, Plus Jakarta Sans, Archivo, Bricolage Grotesque, Nunito) + `@fontsource/patrick-hand` | **adopt — in `examples/nextjs-sample` and as devDependencies of the calibration tool only**, never in `packages/tldraw` | Self-hosted, versioned, OFL, offline-safe; the package only names families (`FontRef`), the host loads them. Each must list the `vietnamese` subset (checked in AC3 from the package metadata; a font without it is swapped for a listed fallback: Lora, Montserrat, Lexend, Quicksand) |
| `next/font/google` | adopt for the sample (it already loads Inter this way) | zero-config subsetting; equal choice to fontsource for the host |
| Shipping font files inside `@tlslides/tldraw` | not | bundle weight, licensing per host, and the package must stay font-agnostic |
| Width tables for each family | **adopt (in-house)** | Generated once per family by a calibration script (AC3); ~2 KB each in `blocks/layout/font-metrics/` |

### 4.2 Icons, illustrations, decoration

| Candidate | Decision | Reason |
|---|---|---|
| Lucide (ISC; already the source of the 87 vendored icons) | **adopt more** — curated 87 → ~180 via a vendoring script that copies path data with the licence header | no runtime dependency; same stroke look; covers business, education, tech |
| Phosphor (MIT; thin/light/regular/bold/fill/duotone) | **later** | the weight families would give doodle/memphis/luxury distinct icon looks, but fill and duotone need filled-path icon rendering (renderers draw stroke paths today); evaluate after AC7 |
| Tabler icons | not | overlaps Lucide in look and coverage |
| unDraw | not | licence forbids redistribution inside a product/collection |
| Open Peeps / Humaaans-style CC0 sets | **later, host side** | for `doodle-kids` characters as image assets in the host's asset library, never package code |
| `blobs` (npm) / mesh-gradient generators (WebGL) | not | blob paths are ~40 lines in-house (decoration already draws blobs); mesh = stacked radial `Paint`s, both renderers |
| Rough.js (MIT, ~9 KB gz) | **spike in AC4, adopt only if** `rough.generator()` runs in Node with a fixed seed and its path ops convert to `path` nodes that pass parity | the one library that would make `doodle` outlines genuinely hand-drawn; otherwise hand-authored squiggle/star paths |
| Grain/noise | **in-house** | a ~1 KB SVG `feTurbulence` data URI drawn by an `image` node (DOM `<img>`, SVG `<image>`), backdrop layer |
| Glass blur | **in-house, DOM-only enhancement** | `backdrop-filter` in html templates; layout kind and SVG export draw the translucent tint + hairline (geometry parity holds; the blur is decoration) |
| three.js / react-three-fiber / Spline | not | ≥ 600 KB, WebGL, no SVG export, r3f needs React 18+; "3D" = `orb` motif (§3.1) |
| Lottie (lottie-web) | not | heavy, needs an animation-asset pipeline, no static poster parity |

### 4.3 Charts, motion, colour

| Candidate | Decision | Reason |
|---|---|---|
| Chart.js / Recharts / visx / ECharts | not | canvas or React-DOM only: breaks the one-layout-two-renderers parity; the in-house engine already has 16 kinds; style looks come from tokens (AC4) |
| GSAP | keep as is (optional host adapter) | already the expressive driver; no package dependency |
| framer-motion / Motion One | not | WAAPI driver + GSAP adapter suffice; current framer-motion needs React 18+ |
| culori / chroma-js | not | `color-math.ts` has contrast + hue-preserving solver; palettes are authored data checked by spec |
| KaTeX | not (parked formula block) | unchanged |

---

## 5. Pipeline for AI picking

```
user: brief + style (UI picker; default from profile.styleCandidates[0])
S0 intake  → profile, slide count, style id, palette id
S1 outline → sections → slides { role, headline, keyMessage }          (unchanged)
S2a pick   → per slide: recipe for its role (style-filtered) → block types per region
             input: style card + recipes(role) + tier-1 index (style/profile filtered)
S2b detail → capabilityDigest(reg, { types }) + "this style sets: <blockDefaults>"
S3 fill    → props; per-style size cards for the chosen types (cli --metrics --style)
S4.1 loop  → analyzeSlide (style tokens + fonts) → findings → fix ≤ 3 rounds
S5 critic  → screenshot only needsVisualCheck slides; style rules added to the rubric
```

### 5.1 Recipes (AC0 data, `blocks/recipes.ts`)

A recipe is a composition pattern per slide role: `{ id, role, layout, regions: { [region]:
[{ type, knobs? }] }, when, styles? }`. Roles: `cover`, `agenda`, `section`, `content`, `data`,
`comparison`, `process`, `people`, `quote`, `closing`. About 26 recipes, e.g.:

| Role | Recipes (layout → blocks) |
|---|---|
| cover | `blank` → hero · `blank` → cover split + image · `blank` → kinetic-title |
| agenda | `blank` → agenda · `two-column` → title+agenda / image |
| section | `blank` → divider · `section` → title + statement |
| content | `blank` → statement · `two-column` → bullets / image · `timeline`(title+body) → cards 3-up · `timeline` → feature-grid · `image-left` → icon-list · `blank` → bento (AC6) |
| data | `timeline` → chart-insight · `kpi-row` → kpi-row + chart · `timeline` → stat-spotlight · `blank` → big-stat · `timeline` → table + footnote |
| comparison | `timeline` → comparison · `timeline` → pros-cons · `timeline` → before-after · `timeline` → pricing · `timeline` → matrix-2x2 |
| process | `timeline` → c.steps · `timeline` → chevrons · `timeline` → timeline · `timeline` → roadmap |
| people | `timeline` → team · `blank` → testimonial · `timeline` → logo-wall |
| quote | `quote` → quote · `blank` → image-full (AC6) |
| closing | `blank` → closing · `two-column` → closing / contact |

A spec compiles every recipe with each block's `describe.example` through `analyzeSlide` and
requires 0 errors, 0 warnings — so a recipe is a known-good starting point, and the LLM only
swaps content. Recipes replace the non-existent layout names in LLM-ARCHITECTURE §3.1 (F9).

### 5.2 Digest changes and budget

| Section | Chars (target) |
|---|---|
| Picking + scope rules (existing header) | ~1.2k |
| Style card (§3.4) | ≤ 1.2k |
| Recipes for the slide's role(s) — or all, ~26 lines | ≤ 3k |
| Tier-1 lines (45 × ~150, incl. size hint and a `knobs:` hint) | ~7k |
| Tier-2 names, one line per category | ≤ 1.5k |
| Icons | ~1.3k |
| **Total** | **≤ 16k** (spec) — full 129-block index keeps its 20k ceiling |

`capabilityIndexData()` JSON gets `aiTier`, `looks`, `absorbs` per entry (additive) and a
`styles` + `recipes` array, so FastAPI can filter without parsing markdown.

---

## 6. Phases

**Machine rule (binding for every phase).** WSL has ~4.9 GB RAM, no swap. Run **one heavy agent
at a time**; jest **targeted** with `--maxWorkers=1` (never the full suite; parity specs in their
LO8 chunks); **one tsc at a time**; never jest/tsc while `next dev` + Chromium run; check
`free -m` (stop if `available` < 1200 MB). **Never `git stash`**, `git checkout -- <path>`,
`git reset`, `git add -A`/`.`; stage explicit paths. **Never touch or commit
`packages/tldraw/src/components/DeckViewer/DeckViewer.tsx` or `packages/tldraw/tsconfig.tsbuildinfo`**
(the user's uncommitted work; restore the tsbuildinfo copy after a tsc run, as LO8 did). Gates and
commands: [../block-library/README.md](../block-library/README.md) §Gate commands and
[../block-review/README.md](../block-review/README.md) §4 low-resource mode. Never weaken a
test; never invent vocabulary outside the vocabulary list below; commit once per task with
message `AC<n>: <what>` and the co-author lines.

**Vocabulary this plan adds (approve once, AC0 records it):** `BlockDefinition.aiTier/absorbs/looks`;
`DeckStyle`, `BUILT_IN_STYLES`, `DeckSpec.style`, `TDDocument.styleId`;
`ResolvedTokens.headingFamily/bodyFamily`; `DeckTokens.surface` (`card`, `stroke`, `shadow`);
`rect.shadow?: 0 | 1 | 2 | 'hard'` (both renderers); new enum values on `tls.m.decoration.shape`
(`orb`, `squiggle`, `star`, `sparkle`, `zigzag`, `triangle`, `half-circle`, `frame`) and
`tls.m.pattern.pattern` (`grain`, `mesh`); new knob slots listed in §2.3; layout id `full-bleed`;
block types `tls.c.bento`, `tls.c.image-full`. Everything optional, `TldrawApp.version` stays 16.

**Common verification (every phase that changes a look):** the per-style fixture decks
`__fixtures__/styles/<style>.json` (8 slides: cover, agenda, section, content, data, comparison,
quote, closing) report clean through `node tools/layout-report/cli.js <deck>` (0 errors,
0 warnings, `needsVisualCheck` empty or explained), and the LO5 calibration harness
(`tools/layout-report/calibrate/run.js --shots …`) renders them; the PNGs are **opened and looked
at**; numbers go into the phase notes.

### AC0 — Tier metadata, tier-1 index, recipes (LLM-visible, no pixel change)
- `aiTier`/`absorbs`/`looks` on `BlockDefinition`; filled for all 129 per §1.2/§2.2;
  `describe.avoid` on each absorbed block names its tier-1 sibling.
- `capabilityIndex(reg, { tier, style, profile })` + `capabilityIndexData` fields; default call
  unchanged.
- `blocks/recipes.ts` (~26 recipes, real layout ids) + `recipes.spec.ts`.
- Fix LLM-ARCHITECTURE §3.1 layout names (F9); add §S2 "tier-1 + recipes" paragraph.

**Done when:** conformance gate (every block has `aiTier`; tier-1 count 35–48; `absorbs` and
`looks` valid); tier-1 index ≤ 16k chars, snapshot committed; full index ≤ 20k unchanged;
every recipe compiles its examples with 0 errors/0 warnings in `analyzeSlide`; tsc prod 0; digest
+ conformance + recipes specs pass (`--maxWorkers=1`).

### AC1 — Style core + three Inter-only pilot styles (first visible result)
- `DeckStyle` type, `BUILT_IN_STYLES`, `DeckSpec.style`, resolution order §3.2 (theme, tokens,
  masters, `blockDefaults` as `$block.styleDefaults`, motionStyle), validator
  (`style/unknown`, `style/theme-mismatch`), JSON schema, SCHEMA.md, digest style card.
- Pilots that need no new font or paint: `corporate`, `minimal` (Inter until AC3), `gradient`
  (linear-gradient background until AC4 adds mesh).
- `cli.js --metrics --style <id>`; three fixture decks.

**Done when:** round trip returns the authored spec byte-identical (style defaults not leaked);
the three decks report clean; calibration shots of all 24 slides looked at, and the three decks
are visibly different decks with the same content; tsc 0; targeted specs pass.

### AC2 — Look knobs on the liked and knob-less blocks
- §2.3 ranks 1–2: `feature-grid` (absorbs `feature-reveal`), `testimonial` (absorbs
  `quote-image`), `stat-spotlight`, `big-stat`, `hero`, `kinetic-title`, `agenda`, `comparison`,
  `kpi-row`, `closing`, `cards`. Html blocks keep `posterGeometry` (template paints the poster).
- `looks` updated; absorbed blocks demoted to tier 2.

**Done when:** every new knob value has a spec case at preferred and min size (fits, parity probe
passes in its chunk); html posters vs Chromium 0 line mismatches (LO7 metric) in the calibration
harness; a knob gallery slide per block in a new `__fixtures__/styles/knobs.json` reports clean
and is looked at; digest budgets hold.

### AC3 — Fonts and width tables
- `ResolvedTokens.headingFamily/bodyFamily`, text engine picks by type token; html CSS vars.
- `tools/layout-report/calibrate/font-widths.js`: loads each family (from the sample's
  fontsource packages) in one headless Chromium page, measures ASCII + Vietnamese base letters at
  400 and 700 with `canvas.measureText`, writes `blocks/layout/font-metrics/<key>.ts`; registry
  replaces `tableFaceKey`'s name sniffing (fixes F5: Crimson Pro measured as Inter).
- Sample loads the fonts; calibration harness inlines them as data `@font-face` (as LO8 did for
  Inter).

**Done when:** each family's per-glyph table matches `canvas.measureText` to 0.001 em; LO5
calibration on the style decks: text-width |abs| p95 ≤ 3 % (≤ 5 % for Patrick Hand), line-count
mismatches 0; Vietnamese sample text measured; every font's licence (OFL) and `vietnamese` subset
recorded in the notes; fixture reports for the existing four decks byte-identical.

### AC4 — Surfaces, shadows, backdrops, motifs
- `rect.shadow` in both renderers (CSS `box-shadow`, SVG `feDropShadow`; `hard` = offset solid);
  parity probe geometry unaffected.
- `DeckTokens.surface` + one `_kit` helper (`cardPaint(ctx)`) adopted by card-like blocks
  (`cards`, `feature-grid`, `kpi-row`, `pricing`, `team`, `comparison`, `testimonial`, `l.card`).
- `tls.m.decoration` motifs and `tls.m.pattern` `grain`/`mesh`; chart look tokens (§2.3 rank 7).
- Rough.js spike (§4.2) — decision recorded either way.

**Done when:** each new motif/backdrop passes the parity probe and lies in `layer: backdrop` with
no `text/collision` errors on the style decks; glass and hard shadow shots looked at in DOM and in
SVG export; tsc 0; targeted specs pass.

### AC5 — The remaining seven styles
- `luxury`, `editorial`, `glass`, `swiss`, `doodle` (+ `doodle-kids`), `memphis`, `consulting`:
  palettes, fonts, tokens, surface, masters, defaults, prefer/avoid, rules; one fixture deck each.
- Contrast spec for every palette; per-style tier-1 size-card spec (§3.5).

**Done when:** all 10 style decks report clean; 80 calibration shots looked at; the user reviews
them on the review board (republish `GVkKV9dh…` with a "styles" tab; verdicts in a `styles`
collection) and every style marked `fix` gets a follow-up row here.

### AC6 — New blocks: `tls.c.bento`, `tls.c.image-full` (+ `full-bleed` layout)
- Composite path; examples, size cards, digest lines, recipes (`content`, `quote`).
- `full-bleed` layout closes S13 for `image-full` and `quote-image`.

**Done when:** catalog count 131 with `EXPECTED_BLOCK_COUNT` bumped; standard suite + parity +
fit-at-min pass; both appear in at least three style decks, clean reports, shots looked at.

### AC7 — Pipeline hand-off
- LLM-ARCHITECTURE: S0 style pick, S2a with style card + recipes + tier-1 index, S3 per-style
  cards, S5 critic rubric additions per style; `guides/blocks-authoring.md` "adding a style".
- An end-to-end dry run without an LLM: a scripted planner picks recipes for a 12-slide outline
  per style, fills from examples, runs the oracle loop.

**Done when:** the dry run yields 10 decks with 0 errors; each prompt section measured against
§5.2; docs updated; progress table closed.

---

## 7. Progress

| Phase | Status | Commit | Notes |
|---|---|---|---|
| AC0 | ✅ done 2026-10-09 | `6d57b151` | 45 tier-1; tier-1 index 14,715 chars; 36 recipes clean; see Notes — AC0 |
| AC1 | ✅ done 2026-10-09 | `3ef50f78`, `fda58d1b` | style core + corporate/minimal/gradient; 3×8-slide decks clean, 24 shots looked at; see Notes — AC1 |
| AC1.5 | ✅ done 2026-10-09 | `49aa2a41`, `055bef27`, `e6ac37d5`, `0d20ca6b` | composition polish at the root: centred blank/timeline regions, content-sized pros-cons at body size, two-column agenda, balanced recipes gate; see Notes — AC1.5 |
| AC2 | ⬜ | | |
| AC3 | ⬜ | | |
| AC4 | ⬜ | | |
| AC5 | ⬜ | | |
| AC6 | ⬜ | | |
| AC7 | ⬜ | | |

### Session log

| Date | Session | Moved | Notes for next session |
|---|---|---|---|
| 2026-10-09 | plan | This plan written (survey only, no code) | Start at AC0. Tier assignments in §1.2 are proposals: show the user §2.2 before AC0 commits them. Board `GVkKV9dh…` has no verdicts yet. |
| 2026-10-09 | AC0 | Tier metadata, tier-1 index, 36 recipes, LLM-ARCHITECTURE §3.1/S2 | **Approved:** the product owner delegated the decisions; the lead approved the §2.2 tier-1 list (45) and the §6 vocabulary as written. Next: AC1. |
| 2026-10-09 | AC1.5 | Composition polish (lead review of the AC1 sheets) | Next: AC2. Open items in Notes — AC1.5 "Not done" (chart takeaway size, kpi-row/roadmap paint gap, cards caption text). |
| 2026-10-09 | AC1 | Style core, three pilot styles, fixture decks, digest style lines, `--metrics --style`, `run.js --decks` | Next: AC2. Read Notes — AC1 "Found" first (masters are not painted by the DOM path; pros-cons/agenda/quote need knobs or hug). |

### Notes — AC0

**Approval.** The 45-block tier-1 list (§2.2) and the vocabulary list (§6) were approved as written
on 2026-10-09 (product owner delegated all decisions; the lead approved). AC0 committed them
unchanged: tier-1 count **45** (gate 35–48).

**What landed.**
- `BlockDefinition.aiTier / absorbs / looks` (types.ts, optional). Filled for all 129 from **one
  curated table**, `blocks/library/ai-curation.ts` (`AI_CURATION`), applied in place by
  `applyAiCuration()` when `library/index.ts` builds `BUILT_IN_BLOCKS` (identity kept). One table,
  not 129 file edits, because the tier-1 set is reviewed as a list. `looks` for tier 1 = the
  non-italic knobs of §2.2 (AC2 knobs are not added before they exist); for tier 2 = the §1.2
  knob column in order. Every name is an existing `option` slot of kind enum/boolean.
- `absorbs` = §2.2's column plus every §1.2 "Absorbed by" entry that names a single tier-1 block
  (`tags`/`kv-list`/`definition`/`iceberg`/`flow`/`avatar-group`). Left out on purpose: entries
  waiting for AC2 (`feature-reveal` → feature-grid, `quote-image` → testimonial; both blocks are
  tier 1/tier 2 today but cannot be absorbed yet), and "specialist / style masters / layout regions
  / promoted by profile" entries (no tier-1 sibling). 14 absorbed blocks got one sentence appended
  to `describe.avoid` naming the absorber; `tls.c.profile-card`'s avoid was rewritten shorter
  (names `tls.c.team`) to keep the detail budget.
- Gates in `catalog-conformance.spec.ts` (`aiCurationViolations`, exported): every block has
  `aiTier`; `absorbs` resolve and are tier 2; `looks` are enum/boolean option slots, no
  duplicates; tier-1 count 35–48; every absorbed block's `avoid` names an absorber; the gate is
  proven by a deliberately bad definition.
- `capabilityIndex(reg, { tier: 1, roles?, profile? })` — header, **Recipes**, then per category
  tier-1 full lines with ` knobs: …` and one `also:` line of tier-2 names. `profile: { prefer,
  avoid }` (type `CapabilityPreference`) promotes / drops types; a recipe that uses a dropped type
  is dropped too. **`style` is not an option yet**: `DeckStyle` does not exist until AC1, which
  should resolve a style id to the same `CapabilityPreference` plus the style card.
  `capabilityIndexData` entries gain `aiTier`, `looks`, `absorbs` (additive; the kpi-row
  `toEqual` case was extended, not loosened); `{ tier: 1 }` filters the data the same way.
  `CapabilityBlockDigest.absorbs` is in the structured detail only (see budgets).
- `blocks/recipes.ts`: `RECIPES` (36, all 10 roles), `recipesFor`, `recipeLine`, `recipeSlide`
  (fills from `describe.example`, knobs on top), exported from `blocks/index.ts` with
  `AI_CURATION`. `recipes.spec.ts` (146 tests): real layout + regions, tier-1 blocks, knob slots
  enum/boolean, `validateDeckSpec` 0 errors, **`analyzeSlide` 0 errors / 0 warnings for all 36**.
- LLM-ARCHITECTURE §3.1 now names recipe ids (F9 fixed), §S2 has the "Tier 1 + recipes" bullet.

**Recipe deviations from §5.1 (found by the oracle, not guessed).**
- `quote` layout: its `quote` region is 140 units tall; `tls.t.quote`'s example needs 237 →
  `quote-pull` uses `blank`. (The `quote` layout is effectively unusable for a quote with
  attribution — worth a fix in AC6 alongside `full-bleed`.) Added `quote-statement`
  (`tls.t.statement showAttribution`).
- `section` layout: the `subtitle` region is 52 units; a `tls.t.body` example needs 83 →
  `section-title` is title only.
- `agenda-image` uses `tls.t.bullets marker=number` beside an image instead of `tls.c.agenda`
  (slide scope must sit alone in the main region). `closing / contact` two-column became
  `closing-split` (`tls.c.closing variant=split`). `kpi-row` layout → kpi-row + chart became
  `data-kpi-row` (`timeline` + `tls.c.kpi-row`) plus `data-bar-takeaway`; the `kpi-row` layout's
  4 cells take tier-2 `kpi-tile`s, so no recipe uses it. Bento / image-full wait for AC6.

**Numbers.** Tier-1 index **14,715 chars** (≤ 16k; recipes section 3,611 — over the §5.2 ~3k
target, compressed by `+title` = implied `tls.t.title`); default index **18,763** (unchanged, ≤ 20k);
8-largest detail **11,999 / 12,000** — it was already ~11,994 before AC0. **AC1/AC2 warning:**
the 12k detail budget has no headroom (the AC0 "Use instead of" markdown line was dropped for it),
and the tier-1 index has ~1.3k left for AC1's ≤ 1.2k style card — AC1 should pass `roles` or trim
the recipe lines. tsc prod **0**, spec **329** (ratchet 329). eslint on new files 0 errors.
Specs: digest + conformance + recipes + layout-layers + layout-anchor + block-metrics +
motion-style 1,635 pass; the 14 edited blocks' suites 305 pass. Full suite not run (machine rule).

**Not built in AC0.** `style` option (AC1); per-style card; `describe.avoid` for `feature-reveal`
and `quote-image` (AC2); hiding `tls.l.grid-guide`/`tls.l.safe-area` from the AI (still listed in
`also:`; a default `avoid` would hide them — decide in AC1 with style `avoid`).

### Notes — AC1

**What landed** (`3ef50f78` core, `fda58d1b` render fix + tuning).
- `DeckStyle`, `FontRef`, `StyleSurface` (types.ts), `DeckSpec.style?`, `TDDocument.styleId?`
  (additive; version stays 16). Data in `blocks/styles/{corporate,minimal,gradient}.ts`,
  `BUILT_IN_STYLES` + resolution helpers in `blocks/styles/index.ts`, exported from `blocks/index.ts`.
- Resolution §3.2, all at compile/read time: `resolveDeckTheme(theme, styleId)` (style palette, else
  `palettes[0]`; palette ids also resolve without a style); `mergeDeckTokens(style.tokens,
  spec.tokens)` read through `deckSpecTokens`/`documentDeckTokens` by `deckSpecToDocument`,
  `analyzeDeck`, `deckLayoutContext`, `useDeckTokens`, `Deck.addSlideFromSpec`, the decompiler —
  `doc.tokens` stays the authored value; style masters appended as `style:*` with a default
  `masterId` + background per slide (decompiler drops both); `blockDefaults` filled by
  `compileSlide({ blockDefaults })` into unauthored top-level props and recorded as
  `$block.styleDefaults`; `style.motionStyle` as the deck default (not written to `doc.motionStyle`).
- Round trip: `shapeToBlock` keeps the filled knobs (renderers need them — the first cut stripped
  them there and DeckViewer rendered the unstyled block; caught in the shots), the decompiler uses
  the new `shapeToAuthoredBlock`, which drops a filled key still equal to its default. Spec: the
  three decks return `slides` byte-identical, no `tokens`/`masters`/`motionStyle` leaked.
- Validator `style/unknown` (error + suggestion), `style/theme-mismatch` (warning, suggests
  `palettes[0]`); palette ids accepted as `theme`. JSON schema: `style` enum, palette ids in the
  theme enum. SCHEMA.md `style` section.
- Digest: tier-1 index has a `## Styles` section — one line per style (`id (family) — palettes`),
  or with `{ style }` that style's line + brief + rules, and its prefer/avoid merged into the profile.
  Full card on demand: `styleCard(style)` (corporate 929, minimal 868, gradient 863 chars ≤ 1.2k).
  `tls.l.grid-guide` / `tls.l.safe-area` hidden from the tier-1 index (`AI_HIDDEN_TYPES`; AC0
  deferred item; the conformance test now asserts their absence instead of an `also:` entry).
  Tier-1 index **14,982** chars (default), 14,865 / 14,669 / 15,164 with corporate / minimal /
  gradient (≤ 16k); full index 18,763 unchanged.
- `cli.js --metrics --style <id> [--theme <palette>]` (style palette, tokens and knob defaults;
  `buildBlockMetrics({ blockDefaults })`). `calibrate/run.js --decks name=file,…`.
- Fixtures `__fixtures__/styles/{corporate,minimal,gradient}.json`: identical slides (spec checks),
  only id/title/theme/style differ. `styles.spec.ts` (22): data validity (palette ids, text ≥ 4.5:1
  on background and surface, knob values in the slot enums, prefer/avoid types exist, card ≤ 1.2k),
  resolution order, round trip, validator, schema, `analyzeDeck` clean.

**What each pilot changes.** corporate: `corporate-navy` (white/navy/blue #0B5FFF), radii 4–16,
smaller display/title (128/72), surface-tinted cover foot + full-surface section master, field
divider, `alt` cards, source on charts, rule quote, subtle motion. minimal: `minimal-white`
(black/grey), density `roomy`, title 80, outline numbered cards, minimal divider, chart insight
below, no quote mark, muted takeaway, subtle motion, no masters. gradient: `gradient-night`
(#08090D/violet #8B6CFF/cyan), display 160 / title 96 tight, radii 12–40, linear-gradient masters in
palette sentinels (cover background→surface→accent, section, content), numeral divider, glyph
quote, expressive motion.

**Verification.** `cli.js` on each deck: 0 errors, 0 warnings, `needsVisualCheck` empty (one
`layout/unbalanced` info on the section slide: the divider is left-aligned by design). Calibration
(`run.js --decks …`, 1 Chromium page, Inter loaded, 0 page errors): 33 blocks, 0 missing, 0 box
deltas > 1; table vs browser wrap 3/185 lines (chart-insight, cards); worst height error 1.5%
(cards). Width overflows +1% kicker (letter-spaced) and +3% closing contact line, centred, not
clipped (checked at full size). **All 24 shots looked at** (session scratchpad `calib/`): three
clearly different decks with the same content; no clipped or overlapping text after the fixes.
tsc prod **0**, spec **329** (ratchet). Specs: styles, digest, validator, slide-compiler,
deck-document, demo round trip, layout-report, tokens, recipes, block-metrics, decompiler,
deck-context, shape-bridge, motion-showcase, clone-spec — 501 pass (`--maxWorkers=1`).

**Found (for AC2+).**
- Style masters are painted only by `renderPageToSvg`; the DOM path (editor, DeckViewer) paints
  `page.background` alone. That is why AC1 masters carry only a background (copied onto the page)
  and corporate's master chrome (header/footer/page number, §3.3) is **not built** — needs master
  blocks in the DOM path (a DeckViewer change, which is the user's uncommitted file) or an AC4 route.
- First shots: `tls.c.cover` default `decoration=blob`/`arc` overlaps a two-line centred title (all
  styles → `decoration=none` for now); `variant=split` without an image leaves half the slide empty
  (corporate moved to centred). `tls.g.pros-cons` fills its region with caption-size items, so
  `style=cards` drew mostly empty boxes (default dropped); `tls.c.closing variant=split` puts a tall
  near-empty person card on the right. Good AC2 knob/hug candidates.
- `tls.c.agenda` and `tls.t.quote` hug top-left in `blank` (S28); the decks centre them with
  `layer: 'backdrop', anchor: 'center'` — works and reports clean, but a recipe-level answer
  (regionAlign on `blank`, or a centred layout) would be cleaner.
- The decompiler emits `layer`/`anchor` after `props`; fixtures are written in that key order so
  the byte-identical check is meaningful.

### Notes — AC1.5

**Why.** The lead's review of the AC1 sheets: three distinct styles, but sparse composition —
pros-cons drew caption-size points in two tall empty columns, cards and other content-sized blocks
hugged the top of `timeline` with ~40% empty below, the agenda had no heading and leaned on the
`layer:'backdrop', anchor:'center'` workaround. The recipes would have taught the AI the same, so
the fixes are at the root (layouts, blocks, recipes, oracle), not in the fixtures.

**What landed.**
- `slide-layouts.ts` (`49aa2a41`): `blank` → `regionAlign: { content: 'center' }`, `timeline` →
  `{ timeline: 'center' }` (existing mechanism, no new vocabulary). A content-sized block now sits
  in the vertical middle of its region; fill blocks and region-claiming blocks are unchanged.
  Every other fixture deck, snapshot and spec passed unchanged (2,094 tests in 19 suites).
- `tls.g.pros-cons` (`49aa2a41`, `055bef27`): points at `body` when the pitch allows (caption, then
  footnote, only when dense); columns as tall as their rows (cards style no longer draws empty
  boxes), verdict right below at `body` with a 32-unit gap, whole composition centred in the box.
  Size card: `h=fill` → `h≈168+73/item@840`.
- `tls.c.agenda` (`e6ac37d5`): ≥ 1200 units wide with 4–8 items → two columns (items run down
  column 1, then 2; row gap `xl`); `capacity` counts both columns. Narrower boxes unchanged.
- Recipes: `agenda-full` = `timeline` + title + agenda; `data-kpi-row` and `process-roadmap` pair
  the block with a `tls.t.takeaway`. `recipes.spec`: **every recipe example now has no
  `layout/unbalanced` and no `region/empty`** (36 recipes); one named allowance —
  `data-big-stat` may carry the *side* variant (a single left-aligned number). Before: 16 of 36
  recipes were unbalanced.
- Oracle (`0d20ca6b`): with no authored `role`, a slide made only of cover / divider / closing
  blocks is judged as that role, so a left-aligned divider gets no side hint (same rule as
  `role: 'section'`; an authored role wins). `SlideSpec.role` is not round-tripped through the
  document, so the fixtures cannot carry it. Test in `layout-calibration.spec`.
- Fixtures: st_02 = `timeline` + "Agenda" title + agenda; st_07 quote without layer/anchor.

**Verification.** `cli.js` on the three decks: 0 errors, 0 warnings, **0 info findings** (no
`layout/unbalanced`, no `region/empty`), `needsVisualCheck` empty. Calibration `run.js --shots`
all 24 (1 Chromium page): 36 rows, 0 missing, 0 box deltas > 1; worst height error cards 1.5%,
pros-cons 0.9%; same 2 known width overflows (+1% kicker, +3% closing contact; centred, not clipped).
Sheets `sheet2-{corporate,minimal,gradient}.png` (session scratchpad) **looked at**: agenda fills
the width under its heading, cards and pros-cons sit in the vertical middle under the title,
pros-cons readable, quote centred. tsc prod **0**, spec **329**. Specs: recipes, digest (snapshot:
3 recipe lines + the pros-cons size hint), block-metrics (cards regenerated), styles, slide-layouts,
slide-compiler, layout-report, layout-calibration, layout-layers, layout-anchor, slide-composition,
decompiler, deck-document, demo-deck-*, block-library-tour, motion-showcase, catalog-conformance,
agenda, pros-cons — all pass (`--maxWorkers=1`).

**Not done (for AC2).**
- `tls.c.chart-insight` beside a tall chart: the takeaway is 2 body lines in a 1/3 panel and reads
  small. A bigger takeaway needs a size knob on `tls.t.takeaway` (AC2 knob vocabulary) or the
  `below` side; not changed here.
- `data-kpi-row` / `process-roadmap`: the main block claims the region and paints at its top, the
  takeaway lands at the bottom — balanced by the numbers but with a gap in the middle. Those blocks
  should hug their content (AC2 hug candidates, like pros-cons).
- `tls.c.cards` text is caption size in tall cards; a body tier when there is room would help.
- `data-big-stat` is left-aligned by design (the one recipe allowance).

