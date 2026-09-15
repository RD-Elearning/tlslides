# 7. Integration readiness — a review of phases 1–17

**The question:** is the editor ready to be folded into the real Next.js app, given that
`examples/nextjs-sample/` is only a demo?

**The answer:** yes for embedding and driving. No for shipping an AI slide product on top of it
without the block layer this plan adds. The distinction matters because the remaining work is
*content-model* work, not integration work — none of it is discovered by trying to integrate, and
none of it is made cheaper by waiting.

Baseline measured on a clean tree at `df699142`: **93/93 jest suites, 598 passing + 77 todo (675
total), 19 snapshots**; `build:packages` 9/9 clean;
document schema version 16; `@tlslides/tldraw@1.9.3`, unpublished.

## 7.1 What phases 1–17 actually delivered

| Phase | Shipped | Matters for integration because |
|---|---|---|
| 1 | Clean non-sketchy defaults, own export endpoints | the editor stops looking like a whiteboard |
| 2 | Next.js 15.5 / React 19.2 App Router harness; **R-01 answered** | React 19 works; `onMount` StrictMode double-app bug (B-14) found and fixed |
| 3 | One batched migration to v16, every reserved field | no further migration is owed for anything in this plan |
| 4 | **Slide frame** (`TDPage.size`), zoom-to-fit, framed thumbnails, framed export | a slide is a bounded coordinate space — the prerequisite for everything |
| 5 | **`ComponentShape` + `components` registry** | the substrate the whole block system builds on |
| 6 | `insertContent()`, `movePage`, drag-reorder, fullscreen | content insertion and deck ordering are public API |
| 7 | Bug sweep; **`build:packages` clean of type errors** | a real error can no longer hide in expected noise |
| 8a/8b/8c | Opacity, arbitrary stroke width, corner radius, **arbitrary hex**, numeric inspector, format painter, layers panel, 3 new shapes | style expressiveness reaches "usable design tool" |
| 9 | **Transpiled `dist`**, React peer `^17‖^18‖^19`, `examples/consumer-smoke/` | a consumer needs no `transpilePackages`; packaging regressions surface immediately |
| 11 | Structured `SlideBackground`, real SVG gradients, `BackgroundMenu` | slides have real backgrounds |
| 12 | **`DeckTheme` brand kit**, 5 palettes, `'theme:accent1'` tokens | a deck restyles in one move — the design the block token system extends |
| 13 | **Templates with `slot`**, 12 layouts, `addSlideFromTemplate` | the fill-by-slot interface the AI will target |
| 14 | **`app.deck.*` facade**, typed events, caller-supplied ids, `DeckViewer` | the host API surface is narrow, stable and documented |
| 15 | **`renderPageToSvg`** (pure, no DOM), thumbnails for any slide, browser PNG, deck JSON i/o | server-side rendering without an editor |
| 16 | Presentation runtime, build-order animation, notes, presenter view, transitions | presenting works and is host-drivable |
| 17 | Typography — line height, tracking, lists, vertical align, autofit, arbitrary families | text is styleable |

Two things stand out about *how* this was done, and they are worth preserving: every phase batched
its schema needs so `version` is still 16 after seven feature phases; and the "screenshot
everything" rule caught a test-invisible bug in six separate phases. Both are cheap and both are
why this codebase is in usable shape.

## 7.2 Integration is genuinely de-risked

Evidence, not assertion:

- **`examples/nextjs-sample/` is a real Next.js 15.5 / React 19.2 App Router app**, not a sketch.
  It implements the documented architecture — no `id` prop, seed once via `loadDocument` in
  `onMount`, drive imperatively through a ref, persist from `onPersist`.
- **React 19 was stress-tested for store tearing and passed.** Mount, draw, drag, multi-select,
  undo/redo ×6 under real browser input, despite `zustand@3` / `mobx-react-lite@3` predating
  `useSyncExternalStore`. Phase 2's verdict is evidence-based, with the caveat it states:
  Playwright drives genuine user input, not a synthetic scheduler-interruption stress test.
- **No transpile tax.** `dist` ships transpiled JS as of Phase 9, and `examples/nextjs-sample`
  deliberately has no `transpilePackages` config — which is what proves it.
- **Peer range is `^17 || ^18 || ^19`** in both `packages/tldraw` and `packages/core`.
- **An outside-consumer smoke test exists** (`examples/consumer-smoke/`) so packaging regressions
  surface on a build rather than in a host's app.
- **`app.deck.*` is a real facade**, not a rename of `TldrawApp`: ~30 methods against `TldrawApp`'s
  ~200, with a typed event stream (`slideAdded`, `slideRemoved`, `slideReordered`,
  `selectionChanged`, `deckChanged`, `presentationChanged`), caller-supplied ids with a collision
  guard, and return values on every mutation.
- **Server-side rendering exists.** `renderPageToSvg` is pure and runs in Node
  (`renderPageToSvg.node.spec.ts` is a real test, not aspiration).

**Consumption model, which is a decision not a defect:** the packages are not on npm, so a host
either includes this repo as a workspace or vendors a built tarball. `guides/nextjs-integration.md`
documents both. Option A (workspace) is the right one here, because the block work means the host
*will* be customizing the editor.

## 7.3 The four gaps that block the product

Each is stated with its evidence and its fix.

### G1 — Blocks do not render headlessly *(the critical one)*

`renderPageToSvg` emits a labelled dashed-rect placeholder for every `ComponentShape`
(`packages/tldraw/src/state/render/renderPageToSvg.ts:128-140, 296-297, 1140`), mirroring
`ComponentUtil.getSvgElement` (`ComponentUtil.tsx:166-202`). Both are honest and deliberate — there
is no general way to serialize arbitrary host React to SVG.

But it means: a deck whose content is blocks has **no server thumbnails, no SVG export, no PNG, no
PDF, and no "Copy as SVG"**.

The PNG case is worth stating precisely, because it is easy to assume it escapes.
`Deck.exportSlidePng` calls `renderPageToSvg` and rasterizes *that string* through a browser
`<canvas>` (`Deck.ts:249-258`, `renderSvgToPng.ts`) — so it inherits the placeholder exactly like
every other path. The **only** thing that captures a block's real rendered DOM today is the app's
own export endpoint, which screenshots through headless Chrome (`apps/www/pages/api/export.ts`) —
a separate, app-level path, and Phase 5 noted its own caveat: the export page must be handed the
*same* component registry as the editor, or blocks resolve to placeholders there too.

The demo app's two blocks make this look survivable. A product where every slide is blocks makes
it fatal.

**Fix: P21.** Because blocks are *our* components with a pure `layout()`, not arbitrary host React,
the SVG renderer is writable — which is the entire reason [01-architecture.md](01-architecture.md)
insists on Tier A blocks authoring `layout()` and nothing else visual. `renderPageToSvg` gains an
optional injected `blocks` renderer; absent it, today's placeholder path runs unchanged.

### G2 — No rich text

`TextShape.text` is a plain `string` (`types.ts:595-598`). Bolding one word in a sentence is
impossible — and `ppt-master` names inline emphasis as a core capability, with a specific rule
about *which* words earn it (numerical results, before/after contrasts, one or two load-bearing
nouns).

**Fix: P23, inside blocks only.** A block's text goes through `ctx.measureText` and emits
`TextLine[]` with inline runs — `<tspan>`s in SVG, `<span>`s in DOM. `TextUtil` is not touched, so
the Phase 17 follow-up it is blocked on (`getBounds` caching by shape identity, with no way to
receive the active theme) is sidestepped rather than fought.

### G3 — No deck-level export

PDF returns `501 Not Implemented` and the export menu correctly no longer offers it (Phase 7).
Phase 15 shipped a documented recipe in `guides/nextjs-integration.md` instead of a method, for a
stated reason: Node has no dependency-free SVG rasterizer, and this package cannot pick one on a
host's behalf. PPTX does not exist at all.

**Not fixed by this plan, and deliberately so.** But P21 is the precondition for both: once blocks
produce real SVG, the existing documented recipe (render each slide → rasterize → assemble with
`pdf-lib`) simply works. PPTX becomes tractable for a different reason — a block knows its own
semantic structure, which is what OOXML wants, and `toShapes()` (§01 1.10) keeps that door open.

### G4 — Theme and background are unaware of each other

A `DeckTheme` picks `text`/`textMuted` for contrast against its *own* `colors.background`. Phase 11
then lets any slide set any background. Put a `mono-grid` stat row on a teal gradient and the muted
captions are nearly illegible — recorded as an open follow-up in `reviews/roadmap-slides.md` with
a screenshot (`tools/visual/shots/export-headless.png`). Nothing is broken; the two features are
simply unaware of each other, and **no current test can see it** because nothing measures contrast.

**Fix: P19.** The effective-surface contract ([02-design-language.md](02-design-language.md) §2.4):
every block resolves foreground roles against the luminance actually behind it — sampled at the
block's own box, so a block on the dark end of a gradient knows it — with contrast floors and a
lint finding when a floor cannot be met.

## 7.4 Smaller issues worth knowing before integrating

Not blockers. Each will cost someone an afternoon if it is a surprise.

| Issue | Impact | Status |
|---|---|---|
| `@radix-ui/react-slot@0.1.2` reads `element.ref` | a constant React 19 console warning on every `asChild` render | cosmetic; only a fork-wide Radix upgrade removes it. Recorded as a known issue by the test harness so a *new* error still fails a run |
| Root-hoisted React 17 must be aliased in `next.config.js` — **client compiler only** | aliasing the server compiler too collapses Next's RSC/SSR React layering and breaks prerendering | documented; the sample app is the reference |
| `next build`'s type-check resolves `@types/react` through non-symlink ancestors to the root's 17.x | type errors in a host build | the sample app pins `typeRoots`/`paths` to its own copies |
| `zustand@3` / `mobx-react-lite@3` | theoretical concurrent-rendering tearing | not observed under real input (Phase 2); revisit only if a real symptom appears |
| `window.prompt` for slide rename | not a shippable product surface | Phase 1 debt; P30 replaces it with a real inline input |
| Every option beyond `id` on `Deck.addSlide` is its own undo step | a multi-option add is several undos | documented in Phase 14; no batching primitive exists in the command stack |
| Presenter view is `window.open`, same-origin, ~300ms polling | no remote presenter view | Phase 16 flagged it honestly; buildable host-side from existing API |
| `push` slide transition is one-sided | no true two-slide push | Phase 16; inherent to swapping the page's shape tree |
| `ImageShape.alt` reserved with no UI | accessibility gap | Phase 3 reserved it; P30 surfaces it |
| The build tool does not fail on type errors | a real error can ship with a green build | read `build:packages` output; do not trust its exit code |

## 7.5 Recommendation

**Integrate now, in the workspace model, and build the block layer inside this repo.**

Waiting buys nothing. The integration seams are frozen and proven (`app.deck.*`, `loadDocument` →
imperative → `onPersist`, transpiled `dist`, React 19). The remaining work is content-model work
that happens in `packages/` regardless of whether a host app is wired up, and having the real host
app alongside it means the facade gets exercised by a real caller — which is exactly how Phase 14
found its three missing methods (`getTheme`/`setTheme`/`listThemes`/`listTemplates`,
root-exported constants, and `insertContent`/`addBlock`).

**Sequence:** P18 → P19 → P20 → **P21** before any promise about thumbnails or export is made to
anyone. P22 can run in parallel. Do not start the block library (P24+) before P20's parity harness
exists, or 170 blocks get written twice.

**One honest caveat, restated from the original audit rather than quietly dropped.** This is a
frozen 2021 fork with no upstream; 100% of maintenance is owned here forever. That was true when
R-03 (build vs adopt) was posed and it is still true. Nothing in phases 1–17 or in this plan
changes it — but the cost of switching has gone up by seventeen phases, so if that decision is
still genuinely open, it should be closed **before** P24, not after 170 blocks exist.
</content>
