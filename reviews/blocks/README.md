# The Block System — plan overview and agent entry point

**Date:** 2026-09-15 · **Against commit:** `df699142` (branch `main`, phases 1–17 shipped)
**Status:** plan only. Nothing in this directory is implemented yet.

> **If you are an implementing agent, read this file first, then read only the documents your
> phase names.** Every phase in [08-phase-plan.md](08-phase-plan.md) lists its own required
> reading, the files it may touch, and the tests that decide whether it is done. Do not start a
> phase whose dependencies are not marked ✅ in the tracker below.

## What this is

Phases 1–17 turned a 2021 tldraw fork into a bounded, themed, presentable slide editor with a
host-facing API (`app.deck.*`), headless SVG rendering, and a template library. What it still has
is a *shape* content model: a slide is a bag of rectangles, lines, and plain-string text.

This plan adds the layer the product actually needs: **blocks**. A block is a named, typed,
themeable, animatable unit of slide content — "KPI tile", "timeline", "quote", "comparison
table" — with a declared content schema, a pure layout function, two renderers (live DOM and
headless SVG) that are guaranteed to agree, and a default motion recipe. Blocks nest. An AI (or a
human, or an importer) composes a slide by picking blocks and filling their slots, never by
emitting coordinates.

The design is grounded in two reference libraries cloned next to this repo and **git-ignored**
(see `.gitignore`):

- `ppt-master/` — a presentation-design skill library. Its *device menu*, *layout structures*,
  *page recipes*, *page-rhythm* discipline and *color/shadow/emphasis rules* are the source of the
  block taxonomy in [03-block-catalog.md](03-block-catalog.md) and of the lint rules in
  [02-design-language.md](02-design-language.md). Primary files read:
  `ppt-master/skills/ppt-master/references/executor-base.md`,
  `.../references/animations.md`, `.../templates/layouts/layouts_index.json`.
- `transitions.dev/` — a motion-token scale and 32 production CSS transition recipes. Its five
  token dimensions (duration, easing, distance, scale, blur) and its open/close-asymmetry,
  stagger and intent-delay rules are the basis of [05-motion-system.md](05-motion-system.md).
  Primary files read: `transitions.dev/skills/transitions-polish/SKILL.md`,
  `transitions.dev/skills/transitions-polish/_root.css`,
  `transitions.dev/skills/transitions-dev/SKILL.md`.

Neither library is a dependency. Both are *design sources* — we copy judgment, not code.

## The documents

| # | Document | Read it when |
|---|---|---|
| — | **this file** | Always first. Scope, rules, phase tracker. |
| 1 | [01-architecture.md](01-architecture.md) | You touch the block model, registry, renderers, or how a block becomes a shape. |
| 2 | [02-design-language.md](02-design-language.md) | You pick colors, spacing, type sizes, or write a lint rule. |
| 3 | [03-block-catalog.md](03-block-catalog.md) | You implement any block. 170 blocks, grouped into 8 families. |
| 4 | [04-block-anatomy.md](04-block-anatomy.md) | You implement any block. The exact authoring contract + 10 fully worked examples. |
| 5 | [05-motion-system.md](05-motion-system.md) | You touch animation, presentation playback, or slide transitions. |
| 6 | [06-slide-composition.md](06-slide-composition.md) | You touch slide-level layout, regions, overflow, masters, or the AI-facing deck contract. |
| 7 | [07-integration-readiness.md](07-integration-readiness.md) | You want the answer to "can we embed this in the real Next.js app yet?" |
| 8 | [08-phase-plan.md](08-phase-plan.md) | Always, before starting work. Phases P18–P32. |
| 9 | [09-testing.md](09-testing.md) | Always, before claiming a phase is done. |

## The answer to "is it ready for Next.js?"

**Short version: yes for *embedding and driving*, no for *shipping the product on top of it*.**
Full evidence in [07-integration-readiness.md](07-integration-readiness.md). The one-paragraph
version:

Integration is genuinely de-risked. `examples/nextjs-sample/` is a real Next.js 15.5 / React 19.2
App Router app that mounts the editor, the package ships transpiled `dist` (no `transpilePackages`
needed), the React peer range covers 17–19, `examples/consumer-smoke/` proves an outside consumer
builds, and `app.deck.*` is a deliberately narrow, documented, event-emitting facade. Phase 2
stress-tested React 19 for store tearing and found none.

What is *not* ready is the content model, and that is exactly what this plan fixes. Four gaps
block a real product, all of them content gaps rather than integration gaps:

1. **`ComponentShape` — the thing this whole plan builds on — cannot be rendered headlessly.**
   `renderPageToSvg` emits a labelled dashed-rect placeholder for it, by design
   (`packages/tldraw/src/state/render/renderPageToSvg.ts:128-140`). So every server-side
   thumbnail, SVG export and PDF of a block-built slide is currently a hole. **P21 fixes this**
   and it is the single most load-bearing phase here.
2. **No rich text.** `TextShape.text` is a plain `string`. Bold-one-word-in-a-sentence — table
   stakes for a slide tool, and explicitly recommended by `ppt-master`'s inline-emphasis rule — is
   impossible. **P23** brings rich text inside blocks without touching `TextUtil`.
3. **No deck-level export.** PDF is a documented recipe, not a method; PPTX does not exist.
4. **Theme and background are unaware of each other** — a known, named follow-up in
   `reviews/roadmap-slides.md`. **P19** closes it with an effective-surface color context.

None of these require redoing phases 1–17. All four are additive.

## Governing rules for every phase

These are not suggestions. A phase that violates one is not done.

1. **One layout, two renderers, proven equal.** A Tier-A block is authored *once* as a pure
   `layout()` function returning primitives. The DOM renderer and the SVG renderer both consume
   that output. Never hand-write a block twice. Parity is enforced by an automated test, not by
   eye ([09-testing.md](09-testing.md) §3).
2. **The document stores a spec, never React and never pixels.** A block in a `.tldr` file is
   `{ componentId, props }` — plain JSON that survives persistence, multiplayer and a host that
   has never heard of the block. This is already `ComponentShape`'s contract; do not widen it.
3. **Colors are roles, not hex.** A block asks for `accent` / `surface` / `onSurface`; the theme
   answers. Literal hex is an escape hatch a user sets, never something a block definition or a
   template ships. Extends the Phase 12 `'theme:accent1'` token design.
4. **Additive schema only.** Every field this plan adds to a persisted type is optional, exactly
   as Phases 11/13/17 did, so `TldrawApp.version` stays at 16 and `migrate.ts` needs no new block.
   If you think you need a migration, stop and re-read [01-architecture.md](01-architecture.md) §7.
5. **Motion is tokenized and off by default.** Durations, easings, distances come from the
   transitions.dev scale in [05-motion-system.md](05-motion-system.md). A deck that nobody
   animated must not move. `prefers-reduced-motion` is honoured everywhere, as
   `PresentationRuntime` already does.
6. **No new runtime dependency without a named reason.** The default motion driver is the Web
   Animations API (already in every target browser, zero bytes). GSAP is an *optional adapter a
   host injects*, never a package dependency — see [05-motion-system.md](05-motion-system.md) §6
   for why.
7. **Screenshot everything.** This repo's own convention, and it has caught a real, test-invisible
   bug in six separate phases (8a's hexagon, 8b's Tab-clone, 11's CSS-beats-attribute, 13's
   invisible dividers, 15's unscaled text, 16's fullscreen exit). Every block phase ships a
   `tools/visual/scenarios/` scenario and the screenshot is *looked at*.
8. **Report what you did not build.** Every shipped phase writes a notes section in
   [08-phase-plan.md](08-phase-plan.md) listing scope cuts as named follow-ups. "A correct partial
   beats a broken whole" — but a silent partial is neither.

## Phase tracker

Nothing is started. Update the Status column as work lands; append phase notes to
[08-phase-plan.md](08-phase-plan.md), the same way `reviews/README.md` carries phases 1–17.

| Phase | Name | Depends on | Status |
|---|---|---|---|
| **P18** | Block foundations — types, registry, `packages/blocks` | — | ⬜ not started |
| **P19** | Design tokens v2 — color roles, effective surface, scales | P18 | ⬜ not started |
| **P20** | Layout engine + dual renderer + parity harness | P18, P19 | ⬜ not started |
| **P21** | Headless block rendering (`renderPageToSvg` hook) | P20 | ⬜ not started |
| **P22** | Motion core — tokens, adapter, WAAPI driver, build steps | P18 | ⬜ not started |
| **P23** | Text engine — rich text, autofit, measurement provider | P20 | ⬜ not started |
| **P24** | Library A — layout containers (14) + text blocks (24) | P20, P23 | ⬜ not started |
| **P25** | Library B — data & chart blocks (32) | P24 | ⬜ not started |
| **P26** | Library C — diagram & relationship blocks (30) | P24 | ⬜ not started |
| **P27** | Library D — media & icon blocks (24) | P24 | ⬜ not started |
| **P28** | Library E — composite slides (20) + master chrome (14) | P24–P27 | ⬜ not started |
| — | *(the 12 live/Tier-B blocks are folded into the family they twin — see [03](03-block-catalog.md) §H)* | — | — |
| **P29** | Slide composition — regions, overflow, masters | P24 | ⬜ not started |
| **P30** | Authoring UX — inserter, inspector, in-place editing | P24 | ⬜ not started |
| **P31** | Deck Doctor — the design linter | P19, P24 | ⬜ not started |
| **P32** | AI contract — `DeckSpec` schema + compiler + fixtures | P29, P31 | ⬜ not started |

**Parallelism.** P22 is independent of the P19→P20→P21 spine and can run alongside it. P25, P26
and P27 are independent of each other once P24 lands and are the natural place to fan out to
several agents. P30 and P31 both only need P24. P21 must land before any export/thumbnail claim
in any later phase is believable.

## What this plan deliberately does not cover

Named here so nobody has to guess whether it was forgotten.

- **Calling an LLM.** P32 defines and implements the *contract and compiler* an AI targets
  (`DeckSpec` JSON → `TDDocument`) plus golden fixtures. Prompting, model choice, streaming and
  the ingestion pipeline stay deferred, per the scope decision in `reviews/README.md`.
- **PPTX export.** Blocks make it *possible* (a block knows its own semantic structure, which is
  what OOXML wants) and [01-architecture.md](01-architecture.md) §8 keeps the door open with
  `toShapes()`. Building it is not in these phases.
- **Real-time collaboration on blocks.** Still deferred.
- **Replacing `TextUtil`/`RectangleUtil` and the existing shapes.** Blocks sit *next to* native
  shapes, not instead of them. A user must still be able to draw an arrow on top of a block.
- **The product shell** — accounts, storage, sharing, billing.
</content>
</invoke>
