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

| Profile | Who asks for it | Density (words/slide) | Layout & block mix | Motion | Distinguishing rules |
|---|---|---|---|---|---|
| **teach-lecture** | teachers, trainers; students follow along | 60–120 | `title-body`, `two-column`, `bullets`, `steps`, `image-text`, definitions as `takeaway`; a `section` every 4–6 slides, a **recap** every section | `stepwise` — bullets reveal one by one, 2–5 build steps | numbered structure, a learning objective on slide 2, worked example before exercise, "check your understanding" slide per section, speaker notes as a script, evidence required for facts |
| **keynote-pitch** | founders, speakers; a visual talk | 5–25 | `title`, `hero`, `big-stat`, `quote`, `image-full`, `kpi-row`; one idea per slide | `expressive` — hero reveals, count-ups, 1–2 steps | title never a full sentence, no bullets over 3 items, at least 40% slides with a visual block, a "one-liner" closing slide |
| **business-report** | managers; QBR, status, board | 30–70 | `two-column` chart + takeaway, `kpi-row`, `comparison`, `agenda`, `timeline` | `minimal` — chart bars grow, else none | every chart has a takeaway block, numbers carry units and period, agenda + summary mandatory, consistent number formatting, evidence required |
| **workshop-training** | facilitators; interactive sessions | 20–60 | `agenda`, `steps`, `two-column`, exercise slides (`takeaway` + `bullets`), timeboxes | `stepwise` | timing per section in the notes, an exercise every 3–5 slides, instructions as imperative steps |
| **academic-seminar** | lecturers, researchers | 50–110 | `title-body`, `two-column`, `comparison`, `image-text` for figures, `quote` for definitions | `minimal` | citations block on each evidence slide, references slide, figure captions with source |
| **sales-product** | sales, product marketing | 15–45 | `hero`, `feature-grid`, `comparison`, `pricing`, `testimonial`, `kpi-row`, CTA | `expressive` | problem → solution → proof → ask order enforced, one CTA slide, social proof present |
| **status-update** | team leads; weekly/monthly | 30–60 | `agenda`, `kpi-row`, `timeline`, `bullets` with owner tags, `comparison` for plan vs actual | `none` | RAG status per item, dates absolute not relative, next-steps slide mandatory |
| **story-portfolio** | designers, creators | 5–30 | `image-full`, `image-text`, `quote`, `hero` | `expressive` | image-led, text is captions, theme from the person's brand kit if given |

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

### S2 · Plan — pick layouts and blocks per slide

**Output**: `DeckPlan = { theme, slides[{ key, layout, regions: Record<string, { type, why }[]>,
motion: { profile, order[] } }] }` — types and reasons, **no props yet**.

- Input is the outline slide, the filtered digest, the profile, and the plan of the previous two
  slides (for rhythm). The model returns block *types* per region with a one-line `why`.
- Separating plan from fill matters for three reasons: a wrong block choice is cheap to fix
  here; the fill stage can then run per slide in parallel with a small prompt; and the `why`
  is what a user sees when they ask "why a chart here?".
- Deterministic post-checks: every `type` exists in the registry, every region name exists in the
  layout, `maxConsecutiveSame` holds, density budget is plausible from the block mix. Failures go
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
