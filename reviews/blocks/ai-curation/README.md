# AI curation — a core block set, deck styles, and the picking pipeline

**Date:** 2026-10-09 · **Branch:** `plan/block-system` · **Against commit:** `a8281fdf` (LO8 done)
**Status:** AC0–AC8 done (AC8 Variety, 2026-10-10: [§8](#8-ac8--variety)); AC5 awaits the user's board review. Resume from [§7 Progress](#7-progress).

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
| AC2 | ✅ done 2026-10-09 | part 1: `85c841de`, `609cc2d1`, `57ed1409`; part 2a: `89e49c55`, `349e4203`, `90ff0abe`, `8c9a73f7`, `237ba7ba`; part 2b: `d95333f1`, `3c4ea4d4`, `f6523e8d`, `c2151e22`, `591ed78f`, `466c13b7`, `3d546a40`, `c9d46d14` | §2.3 ranks 1–2 complete (feature-grid, testimonial, stat-spotlight, big-stat, hero; agenda, comparison, kpi-row, closing, cards, kinetic-title) + lead-review fixes; see Notes — AC2 (part 1), (part 2a), (part 2b) |
| AC3 | ✅ done 2026-10-09 | `75348089`, `ea78f120`, `dab26adf` (pre-item: `a563f5d7`, `0f309f96`, `5f3d4bf3`) | heading/body families, 11 measured families + kerning pairs (Inter too), registry replaces name sniffing, sample + harness load the fonts, Vietnamese fixture deck; minimal = Be Vietnam Pro, gradient = Plus Jakarta Sans headings; sparse-recipe ratchet 3 → 0; see Notes — AC3 and AC3 (finish) |
| AC4 | ✅ done 2026-10-09 | `75a0a16b`, `eeabb247`, `a12702c8`, `c38b0d48`, `e2cb3af5`, `2d2346c3` | rect.shadow, DeckTokens.surface + cardPaint (8 blocks), 8 motifs + grain/mesh, style master blocks painted on the page, chart look from tokens, Rough.js spike passed (adopt with doodle in AC5); see Notes — AC4 |
| AC5 | 🟡 built, awaiting user review | `54894e92`, `2b3213cf`, `ae190106`, `cd7d9ef5`; review fixes `85a4f6e5`, `b98ec121`, `f1fc702b`, `c7bc8e7a` | seven styles (luxury, editorial, glass, swiss, doodle + doodle-kids, memphis, consulting), Rough.js motifs, contrast + per-style size-card specs; 10 decks clean, 100 shots looked at, `sheet7-<style>.png`; user review on the style board https://claude.ai/artifact/5nruezsKGMj4AFcLNxoevX (verdicts in db collection `styles`, one doc per style id + `ac6`); see Notes — AC5 |
| AC6 | ✅ done 2026-10-10 | `9af1766f`, `fd6e0116` | `tls.c.bento`, `tls.c.image-full` (tier 1), `full-bleed` layout, recipes `content-bento` + `quote-image-full`; 131 blocks; in all ten style decks; see Notes — AC6 |
| AC7 | ✅ done 2026-10-10 | `4151b1c3`, `f1b8d241`, `d70c0627`, + the README/CLAUDE.md commit | `tools/layout-report/dry-run.js` + `blocks/pipeline/dryRun.ts` + `dry-run.spec.ts`: 10 styles x 12 slides, 0 errors, 0 warnings, 0 repairs needed; docs updated; prompt budget measured (all-roles total over 16k by 219-1,100, per-role within); see Notes — AC7 |
| AC8 | ✅ done 2026-10-10 | `8fba06a4`, `7b86ec1c`, `ef132333`, `2b7e1337`, `c85121df`, + the docs commit | Variety: seeded picker with look signatures, 70 recipe variants, style `variety`, quote and image-full variants, knob values in the digest, strict knob validation, five showcase decks; 3 seeds × 10 styles clean, 92–100 % of slides differ between seeds (was 0 %); see §8 and Notes — AC8 |
| AC8.5 | ✅ done 2026-10-10 | `0d138555`, `3484c6b6`, `30a3a35a`, + the docs commit | Quality pass on the variety decks: deck-level quality gate (fill, region fill, lead type) in the dry run and S4.1, content-asset input for the picker, roomy blocks and recipes, motif/contrast fixes; weak slides judged on the sheets 148 → ~15 of 360; 30 decks 0/0, 0 quality findings; see §8.9 and Notes — AC8.5 |
| AC8.6 | ✅ done 2026-10-10 | `1b83fbd7`, `4a3a9640`, `1dc2fb4b`, + the docs commit | Small polish pass: stat-spotlight roomy tier, big-stat split label ladder, section-title as a real section design (layout `section-stack`, title `size: fit`, body `size`), flipped text ink 12:1; 30 decks 0/0, 0 quality findings; see §8.10 and Notes — AC8.6 |

### Session log

| Date | Session | Moved | Notes for next session |
|---|---|---|---|
| 2026-10-09 | plan | This plan written (survey only, no code) | Start at AC0. Tier assignments in §1.2 are proposals: show the user §2.2 before AC0 commits them. Board `GVkKV9dh…` has no verdicts yet. |
| 2026-10-09 | AC0 | Tier metadata, tier-1 index, 36 recipes, LLM-ARCHITECTURE §3.1/S2 | **Approved:** the product owner delegated the decisions; the lead approved the §2.2 tier-1 list (45) and the §6 vocabulary as written. Next: AC1. |
| 2026-10-09 | AC1.5 | Composition polish (lead review of the AC1 sheets) | Next: AC2. Open items in Notes — AC1.5 "Not done" (chart takeaway size, kpi-row/roadmap paint gap, cards caption text). |
| 2026-10-09 | AC2 part 1 | Takeaway `size`, chart-insight `insightSize`, content-sized kpi-row/roadmap, body text in wide cards; feature-grid `cell`/`align`/`iconStyle`; testimonial `variant: photo`; `knobs.json` | Next: AC2 part 2 — `stat-spotlight`, `big-stat`, then `hero`, `kinetic-title`, `agenda`, `comparison`, `kpi-row` tile, `closing`, `cards` numeral. Read Notes — AC2 (part 1) "Remains" first. |
| 2026-10-09 | lead review | Looked at `sheet3-knobs.png` (AC2 part 1) | Open visual issues for AC2 part 2: (1) `knobs.json` kn_01 kpi-row and kn_02 roadmap slides still sit in the top half with the bottom ~45% empty — the `title-body`-type layout does not centre its region like `blank`/`timeline` (AC1.5); make the recipe/region balanced and let the balance gate catch it; (2) feature-grid `iconStyle: circle` icons read too small (~24 units) — scale icon with cell size; (3) testimonial photo fixture has no image (placeholder only) — add a data-URI image. Then continue §2.3. |
| 2026-10-09 | AC2 part 2a | Lead-review issues (1)–(3): kpi-row display tier, roadmap roomy tier, recipes region-fill gate; feature-grid disc scales with the cell; data-URI photo in `knobs.json`. §2.3 rank 1 knobs: stat-spotlight `visual`/`statsPlacement`, big-stat `variant`/`align`, hero `align`/`decoration`; `data-big-stat` recipe centred (allowance removed) | Next: AC2 part 2b — rank 2 (`kinetic-title`, `agenda`, `comparison`, `kpi-row` tile, `closing` big-type, `cards` numeral). Read Notes — AC2 (part 2a) "Open" first: 11 sparse timeline recipes are a named ratchet; digest top-8 has 72 chars of headroom. |
| 2026-10-09 | AC2 part 2b | Lead review of part 2a: big-stat large tier (number grows with the box), hero CTA on-accent label. §2.3 rank 2: agenda `variant`/`numbering`, comparison `style` (cards, versus), kpi-row `tile`, closing `variant: big-type`, cards `numeral: giant`, kinetic-title `tone`. AC2 ✅ | Next: AC3. Read Notes — AC2 (part 2b) "Open": the titled timeline recipes are still sparse by default (ratchet unchanged); digest top-8 has 49 chars of headroom (budget kept at 12,000). |
| 2026-10-09 | AC2 lead review + AC3 | Roomy tiers so titled slides fill their region (sparse ratchet 11 → 3); heading/body families, 11 measured families, `font-widths.js`, fonts in sample + harness; minimal/gradient heading faces | Next: AC4. Read Notes — AC2 (lead review) and Notes — AC3 "Open". |
| 2026-10-09 | AC3 finish + AC4 | AC3: kerning pairs (Inter p95 3.8 → 3.0 %), Vietnamese fixture, sparse ratchet 3 → 0. AC4: rect.shadow, surface + cardPaint, motifs, grain/mesh, master blocks on the page, chart look, Rough.js spike, two surfaces fixture decks | Next: AC5. Read Notes — AC4 "Open" first (minimal shows no ghost cards because its cards knob is `outline`; doodle adopts Rough.js; SVG poster icon size in feature-grid). |
| 2026-10-09 | AC4 lead review + AC5 + AC6 | AC4 fixes (master shapes in `addSlideFromSpec`, SVG poster icons, minimal ghost cards, image fallbacks, pricing roomy tier); AC5 seven styles; AC6 bento + image-full + full-bleed | Session cut off by an API error before verification; finished in the next session. |
| 2026-10-10 | AC5/AC6 finish | Verification (reports, calibration, parity chunks, tsc, specs, digest), 100 shots looked at; fixes: icons, pros-cons ellipsis, glass orbs, consulting section, bento gaps; `sheet7-*` | Next: the lead's board review of the ten styles (AC5 → ✅ or `fix` rows), then AC7. Read Notes — AC5 "Open". |
| 2026-10-09 | AC1 | Style core, three pilot styles, fixture decks, digest style lines, `--metrics --style`, `run.js --decks` | Next: AC2. Read Notes — AC1 "Found" first (masters are not painted by the DOM path; pros-cons/agenda/quote need knobs or hug). |
| 2026-10-10 | lead review | Looked at all 10 `sheet7-<style>.png` + `sheet7-ac6.png`; every style reads as its family, no blocking defect. Published the style board https://claude.ai/artifact/5nruezsKGMj4AFcLNxoevX | Next: read `styles` verdicts (ArtifactData list), fix every `fix`, then AC7 (Sonnet subagent, lead brief). Open items in Notes — AC5 "Open". |
| 2026-10-10 | AC7 | Dry run (script, pure module, spec), LLM-ARCHITECTURE S0/S2a/S2b/S3/S4.1/S5.2/§9, `guides/blocks-authoring.md` §2.11 "Adding a deck style" | Plan closed except AC5 (awaiting the user's board review). Read Notes — AC7 "Open" first: the all-roles S2a prompt is over 16k; `capabilityIndexData` has no `styles`/`recipes` arrays. |
| 2026-10-10 | AC8 | Audit (§8.2), variety picker, recipe variants, style `variety`, quote/image-full variants, digest knob values, validator, showcases, sheets `sheet8-*` | AC8 closed. Read Notes — AC8 "Open" first: consulting `section-title` reads pale on navy, the gradient cover-bleed title has one borderline line over-count in a dry-run deck, logo walls are empty offline. |
| 2026-10-10 | AC8.5 | Quality pass (lead review of `sheet8-seeds-*`): quality gate, asset input, roomy blocks, motif/contrast fixes, sheets `sheet9-seeds-<style>` | Read Notes — AC8.5 "Open" first: stat-spotlight slides still read thin, big-stat `split` label small, hero `align: center` spec fails on the AC8 label slack. |
| 2026-10-10 | AC8.6 | Polish pass (stat-spotlight, big-stat split, section-title), image-full / showcase-consulting re-check, sheets `ac86/sheet-*.png` | Read Notes — AC8.6 "Open" first: section-title passes only where the headline takes display type in the 1200 column (6 of 10 styles for the dry-run headline); the showcase fixtures still hold the pre-AC8.6 section slide. |

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

### Notes — AC2 (part 1)

**What landed.**
- `85c841de` — AC1.5 leftovers. `tls.t.takeaway.size: body | lead` (lead when the box has the
  height, else body; default body, so nothing existing moved). `tls.c.chart-insight.insightSize:
  body | lead`, passed to its takeaway. Recipes `data-chart-insight`, `data-kpi-row`,
  `data-bar-takeaway`, `process-roadmap` and the three style decks (st_05) use lead.
  `tls.c.kpi-row` is content-sized (row = tallest tile's painted content, then re-laid at that
  height), `tls.g.roadmap` bars grow at most 1.5x and its root is the painted height past that —
  both now sit directly above their takeaway and the pair is centred by `timeline`'s regionAlign.
  `tls.c.cards` with 4 cards keeps body text when the text column is ≥ 280 wide and the cards fit
  the box (caption otherwise; 2–3 cards were already body).
- `609cc2d1` — `tls.c.feature-grid`: `cell: plain | card` (28 padding, surfaceAlt, equal height per
  row), `align: start | center`, `iconStyle: plain | circle` (28 glyph on a 48 tinted disc). Template
  and poster share the geometry (LO7 posterGeometry kept). `size.min` 1120×251 → 1120×307 and
  `preferred` measured with cards, so every value fits its own min box. Absorbs
  `tls.c.feature-reveal` (now tier 2; its avoid already names feature-grid). Tier-1 count 45 → 44.
  Schema guidance text trimmed to keep the top-8 digest detail ≤ 12k (budget not raised).
- `57ed1409` — `tls.c.testimonial.variant: centered | photo`: the avatar URL as a rounded photo
  (36% of the inner width, full inner height) beside a left-aligned quote/name/role column, centred
  vertically; no safe URL → a soft accent-tint panel (never an unsafe `src`). `size.min` 840×554 →
  840×600 (photo at 840 is 598). Absorbs `tls.c.quote-image` (already tier 2, avoid names testimonial).
- `looks` in `library/ai-curation.ts`: takeaway `tone, size`; chart-insight `+ insightSize`;
  feature-grid `cell, align, iconStyle` (`columns` is a number slot, not a look); testimonial `variant`.
- `__fixtures__/styles/knobs.json` (corporate style, 7 slides): kpi-row + lead takeaway, roadmap +
  lead takeaway, chart-insight lead, 4 cards, feature-grid card/center/circle, feature-grid 2-col
  cards, testimonial photo.

**Verification.** `cli.js`: corporate / minimal / gradient / knobs — 0 errors, 0 warnings, 0 info
findings, `needsVisualCheck` empty. Calibration `run.js --decks knobs,corporate,minimal,gradient`
(1 Chromium page, 31 slides): 51 rows, 0 missing, 0 box deltas > 1; **html parts 17: 0 line-count
mismatches** (feature-grid ×2, testimonial photo; |top|/|bottom| ≤ 0.6). One layout-kind table
mismatch `st_04:b_cards` title (table 2 lines, browser 1; over-count, safe) in a style deck — the
3-card path is unchanged by this phase, so it predates AC2. Shots looked at: sheet
`sheet3-knobs.png` (session scratchpad). tsc prod **0**, spec **329**. Specs (`--maxWorkers=1`):
takeaway, chart-insight, kpi-row, roadmap, cards, feature-grid, feature-reveal, testimonial,
quote-image, recipes, digest (snapshots updated: knob lines, recipe knobs, roadmap size hint),
catalog-conformance, layout-report, block-metrics (size cards regenerated), styles, slide-compiler,
layout-calibration, slide-composition, demo-deck-*, block-library-tour, motion-showcase,
slide-decompiler, deck-document, slide-layouts, layout-layers, layout-anchor — all pass. New spec
cases: every new knob value at `size.preferred` and `size.min` (fits, nothing escapes).
Parity-probe chunks (LO8) were not run this session.

**Remains (AC2 part 2).**
- §2.3 rank 1: `stat-spotlight` (visual, statsPlacement), `big-stat` (variant, align), `hero`
  (align, decoration); rank 2: `kinetic-title`, `agenda` (variant, numbering), `comparison` (style
  incl. versus, highlight), `kpi-row` (tile), `closing` (`big-type`), `cards` (`numeral: giant`).
- Testimonial photo has no real image in the fixture (the harness is offline); a data-URI photo
  fixture would show the cover crop.
- The feature-grid disc glyph (28) reads small at 1920; consider 32 when touching it again.
- The top-8 digest detail sits just under 12k: each new knob on a large html block costs ~50 chars;
  part 2 will have to trim guidance the same way or record a budget decision.

### Notes — AC2 (part 2a)

**Lead-review issues.**
- (1) kn_01 kpi-row / kn_02 roadmap (`89e49c55`). Measured first: the `timeline` region *does*
  centre its stack since AC1.5 (shots: kn_01 content 410–800 of 1080). What read as "top half,
  bottom empty" is a stack that is small for its region — kpi-row + takeaway painted 45% of the
  758-unit region, roadmap + takeaway 51%, with heading-size numbers and footnote-size lanes. Root
  fix in the blocks, no fixture change: `tls.c.kpi-tile` uses a display tier (value `display`,
  label/delta `body`) when its box has the height for it, else the compact tier as before (its
  `size.preferred` 400×220 → 400×320, so the size card stays content-sized, `h≈265@840`, not
  `fill`); `tls.c.kpi-row` keeps each tile's bottom padding so the tier is stable when the row is
  re-laid at its content height. `tls.g.roadmap` gets a roomy tier (caption labels, body lane names,
  40-unit bars growing to 1.75×) when the box holds it. Result: kpi-row recipe 45% → 59%, roadmap
  51% → 66% of the region; kn_01 free 83% → 78%, kn_02 72% → 67%. Side effects (reports otherwise
  identical, findings unchanged on all 8 fixture decks): colorful sl_11/sl_27 and motion ms_08/ms_09
  KPI tiles and roadmap are bigger (looked at: better); the LO2 stacked snapshot's kpi tile is now
  reported `fill` and its old `capacity/exceeded` warning is gone. **Gate:** `layout/unbalanced`
  cannot see a centred-but-small stack, and an oracle rule that would have caught kn_01 also fires
  on 11 other timeline recipes and on fixture slides pinned by the LO5b "does not spam" ratchet, so
  the check lives in `recipes.spec`: `data-kpi-row`, `process-roadmap`, `content-cards`,
  `comparison-pricing`, `data-chart-insight`, `data-stat-spotlight` must paint ≥ 55% of their region
  (HEAD failed it for kpi-row and roadmap), and the titled timeline recipes below 50% are a named
  ratchet (may not grow).
- (2) feature-grid `iconStyle: circle` (`349e4203`): `circleIcon(cellW)` — disc 15% of the cell
  (48..80), glyph 60% of the disc — shared by template and poster. size.preferred (384-wide cells):
  58 disc / 35 glyph; kn_05 at 1728 (560-wide cards): 80 / 48.
- (3) testimonial photo (`90ff0abe`): kn_07 avatar is a 4×5 PNG data URI (123 bytes, 186 chars).
  `isSafeAvatarUrl` already accepts `data:image/(png|jpeg|gif|webp)`; nothing loosened. **Limit
  found:** the `avatar` slot is `text` with `maxChars: 200` and `validateDeckSpec` reports
  `budget/overflow` as an error, so an inline image is capped at ~130 bytes — a real photo needs an
  https: URL or an asset. The fixture shows a soft-focus cover crop (Chromium smooths the 4×5 image
  with visible banding); a sharper photo needs that budget decision.

**§2.3 rank 1 knobs (`237ba7ba`).** Defaults unchanged: every existing fixture report is
byte-identical and the default template HTML is unchanged.
- `tls.c.stat-spotlight`: `visual: ring | plain` (no ring, value up to 0.42 of the square instead of
  0.3 — for numbers that are not a share); `statsPlacement: below | side` (stats stacked in a right
  column, 28% of the width ≤ 440, when the box holds n×150 + gaps and the column is ≥ 240, else
  below). `geometry()` returns one box per stat for template and poster.
- `tls.c.big-stat`: `variant: plain | accent | split` (accent: number in the accent colour under a
  96×8 rule; split: number right-aligned on the centre line, label/context beside it, narrow boxes
  stack) and `align: start | center`. size.preferred derived with the accent look; size.min 520×246
  → 520×278.
- `tls.c.hero`: `align: start | center` (lines, CTA pill and rule centred), `decoration: none | rule`.
  size.preferred derived with the rule; size.min 1280×490 → 1280×522.
- `looks` in `library/ai-curation.ts`; recipe `data-big-stat` uses `align: center`, so the
  `SIDE_OPEN_BY_DESIGN` allowance in `recipes.spec` is removed — all 36 recipes balanced, no exception.
- `knobs.json` kn_08 (stat-spotlight plain + side), kn_09 (big-stat accent + center), kn_10
  (big-stat split), kn_11 (hero center + rule).
- Digest: hero `when`/variant guidance and big-stat value guidance trimmed; top-8 detail
  **11,928** / 12,000 (was 11,990; budget not raised), tier-1 index **15,165** / 16,000, full index
  18,774 / 20,000.

**Verification.** `cli.js`: corporate / minimal / gradient (8 slides each) and knobs (11) — 0 errors,
0 warnings, 0 info findings, `needsVisualCheck` empty. Calibration `run.js --shots kn_01…kn_11
--decks knobs,corporate,minimal,gradient` (1 Chromium page, 35 slides): 56 rows, 0 missing, 0 box
deltas > 1; **html parts 33: 0 line-count mismatches** (|top|/|bottom| ≤ 0.9); layout-kind: the same
known `st_04:b_cards` title over-count and the two known width overflows (st_01 cover +1%, st_08
closing +3%) as part 1. Contact sheet `sheet4-knobs.png` (session scratchpad) **looked at**, plus the
full-size shots. tsc prod **0**, spec **329**. Specs (`--maxWorkers=1`): kpi-tile, kpi-row, roadmap,
feature-grid, stat-spotlight, big-stat, hero, recipes, capability-digest
(snapshots: knob lines, recipe line, roadmap hint, trimmed guidance), catalog-conformance,
block-metrics (size cards regenerated), layout-report, layout-calibration, layout-layers (LO2
snapshot), layout-anchor, styles, slide-composition, slide-compiler, slide-decompiler,
deck-document, html-poster-geometry, demo-deck-*, block-library-tour, motion-showcase,
composite-geometry, motion-m3, motion-style — all pass. One existing test changed its subject, not
its strength: big-stat "size.preferred is set from the poster of defaults" now derives from the
defaults in the accent look (as feature-grid's preferred is measured with cards). Parity-probe
chunks (LO8) not run.

**Open / visually weak.**
- kn_01/kn_02 are better but still centred with ~25% free below and a band under the title; the
  `kpi-row` `tile` knob (rank 2) would add card weight. 11 titled timeline recipes paint < 50% of
  their region (agenda-full, content-feature-grid, data-table, comparison-options/-pros-cons/
  -before-after/-table, process-steps/-chevrons/-timeline, people-team; chevrons 11%, timeline 16%):
  the same display/roomy-tier treatment per block is the root fix, ratcheted in `recipes.spec`.
- kn_10 (big-stat split) and kn_09 (accent) are single numbers on an otherwise empty slide (95%
  free) — by design, but the split pair reads small at `display` 128 (corporate).
- The hero CTA label keeps the `text` colour on the accent pill (pre-existing, both renderers).
- Digest top-8 headroom is 72 chars: rank 2 knobs will need the same trimming.

### Notes — AC2 (part 2b)

**Lead-review fixes.**
- A. big-stat (`d95333f1`): a large tier shared by template and poster (`BIG_STAT_LARGE`,
  `largeValueSize` in `schema.ts`). With the room for it the number is the largest size (≤ 2.25×
  display, ≤ 320) whose stack fits the box height and whose number fits the width (split: 55% of
  it), label at `lead`, context at `body`, 24 value gap; below 1.25× display the compact tier is kept
  exactly. Fixed point: laid out again at its own (rounded-up) content height it picks the same size
  (spec case); the template reads the size off the poster's value leaf. kn_09 number 128 → 288
  (box 254 → 442), kn_10 split 128 → 288. **Default-variant reports:** no fixture deck other than
  `knobs.json` contains a big-stat, so every other report is byte-identical; but the default
  variant *does* grow too (the lead asked for every variant), so `size.preferred` 1920×278 →
  1920×474 (derived at 1920×1080, rounded up), the size card/digest hint `h≈246@840` →
  `h≈334+50/L@840`, recipe `data-big-stat` free 0.95 → 0.81. The accent rule stays 96×8 (small next
  to a 288 number; a scaled rule is a follow-up).
- B. hero CTA (`3c4ea4d4`): the poster's label is `onColor(ctx, accent)`; the template paints the
  poster leaf's colour (without a poster `var(--tls-surface-color)` — `--tls-surface` can be a
  gradient, which is not a valid `color`, the first attempt's bug). `posterTextSignature` now
  includes each key's colour, so a recolouring theme re-templates. kn_11 shot: white on blue.

**§2.3 rank 2 knobs** (defaults unchanged: every existing fixture report byte-identical except the
new `knobs.json` slides and kn_01, which the lead asked to change).
- `tls.c.agenda` (`f6523e8d`): `variant: list | cards` (surfaceAlt card per item, lg padding, a card
  grid in two columns; the padding drops to sm before the type tier has to, and a box holding no
  tier as cards keeps the list), `numbering: plain | badge | none` (badge: number centred in a disc
  2× the index size, accent + on-accent for the current item, 14% tint for the rest; disc + number
  are one `item[i].index` group). kn_12.
- `tls.c.comparison` (`c2151e22`): `style: plain | cards | versus`. cards: every column on a card,
  the `highlight` column tinted with a 3-unit accent outline drawn inside; versus: two columns with an
  accent "VS" disc in a widened gutter (three columns are drawn as cards). cards/versus take the
  biggest type tier that fits (heading + lead, then subheading + body); plain keeps its one tier.
  `highlight` stays the existing number slot (not a look, as feature-grid `columns`). kn_13, kn_14.
- `tls.c.kpi-row` (`591ed78f`): `tile: plain | card | accent-bar` — a card per tile spanning the
  row's full width (edges line up with title and takeaway), accent-bar adds an 8-unit left bar; card,
  bar and tile are one `tile[i]` group. kn_01 uses `card` (lead review: no longer top-light), kn_15
  accent-bar; recipe `data-kpi-row` uses `card` (region fill 62%).
- `tls.c.closing` (`466c13b7`): `variant: big-type` — one giant start-aligned title (≤ 2.5× display,
  92% of the width, 42% of the height), lead text and CTA under it, person and contacts as a footer
  at the bottom; a short box takes a compact set and the title takes the height left (≥ heading).
  The CTA code is shared (`emitCta`). kn_16.
- `tls.c.cards` (`3d546a40`): `numeral: plain | giant` (with `lead: number`): display-step numerals,
  stepping down to the title step, then plain, when the box is short. kn_17.
- `tls.c.kinetic-title` (`c9d46d14`): inspected — `align`/`decoration` already existed. Added
  `tone: plain | accent`: the title on an accent panel (radius lg, 96 padding), all text/rule/orbs in
  the poster's on-accent ink, highlight words in accent2 nudged to read on the accent; a
  start-aligned panel drops the bottom-left disc. kn_18.
- `looks`: agenda `variant, numbering`; comparison `style`; kpi-row `tile, gap`; cards `+ numeral`;
  kinetic-title `+ tone` (closing already listed `variant`).
- Every new value has spec cases at `size.preferred` and `size.min` (fits, nothing escapes) plus
  geometry cases; DOM/SVG parity cases for agenda cards+badge, comparison versus, closing big-type,
  cards giant; kpi-row's parity case runs without a registry (the known nested-tile probe issue,
  `it.skip` in its spec), so it checks the card groups only.

**Digest budget decision (lead).** The top-8 detail budget *may* be raised from 12,000 to 13,000 if
rank 2 could not fit. It was **not needed**: top-8 detail **11,951** / 12,000 (cards entered the
top 8; was 11,928), so the spec constant stays 12,000. Tier-1 index **15,255** / 16,000, full index
18,779 / 20,000. One hand-written expectation changed its subject: `capabilityIndexData` kpi-row
`looks` `['gap']` → `['tile', 'gap']`.

**Verification.** `cli.js`: corporate / minimal / gradient (8 slides each) and knobs (18) — 0 errors,
0 warnings, 0 info findings, `needsVisualCheck` empty. Other fixture decks (demo-deck,
block-library-tour, colorful, motion-showcase) byte-identical to HEAD before this part. Calibration
`run.js --shots kn_01…kn_18 --decks knobs,corporate,minimal,gradient` (42 slides): 68 rows, 0 missing,
0 box deltas > 1; **html parts 36: 0 line-count mismatches** (|top|/|bottom| ≤ 0.9); layout-kind:
the known `st_04:b_cards` title over-count and the known width overflows (st_01 +1%, st_08 +3%)
only; kn_13/kn_14 comparison painted height report 395 vs DOM 400 (lead-size items, within the
cards/pros-cons spread already seen). Contact sheet `sheet5-knobs.png` (session scratchpad)
**looked at**, plus full-size shots of every new slide. tsc prod **0**, spec **329**. Specs
(`--maxWorkers=1`): big-stat, hero, agenda, comparison, kpi-row, kpi-tile, closing, cards,
kinetic-title, recipes, capability-digest, catalog-conformance, layout-report, block-metrics (size
cards regenerated with A, no later change), styles, slide-composition, demo-deck-*, layout-layers,
layout-anchor, layout-calibration, html-poster-geometry, motion-showcase, block-library-tour,
slide-compiler, slide-decompiler, deck-document, motion-m3, render-dom*, BlockPreview.theme,
composite-geometry, motion-style, slide-layouts — all pass. Parity-probe chunks (LO8) not run.

**Open / visually weak.**
- Titled timeline recipes still sit centred with a band under the title when their blocks are
  small (agenda-full 44%, comparison-options 37%, process-chevrons 11%, process-timeline 16%; the
  named ratchet in `recipes.spec` is unchanged). The new knobs (agenda cards, comparison
  cards/versus tiers) help when chosen, but the recipes still use the defaults.
- big-stat accent rule (96×8) is small next to the large-tier number; kn_09/kn_10 are still a single
  number on an otherwise empty slide (by design).
- kpi-row cards use the tile's own 24 padding (tight); kpi-row parity with a registry is still the
  known skipped issue.
- kinetic-title orbs can touch a long start-aligned title (the ring is translucent).
- The CTA pill in closing is wider on the right than the left (pre-existing `ctaW` × 1.05).

### Notes — AC2 (lead review of `sheet5-knobs`, AC3 pre-item)

**Issue.** Titled content slides read as a small, vertically centred block with a big empty band
between title and content (kn_04/05/12/13/14/15; recipes agenda-full 44%, comparison-options 37%,
process-chevrons 11%, process-timeline 16%).

**Decision: grow the blocks, keep the centred region.** Anchoring the stack nearer the title only
moves the band below the content (and trips `layout/unbalanced`); the band is the block being
small for its region. Each sparse block got a **roomy tier** — bigger type, padding and gaps —
taken only when the block has the height. Two rules keep it honest:
- content-sized blocks pick the first fitting candidate of a fixed-height ladder (roomy, then the
  old tiers), and a stretch is `min(H, k × content)` claimed up front, so laid out again at its own
  height the block picks the same tier (fixed point; cards spec proves it, calibration 0 box deltas);
- blocks whose root is the whole box (chevrons, timeline, steps, before-after, pros-cons) choose by
  box height (`H ≥ 480`) and width, since their box is always the region.

| Block | Roomy tier |
|---|---|
| `tls.c.cards` | lead text, heading titles (≤ 3 cards), 72 icon, cards 1.3× content |
| `tls.c.agenda` | heading titles, lead notes, subheading index, a hairline over each list item (TOC look), `xl` card padding |
| `tls.c.comparison` | heading + lead, `2xl` padding; **`plain` takes the type tiers too** (was body only) |
| `tls.c.kpi-tile` / `kpi-row` | a `title`-step value when `display` is too wide (4 tiles); `card`/`accent-bar` rows stretch to 1.35× the tiles, tile centred |
| `tls.c.feature-grid` | heading titles, lead descriptions, 64 icon / 1.25× disc, 40 card padding, card rows 1.25×; the poster chooses, the template reads the tier back from the poster (title leaf size) and pins the stretched row heights |
| `tls.g.chevrons` | subheading labels (heading with `below`), body notes inside / lead notes below, 160–280 tall |
| `tls.g.timeline` | horizontal: body dates, subheading titles, body notes, 420-wide cards, 1.5× node, 2× stem |
| `tls.c.steps` | horizontal one row: heading titles, 72 badge |
| `tls.c.team` | one row: xl portraits (lg with four), body bios, wider padding |
| `tls.g.pros-cons` | heading column titles, lead points, lead verdict (W ≥ 1200) |
| `tls.g.before-after` | heading title, lead text, caption tag, 40 padding, panels ≥ 52% of the box |
| `tls.d.table` / `compare-table` | one type step larger (`body→lead`), `md` cell padding, when the table fits its box that way (internal `density: 'roomy'`, never a prop value) |

Recipes: `content-feature-grid` uses `cell: card`, `process-chevrons` `textPlacement: below`,
`process-timeline` `alternate: true`.

**Numbers (region fill of the titled `timeline` recipes, before → after).** agenda-full 0.44 →
0.61, content-cards 0.69 → 0.92, content-feature-grid 0.29 → 0.61, data-kpi-row 0.62 → 0.78,
data-table 0.42 → 0.51, comparison-options 0.37 → 0.53, pros-cons 0.43 → 0.50, before-after 0.38 →
0.52, comparison-table 0.32 → 0.41, process-steps 0.27 → 0.37, process-chevrons 0.11 → 0.37,
process-timeline 0.16 → 0.57, people-team 0.45 → 0.67. knobs: kn_01 0.57 → 0.71, kn_04 0.54 →
0.68, kn_05 0.39 → 0.62, kn_12 0.56 → 0.69, kn_13 0.52 → 0.61, kn_14 0.52 → 0.67, kn_15 0.38 → 0.53.
Style decks: st_02 agenda 0.39–0.48 → 0.56–0.75, st_04 cards 0.59–0.61 → 0.78–0.83, st_06
pros-cons 0.61–0.69 → 0.79–0.90. **Ratchet tightened:** `KNOWN_SPARSE` 11 → 3 (`comparison-table`,
`process-steps`, `process-chevrons`); `FILLS_ITS_REGION` (≥ 55%) 6 → 10 (+ agenda-full,
content-feature-grid, process-timeline, people-team).

**Defaults that changed on existing decks (recorded, judged better in the shots):** every deck with
one of these blocks in a tall region gets the roomy tier — the four style decks, demo-deck,
block-library-tour, colorful, motion-showcase. Their `analyzeDeck` findings are identical to HEAD
(compared against a `git archive` of HEAD). Size cards regenerated: several hints became ranges
(`kpi-row h 150–289@544`, `agenda h 169–981@1728`, …) because the height now depends on the room;
digest snapshot and the LO2 stacked snapshot (kpi tile value now the `title` step) updated, and the
`capabilityIndexData` kpi-row `size` expectation follows the card. Spec subjects changed, not
loosened: agenda child counts include the roomy hairline; feature-grid's circle test passes the
poster to the template (the real host path) and allows the roomy 96 disc; comparison `plain` now
takes heading; cards "hug in a tall region" is `< 0.8 × box` plus a fixed-point check.

**Verification.** cli.js corporate/minimal/gradient/knobs: 0/0/0, `needsVisualCheck` empty.
Calibration (recipes deck of the 19 titled recipes + knobs): 73 rows, 0 missing, 0 box deltas > 1;
html parts 45: 0 line-count mismatches; one layout over-count (cards roomy text 2 vs browser 1).
Shots looked at (`chk-recipes.png`, `chk-knobs.png`). tsc prod 0, spec 329. Specs: the 13 touched
blocks + scorecard, recipes, digest, conformance, layout-report, block-metrics, styles,
slide-composition, demo-deck-*, layout-layers/anchor/calibration, tour, motion-showcase,
html-poster-geometry, slide-compiler/decompiler, deck-document, composite-geometry, motion-m2..m5,
list-sizes, render-dom — pass. Digest top-8 11,951 / 12,000, tier-1 15,301 / 16,000.

**Still weak.** chevrons and steps stay < 40% at the example's short content (thin by nature; a
takeaway under them would help but the fill blocks then centre with a gap); compare-table 41%;
the team example's avatar URLs do not load offline (alt text shows in the shot, pre-existing).

### Notes — AC3

**What landed.**
- `ResolvedTokens.headingFamily` / `.bodyFamily` (optional in the type, always set by
  `resolveTokens`; `fontFamily` kept = heading). `defaultResolveText` gives `display`, `title`,
  `heading`, `subheading` the heading family and `lead`, `body`, `caption`, `footnote` the body
  family (`HEADING_TOKENS`, `layout-child.ts`). Text leaves carry the family, so both renderers follow.
  Html: `--tls-font-heading` / `--tls-font-body` next to `--tls-font-family` (`HOST_CSS_VARS`), and
  `posterTextCss` now emits the poster leaf's `font-family` (single-quoted), so every LO7 template
  paints each text part in the poster's face without template edits.
- `tools/layout-report/calibrate/fonts.js` — the font set (from the sample's fontsource packages)
  as data `@font-face` (latin, latin-ext, vietnamese; upright), under the canonical family name.
  `font-widths.js` — one Chromium page, `canvas.measureText` at 1000px, ASCII + the Inter table's
  extra symbols + the 134 Vietnamese letters at 400 and 700 → `blocks/layout/font-metrics/<key>.ts`
  (a Vietnamese letter is stored only when it differs from its NFD base by > 0.001 em; 3.4–5.9 KB
  per family, more than the ~2 KB §4.1 guessed because of the bold table). `--check` re-measures:
  **every family's table matches `canvas.measureText` to 0.0001 em**, and running text (4 English +
  4 Vietnamese sentences, 400 and 700) through `tableMetrics` is within **p95 0.0–1.6 %** of the
  browser (kerning: Be Vietnam Pro 1.6 %, Crimson Pro 1.1 %, others ≤ 0.8 %).
- `layout/font-metrics/index.ts` — `FONT_FACES` registry (Inter = the LO5 table, unchanged),
  `faceForFamily` (first measured family of a CSS stack, case-insensitive, canonical or fontsource
  name), `faceCharEm` (bold reads the 700 table), `textWidthRatio`. `measure.ts`: `tableFaceKey`'s
  substring sniffing is gone — `tableFaceFor(stack)` = first measured family, else the stack's
  generic family (`monospace` / `serif` / `cursive` → the old hand tables), else Inter. **F5 fixed:**
  "Crimson Pro" (ivory-editorial, forest) and "Source Code Pro" (mono-grid) are measured with their
  own widths. `realWidth` (chart kit, html posters) reads the family too.
- Sample: 11 fontsource packages in `examples/nextjs-sample` (exact `5.3.0`, released 2026-07-19),
  imported in `app/layout.tsx`; `pnpm-lock.yaml` +11 packages (`COREPACK_ENABLE_STRICT=0 pnpm
  install`, nothing else re-resolved). The calibration tool reads them from the sample's
  `node_modules` (no separate devDependency needed); `run.js` inlines `fontFaceCss()` after the
  Inter CSS. `widths.js` reports per family.
- Styles: `minimal` = **Be Vietnam Pro** headings / Inter body, `gradient` = **Plus Jakarta Sans** /
  Inter, `corporate` = Inter / Inter (§3.3). Style card `Fonts:` line gains `text width vs Inter:
  heading ×0.97, body ×1.00` (§3.4); cards 896–955 chars (≤ 1.2k). New exports: `FONT_FACES`,
  `faceForFamily`, `faceByKey`, `textWidthRatio`, `tableFaceFor`, `FaceMetrics`.

**Fonts for the ten styles (all OFL-1.1, all ship a `vietnamese` subset per the package metadata):**

| Style | Heading / body | Package (5.3.0) | Subsets |
|---|---|---|---|
| luxury | Playfair Display / Inter | `@fontsource-variable/playfair-display` | cyrillic, latin, latin-ext, vietnamese |
| minimal | Be Vietnam Pro / Inter | `@fontsource/be-vietnam-pro` (no variable build; 400 + 700) | latin, latin-ext, vietnamese |
| editorial | Fraunces / Inter | `@fontsource-variable/fraunces` | latin, latin-ext, vietnamese |
| gradient, glass | Plus Jakarta Sans / Inter | `@fontsource-variable/plus-jakarta-sans` | cyrillic-ext, latin, latin-ext, vietnamese |
| swiss | Archivo / Archivo | `@fontsource-variable/archivo` | latin, latin-ext, vietnamese |
| doodle | Patrick Hand / Nunito | `@fontsource/patrick-hand` (400 only; bold is synthetic) + `@fontsource-variable/nunito` | latin, latin-ext, vietnamese (+ cyrillic for Nunito) |
| memphis | Bricolage Grotesque / Nunito | `@fontsource-variable/bricolage-grotesque` | latin, latin-ext, vietnamese |
| consulting | Source Serif 4 / Inter | `@fontsource-variable/source-serif-4` | cyrillic, greek, latin, latin-ext, vietnamese |
| corporate | Inter / Inter | `next/font` (sample) | latin-ext |
| (themes) | Crimson Pro, Source Code Pro | `@fontsource-variable/crimson-pro`, `…/source-code-pro` | latin, latin-ext, vietnamese |

No fallback swap (Lora/Montserrat/Lexend/Quicksand) was needed.

**Default-theme effect (recorded).** The default theme is `mono-grid` (Source Code Pro headings,
Inter body). Before AC3 *all* its block text was set in Source Code Pro (`fontFamily = heading ??
body`) and measured with the hand mono table. Now its body text is Inter and its headings are
measured as real Source Code Pro. Consequences: size cards regenerated (default theme); `tls.c.hero`
`size.min` 1280×522 → 1280×660 and `tls.c.kpi-tile` 200×210 → 200×216 (the size card's `atMin`
showed the mono display title taking another line at 1280 — honest mins, LO8 style); two
`layout-report.spec` overflow cases use more text (`LONG_BODY.repeat(5)` / `.repeat(2)`: the Inter
body no longer overflowed with the old amount — same subject); digest and LO2 snapshots updated
(a few size hints); `PROBE_TOKENS` set heading/body to Inter too (else the parity probe painted
the new default family — the two LO8 failures came back until it did).

**Verification.** Fixture reports: demo-deck, block-library-tour, colorful, motion-showcase and
corporate/knobs **byte-identical** to HEAD (all Inter) — the tour later changed only by the
pros-cons fix (`0f309f96`), same findings. cli.js corporate/minimal/gradient/knobs: 0 errors,
0 warnings, 0 info, `needsVisualCheck` empty. Calibration `--decks knobs,corporate,minimal,gradient
--shots` all 42 slides (fonts loaded: Inter, Be Vietnam Pro, Plus Jakarta Sans): 68 rows, 0 missing,
0 box deltas > 1; html parts 36: 0 line-count mismatches; **text width per family: Be Vietnam Pro
|abs| p95 2.6 %, Plus Jakarta Sans 2.3 %** (≤ 3 %); Inter 3.8 % (unchanged; short numeric labels).
Line counts: under the harness's default 3 %-tolerant browser wrap, 6 over-count flags, all in
`st_04` cards (roomy lead text / heading titles whose lines are 0.3–2.4 % over the box: the
browser at the true width wraps exactly like the table — `STRICT=1` shows 0 of them); the strict
under-counts are the 3 known no-wrap overflows (st_01 kicker +1 %, st_08 contact +3 %). Shots
looked at (`chk-mg.png`): both faces render, Vietnamese-capable, no clipping; the gradient st_06
pros-cons had ellipsised points with the pre-item's heading tier → fixed (`0f309f96`). tsc prod 0,
spec 329. Specs: the whole `library/` (text, media, chrome, layout, composite, diagram, data —
5,251 tests), top-level `blocks/*.spec`, motion, styles, icons, layout, `state/shapes/shared`,
ComponentUtil, render — pass, plus the new `font-metrics.spec` (9). `DeckViewer.spec` "retreating
into an auto build step" fails — it exercises navigation in the user's uncommitted
`DeckViewer.tsx`, not touched here.

**Open.** Vietnamese sample text is measured by `font-widths.js --check` (canvas), not yet by a
fixture slide in the harness (the style decks' copy is English). The 7 AC5 styles' fonts are
measured and loaded but not used until AC5.

### Notes — AC3 (finish, 2026-10-09)

The first AC3 session ended with Inter at text-width |abs| p95 3.8 % (over the ≤ 3 % gate) and the
Vietnamese text not yet in the harness. Finished in `ea78f120` and `dab26adf`.

**Why Inter was 3.8 %.** Three causes, found by measuring in the harness page itself:
1. *A harness artefact.* `measure.js` took a line's width from a `Range` over the whole line div.
   A wrapped line keeps its trailing space (`white-space: pre`), so lines came out one space too wide
   (+3–4.5 % on the st_04 card text). That also produced the "+0 % overflow" on st_04. Fixed: the
   range now ends at the last visible character. Inter p95 went to 3.5 %.
2. *Kerning.* The per-glyph tables add up advances, but the browser kerns (`font-kerning: auto`):
   "8.1" is −9 %, "3.1%" −4.7 %, "Wo" −0.05 em. **Decision: measure kerning pairs.** `font-widths.js`
   measures `w(ab) − w(a) − w(b)` with `canvas.measureText` at 1000 px for every pair of visible
   ASCII characters. It stores pairs of at least 0.005 em, rounded to 0.005 em and grouped by value
   (`FaceMetrics.kern`, e.g. `{ "-0.05": "Wo…" }`). Counts: Inter 1,092 pairs (`font-metrics/
   inter-kern.ts`, from the sample's `next/font` files via `fonts.js interFaceCss()`; Inter keeps its
   LO5 advance table, which matches canvas to 0.0005 em), Playfair 1,415, Be Vietnam Pro 835,
   Fraunces 517, Plus Jakarta Sans 457, Archivo 496, Patrick Hand 4, Nunito 1,394, Bricolage 3,062,
   Source Serif 4 1,998, Crimson Pro 2,018 and Source Code Pro 0. That adds 0.6–3.3 KB per file.
   `faceKernEm` looks up a pair; accented letters kern as their NFD base letters, and bold reuses the
   400 pairs. `tableMetrics` (per character, with the previous character) and the chart kit's
   `realWidth` apply them. `font-widths.js --check` now also compares the kern groups.
   Running-text sentences, oracle vs canvas, p95: Inter regular 0.9 % (was 3.5 %), Be Vietnam Pro
   0.6 % (was 1.6 %), Crimson Pro 0.6 % (was 1.1 %), all others ≤ 0.8 %.
3. *Pixel rounding (left as is).* Headless Chromium on Linux rounds every advance to a whole pixel,
   so a 22 px label is +3–4 % and an 18 px label −2–3 % against the font's own widths, while 36 px
   and above are within 1 %. Modelling that would fit the harness, not the hosts (Mac and Windows
   position glyphs at subpixels), so it is not modelled. It is what is left in Inter's p95.
   The LO5 pin "Hello World = 551 at 100 px" was one such rounded number: the unkerned sum, 550.5,
   matched it by luck. The spec now pins the 1000 px value, 5471 ± 3, which is tighter, plus
   547.1 ± 1 at 100 px.

**Line-count metric.** The harness checks the browser's wrap at the box width (strict) and at the box
+ 3 % (tolerant, the LO5 metric). Each alone reported a few "mismatches" that are measurement noise:
- strict flagged shrink-wrapped labels the DOM paints unwrapped (9);
- tolerant flagged card lines 0–3 % over the box that the table correctly breaks (6).

`stats.js` now counts a mismatch only when the table's count lies outside [tolerant, strict]. With
kerning the boxes are tighter, so this matters more than before. `STRICT=1` and `TOL=1` still give
the one-sided numbers.

**Vietnamese in the harness.** New `__fixtures__/styles/vietnamese.json` uses the `minimal` style
(Be Vietnam Pro / Inter) with 4 slides: cover, cards, pros-cons with Vietnamese headings, and
closing. It reports clean, and `widths.js` has an `ALL vietnamese` group: 37 lines, |abs| p95 1.9 %.
The shots were looked at (`ac3-vi.png`): stacked diacritics render on every line and nothing is
clipped.

**Effect on existing decks.** Kerning narrows Inter text by about 0.5 %. The `analyzeDeck` findings
of all 8 fixture decks are identical to HEAD (compared against a `git archive` of HEAD). Size cards
were regenerated: `big-stat` h 385 → 388 (the number scales up a little) and `pie` 287 → 285.
Snapshots updated: LO1 demo sl_03/sl_08 and the LO2 stacked example (±1–4 units of natural width),
plus the digest.

**Pre-item ratchet (recipes.spec).** `KNOWN_SPARSE` went 3 → **0**. `comparison-table`,
`process-steps` and `process-chevrons` now end with a lead `tls.t.takeaway`, as `process-roadmap`
does. Region fill went 0.41 / 0.37 / 0.37 → 0.60 / 0.77 / 0.77, and all three joined
`FILLS_ITS_REGION` (10 → 13). The ratchet is now two-way: the sparse set must *equal* the list, so a
fixed recipe has to leave it. Shots looked at (`rc.png`): for steps and chevrons the takeaway sits
at the region foot as a conclusion band, with a gap above it (the diagram keeps its box). Acceptable,
but this is where a future `regionAlign` would help.

**Verification.**
- `cli.js` on corporate, minimal, gradient, knobs and vietnamese: 0 errors, 0 warnings, 0 info;
  `needsVisualCheck` empty.
- Calibration `--shots` on all 46 slides (knobs + 3 styles + vietnamese): 74 rows, 0 missing,
  0 box deltas > 1, **0 line-count mismatches** (html parts 36: 0).
- Text width |abs| p95: **all 2.7 %**, Inter 3.0 %, Be Vietnam Pro 1.2 %, Plus Jakarta Sans 0.7 %,
  Vietnamese 1.9 %. Left: 2 kicker/contact no-wrap overflows of +2–3 % (22 px rounding).
- tsc prod 0, spec 329.
- Specs (`--maxWorkers=1`) pass: all of `src/blocks` (library in three chunks: 1,013 + 3,045 +
  1,199; top-level, layout, styles, motion, icons: 1,891), and `font-metrics.spec` (+1, kerning).
- Digest: top-8 11,951 / 12,000, tier-1 15,444 / 16,000 (style-filtered 15,125–15,626), full
  18,777 / 20,000.

**Open.** Inter **bold** is still regular × 1.05: running bold text is about 2–3 % wide, which is
the safe side. A measured Inter 700 table would fix it, at the cost of re-laying every bold Inter
run.

### Notes — AC4 (2026-10-09)

**What landed.**
- **`rect.shadow?: 0 | 1 | 2 | 'hard'`** (`75a0a16b`, `blocks/shadow.ts`). Levels 1 and 2 are
  `ELEVATION_SCALE`. The renderers have no tokens, so a `DeckTokens.elevation` override does not
  reach them, as before. `'hard'` is a solid copy offset 8 units right and down, in the rect's stroke
  colour (else `#111111`). The DOM draws it as `box-shadow` (renderer and parity harness), the SVG as
  an `<feDropShadow>` filter in `<defs>`. It is paint only and never a layout leaf.
  The same commit fixes DOM radial-gradient parity: the DOM drew a `circle` (farthest-corner, ~1.4×
  the SVG radius) where SVG draws an `objectBoundingBox` r = 50 % ellipse; it is now `ellipse 50% 50%`.
  No block used radial paint before (`shadow.spec`, 6 tests).
- **`DeckTokens.surface`** (`eeabb247`). A style's `surface` resolves as `DeckTokens.surface`
  under `DeckSpec.tokens.surface` (`mergeDeckTokens`, `deckSpecTokens`, `documentDeckTokens`,
  `cli --metrics --style`). It reaches blocks as `ResolvedTokens.surface`, the resolved form of the
  approved token (every field filled: `filled` / `none` / 0); it is absent when the deck sets none.
  `createLayoutContext` copies it.
- **`cardPaint(ctx, base)`** + `cardNodes` + `cardCssFromPoster` (composite `_kit`). `base` is the
  block's own neutral card. With no deck surface the result is `base`, so unstyled decks paint
  exactly as before: the 4 legacy fixture reports are identical to the AC3 baseline. The kinds:
  - `filled`: the block's fill, with the border from `stroke`.
  - `outline`: a border only.
  - `glass`: translucent white (12 % on a dark slide, 55 % on a light one) with a light 2-unit
    hairline. In html templates it also gets a DOM-only `backdrop-filter: blur(18px)`.
  - `ghost`: no fill and no border; a `stroke` becomes a **top rule** (the editorial "ghost with top
    rule" of §3.3).
  - `raised`: the theme `surface` fill with shadow ≥ 1 (default 2).

  Shadows apply only to filled kinds. Text on an unfilled or translucent card resolves against
  what is behind the block.

  Html templates paint the poster's card: an inset `box-shadow` stands in for the border, so the
  live content stays on the poster geometry (LO7). **Adopted by** cards (tones `alt` and `surface`,
  and the non-accent cards of `accent-first`), feature-grid (poster and template), kpi-row
  (card and accent-bar tiles), pricing (non-featured cards), team, comparison (`cards`, except the
  highlighted card), testimonial and `l.card` (without an instance `style.surface`). The
  testimonial is card-less by default and gets a card only under a deck surface. Explicit knob
  looks keep their own paint (`tone: outline`, accent or featured cards).
- **Motifs** (`a12702c8`): `tls.m.decoration.shape` gains `orb`, `squiggle`, `star`, `sparkle`,
  `zigzag`, `triangle`, `half-circle` and `frame`.
  - Each motif is one leaf named `shape`, inside the box for any rotation.
  - `orb` is a round rect with a radial gradient lit from the top left (light tint → colour →
    darker rim), at opacity ≥ 0.85. It is a rect because a DOM path cannot take a gradient fill.
  - Star, sparkle and triangle turn freely. Squiggle, zigzag and half-circle snap to quarter turns.
    Frame is four corner brackets.

  `tls.m.pattern.pattern` gains:
  - `grain`: one `image` node whose `url` is a ~1 KB inline SVG `feTurbulence` data URI. Both
    renderers draw the same file; the seed is fixed. The noise sits at ~4–8 % alpha in the text
    colour, so the grain is light on dark slides.
  - `mesh`: three radial `accent` / `accent2` glows, 22 % (soft) or 32 % (medium), fading to clear.
    Their boxes are clamped into the block.

  Both stay `category: decoration`, so both are in `layer: backdrop`. The digest text was trimmed
  so the top-8 detail stays at 11,951.
- **Style master blocks on the page** (`c38b0d48`), the route AC1 "Found" asked for, done without
  touching `DeckViewer.tsx`:
  - `deckSpecToDocument` adds a style master's blocks to each page it applies to as **locked
    shapes**. Shape ids are `style:<page>:<n>` and block ids `style:<name>` (the reserved prefix).
    Their `childIndex` lies in (0, 1), under the content's 1..n.
  - The decompiler drops them, so the round trip stays byte-identical.
  - `renderPageToSvg` skips `resolveMaster` when the page already draws the master's shapes.
  - `analyzeDeck` adds them as free backdrops, which are left out of the pairwise checks and of
    margins and free space.
  - Found while doing this: `analyzeSlide` paired compiled shapes with specs **by index**, but a
    free backdrop is moved under the flow (LO8), so every block after it took the wrong id.
    Shapes now pair by block id first.
  - `gradient` gets `mesh` + `grain` on every master (medium on cover and section, soft on content),
    plus **one `orb` on the section master**, in `image-right`'s free `image` region. The first try
    put it in the cover's lower-right quarter; the shot showed it over the subtitle, so it moved.
- **Chart look** (`e2cb3af5`): `_chart/kit` `chartLook(ctx)`. It adds **no token group** (§6 lists
  none for charts) and reads the approved tokens instead:
  - single and grouped bars round to `radius.sm` (corporate 4, minimal 6, gradient 12), capped at
    30 % of the bar; stacked segments stay square;
  - line weight is 4 / 5 / 7 for a hairline / none / bold `surface.stroke`;
  - gridline weight is 1 on quiet surfaces (`ghost`, `outline`), 3 with `bold`, else 2.

  With no surface the values are the old constants. Gridline *visibility* stays the block's
  `gridlines` knob: hiding gridlines from the style would override an authored value.
- **Fixtures** (`2d2346c3`): `styles/surfaces-glass.json` (gradient + `tokens.surface` glass) and
  `surfaces-hard.json` (corporate + filled / bold / hard) have the same 10 slides: the eight
  card-like blocks, a chart, every motif, mesh and grain. They make the two surfaces no pilot style
  uses visible. The zigzag drew a giant "M" at 3:2 and is now a band of small teeth.
- **Pilot styles** (§3.3):
  - `gradient`: Plus Jakarta Sans headings; filled cards with a hairline edge and shadow 1; mesh +
    grain; an orb.
  - `corporate`: `surfaceAlt` filled cards with shadow 1; bars with radius 4.
  - `minimal`: Be Vietnam Pro headings; surface `ghost`. Its own `cards.tone = outline` knob default
    wins, so the minimal deck's cards stay outlined (see Open).

**Rough.js spike — decision: adopt, together with its first consumer in AC5 (`doodle`).** In a
scratch directory (no repo dependency), `roughjs@4.6.6` (MIT, 8.9 KB gz) passed all three §4.2
conditions:
- `rough.generator()` runs in plain Node;
- with a fixed `seed` the output is byte-identical across runs, and differs for another seed;
- `toPaths()` emits only `M` and `C` commands, which `pathBounds` measures exactly. Its paths, put
  into `path` nodes (rectangle, hachure-filled circle, linear path), **pass the parity probe**
  (a temporary spec, not committed). Coordinates stay inside the shape's box plus its roughness.

It is not installed now because nothing would use it before `doodle`. Rule 6 asks for a named
consumer, and AC5 has one. Plan for AC5: a dependency of `packages/tldraw`, pinned `4.6.6`,
generator only, seed derived from the block id.

**Vocabulary check.** Added only what §6 approves: `DeckTokens.surface`, `rect.shadow`, the eight
decoration values and `grain` / `mesh`. Also added: `ResolvedTokens.surface` (the resolved form of
`DeckTokens.surface`), and the internal helpers `cardPaint`, `cardNodes`, `cardCssFromPoster` and
`chartLook` (§6 names `cardPaint`). `assertParity` gained a test-only `tokens` option. Reserved ids
reuse the existing `style:` prefix.

**Verification.**
- `cli.js` on all 7 `styles/*.json` (corporate, minimal, gradient, knobs, vietnamese,
  surfaces-glass, surfaces-hard): 0 errors, 0 warnings, 0 info; `needsVisualCheck` empty.
- Legacy fixture findings are identical to the AC3 baseline (`git archive`).
- Calibration `--shots` on all 7 decks (66 slides): 165 rows, 0 missing, 0 box deltas > 1,
  **0 line-count mismatches** (html parts 54: 0).
- Text width |abs| p95: **3.0 %** overall, Inter 3.0 %, Be Vietnam Pro 1.2 %, Plus Jakarta Sans
  0.7 %, Vietnamese 1.9 %.
- Shots looked at (DOM): all 66.
- **SVG export looked at.** A scratch exporter (`renderPageToSvg` + `layoutBlock` posters, one id
  prefix per shape) rendered the glass, hard and gradient decks, screenshotted in Chromium with the
  fonts. Glass and hard shadows match the DOM. One exporter caveat, not a product bug: SVG ids
  collide across blocks without a per-shape prefix.
- **LO8 parity chunks**, one at a time: data 27 files (29 probes), composite 29 (66), rest 52 (73).
  All pass, including the new motif, backdrop, card-surface and chart-look probes and the testimonial
  probe that failed in LO8.
- tsc prod 0, spec 329.
- Specs (`--maxWorkers=1`) pass: library (1,040 + 3,102 + 1,204), top-level blocks + layout + styles
  + motion + icons (1,906), state/render (42), ComponentUtil (24).
- Digest: top-8 detail 11,951 / 12,000, tier-1 15,461 / 16,000, full 18,790 / 20,000.
- Sheets (session scratchpad): `sheet6-{knobs,corporate,minimal,gradient,vietnamese,
  surfaces-glass,surfaces-hard}.png` (DOM) and `sheet6-{surfaces-glass,surfaces-hard,
  gradient}-svg.png` (SVG export).

**Open / still weak.**
- `minimal` shows no ghost cards: the style's `cards.tone = outline` knob default is explicit, so it
  wins over the deck surface. That is a style-data decision for the AC5 review, either drop the
  default or keep outlined cards.
- In SVG export the feature-grid poster icons draw small (a glyph about the size of a dot); the DOM
  is right. This predates AC4 (poster icon scaling) and needs its own fix.
- The team example's avatar URLs do not load offline (alt text shows; pre-existing).
- The grain is very faint on light slides; that is by design (4–8 %), but the reviewer may want
  `medium` as the default.
- Hard shadows on adjacent cards sit 8 units from the next card (gap `lg` 32); a tighter grid would
  touch.
- The orb is pseudo-3D through one radial gradient; it reads as a sphere, not a glossy render.
- Master blocks reach the page only through `deckSpecToDocument`. The editor's own
  `Deck.addSlideFromSpec` path does not add them yet.

### Notes — AC4 (lead-review fixes, 2026-10-09)

Five commits after the lead looked at the AC4 sheets, before AC5:
- **`42289c75`** — `Deck.addSlideFromSpec` (the editor's own path) adds the style master shapes
  and the master background, through a `styleMasterPage` helper shared with `deckSpecToDocument`.
  This closes AC4 "Open" (master blocks reached the page only through `deckSpecToDocument`).
  `style-masters.spec` +1 case.
- **`05842baa`** — feature-grid poster icons are scaled to their box. The SVG export drew the
  24-unit glyphs as dots (AC4 "Open"). A spec case pins the glyph to the disc.
- **`b47beded`** — `minimal` drops its `cards.tone = outline` default, so the deck surface paints
  the cards: ghost with a hairline top rule (AC4 "Open", the lead chose the surface).
- **`7ebf37ba`** — image slots never show broken alt text.
  - An avatar without a loadable photo draws an initials disc.
  - A photo gets a tinted backing.
  - The DOM hides an `<img>` that fails to load.
  - Safe raster `data:` URIs resolve in `deck-context`.

  Specs: avatar, image and deck-context cases.
- **`16a1441f`** — pricing gets a roomy tier: bigger type, cards grow to 1.25× their content, and
  the rules are aligned across cards. The pricing recipe joins the region-fill gate (≥ 80 %).
  Size card and digest snapshot regenerated.

### Notes — AC5 (2026-10-10)

**What landed.**
- **Rough.js** (`54894e92`): `roughjs` pinned `4.6.6`, a dependency of `packages/tldraw`, its
  named consumer being `doodle` (AC4 spike decision). Generator only (`rough.generator()`, no
  canvas or DOM). The seed is the decoration's existing `seed` prop (the doodle masters set one
  per motif), so a render is byte-identical every time. It draws `squiggle`, `star` and `sparkle` hand-drawn
  (`tls-m-decoration/rough.ts`). The paths are `M`/`C` only, so `pathBounds` measures them
  exactly. Decoration spec +cases; the parity probes pass.
- **Cards and surfaces** (`2b3213cf`):
  - `cards lead=number` numbers the cards by position when no number is given.
  - agenda (`cards` variant) and pros-cons (`cards` style) adopt `cardPaint`.
- **Seven styles** (`ae190106`, review pass `cd7d9ef5`). Data in `blocks/styles/<id>.ts`, each
  with one fixture deck `__fixtures__/styles/<id>.json`. All decks share the same slides; only
  the id, title, theme and style differ, and `styles.spec` enforces that.

  Master motifs in margins and corners are built by `styles/_place.ts`:
  - nested `tls.l.split`s cut the frame down to the wanted box;
  - `tls.l.spacer` fills the empty panels;
  - `tls.l.field` makes the colour bands (`band(role)`).

  This adds no new vocabulary, and the report, both renderers and the parity probe see ordinary
  blocks.

| Style | Palettes | Heading / body | Surface | Masters, motifs |
|---|---|---|---|---|
| `luxury` | `luxury-noir` #0E0E10 / gold #C8A96A; `luxury-ivory` #F7F3EC / #9A7B4F | Playfair Display / Inter | outline, hairline, shadow 0 | thin gold frame on every slide (double on cover and closing) over a radial vignette; a large soft gold `ring` in the section's empty half; slow fades |
| `editorial` | `ivory-editorial` (existing), `editorial-ink` #FAF8F3 / red #C1272D / navy | Fraunces / Inter | ghost, bold → ink top rule | masthead (heavy ink rule over a hairline) and a folio rule on every page, a red accent bar on cover and section; giant numerals on cards; red pull-quote marks; one giant flush-left closing line |
| `glass` | `glass-violet` #4C1D95→#1E3A8A gradient; `glass-pastel` #E0E7FF→#FCE7F3 | Plus Jakarta Sans / Inter | glass, hairline, shadow 1 | linear gradient + `mesh` (medium) + `grain`; lit `orb`s: three on the cover, one big one in the section's empty half, two small ones in the content margin corners |
| `swiss` | `swiss-red` #F4F4F0 / #E3000F; `swiss-blue` #FFFFFF / #0047BB | Archivo / Archivo | ghost, bold → black top rule | visible 12-column hairline grid; heavy top rule; red square at the grid's top right; red block in the lower-right quarter of cover and closing; red bar at the section's left edge; flush left everywhere |
| `doodle` | `doodle-paper` #FFFDF6 / #FF7A59 / #3DB8A6; `doodle-kids` #FFF8E7 / #EE4266 / #3BCEAC | Patrick Hand / Nunito | filled, bold ink stroke, shadow 0 | Rough.js stars, sparkles and squiggles in the margins (seeded); a big star in the section's empty half; short pops |
| `memphis` | `memphis-pop` #FFF6E9 / #FF4F79 / #2EC4B6 (+ #FFC93C, #3A86FF) | Bricolage Grotesque / Nunito | filled, bold stroke, **hard** shadow | zigzag bands, triangles, half circles, dot patches, squiggles, yellow squares in margins and empty halves; pink section page with opaque shapes; scale pop-ins |
| `consulting` | `consulting-ink` #FFFFFF / navy #00205B / teal #2BB3A3 | Source Serif 4 / Inter | outline, hairline, shadow 0 | content: navy tracker tab, hairline under the title band, footer rule; cover and closing: navy spine with a teal hairline on a light page; section: navy page with a teal edge, `field` divider in white; static |

Fonts:
- All eight heading/body families are OFL-1.1 and ship a `vietnamese` subset. They were checked
  from the fontsource package metadata in AC3 (Notes — AC3): Playfair Display, Fraunces, Plus
  Jakarta Sans, Archivo, Patrick Hand, Nunito, Bricolage Grotesque and Source Serif 4. Inter is
  OFL too.
- The width tables are the AC3 ones. AC5 adds no font.

Specs:
- **Contrast spec**: every palette passes text ≥ 4.5:1 on background and surface.
- **Per-style tier-1 size-card spec** (§3.5): every tier-1 example still fits its `size.min`
  under every style and palette.

**Review fixes (this session, one commit each), found by looking at the 100 shots:**
- **`85a4f6e5` icons**: the original ten icons were filled Material/Tabler shapes or hand-made
  paths that the outline renderers stroke.
  - `users` drew a garbled glyph in every deck's cards and bento.
  - `clock`, `zap`, `shield` and `trending-up`/`trending-down` were also wrong.
  - `check`, `arrow-right`, `globe` and `alert` drew doubled outlines.

  All ten are now Lucide outlines. No snapshot held their paths.
- **`b98ec121` pros-cons**: the per-row budget gave every point the same allowance of lines.
  "Their sales team brings 400 mid-market accounts" was ellipsised in five decks (luxury,
  editorial, gradient, glass, consulting) while the short points left room. A point now gets more
  lines whenever both measured lists still fit the body height.
- **`f1fc702b` glass**: the content master's 210-unit orb at the lower right sat under the
  bottom-right card's text. The cards are translucent, so "Linh Pham, COO" was printed over a
  bright pink orb. Both content orbs now sit in the corner margins (148 and 120 units) and overlap
  the content box by at most a corner's padding.
- **`c7bc8e7a` consulting section**: the `minimal` divider solved its title to a pale blue on the
  navy page and dropped the number. The default is now `field`, which sets a white "01" and a
  white title.
- Tried and reverted: action-title wording in the consulting fixture. `styles.spec` requires every
  style deck to carry the same content, so the consulting deck shows the style and not the
  action-title rule. That rule lives in the style card and the critic (AC7).

**Verification (2026-10-10).**
- `cli.js` on all 14 `styles/*.json`: 0 errors, 0 warnings, 0 info, `needsVisualCheck` empty.
  - The ten style decks have 10 slides each (8 canonical + bento + image-full).
  - The other four decks: knobs 18, vietnamese 4, surfaces-glass 10, surfaces-hard 10.
- **Calibration** `--shots` on the ten style decks: one Chromium run, 100 slides, 529 blocks.
  - Painted height, table vs DOM: median 0.0 %, p95 0.5 % (4.0 units), 0 blocks > 5 %.
  - **0 line-count mismatches** (table lines ≠ browser wrap: 0 of 695 leaves); there are no html
    parts in these decks.
  - Text-width |abs| p95: **2.5 % overall**. By family:

    | Family | p95 |
    |---|---|
    | Inter | 3.0 % |
    | Playfair Display | 1.0 % |
    | Be Vietnam Pro | 0.6 % |
    | Fraunces | 0.9 % |
    | Plus Jakarta Sans | 0.8 % |
    | Archivo | 2.7 % |
    | Nunito | 2.5 % |
    | **Patrick Hand** | **0.5 %** (budget 5 %) |
    | Bricolage Grotesque | 0.6 % |
    | Source Serif 4 | 1.0 % |

  - 15 rendered lines run 1–3 % past their box: the cover and closing contact line in Inter.
    These are invisible, as in LO5.
- **Shots looked at**: all 100, before and after the fixes.
- **LO8 parity chunks**, one at a time, all pass:
  - data: 27 files, 29 probes;
  - composite: 31 files, 68 probes, incl. bento and image-full;
  - rest: 50 files, 70 probes, incl. the Rough.js motifs, image/avatar fallbacks, `parity.spec`
    and `shadow.spec`.
- **tsc**: prod 0, spec 329.
- **jest** (`--maxWorkers=1`), all passing:
  - styles (contrast, per-style size cards, masters), recipes, capability-digest,
    catalog-conformance, layout-report, layout-calibration, block-metrics, slide-composition,
    slide-layouts, demo-deck-*, block-library-tour, surface, deck-context, deck-document, icons,
    and the touched blocks: 32 suites, 2,653 tests.
  - library, non-parity: data 660, composite 1,074, rest 3,535.
- **Size cards** regenerated: `gen-block-metrics.js` reproduces the committed file (131 blocks,
  no drift).
- **Digest**:

  | Measure | Size / budget |
  |---|---|
  | top-8 detail | 11,951 / 12,000 |
  | tier-1 index | **15,944 / 16,000** |
  | full index | 18,958 / 20,000 |

  Tier-1 per style: 15,145 (glass) – 15,981 (doodle).
- **Sheets** (session scratchpad):
  - `sheet7-<style>.png` for all ten styles: 8 canonical slides, 4×2, 720-px tiles;
  - `sheet7-ac6.png`: bento + image-full × 10 styles.

**Open / still weak (for the board review).**
- The tier-1 index has only 56 chars of headroom; the next tier-1 line needs a trim first.
- The glass bottom-right orb still touches a corner of a bottom-right card, in its padding and
  not under its text. Glass has no real backdrop blur on layout cards; the blur is DOM-only in
  html blocks.
- The consulting fixture cannot show action titles (shared-content rule above). Its `field`
  divider draws the card's hairline as an inset frame on the navy page; it reads as intentional,
  but the reviewer may want it gone.
- The doodle cover title wraps "Growing beyond one / product" (an orphan word); so do corporate
  and consulting. There is no balanced-wrap rule for display titles yet.
- The quote slides in every style are a single line pair in the middle of an empty page. Correct,
  but sparse; a style-level quote treatment (giant mark, rule) is a candidate follow-up.
- Rough.js motifs are hand-drawn outlines with a solid fill; at slide scale the roughness is
  subtle.
- `doodle-kids`, `luxury-ivory`, `swiss-blue` and `glass-pastel` have contrast specs but no
  fixture deck. Only the default palette of each style was looked at.

### Notes — AC6 (2026-10-10)

**What landed** (`9af1766f`, finish `fd6e0116`).
- **`tls.c.bento`**:
  - slide scope, `category: list`, tier 1, `looks: ['pattern']`;
  - patterns `1+2`, `2+1`, `hero+3`, `3+2`; a pattern with more slots than tiles falls back to
    one that fits, and extra tiles are dropped;
  - tile kinds `stat`, `point` (icon, title, text), `image` and `quote`;
  - the first stat tile is the accent anchor, with its number set up to 2× display;
  - other tiles take the deck surface through `cardPaint`.

  The finish commit:
  - scales the point icon disc with the tile (56–112 units, 26 % of the short side; it was
    48–88, 20 %);
  - keeps a gap under the stat number of 10 % of its size, because Playfair's old-style
    descending "4" touched the label in luxury.
- **`tls.c.image-full`**:
  - slide scope, `category: media`, tier 1, `looks: ['panel', 'scrim']`;
  - the photo covers the box under a scrim and an opaque headline panel (`bottom-left`, `left`
    or `center`) with kicker, title and text.
- **`full-bleed` layout**: one `content` region over the whole frame. It closes S13 for
  `image-full` and `quote-image`.
- **Recipes**: `content-bento` (timeline + title) and `quote-image-full` (`full-bleed`).
  `recipes.spec` passes: every recipe compiles clean and the fill gate holds.
- **Digest lines**:

  ```
  tls.c.bento · list · slide · 3–5 items — Asymmetric tile grid: a big stat, icon points, a photo, a quote [h=fill] knobs: pattern
  tls.c.image-full · media · slide — Full-slide photo with a headline panel [h=fill] knobs: panel, scrim
  ```

  The tier-1 index was trimmed to stay within 16k: style lines are grouped one per family, and
  some recipe `when` texts are shorter.
- **Size cards**: bento preferred 1728×760, min 1200×560; image-full preferred 1920×1080, min
  960×540. Both are `fill`, confidence high.
- **Catalog**: `EXPECTED_BLOCK_COUNT` is 131, and the conformance gate passes.
- **Decks**: both blocks are in all ten style decks (`st_09` bento, `st_10` image-full on
  `full-bleed`).

**Done-when check.**

| Check | Result |
|---|---|
| Catalog count | 131 ✅ |
| Standard suite (both) | ✅ |
| Parity probes (in the composite chunk) | ✅ |
| Fit at min | bento: every pattern at preferred and min size, contained, no text overlap; image-full: every panel at `size.min` ✅ |
| In at least three style decks | in all 10 ✅ |
| Clean reports | 0 / 0 / 0 ✅ |
| Shots looked at | 20 (`sheet7-ac6.png`) ✅ |

Bento and image-full specs: 42 tests.

**Open.**
- The bento point tile leaves an empty band between the icon and the bottom-anchored title in a
  tall tile. That is by design (text at the foot), but a `hero+3` with short points looks airy.
- The image-full panel is the same composition in every style; only the paint changes. A
  style-level panel default (e.g. `left` for editorial) is a candidate `blockDefaults` entry.
- The fixture photo is a small blurred data-URI JPEG (dusk skyline). A sharp, busy photo has not
  been looked at under the scrim.

### Notes — AC7 (2026-10-10)

**Built.**
- `packages/tldraw/src/blocks/pipeline/dryRun.ts`: the pure logic (no DOM, no Chromium). Exported from
  `blocks/index.ts`: `runDryRun`, `runStyle`, `eligibleRecipes`, `fillSlide`, `shortenHeadline`,
  `measurePrompt`, `DRY_RUN_OUTLINE`, `PROMPT_BUDGET`.
- `tools/layout-report/dry-run.js`: the CLI, loaded through `load.js` like `cli.js`.
  `node tools/layout-report/dry-run.js [--out DIR] [--style id,id] [--json] [--dist]`; exit 1 when any
  deck has errors. Decks go to `tools/layout-report/__dryrun__/` (git-ignored by explicit path).
- `packages/tldraw/src/blocks/dry-run.spec.ts` (next to `recipes.spec.ts`): corporate and doodle, 0
  errors and 0 warnings, no recipe twice in a row, the per-role prompt <= 16,000, a forced repair.
- Docs: LLM-ARCHITECTURE (S0 style pick, S2a style-aware input with real excerpts and the budget
  table, S2b "this style sets", S3 per-style size cards, S4.1 reference implementation, §5.2 per-style
  rubric, §9 data shapes); `guides/blocks-authoring.md` §2.11 "Adding a deck style".

**How the loop works.**
- Outline: 12 fixed `{role, headline, keyMessage}` entries (cover, agenda, section, content, data,
  comparison, process, people, data, quote, content, closing) about expanding a SaaS analytics
  product to mid-market teams.
- Pick (S2a stand-in): `eligibleRecipes(role, style)` = `recipesFor(role)` minus any recipe that
  uses a type in `style.avoid`, an editor-only guide (`AI_HIDDEN_TYPES`) or a non-tier-1 block. Then
  rotate: index = (n-th slide of this role + the style's index) mod eligible, and never the previous
  slide's recipe if another exists.
- Fill (S3 stand-in): `recipeSlide` from the examples, block ids prefixed with the slide id (the
  validator needs deck-unique ids), the headline written into the title slot: `tls.t.title.text`,
  `tls.c.hero|cover|kinetic-title|divider|closing|image-text|image-full .title`,
  `tls.t.statement.text`. The theme is `style.palettes[0]`.
- Oracle (S4.1 stand-in): `analyzeDeck` per slide (so style tokens, knob defaults and masters apply),
  then once on the whole deck plus `validateDeckSpec`; both count. Up to 3 repair rounds: next
  eligible recipe, then a shorter headline (first ~60 % of the words), then the next recipe again;
  the cleanest variant wins.

**Result (re-run: `node tools/layout-report/dry-run.js`).** Every style: 12 slides, 12 different
recipes, 0 repairs, 0 errors, 0 warnings, `needsVisualCheck` 0.

| Style | Slides | Distinct recipes | Repairs | Errors | Warnings | needsVisualCheck | Example text kept |
|---|---|---|---|---|---|---|---|
| corporate | 12 | 12 | 0 | 0 | 0 | 0 | 1 |
| minimal | 12 | 12 | 0 | 0 | 0 | 0 | 2 |
| gradient | 12 | 12 | 0 | 0 | 0 | 0 | 1 |
| luxury | 12 | 12 | 0 | 0 | 0 | 0 | 1 |
| editorial | 12 | 12 | 0 | 0 | 0 | 0 | 1 |
| glass | 12 | 12 | 0 | 0 | 0 | 0 | 0 |
| swiss | 12 | 12 | 0 | 0 | 0 | 0 | 1 |
| doodle | 12 | 12 | 0 | 0 | 0 | 0 | 2 |
| memphis | 12 | 12 | 0 | 0 | 0 | 0 | 0 |
| consulting | 12 | 12 | 0 | 0 | 0 | 0 | 1 |

"Example text kept" = slides where no title slot took the headline (recipes with no title block:
`people-testimonial`, `data-big-stat`, `quote-pull`). `cli.js` on a generated deck agrees (0 errors,
0 warnings, `needsVisualCheck` empty; checked on doodle and consulting).

**Repairs needed: none** on the fixed outline, so the repair path is exercised only by the spec (a
60-word headline on slide 4 forces it). Before that, the first run had 17-22 *validator* errors per
deck, all `block/duplicate-id`: `recipeSlide` gives each slide the ids `b1`, `b2`; the filler now
prefixes them with the slide id. That was the filler, not the oracle.

**S2a prompt, measured against §5.2** (chars; tier-1 index with `{ style }` + `styleCard`; "header" =
index preamble + its one-line `## Styles` section; recipes = all 10 roles):

| Style | Header (~1.2k) | Card (<=1.2k) | Recipes (<=3k) | Tier-1 (~7k) | Tier-2 (<=1.5k) | Icons (~1.3k) | Total (<=16k) | Total, own role only |
|---|---|---|---|---|---|---|---|---|
| corporate | 2,486 | 956 | 3,961 | 6,983 | 1,369 | 796 | 16,551 | 13,525 |
| minimal | 2,444 | 928 | 3,961 | 6,826 | 1,386 | 796 | 16,341 | 13,315 |
| gradient | 2,431 | 897 | 4,055 | 7,283 | 1,352 | 796 | 16,814 | 13,694 |
| luxury | 2,491 | 985 | 3,961 | 6,996 | 1,345 | 796 | 16,574 | 13,548 |
| editorial | 2,499 | 1,091 | 3,961 | 7,120 | 1,360 | 796 | 16,827 | 13,801 |
| glass | 2,496 | 1,073 | 3,819 | 6,649 | 1,386 | 796 | 16,219 | 13,335 |
| swiss | 2,503 | 1,096 | 3,961 | 6,826 | 1,389 | 796 | 16,571 | 13,545 |
| doodle | 2,430 | 1,118 | 3,948 | 7,493 | 1,315 | 796 | 17,100 | 14,087 |
| memphis | 2,481 | 1,080 | 3,819 | 6,806 | 1,389 | 796 | 16,371 | 13,487 |
| consulting | 2,475 | 1,087 | 3,961 | 7,364 | 1,336 | 796 | 17,019 | 13,993 |

- Within target: card, tier-2, icons. Over: header (about 2x; the layer, size and motion lines were
  added after the target), recipes with all roles (3.8-4.1k; one role is 935), tier-1 for four styles.
- **Total with all roles: 16,219-17,100, over 16k by 219-1,100.** The tier-1 index alone is
  <= 15,981 (the AC5 figure); the style card on top is what tips it. With only the slide's own role's
  recipes (`roles: [role]`, `content` is the largest at 935) the total is 13,315-14,087. The spec
  asserts that per-role figure; the all-roles overshoot is reported, not hidden.

**Judgment calls.**
- `SlideRecipe` has no `styles` field (the AC plan §5.1 sketched one); eligibility uses the style's
  `avoid` list and tier-1 only.
- `capabilityIndexData` has no `styles` / `recipes` arrays (plan §5.2 sketched them); the docs say the
  backend reads `BUILT_IN_STYLES`, `RECIPES`, `styleCard` from the package instead. Not built: adding
  them was not in the AC7 brief and would change the digest.
- Style card column = `styleCard()` alone; the index's own `## Styles` line (the chosen style's brief
  and rules again, about 400 chars) is counted in the header.
- Rotation offset by the style's position, so the ten decks do not all use the same recipes; still
  deterministic.
- The quote slide keeps the example quote (and its attribution) in `quote-pull`; a headline is not a
  quote, so there is no safe slot.

**Open.**
- The all-roles S2a prompt is over 16k (above). Either send per-role recipes (documented as the
  backend rule), or trim the header: the layer, size and motion lines are ~1.1k together. Not changed
  here (digest content is out of AC7's scope).
- Style `prefer` lists only promote tier-2 types; the picker does not use them (no recipe names a
  tier-2 type), so e.g. `consulting`'s `tls.g.swot` never appears in the dry run.
- AC5 stays "awaiting user review" (the style board); not closed by this phase.
- No browser pass: the dry-run decks were not rendered (Chromium was out of scope). To look at one, copy
  it under `__fixtures__/styles/` and use `run.js --decks`.

### Notes — AC8 (2026-10-10)

The phase is written up in [§8](#8-ac8--variety): audit before/after (§8.2, §8.5), what was built
(§8.5), vocabulary (§8.6), decisions (§8.7) and the done-when check (§8.8). Open items for the next
session:
- consulting `section-title` (tls.t.title on the navy section page) solves its ink to a pale blue
  and reads weak; the `field` divider recipe is the good consulting section. A style-level
  exclusion of a recipe, or a title ink rule on a dark master, would fix it. Pre-existing (AC7 dry
  run), more visible now that the picker rotates.
- gradient seed-1 dry-run deck: the `cover-split-image/bleed` title has one line-count over-count
  (table 3 lines, browser 2; "Expanding Pulse analytics" sits 0.5 % over the 1,100 box). Safe side,
  not in a fixture; fixtures and showcases have 0 mismatches.
- logo walls show empty plates in the harness (logo URLs do not load offline); the showcases steer
  the people slide away from the logo wall through `avoidSignatures`.
- `content-bento` has no variants: its patterns need a tile count the example does not have
  (`1+2`, `2+1` drop tiles → `capacity/exceeded`); the LLM picks the pattern by tile count.
- testimonial `photo`, `people-team` card variants and `process-timeline` straight were removed as
  recipe variants (placeholder photo, or < 50 % region fill); the knobs stay for the LLM.
- `agenda-image` (numbered bullets beside a big photo) reads thin with the example's three short
  items; it now appears more often (its `mirror` variant).

### Notes — AC8.5 (2026-10-10)

Written up in [§8.9](#89-ac85--quality-pass-on-the-variety-decks). Open items:
- `data-stat-spotlight` (12 of 360 dry-run slides) still reads a little thin: a ring, one label and
  two small stats in a 1728-wide region. It passes the gate (fill ≥ 50 %); a roomy tier for its
  stats column is the next fix.
- `data-big-stat/split` (3 slides): the label beside a 300-unit number is lead size and reads small.
- `tls-c-hero.spec` "center centres the lines…" fails: the kicker's box carries the AC8 6 % wrap
  slack (`alignText`, `2b7e1337`), so the box midpoint is 9 units right of centre while the text is
  centred. Pre-existing since AC8 (not in AC8's spec list); not changed here.
- Variety after the gate and the asset filter: min 75 % of slides differ between seeds (swiss),
  was 92 %. Still above the 70 % bar; the gate rejects the sparse designs that made up some of the
  variety (statement `lg`, image-text `top`, section-title on most styles).
- `section-title` almost never survives the gate (a title alone on the section page covers 4–9 %
  of it); it stays as a recipe for the LLM and as a fallback.

### Notes — AC8.6 (2026-10-10)

Written up in [§8.10](#810-ac86--small-polish-pass). Open items:
- `section-title` passes the gate only when its headline takes display type in the 1200-unit
  column (`size: fit`). With the dry-run headline ("Why mid-market, why now") that is 6 of 10
  styles; in gradient, editorial, swiss and memphis (wide display faces, 160–176 units) "Why
  mid-market," does not fit 1200 at display, `fit` steps to title, the slide paints 14–15 % and the
  gate moves on to a divider (honest; no threshold changed). A display rung between display and
  title (e.g. display × 0.9) would let those styles keep it; not built.
- The five showcase fixtures were not regenerated: `showcase-consulting` sc_03 is still the old
  `section` layout title (now white ink, still thin). Regenerate the showcases with the picker when
  their content is next touched.
- Re-check of the AC5 board `fix` items: `image-full` panel variants differ per style (surface,
  ink, face; glass blue panels, luxury dark panels, memphis white cards with ink outline) —
  nothing broken (`sheet-image-full.png`). `showcase-consulting` action titles render well on all
  twelve slides (`sheet-showcase-consulting.png`); sc_04 (bullets beside a photo) and sc_03
  (section) are pre-AC8.5 designs that read thin, not defects.
- The tier-1 index is at 16,994 of 17,000 chars; the next LLM-visible addition must pay for itself.
- The digest header lost a few words to pay for this phase (§8.10); meaning unchanged.

---

## 8. AC8 — Variety

**Date:** 2026-10-10 · **Against commit:** `3aece1ec` (AC7 done).

**Goal (product owner, translated).** "Many styles so the AI picks blocks on its own, but users must
not see slides that look too much like the old ones: many more block variants, or make it easy for
the AI to customise by itself." Concretely:
1. two decks with the same style and similar content must not look like clones;
2. inside one deck, slides of the same role must not repeat a look;
3. the LLM gets a cheap, safe way to vary a block: knobs, variants and layout options set by name,
   checked by the oracle, never free-form CSS.

The lead's board review of the ten styles (two `fix`, eight `ok`) is folded in: `image-full` panel
variants, quote-family variants, consulting action titles without weakening `styles.spec`, fewer
glass orbs, and showcases for the palettes never shown (`doodle-kids`, `luxury-ivory`,
`swiss-blue`, `glass-pastel`).

### 8.1 Definitions

- **Look signature** of a slide: its layout id, then per region (in order) each block's type with
  the *resolved* value of every look knob (`BlockDefinition.looks`): authored prop, else the style's
  `blockDefaults`, else the block's `defaults`. Example:
  `timeline|title:tls.t.title{size=title,align=start,rule=false};timeline:tls.c.cards{lead=icon,tone=alt,align=start,numeral=plain}`.
  Content never enters the signature, so two slides with the same signature are the same design
  with other words.
- **Reachable looks** of a role: the sum over its recipes of the product of the option counts of the
  look knobs the recipe leaves open (an upper bound on what an LLM could set by hand).
- **Used looks**: distinct signatures the dry-run picker actually emits.

### 8.2 Audit — before (HEAD `3aece1ec`, numbers from the AC7 dry run, 10 styles × 12 slides)

Script: session scratchpad `audit.js` (loads the oracle with `tools/layout-report/load.js`).

**A. Per role.** The picker uses one look per recipe; thousands are reachable but never reached.

| Role | Recipes | Block types | Reachable looks | Used looks (10 decks) |
|---|---|---|---|---|
| cover | 3 | 3 | 112 | 3 |
| agenda | 2 | 4 | 336 | 4 |
| section | 2 | 2 | 30 | 2 |
| content | 7 | 9 | 4,035 | 8 |
| data | 6 | 9 | 8,256 | 8 |
| comparison | 6 | 8 | 2,328 | 7 |
| process | 4 | 6 | 1,008 | 5 |
| people | 3 | 4 | 866 | 3 |
| quote | 3 | 3 | 45 | 3 |
| closing | 2 | 1 | 8 | 1 |

**B. Repetition in the dry run.**

| Measure | Before |
|---|---|
| Seeds | none: the picker is a pure function of (style, outline), so a second deck of the same style and outline is a **clone (0 % of slides differ)** |
| Same recipe at the same slide position, over the 45 style pairs (540 positions) | 130 (24.1 %) |
| Same resolved signature at the same position, over the 45 style pairs | 138 (25.6 %) — style knob defaults barely separate decks |
| Repeated signature inside one deck | 0 (rotation by role, but only because each role has ≤ 2 slides in the outline) |
| Closing slides | 1 look across all ten styles (`tls.c.closing`, centred in 8 styles) |

**C. Tier-1 blocks: look options against use** (combos = product of look-knob options; picks = in
the ten dry-run decks; sorted by picks).

| Block | Look knobs | Combos | In recipes | Dry-run picks | Note |
|---|---|---|---|---|---|
| `tls.t.title` | 3 | 24 | 25 | 73 | on every titled slide; one treatment per style |
| `tls.t.takeaway` | 2 | 8 | 6 | 15 | |
| `tls.m.image` | 1 | 2 | 3 | 11 | |
| `tls.c.closing` | 2 | 6 | 2 | 10 | pinned to one variant by 9 styles |
| `tls.t.bullets` | 2 | 20 | 2 | 9 | |
| `tls.t.statement` | 4 | 36 | 2 | 7 | |
| `tls.c.kpi-row` / `agenda` / `divider` | 2 | 12 / 6 / 6 | 1 | 5 | divider pinned by every style |
| `tls.t.quote` | 1 | **3** | 1 | 4 | knob-poor; the sparse quote slides of the review |
| `tls.c.cover` | 4 | 48 | 1 | 4 | pinned to `centered` by 9 styles |
| `tls.c.stat-spotlight` | 2 | 4 | 1 | 4 | |
| `tls.c.comparison` | 1 | **3** | 1 | 3 | |
| `tls.c.steps` | 1 | **2** | 1 | 3 | |
| `tls.c.testimonial` | 1 | **2** | 1 | 3 | |
| `tls.c.bento` | 1 | 4 | 1 | 3 | |
| `tls.c.image-full` | 2 | **6** | 1 | 3 | the same panel in every style (review) |
| 8 tier-1 blocks (`body`, `donut`, `line`, `grouped-bar`, `tree`, `pyramid`, `image-grid`, `decoration`) | | | 0 | 0 | no recipe reaches them |

**Reading.** The library is not short of looks; the *pipeline* collapses them. Three causes, in order
of weight: (1) the picker has no seed, so equal inputs give equal decks; (2) a recipe is one fixed
knob set, so a role with three recipes has three looks; (3) style `blockDefaults` pin the knobs that
would vary most (cover, divider, closing, quote) to one value per style. Knob-poor blocks (quote,
image-full, comparison, testimonial) matter on the slides where the review saw sameness.

### 8.3 Plan (ranked by repetition removed per unit of work)

| Rank | What | Why |
|---|---|---|
| 1 | **Variety picker**: per-deck `seed`, look signature, no repeated signature in a deck where an alternative exists, rotation over the role's recipe looks deterministic from the seed, `avoidSignatures` input for the backend | cause (1); turns reachable looks into used ones; no pixel risk |
| 2 | **Recipe looks**: each recipe gets named `looks` (knob sets, a mirrored layout or swapped regions), every one clean and balanced under `recipes.spec` | cause (2); one recipe, several designs, all oracle-checked |
| 3 | **Style `variety`**: per style, the knob values it accepts beyond its pinned defaults; the picker only rotates inside them | cause (3) without losing a style's identity |
| 4 | **Quote family**: `tls.t.quote` variants (big type, card, side rule, with image) | review item; quote was 3 combos |
| 5 | **`image-full` panels**: more positions, gradient scrim, framed, split | review item |
| 6 | **Deck-level title treatment** chosen once per deck from the seed (inside the style's allowance) | title is on 60 % of slides; consistent inside a deck, different across decks |
| 7 | **Digest**: knob *values* in the tier-1 lines, recipe looks in recipe lines, a style `Vary:` line; header trimmed to pay for it | the LLM customises by name |
| 8 | **Validator**: an unknown knob value is an error with the nearest valid value | safe customisation |
| 9 | Glass orbs, palette showcases, consulting action-title showcase | review items |

New blocks: none planned; every gap above closes with knobs (decision revisited in §8.6 if a gap
remains).

### 8.4 Done when

- The dry run runs N = 3 seeds × 10 styles; every deck has 0 errors and 0 warnings.
- Inside each deck no look signature repeats for a role that has an alternative.
- Across the 3 seeds of one style ≥ 70 % of slides differ in signature (before/after reported).
- `cli.js` is clean on every `__fixtures__/styles/*.json` and the new showcase decks.
- Calibration `--shots` on new or changed decks: 0 line-count mismatches; LO8 parity chunks pass
  for renderer changes; every shot looked at.
- tsc prod 0, spec ≤ 329; targeted jest passes (touched blocks, recipes, digest,
  catalog-conformance, layout-report, block-metrics with regenerated size cards, styles,
  slide-composition, dry-run, demo-deck-*, block-library-tour).
- Digest budgets held, or the decision recorded.

### 8.5 What was built, and the numbers after

**Variety picker** (`packages/tldraw/src/blocks/pipeline/variety.ts`, exported from `blocks/index.ts`):
`lookSignature`, `blockLook`, `lookCandidates`, `pickOrder`, `deckLook`, `applyDeckLook`,
`knobAllowed`, `styleAllows`, `seedStride`, `hashString`. The dry run (`pipeline/dryRun.ts`) uses it:
`runStyle(style, i, { seed, avoidSignatures, theme, outline })`, `runVariety(styles, { seeds,
chainAvoid })`, `signatureDiffer`. CLI: `node tools/layout-report/dry-run.js [--seeds 1,2,3]
[--chain]` prints a variety table and writes `<style>-s<seed>.json`; exit 1 on any error or warning.
Documented in LLM-ARCHITECTURE S2a "Variety (AC8)".

**Recipe variants** (`SlideRecipe.variants`, `recipeSlide(recipe, reg, variant?, style?)`,
`findVariant`, `variantIds`, `BASE_VARIANT`): 70 named designs over 32 of 38 recipes.

| Role | Designs (recipe/look) |
|---|---|
| cover | hero: base, center, split · cover-split-image: base, bleed · kinetic: base, accent, start |
| agenda | agenda-full: base, cards, badge, cards-badge · agenda-image: base, mirror |
| section | divider: base, numeral, field, minimal, center · section-title |
| content | bento · statement (xl): base, center, underline, accent, lg · bullets-image: base, mirror, chevron · cards: base, numbers, giant, accent, outline, center · feature-grid: base, circle, center · icon-list-image: base, mirror (image-right) · image-text: base, right, top |
| data | chart-insight: base, left, below, wide · stat-spotlight: base, side, plain · big-stat: base, accent, split · kpi-row: base, bar, plain · table: base, head · bar-takeaway: base, mirror, horizontal |
| comparison | options: base, cards · pros-cons: base, cards, columns · before-after: base, chevron, even · pricing: base, outline, filled · matrix: base, lines · compare-table |
| process | steps · chevrons: base, single, series, inside · timeline: base, numbers · roadmap: base, plain |
| people | team · testimonial · logo-wall: base, plates, dividers |
| quote | quote-pull (big): base, card, side, image · image-full: base, split, band, fade, fade-left, framed, framed-split · statement (xl): base, center, underline |
| closing | closing-centered: base, link, big-type · closing-split: base, link |

`recipes.spec`: every variant names a real layout and real knob values, validates, reports 0 errors /
0 warnings, is balanced (no `region/empty`, no `layout/unbalanced`), has a signature of its own
(differs from the base under at least one style), and the region-filling recipes' variants fill
≥ 50 % of their region (three variants that did not were removed).

**Block variants** (new knob values; each at `size.preferred` and `size.min`, plus a parity probe):

| Block | New | Look |
|---|---|---|
| `tls.t.quote` | `variant: classic \| big \| card \| side \| image`, `image`, `alt` | big: display/title type under a large mark, name bold + role; card: deck-surface card, mark, hairline, initials disc + name/role; side: full-height accent bar, title-size quote; image: photo panel (40 %) beside the quote (narrower than 720 → side). Type ladders with line caps and a balanced wrap (no orphan word). `classic` is the old layout, byte-identical. |
| `tls.c.image-full` | `panel: … \| right \| split \| band`, `scrim: … \| gradient`, `frame` | split: photo 56 % + solid panel beside; band: strip across the foot, headline left, text right; gradient: no card, dark fade from the text side, white ink; frame: photo inset with rounded corners. AC6 looks unchanged. |

**Style `variety`** (`DeckStyle.variety`, all ten styles): the alternatives each style accepts for
knobs it pins (cover, divider, cards, chart-insight, closing, big-stat, kpi-row, pros-cons) and the
deck-level title treatment (`tls.t.title` align/rule). Checked against the masters in the shots:
swiss keeps flush-left heroes and feature grids, doodle drops `big-type` closings (the cover star),
glass/gradient `bleed` covers now read (see fixes).

**Digest**: tier-1 lines carry knob values (`knobs: variant=classic|split|gradient-sweep,
align=start|center, decoration=none|rule`; a bare name is a toggle) from
`CapabilityIndexEntry.lookValues` (`knobHint`); recipe lines end `· looks: a|b` and imply the main
region's name; the header is compact (2.43–2.50k → 1.15–1.18k); with `{ style }` the Styles line
points to the style card; the card's knob line merges defaults and alternatives
(`c.closing(variant=centered|split)`: first = the style's). `looks` lost content toggles (`show*`,
big-stat `format`, image-grid `gap`/`radius`) and gained quote `variant`, image-full `frame`.

**Validator**: a look knob outside its enum (any type) is `slot/invalid-enum` **error** with the
nearest value as `suggestion`; a non-boolean on a look toggle is `slot/invalid-boolean` error.
Non-look enums keep the old string-only warning (structural slots take raw numbers, e.g. `gap: 12`).

**Fixes found in the sheets**: the dry-run filler copied each example's look knobs over the style
(`markStyle: glyph` on corporate, the split closing example in `closing-centered`) — `recipeSlide`
with a style now drops an example knob the style sets, and `closing-centered` spells out `centered`;
`tls.l.card` treats a non-neutral role surface (`scrim`, `accent`) as explicit (a cover-bleed scrim
took glass's light paint, white text on a light wash on glass-pastel); `tls.c.closing` split panel
hugs its person and contacts (was a tall empty card); `alignText` keeps 6 % slack on centred labels
≤ 24 px (headless pixel rounding wrapped `lan.tran@example.edu`); the gradient and glass section orbs
moved to x ≥ 1290 (long section titles ran into them); glass content master one orb, soft mesh; the
ten style decks' quote slide uses `variant: big` (same content in all ten, `styles.spec` holds).

**Showcases** (`__fixtures__/styles/showcase-*.json`, generated by the picker, seed 4/5, photos
inlined): `doodle-kids`, `luxury-ivory`, `swiss-blue`, `glass-pastel`, and `showcase-consulting` with
twelve action titles ("Mid-market pipeline tripled in two quarters without new spend") — a separate
deck, so `styles.spec`'s shared-content rule is untouched. `styles.spec` checks each reports clean
and the consulting titles are sentences.

**Audit after** (dry run, 3 seeds × 10 styles):

| Role | Designs | Used looks, seed 1 (10 decks) — before | Used looks, 30 decks |
|---|---|---|---|
| cover | 8 | 6 — 3 | 8 |
| agenda | 6 | 6 — 4 | 15 |
| section | 6 | 5 — 2 | 8 |
| content | 23 | 19 — 8 | 37 |
| data | 18 | 14 — 8 | 38 |
| comparison | 14 | 7 — 7 | 20 |
| process | 9 | 9 — 5 | 23 |
| people | 5 | 6 — 3 | 14 |
| quote | 14 | 10 — 3 | 15 |
| closing | 5 | 4 — 1 | 5 |

| Measure | Before | After |
|---|---|---|
| Slides that differ between seeds of a style (min over pairs) | 0 % (no seed) | **92 %** (7 styles 100 %; swiss, memphis, consulting 92 % on one pair) |
| Same, without the title (deck-look) part of the signature | 0 % | 92 % |
| Same recipe between seeds (min) | 100 % same | 50–58 % differ in recipe; the rest differ in look |
| Chained `avoidSignatures` (seed n avoids seeds < n) | — | 92 % min, 0 errors |
| Same signature at the same position across the 45 style pairs | 25.6 % | 9.1 % |
| Avoidable repeated signature inside a deck | 0 (luck of a 12-slide outline) | 0 (enforced) |
| Errors / warnings / repairs, 30 decks | 0/0/0 (10 decks) | 0/0/0 |

### 8.6 Vocabulary added (approved for this phase)

`SlideRecipe.variants`, `RecipeVariant { id, layout?, swap?, knobs? }`, `BASE_VARIANT`
(`'base'`), `findVariant`, `variantIds`, `recipeSlide(…, variant?, style?)`; `DeckStyle.variety`;
`CapabilityIndexEntry.lookValues`, `knobHint`; module `pipeline/variety.ts` (`lookSignature`,
`blockLook`, `lookCandidates`, `pickOrder`, `deckLook`, `applyDeckLook`, `knobAllowed`,
`styleAllows`, `seedStride`, `hashString`, `DECK_LOOK_TYPES`, types `LookCandidate`, `DeckLook`,
`PickContext`); dry run `runVariety`, `signatureDiffer`, `VarietyReport`, `VarietyOptions`,
`DryRunOptions.seed/avoidSignatures/theme`, `StyleRunResult.seed/designs/signatures/candidates/
avoidableRepeats/deckLook`; CLI `--seeds`, `--chain`; validator rule `slot/invalid-boolean`
(and `slot/invalid-enum` as an error on look knobs); `tls.t.quote` slots `variant` (`classic`,
`big`, `card`, `side`, `image`), `image`, `alt`; `tls.c.image-full` values `panel: right | split |
band`, `scrim: gradient`, slot `frame`; recipe variant ids listed in §8.5. No new block type
(`EXPECTED_BLOCK_COUNT` stays 131), no dependency, `TldrawApp.version` stays 16.

### 8.7 Decisions

- **No new blocks.** Every gap closed with knobs and recipe variants. "Quote with image" is the
  quote's `image` variant (an optional photo slot) rather than a new block; `tls.c.quote-image`
  stays tier 2.
- **The picker owns the look, the LLM owns the content.** The backend rotates designs
  deterministically (seed, signature, avoid list); the LLM may still name `recipe/look` or turn a
  knob, inside the listed values. Style identity is protected by `variety`, not by the picker.
- **Title treatment per deck, not per slide**: consistent inside a deck, different across decks.
- **Seed stride**: nearby seeds give maximally different decks; a per-user deck counter is the
  recommended seed.
- **Budget**: tier-1 index ceiling **16k → 17k** (the brief's allowance; measured 16.0–17.0k across
  styles, default 16,964); S2a own-role total stays ≤ 16k (13.8–14.8k, spec). Top-8 detail held at
  ≤ 12k (11,993) by trimming image-full's text. Style card ≤ 1.2k held (1,030–1,194; doodle and swiss
  briefs lost a few words).

### 8.8 Done-when check

| Check | Result |
|---|---|
| Dry run 3 seeds × 10 styles, 0 errors / 0 warnings | ✅ 30 decks, 0 / 0, 0 repairs (`dry-run.spec`) |
| No repeated signature in a deck where the role has an alternative | ✅ 0 avoidable repeats (spec) |
| ≥ 70 % of slides differ across the 3 seeds of a style | ✅ min 92 % (before 0 %) (spec) |
| `cli.js` clean on every `__fixtures__/styles/*.json` + showcases | ✅ 19 decks 0/0, `needsVisualCheck` empty; one `text/shrunk` info on showcase-consulting |
| Calibration `--shots`, 0 line-count mismatches on new/changed decks | ✅ ten style decks + five showcases + variant decks: 0 (html parts 0 too); one borderline over-count in a dry-run seed deck (Notes — AC8) |
| LO8 parity | ✅ composite chunk (68 probes) and text/layout/media/diagram/chrome chunk (64) pass, incl. new quote and image-full probes; no renderer was changed |
| Every shot looked at | ✅ sheets below, each read; fixes above came from them |
| tsc prod 0, spec ≤ 329 | ✅ 0 / 329 |
| Targeted jest | ✅ recipes, capability-digest, catalog-conformance, layout-report, block-metrics (size cards regenerated), styles (+ masters), slide-composition, dry-run, demo-deck-*, block-library-tour, validate-deck-spec, quote, image-full, closing, cover, quote-image, l.card, card-paint, layout-layers/anchor/calibration, slide-compiler/decompiler, deck-document, motion-showcase, html-poster-geometry, slide-composites, composite-geometry — 2,493 tests pass |
| Digest budgets | ✅ held or recorded (§8.7) |

Sheets (session scratchpad): `sheet8-variants.png` (quote and image-full variants × luxury,
corporate, memphis, glass-pastel), `sheet8-seeds-{corporate,luxury,doodle,gradient}.png` (the three
seeds side by side), `sheet8-showcase.png` (four palettes + consulting action titles).

### 8.9 AC8.5 — quality pass on the variety decks

**Date:** 2026-10-10 · **Against commit:** `105e8e80` (AC8 done). Lead review of
`sheet8-seeds-corporate.png`: the oracle reported every slide clean, yet logo walls drew empty
plates, a slide was blank under its title, statements and section slides were small type on an
empty page, three bullets sat beside a full-height photo.

**Weak slides** (judged on the sheets, 360 dry-run slides = 3 seeds × 10 styles × 12):

| Kind | Before | After |
|---|---|---|
| Asset-dependent pick without assets (logo wall, blank slide) | 19 | 0 |
| Sparse: small statement / section / closing on an empty page | 54 | 0 |
| Tiny text beside a photo | 34 | 0 |
| Thin data (short table, one-stat spotlight, matrix with one item, small pros/cons) | 35 | ~15 (stat-spotlight 12, big-stat split 3) |
| Defects (motif on text, red block under a card, pale section title) | 6 + consulting | 0 |
| **Total** | **148** | **~15** |

**Why s3-08 was blank.** The logo wall's six `/demo/logo-*.svg` URLs do not load offline; each
image leaf is hidden on error (AC4), and nothing else was painted (plates off) — a region of
hidden images. Root fix: a logo with no resolvable image is now set as a **wordmark** (its alt,
muted, the largest of subheading/lead/body/caption that fits the cell without an ellipsis; a cell
too small even for a caption keeps the placeholder leaf), so a logo wall can never paint nothing.
Separately the picker no longer offers the logo wall when the content has no logos.

**Content-asset input** (`recipes.ts`): `AssetKind = images | logos | portraits | chartData`,
`SlideAssets`, `ASSET_KINDS`, `blockNeeds(type, knobs)`, `designNeeds(recipe, variant)`,
`assetsAllow(recipe, variant, assets)`. The dry run takes `DryRunOptions.assets` (default
`DRY_RUN_ASSETS`: images, portraits, chart data, no logos) and `OutlineEntry.assets` per slide, and
filters the candidates before the pick. Degrading blocks need nothing (team, testimonial: initials
discs; bento: drops an empty photo tile). Documented for the backend in LLM-ARCHITECTURE S2a
"Content assets (AC8.5)".

**Quality gate** (`pipeline/quality.ts`: `slideQuality`, `deckQuality`, `deckTitleSize`,
`QUALITY_GATE`, codes `quality/sparse`, `quality/thin-region`, `quality/small-type`): per slide,
fill of the safe area ≥ 30 % (≥ 15 % when type-led, lead ≥ 1.5 × title size), fill of every large
non-title region ≥ 30 %, lead type ≥ 0.9 × the style's slide-title size. The dry run runs it in its
S4.1 loop (a failure moves to the next design, never cuts the headline) and reports
`StyleRunResult.quality` / `qualityFindings`. Calibrated against the before-sheets: it flags 99 of
the 148 judged weak (the rest were asset or visual defects the geometry cannot see: those are
fixed at the root above) and passes the strong slides. `dry-run.spec` holds 0 findings on 4 styles
× 3 seeds and the variety bar; unit cases cover a sparse statement and a thin bullet column.

**Fixes** (roomy, not sparse):
- `tls.t.statement` `size: display` (new rung, ≤ 3 lines); `content-statement`/`quote-statement`
  use it; the `lg` look was dropped.
- `tls.t.bullets` and `tls.m.icon-list` `size: fit` — the largest type that leaves the list ≤ 60 %
  of a tall box (≤ 2 lines an item), centred; used by the three list-beside-photo recipes.
- `tls.t.takeaway` `size: column` — heading/subheading/lead card centred in a tall column
  (`data-bar-takeaway`).
- `tls.c.testimonial` `size: lg` — title (else heading) quote, lead name, larger avatar, the
  rung the poster picks for the box; the initials take whichever of surface/text ink contrasts
  with the accent disc (was navy on navy).
- Tables take a **grand** tier (body → subheading, caption → lead) when they fit their box.
- `tls.c.divider` and centred `tls.c.closing` lead with display type; divider, cover and the
  divider's width (1200/1100/1000) are chosen by `stableWrap` (same line count at 98.5 % and
  104 % of the width, no one-word line), which also fixed the gradient cover line over-count.
- `tls.c.image-text` centres its text column on the photo; the `top` look was dropped.
- `tls.t.quote` `side` and `card` start at display type.
- `tls.c.image-full` band headline column 66 % (was 58 %), 4 lines in a full-height panel.
- Outline message slots (`MESSAGE_SLOTS`): the dry-run filler writes the key message into
  subtitles, closing text, big-stat label/context, image-full/image-text text, statement
  attribution, and a cover kicker — the example text (Vietnamese subtitles, "Centre, spread and
  shape") no longer shows.
- Examples: stat-spotlight (English, two stats), pros/cons (3 + 2 points), matrix (3 items).
- Styles: consulting section title is white — `resolveColor('text')` on a surface of the same
  polarity as the text colour solves to 7:1 (`TEXT_FLIP_FLOOR`; 4.5 when unreachable) instead of a
  pale mid-tone; section motifs moved right of x 1380 (gradient/glass orbs, luxury ring, doodle
  star, memphis half circle); glass cover orb and memphis cover shapes clear of the subtitle; swiss
  cover red block 576 × 312 (the split closing's card sat on it); start-aligned kinetic titles drop
  the subtitle disc.

**Numbers after.**

| Check | Result |
|---|---|
| 30 dry-run decks | 0 errors, 0 warnings, 0 quality findings, 0 avoidable repeats |
| Seed difference (min over pairs) | 75 % (swiss) – 92 %; ≥ 70 % ✅ (was 92 %) |
| `cli.js` on `__fixtures__/styles/*.json` | 19 decks 0/0 (showcase-consulting one `text/shrunk` info, as before) |
| Calibration `--shots`, 30 decks (360 slides) | 0 table line-count mismatches, html parts 0 |
| tsc | prod 0, spec 329 |
| Targeted jest (`--maxWorkers=1`) | 170 suites, 6,358 pass; 1 fail = the pre-existing hero centring test (Notes — AC8.5) |
| Digest | tier-1 index 16,996 (≤ 17k), top-8 detail 11,987 (≤ 12k), S2a own-role ≤ 16k (spec) |

Sheets (session scratchpad): `sheet9-seeds-<style>.png` for the ten styles, three seeds side by
side, twelve slides each.

**Vocabulary added:** `AssetKind`, `SlideAssets`, `ASSET_KINDS`, `blockNeeds`, `designNeeds`,
`assetsAllow`; `OutlineEntry.kicker`, `OutlineEntry.assets`, `DryRunOptions.assets`,
`DRY_RUN_ASSETS`, `StyleRunResult.quality/qualityFindings`; module `pipeline/quality.ts`
(`slideQuality`, `deckQuality`, `deckTitleSize`, `QUALITY_GATE`, `SlideQuality`, `QualityFinding`,
`QualityCode`, codes `quality/sparse | thin-region | small-type`); `tls.t.statement` `size: display`;
`tls.t.bullets` `size: body | lead | fit`; `tls.m.icon-list` `size: body | fit`; `tls.t.takeaway`
`size: column`; `tls.c.testimonial` `size: md | lg`; internal table density `grand`;
`stableWrap` (composite kit); `TEXT_FLIP_FLOOR` (tokens). No new block type, no dependency.

### 8.10 AC8.6 — small polish pass

**Date:** 2026-10-10 · **Against commit:** `1c0e2407` (AC8.5 done). The three weak designs AC8.5
left open, judged on before/after contact sheets (session scratchpad `ac86/`), all ten styles.

**1. `data-stat-spotlight` roomy tier** (`tls-c-stat-spotlight/schema.ts` `SPOT_ROOMY`, poster).
A box of at least 1200 × 600 (the spotlight filling a slide region) gets 210-unit stat bands
(was 150), the stat values at `title` and their labels at `lead` (was heading / caption) when every
value keeps one line and every label a whole line in its band, and the main label at `title` (was
heading) when it takes at most two lines and the column fits. Smaller boxes keep the compact tier
unchanged (`size.min` spec). The side column takes the roomy bands only when they still fit the
box. The dry-run filler writes the key message into the spotlight's `context` (the example has
none, so the right of the ring was empty). Template geometry is the same `geometry()`; text sizes
follow the poster leaves (LO7), 0 html line mismatches in the harness.

**2. `data-big-stat/split` label** (`BIG_STAT_SPLIT_LABEL`). In the large tier the label beside
the number takes the largest of `title` / `heading` / `subheading` that wraps in ≤ 3 lines with no
one-word last line and keeps the column inside the box; the context is `lead` (`body` when lead
leaves a one-word last line). Compact split unchanged. The fixed-point property (laid out again at
its own height it keeps the same number and label size) is in the spec.

**3. `section-title`** — was `section` layout + `tls.t.title` alone at title size (4–9 % of the page;
0 of 30 dry-run decks kept it, 11 rejections). Now:
- layout **`section-stack`**: one `content` region at the safe margin, at most 1200 wide
  (`SECTION_STACK_MAX_W`, the column `tls.c.divider` uses, clear of the section motifs right of x
  1380), full content height, stack centred (`regionAlign`). Additive (18 layouts).
- `tls.t.title` **`size: fit`** (`TITLE_FIT`, `fitToken`): the largest of display / title / heading
  whose wrap is stable (≤ 3 lines, same count at 98.5 % and 104 % of the width) with no one-word
  first or last line — the divider's `stableWrap` rule on the title block.
- `tls.t.body` **`size: body | lead | subheading`** (default body).
- recipe: `tls.t.title(size=fit, rule=true, align=start) + tls.t.body(size=subheading)` with the
  key message (dry-run filler `MESSAGE_SLOTS`); its own align/rule win over the deck look
  (applyDeckLook's documented contract; `dry-run.spec` now checks exactly that).
- Ink: a flipped `text` role (dark theme ink on a dark page) now solves to **12:1** first, then 7:1,
  then the 4.5 floor (`TEXT_FLIP_FLOORS`): consulting's navy section title is white (7:1 read as a
  pale lavender under a display title).

**Numbers** (dry run 3 seeds × 10 styles, default assets; per-design numbers on the data/section
outline entries, ten styles):

| Measure | Before | After |
|---|---|---|
| Errors / warnings / quality findings, 30 decks | 0 / 0 / 0 | 0 / 0 / 0 |
| Seed difference, min over pairs (≥ 70 % bar) | 75 % (swiss) – 92 % | 75 % (swiss) – 92 % |
| `section-title` in the 30 decks / rejected by the gate | 0 / 11 | 5 / 4 |
| `section-title` fill (safe area) | 4–9 % (fails everywhere) | 22–31 % at display (6 styles pass, type-led); 14–15 % at title (gradient, editorial, swiss, memphis: rejected) |
| `stat-spotlight` base: fill / region fill | 58–67 % / 57–64 % | 76–81 % / 75–79 % |
| `stat-spotlight` side: fill / region fill | 71–72 % / 53–55 % | 75–76 % / 56–58 % |
| `stat-spotlight` plain: fill / region fill | 58–67 % / 46–52 % | 76–81 % / 62–66 % |
| `stat-spotlight` in the 30 decks | 12 (base 2, side 6, plain 4) | 12 (same picks) |
| `big-stat/split` label size | lead (36) | heading–title (56–80) |
| `big-stat/split` fill | 24–31 % | 28–35 % |
| `big-stat/split` in the 30 decks | 3 | 3 |
| `cli.js` on `__fixtures__/styles/*.json` (19 decks) | 0 / 0 | 0 / 0, `needsVisualCheck` empty |
| Harness (10 review decks × 13 slides + the 30 dry-run slides shot), table line mismatches | 1 (display title at 1200, before `fit`) | 0; html parts 0 |
| Tier-1 index (default) | 16,996 | 16,994 (≤ 17k; header trimmed by ~80 chars to pay for the recipe line) |
| tsc | prod 0, spec 329 | prod 0, spec 329 |

Judged on the sheets: stat-spotlight now reads full (title label + message beside the ring,
title-size stats); the split label balances the number in all ten styles; section-title reads as a
section page (display title, accent rule, message) in corporate, minimal, luxury, glass, doodle,
consulting (white on navy).

**Tests** (`--maxWorkers=1`, targeted): touched blocks (stat-spotlight 46, big-stat, title, body:
164 incl. new AC8.6 cases), slide-layouts, recipes, tokens, capability-digest (snapshots regenerated),
dry-run, styles + style-masters, block-metrics (size cards regenerated: stat-spotlight cpl),
catalog-conformance, layout-report, layout-layers/anchor/calibration, slide-compiler/decompiler,
slide-composition, deck-document, demo-deck-*, block-library-tour, validate-deck-spec,
html-poster-geometry, composite-geometry, list-sizes, surface, and the neighbours hero, divider,
cover, closing, image-full, statement, quote, card-paint, motion-showcase — all pass (hero's AC8.5
failure was fixed by `1c0e2407`). Parity: the touched blocks' own suites (standard/showcase suites
carry their DOM↔SVG probes) pass; no renderer changed.

**Sheets** (session scratchpad `ac86/`): `sheet-stat-spotlight.png`, `sheet-big-stat-split.png`,
`sheet-section-title.png` (before | after, ten styles), `sheet-image-full.png` (seven panels × five
styles), `sheet-showcase-consulting.png`.

**Vocabulary added:** slide layout `section-stack` (`SlideLayoutId`, `SECTION_STACK_MAX_W`);
`tls.t.title` `size: fit` (`TITLE_FIT`, `fitToken`); `tls.t.body` slot `size` (`body | lead |
subheading`, `bodyToken`); `SPOT_ROOMY`, `SpotGeometry.roomy` (stat-spotlight roomy tier);
`BIG_STAT_SPLIT_LABEL`; `TEXT_FLIP_FLOORS` (replaces `TEXT_FLIP_FLOOR`, internal); dry-run
`MESSAGE_SLOTS` entries for `tls.t.body` and `tls.c.stat-spotlight`. No new block type
(`EXPECTED_BLOCK_COUNT` 131), no dependency, `TldrawApp.version` 16.

