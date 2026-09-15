# 8. Phase plan — P18 → P32

Phases 1–17 are tracked in `reviews/README.md` (its table skips 10 — the numbering jumps from 9 to
11). This file continues from 18.

**Every phase has the same shape.** Goal · required reading · files it may touch · deliverables ·
**acceptance** (the tests that decide "done") · out of scope, named. After shipping, append a
**notes** section to that phase here — what differed from the plan, what broke, what you did not
build — exactly as `reviews/README.md` does for phases 1–17. A phase with no notes section is not
finished.

**House rules that apply to all of them** (from [README.md](README.md) §Governing rules):
one layout two renderers · spec in the document never React or pixels · colors are roles ·
additive schema only · motion tokenized and off by default · no new runtime dependency without a
named reason · screenshot everything · report what you did not build.

---

## P18 — Block foundations

**Goal.** The types, the registry, and the empty `@tlslides/blocks` package. No block renders
anything yet; one trivial block proves the wiring end to end.

**Read:** [01-architecture.md](01-architecture.md) in full; [README.md](README.md).

**Touch:** new `packages/tldraw/src/blocks/{types,registry}.ts`; `packages/tldraw/src/index.ts`
(exports); new workspace package `packages/blocks/`; root `package.json` / `pnpm-workspace.yaml` /
`turbo.json`; `examples/consumer-smoke/run.sh`.

**Deliverables**
1. `BlockSpec`, `BlockDefinition`, `BlockSchema`, `LayoutNode`, `LayoutContext`, `MotionRecipe`,
   `CapacityReport` — types only, fully documented.
2. `BlockRegistry` + `createBlockComponents(library)` → `TldrawComponentsRegistry`.
3. `blockToShape(spec, box, ctx)` / `shapeToBlock(shape)` round-trip.
4. `packages/blocks` builds with the same config as `packages/tldraw` — **transpiled output, no
   JSX in `dist`** (a raw-JSX `dist` fails at a consumer's runtime with `Unexpected token '<'`,
   not at build time — see `CLAUDE.md`).
5. One placeholder block (`tls.l.spacer`) end to end: registered, inserted via `Deck.addBlock`,
   round-trips through `exportDeckJson`/`importDeckJson`.

**Acceptance**
- Unit: spec→shape→spec is lossless for nesting, style, motion and slot, including
  `JSON.parse(JSON.stringify(...))` (the test `templates.spec.ts` already models).
- Unit: an unregistered `componentId` still renders `MissingBlockPlaceholder` and names the block.
- Unit: `defaults` are deep-cloned per instantiation — asserted with `not.toBe` alongside
  `toEqual` (the Phase 3 array-aliasing lesson).
- `turbo run build:packages` clean, **read** for type errors, not trusted to exit non-zero.
- `examples/consumer-smoke` imports `@tlslides/blocks` from `dist` and builds.
- No `TldrawApp.version` change.

**Out of scope:** any real block, any renderer, any motion.

---

## P19 — Design tokens v2

**Goal.** Resolve a color role to a concrete, contrast-correct value against whatever is actually
behind a block. Closes the known theme-vs-background follow-up.

**Read:** [02-design-language.md](02-design-language.md); Phase 12 notes in `reviews/README.md`;
`state/shapes/shared/deck-theme.ts`.

**Touch:** `packages/tldraw/src/blocks/tokens.ts`; `types.ts` (add optional
`TDDocument.tokens?: DeckTokens`); `state/shapes/shared/deck-theme.ts` (extend, do not rewrite).

**Deliverables**
1. `DeckTokens`: color roles, categorical ramp, type scale, spacing, radius, elevation, motion
   tokens. Optional on `TDDocument`; absent ⇒ derived from the active theme.
2. `resolveColor(role, surfaceCtx)` with contrast solving and floors (4.5:1 / 3:1 / 1.4:1),
   returning `{ color, ratio, ok }`.
3. `SurfaceContext` construction: from a slide background (including gradient sampling **at a
   given box**, not at the slide centre), from a parent block's fill, and over an image.
4. `positive`/`negative`/`warning` added to every built-in theme, chosen per palette rather than
   one global green/red.
5. Type/space/radius/elevation scales as data, with `density` shifting internal gaps by one step.

**Acceptance**
- Unit: every built-in theme × {light bg, dark bg, each of the 24 `GRADIENT_PRESETS` sampled at 5
  positions} × every foreground role meets its floor, or reports `ok: false`.
- Unit: the exact reported failure reproduces — a `mono-grid` stat row on a teal gradient now
  returns a legible `textMuted` where it previously did not.
- Unit: gradient sampling at a box, not the centre — a block at the dark end gets the dark value.
- Visual: `tools/visual/scenarios/tokens.js` renders a role swatch matrix across all five themes
  on light, dark and gradient backgrounds. **Look at it.**

**Out of scope:** applying tokens to existing native shapes (`RectangleUtil` et al. keep the Phase
8b/12 path); a token-editing UI.

---

## P20 — Layout engine, dual renderer, parity harness

**Goal.** The spine. `layout()` → `LayoutNode` → DOM and SVG, proven equal.

**Read:** [01-architecture.md](01-architecture.md) §1.6; [04-block-anatomy.md](04-block-anatomy.md)
§4.2–4.6; [09-testing.md](09-testing.md) §3.

**Touch:** `packages/tldraw/src/blocks/layout/`, `render-dom.tsx`, `render-svg.ts`;
`components/…` only to mount the DOM renderer inside `ComponentUtil`'s existing children slot.

**Deliverables**
1. Box model helpers; `layoutChild` with the depth cap at 4 and a lint error beyond it.
2. `measureText` provider interface + `estimateMetrics` (Phase 15's heuristic) as the default.
3. `renderNodeToDom` — every `LayoutNode` kind, `data-part` stamped, absolutely positioned in
   slide units.
4. `renderNodeToSvg` — pure string output, no DOM. Gradients through `<defs>`; **paint set via
   inline `style`, never the `fill` attribute** (Phase 11: a CSS class rule beats a presentation
   attribute regardless of specificity); paint on inner nodes, never an outer container (Phase 8a).
5. `assertParity(definition, props, box)` test helper.
6. Three throwaway blocks exercising every node kind: a rect, a text block, an image block.

**Acceptance**
- **Parity test passes** for all three: every part's box agrees within 1 slide unit between DOM
  (measured in Playwright via `getBoundingClientRect` at zoom 1) and SVG (parsed attributes).
- Unit: `layout()` runs with `document`, `window`, `Date` and `Math.random` stubbed to throw.
- Unit: a 5-deep tree produces a lint error and does not recurse.
- Visual: `blocks-render.js` scenario, both themes, screenshot inspected.

**Out of scope:** real blocks; canvas/table metrics (P23); headless export wiring (P21).

---

## P21 — Headless block rendering *(critical path)*

**Goal.** A block-built slide exports, thumbnails and server-renders correctly. Closes G1 in
[07-integration-readiness.md](07-integration-readiness.md).

**Read:** [07-integration-readiness.md](07-integration-readiness.md) §7.3 G1;
`state/render/renderPageToSvg.ts` end to end; Phase 15 notes in `reviews/README.md`.

**Touch:** `state/render/renderPageToSvg.ts` (options + the `TDShapeType.Component` case);
`state/deck/Deck.ts` (`getThumbnail`, `exportSlidePng` pass-through); `Tldraw.tsx` (optional
`blocks` prop, threaded to the export menu); `packages/blocks/src/svg-renderer.ts`.

**Deliverables**
1. `RenderPageToSvgOptions.blocks?: (shape, ctx) => string | undefined` — **purely additive**;
   absent or `undefined` return ⇒ today's placeholder path, byte-for-byte.
2. `svgBlockRenderer(library)` in `@tlslides/blocks`.
3. Pass-through on `Deck.getThumbnail` / `Deck.exportSlidePng` / `<Tldraw blocks>`.
4. `ComponentUtil.getSvgElement` uses the same renderer when one is available, so "Copy as SVG"
   and the editor's own PNG export agree with the headless path.
5. Tier-B `poster()` routing.

**Acceptance**
- Unit: with no `blocks` option, output is **identical** to the pre-P21 snapshot (the placeholder
  contract is preserved).
- Unit (Node, no DOM): a slide of blocks renders real SVG; snapshot.
- Parity: the same slide rendered through the live editor and through `renderPageToSvg` agrees
  part-for-part within 1 unit.
- Visual: `blocks-export.js` — editor screenshot beside a rasterized headless SVG of the same
  slide. **Look at both.** This is the phase where a discrepancy is cheapest to catch; Phase 15
  found a Phase-13 bug exactly this way, one phase late.
- A Tier-B block exports its poster, not a hole.

**Out of scope:** PDF assembly; PPTX.

---

## P22 — Motion core

**Goal.** Block motion, tokenized, off by default, on top of the existing presentation runtime.

**Read:** [05-motion-system.md](05-motion-system.md); `components/Presentation/PresentationRuntime.tsx`
in full; Phase 16 notes.

**Touch:** `packages/tldraw/src/blocks/motion/`; `components/Presentation/` (delegate block parts);
`state/deck/presentation.ts` only if build-step grouping needs a block-aware case.

**Deliverables**
1. `MotionDriver` interface + `waapiDriver` (default). No new dependency.
2. All 34 presets from [05-motion-system.md](05-motion-system.md) §5.3 (plus `none`).
3. `MotionRecipe` resolution: definition default → deck/slide opt-in → `spec.motion` →
   `motion.parts` overrides.
4. Block-level reveal compiles to `ShapeAnimation` so `computeBuildSteps` drives it unchanged;
   part-level motion runs inside the block via the driver.
5. `prefers-reduced-motion`: build steps preserved, transitions instantaneous, ambient disabled.
6. Slide transitions extended: `wipe`, `cover`, `uncover`, `zoom` (one-sided, honestly).
7. `gsapDriver(gsap)` as an **optional entry point** taking the host's instance — no bundled copy,
   no peer dependency.

**Acceptance**
- Unit: presets emit only `opacity`/`translate`/`scale`/`clip-path`/`filter`/`stroke-dashoffset` —
  a test asserts no call touches `transform`, `width`, `height`, `top`, `left` or `box-shadow`.
- Unit: `motion.parts` names exactly the parts `layout()` emits, for every block (`motion/orphan-part`).
- Unit: stagger total capped; reduced-motion path produces zero animations but the same end state.
- Unit: **a `fadeIn` block exports at full opacity** and `renderPageToSvg` output is unchanged by
  any motion field (the Phase 16 guarantee, re-verified for blocks).
- Visual: `blocks-motion.js` drives a real presentation, screenshotting mid-build and at rest.
- Manual: `will-change` is absent after every animation finishes.

**Out of scope, named:** **block morph across slides** (designed in
[05-motion-system.md](05-motion-system.md) §5.8 — needs two slides mounted at once, which the
current renderer does not do); audio cues; per-shape path animation.

---

## P23 — Text engine

**Goal.** Rich text, real metrics, autofit, lists — inside blocks. Closes G2 and two named Phase
15/17 follow-ups.

**Read:** [02-design-language.md](02-design-language.md) §2.5;
[04-block-anatomy.md](04-block-anatomy.md) §4.6; Phase 15 and 17 notes; `getTextSvgElement.ts`.

**Touch:** `packages/tldraw/src/blocks/layout/text/`.

**Deliverables**
1. `RichText` = `{ runs: { text, bold?, italic?, color?, size? }[] }` — inline runs only; no
   nested structure, no HTML.
2. Line breaking with runs preserved across breaks; `TextLine[]` with explicit baselines.
3. Metrics providers: `estimateMetrics` (default), `tableMetrics` (Node, the four built-in faces),
   `canvasMetrics` (browser, opt-in). **Deck-level choice, not per call** — mixed providers make a
   slide reflow between edit and export.
4. Autofit: shrink to 0.75, then hand off to `capacity()`.
5. List markers (dot/dash/chevron/number/icon), indent levels, hanging indent.
6. Vertical alignment with correct edge anchoring — the residual Phase 17 headless issue.
7. Renderers: `<tspan>` runs in SVG (`ppt-master`'s pattern), `<span>` runs in DOM.

**Acceptance**
- Parity: a paragraph with three inline runs, wrapped over four lines, agrees DOM↔SVG within 1
  unit per line, at three widths.
- Unit: CJK + Latin mixed measurement (`estimateTextSize` handles these at different rates).
- Unit: `style.scale` is applied to font size in every path — the exact Phase 15 bug, with its
  regression test extended to blocks.
- Unit: autofit never goes below 0.75 and reports an overflow instead.
- Visual: a specimen slide — every type token, every list style, rich runs, autofit at three box
  sizes. **Look at it.**

**Out of scope:** a rich-text editing UI (P30); bidi/RTL — named explicitly as unhandled, not
silently assumed; `TextUtil` changes of any kind.

---

## P24 — Library A: layout containers + text blocks (38)

**Goal.** Families A (14) and B (24) from [03-block-catalog.md](03-block-catalog.md).

**Read:** [03-block-catalog.md](03-block-catalog.md) §A–B; [04-block-anatomy.md](04-block-anatomy.md)
in full, especially E1–E4.

**Touch:** `packages/blocks/src/layout/`, `packages/blocks/src/text/`.

**Deliverables.** 38 definitions, each meeting the ten-point definition of done
([04-block-anatomy.md](04-block-anatomy.md) §4.9).

**Acceptance**
- Per block: the ten-point checklist, tested.
- Suite: every block renders its `defaults` under all five themes on light/dark/gradient
  backgrounds with **zero lint findings**.
- Parity: all 38 pass.
- Visual: `blocks-layout.js` and `blocks-text.js` contact sheets. **Look at every block.**
- A composite built from containers reflows correctly at 1920×1080, 1024×768 and 1080×1920.

**Out of scope:** the inserter UI (P30).

---

## P25 — Library B: data & charts (32)

**Goal.** Family C, on one shared chart engine.

**Read:** [03-block-catalog.md](03-block-catalog.md) §C;
[04-block-anatomy.md](04-block-anatomy.md) §4.8 and E5–E6; `02` §2.2 for the categorical ramp.

**Touch:** `packages/blocks/src/data/` incl. `_engine/`.

**Deliverables.** The engine (`scales`, `axes`, `legend`, `series`, `marks`, `labels`, `palette`)
then 32 definitions.

**Acceptance**
- Per block: the ten-point checklist.
- Engine unit tests: nice-tick generation; band/linear/log scales; label collision → thinning;
  direct-label-vs-legend decision; **zero baseline enforced** and `baseline:'auto'` producing a
  lint finding; ≤6 hues with an "Other" grouping past that; explicit NaN/null handling per chart
  type (never silently zeroed).
- Unit: a single-series chart uses `accent`, not `categorical[0]`, in every chart type.
- Visual: `blocks-data.js` contact sheet with realistic and adversarial data — one category, 40
  categories, all-zero, negative values, one huge outlier, missing values. **Look at all of it.**

**Out of scope:** interactive charts (family H, later); statistical transforms (regression,
smoothing beyond a monotone curve).

---

## P26 — Library C: diagrams (30)

**Read:** [03-block-catalog.md](03-block-catalog.md) §D; `04` E7.
**Touch:** `packages/blocks/src/diagram/`.

**Deliverables.** 30 definitions plus shared connector routing (straight, elbow, curved) and node
placement helpers (linear, radial, tree/tidy-layout).

**Acceptance**
- Per block: the ten-point checklist.
- Unit: connector routing never crosses a node box; a tree of depth 4 × breadth 5 lays out inside
  its box or reports an overflow.
- Unit: **no block uses `LineShape.handles` semantics** — a block's `line` node is in the block's
  own coordinate space (the Phase 13 invisible-divider trap).
- Visual: `blocks-diagram.js` contact sheet at 2, 5 and 12 items each. **Look at it.** Diagram
  blocks fail at their extremes, and only a screenshot shows it.

**Out of scope:** automatic graph layout for arbitrary cyclic graphs (`g.flow` takes explicit
node/edge lists and routes them; it does not solve layout).

---

## P27 — Library D: media & icons (24)

**Read:** [03-block-catalog.md](03-block-catalog.md) §E; `02` §2.6; `04` E8.
**Touch:** `packages/blocks/src/media/`.

**Deliverables.** 24 definitions; the `IconProvider` interface; focal-point cropping; the scrim/
wash helper implementing the directional-gradient rule.

**Acceptance**
- Per block: the ten-point checklist.
- Unit: **no uniform-opacity plate over an image** — a helper-level assertion, plus the
  `effect/flat-image-overlay` lint rule.
- Unit: focal-point crop keeps the focal point in frame at every aspect ratio.
- Unit: a missing icon renders a placeholder and emits a finding; it never throws and never
  substitutes a different icon.
- Unit: a missing/broken asset degrades to a labelled frame, not a crash.
- Visual: `blocks-media.js` with portrait, landscape and square sources, plus text-on-photo at four
  anchors. **Look at it** — text on photos is where contrast fails and only the eye is sure.

**Out of scope:** image editing (crop UI, filters, background removal); bundling an icon set.

---

## P28 — Library E: composites + master chrome (34)

**Read:** [03-block-catalog.md](03-block-catalog.md) §F–G; [06-slide-composition.md](06-slide-composition.md) §6.5.
**Touch:** `packages/blocks/src/composite/`, `packages/blocks/src/chrome/`; `types.ts` (optional
`TDDocument.masters`, `TDPage.masterId`); master rendering in the editor, presentation and
`renderPageToSvg`.

**Deliverables.** 20 composites (trees over existing blocks — **no new rendering code**), 14 chrome
blocks, `MasterSpec`, master resolution context (slide index, count, section, role, deck title,
date), and `editorOnly` handling for `x.safe-area` / `x.grid-guide`.

**Acceptance**
- Per block: the ten-point checklist.
- Unit: no composite introduces a new `LayoutNode` kind — composites are trees, verified by
  asserting their layout delegates entirely to `layoutChild`.
- Unit: master blocks are not in `page.shapes`, are not selectable, and survive slide
  add/delete/reorder.
- Unit: `editorOnly` blocks appear in the editor and **never** in `renderPageToSvg`, export or
  presentation.
- Unit: page numbers are correct after a reorder, and skip `cover`/`section` when configured.
- Visual: `blocks-composite.js` — all 20 composites, and one deck with a master applied.

**Out of scope:** a master-editing UI (P30).

---

## P29 — Slide composition

**Goal.** Regions, overflow, pagination, and the Phase 13 templates rebuilt on blocks.

**Read:** [06-slide-composition.md](06-slide-composition.md) in full; Phase 13 notes;
`state/templates.ts`.

**Touch:** `packages/blocks/src/composition/`; `state/templates.ts` (internals only —
`Template`'s type does not change).

**Deliverables**
1. The 16 slide layouts as pure `frame → named boxes` functions, honouring the safe margin, at any
   aspect ratio.
2. `compileSlide(SlideSpec, frame, tokens) → { shapes, background, masterId }`.
3. The overflow cascade: expand → reflow → shrink → paginate → truncate, with `split()` on
   splittable blocks.
4. The twelve starter templates rebuilt as `SlideSpec`s; `buildTemplateShapes` compiles them.
5. `Deck.addSlideFromSpec(spec, opts?)` on the facade.

**Acceptance**
- Unit: every layout's regions stay inside the safe margin at 16:9, 4:3 and 9:16.
- Unit: the overflow cascade fires in order; a 30-item list paginates into 2 slides with the build
  order preserved and the continuation title suffixed.
- Unit: truncation always emits a visible marker **and** a lint finding.
- Regression: every existing `templates.spec.ts` test still passes unchanged, and
  `TemplatePicker`/`TemplateThumbnail`/`Deck.listTemplates()` are untouched.
- Visual: all twelve templates before/after. **The two that shipped under-composed
  (`comparison`, `image-left/right`) must now read as finished** — that is the phase's real test,
  and it is a judgement made by looking.

**Out of scope:** the AI contract (P32).

---

## P30 — Authoring UX

**Goal.** A person can actually use blocks.

**Read:** [01-architecture.md](01-architecture.md) §1.12 (every trap); Phase 8b notes (the Tab-clone
bug, in full).

**Touch:** `components/BlockInserter/`, `components/BlockInspector/`, `components/MasterEditor/`,
`ComponentUtil` (in-place editing affordances).

**Deliverables**
1. Block inserter: searchable by `name`/`keywords`/`summary`, grouped by family, live previews
   rendered through `renderNodeToSvg` (the same trick `TemplateThumbnail` uses, so a preview can
   never drift from what insertion produces).
2. Block inspector: generated from `BlockSchema` — content slots first, options second.
3. In-place text editing on text parts.
4. Master editing mode.
5. Lint findings surfaced per slide (P31 supplies them).
6. Two debts paid while here: a real inline rename input replacing `window.prompt`, and
   `ImageShape.alt` given a UI.

**Acceptance**
- Unit + visual: **every free-typed field carries `stopKeyPropagationUnlessEscape`** — a test
  types <kbd>Tab</kbd> in each and asserts the selection did not change and no shape was cloned.
  This is the exact bug Phase 8b shipped and fixed; it will recur here.
- Unit: overlays portal to `document.body` (`.tl-positioned-div` clips).
- Unit: block interactions `stopPropagation` on pointer-down and never start a shape drag.
- Unit: every inspector edit is one undo step, and a slider drag is one, not one per pixel (the
  `Slider` primitive's `onValueCommit` contract).
- Visual: `blocks-authoring.js` drives the **real UI** — clicks the inserter, types in the
  inspector, edits text in place. Per the `stylepanel.js` precedent, `window.app` seeds and reads
  only; it never performs the action under test.

**Out of scope:** drag-and-drop reordering *inside* a block; a visual layout editor for containers.

---

## P31 — Deck Doctor (the linter)

**Read:** [02-design-language.md](02-design-language.md) §2.8; [05-motion-system.md](05-motion-system.md) §5.9.
**Touch:** `packages/blocks/src/lint/`; `components/DeckDoctor/`.

**Deliverables.** Every rule in `02` §2.8 and `05` §5.9, over the laid-out node tree and resolved
tokens — no pixel heuristics, no screenshots. Slide-level and deck-level passes.
`lintDeck(doc, library, tokens) → Finding[]`, exported from the package root so a host or a server
can run it.

**Acceptance**
- Unit: a positive and a negative fixture per rule, with the negative asserting **no** finding.
- Unit: the linter never edits — asserted by deep-comparing the document before and after.
- Unit: it runs in Node with no DOM.
- Unit: performance — a 60-slide deck lints in under 2 seconds.
- Visual: a deliberately bad deck; the panel shows exactly the expected findings.

**Out of scope:** auto-fix. Report only. A linter that edits is a linter nobody trusts.

---

## P32 — AI contract

**Goal.** The schema, the compiler and the validation loop an AI targets. **No model is called.**

**Read:** [06-slide-composition.md](06-slide-composition.md) §6.7; all of `03` and `04`.
**Touch:** `packages/blocks/src/ai/`.

**Deliverables**
1. `DeckSpec` types + a JSON Schema generated from the block schemas (generated, not hand-written —
   a hand-written copy drifts the day someone adds a slot).
2. `validateDeckSpec(spec, library)` → structured, actionable findings: unknown type with a
   nearest-keyword suggestion; missing required slot named; over-budget by how much; lint findings
   with rule and part.
3. `compileDeckSpec(spec) → TDDocument`, pure, Node-safe.
4. A capability digest for prompting: every block's `type`, `summary`, `keywords`, content slots
   with `guidance` and budgets, and the relationship tag for diagram blocks — generated from the
   library, versioned, and small enough to fit a prompt.
5. Golden fixtures: 10 realistic `DeckSpec`s → committed `TDDocument` snapshots and rendered PNGs.

**Acceptance**
- Unit: every fixture compiles, lints clean, and round-trips.
- Unit: 20 adversarial specs (unknown type, missing slot, 400-char title, 60-item list, 6-deep
  nesting, wrong region name, cyclic children) each produce a specific, actionable finding and
  **never** a crash or a silently broken slide.
- Unit: the digest is generated from the library — adding a block updates it, and a test asserts
  no block is missing from it.
- Visual: all 10 fixtures rendered as PNG contact sheets. **Look at them.** This is the phase's
  real output: does an AI-shaped deck look like a deck a person would present?

**Out of scope, still deferred per `reviews/README.md`:** prompting, model selection, streaming,
ingestion (PDF/DOCX/URL), AI rewriting/expanding, AI image generation.

---

## Notes

*(Append one subsection per phase as it ships — what differed, what broke, what was not built.
Follow the Phase 1–17 format in `reviews/README.md`: specifics, mechanisms, and the bugs a
screenshot caught.)*

### P18 notes — block foundations

`BlockSpec`/`BlockDefinition`/`LayoutNode`/`LayoutContext` (types only), `BlockRegistry`,
`createBlockComponents`, and `blockToShape`/`shapeToBlock` landed in
`packages/tldraw/src/blocks/`, exported from the package root. No version bump, no migration.

**Shipped narrower than the plan, on purpose: `packages/blocks` was NOT created.** The runtime
primitives live in `@tlslides/tldraw` as §01 1.11 describes; the separate library package, which
needs `pnpm-workspace.yaml`/`turbo.json` edits and a reinstall, is deferred until P24 actually
needs somewhere to put concrete block definitions. Nothing else in P18 was cut.

**Two bugs, both found in review, both invisible to the tests that existed:**

1. **Every converted shape carried the same hardcoded id** (`'shape-id-will-be-assigned'`).
   `TldrawApp.insertContent` remaps ids through `idsMap[shape.id] = Utils.uniqueId()`
   (`TldrawApp.ts:2279-2280`) — **a map keyed by the shape's own id** — so two blocks inserted
   together collapsed into one map entry, got the same new id, and one silently overwrote the
   other. `childIndex: 0` on every block was the same defect in z-order, which this repo already
   paid for once as B-03/B-04 in Phase 3. Fixed with `Utils.uniqueId()` plus a
   `BlockToShapeOptions { id?, parentId?, childIndex? }`.
2. **`style: defaultStyle` aliased a module-level singleton** — introduced *by* the fix for the
   duplicated style literal. Every block shared one style object, so one `shape.style.color = …`
   would restyle every block in the process and corrupt the shared default. Third time this repo
   has hit module-level aliasing (`DEFAULT_SLIDE_SIZE`, Phase 3; `mergeTypeScale`, P19 below).
   **`toEqual` passes happily while aliasing — only `not.toBe` catches it**, so that assertion is
   now mandatory on anything derived from a module-level default.

**Process lessons, recorded because they cost time:** the phase's stated test baseline was stale
(phase notes are in authoring order, not commit order — `df699142`/Phase 8c landed *after* Phase
17), and both `npx tsc` and `cmd | tail; $?` silently report success in this repo. All three are
now documented in [09-testing.md](09-testing.md) §9.0 with verified commands and measured
baselines.

**Verified:** 95/95 suites, 639 passing (up from 93/598) · typecheck byte-identical to the
10-error baseline · eslint `src/blocks` 0 errors · demonstrated end to end in
`examples/nextjs-sample` (a nested `BlockSpec` → `ComponentShape` → canvas → `shapeToBlock`),
alongside the Phase 5 blocks on the same canvas.

### P19 notes — design tokens v2

`color-math.ts` (WCAG luminance/contrast, hex⇄RGB⇄HSL, the hue-preserving solver), `scales.ts`
(type/space/radius/elevation/motion as data, `applyDensity`, categorical ramp), and `tokens.ts`
(`DeckTokens`, `resolveTokens`, `resolveColor`, `surfaceFromBackground`, `surfaceFromPaint`).
`positive`/`negative`/`warning` added per-palette to all five built-in themes — not one shared
green/red. `TDDocument.tokens?` is optional; no version bump, no migration.

**The named follow-up is closed.** `mono-grid` `textMuted` on a gradient: against
`theme.colors.background` it measured ~7.1:1 and looked fine; against the *actual* sampled surface
luminance it was ~1.16:1. It now resolves at ≥ 4.5:1.

**One bug found in review: the solver reported failure on a solution that existed.** The
hue-preserving lightness clamp (`0.04–0.96`) was treated as the whole search space, so
`ok: false` meant "nothing in my preferred aesthetic band works" rather than "no legible colour
exists" — at surface luminance 0.170 it returned `#F5F5F5` (4.378, below the 4.5 floor) while pure
white was a valid 4.773. Fixed with a two-tier search: the preferred band first, the true extremes
only as a fallback. **The stated justification for the clamp — "so `ok: false` stays reachable" —
was backwards**; making a failure mode reachable is not a design goal.

That fix came with a genuinely useful piece of algebra, verified independently: for any background
luminance, `contrast-to-white × contrast-to-black = 21` exactly, so `max(…) ≥ √21 ≈ 4.583`.
Every floor this codebase uses (4.5, 1.4) is below that, so **`ok: false` cannot occur for them** —
measured across 1800 samples (5 themes × 24 `GRADIENT_PRESETS` × 5 positions × 3 roles): **41
`ok: false` before the fix, 0 after.** The invariant the linter will depend on held throughout:
`ok: true` never lies — zero samples where `ok: true` but `ratio < floor`.

**Also caught by the implementer's own test, worth repeating:** `mergeTypeScale`'s no-override
path did `{ ...TYPE_SCALE }`, a shallow copy leaving each token's `{size, lineHeight}` aliased to
the module-level scale. Same bug class as P18's `defaultStyle` and Phase 3's `DEFAULT_SLIDE_SIZE`.

**Open follow-up, not a blocker:** `tools/visual/scenarios/tokens.js` renders a real 5-theme ×
3-surface × 6-role matrix with measured ratios, but every swatch sits on the same dark card rather
than on the surface being tested — so it proves the numbers without letting anyone *see* whether a
role is legible on its ground, which was the stated reason for having a visual check at all.
Worth reworking when P20's renderer makes a real slide available to draw on.

**Interface deviation P20 must know:** `surfaceFromPaint(paint, box, parentBox)` takes three
arguments, not the two §2.4 implied — a parent block's paint has no page-sized frame to normalize
against the way a slide background does. Recorded in
[02-design-language.md](02-design-language.md) §2.4.

**Verified:** 99/99 suites, 726 passing (up from 95/639) · typecheck byte-identical to the
10-error baseline · eslint `src/blocks` 0 errors, 0 warnings outside spec files · the 1800-sample
sweep re-run independently · `tokens.png` screenshot inspected.
</content>
