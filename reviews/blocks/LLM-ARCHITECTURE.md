# LLM architecture — from a brief to a reviewed deck

**Date:** 2026-09-17 · **Status:** proposal · **Companion to:** [BACKLOG-enhance.md](BACKLOG-enhance.md)
(the frontend/block work it depends on) and [guides/blocks-authoring.md](../../guides/blocks-authoring.md) §3
(the minimal loop). This document is the backend design: how a FastAPI service turns an outline
into slides of the right *kind* for the right *audience*, what it saves at each step, how it works
with the model without wasting tokens or trust, and how the model reviews its own output before a
person sees it.

Contents: §1 principles · §2 what is saved (the state machine) · §3 deck profiles (the
categories) · §4 the pipeline, stage by stage · §5 self-review · §6 working with the model — the
tricks that matter · §7 tech stack · §8 API · §9 data shapes · §10 evaluation · §11 rollout order
and what each stage needs from the frontend backlog · §12 later enhancements.

---

## 1. Principles

1. **The model decides content and choice of block; code decides geometry, color and timing.**
   The model never emits coordinates, hex colors or millisecond values. It emits `regions`,
   color *roles*, motion *presets* and `order`/`trigger`. Everything numeric is derived by
   `compileSlide`, `resolveColor` and `slideTimeline`. This is what keeps output editable and
   theme-switchable.
2. **Deterministic checks before model checks.** `validateDeckSpec`, capacity/overflow, contrast,
   density budgets, pacing — all run in code, produce structured findings, and gate the pipeline.
   The model is asked to *judge* only what code cannot: message clarity, hierarchy, whether the
   slide says one thing.
3. **Save every intermediate as its own versioned object.** Outline, plan, draft, review, final.
   Each is small, human-editable and re-runnable. The cheapest place to fix a deck is the outline;
   the most expensive is after render. The UI puts the person at the cheap points.
4. **The catalog is generated, never written.** `capabilityDigest()` and `deckSpecJsonSchema()`
   are built from the block registry at request time (cached per package version). Adding a block
   in the frontend changes the model's vocabulary on the next request with no prompt edit.
5. **Author and critic are separate calls with separate prompts.** A model grading its own
   just-written output in the same context agrees with itself. The critic gets the rendered
   image, the JSON and a rubric — not the author's reasoning.
6. **Ids are stable across revisions.** The model works on `key`s it can see; the backend owns
   `id`s. A revision replaces slides by id so the editor's history, comments and a person's
   manual edits survive.

---

## 2. What is saved — the state machine

```
brief ──▶ INTAKE ──▶ OUTLINE ──▶ PLAN ──▶ DRAFT ──▶ REVIEWED ──▶ PUBLISHED
             │          │          │        │           │             │
          profile    outline    deckPlan  DeckSpec   ReviewReport   DeckVersion
          (saved)    (saved,    (saved,   v1 (saved  + DeckSpec v2  (immutable)
                     editable)  editable) as version) (saved)
                                                                     │
      editor Save ──▶ new DeckVersion (source: "editor") ◀───────────┘
      "revise" ──▶ takes the LATEST version (possibly editor-made) ──▶ new DRAFT
```

| Object | Written by | Editable by a person | Re-runs from here |
|---|---|---|---|
| `Brief` | user | yes | everything |
| `DeckProfile` | intake (model) or user pick | yes (a dropdown) | outline onward |
| `Outline` | S1 | **yes — the primary review point** | plan onward |
| `DeckPlan` | S2 | yes (advanced users; swap a block type) | fill onward |
| `DeckVersion` (a `DeckSpec` + metadata) | S3, S4, S5, editor | via the editor | review, revise |
| `ReviewReport` | S4 + S5 | no (read-only findings) | — |
| `GenerationTrace` | every stage | no | — (evals read it) |

Rules:

- Versions are **append-only**. "Restore" copies an old version forward as a new one.
- Every `DeckVersion` records `source: 'generate' | 'repair' | 'review' | 'editor' | 'revise' | 'restore'`
  and `parentVersionId`, so the history is a tree and "what did the model change" is a diff
  between two versions.
- The editor's PUT (`/api/decks/:id`) creates a version with `source: 'editor'`. Revise always
  starts from the latest version — the person's edits are the ground truth the model must respect.
- A `GenerationTrace` row per model call: stage, model, effort, prompt hash, cached tokens, output
  tokens, latency, stop reason, the findings that call produced or fixed. Without this you cannot
  run §10.

---

## 3. Deck profiles — the categories

A **profile** is a JSON object that the prompt, the planner, the validator and the critic all read.
It is the single place where "a teaching deck" is defined. Profiles are data, not code, so a
product manager can add one.

```ts
interface DeckProfile {
  id: string                          // 'teach-lecture'
  name: string
  audience: string                    // one sentence, given to the model verbatim
  goal: 'inform' | 'teach' | 'persuade' | 'report' | 'inspire' | 'decide'
  density: { wordsPerSlide: [min, max]; bulletsPerList: [min, max]; maxBlocksPerSlide: number }
  structure: { opener: SlideRole[]; body: SlideRole[]; closer: SlideRole[]; sectionEvery?: number; recapEvery?: number }
  layouts: { allowed: string[]; preferred: string[]; maxConsecutiveSame: number }
  blocks: { families: BlockFamily[]; prefer: string[]; avoid: string[] }
  motion: { profile: 'none' | 'minimal' | 'stepwise' | 'expressive'; buildStepsPerSlide: [min, max] }
  theme: { candidates: string[]; aspect: '16:9' | '4:3' | '9:16' }
  notes: 'none' | 'brief' | 'script'          // speaker notes depth
  evidence: 'optional' | 'required'           // every claim needs a source line
  language: { code: string; register: 'formal' | 'neutral' | 'casual' }
  rubricWeights: Record<CritDimension, number> // §5
}
```

### 3.1 The initial set

"Layout & block mix" names **recipe ids** from `packages/tldraw/src/blocks/recipes.ts` (AC0): each
recipe is a real `SLIDE_LAYOUTS` id plus tier-1 blocks per region, proven clean by
`recipes.spec.ts`. Before AC0 this column named `title-body`, `hero`, `big-stat`, `image-full`,
`bullets` and `steps` as layouts; none of them is a layout id (`ai-curation/README.md` F9).

| Profile | Who asks for it | Density (words/slide) | Layout & block mix | Motion | Distinguishing rules |
|---|---|---|---|---|---|
| **teach-lecture** | teachers, trainers; students follow along | 60–120 | `content-bullets-image`, `content-cards`, `process-steps`, `content-image-text`, definitions as `tls.t.takeaway`; `section-divider` every 4–6 slides, a **recap** every section (`tls.c.recap`, tier 2, promoted) | `stepwise` — bullets reveal one by one, 2–5 build steps | numbered structure, a learning objective on slide 2, worked example before exercise, "check your understanding" slide per section, speaker notes as a script, evidence required for facts |
| **keynote-pitch** | founders, speakers; a visual talk | 5–25 | `cover-hero`, `cover-kinetic`, `data-big-stat`, `content-statement`, `quote-pull`, `data-kpi-row`; photo slides via `tls.c.cover` `variant=bleed` until AC6 ships `tls.c.image-full`; one idea per slide | `expressive` — hero reveals, count-ups, 1–2 steps | title never a full sentence, no bullets over 3 items, at least 40% slides with a visual block, a "one-liner" closing slide |
| **business-report** | managers; QBR, status, board | 30–70 | `data-chart-insight`, `data-bar-takeaway`, `data-kpi-row`, `comparison-options`, `agenda-full`, `process-timeline`, `data-table` | `minimal` — chart bars grow, else none | every chart has a takeaway block, numbers carry units and period, agenda + summary mandatory, consistent number formatting, evidence required |
| **workshop-training** | facilitators; interactive sessions | 20–60 | `agenda-full`, `process-steps`, `content-bullets-image`, exercise slides (`two-column`: `tls.t.takeaway` + `tls.t.bullets`), timeboxes | `stepwise` | timing per section in the notes, an exercise every 3–5 slides, instructions as imperative steps |
| **academic-seminar** | lecturers, researchers | 50–110 | `content-bullets-image`, `comparison-options`, `content-image-text` for figures, `quote-pull` for definitions, `data-table` (table + footnote source) | `minimal` | citations block on each evidence slide, references slide, figure captions with source |
| **sales-product** | sales, product marketing | 15–45 | `cover-hero`, `content-feature-grid`, `comparison-options`, `comparison-pricing`, `people-testimonial`, `data-kpi-row`, `closing-centered` (CTA) | `expressive` | problem → solution → proof → ask order enforced, one CTA slide, social proof present |
| **status-update** | team leads; weekly/monthly | 30–60 | `agenda-full`, `data-kpi-row`, `process-timeline`, `tls.t.bullets` with owner tags, `comparison-options` for plan vs actual | `none` | RAG status per item, dates absolute not relative, next-steps slide mandatory |
| **story-portfolio** | designers, creators | 5–30 | `content-image-text`, `cover-split-image`, `quote-pull`, `cover-hero` (`tls.c.image-full` after AC6) | `expressive` | image-led, text is captions, theme from the person's brand kit if given |

Two axes summarise the table and are what the intake step actually classifies:

- **Density** (how much the audience reads on the slide): *dense* (teach, academic) → *medium*
  (report, workshop, status) → *sparse* (keynote, sales, story).
- **Register** (what the deck is for): *learn* / *decide* / *persuade* / *inspire*.

Everything else in a profile is a consequence of those two, plus domain rules.

### 3.2 Profiles feed four places

1. **Prompt**: `audience`, `goal`, `density`, `structure`, `notes` are rendered into the system
   prompt for S1–S3, and the **digest is filtered** to `blocks.families` + `layouts.allowed`, which
   cuts catalog tokens by half or more for sparse profiles.
2. **Validator**: `validateDeckSpec(spec, registry, { profile })` gains profile rules —
   `density/over-budget`, `layout/monotony` (more than `maxConsecutiveSame`), `structure/missing-recap`,
   `evidence/missing-source`, `motion/over-budget`. All deterministic, all with `path` and a
   `message` the model can act on.
3. **Critic**: the rubric weights (§5) — legibility matters more for teach, hierarchy and
   impact for keynote.
4. **Theme picker**: `theme.candidates` restricts the built-in theme ids the model may choose.

---

## 4. The pipeline

Each stage is one function with a typed input and output, one or more model calls, and a save. A
stage can be re-run alone. Models below are recommendations; the trace (§2) makes changing them a
measured decision rather than a guess.

### S0 · Intake — brief → profile, constraints, questions

**Input**: free-text brief, optional attachments (PDF, docx, URLs, an existing deck), optional
explicit profile. **Output**: `{ profile, audience, slideCountTarget, language, theme?, aspect,
assumptions[], questions[] }`.

- One structured-output call. The model picks a profile from the list (with the two axes as
  fallback when nothing fits), extracts hard constraints (slide count, duration, language,
  brand), and returns **at most three** questions it genuinely cannot proceed without. Everything
  else becomes a stated assumption the UI shows and the person can flip.
- Attachments go in as `document` blocks with citations enabled; the extracted **source
  passages** are saved so later stages cite them rather than re-reading the PDF.
- Duration → slide count: teach ≈ 1.5–2 min/slide, keynote ≈ 1 min/slide, report ≈ 2–3
  min/slide. Store the formula with the profile.
- **Style pick (AC7).** The deck's look is a `DeckStyle` (`BUILT_IN_STYLES`), chosen by the
  person in the UI style picker; the default is the profile's style candidates (first entry).
  The model never invents one. S0 outputs `style` (a style id) and `theme` (one of that style's
  palette ids; the first is the style's default), saved as `DeckSpec.style` / `DeckSpec.theme`
  and passed to every later stage. Styles are orthogonal to profiles: the profile decides
  density and structure, the style decides the look. The ten ids, by family:

  | Family | Style ids (palettes) |
  |---|---|
  | Premium | `luxury` (luxury-noir, luxury-ivory), `minimal` (minimal-white, minimal-stone), `editorial` (editorial-ink, ivory-editorial) |
  | Modern | `gradient` (gradient-night, gradient-dawn), `glass` (glass-violet, glass-pastel), `swiss` (swiss-red, swiss-blue) |
  | Playful | `doodle` (doodle-paper, doodle-kids), `memphis` (memphis-pop) |
  | Corporate | `corporate` (corporate-navy, midnight, mono-grid), `consulting` (consulting-ink) |

  (The `family` field in code reads `premium`, `modern`, `playful` and `professional`.) A UI
  that has no picker passes no style and gets today's unstyled behaviour.

### S1 · Outline — the thing a person reviews

**Output**: `Outline = { title, sections[{ title, purpose, slides[{ key, role, headline,
keyMessage, evidenceNeeded[], notesHint }] }] }`.

- `headline` is the slide's future title (short); `keyMessage` is the one sentence the slide must
  make the audience believe or know. Asking for these separately is the single most effective
  prompt trick in this pipeline: it forces one idea per slide before any block exists.
- `role` comes from the profile's `structure` (opener, objective, section, content, data,
  exercise, recap, quote, summary, closing, references). The validator checks the structure
  rules on the outline, not later.
- Effort `high`; this is where quality is decided and it is the cheapest stage in tokens.
- **The UI stops here by default.** Reordering, merging and rewording outline items is a text
  edit; regenerating from an edited outline costs one plan + one fill.

### S2 · Plan — pick layouts and blocks per slide (two-tier digest)

**Output**: `DeckPlan = { theme, slides[{ key, layout, regions: Record<string, { type, why }[]>,
motion: { profile, order[] } }] }` — types and reasons, **no props yet**.

The block catalog is too large to show in full on every call (about 129 blocks at the end of the
block-library plan, far past a sensible prompt budget), so S2 runs in two sub-steps over a
two-tier digest. Both tiers are generated from the live registry
(`packages/tldraw/src/blocks/capability-digest.ts`), never hand-written.

- **S2a · Pick.** Input is the outline slide, the profile, the plan of the previous two slides
  (for rhythm) and the **catalog index** (`capabilityIndex()` as markdown or
  `capabilityIndexData()` as JSON). The index is small (about 100 chars per block, at most 20k
  chars for the whole catalog, enforced by `capability-digest.spec.ts`): the picking rule, the
  scope rules, then one line per block grouped by category,
  `type · category · scope · item range — shortDescription`. The model first names the
  **relationship in the content** (dated, ordered, options against each other, numbers with axes,
  headline numbers), which selects a category, then picks block types from that category. It
  returns block *types* per region with a one-line `why`, plus a shortlist of any other types it
  wants detail for. Callers may narrow the index up front by profile
  (`capabilityIndex(reg, { categories, scopes })`), e.g. a lecture profile hides `brand`.
- **S2b · Detail for the shortlist.** For the types named in S2a, the planner (or the fill stage
  directly) loads `capabilityDigest(reg, { types })`: full slot tables, `when`/`avoid` and a
  compact example for those blocks only (at most 12k chars for any 8 types). Layout region
  tables, colour roles, style and motion vocabulary stay in the unfiltered
  `capabilityDigest(reg)`, which is still available but is no longer size-capped by a test.
  With a deck style, "this style sets: <blockDefaults>" is appended to the detail of each
  shortlisted type (the `blockDefaults` entry for that type from the style card's "Already set by
  the style" line): the model must not repeat those knob values, and a knob it sets itself wins.
  If the detail shows that a pick does not fit (the item count is outside the range, or `avoid`
  names a better sibling listed in `related`), the model may swap the type once before fill.
- **Tier 1 + recipes (AC0).** S2a's default input is now the curated index
  `capabilityIndex(reg, { tier: 1, roles?, profile? })` (≤ 16k chars, snapshot in
  `capability-digest.spec.ts`): the same header, then the **recipes** for the slide's role(s)
  (`RECIPES` in `blocks/recipes.ts`: `id · layout — region: blocks — when`, each a known-good
  slide that `analyzeSlide` reports clean with example content), then per category the ~45
  tier-1 blocks as full lines with a `knobs:` hint (`BlockDefinition.looks`, the enum/boolean
  slots that change the look) and the tier-2 blocks as one `also:` line of bare names the model
  may still shortlist. `profile.prefer` promotes tier-2 types to full lines, `profile.avoid`
  drops types and the recipes that use them (AC1's deck style feeds the same shape). The model
  picks a recipe first, keeps its layout and regions, then swaps a block only when the content's
  relationship demands it. `capabilityIndexData(reg, { tier: 1 })` returns the same set as JSON
  with `aiTier`, `looks`, `absorbs`; `RECIPES` / `recipeSlide()` are exported for the backend.
  The unfiltered `capabilityIndex(reg)` (all 129 blocks, ≤ 20k) is unchanged.
- **Style-aware S2a (AC7).** With a deck style the S2a prompt is three things, all generated
  from the live code: the **style card** (`styleCard(style)`, about 0.9-1.1k chars), the
  **recipes for the slide's role** (`recipesFor(role)` or the `## Recipes` section of the index,
  one `recipeLine` each) and the **style-filtered tier-1 index**
  (`capabilityIndex(reg, { tier: 1, style, roles })`). A style's `avoid` drops the types from the
  index and every recipe that uses them; its `prefer` promotes tier-2 types to full lines.
  Real output for `corporate`, trimmed:

  ```text
  ## Style: corporate — Corporate
  Clean business deck: white slides, navy text, one blue accent, small radii, numbers and charts first. ...
  Palettes (write one as `theme`): corporate-navy, midnight, mono-grid (first = default).
  Fonts: Inter / Inter (text width vs Inter: heading ×1.00, body ×1.00). Motion: subtle (deck default).
  Rules: Every chart or table has a one-line takeaway. Consistent number formats across a slide. One accent use per slide; no decoration.
  Prefer: tls.g.roadmap, tls.c.dashboard
  Avoid: tls.c.kinetic-title, tls.m.decoration, tls.m.pattern
  Already set by the style (do not repeat): tls.c.cover(variant=centered,decoration=none) tls.c.divider(variant=field,align=start) ...
  ```

  ```text
  ### data
  data-chart-insight · timeline+title — timeline: tls.c.chart-insight(insightSize=lead) — one chart, takeaway and source
  data-kpi-row · timeline+title — timeline: tls.c.kpi-row(tile=card) + tls.t.takeaway(size=lead) — 2–5 headline KPIs and what they mean
  data-table · timeline+title — timeline: tls.d.table + tls.t.footnote — exact values in rows, with a source
  ```

  ```text
  ## Metric
  tls.c.kpi-row · metric · group · 2–5 items — Equal-width row of KPI tiles [h 150–260@544] knobs: tile, gap
  also: tls.c.dashboard, tls.c.kpi-tile, ...
  ```

  The model picks a recipe, keeps its layout and regions, swaps content, and turns knobs. The
  backend gives it one recipe id per slide plus `why`; the deterministic post-check rejects an
  id outside `recipesFor(role)` filtered by the style. The reference implementation of this pick
  (without a model) is `tools/layout-report/dry-run.js`: it rotates through the role's eligible
  recipes, `eligibleRecipes(role, style, registry)` in `blocks/pipeline/dryRun.ts`.

  **Measured prompt budget** (dry run, chars; target = ai-curation README §5.2; the index is the
  tier-1 index with `{ style }`, the card is `styleCard`; "header" is the index preamble plus its
  one-line `## Styles` section):

  | Section | Target | Measured (10 styles) | Verdict |
  |---|---|---|---|
  | Header (picking, scope, size, layer, motion rules) | ~1.2k | 2,430-2,503 | over: the layer, size and motion lines were added after the target was set |
  | Style card | <= 1.2k | 897-1,118 | within |
  | Recipes, all 10 roles | <= 3k | 3,819-4,055 | over; with the slide's own role only: 935 (`content`, the largest) |
  | Tier-1 lines (45 + bento, image-full) | ~7k | 6,649-7,493 | around the target; doodle, consulting, gradient and editorial a little over |
  | Tier-2 names | <= 1.5k | 1,315-1,389 | within |
  | Icons | ~1.3k | 796 | within |
  | **Total, all roles** | **<= 16k** | **16,219-17,100** | **over by 219-1,100** |
  | **Total, slide's own role** | <= 16k | 13,315-14,087 | within |

  The 16k ceiling holds when S2a sends only the slide's own role's recipes
  (`roles: [role]`), which is what the backend should do: a slide has one role, and the saving
  (2.9-3.1k) is larger than the overshoot. The full index with all roles is for the one-shot
  planner. `dry-run.spec.ts` asserts the per-role total.

- **Fill** (S3) then proceeds per slide with only the detail of that slide's blocks.

- Separating plan from fill matters for three reasons: a wrong block choice is cheap to fix
  here; the fill stage can then run per slide in parallel with a small prompt; and the `why`
  is what a user sees when they ask "why a chart here?".
- Deterministic post-checks: every `type` exists in the registry, every region name exists in the
  layout, `maxConsecutiveSame` holds, density budget is plausible from the block mix, and no
  `slide`-scope block shares a region with other content (the validator also warns with
  `block/scope-nested` when a slide-scope block is nested inside another block). Failures go
  back as findings in the same call chain (one repair round, then fall back to the profile's
  `preferred` layout).

### S3 · Fill — props per slide, in parallel

**Output**: `SlideSpec` per slide, assembled into `DeckSpec` v1.

- One call per slide (fan-out; a 20-slide deck is 20 concurrent calls, each with a prompt of
  profile + that slide's outline item + its plan + the schemas of *only the blocks it uses* +
  the relevant source passages).
- **Structured output against the generated JSON Schema**, narrowed to the slide's block types
  (`deckSpecJsonSchema(registry, { types })`). The model cannot produce an unknown field or an
  extra region. With the Python SDK this is `client.messages.parse(..., output_format=SlideModel)`
  on Pydantic models generated from the same schema (§7).
- The prompt carries the slot `guidance` from the digest verbatim and the density budget as
  numbers. It also carries the **two neighbouring slides' headlines** so transitions read
  naturally, and one golden example slide of the same layout from the same profile.
- The model outputs `key`s; the backend assigns `id`s (`sl_03`, `b_03_title`) deterministically
  from keys so re-runs produce the same ids.
- Effort `medium` is usually enough here; measure per profile.
- **Per-style size cards (AC7).** The height hints the fill stage gets for the chosen types are
  sampled with the deck's style (its default palette or `theme`, its tokens and its knob
  defaults), not with the default theme:
  `node tools/layout-report/cli.js --metrics --style <id> [--theme <palette>] [--types a,b]`
  (the same data as `buildBlockMetrics(reg, { tokens, blockDefaults })`). A style with another
  type scale or font changes heights, so use these cards, not the committed
  `__generated__/block-metrics.json`, for a styled deck.

### S4 · Deterministic checks and repair

Run, in order, collecting `DeckFinding[]`:

1. `validateDeckSpec(spec, registry, { profile })` — schema, unknown types, missing required
   slots, region names, budgets, structure rules.
2. `compileSlide` per slide → `region/overflow` and `capacity()` findings (text that does not fit).
3. Contrast: `resolveColor` results below the floor on any block.
4. `slideTimeline` → `motion/over-budget` when a slide's `totalMs` exceeds the profile budget.
5. Consistency: number formats, date formats, capitalisation of headlines — regex rules per
   language.

**Repair** is a **patch call**, not a regeneration: the model receives the failing slides only,
each with its findings, and returns replacement `SlideSpec`s for those keys. Two rounds maximum;
a slide still failing after that is flagged in the report and rendered with the fallback layout
so the deck is never broken. Every repair round is one version (`source: 'repair'`).

### S4.1 · Layout oracle loop — geometry without screenshots (LO3/LO4)

Design and status: [layout-oracle/README.md](layout-oracle/README.md). Every block's look is a
pure `layout()` tree with real Inter glyph metrics, so whether content fits, overlaps or runs
off the frame is *computed* in Node, in milliseconds. A screenshot is taken only for what the
report itself flags as uncertain.

```
S2 plan ── reads size cards (index hints `[h≈…]`, full cards on demand)
   │
S3 fill ── DeckSpec
   │
   ▼
analyze (CLI / exported analyzeDeck, ~5-20 ms/slide)
   │ findings with severity error|warning ──► repair call with formatLayoutReport text
   │                                           (failing slides only) ──► analyze again
   │                                           max 2 rounds (same budget as S4 repair)
   ▼ clean, or rounds exhausted
screenshot only slides whose report.needsVisualCheck is non-empty (S5 critic)
```

**1. Planning — size cards.** `buildBlockMetrics()` is sampled from `measureBlock`, never
authored. The committed copy is `packages/tldraw/src/blocks/__generated__/block-metrics.json`
(also `node tools/layout-report/cli.js --metrics [--types a,b] [--theme <id>]`; the committed
cards use the default theme, `--theme` samples them with a deck theme's type scale). The capability
index carries a terse hint per block: `[h≈0+104/L@840]` (base + per line of the main text, at width
840), `[h≈-18+59/item@840]` (per list item), `[h≈43@840]` (fixed), `[h 164–222@840]` (poor linear
fit: the sampled range — the card's `samples` then lists every measured `[x, height]`), `[h=fill]`
(takes whatever height it is given). `atMin: {h, fits}` is the example in exactly its `size.min`
box (LO8). Smoke test of the built package as a plain-node consumer:
`node tools/layout-report/smoke-dist.js` (after `build:packages`). The planner turns text into
lines with `lines ≈ ceil(chars / (0.85 · cpl))` (cpl from the card; the 0.85 absorbs word-wrap
loss and errs on the long side). One card (one JSON line per block):

```json
"tls.t.callout": {"kind":"layout","scope":"element","category":"emphasis","layer":"content",
  "size":{"preferred":[800,200],"min":[480,180]},"fill":false,
  "text":{"title":{"fontSize":28,"lineHeight":40.6,"cpl":[101,46,27]},
          "text":{"fontSize":28,"lineHeight":40.6,"cpl":[100,45,26]}},
  "model":{"var":"lines","slot":"text","at":{
     "544":{"base":98,"per":40.4,"err":1,"x":[1,4],"h":[138,259]},
     "840":{"base":97,"per":40.5,"err":1,"x":[1,5],"h":[138,300]},
     "1728":{"base":97,"per":40.5,"err":1,"x":[1,3],"h":[138,219]}}},
  "confidence":"high"}
```

Shape (`BlockMetricsFile`): `{version:1, theme, metrics:"table", widths:[1728,840,544],
blocks:{[type]: {kind, scope, category, layer, size:{preferred,min,aspect?}, fill,
text:{[slot]: {fontSize, lineHeight, cpl:(number|null)[]}}, model: null | {var:"lines"|"items"|"fixed",
slot?, at:{[width]: null | {base, per, err, x:[min,max], h:[min,max], poor?:true}}},
confidence:"high"|"medium"|"low", note?}}}`. `cpl`/`at` entries follow `widths`; `null` = below
the block's min width, fills its box there, or unmeasurable. Other props keep the block's
`describe.example` values, so an `items` model assumes example-length items. Numbers are for
the default theme; a theme with a larger type scale needs the oracle, not the card.

**2. Checking — the report.** FastAPI calls the CLI as a subprocess (or a Next.js route that
imports `analyzeDeck`/`formatLayoutReport` from `@tlslides/tldraw`):

```bash
node tools/layout-report/cli.js deck.json --format json          # whole deck, JSON
node tools/layout-report/cli.js deck.json --slide sl_05 --no-map # one slide, prompt text
cat deck.json | node tools/layout-report/cli.js - --format json  # stdin
```

JSON received: `{deck, slides: LayoutReport[], summary:{slides, errors, warnings,
needsVisualCheck: slideId[]}}`. `LayoutReport = {slideId, layout, frame, metrics, regions,
blocks: BlockReport[], findings: LayoutFinding[], margins, freeSpace, needsVisualCheck: {blockId, reason}[]}`;
`LayoutFinding = {code, severity:"error"|"warning"|"info", blockIds, message, fix?}`; `BlockReport`
has `id, path, type, region, layer, z, box, natural, elastic, painted, contentOverflow, text[],
capacity?, confidence`. Exit status 0 = report printed (findings do not change it), 2 = bad input.
Measured: 0.3-0.8 s per call for a whole fixture deck (8-46 slides), most of it bundling.

**3. Fixing — the prompt.** Only slides with an `error` or `warning` go back, as
`formatLayoutReport` text (≤ 2.5k chars a slide with the map; `--no-map` for a tighter prompt):

```text
The slide below does not fit. Return a replacement SlideSpec for slide sl_05 only (JSON, nothing
else). Apply each FIX; prefer shortening text over changing blocks, and changing blocks over
changing the layout. Keep ids.

SLIDE sl_05 layout=quote frame=1920x1080 metrics=table | 2 blocks | 0 errors, 2 warnings
regions: quote 355,427 1210x140 | attribution 355,615 1210x38
blocks (box x,y wxh; nat = painted content size at box width; fill = sizes to its box):
A b_05_quote tls.t.quote @quote 355,427 1210x237 fill | text 2L×52 ~61c/L, attribution 1L×41 ~91c/L
B b_05_cap tls.t.caption @attribution 355,688 1210x33 nat 274x31 | text 1L×31 ~123c/L
findings:
W region/overflow Block "b_05_quote" measures 237 slide units tall, exceeding the "quote" region height of 140 slide units. FIX: shrink b_05_quote by 97 units (…): cut `text` to ≤ 1 line (~61 chars/line, ≤ 61 chars; now 2 lines, 67 chars)
W region/displaced b_05_cap was moved out of its region `attribution` (y 615-653) to y 688 by the compiler's region re-flow. FIX: fix the overflow of region `quote`; b_05_cap then returns to `attribution`
margins t459 r432 b361 l355 | free 89%

Current SlideSpec: {…}
```

Stop when a slide has no `error`/`warning`, or after **N = 2** repair rounds (then keep the best
round by error count and flag the slide). `info` findings (`text/shrunk`, intended layering) never
trigger a round; nor do the LO5b composition hints (`layout/unbalanced`, `region/empty` — info,
each with a numeric fix — and `layout/crowded`, a warning), which a planner may still act on. Then
screenshot only `summary.needsVisualCheck` slides. Per block the report says why (LO5, calibrated
against Chromium): confidence ≠ high (html-kind blocks measured from their poster, ±5% height;
hosts without one), the editor wraps/paints the text differently from its true width (the editor
still lays out with `estimateMetrics`), or painted content ends within the calibrated error margin
of the frame edge / the next block. On the fixtures that is 21 of 95 slides.

**Reference implementation (AC7).** `tools/layout-report/dry-run.js` runs S2a → S3 → S4.1 for
all ten styles without a model: a fixed 12-slide outline, a deterministic recipe pick per slide,
the headline written into the recipe's title slot, `analyzeDeck`, then at most three repair
rounds (next eligible recipe for the role, then a shorter headline), and it measures the S2a
prompt per section. The logic is the pure module `packages/tldraw/src/blocks/pipeline/dryRun.ts`
(`runDryRun`, `eligibleRecipes`, `fillSlide`, `measurePrompt`); port its shape, not its picker.

### S5 · Render and review — the critic

Detailed in §5. Output: `ReviewReport` + optionally `DeckSpec` v2 (`source: 'review'`).

### S6 · Enrichment (parallel, cheap, optional per profile)

Speaker notes to the profile's depth, alt text for every image block, a summary slide if the
structure demands one and the outline did not include it, a translated copy if requested. These
are per-slide calls that never change layout; run them through the Batches API when the deck is
not being watched live (half price, no rate-limit pressure).

### S7 · Publish

Mark the version `published`, render thumbnails, compute and store `slideTimeline` per slide
(the viewer's auto-advance and any voice-over alignment read these numbers rather than
recomputing).

### Revise (any time later)

Input: the latest version (which may contain a person's edits), an instruction, optionally a
slide selection. The model receives **the instruction, the affected slides' current JSON, and the
outline entry for each** — not the whole deck unless the instruction is deck-wide ("make it
shorter") — and returns replacements by id. Then S4 and S5 run on the changed slides only.

---

## 5. Self-review — how the model checks its own work

### 5.1 Why render first

The JSON tells the critic what the author *meant*; the pixels tell it what the audience *sees*.
Overlapping text, a chart whose bars are unreadable at 61 vs 64, a title that wrapped into four
lines — none of these are visible in JSON and all of them were present in the demo. The critic
gets both: the PNG of the slide at 960 px wide and the slide's `SlideSpec`.

Rendering headlessly is `renderNodeToSvg` → PNG in the Node sidecar (R14 makes the page-level
exporter draw blocks). Until R14 lands, the critic runs text-only on the JSON plus the
deterministic findings — useful but blind to the class of bug that motivated this section.

### 5.2 The rubric

Six dimensions, each scored 1–5 with a one-line justification, weights from the profile:

| Dimension | Question the critic answers | Weight: teach | keynote | report |
|---|---|---|---|---|
| **Message** | Can you state this slide's one point in a sentence? Is it the outline's `keyMessage`? | 3 | 3 | 3 |
| **Hierarchy** | Does the eye land on the most important element first? | 2 | 3 | 2 |
| **Legibility** | Is every text readable at the back of the room? Any overlap, clipping, wrapping into 4+ lines? | 3 | 2 | 2 |
| **Density** | Right amount of content for the audience and profile? | 3 | 3 | 2 |
| **Evidence** | Are numbers sourced, charts labelled, claims supported? | 2 | 1 | 3 |
| **Consistency** | Same terminology, number format, tone, layout rhythm as neighbours? | 1 | 2 | 3 |

**Per-style lines (AC7).** The critic gets the deck style's `rules` (the style card's "Rules"
line) and the checks below on top of the six dimensions. They come from each style's `rules` /
`avoid` in `packages/tldraw/src/blocks/styles/*.ts`:

| Family | Style | Check the critic adds |
|---|---|---|
| Premium | `luxury` | Count accent uses: at most one per slide. At most 40 words per slide. Images full-bleed or absent; no scatter, bubble or heatmap charts, no tag pills. |
| | `minimal` | One idea per slide; white space dominates. Grey and black only, an accent on one word at most; no decoration or pattern blocks. |
| | `editorial` | Kicker, title, rule: type carries the page. A pull quote beats a bullet list. No glass, orbs, pills or gradients. |
| Modern | `gradient` | Dark first, one glow per slide; headlines short and big; lists as cards, not bare text. |
| | `glass` | Content sits on glass cards over the glow, never bare on the background. At most three chart series; no tables. |
| | `swiss` | Everything flush left on an asymmetric grid; red for one thing per slide. No blobs, orbs, gradients or centred text. |
| Playful | `doodle` | Short friendly sentences; one motif per slide, in the margin. Icons and pictures over dense text; no tables or scatter. |
| | `memphis` | At most three motifs per slide, never over text. Flat bright colours with black outlines; short punchy headlines; no tables. |
| Corporate | `corporate` | Every chart or table has a one-line takeaway. Number formats consistent across a slide. One accent use per slide, no decoration. |
| | `consulting` | The title is an action title: one full sentence that states the insight. A source on every data slide. One message per slide. |

Plus a **deck-level** pass on the contact sheet (all slides as a grid): rhythm, repetition,
whether the story arc matches the profile's structure, whether the opening and closing carry
their weight.

### 5.3 The critic's output is patches, not prose

```ts
interface ReviewReport {
  deckScore: number
  slides: Array<{
    slideId: string
    scores: Record<CritDimension, { score: 1|2|3|4|5; note: string }>
    worst: string                       // required: the single most damaging problem
    issues: Array<{
      severity: 'block' | 'should' | 'nice'
      blockId?: string
      problem: string
      fix: { kind: 'replace-slide' | 'replace-block' | 'set-prop' | 'reorder' | 'drop' ; payload: unknown }
    }>
  }>
  deck: { arc: string; rhythm: string; issues: [...] }
}
```

Forcing `worst` avoids the reviewer that lists ten cosmetic nits and misses that the slide says
nothing. `fix` is applied by the backend through the same S4 validator — a fix that introduces a
finding is rejected and logged.

### 5.4 The loop and its stop conditions

```
draft v1 ─▶ S4 findings ─▶ repair ─▶ v1' ─▶ render ─▶ critic ─▶ report r1
   apply 'block' + 'should' fixes ─▶ S4 ─▶ v2 ─▶ render ─▶ critic ─▶ r2
   keep the better of (v1', v2) by weighted score; stop.
```

- **Maximum two critic rounds.** Measured on comparable pipelines, the second round captures
  most of the gain; a third mostly re-words. Budget is a property of the profile, overridable per
  request.
- **No-regression rule**: a version is kept only if its weighted score is ≥ the previous one and
  its deterministic finding count is ≤. Otherwise the previous version stands and the report says
  what the critic wanted and why it was not applied.
- **Author ≠ critic**: different system prompt, no shared context, the critic never sees the
  author's `why`. Using a different model for the critic is optional; the separation of prompts
  is what matters. If the team wants a second opinion, run two critics with different rubric
  emphasis and take the intersection of `block` issues.
- **A person's edits are protected**: blocks whose last change came from `source: 'editor'` are
  read-only for the critic (it may flag, not fix).

### 5.5 Calibrating the critic

The critic is only useful if its scores track human judgment. Keep a set of 30–50 slides with
human scores (three raters, median) per profile; run the critic on them on every prompt change
and every model change; require Spearman ≥ 0.6 on `Message` and `Legibility` before a critic
prompt is promoted. This set is also the negative test for over-editing: slides humans rated 5
must receive no `block` issues.

---

## 6. Working with the model — the tricks that matter

Ordered by how much they change output quality per unit of effort.

1. **Outline first, one `keyMessage` per slide, and let the person edit it.** Half of bad decks
   are bad outlines rendered well.
2. **Separate plan from fill.** Choosing a block and writing its content are different skills
   with different context needs; combining them makes both worse and the prompt huge.
3. **Structured outputs against the generated schema, narrowed per call.** Never "return JSON";
   never a schema wider than the call needs. Unknown types and extra regions become impossible,
   not something to validate after.
4. **Give the model roles and presets, never numbers.** No coordinates (ban `free[]` in the
   prompt *and* strip it in the backend), no hex, no milliseconds. This is what makes the output
   theme-switchable and editable.
5. **Findings are the repair prompt.** `DeckFinding.message` is already written for the model;
   send the array, ask for replacements by key. Do not paraphrase findings into prose.
6. **Patch, don't regenerate.** Revision and repair return replacement slides by id. Keeps the
   person's edits, keeps ids, keeps cost proportional to the change.
7. **Cache the stable prefix.** Order the request as: system prompt (rules, profile) → digest →
   schema → golden examples → *then* the brief and slide. Put a cache breakpoint after the
   examples. The digest and schema change only when the package version changes; for a
   20-slide fill fan-out the prefix is written once and read 19 times. Verify with
   `usage.cache_read_input_tokens` in the trace; if it is zero, something volatile (a timestamp,
   an unsorted object, a per-request id) crept into the prefix.
8. **Few-shot from the same profile.** Two golden slides of the same layout and profile beat ten
   generic ones. The golden fixtures from R7 are this set; extend them per profile.
9. **Author and critic in separate calls with separate prompts** (§5.4).
10. **Effort per stage, adaptive thinking on.** Outline and critic at `high`; plan at `high`
    until the profile rules are stable, then `medium`; fill at `medium`; enrichment at `low`.
    Re-tune from the trace, per profile — do not set one global value.
11. **Stream long calls; give generous `max_tokens`.** Outline and deck-wide revisions can be
    long; a truncated JSON is a wasted call. Check `stop_reason` before parsing; treat
    `max_tokens` as a retry with a higher limit, `refusal` as a report to the user, never as
    silent empty output.
12. **Language-aware budgets.** Word counts mislead for Vietnamese and CJK; budget by characters
    per script and let the profile carry both. Diacritics also change metrics — the font table
    from R0 must include them.
13. **Sources as passages, not files.** Extract once at intake with citations; pass passages by
    id to fill and evidence checks. Never re-attach a 40-page PDF to twenty fill calls.
14. **Batch what nobody is waiting for.** Notes, alt text, translations, nightly re-reviews of
    published decks after a prompt change — Batches API, half price.
15. **Log every call.** Model, effort, prompt hash, cache hit, tokens, latency, findings before
    and after. §10 is impossible without it, and so is answering "why did this deck get worse
    last Tuesday".

---

## 7. Tech stack

| Concern | Choice | Why |
|---|---|---|
| API | **FastAPI** + Pydantic v2, Python 3.12 | the user's stated backend; async fan-out for S3 |
| Model access | **Anthropic Python SDK** (`anthropic`, 1.x) — `client.messages.parse` for structured outputs, `client.messages.batches` for S6, adaptive thinking on, `output_config.effort` per stage | first-party SDK; typed errors; caching and batches without extra code |
| Models | `claude-opus-5` for intake, outline, plan, critic and revise. Fill and enrichment are the cost lever: start on `claude-opus-5` at `medium` effort, measure, and move fill to `claude-sonnet-5` only if the trace shows equal acceptance | one model at lower effort usually matches a cascade and keeps a single cache namespace |
| Schema sharing | `deckSpecJsonSchema()` from the Node side → **`datamodel-codegen`** → Pydantic models checked into the FastAPI repo, regenerated in CI on every `@tlslides/tldraw` version bump | validation is never hand-ported; Python and TypeScript agree by construction |
| Block logic in Node | A small **Node sidecar** (`tlslides-headless`) exposing `/digest`, `/schema`, `/validate`, `/compile-findings`, `/timeline`, `/render/:slide.png|svg`; the Next.js sample's API routes are the reference implementation and can *be* the sidecar in small deployments | `validateDeckSpec`, `compileSlide`, `renderNodeToSvg` are TypeScript and must not be re-implemented |
| Storage | **Postgres** — `decks`, `deck_versions` (JSONB `spec`, `source`, `parent_version_id`), `outlines`, `plans`, `review_reports`, `generation_traces`; **object storage** (S3-compatible) for renders, assets and uploaded sources | versions are small JSON; renders are not |
| Jobs | **arq** or Celery on Redis; one job per stage, per-slide fan-out inside S3/S5/S6; idempotent by `(deckId, stage, inputHash)` | re-runs and retries must not duplicate versions |
| Progress to the UI | **SSE** from FastAPI (`/decks/{id}/events`): stage started/finished, slide n/N filled, findings count, review score; the Next.js app renders the outline as soon as S1 finishes | the person sees and can stop the run at the outline |
| Rendering to PNG | `renderNodeToSvg` → **resvg** (or Playwright as fallback) inside the sidecar | pure, fast, no browser in the request path |
| Observability | OpenTelemetry traces with the fields in §2; a dashboard per profile: acceptance rate, findings per deck, critic score, cost per deck | the numbers in §10 |
| Evals | A `briefs/` corpus per profile + golden decks + the human-scored critic set; runs in CI on prompt changes; report per profile | prompt changes are code changes |

Things deliberately not in the stack: an orchestration framework (the stages are seven typed
functions; a framework hides the trace), a vector database (sources are passages keyed by id and
decks are small; add retrieval only when a knowledge base of decks exists), and any
OpenAI-compatible shim.

---

## 8. API

Extends R16's table. All bodies and responses are JSON; long operations return `202` with a job
id and stream on `/events`.

| Method | Path | Body → Result | Stage |
|---|---|---|---|
| `GET` | `/profiles` | → `DeckProfile[]` | — |
| `GET` | `/capabilities?profile=` | → digest Markdown, filtered | — |
| `GET` | `/schema?types=` | → JSON Schema, narrowed | — |
| `POST` | `/decks` | `{ brief, attachments?, profileId? }` → `{ deckId, intake }` | S0 |
| `POST` | `/decks/{id}/outline` | `{ answers? }` → `Outline` | S1 |
| `PUT` | `/decks/{id}/outline` | `Outline` → `Outline` (person's edit) | — |
| `POST` | `/decks/{id}/plan` | → `DeckPlan` | S2 |
| `POST` | `/decks/{id}/generate` | `{ review?: boolean }` → `202`, then versions | S3–S5 |
| `POST` | `/decks/{id}/review` | `{ versionId?, rounds? }` → `ReviewReport` | S5 |
| `POST` | `/decks/{id}/revise` | `{ instruction, slideIds? }` → `202` | revise |
| `POST` | `/decks/{id}/enrich` | `{ notes?, alt?, translateTo? }` → `202` | S6 |
| `GET` | `/decks/{id}` | → latest version's `DeckSpec` (what the viewer/editor load) | — |
| `PUT` | `/decks/{id}` | `DeckSpec` → new version `source: 'editor'` | — |
| `GET` | `/decks/{id}/versions` | → `[{ id, source, parentVersionId, createdAt, score? }]` | — |
| `POST` | `/decks/{id}/versions/{v}/restore` | → new version `source: 'restore'` | — |
| `GET` | `/decks/{id}/versions/{v}/diff/{w}` | → slide-level diff | — |
| `POST` | `/decks/{id}/publish` | `{ versionId }` → `{ publishedVersionId, thumbnails[] }` | S7 |
| `GET` | `/decks/{id}/events` | SSE | — |

The Next.js mock grows to serve `/profiles`, `/capabilities`, `/schema`, `/generate` (returning a
golden deck for the profile) and `/versions`, so the frontend's version UI can be built before
the backend exists.

---

## 9. Data shapes (abridged)

```ts
interface Outline { deckId; title; profileId; sections: Array<{ key; title; purpose; slides: OutlineSlide[] }> }
interface OutlineSlide { key: string; role: SlideRole; headline: string; keyMessage: string; evidenceNeeded: string[]; notesHint?: string }

interface DeckPlan { deckId; outlineVersion; theme: string; slides: Array<{ key; layout; regions: Record<string, Array<{ type; why }>>; motion: { profile; order: string[] } }> }

interface DeckVersion { id; deckId; spec: DeckSpec; source: VersionSource; parentVersionId?: string; score?: number; findings: DeckFinding[]; createdAt }

interface GenerationTrace { id; deckId; versionId?; stage; slideKey?; model; effort; promptHash; inputTokens; cachedTokens; outputTokens; latencyMs; stopReason; findingsBefore: number; findingsAfter: number }
```

AC7 additions, all optional and as they exist in code:

```ts
// DeckSpec (blocks/types.ts) gains one field: a BUILT_IN_STYLES id. `theme` is then a palette id of that style.
interface DeckSpec { /* ... */ style?: string }

// capabilityIndexData(reg, opts?) → CapabilityIndexEntry[] (blocks/capability-digest.ts); AC0 added:
interface CapabilityIndexEntry {
  /* type, category, scope, range?, shortDescription, related?, layer?, size? ... */
  aiTier?: 1 | 2          // 1 = full line in the default index, 2 = by name
  looks?: string[]        // enum/boolean knob slots that change the look, in the order to try them
  absorbs?: string[]      // tier-2 types this block replaces by default
}
// opts: { categories?, scopes?, tier?: 1, profile?: { prefer?, avoid? }, roles?: RecipeRole[], style?: string }
```

`capabilityIndexData` returns blocks only. **The styles and the recipes are not fields of that
JSON** (the AC plan §5.2 sketched `styles` and `recipes` arrays; they were not built): the
backend reads them from the same package: `BUILT_IN_STYLES` (each a `DeckStyle`: `id`, `family`,
`name`, `brief`, `palettes`, `fonts`, `tokens`, `surface`, `masters`, `motionStyle`,
`blockDefaults`, `prefer`, `avoid`, `rules`), `styleCard(style)`, `styleLine(style)`, and
`RECIPES` / `recipesFor(role)` / `recipeLine(r)` / `recipeSlide(r, registry)` (a `SlideRecipe` is
`{ id, role, layout, regions: Record<string, { type, knobs? }[]>, when }`). A Python backend
calls them through the Node sidecar, as for the layout oracle.

`SlideRole = 'opener' | 'objective' | 'agenda' | 'section' | 'content' | 'data' | 'example' |
'exercise' | 'recap' | 'quote' | 'summary' | 'cta' | 'references' | 'closing'`.

---

## 10. Evaluation — how you know a change helped

Three layers, all read from the trace and the stored objects:

1. **Deterministic** (every run, free): findings per deck by rule, overflow rate, density
   violations, layout monotony, cache hit rate, cost and latency per deck and per stage.
2. **Critic** (every run): weighted score per slide and deck, before/after review, by profile.
   Track the delta the review loop produces; if it trends to zero, the author prompt has absorbed
   the lesson and the loop can shrink.
3. **Human** (weekly sample): accept-as-is rate at the outline, at the first render, and after
   review; edits per slide in the editor before publish (the editor's version diff gives this
   for free); a 30-slide calibration set per profile for the critic (§5.5).

Prompt and profile changes go through the eval corpus (20+ briefs per profile) in CI with a
report per profile; a change that improves keynote and degrades teach is not merged.

---

## 11. Rollout order and frontend dependencies

| Stage | Needs from [BACKLOG-enhance.md](BACKLOG-enhance.md) | Can start |
|---|---|---|
| **L0** Profiles as data, intake, outline, the outline editor in the UI | nothing (text only) | now |
| **L1** Plan + fill + deterministic repair, versions, SSE | **R7** (digest v2 + JSON Schema, golden fixtures), R0 (or the fill produces overlapping slides) | after Phase A + R7 |
| **L2** Text-only critic (JSON + findings) | R6 (timeline for pacing findings) | with L1 |
| **L3** Visual critic with rendered PNGs, deck contact sheet | **R14** (headless export renders blocks), R4/R5 for style and motion to be visible in renders | Phase D |
| **L4** Enrichment (notes, alt, translation) via Batches; composites in the planner's vocabulary | R8–R10 (image and composite blocks — without them the planner has nothing visual to pick) | Phase C |
| **L5** Evals in CI, critic calibration set, per-profile dashboards | L1–L3 traces | continuous |

L0 is worth doing first regardless: the outline editor is the highest-leverage UI in the product
and needs no block work.

---

## 12. Later enhancements worth planning for

- **Brand kits**: derive a `DeckTheme` from a logo and two colors (contrast-solved by the existing
  token pipeline), stored per organisation; the profile's `theme.candidates` then includes it.
- **Media**: image search or generation for `tls.m.image` slots with the alt text as the query;
  store provenance and license on the asset.
- **Voice-over and timing**: `slideTimeline` gives per-step durations; generate a script per step
  from the notes and align TTS to it; the viewer's `autoAdvanceMs` follows the audio.
- **Import**: parse an existing PPTX or Google Slides into an `Outline` (not into blocks —
  reflowing content through the pipeline gives a better deck than translating shapes).
- **Deck memory**: after a few decks per organisation, retrieve prior outlines and glossary
  terms so terminology stays consistent across a team's decks.
- **Live adaptation**: in teaching mode, a "simplify this slide" or "add an example" action on
  the presenter view routes to `revise` with a one-slide scope and a 10-second budget.
- **Two critics**: a second rubric emphasising the audience ("could a first-year student follow
  this?") run only for teach/academic profiles.
