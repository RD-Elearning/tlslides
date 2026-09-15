# 6. Slide composition — regions, masters, overflow, and the AI contract

How blocks become a slide, and how a slide becomes a deck. This is the layer an AI actually
targets.

## 6.1 The pipeline

```
DeckSpec            (JSON — what an AI, an importer, or a host emits)
   │  validate against the block schemas + lint          ← P32
   ▼
SlideSpec[]         (per slide: layout id, page role, rhythm, regions → block trees)
   │  compileSlide(): regions → absolute boxes            ← P29
   ▼
BlockSpec[] + boxes
   │  blockToShape()                                      ← P18/§01 1.9
   ▼
ComponentShape[] + TDPage.background + TDPage.masterId
   │  Commands.insertContent / addSlideFromTemplate
   ▼
TDDocument                                                 (the existing, unchanged format)
```

Every arrow is a pure function except the last. That means the whole pipeline runs on a server
with no editor mounted — which is what `renderPageToSvg` (Phase 15) already established as the
right property for this codebase, extended one level up.

## 6.2 `SlideSpec`

```ts
interface SlideSpec {
  id?: string                     // caller-supplied; Deck.addSlide already accepts one (Phase 14)
  /** Which region arrangement this slide uses. See §6.3. */
  layout: SlideLayoutId
  /** `ppt-master`'s page role, for masters, page numbering and export grouping. */
  role: 'cover' | 'toc' | 'section' | 'content' | 'ending'
  /** `ppt-master`'s page_rhythm. Drives density limits and the deck-level rhythm lint. */
  rhythm: 'anchor' | 'dense' | 'breathing'
  /** Blocks, keyed by the region names the chosen layout declares. */
  regions: Record<string, BlockSpec[]>
  background?: SlideBackground    // the existing Phase 11 type, unchanged
  masterId?: string               // §6.5
  notes?: string                  // existing TDPage.notes
  skipInPresentation?: boolean    // existing TDPage.skipInPresentation
  transition?: SlideTransitionId  // §05 5.8
}
```

`role` and `rhythm` are **not decoration**. They are the two fields that let the linter reason
about a deck rather than a slide: `breathing` caps block count and forbids grids; five consecutive
`dense` slides is a finding; `cover`/`section` slides skip page numbers; `ending` slides are where
a CTA belongs.

## 6.3 Slide layouts — named region arrangements

A slide layout is a **pure function from the frame to named boxes**, honouring the safe margin. It
is not a template and holds no content.

```ts
interface SlideLayout {
  id: SlideLayoutId
  name: string
  regions: RegionDef[]                 // name, relative rect, allowed families, capacity hint
  compile(frame: Size, tokens: ResolvedTokens): Record<string, Box>
}
```

The shipped set — **16 layout ids in 14 rows** (`split-37`/`split-73` and `grid-4`/`grid-6` are
mirrored pairs sharing an implementation) — derived from `ppt-master`'s layout-structures table
(§02 2.7) and its five layout systems' page types:

| id | regions | content relationship |
|---|---|---|
| `full` | `content` | one focal claim; full-bleed |
| `title-content` | `title`, `content`, `footnote?` | the workhorse |
| `title-only` | `title`, `subtitle?` | statement, section |
| `two-column` | `title`, `left`, `right`, `footnote?` | equal comparison |
| `split-37` / `split-73` | `title`, `major`, `minor` | dominant evidence + takeaway |
| `three-column` | `title`, `a`, `b`, `c` | parallel sequence |
| `top-bottom` | `title`, `visual`, `explanation` | wide visual + explanation |
| `quadrants` | `title`, `q1`..`q4` | true matrix |
| `hub` | `title`, `hub`, `satellites` | core + surrounding forces |
| `sidebar` | `title`, `main`, `aside` | content + persistent annotation |
| `hero-split` | `visual`, `panel` | image-as-canvas with a text panel |
| `field` | `field`, `floating` | page-field organization |
| `grid-4` / `grid-6` | `title`, `cells[]` | uniform peers (use sparingly — §02 2.7) |
| `blank` | `content` | free placement |

Every layout computes from `frame` and the spacing scale, so a 4:3 or 9:16 deck gets correct
regions with no per-layout special-casing. `SLIDE_ASPECT_PRESETS` (Phase 4) already covers
widescreen/standard/square; `TDPage.size` is per page, so a deck can mix.

**Free placement is preserved.** `blank` exists, and a user can always drag a block anywhere —
regions govern *generated* slides, not the editor. A block dragged out of its region simply keeps
its absolute box; the region is a compile-time device, not a runtime constraint.

## 6.4 Overflow and pagination

The single biggest determinant of whether generated decks look professional or broken.

At compile time, each region asks each block `capacity(props, box, ctx)`. Remedies run in this
fixed order (§01 1.8) — from `ppt-master`'s own instruction to expand, then reflow, then switch
texture, and never to trim wording to satisfy an estimate:

1. **Expand** — take unused space from an adjacent region that reported slack.
2. **Reflow** — the block switches internal arrangement: 3 columns → 2, grid 3×2 → 2×3, a bullet
   list → two columns, an icon grid → an icon list.
3. **Shrink** — autofit down to 0.75. Below that, stop; 0.7× body text is not a design decision.
4. **Paginate** — split into a continuation slide: the same layout, the title suffixed per the
   deck's convention (`"… (cont.)"`), the overflowing list's remainder moved over, the original's
   build order preserved. Only list-like and grid-like blocks are splittable, and each declares
   `splittable: true` plus a `split(props, atIndex)` function.
5. **Truncate** — last resort, **and it is always visible**: an explicit "+7 more" marker plus a
   `text/truncated` lint finding. A silently cut bullet is the worst possible outcome because
   nobody sees it happen.

Pagination is deliberately a *compiler* concern, not a block concern: only the compiler knows
there is room to make another slide.

## 6.5 Masters — closing a named follow-up

`reviews/roadmap-slides.md` records this as open since Phase 13: *"a master/layout slide — shapes
marked as belonging to a master (logo, page number, footer) that render on every slide, are not
individually selectable, and are edited in one place… left as a named follow-up."*

Blocks make it small:

```ts
interface MasterSpec {
  id: string
  name: string
  blocks: BlockSpec[]                       // family 'chrome', boxes resolved against the frame
  appliesTo?: Array<SlideSpec['role']>      // e.g. content+toc, so covers stay clean
  background?: SlideBackground
}
// additive, optional, no migration (§01 1.13)
TDDocument.masters?: Record<string, MasterSpec>
TDPage.masterId?: string
```

Rendering: master blocks are laid out **behind** the slide's own blocks by the same renderers, in
the editor, in presentation, and in `renderPageToSvg`. They are not shapes in `page.shapes`, so
they cannot be selected, moved or deleted from a slide — which is the whole point — and they add
nothing to a document's shape count.

Resolution inputs a master block may read (via `ctx.master`): slide index, total slide count,
section name, slide role, deck title, date. That is what makes `tls.x.page-number` and
`tls.x.section-tab` work without per-slide content.

A master is edited in a master-editing mode (P30) that mounts the same editor against
`master.blocks`. One place, as promised.

## 6.6 Templates, rebuilt

Phase 13's twelve starter layouts are hand-built `TDShape[]` arrays with absolute coordinates. Two
of them (`comparison`, `image-left/right`) shipped *visibly under-composed* — honestly recorded at
the time as "usable but dead space and a minor vertical misalignment" — and three shipped with
invisible dividers because of the `LineShape.handles` coordinate trap.

P29 rebuilds all twelve as `SlideSpec`s over composite blocks. What changes:

- **No absolute coordinates anywhere**, so the misalignment class of bug cannot recur.
- **They reflow** to any frame size and to `density`, rather than being 1920×1080 pictures.
- **They fill from slots through the same path**, since `spec.slot` maps to `TDBaseShape.slot` and
  `addSlideFromTemplate(id, content)` keeps working unchanged.
- **`Template`'s type does not change.** `buildTemplateShapes` internally compiles a `SlideSpec`
  and emits `TDShape[]`, so `BUILT_IN_TEMPLATES`, `TemplatePicker`, `TemplateThumbnail` and
  `Deck.listTemplates()` are all untouched. This is a reimplementation behind a stable interface,
  not a breaking change.

The starter pack then grows well past twelve, because a template becomes a ~20-line `SlideSpec`
rather than a hand-placed shape array.

## 6.7 `DeckSpec` — the AI-facing contract

The whole point of the block system: **an AI emits meaning, never geometry.**

```ts
interface DeckSpec {
  version: 1
  title: string
  theme?: string | DeckTheme          // a built-in theme id, or a full brand kit
  aspect?: 'widescreen' | 'standard' | 'square' | [number, number]
  masters?: MasterSpec[]
  slides: SlideSpec[]
}
```

What makes this workable for a model, in order of impact:

1. **A closed vocabulary.** The model picks a `layout` from 16, a block `type` from 170, and
   fills declared slots. It never emits a number that is a coordinate, a color, or a font size.
2. **Every slot carries `guidance`** (§01 1.5) — "One metric name, 1–3 words. Never a sentence." —
   and `maxChars`/`max` budgets that are enforced, not hoped for.
3. **Relationship-first block selection.** The catalog tags every diagram block with its
   relationship (`order`, `link`, `parent`, `membership`, `contrast`, `overlap` — §03 §D). The
   contract asks the model for the relationship *before* the block, which is `ppt-master`'s own
   topology decision and is the single highest-leverage prompt structure here: models pick
   "timeline" correctly far more often when first asked "is this ordered, or is it a comparison?"
4. **Validation is mechanical and the failure message is actionable.** Unknown block type →
   suggest the nearest by keyword. Missing required slot → name it. Over budget → say by how much.
   Lint findings → name the rule and the part.
5. **A repair loop beats a better prompt.** P32 ships `validateDeckSpec()` returning structured
   findings designed to be fed straight back as a fix instruction. This is the cheapest quality
   lever in the entire plan, and it is worth more than any amount of prompt tuning.

### Example

```json
{
  "version": 1, "title": "Q3 Business Review", "theme": "mono-grid",
  "slides": [
    { "layout": "title-only", "role": "cover", "rhythm": "anchor",
      "regions": { "title": [
        { "type": "tls.c.cover", "props": {
            "kicker": "Q3 2026", "title": "Growth held, margin did not",
            "subtitle": "Business review", "meta": "15 September 2026" } } ] } },

    { "layout": "title-content", "role": "content", "rhythm": "dense",
      "regions": {
        "title":   [ { "type": "tls.t.title", "props": { "text": "Three numbers that moved" } } ],
        "content": [ { "type": "tls.d.kpi-row", "props": { "items": [
            { "label": "ARR",        "value": "$4.2M", "delta": 18 },
            { "label": "Net churn",  "value": "4.1%",  "delta": 0.6, "polarity": "inverse" },
            { "label": "Gross margin","value": "61%",  "delta": -3 } ] } } ] } },

    { "layout": "split-73", "role": "content", "rhythm": "dense",
      "regions": {
        "title": [ { "type": "tls.t.title", "props": { "text": "Margin fell on infrastructure" } } ],
        "major": [ { "type": "tls.d.column", "props": {
            "categories": ["Q1","Q2","Q3"], "series": [64, 64, 61], "highlightIndex": 2 } } ],
        "minor": [ { "type": "tls.t.takeaway", "props": {
            "text": "Compute spend grew 2.4× while revenue grew 1.2×." } } ] } }
  ]
}
```

Three slides, zero coordinates, zero colors, zero font sizes — and it renders identically in the
editor, in a thumbnail, in a PNG and (once P21 lands) on a server.
</content>
