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
| 3 | Batched schema migration — reserve `TDPage.size`/`background`/`notes`/`skipInPresentation`, `TDShape.animation?`, `ImageShape.alt`; fix B-01, B-03, B-04, B-12 | ⏳ next |
| 4 | **F-01** slide frame / artboard | ⬜ pending |
| 5 | **F-02** `ComponentShape` + `components` registry prop | ⬜ pending |
| 6 | **F-04** `insertContent()` · `movePage` + deck drag-and-drop · fullscreen + auto zoom-to-fit | ⬜ pending |
| 7 | Bug sweep — B-02, B-05, B-07, B-08, B-09, B-10 | ⬜ pending |
| 8 | Tier 3 — opacity, corner radius, numeric inspector, format painter, layers panel | ⬜ pending |
| 9 | Tier 4 — consumability: transpiled `dist`, React peer range, consumer smoke test | ⬜ pending |

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

**Out of scope for this phase:** everything under "Deferred" above. **R-03 (build vs adopt)** is a
decision spike, not implementation work, and is not tracked here.

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
