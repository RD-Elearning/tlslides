# 01 · Taxonomy: categories, scope, shortDescription

`family` stays as it is: it is structural (where the code lives, how it renders), and it is the
type prefix. This plan adds a second, **semantic** axis that the AI planner and the gallery use.

## 1. New metadata on `BlockDefinition` (added in P0.1)

All fields are additive. In the TypeScript type they are optional, so a host's third-party
blocks keep compiling. For built-ins, `catalog-conformance.spec.ts` makes them **required** (P0.2).

```ts
export type BlockCategory =
  | 'structure' | 'heading' | 'text' | 'list' | 'emphasis'
  | 'metric' | 'chart' | 'table' | 'comparison'
  | 'process' | 'timeline' | 'hierarchy' | 'relationship'
  | 'media' | 'people' | 'brand'
  | 'cover' | 'divider' | 'agenda' | 'closing' | 'learning'
  | 'chrome' | 'decoration'

export type BlockScope = 'element' | 'group' | 'slide'

interface BlockDefinition {
  // …existing fields…
  /** Semantic category: what the block is FOR. Drives the gallery tabs and the AI index. */
  category?: BlockCategory
  /** ≤ 90 chars. What the viewer sees, distinguishable from its category siblings. */
  shortDescription?: string
  /** element = an atom placed in a region/container; group = a self-contained unit that fills
   *  one region; slide = designed to fill the whole content area (never nest it). */
  scope?: BlockScope
  /** Sibling block types worth considering instead. Each must resolve in the registry. */
  related?: string[]
}
```

### Categories (closed set: 23)

| Category | Means | Typical blocks |
|---|---|---|
| `structure` | Invisible arrangement: stacks, grids, splits, guides | `tls.l.*` |
| `heading` | Text that names a slide or section | title, subtitle, kicker |
| `text` | Running text and small print | body, caption, footnote, definition, code |
| `list` | Several parallel items | bullets, numbered, checklist, icon-list, tags, kv-list, cards |
| `emphasis` | One idea made to stand out | statement, quote, takeaway, callout |
| `metric` | One or a few numbers, possibly against a target | hero-number, kpi-tile, stat-card, big-stat, progress, gauge |
| `chart` | Quantitative chart with axes or slices | bar, line, area, pie, donut, scatter… |
| `table` | Rows × columns of values | table, compare-table, scorecard, ranking |
| `comparison` | Two or more options set against each other | comparison, pros-cons, before-after, matrix-2x2, swot, pricing |
| `process` | Ordered steps without dates | steps, chevrons, cycle, flow, funnel |
| `timeline` | Ordered events **with dates or periods** | timeline, roadmap, milestones |
| `hierarchy` | Parent/child or level structure | tree, pyramid, layers, mindmap, breakdown |
| `relationship` | Overlap or connection between non-ordered things | venn, hub-spoke |
| `media` | Pictures and icons as the content | image, image-grid, device-mock, icon |
| `people` | Persons as the content | avatar, team, profile, testimonial |
| `brand` | Logos | logo, logo-wall |
| `cover` | Deck or talk opener | hero, cover |
| `divider` | Section break between parts of a deck | divider |
| `agenda` | What's coming: agenda, TOC, objectives | agenda, objectives |
| `closing` | Ending: thanks, CTA, contact, recap | closing, contact, recap |
| `learning` | Teaching interactions | qa, quiz |
| `chrome` | Slide furniture repeated on many slides | page-number, header, footer-text, logo-mark, progress |
| `decoration` | Visual-only shapes with no content | decoration, pattern, rule |

**Picking rule (put it verbatim in the digest index header):** choose the category from the
*relationship in the content*, then the block. Dated → `timeline`; ordered but undated →
`process`; options against each other → `comparison`; numbers that need axes → `chart`; one to
four headline numbers → `metric`.

### Scope

| Scope | Means | AI rule |
|---|---|---|
| `element` | One atom: a title, an icon, a progress bar | Combine several on a slide or inside a container |
| `group` | A self-contained unit: a chart, a timeline, a KPI row | One per region. May sit inside `tls.l.card`/`section` |
| `slide` | Fills the whole content area: cover, divider, agenda, closing, dashboard | One per slide, alone in the main region. **Never nest** (conformance: a `slide`-scope block must not be listed in any container's `allow`, and the validator warns when one is nested) |

## 2. Writing `shortDescription`

1. **≤ 90 characters**, one sentence fragment, no trailing period.
2. **Start with what the viewer sees**: "Dated events on a horizontal axis…", not "A block that…" or
   "Use this to…" (use-cases belong in `describe.when`).
3. **Say what makes it different from its category siblings.** If two blocks in one category
   would get the same sentence, one of them is redundant.
4. **No counts.** The index derives "3–8 items" from the primary list slot's `min`/`max`,
   so a count in prose would drift from the schema.
5. **No implementation words:** tier, html, poster, delegate, composite, `defineCompositeBlock`,
   layout(), editorOnly, prop names. The conformance gate (P0.2) rejects a fixed denylist.
6. English. Gallery localisation is out of scope.

Good: `Dated events on one axis with title and note per event; optional "today" marker`
Bad: `Timeline block (Tier A) that delegates each node to tls.m.icon-label.`

## 3. Index line format (generated, P0.4)

```
tls.g.timeline · timeline · group · 3–8 items — Dated events on one axis with title and note per event; optional "today" marker
```

`type · category · scope · <range from primary list slot, if any> — shortDescription`. At
~110 chars per line, 129 blocks come to ~14k chars (≈3.5k tokens) for the whole catalog,
against ~60k today for 41 blocks.

## 4. Mapping the 41 existing blocks (backfill in P0.3)

`shortDescription` values below are the proposed text. P0.3 may edit wording but must keep
the rules in §2.

| Type | Category | Scope | shortDescription | related |
|---|---|---|---|---|
| `tls.l.stack` | structure | element | Vertical stack of child blocks with a gap | row, grid |
| `tls.l.row` | structure | element | Horizontal row of child blocks with a gap | stack, grid |
| `tls.l.grid` | structure | element | Grid of child blocks in fixed columns and rows | row, repeater |
| `tls.l.split` | structure | element | Two panes side by side or stacked, with an adjustable ratio | sidebar |
| `tls.l.overlay` | structure | element | Children layered on top of each other in one box | field |
| `tls.l.card` | structure | element | Filled, rounded panel around its children | section |
| `tls.l.section` | structure | element | Titled area with a divider above its children | card |
| `tls.l.repeater` | structure | element | Repeats one template child once per data item | grid |
| `tls.l.spacer` | structure | element | Empty gap between neighbouring blocks | — |
| `tls.l.field` | decoration | element | Full-bleed background colour or gradient behind other blocks | m.decoration |
| `tls.l.safe-area` | structure | element | Content margin guide, visible in the editor only | grid-guide |
| `tls.l.grid-guide` | structure | element | Column alignment guide, visible in the editor only | safe-area |
| `tls.l.sidebar` | structure | element | Narrow side column next to a main content area | split |
| `tls.l.footer` | structure | element | Main content area above a fixed-height footer strip | x.footer-text |
| `tls.t.title` | heading | element | Slide title, auto-fitted, with optional rule | subtitle, kicker |
| `tls.t.subtitle` | heading | element | Secondary line under the title | title |
| `tls.t.kicker` | heading | element | Small uppercase eyebrow label above a title | t.tags |
| `tls.t.body` | text | element | Paragraph text, auto-fitted, optionally in columns | bullets |
| `tls.t.bullets` | list | element | Bulleted points with dot, dash or chevron markers and indent levels | t.numbered, t.checklist |
| `tls.t.caption` | text | element | Small explanatory line for an image or chart | t.footnote |
| `tls.t.hero-number` | metric | element | One oversized number with unit and caption, no frame | c.kpi-tile, c.big-stat |
| `tls.t.quote` | emphasis | element | Pull quote with a large quote mark and attribution | c.testimonial |
| `tls.t.takeaway` | emphasis | element | Highlighted insight with accent bar and label | t.callout |
| `tls.d.bar` | chart | group | Column or bar chart of one series with value labels | d.grouped-bar, d.line |
| `tls.d.donut` | chart | group | Ring of slices showing shares of a whole, with centre label | d.pie, d.progress-ring |
| `tls.g.steps` | process | group | Compact numbered step strip with thin connectors | c.steps, g.chevrons |
| `tls.c.hero` | cover | slide | Opening title with kicker, subtitle and optional call to action | c.cover |
| `tls.c.feature-grid` | list | group | Grid of icon + title + description cells | c.cards, m.icon-list |
| `tls.c.testimonial` | people | group | Customer quote with name, role and avatar | t.quote |
| `tls.c.big-stat` | metric | slide | One giant headline number filling the slide, with label and context | t.hero-number |
| `tls.c.kpi-tile` | metric | element | KPI tile: value, change arrow, label, optional sparkline | c.stat-card, c.kpi-row |
| `tls.c.kpi-row` | metric | group | Equal-width row of KPI tiles | c.dashboard |
| `tls.c.stat-card` | metric | element | Card with icon, headline value, unit and caption | c.kpi-tile |
| `tls.c.image-text` | media | group | Image beside or above a kicker, title and body | c.cover |
| `tls.c.comparison` | comparison | group | Columns of titled item lists, one optionally highlighted | g.pros-cons, d.compare-table |
| `tls.c.agenda` | agenda | slide | Numbered agenda items with notes; current item highlighted | c.objectives |
| `tls.c.steps` | process | slide | Full process slide: numbered steps with titles and descriptions | g.steps, g.chevrons |
| `tls.m.image` | media | element | Single image with cover/contain fit, focal point, optional caption | m.image-grid |
| `tls.m.icon` | media | element | Single icon from the icon set in a theme colour | m.icon-label |
| `tls.m.icon-label` | media | element | Icon with a short label beneath | m.icon-list |
| `tls.x.page-number` | chrome | element | Slide number, alone or as "3 / 24" | x.progress |

(`related` values use the short form `<family>.<name>`; write them in full, `tls.…`, in code.
Entries naming blocks that don't exist yet are added when that block lands; the gate in P0.2
requires every `related` entry to resolve.)
