# 00 · Review of the current catalog (2026-10-03)

Verified by reading `BUILT_IN_BLOCKS`, every `library/*/tls-*/index.ts` and `schema.ts`,
`capability-digest.ts` + its spec, `icons/index.ts` and `components/BlockInserter/`. This is
about the catalog as it exists at commit `3804688e`, not about the original 170-block target
([../03-block-catalog.md](../03-block-catalog.md)), which this plan uses as raw material.

## 1. What exists: 41 blocks, 7 families

| Family | # | Blocks |
|---|---|---|
| layout `l` | 14 | stack, row, grid, split, overlay, card, section, repeater, spacer, field, safe-area, grid-guide, sidebar, footer |
| text `t` | 9 | title, subtitle, kicker, body, bullets, caption, hero-number, quote, takeaway |
| data `d` | 2 | bar (vertical columns), donut |
| diagram `g` | 1 | steps |
| composite `c` | 11 | hero (B), feature-grid (B), testimonial (B), big-stat (B), kpi-tile, kpi-row, image-text, comparison, agenda, steps, stat-card |
| media `m` | 3 | image, icon, icon-label |
| chrome `x` | 1 | page-number |

37 are Tier A, 4 are Tier B (html). The engine is sound: nesting through `ctx.layoutChild`,
theming through colour roles, padding/align through B3, element toggles through B4, and
`defineCompositeBlock` through B5. **What's missing is content coverage and AI-facing
metadata, not engine work.**

## 2. Coverage gaps (what an AI cannot build today)

Grouped by the slide an author would actually want:

| Slide need | Today | Gap |
|---|---|---|
| Any table | nothing | **No table block at all.** Comparison tables, pricing tables, scorecards and schedules all fall back to bullets |
| Trend over time | `tls.d.bar` only | No line, area, stacked or grouped bar, so there's no multi-series chart of any kind |
| Share of whole | `tls.d.donut` | No pie or stacked-100 %, and no progress ring or gauge for one value against a target |
| Timeline / roadmap | `tls.c.steps` / `tls.g.steps` only | No dated timeline, no Gantt-style roadmap, no milestones |
| Process variants | steps | No chevrons, cycle, funnel or flowchart |
| Hierarchy | nothing | No org chart, pyramid or layer stack |
| Relationship / strategy | nothing | No Venn, hub-and-spoke, 2×2 matrix, SWOT, pros/cons or before/after |
| Lists | bullets | No numbered list with styled markers, no checklist, no icon list, no Q&A |
| Emphasis | takeaway, quote | No callout with info/warn/success variants, no big statement, no definition |
| People | testimonial | No avatar, team grid or profile card |
| Brand | nothing | No logo or logo wall ("trusted by…") |
| Openers / closers | hero (text only) | No cover with an image, no section divider, no closing/thank-you/contact |
| Teaching (the main user is a university) | agenda | No learning objectives, recap, quiz/knowledge check, definition or code block |
| Chrome | page-number | No header, footer text, logo mark, section tabs or progress bar |

## 3. Overlaps that confuse selection

An AI picking from summaries alone gets these wrong. The plan fixes them with `category`,
`related` and sharper `describe.avoid` (P0.3), not by deleting blocks (additive-only rule).

| Overlap | Blocks | Resolution in this plan |
|---|---|---|
| "show one number" ×4 | `tls.t.hero-number`, `tls.c.kpi-tile`, `tls.c.stat-card`, `tls.c.big-stat` | Category `metric` for all four. `shortDescription` names the difference: bare number vs tile with delta vs card with icon vs whole-slide stat |
| Steps ×2 | `tls.c.steps`, `tls.g.steps` | `tls.g.steps` = compact strip inside a region (scope `group`); `tls.c.steps` = full process slide with descriptions (scope `slide`). Each one's `avoid` points to the other |
| Bar is not a bar | `tls.d.bar` draws **vertical columns** | P0.9 adds `orientation: 'vertical' \| 'horizontal'` (default stays vertical) and rewrites the summary. The type name stays (rule 5) |
| Title text vs hero | `tls.t.title` vs `tls.c.hero` | `hero` is scope `slide` (an opening slide); `title` is scope `element` |
| Two page-number folders | `library/chrome/tls-x-page-number` (real) and `library/channel/tls-x-page-number` (empty) | Housekeeping in P0.1: delete the empty `channel/`, `ml/` and `visual/` dirs and the brace-expansion stray dir (all untracked or empty) |

## 4. Metadata quality

| Field | State | Problem for AI selection |
|---|---|---|
| `family` | 7 values, structural | Says *how* a block is built, not *what it is for*. A planner thinking "I need a timeline" has to know that timelines live in `diagram` |
| `summary` | present on all 41 | Length 30–220 chars, inconsistent. Several describe the implementation, which is noise to a model: "Each tile delegates to tls.c.kpi-tile", "Built with defineCompositeBlock", "(editorOnly)" |
| `keywords` | present on all 41 | Fine, though nothing checks them |
| `describe` (when/avoid/example) | present on all 41 | Good. `avoid` rarely names the block to use instead |
| `capacity()` | 6 of 41 | Most blocks can't tell the planner "too many items", so overflow is only found visually |
| `lint()` | 1 of 41 | — |
| scope (element / group / slide) | **does not exist** | The planner can't tell a whole-slide composite from an atom, so it nests `tls.c.hero` inside a card |

## 5. Hard limits that will break if we just add blocks

1. **Digest budget is at its ceiling.** `capability-digest.spec.ts` caps the JSON digest at
   60,000 chars (measured ~59.9k) and the markdown digest at 54,000 (~52.7k). One more block fails
   the test. The spec has recorded "split per family" as the named follow-up since R7. P0.4
   replaces the single digest with a **two-tier digest**: a compact index of every block (≈100
   chars per block), plus full slot tables only for the blocks the planner shortlists. Adding 88
   blocks to the current format would need roughly 190k chars, about 40k tokens, on every planner
   call.
2. **Icon set has 10 icons** (zap, shield, globe, check, arrow-right, trending-up, trending-down,
   users, clock, alert). Feature grids, icon lists, process steps and callouts all need icons, and
   with 10 they'd all look alike. P0.5 grows the set to ~80 (Lucide path data, ISC licence,
   copied with attribution, no dependency).
3. **Chart engine is single-series.** `_engine/` has `axis-layout`, `linear-scale` and
   `series-color`, and the `series` slot kind is one value array. Multi-series charts use
   `list<object{name, values}>` with existing slot kinds, so no new `SlotType` is needed, but the
   engine needs a legend, a multi-series scale, an arc helper and a path builder (P0.6).
4. **No table engine.** Column-width solving and cell text measurement are needed by 6 planned
   blocks (P0.7).
5. **Gallery groups by family.** `BlockInserter` tabs are Layout/Text/Data/…, which won't scale
   to 129 blocks and doesn't match intent. P0.4b switches the tabs to categories.

## 6. What does not need to change

- No new `LayoutNode` kinds. Every planned (non-parked) block can be drawn with
  group/rect/path/text/image/icon/line. Arcs, chevrons, pyramids and Venn circles are `path`
  nodes; connectors are `line` with `marker`.
- No new colour roles. Status colours use `positive`/`negative`/`warning`/`neutral`, and series
  colours come from `series-color.ts`.
- No new motion presets. Every planned block maps onto the 30 existing ids (`grow-bars-x/y`,
  `draw-path`, `draw-axis-then-nodes`, `sweep-nodes`, `grow-branches`, `pop-points`,
  `stagger-*`, …).
