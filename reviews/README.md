# Product & Architecture Review — tlslides as an AI Slide Builder

**Date:** 2026-08-27 · **scope decision added 2026-08-28**
**Reviewed commit:** `1f9eeb4a` (branch `main`)
**Scope:** Can this repo become a Canva-style, AI-assisted slide product?

> **Current working scope:** Next.js integration and the AI pipeline are deferred; work is
> editor-only for now. See [Current scope decision](#current-scope-decision--editor-only-phase)
> below for what is in and out, and which module each item lands in.

Every claim in these documents was verified by reading source in this repo. Statements are
cited as `path:line`. Where something does **not** exist, that is stated explicitly — absence
was checked by grep, not assumed.

## The documents

| # | Document | Answers |
|---|---|---|
| 1 | [01-current-state-audit.md](01-current-state-audit.md) | What actually exists today, feature by feature |
| 2 | [02-visual-fidelity-and-style-system.md](02-visual-fidelity-and-style-system.md) | The hand-drawn look, line styles, colors, fonts — and what a Canva-grade style system needs |
| 3 | [03-nextjs-control-api.md](03-nextjs-control-api.md) | Is the API enough for a Next.js app to drive the editor? |
| 4 | [04-custom-component-blocks.md](04-custom-component-blocks.md) | Can custom React/Next.js components render as slide elements? |
| 5 | [05-ai-templates-animation.md](05-ai-templates-animation.md) | The three pillars of your product: AI generation, element templates, per-item animation |
| 6 | [06-feature-backlog.md](06-feature-backlog.md) | Prioritized backlog, completeness double-check, and known bugs |

## Executive summary

### The three questions you asked

**1. "Shape lines are hand-drawn — can I make line style configurable?"**

Partly a misunderstanding, and that is good news. Four line styles **already exist** —
`DashStyle` is `draw | solid | dashed | dotted` (`packages/tldraw/src/types.ts:433-438`) and the
style panel already renders all four. Everything looks hand-drawn only because
`defaultStyle.dash = DashStyle.Draw` and `defaultTextStyle.font = FontStyle.Script` (Caveat
Brush) are the defaults (`packages/tldraw/src/state/shapes/shared/shape-styles.ts:174-186`).
**Changing two constants gives you a clean, non-sketchy editor today.**

The real gap is not line *style* but style *expressiveness*: 12 fixed named colors with no hex
(`types.ts:412-425`), 3 fixed stroke widths (2 / 3.5 / 5 px,
`shape-styles.ts:73-77`), 4 fonts, no opacity, no gradients, no shadows, no corner-radius
control, no per-side borders. That is the actual distance to Canva. See document 2.

**2. "Is the API enough for a Next.js app to control it?"**

**Yes for imperative control, no for declarative control.** The `TldrawApp` instance handed to
`onMount` exposes a large, genuinely usable API: `createShapes`, `updateShapes`, `loadDocument`,
`createPage`/`changePage`, `style`, `align`, `group`, camera and selection control. `apps/www`
is a working in-repo proof that this composes with Next.js.

But `<Tldraw>` is **uncontrolled** — it owns its state. You cannot hold the document in React or
server state and push it down as a prop: `updateDocument` never deletes pages
(`TldrawApp.ts:1312-1321`), the `document`-prop path has no echo-loop guard, and
`patchState`/`replaceState` are `protected` (`StateManager.ts:195-230`). The supported
architecture is: seed once with `loadDocument`, drive imperatively, persist from `onPersist`.
See document 3 for the recommended adapter design and 13 specific friction points.

**3. "Can I add custom Next.js block components to the UI?"**

**Not today, but the mechanism is already there and the fix is small.**
`HTMLContainer` renders *arbitrary React children* into real, camera-transformed DOM
(`packages/core/src/components/HTMLContainer/HTMLContainer.tsx:1-20`), and existing shapes
already mount live `<textarea>`, `<img>` and `<video>` elements this way. `@tlslides/core` is
fully open — `Renderer` takes `shapeUtils` as a prop.

The blocker is entirely in `@tlslides/tldraw`: `shapeUtils` is a hardcoded object literal with
no registration API (`packages/tldraw/src/state/shapes/index.ts:25-36`), `TDShapeUtil` is not
exported from the package root (`packages/tldraw/src/index.ts:1-5`), and `TDShapeType` is a
closed enum. The recommended fix is one new `ComponentShape` type plus a `components` registry
prop on `<Tldraw>`, keyed by a serializable `componentId`. See document 4.

### The finding that matters most (that you did not ask about)

**There is no slide frame.** A "slide" is literally a tldraw page (`types.ts:144`) with no width,
height, bounds, or aspect ratio anywhere in the data model. Every slide is an unbounded infinite
canvas.

This one absence blocks almost everything you want:

- **Templates** cannot define where elements go without a coordinate space to place them in.
- **AI generation** has no canvas dimensions to lay content out against.
- **Thumbnails** currently fake a preview by scaling whatever camera the author last left
  (`Deck.tsx:38-51`) — so the deck panel shows arbitrary framing per slide.
- **Export** sizes each slide to its content bounding box (`TldrawApp.ts:3608-3619`), so every
  slide exports at a different resolution and aspect ratio.
- **Present mode** never auto-fits, so presenting shows whatever pan/zoom was left behind.

Introducing a fixed slide frame (16:9 / 4:3 / custom) is the single highest-leverage change in
this codebase and is a prerequisite for the rest of your roadmap. It is detailed as **F-01** in
document 6.

### Overall verdict

This fork is a **credible canvas engine to build on, not a product to extend**. What it gives
you for free is genuinely valuable and expensive to rebuild: a mature infinite canvas with
selection, transform handles, snapping, grouping, undo/redo, multi-page decks, a minimal present
mode, local persistence, a working multiplayer pattern, and 71 test files.

What it does not give you is most of the *product*: no slide frame, no templates, no animation,
no rich text (text is a plain `string` in a `<textarea>` — no bold, italic, or bullet lists), no
brand kit, no deck-level export, no PDF (stubbed with a 500 at
`apps/www/pages/api/export.ts:41`), no PPTX, no i18n.

Two structural risks you should weigh before committing, both detailed in document 6:

1. **The dependency floor is React 17.** `zustand@3` and `mobx-react-lite@3` predate
   `useSyncExternalStore` and are known to tear under React 18 concurrent rendering. A modern
   Next.js app (React 19, App Router) will need this resolved — this is the largest hidden cost
   in the whole assessment.
2. **This is a frozen 2021 fork with no upstream.** It was never published to npm, so there is
   nothing to pull fixes from. You own 100% of maintenance forever.

Before committing, run a short spike comparing against building the slide layer on **current
tldraw (v2/v3)**, which has first-class custom-shape APIs, rich text, and React 18/19 support —
at the cost of losing this fork's Deck layer and requiring a licensing review. Document 6 frames
that decision.

## Current scope decision — editor-only phase

**Updated 2026-08-28.** Next.js integration and the AI pipeline are **deferred**. All work in
this phase stays inside this repo's editor packages. The goal is twofold:

1. Make the editor good **standalone**.
2. **Freeze the seams** so folding it into an existing Next.js app later is cheap.

Everything below re-prioritises [06-feature-backlog.md](06-feature-backlog.md) under that
constraint. The backlog itself is unchanged and remains the reference for effort estimates.

### Deferred (not this phase)

AI ingestion pipeline · semantic schema → `TDDocument` compiler · AI rewrite/expand · AI image
generation · product shell (accounts, dashboard, sharing, billing) · public present links ·
comments · version history · multi-slide multiplayer fan-out · PPTX export · PDF/DOCX import ·
stock photos · background removal.

**One exception worth pulling forward:** F-05 (templates with slots). It is not AI work, but the
slot format *is* the interface the AI will later target — it can emit
`{ templateId, slots: { title, bullets } }` instead of shapes. Designing it now makes the AI
phase materially smaller. It depends on F-01 and F-04, so it naturally lands at the end of this
phase.

### Gate — decide before writing code

**R-03 (build vs adopt) is more urgent in a preparation phase, not less.** This is the cheapest
moment to decide. Every week of work on this fork raises the cost of later migrating to current
tldraw (v2/v3), which already ships a frame concept, custom-shape APIs, rich text, and React
18/19 — i.e. F-01, F-02, F-03 and R-01 largely for free.

- **R-03 spike (~1 week):** build one 16:9-framed slide with a custom React block and rich text
  on current tldraw; measure against the F-01/F-02/F-03 estimates in document 6. Verify licensing
  directly with tldraw — recent SDK versions are not plain MIT.
- **R-01 spike (parallel):** mount `<Tldraw>` in React 19 / Next 15 and stress-test drag,
  multi-select, and undo for store tearing.

Do not start section "In scope" below until these return.

### The one-migration rule

Every persisted-schema change needs a `version < N` block in
`packages/tldraw/src/state/data/migrate.ts` (currently `15.3`, set at `TldrawApp.ts:3716`).
Right now there is effectively no user data, so migrations are free; after launch each one is a
risk.

**Therefore: batch every schema change into a single version bump now, and reserve fields even
where the UI ships later.**

| Field / fix | For | UI can come later? |
|---|---|---|
| `TDPage.size` + document-level default | F-01 slide frame | ❌ needed immediately |
| `TDPage.background` | Per-slide background | ✅ reserve now |
| `TDPage.notes` | Speaker notes | ✅ reserve now |
| `TDPage.skipInPresentation` | Skip slide when presenting | ✅ reserve now |
| `TDShape.animation?` | F-06 animation | ✅ optional field — no migration, but define the type now |
| `ImageShape.alt` | Accessibility | ✅ reserve now |
| `FontStyle.Serif = 'erif'` → `'serif'` | **B-01** | ❌ needs migration — fold in here |
| `childIndex` collisions | **B-03**, **B-04** | ❌ fold in here |

### In scope this phase, by module

**Tier 1 — quick wins (first week, near-zero risk)**

| Work | Module / path | Effort |
|---|---|---|
| Change sketchy defaults (`dash: Draw → Solid`, `font: Script → Sans`) | `packages/tldraw/src/state/shapes/shared/shape-styles.ts:174-186` | XS |
| Fix hardcoded `tldraw.com` export endpoints (**B-06**) | `apps/www/utils/export.ts`, `apps/www/pages/api/export.ts` | XS |
| Fix example dev server (`jsxFactory`/`jsxFragment`, **E-02**) | `examples/tldraw-example/scripts/dev.mjs` | XS |
| Rename slide from the deck panel | `packages/tldraw/src/components/DeckContextMenu/` | XS |

**Tier 2 — foundation**

| ID | Work | Module / path | Effort |
|---|---|---|---|
| **F-01** | Slide frame / artboard + the batched migration above | `state/data/migrate.ts`, `types.ts`, `state/TldrawApp.ts`, `components/Deck/Deck.tsx`, new frame renderer | L |
| **F-02** | `ComponentShape` + `components` registry prop | new `state/shapes/ComponentUtil/`, `state/shapes/index.ts`, `types.ts`, `Tldraw.tsx`, `hooks/useTldrawApp.tsx` | M |
| **F-04** | `insertContent()` public API (lift out of `paste`) | `state/TldrawApp.ts:1805-1877` | S |
| — | Reorder slides (`movePage` + drag-and-drop) | new `state/commands/movePage/`, `components/Deck/Deck.tsx` | M |
| — | Fullscreen present + auto zoom-to-fit on slide change | `components/BottomPanel/`, `state/commands/changePage/` | S |
| — | Fix B-02, B-05, B-07, B-08, B-09, B-10 | as cited in document 1 §1.9 | S total |

**Tier 3 — style & shapes (independent, parallelisable)**

Opacity (S) · true line shape, **B-05** (S) · corner radius (S) · numeric X/Y/W/H inspector (S) ·
format painter (S) · layers panel (M) · star / polygon / speech bubble (M) · arbitrary hex colour
+ picker (L) · arbitrary stroke width (M).
Modules: `packages/tldraw/src/state/shapes/`, `components/TopPanel/StyleMenu/`.

**Tier 4 — consumability prep (de-risks integration without writing any Next.js)**

| Work | Module / path |
|---|---|
| Decide: ship transpiled JS from `dist`, or require consumers to transpile | `packages/tldraw/package.json`, the `lask` build config |
| Widen React peer dep to `^17 \|\| ^18 \|\| ^19` (after R-01) | `packages/tldraw/package.json`, `packages/core/package.json` |
| Add a ~20-line throwaway Vite consumer importing from `dist`, so packaging regressions surface immediately | new `examples/consumer-smoke/` |
| Freeze and document the control contract: seed with `loadDocument` → drive imperatively → persist from `onPersist` (omitting the `id` prop disables IndexedDB) | [03-nextjs-control-api.md](03-nextjs-control-api.md) |

### Implementation progress

Live status of the editor-only phase. Updated after every phase; each phase is committed
separately so work can be resumed later.

**Harness:** a Next.js 15 / React 19 sample app under `examples/nextjs-sample/` doubles as the
R-01 compatibility spike and as the surface for headless browser testing. Playwright (1.61.1,
headless Chromium) is reused from a sibling checkout rather than installed here.

| Phase | Contents | Status |
|---|---|---|
| 1 | Tier 1 quick wins — solid/sans defaults, B-06 endpoints, example dev server, deck rename | ✅ done |
| 2 | Test harness — Next.js sample app + headless Playwright screenshot script | ✅ done |
| 3 | Batched schema migration — reserve `TDPage.size`/`background`/`notes`/`skipInPresentation`, `TDShape.animation?`, `ImageShape.alt`; fix B-01, B-03, B-04, B-12, B-13 | ✅ done |
| 4 | **F-01** slide frame / artboard | ✅ done |
| 5 | **F-02** `ComponentShape` + `components` registry prop | ✅ done |
| 6 | **F-04** `insertContent()` · `movePage` + deck drag-and-drop · fullscreen · B-07 | ✅ done |
| 7 | Bug sweep — B-02, B-05, B-08, B-09, B-10 | ✅ done |
| 8a | Tier 3, data/render layer — opacity, arbitrary stroke width, corner radius (no UI yet) | ✅ done |
| 8b | Tier 3, UI — style panel controls for 8a's fields, arbitrary hex colour + picker | ✅ done |
| 8c | Tier 3, remaining — numeric X/Y/W/H inspector, format painter, layers panel, star / polygon / speech bubble | ⬜ pending |
| 9 | Tier 4 — consumability: transpiled `dist`, React peer range, consumer smoke test | ⬜ pending |
| 11 | Background system — structured `SlideBackground`, SVG `<defs>` gradients on slides and shapes, `BackgroundMenu` UI, curated presets (see `reviews/roadmap-slides.md`) | ✅ done |
| 12 | Deck theme / brand kit — `TDDocument.theme`, five built-in palettes, `'theme:accent1'` sentinel tokens, `ThemeMenu` UI (see `reviews/roadmap-slides.md`) | ✅ done |
| 13 | Template system — `slot?` field, twelve theme-aware starter layouts, `addSlideFromTemplate`, `TemplatePicker` UI (see `reviews/roadmap-slides.md`) | ✅ done |
| 14 | Host control API — `app.deck.*` facade, typed event stream, caller-supplied slide ids, `DeckViewer` read-only entry point, `getThumbnail` (see `reviews/roadmap-slides.md`) | ✅ done |
| 15 | Headless render + export — pure `renderPageToSvg`, `getThumbnail` works for any slide with no DOM, browser-only PNG rasterization, deck JSON in/out, PDF scoped to a documented recipe (see `reviews/roadmap-slides.md`) | ✅ done |

#### Phase 1 notes

- **Defaults changed** in `packages/tldraw/src/state/shapes/shared/shape-styles.ts`:
  `dash: Draw → Solid`, `font: Script → Sans`. 10 snapshot files regenerated; every diff was a
  literal `"draw"` → `"solid"` / `"script"` → `"sans"` swap, no geometry changed. Verified in a
  real browser, not only by snapshot — see `tools/visual/shots/shapes.png`.
- **B-06 fixed.** `apps/www` no longer references `tldraw.com`. New env vars:
  `NEXT_PUBLIC_EXPORT_ENDPOINT` (defaults to the same-origin `/api/export`) and
  `NEXT_PUBLIC_BASE_URL` (falls back to `VERCEL_URL`, then localhost).
- **E-02 was deeper than "a missing `jsxFactory`".** Three separate faults stacked up in
  `examples/tldraw-example`, and only the last one is visible without a browser:
  1. `dev.mjs` lacked `jsxFactory`/`jsxFragment` (the reported bug).
  2. esbuild's default loader for `.js`/`.mjs` is plain JS, so it refused to parse the
     JSX-shipping `dist` bundles at all → `loader: { '.js': 'jsx', '.mjs': 'jsx' }`.
  3. **`tsconfig.base.json` sets `"jsx": "preserve"`.** esbuild honours the nearest tsconfig for
     *every* input file — including files under `packages/*/dist` — and preserve beats
     `jsxFactory`. So the build reported success while emitting raw JSX, and the page died at
     runtime with `Unexpected token '<'`. Fixed with a dedicated `tsconfig.build.json`
     (`"jsx": "react"`) passed explicitly to esbuild. The `jsx` build option would be the tidier
     fix but does not exist in esbuild 0.14.
  `scripts/build.mjs` had faults 2 and 3 too and was fixed identically.
- **Deck rename** reuses `window.prompt`, matching the existing flow in `PageOptionsDialog.tsx`
  (which carries the same `// TODO: Replace with text input`). The pinned Radix 0.1.x predates
  reliable dialog-inside-context-menu composition. **Debt:** a real inline text input is wanted
  before this is a shippable product surface.
- **Jest was broken before this phase started** — all 63 suites failed. pnpm resolved
  `@swc-node/register` 1.12 and `@swc/core` 1.16 (far newer than the `^1.4.3` the repo intends),
  and modern `@swc/core` emits `require("@swc/helpers/_/…")` while the transitively-installed
  `@swc/helpers` is 0.4.11, which predates that subpath layout. Fixed by declaring
  `@swc/helpers: ^0.5.15` directly in `packages/tldraw` and passing `{ module: 'commonjs' }` to
  the `@swc-node/jest` transform. No other package declares `@swc/helpers`, so `apps/www` keeps
  its own 0.4.11 via Next 12.
- **New: `tools/visual/`** — a headless Playwright harness. Jest cannot catch a canvas that
  renders nothing; fault 3 above passed all 63 suites. Playwright is not added as a dependency
  (it would pull a browser download into a 2021 dependency tree); the harness reuses an existing
  installation and honours `PLAYWRIGHT_PATH`.

**Verified:** 63/63 jest suites, 17/17 snapshots · `turbo run build:packages` 9/9 · eslint clean
on touched files (2 pre-existing warnings) · example app renders and draws in headless Chromium.

#### Phase 2 notes — and the R-01 answer

`examples/nextjs-sample/` is a **Next.js 15.5 / React 19.2 / App Router** app embedding the editor.
It is both the reference integration and the R-01 compatibility spike. It runs on port 5433
(5432 is the Postgres port and was already bound on the dev machine).

`components/Editor.tsx` implements exactly the architecture
[03-nextjs-control-api.md](03-nextjs-control-api.md) recommends: no `id` prop, seed once via
`loadDocument` in `onMount`, drive imperatively through a ref, persist from `onPersist`. It
exposes `window.tlapp` for the harness and has a control strip with stable ids so later phases
have something to assert against.

**R-01 verdict: React 19 works — after one real fix.**

- **Mount, draw, drag, multi-select, undo/redo × 6 all behave correctly.** No tearing, stale
  render, or dropped update was observed despite `zustand@3` / `mobx-react-lite@3`. The feared
  concurrent-rendering tearing did not materialise under real browser input. (Caveat: Playwright
  drives genuine user input, not a synthetic scheduler-interruption stress test.)
- **B-14, found and fixed.** `<Tldraw>` constructs its `TldrawApp` in a `useState` initializer.
  React StrictMode invokes that initializer twice, so **two apps and two zustand stores** were
  created, and `onMount` fired from `TldrawApp.onReady` for *both* — including the instance React
  discarded. A host app's captured ref could therefore point at a detached store: direct mouse
  input still worked, but every imperative call silently mutated nothing. Since StrictMode is on
  by default in every modern Next.js app, this made the documented control API unreliable in
  development. Fixed by moving the `onMount` call out of `TldrawApp.onReady` and into an effect in
  `Tldraw.tsx` keyed on `app` — effects only run for the retained instance. Verified with
  `reactStrictMode: true`: a hand-drawn shape and a button-created shape now land in the same
  visible store.
- **One unfixable-from-here React 19 warning.** `@radix-ui/react-slot@0.1.2` (pinned by
  `packages/tldraw`'s 2021-era `@radix-ui/*@^0.1.x`) reads `element.ref`, which React 19 warns
  about on every `asChild` render. Cosmetic, but it fires constantly and only a Radix upgrade
  across the fork removes it. The harness records it as a declared known issue rather than
  filtering it, so a *new* console error still fails the run.
- **Two build-level gotchas worth keeping.** The React 17 hoisted at the workspace root must be
  aliased away in `next.config.js`, but **only for the client compiler** — aliasing the server
  compiler too collapses Next's RSC/SSR React layering and breaks prerendering of even
  `/_not-found`. And `next build`'s type-check resolves `@types/react` through real (non-symlink)
  ancestors into the root's 17.x, so the app pins `typeRoots`/`paths` to its own copies.

**Verified:** 63/63 jest · `build:packages` 9/9 · `next build` clean · `next dev` + `next start`
serve 200 · `node tools/visual/shoot.js nextjs --base=http://localhost:5433` exits 0.

#### Phase 3 notes

One version bump, `15.3 → 16`, carrying every schema change the roadmap needs.

**Reserved now, used later.** `TDPage` became an interface extending `TLPage` (no fallout — it
compiled everywhere unchanged) and gained `size`, `background`, `notes`, `skipInPresentation`.
`TDDocument` gained `defaultPageSize`. `TDBaseShape` gained an optional `animation`, with
`AnimationEffect` / `AnimationTrigger` / `ShapeAnimation` defined so F-06 has a fixed contract.
`ImageShape` and `VideoShape` gained `alt`. Only `size` is populated this phase; the rest exist so
no later phase has to bump the version again.

`DEFAULT_SLIDE_SIZE = [1920, 1080]` — canonical 16:9, exports 1:1 at full HD.

**Bugs fixed:** B-01 (`FontStyle.Serif` was `'erif'`; the migration matches the *string literal*,
since the enum constant is correct by then), B-03 and B-04 (`childIndex` collisions — `createPage`
and `duplicatePage` now share one `getNextChildIndex` helper, and the migration repairs documents
already saved with colliding indices), B-12 (`duplicatePage` built its page state by spreading the
whole *page*), B-13 (the `version < 14` block compared where it meant to assign).

**Array aliasing, caught in review.** `DEFAULT_SLIDE_SIZE` is a module-level array and was being
assigned by reference to the document, to every page, and to both default pages — so a single
in-place `page.size[0] = …` would have corrupted the default for every slide in the process.
F-01 is about to start resizing frames, so this would have surfaced as a baffling bug. Every
assignment now copies, and `duplicatePage` copies the source page's `size` instead of aliasing it.
Both are covered by tests asserting `not.toBe` alongside `toEqual`.

Also closed a consistency gap: `createPage` now stamps new slides with the document's
`defaultPageSize`, so a slide created after migration matches one that was migrated.

**Verified:** 63/63 suites (284 passing, up from 274) · `build:packages` 9/9 · visual harness
exits 0.

#### Phase 4 notes — F-01, the slide frame

A slide is now a bounded surface. `packages/core` gained a neutral `frame?: number[]` prop on
`Renderer`/`Canvas` and a `Frame` component that paints a "paper" rectangle plus a dimming scrim
over the pasteboard. Core still does not know what a slide is — it receives a rectangle and three
theme tokens (`frameFill`, `frameBorder`, `frameDim`), the same way it already receives `grid`.
The frame renders alongside `Grid`, outside `.tl-layer`, doing its own camera math, because the
scrim has to cover the whole viewport rather than only the frame's own bounds.

- **`zoomToFit` now fits the frame** when the page has a `size`; `zoomToContent` still fits
  content — they are different operations.
- **Slides auto-fit on change**, applied as a side effect *after* `changePage` rather than inside
  the command, so undo/redo moves between slides without replaying camera moves. It survives
  presentation mode, where `cleanup` reverts `document.pages` but not `pageStates`.
- **A `hasKnownViewport` guard** was needed: `rendererBounds` starts as a 100×100 placeholder, and
  fitting against it produces a nonsense camera. This surfaced as a genuine regression in
  `moveShapesToPage.spec.ts`, whose setup changes pages with no renderer ever mounted.
- **Thumbnails frame the slide**, not the author's camera. Verified numerically, not just by eye:
  the scenario reports `thumbnailRatios: [1.78, 1.78, 1]` for two widescreen slides and one
  square.
- **Export uses frame dimensions** via a `useFrame` flag, so every slide exports at the same size.
  "Copy as SVG" keeps its tight crop, and pages without a `size` keep the old behaviour exactly.
- **`app.setPageSize(pageId, size)`** is a proper undoable command; `SLIDE_ASPECT_PRESETS` covers
  widescreen, standard and square. **No UI yet** — nothing existing was a natural home for it.

**Two bugs caught in review, both invisible to the test suite:**

1. **Dark mode made slide contents nearly invisible.** The paper was white in both themes, on the
   reasoning that paper is white. But `strokes.dark` maps `ColorStyle.Black` to `#cecece`, so
   every default shape rendered near-white on a white slide. The frame surface now follows the
   theme, a step lighter than the canvas background so it still reads as a distinct surface.
   *The deeper issue remains open:* shape colours flip with the **UI** theme, which is a
   whiteboard assumption. For a slide product the slide surface should come from
   `TDPage.background` (reserved in Phase 3) and shape colours should be absolute. Worth doing
   before the style work in Tier 3.
2. **Thumbnails were clipped.** The container is `border-box` with `5px` vertical padding, but its
   height was set to the thumbnail height alone, so the content box was 10px shorter than the
   canvas inside it. Measured in the browser: paper 160×90 inside a 159×90 canvas after the fix.

**Not dimmed:** shapes *outside* the frame render at full contrast; only the background dims. This
matches Figma rather than Canva, and is a deliberate, documented choice rather than an oversight.

**Verified:** 65/65 suites (296 passing, up from 284) · `build:packages` 9/9 · visual scenario
exits 0 in both themes.

#### Phase 5 notes — F-02, component blocks

**A React component written in the host Next.js app now renders as a slide element.** The document
stores only `{ componentId, props }`, never React, so it stays JSON-serializable and persistence,
`.tldr` files and multiplayer are unaffected. An AI can emit that pair without emitting React.

- `ComponentShape` + `ComponentUtil`, registered like any other shape util. No version bump — this
  is an addition to a union, not a schema change.
- `<Tldraw components={...}>` delivers the registry through React context (`useTldrawComponents`),
  with a stable empty default so hosts that never pass it do not thrash renders.
- **Two failure modes, both non-fatal.** An unregistered `componentId` renders a labelled
  placeholder; a registered block that *throws during render* is caught by an error boundary and
  degrades to a card. A document outlives the app that defined its blocks, so neither may take the
  document down.
- `isStateful = true`, so a block keeps its state, timers and subscriptions when scrolled
  off-screen. Blocks are `pointerEvents: 'all'` and click-to-select by default; host components
  with their own controls should `stopPropagation`, the same pattern `StickyUtil` uses.
- **SVG export shows a labelled placeholder, not the block.** HTML shapes have no `#{id}_svg` node
  to clone. PNG export goes through headless Chrome and does capture the real DOM — the screenshot
  below is direct evidence. Caveat: the export page must be given the *same* registry as the
  editor, or blocks resolve to placeholders there.
- Demonstrated end to end in `examples/nextjs-sample`: a KPI tile and a hand-rolled bar chart (no
  charting dependency), inserted from the control strip, rendering as finished slide content.

**`Patch<T>` had to change.** Adding `props: Record<string, unknown>` broke the repo's recursive
patch type: `Patch<unknown>` collapsed to `{}`, which `unknown` is not assignable to, producing
~40 type errors. Gating the recursion on `T extends object` stops it at primitives and at
`unknown`/`any`, and — because the check is on a naked generic — keeps distributing over the
`TDShape` union so each variant keeps its own discriminant. The build tool does not fail on type
errors, so this would have shipped as broken types with a green build.

**Caught in review: loading a document did not fit the slide.** The reference app opened at 100%
zoom with the frame off-screen, because `loadDocument` restored the camera the document was saved
at. A deck is opened to be looked at, so it now fits, guarded the same way `changePage` is.

**Verified:** 67/67 suites (306 passing, up from 296) · `build:packages` 9/9 · `next build` clean ·
`blocks` scenario exits 0, screenshot inspected.

#### Phase 6 notes

**`insertContent()` (F-04).** The id-remapping core is out of `paste`'s local closure and public:
`insertContent(content, opts)`, where `center` (default true) places the content's bounding box at
a point, and `center: false` keeps its authored coordinates — which is what templates need.
`paste` now delegates to it and keeps only its own "fan out repeated pastes" bookkeeping. The
refactor closed a latent bug: `paste` patched `document.assets` with a bare `patchState`, bypassing
the undo stack, so undoing a paste left its asset behind. It is one command now.

**Reorder (`movePage`).** `movePage(pageId, toIndex)` takes the target position in the deck's final
order, which is what both drag-and-drop and "move up/down" want, and renumbers every `childIndex`
to a clean `1..N` rather than inserting fractionally — so repeated moves cannot drift into a
float collision. The deck gained native HTML5 drag-and-drop (no dependency) with a drop indicator,
plus Move Up / Move Down in the context menu as the non-drag path. Dragging works over the live
thumbnails because `.tl-canvas` inside them is already `pointer-events: none`.

**Fullscreen + B-07.** Presenting now requests fullscreen, with the rejection swallowed so
presentation mode works regardless — the API needs a user gesture, is absent in some browsers, and
is blocked in cross-origin iframes. A `fullscreenchange` listener resyncs when the user leaves with
Esc, and a separate idempotent `exitPresentationMode()` avoids the double-toggle race between the
browser's Esc and ours. **B-07 is fixed by making `readOnly` derived** —
`get readOnly() { return this._readOnly || this.settings.isPresentationMode }` — so the prop and
presentation mode can no longer stomp each other in either write order, and a reload that restores
`isPresentationMode: true` is read-only again instead of editable.

**Caught in review: only `changePage` auto-fitted.** `createPage`, `duplicatePage` and
`deletePage` all switch the current page by writing `currentPageId` directly, so creating a slide
left the camera at 100% with the frame off-screen — visible in the first reorder screenshot. All
five entry points (including `loadDocument`) now go through one `fitCurrentPage()` helper.

Fullscreen cannot be exercised headlessly and is not claimed to be. What is tested: the calls are
made at the right times against stubbed APIs, a rejected request leaves no inconsistent state, the
absence of the API degrades gracefully, and a real `fullscreenchange` event resyncs the component.

**Verified:** 70/70 suites (335 passing, up from 306) · `build:packages` 9/9 · all four visual
scenarios pass — `reorder` reports `[A,B,C] → [B,C,A]` with the drop indicator visible mid-drag.

#### Phase 7 notes — bug sweep

Every bug from the audit's table (§1.9 of
[01-current-state-audit.md](01-current-state-audit.md)) is now closed.

- **B-02.** The PDF branch responded and then fell through, writing the response twice. It returns
  now, with `501 Not Implemented` rather than `500` — it is not an error, it does not exist. The
  export menu no longer offers PDF either; a UI that lets you pick a format that cannot work is
  the larger half of this bug. PDF export itself remains a backlog item.
- **B-05.** There is a real `LineUtil` now, and `LineTool` no longer fakes a line with a
  decoration-less arrow. A line deliberately does **not** inherit binding, the bend handle, or
  labels — it is geometry, not a connector. It reuses only `ArrowUtil`'s freehand shaft renderer,
  where the geometry is genuinely identical. Existing arrow-shaped "lines" in old documents are
  untouched and keep working.
  Two ripples were needed: `SelectTool` routed *any* non-`bend` handle drag through `ArrowSession`
  (which casts to `ArrowShape`), so it now dispatches on shape type; and `HandleSession` gained an
  `isCreate` flag so cancelling mid-draw deletes the shape instead of leaving a stub, matching
  what the other creation sessions already do.
- **B-08.** `patchAssets` wrote `this.document.assets` directly, bypassing the store. It goes
  through `patchState` now. A test asserts the `document` reference actually changes — a direct
  mutation would pass a naive "the asset is there" assertion.
- **B-09.** The example called `app.patchShapes`, which does not exist; `updateShapes` is the real
  API. Verified by building the example, not by reading it.
- **B-10.** **Dead, not a live bug** — settled by evidence: `appState.pages` was removed from
  `TDSnapshot` in `0685ca38` (Nov 2021) and the write site was never updated, with zero readers
  anywhere in the repo since. Removed.

**Also fixed: the last type error in the build.** `@tlslides/core` had been emitting
`useZoomEvents.ts:127 — Type 'number' is not assignable to type 'Vector2 | …'` on every build.
`@use-gesture` v10 types `pinch.from` as a `[scale, angle]` pair; a bare number was a leftover
from an older version. **`build:packages` is now completely clean**, which matters more than it
sounds: the build tool does not fail on type errors, so a real error hiding in expected noise is
exactly how the `Patch<T>` breakage in Phase 5 would have shipped.

**Verified:** 71/71 suites (345 passing, up from 335) · `build:packages` 9/9 with zero errors ·
example builds · all five visual scenarios pass.

**Out of scope for this phase:** everything under "Deferred" above. **R-03 (build vs adopt)** is a
decision spike, not implementation work, and is not tracked here.

#### Phase 8a notes — style expressiveness, data/render layer only

Tier 3's opacity, arbitrary stroke width, and corner radius, but deliberately **data and render
plumbing only** — no style-panel UI. That is 8b: this phase makes the fields exist, persist, and
render correctly everywhere; a user still cannot set them from the app.

- **Three new optional `ShapeStyles` fields** — `opacity?`, `strokeWidth?`, `cornerRadius?` — each
  falls back to today's exact behaviour when absent, so **no migration and no `TldrawApp.version`
  bump** (document version stays 16). Three helpers in `shared/shape-styles.ts` are the single
  source of truth: `getShapeOpacity(style, isGhost)` (multiplies the persisted opacity by the
  transient ghost-drag dim, rather than one replacing the other), `getEffectiveStrokeWidth(style)`
  (already the one place `getShapeStyle` turns a style into a pixel stroke width, so every
  downstream multiplier — dash spacing, hand-drawn outline thickness, arrowhead length — follows
  an arbitrary width for free), and `clampCornerRadius(radius, size)` (degrades an over-large
  request to a stadium/circle instead of inverted geometry).
- **Opacity wired into every shape util.** SVG shapes (`Rectangle`, `Ellipse`, `Triangle`, `Draw`,
  `Line`, `Arrow`, `Group`) put the opacity on an inner `<g>`, never on `<SVGContainer>` itself —
  the one real trap here. `SVGContainer` spreads unknown props (opacity included) onto the outer,
  *uncloned* `<svg>`, while `getSvgElement` clones the inner `<g id="{id}_svg">` for SVG export.
  Opacity on the outer element looks correct live and then silently vanishes from an export — a
  bug that existed in `Rectangle`/`Ellipse`/`Triangle` (each had `<SVGContainer opacity={...}>`)
  before this phase. HTML shapes (`Sticky`, `Text`, `Image`, `Video`, `Component`) instead set
  opacity as an inline style, since their existing `isGhost` stitches variant only knows two
  states and an inline style wins over it anyway — the variant is kept only for its `transition`.
  `Image`/`Video` also copy the opacity onto the fresh `<image>` element their `getSvgElement`
  builds (there is no live node to clone there). `Component`'s SVG export stays an honest,
  fixed-style dashed-rect placeholder — see Phase 5 — so opacity/corner-radius are deliberately
  **not** threaded into it.
- **A real bug, caught by looking at the screenshot, not by any test.** Feeding a large explicit
  `cornerRadius` into the hand-drawn (`DashStyle.Draw`) rectangle's existing algorithm rendered a
  **hexagon**, not a rounded rectangle: the algorithm trims each of the four straight edges short
  of the corner and had always left perfect-freehand to connect the gap on its own, which reads as
  a small, natural-looking round at the tiny implicit radius (`min(w/2, sw*2)`, a few px) but is a
  visibly straight chord at a 100+px explicit radius. Fixed in `rectangleHelpers.ts` by generating
  real quarter-ellipse arc points to bridge each gap whenever `cornerRadius` is explicit; the
  default (no `cornerRadius`) path is untouched byte-for-byte. `tools/visual/scenarios/styles.js`
  exists specifically to keep this class of bug visible going forward.
- **`DashedRectangle.tsx`** (the solid/dashed/dotted path) switches from four independent
  `<line>` segments (each individually dash-centered via `getPerfectDashProps`) to a single
  `<rect rx ry>` when a corner radius is set, since rounding needs one continuous outline. The
  trade-off: dash spacing is computed once against the straight-edge perimeter (ignoring the small
  length the corner arcs add), so the pattern is very slightly out of phase right at a rounded
  corner instead of perfectly centered on every straight run — judged acceptable for a cosmetic
  feature, and documented in the code rather than silently accepted.
- **`ComponentShape` corner radius** is applied as a CSS `border-radius` set imperatively (same
  `useLayoutEffect` that already drives width/height from live shape size), so a host React block
  clips to the same radius as any other shape.
- **`TextLabel` gained an `opacity` prop**, applied as an inline style rather than fighting its own
  pre-existing `isGhost` stitches variant (which, it turns out, was already dead code — no caller
  had ever passed it `isGhost`).

**Verified:** 72/72 suites (357 passing, up from 345; 12 new tests for the three `shape-styles.ts`
helpers) · `build:packages` 9/9 with zero type errors · new `styles` visual scenario exits 0 with
no console errors, and all four pre-existing scenarios (`shapes`, `line`, `frame`, `reorder`)
re-verified with no regression — screenshots inspected, not just asserted on.

#### Phase 8b notes — style panel UI, arbitrary hex colour

Everything 8a wired into data/render is now settable from the app: an opacity slider, a
stroke-width number field, a corner-radius number field (Rectangle/Component only), and a new
arbitrary-hex colour picker with independent Stroke/Fill overrides. All four go through
`app.style(...)` → `Commands.styleShapes` exactly like the pre-existing Color/Fill/Dash/Size
controls — no new command-layer code was needed; the generic patch already round-trips any
`Partial<ShapeStyles>` through undo/redo.

- **Colour data model: `stroke?: string` / `fill?: string`, not one `color` override.** The enum
  already resolves to *two* independent, differently-toned palette lookups
  (`strokes[theme][color]` vs `fills[theme][color]`) — a brand kit needs the same independence to
  pin an exact stroke hex and an exact fill hex separately (e.g. a white-stroke, brand-orange-fill
  shape). Naming them `stroke`/`fill` (not `customStroke`/`customFill`) mirrors the two keys
  `getShapeStyle` already returns, since that's exactly what they replace. Resolved in
  `getShapeStyle` as `style.stroke ?? strokes[theme][color]` / `isFilled ? style.fill ??
  fills[theme][color] : 'none'` — every shape util already renders through this function, so the
  override is picked up everywhere for free, same as 8a's `getEffectiveStrokeWidth`. `getStickyShapeStyle`
  (StickyUtil's own palette, which remaps white/black to yellow) is deliberately left untouched —
  an arbitrary hex bypassing that remap would stop looking like a sticky note.
- **Theme semantics, decided explicitly: an arbitrary hex does NOT flip with the UI theme.** The
  enum palette flips with `isDarkMode` because it exists to keep whiteboard ink legible against a
  background that itself flips; an arbitrary hex is presented to the user as "this exact colour"
  (the way a brand kit or design import would supply it), and silently shifting it when someone
  toggles the *app's own* UI theme would undermine the entire point of pinning a value. In
  `getShapeStyle`, `theme` is consulted only in the `??` fallback branch, never applied to an
  explicit `style.stroke`/`style.fill`. This is a first, narrow step against the open issue
  flagged in the Phase 4 notes above (shape colours flipping with UI theme is a whiteboard
  assumption that doesn't fit a slide product) — the full fix (slide colours keyed off
  `TDPage.background` instead of UI theme) is still open.
- **Size-enum vs. arbitrary-stroke-width, and color-enum vs. custom-hex: the same coherence rule,
  applied twice.** An explicit override otherwise wins forever (`getEffectiveStrokeWidth` and the
  `stroke ?? enum` fallback both prefer the override unconditionally), which would make the S/M/L
  buttons and the colour swatches look permanently broken once a shape had ever been customized.
  Resolved by making the *discrete* control the one that clears the override, in the same
  `app.style()` call, so one undo step restores both together: `handleSizeChange` calls
  `app.style({ size, strokeWidth: undefined })`; `handleColorChange` calls
  `app.style({ color, stroke: undefined, fill: undefined })`. This relies on
  `Utils.deepMerge` treating an explicit `undefined` in a patch as "clear this field" rather than
  a no-op (verified directly in `styleShapes.spec.ts`) — the same mechanism 8a's optional fields
  already depend on for falling back to today's behaviour.
- **No slider primitive existed anywhere in this repo** (no `@radix-ui/react-slider` dependency, no
  `type="range"` input, nothing under `components/Primitives/`) — contrary to the phase brief's
  assumption. Added one (`components/Primitives/Slider/`) wrapping a native `<input type="range">`
  rather than pulling in a new Radix package for a single control. It fires `onValueChange`
  continuously (for the live "NN%" label) but only calls `onValueCommit` once per gesture — on
  pointer-up, key-up, or blur — so dragging the opacity slider produces one undo step, not one per
  pixel.
- **A real interaction bug, found only once the browser scenario drove the actual UI, not by any
  test:** typing into the new stroke-width/corner-radius/hex fields and pressing Tab to move to the
  next field **cloned the selected shape**. `SelectTool.onKeyDown`'s `case 'Tab'` (a pre-existing,
  legitimate "duplicate shape to the right" shortcut) is wired through `@tlslides/core`'s
  `useKeyEvents`, which listens on `window` unconditionally — it has no notion of "a form field has
  focus" the way `useKeyboardShortcuts.tsx`'s `canHandleEvent()` checks do. Every text-editing
  keystroke inside the style panel was therefore also live canvas input, and a debugging session
  confirmed it: after Tab, `window.app.selectedIds` pointed at a *brand-new* cloned shape, so every
  style change after that point was silently landing on the clone instead of the shape being
  edited. Fixed with `stopKeyPropagationUnlessEscape` (new, in `components/preventEvent.ts`),
  wired to `onKeyDown`/`onKeyUp` on every free-typed control (the two number fields, the hex text
  fields, the native colour swatches) and baked into the `Slider` primitive itself. It stops
  propagation for every key except Escape, so Escape still closes the menu / cancels the tool, but
  nothing else typed into these fields ever reaches the canvas's global shortcut system. This
  works because React 17 changed event delegation to use real native bubbling from the target up
  to the app's root container, so a React `stopPropagation()` call now genuinely stops the event
  before it reaches a plain `window.addEventListener` — this fix would not have worked against
  React 17's own delegation model pre-17. This class of bug will recur for any future on-canvas
  form field (Phase 8c's numeric X/Y/W/H inspector is exactly that), so it's documented prominently
  on the helper itself, not just here.
- **A second, smaller bug caught by comparing the screenshot to the live shape:** the "Styles"
  trigger button's swatch preview read `strokes[theme][displayedStyle.color]` directly, ignoring a
  custom `stroke`/`fill` override entirely — so after picking a brand-blue custom stroke, the
  trigger button kept showing the old enum colour (initially red, in the scenario) while the shape
  itself was correctly blue. Fixed to fall back through the override the same way `getShapeStyle`
  does: `displayedStyle.stroke ?? strokes[theme][color]`.
- **Corner radius is conditionally shown**, not always-on like Color/Fill/Dash/Size: a
  `cornerRadiusVisibleSelector` shows the row when the Rectangle tool is active, or when any
  currently selected shape is a Rectangle or Component (`TDShapeType`), since a radius on e.g. a
  selected Ellipse or Line would be silently inert.
- **`tools/visual/scenarios/stylepanel.js`** is the one scenario in this repo that drives the
  actual UI rather than `window.app`'s imperative API for the thing under test: it clicks a real
  shape to select it, clicks the real `#TD-Styles` trigger, drags the opacity slider via a real
  mouse click on its track, and types into the real number/hex fields — `window.app` is only used
  to seed one deterministic shape and to read back document/render state for assertions. It
  exercises both coherence rules above through real clicks on the Large size button and the Red
  swatch, and checks the corner-radius row's conditional visibility.

**Verified:** 72/72 suites (364 passing, up from 357; 7 new tests covering `getShapeStyle`'s
stroke/fill resolution and theme-invariance, and the style command's undo/redo + coherence rules
for the new fields) · `build:packages` 9/9 with zero type errors · new `stylepanel` visual scenario
exits 0 with no console errors and confirms every field round-trips through both the document and
the rendered SVG attributes · all five pre-existing scenarios (`styles`, `shapes`, `frame`, `line`,
`reorder`) re-verified with no regression — screenshots inspected, not just asserted on.

#### Phase 11 notes — background system

Widened `TDPage.background` from a reserved, unrendered `string` into a structured
`SlideBackground` union (solid / linear gradient / radial gradient / image), rendered it in
`packages/core/src/components/Frame/Frame.tsx`, and extended `ShapeStyles` with a matching
gradient fill for shapes. No migration, no `TldrawApp.version` bump — document version stays 16,
per the roadmap's own reasoning: nothing ever rendered the old field.

- **The angle convention is CSS's, not math's, and it's documented at the one place it's
  converted.** `angle` is degrees, clockwise, 0° = "to top" — exactly `linear-gradient()`'s own
  convention — picked purely so users don't have to learn a second one. The conversion lives in
  one function, `gradientAngleToVector` (`state/shapes/shared/background.ts`): it rotates the
  "pointing up" unit vector by the angle and scales it out from the center by
  `(|dx| + |dy|) / 2`, which reaches a corner of a unit `objectBoundingBox` square at
  45/135/225/315° and an edge midpoint at 0/90/180/270° — exact for a 1:1 box, a close and
  standard approximation for a 16:9 slide. Both the page background and shape fills call through
  this one function, so the convention only has to be right once. Tested directly in
  `background.spec.ts` (the four cardinal angles, plus 45° hitting the exact corner).
- **Gradients are SVG `<defs>`, never CSS, end to end — and this is the one thing a screenshot
  caught that no type check or unit test could.** The plan was: `Frame` renders `<defs>` +
  `<linearGradient>`/`<radialGradient>` and points the paper rect's `fill` attribute at
  `url(#id)`. That's exactly what shipped — and it looked completely broken live: the paper
  stayed the plain theme grey no matter what background was set, while every assertion (the
  `<defs>` node existed, the `fill` attribute was correctly `url(#...)`) passed. The cause:
  `useStyle.tsx`'s `.tl-frame-paper { fill: var(--tl-frameFill) }` is a CSS class rule, and an
  SVG *presentation attribute* (`fill="..."` written directly on the element) carries effectively
  zero specificity — any stylesheet rule for the element, however unrelated-looking, wins over it
  outright. This is the same family of bug as Phase 8a's `<SVGContainer opacity>` trap (something
  that looks like the right attribute in the right place, silently overridden by a sibling
  concern), just one layer further down the cascade. Fixed by setting the override as an inline
  `style={{ fill: paperFill }}` instead of a `fill` attribute — inline style beats any external
  stylesheet rule short of `!important`. `tools/visual/scenarios/background.js` exists specifically
  to keep this rendering, not just resolving, since the bug was invisible to every non-visual
  check.
- **Where the `<defs>` live, and why that survives export.** Page backgrounds: inside `Frame`'s own
  `<svg className="tl-frame">`, live, and separately re-emitted into `TldrawApp.copySvg`'s
  hand-built export document (`appendBackgroundDefs`, DOM-API version of the same resolved spec) —
  `copySvg` builds its own SVG from scratch and never touches `Frame`'s DOM, so the export path
  needed its own copy of "turn a resolved background into `<defs>` + a fill value", not a shared
  React component. Shape fills: inside the *same* `<g id={shape.id + '_svg'}>` that `SVGContainer`
  creates for the shape's own content (`GradientDef`, rendered by `RectangleUtil`/`EllipseUtil`
  right alongside the shape's own draw calls) — `TDShapeUtil.getSvgElement`'s base implementation
  clones exactly that `<g>` for export and nothing else, so a `<defs>` rendered anywhere outside it
  (e.g. hoisted to a page-level `<defs>`, which would have been less code) would be live-correct
  and silently absent from every SVG/PNG export, the precise failure mode this phase exists to
  avoid. Proven in `background.js`: it calls `window.app.copySvg([], pageId, true)` — the same
  path "Copy as SVG"/PNG export use — and confirms the returned *string* contains both a
  `<linearGradient>` node and a reference to the shape's own gradient id.
- **Gradient ids are derived, not random, and from two different namespaces.** A page background's
  `<defs>` id is `${pageId}-bg-gradient`; a shape fill's is `${shapeId}-fill-gradient`. Both
  `pageId` and `shapeId` are already document-unique, so two gradients never collide — which
  matters concretely here, not just in the abstract: `url(#id)` resolves via `getElementById`
  against the *whole document*, and Deck renders every slide's thumbnail as its own `<Frame>` in
  the same DOM at once (so does the main canvas, simultaneously, for the current slide). A fixed
  id like `"bg-gradient"` would have made every thumbnail render whichever slide's gradient
  happened to register first. `background.spec.ts` asserts two different pages/shapes resolve to
  two different ids for the same gradient content.
- **Flat fill and gradient fill: the gradient is the more specific control, same precedent as
  Phase 8a/8b.** `getShapeStyle` prefers `style.fillGradient` outright over `style.fill`/the color
  enum when both are set (mirroring `getEffectiveStrokeWidth` preferring an explicit width over
  the size enum, and `stroke`/`fill` preferring a hex over the enum). The *other* half of the rule
  — the less-specific control clearing the more-specific one when a user picks it — is enforced at
  every UI call site that sets `fill`: `StyleMenu`'s color-swatch click, its native fill-hex
  picker, and its fill-hex text field commit all now pass `fillGradient: undefined` in the same
  `app.style()` call. The reverse (picking a gradient preset clears `fill`) is enforced where
  gradients are actually set. One undo step restores both together, exactly like the size/color
  rules before it. Tested in `shape-styles.spec.ts` (gradient wins when both are present; falls
  back to flat fill when no `shapeId` is supplied — see below; has no effect when `isFilled` is
  false, matching `fill`'s existing behavior) and exercised end-to-end through real UI clicks in
  `background.js`.
- **`getShapeStyle` needed a third, optional parameter — `shapeId` — and a defined fallback for its
  absence.** Resolving `style.fillGradient` into a paintable `fill: url(#id)` needs an id to point
  at, and the only sane, stable choice is the shape's own id. Rather than requiring every one of
  `getShapeStyle`'s ~20 existing call sites (see the Phase 8a/8b reports) to start passing one,
  the function treats a missing `shapeId` as "can't resolve a gradient here" and quietly falls back
  to the flat `fill`/enum — never an unresolvable `url(#undefined-...)`. Only the call sites that
  actually render fill (`RectangleUtil`/`EllipseUtil` and their `Dashed*`/`Draw*` sub-components)
  were updated to pass `shape.id`; call sites that only ever read `stroke`/`strokeWidth`
  (`TriangleUtil`, `ArrowUtil`, `LineUtil`, `DrawUtil`, indicators, `getSvgElement`'s label color,
  …) are untouched.
- **Scoped down, deliberately: shape gradient fill is presets-only in the UI; radial gradients and
  image backgrounds have no UI at all.** The data model and render path support arbitrary
  custom-stop gradients on shapes and a full `radialGradient`/`image` background (all four
  `SlideBackground` variants resolve and render correctly, and are covered in
  `background.spec.ts`), but `StyleMenu`'s new "Gradient" row is eight preset swatches plus a
  clear button, not a full angle/stop editor — the brief's headline ask was gradients on the
  *page* background (which does get the full editor, see below), and a shape-level custom-stop UI
  would roughly double the panel's size for what the brief itself frames as "table stakes," not
  the main feature. Anything else — a template, a future custom-stop-per-shape control, a
  programmatic import — can still set an arbitrary `fillGradient` through `app.style()` directly;
  `getShapeStyle` renders whatever it's given. Radial/image backgrounds are reachable only through
  `app.setPageBackground()` directly, not `BackgroundMenu`, matching T11.4's own scope (solid,
  linear gradient, presets).
- **`BackgroundMenu`, new, lives in `TopPanel` next to `PageMenu`.** A slide's background is exactly
  as page-scoped a property as its name (`PageMenu`) or its size (`PageOptionsDialog`), and — unlike
  `StyleMenu` — needs to be reachable without a shape selected. It commits every change immediately
  through `app.setPageBackground` (a new command, `state/commands/setPageBackground/`, modeled
  directly on the existing `setPageSize`: same before/after page patch shape, same defensive
  array-copy so undo/redo never aliases a live `stops` array), so Solid/Gradient tab switches,
  angle edits, per-stop color/position edits, add/remove-stop, and preset clicks are all
  individually undoable — there is no separate "apply" step. Every free-typed field (the angle
  number input, the stop position fields, the solid/stop hex fields) is wired through
  `stopKeyPropagationUnlessEscape`, reusing Phase 8b's fix for the Tab-clones-the-shape bug rather
  than re-discovering it.
- **24 hand-picked gradient presets** (`GRADIENT_PRESETS` in `background.ts`), in the tradition of
  collections like uiGradients — real, recognizable two-color combinations (Sunset Vibes, Ocean
  Breeze, Northern Lights, …) with genuine contrast and a pleasant hue transition, not generated by
  pairing random hex values. Defaulted to a 135° diagonal (the most broadly flattering angle for a
  full-bleed background) with a handful varied to 90/100/120/160/180° so the preset list itself
  demonstrates that the angle control does something. `StyleMenu`'s shape-fill row reuses the same
  list (its first eight), rather than maintaining a second curated set.
- **Dark mode: gradients render identically in both themes, by construction, and that's a
  deliberate continuation of Phase 8b's decision, not a new one made here.** A gradient's stops are
  absolute hex values (`stops[].color`), resolved through the exact same "an explicit hex is not
  themed" path Phase 8b established for `stroke`/`fill` — `getShapeStyle` never touches `isDarkMode`
  once a gradient is present. Checked directly in a dark-mode screenshot (background + shape fill
  both survive `toggleDarkMode()` pixel-for-pixel); the open issue flagged since Phase 4 (the
  *enum* palette flipping with UI theme, arguably a whiteboard assumption that doesn't fit a slide
  product) is unaffected either way by this phase — gradients simply don't participate in it.
- **`tools/visual/scenarios/background.js`** drives the real UI for both halves of the feature (a
  gradient shape fill via `StyleMenu`'s new row, then a page background via `BackgroundMenu`'s tabs,
  angle field, stop editor, add-stop button, and a preset click) and is the only scenario in this
  phase whose assertions are the actual point of the phase rather than a nice-to-have: it reads the
  live DOM's `<defs>`/`fill` attributes, confirms the Deck thumbnail for the current slide picked up
  the background too, and — the one that would have caught a CSS-gradient regression outright —
  calls `window.app.copySvg(...)` and checks the *returned string* for a `<linearGradient>` node and
  a reference to the shape's gradient id.

**Verified:** 74/74 suites (387 passing, up from 364; 23 new tests across `background.spec.ts`
(angle convention, all four `SlideBackground` variants, preset distinctness), the gradient/flat-fill
coherence rules in `shape-styles.spec.ts`, and `setPageBackground`'s undo/redo + array-copy safety)
· `build:packages` 9/9 with zero type errors · new `background` visual scenario exits 0 with no
console errors, confirms the gradient survives `copySvg` export, and confirms the Deck thumbnail
renders it · all six pre-existing scenarios (`stylepanel`, `styles`, `shapes`, `frame`, `line`,
`reorder`) re-verified with no regression — screenshots inspected, not just asserted on. (`@tlslides/
core`'s own Jest suite was already failing before this phase, on an unrelated pre-existing
`setupTests.ts` ESM/transform error — not something this phase touched or introduced, and out of
scope to fix here.)

#### Phase 12 notes — deck theme / brand kit

Adds `TDDocument.theme?: DeckTheme` — a named colour palette, a heading/body font pairing, and
default shape styles — with five built-in palettes (`midnight`, `ivory-editorial`, `coral-pop`,
`forest`, `mono-grid`), plus a document-scoped `setDeckTheme` command and a `ThemeMenu` UI next to
`BackgroundMenu`. Combined with Phase 13 in one commit, because a template library that hard-codes
hex is worthless the moment a second look is wanted — see that phase's notes for the template side.

- **`DeckTheme`, not a second `Theme`, and the two must never collide.** `Theme = 'dark' | 'light'`
  already exists (`types.ts:264`) as the editor's own UI chrome palette — the thing `isDarkMode`
  drives. A brand kit is an unrelated concept that happens to also be "a set of named colours," and
  giving it the same name would have made every future reference to "the theme" ambiguous (is this
  the app's light/dark mode, or the deck's brand palette?) in code, in this document, and in any
  host integration. `DeckTheme` costs nothing extra to spell out and removes the ambiguity
  permanently. The two are also independent in practice: `getShapeStyle`'s existing `isDarkMode`
  parameter and its new `deckTheme` parameter are resolved on separate branches (`isDarkMode` only
  ever feeds the `??` fallback's `strokes[theme][color]` lookup; `deckTheme` only ever feeds
  `resolveThemeColor`), so toggling the app's UI theme never touches a deck's brand colours and
  vice versa — the same independence Phase 8b already established for an arbitrary hex.
- **The token design: a sentinel string (`'theme:accent1'`), not a second field.** `style.stroke`/
  `style.fill` (Phase 8b), `TDGradientStop.color`, and `SlideBackground`'s solid `color` (Phase 11)
  are all already plain `string`. Rather than adding a parallel `strokeToken?`/`fillToken?` field —
  which would need its own "which one wins when both are set" coherence rule (a fourth version of
  the dance Phase 8a/8b/11 already do three times), a distinct code path through every one of the
  ~20 `getShapeStyle` call sites, and a second migration-free optional field to document — a theme
  token is just one more string those same fields can already hold, recognized by a `theme:` prefix
  and resolved in exactly one function, `resolveThemeColor` (`state/shapes/shared/deck-theme.ts`).
  Three things this buys, all load-bearing:
  1. **No schema change, no migration.** A document written before this phase existed simply never
     has a string starting with `theme:` in one of these fields, so reading or writing them is
     unchanged.
  2. **Survives SVG export for free.** Export either clones the live, already-rendered DOM node
     (`TDShapeUtil.getSvgElement`'s `cloneNode`, which baked in the resolved colour at render time)
     or calls the same resolver the live renderer used (background export, the one exception —
     the label-text fill — that computes a colour fresh rather than cloning it, so `getSvgElement`
     grew a `deckTheme` parameter specifically to feed that one call). By the time either path
     runs, the token string itself is gone; nothing downstream ever has to know what a token *is*.
     Same reasoning Phase 11 already established for gradients: resolve once, before anything
     paints or exports.
  3. **Works in Deck thumbnails for free.** A thumbnail is just another `<Frame>` render of the
     same document through `ReadOnlyEditor` (see Phase 11's notes on this same component) — it
     calls the exact same `getShapeStyle`/`resolveSlideBackground` this phase updates, with the
     same `document.theme`, so a thumbnail never needs its own theme-resolution path.
  An unresolvable token (no active theme, or a key the active theme doesn't have — a stale token
  from a deck whose theme was later simplified, or a typo) **degrades to `undefined`, not a
  hardcoded warning colour**, in `resolveThemeColor` itself. That is deliberate: every one of
  `getShapeStyle`'s call sites already has a real `?? enum` fallback for "this field wasn't set" —
  `resolveThemeColor(style.stroke, deckTheme) ?? strokes[theme][color]` — so an unresolvable token
  just takes that same path, exactly as if the field had never been written. A background has no
  colour enum to fall back to, so `background.ts` picks its own neutral `#9AA1AB` fallback there
  instead (deliberately picked to sit mid-way between every built-in theme's light/dark spread, so
  it never reads as an alarming colour) — the one place the two resolvers' fallback behaviour
  genuinely differs, and it differs for a real reason, not an oversight.
- **`activeDeckTheme()` is a read-side default, and it writes nothing.** This was added after the
  first review pass: a document with no `theme` set is `TDDocument.theme === undefined`, which is
  required (no migration), but it meant a template's shapes — all written as tokens — resolved
  every token to `undefined` on a fresh deck and fell through to the plain colour enum. Templates
  are the first thing a user touches; they landed on the canvas flat grey until the user happened
  to open `ThemeMenu`, which defeats the entire point of a theme-aware starter pack.
  `activeDeckTheme(theme)` (`theme ?? DEFAULT_DECK_THEME`) is called at every place the document's
  theme is read for rendering — `Tldraw.tsx`'s background memo and shape `meta`, `ReadOnlyEditor`'s
  equivalents (the thumbnail path), and both `TldrawApp.copySvg` export call sites (the background
  `<defs>` and each shape's `getSvgElement`) — six call sites across three files, all funnelled
  through the one function. It is never called anywhere a value gets *written*
  (`setDeckTheme`/`Commands.setDeckTheme` still happily persist `undefined`), so an untouched deck
  still round-trips with no `theme` field at all, and a shape storing a plain hex is unaffected
  either way (`resolveThemeColor` passes non-token strings straight through regardless of which
  theme is "active").
- **Which theme is the default, revisited.** The first version of this phase took the obvious
  shortcut — `DEFAULT_DECK_THEME = BUILT_IN_DECK_THEMES[0]`, and `[0]` was `midnight`, a dark navy
  palette — which meant every brand-new deck, and every template dropped onto one, rendered dark
  navy out of the box. Looked at directly in a screenshot (a fresh deck's "Title & Subtitle"
  template under each of the five built-ins, `tools/visual/shots/` during review — not kept, since
  these were throwaway comparisons, but reproducible with any of the five theme ids via `ThemeMenu`
  on a fresh deck), that reads as a strong, specific opinion for an editor whose own baseline
  defaults are otherwise deliberately plain (Phase 1's `Draw → Solid`, `Script → Sans` swap, for
  exactly the same "don't impose a look" reasoning) — and it does not match how mainstream slide
  tools start a new deck, which is uniformly a light, near-neutral surface. `mono-grid` is now the
  default: of the four light themes, its palette is the only one that is functionally grayscale —
  `accent1` is the same near-black as `text`, and `accent2` (a red) appears only as a small,
  deliberate highlight — where `ivory-editorial` (cream, amber/green), `coral-pop` (coral/
  turquoise), and `forest` (moss/rust) each commit to a specific hue mood the way a chosen brand kit
  should, but a default before any choice has been made should not. `DEFAULT_DECK_THEME` is now a
  named constant that looks the theme up by id (`BUILT_IN_DECK_THEMES.find(t => t.id ===
  'mono-grid')!`) rather than indexing `[0]` — the array's order is *also* the order `ThemeMenu`
  lists themes in (it maps `BUILT_IN_DECK_THEMES` directly), a pure UI-ordering concern with nothing
  to do with which theme a new, untouched deck gets. Coupling the two meant reordering the menu
  (promoting a theme, alphabetizing it) would have silently changed the appearance of every deck
  that had never touched `ThemeMenu` — exactly the fragility a named constant removes. `midnight`
  keeps its place first in the array/menu; only the default lookup changed.
- **`BUILT_IN_DECK_THEMES`, five real palettes**, each in `state/shapes/shared/deck-theme.ts`: a
  light/dark spread (`midnight` light-on-navy vs. the four light themes), a serif editorial look
  (`ivory-editorial`), a vibrant consumer look (`coral-pop`), an earthy look (`forest`), and a
  monochrome-plus-one-accent look (`mono-grid`) — each with a genuine text/background contrast
  ratio and a heading/body pairing drawn from this fork's four existing `FontStyle` faces (arbitrary
  font families are Phase 17's job, not this one's, so a theme picks two of the four rather than
  introducing a second, incompatible font model). `shapeDefaults` (e.g. `cornerRadius`, `isFilled`)
  is applied once, at template-instantiation time, as the base a template shape's own style patches
  on top of — deliberately **not** re-applied to shapes already on the canvas when the theme
  changes later, since a "default" is a starting point for new content, not a live constraint on
  existing content, the same way changing the app's default stroke width never retroactively
  resizes an existing shape.

**Verified:** 78/78 suites, 432 tests passing (up from 387; 9 of the new tests are in this phase's
own `deck-theme.spec.ts` and `setDeckTheme.spec.ts`, the rest in Phase 13's specs plus `resolveThemeColor`
coverage added to the pre-existing `shape-styles.spec.ts`/`background.spec.ts`) · `build:packages`
9/9 with zero type errors · the `theme` visual scenario exits 0 with no console errors and confirms
a token-filled shape and the page background both re-resolve live across two real `ThemeMenu`
clicks (not just on first load) · the deck thumbnail strip picks up the same theme change · all
eight other scenarios re-verified with no regression.

#### Phase 13 notes — template system

- **`slot?: string` on `TDBaseShape`, optional and otherwise inert.** A shape with no `slot`
  behaves exactly as it does today, so this needs no migration. `addSlideFromTemplate`'s `content`
  argument maps a slot name to a replacement value, so a user picking a layout, a bulk import, and
  later an AI pipeline can all fill a template through the same one field and the same one code
  path (`applySlotContent` in `state/templates.ts`) — precisely the reason the roadmap called this
  out as worth building in from day one rather than retrofitting.
- **A template is plain, serializable JSON — `{ id, name, size, background, shapes[] }`** — no
  code, no functions, nothing tldraw-specific beyond `TDShape[]` with some shapes carrying `slot`.
  `BUILT_IN_TEMPLATES` (`state/templates.ts`) is a module-level array literal built through three
  tiny local helpers (`textShape`/`panel`/`dot`/`divider`) that exist only to keep the twelve
  layouts readable — they are not a public API, and a host authoring its own templates would just
  write the shape objects directly, or fetch them from a server, exactly as the roadmap intended.
  Every colour in the pack is a theme token (`themeToken('accent1')`), never a literal hex, for the
  reason Phase 12 exists: hard-coded hex in a template can't be restyled by a theme switch.
  `font` is deliberately left `undefined` on every template text shape — `buildTemplateShapes`
  assigns it from the active theme's heading/body pairing at instantiation time (heuristically, by
  slot name — see below) rather than baking in a face the way colours are baked in as tokens, since
  unlike colour there is no "unresolved font" fallback state worth inventing; a template shape
  either gets the theme's pairing or, with no active theme, `activeDeckTheme`'s default pairing.
- **`addSlideFromTemplate(app, template, content?)`** (`state/commands/addSlideFromTemplate/`) is
  modeled directly on `Commands.createPage`: the page and its `pageState` don't exist, then they
  do, and `currentPageId` moves with them — one undoable command. The shape/id/theme work is
  delegated to `buildTemplateShapes`, which deep-clones every template shape (`Utils.deepClone`,
  not a shallow spread — `BUILT_IN_TEMPLATES` is a module-level constant reused on every call, so a
  shallow copy would still alias nested arrays like `point`/`handles` with the template's own
  definition, corrupting it for every future insert the moment one inserted slide's shape is
  mutated in place), assigns each a fresh id, applies the active theme's font pairing and
  `shapeDefaults`, and fills any matching `content[slot]`. `TldrawApp.addSlideFromTemplate` accepts
  either a `Template` object or a built-in's string id (`getTemplate` looks it up); an unknown id is
  a no-op, matching the existing convention for a bad id elsewhere (`deletePage`).
- **The starter pack: twelve layouts** — title, title+subtitle, section break, bullets, two-column,
  image-left, image-right, quote, stat row, comparison, timeline, closing — exactly the roadmap's
  list. All twelve were screenshotted individually (`tools/visual/scenarios/templates.js`, one PNG
  per layout under a real theme) and looked at directly, not just asserted to exist. Nine are
  genuinely usable as shipped: title, title & subtitle, section break, bullets, image-left,
  image-right, quote, timeline, and closing all read as a real slide someone would use, with correct
  contrast and everything inside the 1920×1080 frame. Two are honest mediocrities, left as-is rather
  than dressed up: **comparison**'s two panels leave roughly three-quarters of their own height
  empty below three lines of body text, and **image-left/-right**'s text block is vertically
  centered a little higher than the image placeholder's centered label, a small misalignment that
  reads as slightly uncomposed side by side. Neither is broken — both render correctly, inside
  bounds, on every theme — they are simply the two layouts in the pack that would benefit from a
  human designer's second pass on spacing, not a rendering fix.
- **A genuine rendering bug, found only by looking at the twelfth layout's cousins, not by any
  test:** the `divider()` helper (used by `two-column`, `stat-row`, and `timeline`) built its `Line`
  shape with `point: [0, 0]` and both handle points set to **absolute** page coordinates (e.g.
  `[960, 280]`/`[960, 900]`). `LineShape.handles` are local to `shape.point` — confirmed against a
  real `LineTool`-drawn shape, where `start.point` is always `[0, 0]`, `end.point` is the offset,
  and `point` carries the absolute start — not a pair of absolute coordinates. `getBounds` derives
  a line's bounds purely from its handle points and only *then* translates by `shape.point`, so a
  `[0, 0]` shape.point silently no-oped there and the absolute bounds came out correct regardless —
  the bug was invisible to any bounds-based check. But the shape's own render draws those same
  handle points as the *local* SVG path coordinates inside a container sized and positioned to
  those (correct) bounds; for a perfectly vertical or horizontal divider the bounds are zero-width
  or zero-height, which put the drawn path entirely outside its own container's clipped viewport —
  `overflow: hidden` on `.tl-positioned-svg` (`useStyle.tsx`) discarded 100% of the stroke, not just
  clipped part of it. A diagonal line hides the same mistake (real width *and* height give the local
  coordinates room to land inside a large-enough box, just not centered as intended), which is
  presumably why no earlier line-related work caught it — this pack's dividers are the first
  perfectly straight lines this fork has ever generated programmatically. Confirmed both broken
  (`document.elementFromPoint` at the stroke's screen position hit the canvas background, not the
  path) and fixed (same check now hits the path itself) before and after. Fixed in `divider()` by
  setting `point: start` and expressing both handles relative to it (`start: [0, 0]`, `end: [end.x -
  start.x, end.y - start.y]`) — the same convention every other shape in this pack, and every
  hand-drawn line in this fork, already follows.
- **Theme-aware font assignment is a naming heuristic, not a role field.** `isHeadingSlot` treats a
  slot as a heading (gets `deckTheme.fonts.heading` instead of `.body`) purely because its name
  contains "title"/"heading" or is exactly "quote" — every slot name in the starter pack already
  fits this convention. A real per-shape role field was considered and rejected for this first pass:
  it would be one more optional field to explain for a starter pack where a naming convention
  already covers every case, and a host authoring its own templates that wants finer control can
  still set `style.font` explicitly (the heuristic only fires when `font` is left `undefined`).
- **A flaky selector, and why it matters beyond this one scenario.** The first version of
  `tools/visual/scenarios/theme.js` looked up a shape's rendered fill with `` `#${shapeId}_svg` ``,
  a CSS id selector built from a uuid. A uuid that happens to start with a digit (about 3 in 8 of
  them, since 10 of the 16 hex digits are 0-9) makes that string an invalid CSS identifier —
  `document.querySelector('#6c7f...')` throws `SyntaxError: '#6c7f...' is not a valid selector`
  rather than returning null, so the scenario's pass/fail outcome depended entirely on the luck of
  the generated id, not on anything the phase actually changed. Fixed by switching to an attribute
  selector, `` `[id="${shapeId}_svg"]` ``, which has no such restriction since the value is a
  string, not a token, and re-run three times to confirm it no longer depends on which ids happened
  to be generated. Worth recording here, not just in the scenario's own comment, because the same
  trap is available to any future scenario that builds a selector from a shape/page id — this fork
  generates every id as a uuid (`Utils.uniqueId()`), so the failure mode is always latent, not
  specific to this one shape.

**Verified:** 78/78 suites, 432 tests passing (up from 387; 23 new tests across `templates.spec.ts`
(slot filling, font pairing, deep-clone isolation) and `addSlideFromTemplate.spec.ts` (the command's
undo/redo and page/pageState shape)) · `build:packages` 9/9 with zero type errors · the `templates`
visual scenario exits 0 with no console errors, lists all twelve cards in the real `TemplatePicker`
gallery, and screenshots each of the twelve resulting slides individually under a real theme,
applied via the real `ThemeMenu` · the `theme` scenario's divider fix and default-theme change were
re-verified after this phase's own divider bug fix, with the fixed selector passing three runs in a
row · all eight other scenarios re-verified with no regression — screenshots inspected, not just
asserted on.

#### Phase 14 notes — host control API (`app.deck.*`)

Shipped as the roadmap specced it: a `Deck` class (`state/deck/Deck.ts`) instantiated once as
`app.deck`, wrapping `TldrawApp`'s existing page/command methods rather than adding a second
document-mutation path, plus a typed event stream and every "suggested extra" the roadmap called
out as non-optional (return values, caller-supplied ids, a read-only viewer). This is the phase the
whole plan was building towards, so the notes below are longer than usual — every design call here
is one the Next.js sample app (`examples/nextjs-sample`) actually had to survive, not a hypothetical.

- **The facade is genuinely narrow — twelve methods across slides, two for content, four across
  theme/templates, two across the whole deck, plus `on`/`onDeckChange`.** Every method's
  parameters and return values are `DeckSlide`, `SlideBackground`, `DeckTheme`, `Template`,
  `TDDocument`, `DeckContent` (a facade-local name for `TDInsertableContent` — see below),
  primitives, or facade-only option/event types (`deck-types.ts`) — never `TldrawApp`,
  `TLPageState`, a session object, or anything else canvas-shaped. `DeckSlide` itself is a
  deliberately thin projection of `TDPage`: no `shapes`/`bindings`/`childIndex`, since per-shape
  *editing* was never this facade's job (a host that needs to read shape data still reads
  `getDeck().pages[id]` — `TDDocument` is a shared type, not a hidden one, exactly as the brief
  allowed).
- **`insertContent`/`addBlock` — added on review, not in the first cut, and the fix went into the
  facade rather than around it, per the reviewer's own instruction.** The first version of this
  phase left `app.createShapes` as the sample app's only way to add a rectangle or a
  `ComponentShape` block — its three most-clicked buttons reaching straight around the facade,
  directly contradicting "the only surface a host is expected to touch." Rejected fix: exposing
  `createShapes` itself, which gives a host none of `TldrawApp.insertContent`'s placement handling
  or single-undo-step guarantee. Shipped instead: `Deck.insertContent(slideId, content, opts)`
  (the general escape hatch for a host's own shape JSON) and `Deck.addBlock(slideId, {
  componentId, props }, opts)` (a `ComponentShape` convenience over it — the fork's actual
  headline capability, "render your own React as a slide element," now reachable through the
  facade). Both wrap `TldrawApp.insertContent` (Phase 6), never `createShapes`.
  - **`slideId` vs. the current page, decided explicitly, not left implicit.**
    `TldrawApp.insertContent` only ever operated on `app.currentPageId` — no parameter existed to
    aim it elsewhere. Rejected: switching pages first (`changePage` then insert) — two undo steps
    instead of one, and it moves the user's own viewport just to answer what should be a
    background write, the same class of side effect `getThumbnail` was already designed to avoid.
    Shipped: `TDInsertContentOpts` gained an optional `pageId` (default `app.currentPageId`,
    every existing call site unaffected), threaded through `Commands.insertContent` and
    `TldrawApp.insertContent` so the whole operation — id remapping, placement, the undo/redo
    patch — targets that page directly, in one command, without ever touching `appState.
    currentPageId`. `Deck.insertContent`/`Deck.addBlock` always pass `slideId` through as this
    `pageId`, and return `[]`/`undefined` (not a throw) for an unknown one.
  - **A real, narrowly-scoped bug this change would have introduced, caught before it shipped:**
    `Commands.insertContent`'s before/after `selectedIds` patch read `app.selectedIds` — always
    the *current* page's selection — regardless of which page it was actually patching. Insignificant
    while `pageId` was always `app.currentPageId` (the two were the same thing), but the moment
    `pageId` could differ, this would have silently written the current page's selection into a
    different page's `pageState`, and restored it there again on undo — a different slide's
    selection corrupted by an insert into a slide the user isn't even looking at. Fixed by reading
    `app.getPageState(pageId).selectedIds` instead, which already existed and does exactly what's
    needed; caught by writing the "insert into a non-current slide" test before assuming the
    existing command just worked unmodified, not by any pre-existing coverage (there was none for
    this parameter, because the parameter didn't exist yet).
  - **Neither method takes a caller-supplied shape id, unlike every page-level method above — a
    deliberate, narrower design, not an oversight.** `TldrawApp.insertContent` unconditionally
    remaps every shape/binding id it's given, the same collision-safety `paste` already relies on;
    threading a caller-id bypass through it would be a materially bigger, riskier change (making
    remapping conditional, retesting paste/dedup) for a benefit nobody asked for here. Both
    methods instead diff the target slide's shape ids before/after the underlying call and return
    whichever ids actually appeared — `insertContent` returns all of them (`string[]`, one call can
    insert a whole batch), `addBlock` returns the single one it created.
- **Every mutation returns the id/state it produced — checked as a design rule, not an
  afterthought, at every method.** `addSlide`/`duplicateSlide`/`addSlideFromTemplate` return the
  new id (or `undefined` for a bad/unknown input); `moveSlide` returns the deck's full resulting
  order; `setSlideBackground`/`setSlideNotes` return the updated `DeckSlide`; `deleteSlide`/
  `goToSlide` return a `boolean`; `loadDeck`/`setTheme` return the resulting `TDDocument`.
- **Caller-supplied ids: an optional trailing parameter on the two commands that didn't already
  have one, plus a collision guard in the facade, not the command layer.**
  `Commands.duplicatePage`/`TldrawApp.duplicatePage` gained an optional `newId` and
  `Commands.addSlideFromTemplate`/`TldrawApp.addSlideFromTemplate` gained an optional `pageId`
  (both default to `Utils.uniqueId()`, so every existing call site — UI menus, other tests — is
  unaffected). `createPage`/`TldrawApp.createPage` already accepted a custom id before this phase
  (used internally for e.g. deterministic test fixtures), so `addSlide` needed no `TldrawApp`
  change at all. The facade is where uniqueness is enforced: `addSlide`/`duplicateSlide`/
  `addSlideFromTemplate` all throw if the supplied id already names a page, rather than silently
  overwriting or renaming it — the same guarantee any primary key gives you, checked before the
  command runs so a bad id never touches the document. This was a deliberate split: the command
  layer stays permissive (it's also the internal implementation for `createPage`'s own long-
  standing custom-id support), and the one place a *host*-facing contract needs to be strict is the
  facade that hosts actually call.
- **The event stream's hook points are three different `TldrawApp` lifecycle methods, not one,
  because "a change" isn't a single concept in this codebase.** `slideAdded`/`slideRemoved`/
  `slideReordered`/`deckChanged` hook `onPersist` (fires once per *committed* `Command`, via
  `StateManager.setState` — never for an in-progress drag's `patchState` calls), diffing
  `document.pages` against a baseline `Deck` keeps between calls. `selectionChanged` hooks
  `onStateDidChange` instead, because selection is set via `patchState` (`setSelectedIds`, id
  `'selected'`), which never reaches `onPersist` — an ordinary click would never fire the event if
  it only hooked the commit path. `loadDeck`/`app.loadDocument` hook a third point directly (the
  end of `loadDocument` itself, not `Deck.loadDeck`) so the baseline resyncs for *every* caller,
  including the initial IndexedDB-restore `onReady` performs before a host's own `loadDeck` call
  is ever reachable — resyncing only inside `Deck.loadDeck` would have left the baseline stale for
  that one call, and the next real command would have misreported the freshly-restored document's
  entire page list as `slideAdded`. A whole-document swap fires exactly one `deckChanged`, not a
  replay of every page as an individual event — checked directly in `Deck.spec.ts`.
- **The event map's storage is a `Map`, not the `{ [K in DeckEventName]?: Set<...> }` record the
  first draft used — a real TypeScript limitation, not a style choice.** A mapped optional-property
  type can't express "the `Set`'s element type co-varies with whichever key was just read or
  written" through a single indexed access with a generic key `E`; every phrasing tried produced a
  build error (`build:packages` catching a genuine type error, exactly as the toolchain notes
  warn it will). A `Map<DeckEventName, Set<(payload: never) => void>>` sidesteps the whole
  category of error, with the type erasure confined to one `as` cast inside `on`/`emit` rather than
  leaking into every call site.
- **`getThumbnail` reuses `copySvg`'s exact export path — not a new renderer — and is honest about
  what that buys and what it doesn't.** `TldrawApp.copySvg` gained a fourth, optional
  `copyToClipboard` parameter (default `true`, so all four existing call sites — two menu items,
  one keyboard shortcut, one internal `exportAllShapesAs` caller — are unaffected); `getThumbnail`
  calls it with `false`, since a preview request should never have the side effect of overwriting
  the user's clipboard. The real limitation, confirmed by reading `TDShapeUtil.getSvgElement`, not
  assumed: most shapes' SVG export clones `document.getElementById(shape.id + '_svg')` — a *live,
  currently-mounted* DOM node — so it only works for whichever page is actually rendered on screen.
  `getThumbnail` therefore refuses any `id` other than `app.currentPageId`, returning `undefined`
  rather than attempting it and risking a blank-but-plausible-looking image; it deliberately does
  **not** switch pages to route around this, since `changePage` is itself a `Command` and doing so
  would move the user's viewport and add an undo-stack entry just to answer a read. It also returns
  `undefined` (never throws) when `document` doesn't exist, so a server-side call site fails softly
  instead of crashing — the honest boundary the brief asked for, clearly written into both the
  method's own doc comment and `guides/documentation.md`, not left for a caller to discover. Phase
  15's `renderPageToSvg` is the real fix; this is what's achievable without it.
- **The read-only viewer is a new export, `DeckViewer`, wrapping `<Tldraw readOnly
  showUI={false}>` — deliberately not built on `ReadOnlyEditor`.** `ReadOnlyEditor` (Phase 11's
  thumbnail component) calls `useTldrawApp()`, meaning it requires an *already-mounted* editor's
  own store/context to sit inside, and its click handler exists to switch *that* editor's current
  page — it's the Deck panel's thumbnail strip, not a standalone viewer. A host page with no editor
  at all would have to hand-build the Provider/store plumbing `<Tldraw>` already encapsulates just
  to satisfy that dependency. `<Tldraw>` mounts its own self-contained `TldrawApp`, so wrapping it
  costs nothing and reuses the exact `Frame`/background/theme rendering path Phases 11-13 already
  verified against screenshots; `DeckViewer` just fixes `readOnly`/every `show*` prop and narrows
  the surface to `document`/`slideId`/`darkMode`/`onMount`.
- **`<Tldraw darkMode>` was a dead prop — found while writing `DeckViewer`, fixed on review rather
  than left as a documented workaround.** Declared in `TldrawProps`, never destructured or read
  anywhere in `Tldraw.tsx`; nothing in this repo (`apps/www` included) ever passed it, so nothing
  depended on the broken behaviour. The first version of this phase worked around it in
  `DeckViewer` alone (`app.setSetting('isDarkMode', darkMode)` in its own effect) and left the
  underlying prop broken — flagged, on review, as exactly the kind of trap this phase's own host
  audience shouldn't be handed: a declared prop that silently does nothing is worse than no prop
  at all, since it looks like it should work. Fixed at the source instead: `Tldraw.tsx` now
  destructures `darkMode` and applies it via `app.setSetting('isDarkMode', darkMode)` in a
  `useEffect` alongside the existing `readOnly` one, reactive to prop changes, a no-op when the
  prop is omitted (so a host that never sets it keeps today's default/toggle-driven behaviour
  unchanged). `DeckViewer` was simplified back down to a plain pass-through (`darkMode={darkMode}`)
  now that the prop it forwards actually works. Covered directly in `Tldraw.spec.tsx` (forces the
  mode, stays reactive across a rerender, and does nothing when omitted).
- **`TDPage.notes` (reserved since Phase 3) got its first writer: `Commands.setPageNotes` /
  `TldrawApp.setPageNotes` / `Deck.setSlideNotes`, modeled directly on `setPageBackground`.** No
  presenter view reads it yet — that's Phase 16 — this phase only makes it a normal, undoable piece
  of page data instead of a reserved-but-inert field.
- **A gap the sample app surfaced, and fixed in the facade rather than worked around in host
  code, exactly per the brief.** Building the Next.js sample's "add from template"/"switch theme"
  controls needed a way to list the built-in templates/themes — and neither `BUILT_IN_TEMPLATES`
  nor `BUILT_IN_DECK_THEMES` was reachable from the package's public root before this phase (both
  lived under `state/templates.ts`/`state/shapes/shared/deck-theme.ts`, internal paths a host has
  no supported way to import). Closed by adding `Deck.listTemplates()`/`Deck.listThemes()` (backed
  by those same arrays) and exporting the arrays directly from the package root too, for a host
  that wants them before an editor is even mounted (e.g. to render a picker on a page with no
  `<Tldraw>` yet). The same review pass found `stopKeyPropagationUnlessEscape` — required by this
  phase's own hard rules for the sample's free-typed hex-colour field — was equally unreachable
  from outside the package; now exported from the root for exactly that reason, since any host
  building its own slide-manager UI next to a mounted editor faces the identical Tab-clones-the-
  selection trap this fork's own style panel already had to solve.
- **The Next.js sample's rewrite is a real acceptance test, not a facade smoke test — and it
  caught the `createShapes` gap above precisely because it is one.** `examples/nextjs-sample/
  components/Editor.tsx` + `SlideManager.tsx` drive every slide-management action — add blank, add
  from template, reorder (↑/↓), delete, switch theme, set a background (both a preset swatch and a
  free-typed hex field) — through `app.deck.*` alone, and keep the panel in sync via `app.deck.
  on(...)`/`onDeckChange`, never by polling `onPersist`. The first version of this phase left the
  three shape-level demo buttons (`add-rectangle`/`add-kpi-tile`/`add-bar-chart`) calling `app.
  createShapes` directly, reasoning that shape authoring was outside this facade's scope — true in
  general, but wrong for these three specifically, since they're the sample's most-clicked buttons
  and a host reaching for "add a component block" is exactly the headline use case this facade
  exists to serve. All three now go through `app.deck.insertContent`/`app.deck.addBlock` instead
  (see the bullet above) — the only things left touching `TldrawApp` directly in this file are
  read-only property access (`app.currentPageId`, `app.appState.currentStyle`, `app.document` for
  the `onPersist` save) and `toggleDarkMode()`, which is UI chrome, not slide/content management,
  and was never in scope. `previous-slide`/`next-slide` still compose `listSlides()` +
  `goToSlide()` host-side rather than becoming two more facade methods, since the roadmap's own
  method list didn't ask for them and a one-line composition didn't earn a new permanent surface —
  a deliberate omission, not the same category of gap as `createShapes` (nothing about it *forces*
  a host around the facade; it's a convenience either way).
- **`tools/visual/scenarios/deckapi.js`** drives the rewritten sidebar end to end against the
  live Next.js app (port 5433, not the 5431 harness) — add-blank, add-from-template, reorder,
  both background paths, theme switch, and delete — and specifically confirms the free-typed hex
  field's Tab keypress does not clone a shape (comparing the current page's shape count immediately
  before and after), the concrete failure mode `stopKeyPropagationUnlessEscape` exists to prevent.
  The pre-existing `nextjs.js`/`blocks.js` scenarios were kept passing unmodified — the toolbar
  buttons they click (`#add-slide`, `#previous-slide`, `#next-slide`) kept their ids and observable
  behaviour, only their implementation moved onto `app.deck`.

**Verified:** 80/80 suites, 478 tests passing (up from 434; 44 new tests total — `Deck.spec.ts`
(33: every method including `insertContent`/`addBlock`, the event stream, and `loadDeck` resync),
`setPageNotes.spec.ts` (3), `insertContent.spec.ts` (+3, for `pageId` targeting, the selection-
isolation fix, and an unknown-slide no-op), one each added to `duplicatePage.spec.ts`/
`addSlideFromTemplate.spec.ts` for the caller-supplied-id parameter, one to `TldrawApp.
frame.spec.ts` for `copySvg`'s new `copyToClipboard` flag, and two to `Tldraw.spec.tsx` for the
`darkMode` fix) · `build:packages` 9/9 with zero type errors (including the `Deck.ts` mapped-type
error caught and fixed during this phase, not shipped) · the new `deckapi` visual scenario exits 0
against the live Next.js sample with every assertion passing and no unexpected console errors,
re-run and re-inspected after the `createShapes` → `insertContent`/`addBlock` rewrite with
byte-for-byte identical results · `nextjs` and `blocks` (the pre-existing Next.js scenarios)
re-verified with no regression · all nine `tools/visual/scenarios` harness scenarios (`templates`,
`theme`, `background`, `stylepanel`, `styles`, `shapes`, `frame`, `line`, `reorder`) re-verified
with no regression — every screenshot inspected, not just asserted on, including the rewritten
sample app's own sidebar and its KPI-tile/bar-chart/rectangle buttons after the rewrite.

#### Phase 15 notes — headless render + export

Shipped `renderPageToSvg` (`state/render/renderPageToSvg.ts`) — a pure function of a `TDPage`, no
React, no DOM, no mounted editor — and routed `Deck.getThumbnail` through it, lifting exactly the
limitation Phase 14 documented and deferred. Per-slide PNG and deck JSON in/out shipped too;
whole-deck PDF did not, for a reason explained below rather than silently dropped.

- **The crux, confirmed before writing code, was exactly what the roadmap predicted:**
  `TDShapeUtil.getSvgElement`'s base implementation is `document.getElementById(shape.id +
  '_svg')?.cloneNode(true)` — it clones a *live, currently-mounted* DOM node, which cannot exist
  headlessly, no matter how the rest of the problem is solved. The fix wasn't "make cloning work
  without a DOM" (impossible); it was reading every shape util end to end to find out how much of
  what gets cloned was already computed by a plain function of shape data, not by React. The
  answer, confirmed by actually reading each one, not assumed: almost all of it.
  `getRectanglePath`/`getRectangleIndicatorPathTDSnapshot`, the `Ellipse`/`Triangle` equivalents,
  every `DrawUtil`/`ArrowUtil` helper (including the circular-arc math for a *bent* arrow, and its
  arrowhead geometry), and `getShapeStyle` itself are all pure — no `document`, no React, callable
  from Node exactly as they're called from JSX today. `renderPageToSvg` imports every one of them
  directly rather than reimplementing the geometry a second time; only the *assembly* into raw SVG
  markup strings is new code, since there is no headless JSX-to-SVG-string bridge in use in this
  codebase. That makes it a **third** renderer of concepts Phase 11 already established have more
  than one (a resolved background/gradient fill): React (`GradientDef`, live), DOM-imperative
  (`appendBackgroundDefs`, `TldrawApp.copySvg`), and now plain strings here — the same discipline
  extended to shape bodies, not a new pattern invented for this phase.
- **Node-safety was verified empirically before assuming it, not asserted after the fact.** The
  first real risk considered was that `@tlslides/core`'s package barrel (which every geometry
  helper imports transitively, for `Utils`) re-exports React *components* (`Frame`, `Canvas`, ...)
  at module scope, and that `ArrowUtil/arrowHelpers.ts` imports `TLDR.ts`, which imports the whole
  shapes barrel (styled-components, mobx-react, the lot) — either could plausibly throw in a
  window-less environment. Checked directly, before writing `renderPageToSvg` itself: a throwaway
  `@jest-environment node` spec importing `@tlslides/core`, `shape-styles.ts`, `background.ts`,
  `deck-theme.ts`, every shape-geometry helper, `state/templates.ts`, and `ArrowUtil/arrowHelpers`
  individually. All of it imported cleanly — none of this codebase's React/styled-component chain
  touches a DOM global at *module load* time, only inside specific methods this phase never calls.
  That result is what made reusing the geometry helpers directly (rather than a leaner,
  hand-rolled duplicate set) a safe choice rather than a gamble.
- **Text is the one real approximation, and it's narrower than it first looks.** Every shape's
  on-canvas size is stored geometry (`size`, `radius`, handle points) *except* two cases that are
  actually *measured* against a mounted, invisible DOM element: a bare `TextShape`'s own bounds
  (`TextUtil.getBounds`'s `melm`) and a shape `label`'s centering box (`getTextLabelSize`). Neither
  measurement is persisted anywhere for a headless reader to consult. `estimateTextSize` (also
  exported) is a hand-tuned average-character-width heuristic standing in for both — good enough
  for a thumbnail (line count and rough proportions are right), not pixel-exact. Every other text
  concern — line splitting, alignment, `<text>` x/y — needed no measurement at all once bounds are
  known, since that positioning is relative to `bounds.width`, not to the text's own natural size;
  `renderTextLines` mirrors the pre-existing `getTextSvgElement` (DOM-imperative) exactly for that
  part, a fourth small instance of the "reuse the resolved value, not the resolution" pattern.
- **A real bug this phase's own screenshot found, in code Phase 15 didn't write.** The hard rule
  ("assume yours has one bug and go find it") predicted a screenshot would catch something a type
  check or assertion couldn't. It did, in `getTextSvgElement.ts` — a pre-existing shared helper
  both the live `copySvg` export path and this phase's own `renderTextLines` are built on/mirror —
  not in new Phase 15 code. It computed font size as `getFontSize(style.size, style.font)`,
  **never multiplying by `style.scale`**, while the bounds it centers/right-aligns text against
  (from `TextUtil.getBounds`'s DOM measurement, or now from `estimateTextSize`) *do* account for
  scale, since the live measurement path (`getFontStyle`) always has. Every one of Phase 13's
  twelve starter templates sets `scale` on nearly every text shape (0.5-1.3, to fit a title/number/
  caption into its slot) — this bug has therefore been in "Copy as SVG"/PNG export since Phase 13
  shipped, silently, because nobody had ever rendered an *export* to a screenshot before (only the
  live canvas, which never calls this function — it measures with the DOM directly). Caught only
  by literally screenshotting `renderPageToSvg`'s own output for a themed `stat-row` template: the
  title rendered at roughly double its intended width, spilling off the left edge of the frame,
  and the three stat captions — each correctly positioned at a different `point.x` per the
  template's own data, confirmed by dumping the raw `<g transform>` values in a `@jest-environment
  node` debug spec before touching any rendering code — rendered wide enough to overlap each
  other. Fixed once, at the shared root cause (`getFontSize(...) * (style.scale ?? 1)`), not
  independently in the headless path; `getTextSvgElement.spec.ts` (new — the function had no test
  before this phase) locks in the scale multiplication and confirms centering still targets the
  *given* bounds width regardless of scale.
- **A correctness improvement over `TldrawApp.copySvg`'s own shape iteration, not a knowingly
  copied behaviour.** `copySvg` walks every id in `page.shapes` — including group children — and,
  for a group, *also* renders each child a second time via the group's own `children` array,
  meaning a grouped shape can be double-rendered in "Copy as SVG" today. `renderPageToSvg` instead
  renders only `parentId === page.id` shapes at the top level and recurses into a group's children
  from there, so a grouped shape is emitted exactly once. Not reported as a `copySvg` bug fix
  (out of scope — nothing asked for it, and `copySvg`'s own behaviour is unchanged) but deliberately
  not reproduced in the new function either, and covered directly (`renderPageToSvg.spec.ts`'s
  "never double-renders a grouped shape" case).
- **Arrows ended up full-fidelity, not the scoped-down approximation first planned.** The initial
  read of `ArrowUtil` looked like a fourth "this needs a live DOM clone and can't be replicated"
  case, since it never overrides `getSvgElement` either. It doesn't need to be: every piece of its
  rendering — straight and circular-arc-bend shafts, both dash styles, both arrowhead shapes — was
  already factored into pure functions in `ArrowUtil/arrowHelpers.ts` for reuse between `Straight
  Arrow`/`CurvedArrow` and `LineUtil` (a line already reuses the straight-shaft function). Once
  Node-safety of that file was confirmed (see above), reusing the rest cost no more than any other
  shape type and meant nothing had to be scoped down here at all.
- **`ComponentShape` and `VideoShape`'s live-frame limitation are real and were not attempted.**
  Neither can be rendered headlessly by any means (a host's own mounted React tree; a
  currently-playing `<video>` element), so both render an honest placeholder instead of nothing or
  a fabricated image — `ComponentShape`'s is pixel-identical to `ComponentUtil.getSvgElement`'s
  own existing placeholder (necessarily duplicated as a string, since that function is also
  DOM-imperative and equally uncallable headlessly), `VideoShape`'s is new (a neutral grey rect
  plus a play-triangle glyph, since no still frame exists to substitute).
- **`getThumbnail`'s Phase 14 limitations are both actually gone, not just relaxed.** It now works
  for any slide id (not just `app.currentPageId`) and needs no `document` at all for the `svg`/
  `dataUrl` formats — confirmed directly, not assumed: `Deck.spec.ts`'s thumbnail tests were
  rewritten (the two that used to *lock in* "returns undefined for a non-current slide" and
  "returns undefined outside a DOM environment" now assert the opposite). Base64-encoding the SVG
  for the `dataUrl` format also had to become dual-environment (`toBase64Utf8`, `Buffer` in Node,
  `btoa` in a browser) — the old code's `btoa(unescape(encodeURIComponent(svg)))` only worked
  because it happened to always run in a browser before.
- **PNG shipped as a new, explicitly async method — not folded into `getThumbnail` — because
  rasterizing is unavoidably asynchronous and `getThumbnail`'s whole contract (Phase 14) is
  synchronous.** There is no synchronous browser API for SVG→canvas decode (`Image.onload` is
  inherently a callback/microtask). Rather than make `getThumbnail` sometimes return a `Promise`
  depending on `opts.format` — a genuinely confusing, inconsistent signature — `Deck.exportSlidePng`
  is new, always returns `Promise<string | undefined>`, and its own async-ness is the "this does
  real work, in a specific environment" signal the brief asked for ("explicit in the API"), not a
  runtime throw. `renderSvgToPng` (the underlying function, also exported) resolves `undefined` in
  Node — the same convention `getThumbnail` already established — rather than throwing.
- **No PNG/PDF dependency was added, and here's the actual reasoning, not just the conclusion.**
  Browser PNG needs nothing extra: `<canvas>` + `Image` already do the whole job. Node PNG has no
  dependency-free answer — every real option (`sharp`, the `canvas` npm package, both native
  bindings; `puppeteer`/`playwright`, a full headless browser) is a meaningfully heavy addition to
  a package that has no way to know which one, if any, a given host's deployment already carries —
  so none was added; `guides/nextjs-integration.md` shows wiring either kind against
  `renderPageToSvg`'s plain string output. PDF compounds the same problem: a real vector SVG→PDF
  converter with no native/browser dependency doesn't exist (`svg2pdf.js`, the closest, still wants
  a `DOMParser`/canvas for text measurement), so a whole-deck PDF needs rasterizing every slide to
  PNG first (the same environment question as above) and assembling a PDF of full-page images —
  `pdf-lib` (pure JS, no native bindings, Node **and** browser) can do that assembly step cheaply,
  but the phase stops at documenting the recipe (`guides/nextjs-integration.md`, `guides/
  documentation.md`) rather than shipping a `Deck.exportPdf()` that would have to silently pick a
  rasterizer on a host's behalf. A correct, honestly-scoped SVG/PNG story was judged better than a
  PDF method that either drags in Puppeteer for everyone or breaks for hosts that don't have it.
- **`exportDeckJson`/`importDeckJson`** are deliberately thin (`JSON.stringify`/`JSON.parse` around
  the pre-existing `getDeck`/`loadDeck`) — `TDDocument` was already exactly as serializable as JSON
  gets; these exist only so a host that specifically wants text doesn't reach for
  `JSON.stringify(deck.getDeck())` itself.
- **`tools/visual/scenarios/export.js`**, new, is a drift detector between the two SVG-export
  paths this fork now has (`TldrawApp.copySvg` and `renderPageToSvg`), not just a smoke test of the
  new one: it builds one slide through the real UI/API (a themed `stat-row` template, a hand-added
  gradient shape, a hand-set gradient page background — exercising both Phase 11 gradient paths and
  Phase 12 theme tokens together), asks both export paths to render the *same* page, and asserts
  they agree on every structural axis that should never diverge (gradient `<defs>`, resolved theme
  colours, viewBox size, shape count) while *not* asserting byte-identical output (text layout is a
  documented approximation). It also renders `renderPageToSvg`'s own output string to a second
  screenshot (`export-headless.png`, next to the live editor's `export-live.png`) — not just a
  programmatic pass/fail — which is exactly what caught the `getTextSvgElement` scale bug above:
  every structural assertion passed on the first run, and the bug was only visible once the output
  was actually looked at as a picture, precisely the failure mode this rule exists to catch.

**Verified:** 84/84 suites, 510 tests passing (up from 80/80 · 479 at the start of this phase; 31
new tests — `renderPageToSvg.spec.ts` (19, one per shape type plus backgrounds/gradients/groups/
`resolvePageSize`), `renderPageToSvg.node.spec.ts` (4, run under a real `@jest-environment node`,
the phase's actual headless-acceptance criterion), `renderSvgToPng.spec.ts` (2),
`getTextSvgElement.spec.ts` (3, new — the function had no coverage before this phase, and now
locks in the `scale` fix), and 3 more added to `Deck.spec.ts` for `exportSlidePng`/
`exportDeckJson`/`importDeckJson` (its three thumbnail tests were rewritten, not added, to assert
the lifted limitation instead of locking in the old one) · `build:packages` 9/9 with zero type
errors · the new `export` visual
scenario exits 0 with every structural drift-detector assertion passing against the live Next.js-
example app, and both its screenshots (`export-live.png`, `export-headless.png`) were inspected
side by side, not just asserted on — the first pass caught the `getTextSvgElement` bug above, the
second (after the fix) matches the live rendering visually · all nine `tools/visual/scenarios`
harness scenarios and all three Next.js-sample scenarios (`deckapi`, `nextjs`, `blocks`)
re-verified with no regression, screenshots re-inspected, including `templates-stat-row.png` (the
same template the bug was found in, confirmed unaffected live — the bug was export-only, since the
live canvas never calls `getTextSvgElement`).

### Suggested order

```
Week 1-2   R-01 + R-03 spikes ──▶ GATE: stay on this fork, or migrate?
Week 2-3   Tier 1 quick wins + the single batched schema migration
Week 3-8   F-01 · F-02 · F-04 · reorder slides · fullscreen + auto-fit · bug sweep
Parallel   Tier 4 consumability prep
Then       Tier 3 style & shapes, then F-05 templates
```

**Rough estimate for this phase: ~2-3 engineer-months**, excluding the two spikes and excluding
everything deferred above.

## Reading order

If you have 10 minutes, read this page — the executive summary plus **Current scope decision**
is enough to know what is being built next and where it lands.
If you are scoping engineering work, read 2 → 3 → 4 → 5 in order, then 6.
