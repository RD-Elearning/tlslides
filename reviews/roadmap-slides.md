# Slide-product roadmap — Phases 11+

`reviews/README.md` covers the audit and the editor-only phases 1–10. This file is the plan for
what comes after: turning the editor into something a **separate Next.js app can embed and drive**,
with a template library and a real background system.

It is written against a fixed goal: *a host app manages slides through a narrow, stable API; users
pick from good-looking templates; backgrounds support gradients.* Everything here is scoped so the
host never has to reach into `TldrawApp` internals.

## The three things that actually unblock the goal

Most of the backlog below is ordinary feature work. These three are load-bearing — get them wrong
and everything after is harder.

**1. A facade, not the whole app.** Today a host would call `TldrawApp` directly: ~200 public
methods, most of them canvas-level (`completeSession`, `updateBindings`). A host building a slide
manager needs maybe fifteen. Phase 14 introduces `app.deck.*` as the *only* surface a host is
expected to touch, and documents it as such. Without this, every internal refactor is a breaking
change for the host app, and there is no honest way to version the package.

**2. Headless rendering.** Right now the only way to get a picture of a slide is to mount the
editor and screenshot the DOM. That blocks server-side thumbnails, PDF export, and any
slide-manager UI that wants to show a grid of previews without instantiating a canvas per slide.
Phase 15 extracts `renderPageToSvg(page, assets, opts)` as a pure function of the document — no
React, no DOM measurement — so the same code path serves the editor, the host's preview grid, and
a Node-side export worker. This is the single highest-leverage item for Next.js integration and it
is not obvious from the feature list.

**3. Templates are layouts with named slots, not clipart.** A template that is just a frozen set
of shapes can be inserted and nothing more. A template whose shapes carry
`slot: 'title' | 'body' | 'image' | …` can be *filled* — by a user picking a layout and typing, by
a bulk import, and later by the AI pipeline, all through one code path. The slot concept costs
almost nothing to add now (one optional field) and is very expensive to retrofit. Phase 13 builds
templates on top of it from day one.

## Phases

### Phase 11 — Background system ✅ done

`TDPage.background` was a reserved `string` that **nothing rendered**, so it was widened to a
structured type with no migration and no version bump, exactly as this plan assumed — confirmed
before writing code, and still true: no document produced by this fork ever wrote a non-`undefined`
value into it.

```ts
type SlideBackground =
  | { type: 'solid'; color: string }
  | { type: 'linearGradient'; angle: number; stops: { color: string; at: number }[] }
  | { type: 'radialGradient'; cx: number; cy: number; stops: { color: string; at: number }[] }
  | { type: 'image'; assetId: string; fit: 'cover' | 'contain' | 'tile'; opacity?: number }
```

Shipped exactly as specced above (see `packages/tldraw/src/types.ts`) — no shape changes needed.
The angle convention (an open question in the original brief) is CSS's own: degrees, clockwise,
0° = "to top". Full detail in `reviews/README.md`'s Phase 11 notes; the short version of what
differed from the plan:

- Rendered inside `packages/core/src/components/Frame/Frame.tsx`, as planned, via a new generic
  `TLBackgroundFill` type core owns (not `SlideBackground` itself — core still never learns what a
  "slide" is; `resolveSlideBackground` in `packages/tldraw` does the angle-to-vector conversion and
  hands core a plain `x1/y1/x2/y2` gradient vector).
- **Is** an SVG `<defs>` gradient, not CSS, and this caught exactly the bug this plan predicted —
  just one layer deeper than expected. The `<defs>`/`fill="url(#id)"` wiring was correct on the
  first try; what broke was a *pre-existing* CSS class rule (`.tl-frame-paper`'s themed fill)
  silently overriding the `fill` attribute, since SVG presentation attributes lose to any
  stylesheet rule regardless of specificity. Only visible in a screenshot, exactly as flagged above
  ("the same class of bug Phase 8a hit with opacity"). Fixed by setting the override via inline
  `style` instead of the `fill` attribute.
- Shipped on shapes too (`ShapeStyles.fillGradient`), resolved in `getShapeStyle` reusing Phase 8b's
  work, but scoped to `RectangleUtil`/`EllipseUtil` and to *presets* in the UI rather than a full
  custom-stop editor per shape — the full editor exists for the page background (the brief's
  actual headline ask), not duplicated per-shape. `app.style()` still accepts an arbitrary
  `fillGradient` from any other caller.
- Deck thumbnails pick it up, confirmed directly (`tools/visual/scenarios/background.js`) rather
  than assumed from "renders through the same `Frame`".
- The curated preset list was built as suggested — 24 hand-picked two-color gradients
  (`GRADIENT_PRESETS` in `state/shapes/shared/background.ts`) — and reused for both the page
  background picker and the shape-fill preset row, rather than maintained twice. A mesh/blob
  decorative layer remains out of scope, per the original suggestion.
- Not built, and explicitly out of scope for this phase: UI for `radialGradient` or `image`
  backgrounds (both resolve and render correctly, and are unit-tested, but are only reachable via
  `app.setPageBackground()` directly — `BackgroundMenu` only exposes solid + linear gradient, per
  T11.4's own ask).

### Phase 12 — Deck theme / brand kit ✅ done

Shipped as planned: `TDDocument.theme?: DeckTheme` — a named palette, a heading/body font pairing,
and default shape styles — with five built-in palettes rather than a single example one, and
`Commands.setDeckTheme` + a `ThemeMenu` UI so switching (or clearing) it is one undoable step. Full
detail in `reviews/README.md`'s Phase 12 notes; the short version of what differed from the plan:

- "Templates reference theme *slots*" shipped as a sentinel string a shape's existing `stroke`/
  `fill`/background `color` field already accepts (`'theme:accent1'`), not a second field — see
  the README notes for why a parallel `strokeToken?`/`fillToken?` field was considered and
  rejected. This was the deciding design call of the phase; everything else follows from it.
- Named `DeckTheme`, explicitly not `Theme` — this fork's pre-existing UI light/dark palette
  already owns that name, and the two needed to stay unambiguous in code and in conversation, not
  just in the type system.
- A read-side default (`activeDeckTheme()`) was added on review, not in the original plan: an
  optional `theme` field meant every token in a freshly inserted template resolved to `undefined`
  on a deck that had never set one, so templates landed on the canvas flat grey until a user opened
  `ThemeMenu`. It resolves at every place the document's theme is read for rendering — six call
  sites across the editor, the read-only/thumbnail path, and SVG export — and writes nothing, so an
  untouched deck still persists with no `theme` field at all.
- **Which theme is the default was reviewed and changed.** The obvious first cut,
  `BUILT_IN_DECK_THEMES[0]`, happened to be `midnight`, a dark navy palette — meaning every
  brand-new deck rendered dark by default, a strong opinion this editor's own baseline (Phase 1's
  plain, non-sketchy defaults) argues against, and not how mainstream slide tools start a blank
  deck. Checked directly against a screenshot of a fresh deck under all five themes, the default is
  now `mono-grid` — the one built-in whose palette is functionally grayscale rather than committing
  to a hue mood — set as a named constant that looks the theme up by id rather than by array index,
  so reordering `ThemeMenu`'s list (a pure UI concern, since the menu renders the array directly)
  can never again silently change what a new, untouched deck looks like.
- Depended on Phase 8b's arbitrary colour landing first, exactly as this plan assumed — the token
  design reuses that field, not a new one.

### Phase 13 — Template system ✅ done

Shipped close to the plan, with one structural difference and one thing not built. Full detail in
`reviews/README.md`'s Phase 13 notes; the short version:

- `slot?: string` on `TDBaseShape`, exactly as planned — optional, no migration.
- **A template is `{ id, name, size, background, shapes[] }` — no `thumbnail` field.** The gallery
  (`TemplatePicker`) instead renders a live `TemplateThumbnail`: a cheap SVG built directly from
  the template's own shape data (text approximated as a rounded bar, since there's no mounted DOM
  to measure against in a dropdown), resolved against whichever theme is currently active. This
  was chosen over a stored static image specifically so the picker can never drift out of sync with
  what `addSlideFromTemplate` actually produces, and so a theme switch restyles the gallery's own
  previews along with the rest of the deck — a static thumbnail per template (or per template ×
  theme) could not have done either.
- **Shipped as `app.addSlideFromTemplate(templateId, content?)` directly on `TldrawApp`, not
  `app.deck.addSlideFromTemplate(...)`.** The `app.deck.*` facade is Phase 14's job and does not
  exist yet; this phase's method is one more public `TldrawApp` method today; and will be exactly
  the method `app.deck.addSlideFromTemplate` forwards to once Phase 14 introduces that surface.
  Accepts either a full `Template` object or a built-in's string id.
- A starter pack of twelve layouts, exactly the planned list: title, title+subtitle, section break,
  bullets, two-column, image-left/right, quote, stat row, comparison, timeline, closing. All twelve
  were screenshotted individually and looked at, not just asserted to exist — nine read as a real
  slide someone would use as shipped; two (comparison, image-left/-right) are usable but visibly
  under-composed (dead space, a minor vertical misalignment) and were left as honest mediocrities
  rather than silently touched up. One genuine rendering bug was caught this way and fixed: three
  layouts' divider lines (`two-column`, `stat-row`, `timeline`) were being built with page-absolute
  coordinates in a field (`LineShape.handles`) that this fork's own line-drawing tool always treats
  as shape-local, which rendered the dividers completely invisible (clipped by their own container,
  not merely hard to see) — see the README notes for the full mechanism.
- Templates resolve against the active theme (Phase 12) exactly as planned — the pack is twelve
  layouts × five (or more, for a host's custom theme) looks, not twelve fixed pictures.

**Suggested extra: a master/layout slide — not built, still open.** Shapes marked as belonging to a
master (logo, page number, footer) that render on every slide, are not individually selectable, and
are edited in one place, was suggested in the original plan and remains out of scope for this
phase. It is unrelated to the template system's own data model (a template produces one page's
worth of ordinary shapes; nothing here introduces a cross-page "applies to every slide" concept) and
would need its own design pass — probably a new page-level or document-level field analogous to
`TDDocument.theme`, resolved at render time the same way. Left as a named follow-up, not folded into
this phase or quietly dropped.

### Phase 14 — Host control API (`app.deck.*`) ✅ done

Shipped exactly the specced surface, plus every "suggested extra" (none were optional in practice —
see below), plus two additions the plan didn't anticipate. Full detail in `reviews/README.md`'s
Phase 14 notes; the short version of what differed from the plan:

```
listSlides()            addSlide(opts)         addSlideFromTemplate(id, content?, opts?)
duplicateSlide(id, opts?)  deleteSlide(id)      moveSlide(id, toIndex)
getSlide(id)            setSlideBackground(id, bg)     setSlideNotes(id, notes)
getThumbnail(id, opts)  goToSlide(id)          present(opts)
loadDeck(doc)           getDeck()              onDeckChange(cb)      on(event, cb)
getTheme()  setTheme(theme)  listThemes()  listTemplates()
insertContent(slideId, content, opts?)         addBlock(slideId, block, opts?)
```

- **Every method in the plan's list shipped with that exact name and shape**, each an `opts?`
  richer than specced only where a caller-supplied id needed somewhere to live (`addSlide`,
  `duplicateSlide`, `addSlideFromTemplate`) — see the caller-supplied-ids note below.
- **The typed event stream shipped exactly as named** (`slideAdded`, `slideRemoved`,
  `slideReordered`, `selectionChanged`, `deckChanged`), plus a general-purpose `on(event, listener)`
  underneath `onDeckChange` (which is sugar for `on('deckChanged', ...)`) rather than five
  bespoke subscribe methods.
- **All three "suggested extras" shipped as non-optional, exactly as this plan called them out to
  be** — return values on every mutation, caller-supplied ids with a collision guard, and a
  read-only viewer (`DeckViewer`, wrapping `<Tldraw readOnly showUI={false}>`, not the existing
  `ReadOnlyEditor` — see the README notes for why).
- **Three additions the plan didn't list, all forced by actually building the Next.js sample app
  against the facade**, per this phase's own "fix the facade, not the sample" rule:
  1. `getTheme`/`setTheme`/`listThemes`/`listTemplates` — the plan's own "Further requirements"
     named `setDeckTheme` as one of the pre-existing `TldrawApp` methods the facade should wrap,
     but the headline method list above didn't carry a theme/template entry point at all. The
     sample app's theme-switcher and template picker needed one, so these four shipped.
  2. `BUILT_IN_DECK_THEMES`/`BUILT_IN_TEMPLATES`/`stopKeyPropagationUnlessEscape` are now exported
     from the package root, not just reachable via `Deck` — none of the three were reachable from
     outside the package at all before this phase (all three lived under internal `state/*` paths),
     which would have made a host-side template/theme picker and a host-side free-typed field
     both impossible to build correctly. See the README notes' "gap the sample app surfaced" entry.
  3. **`insertContent`/`addBlock` — not a gap this phase found on its own, but a real one flagged
     on review of the first cut, and closed the way the review asked: in the facade, not around
     it.** The plan's method list never mentioned content insertion at all, and the first version
     of this phase left it out on the (correct in general, wrong for these three call sites)
     reasoning that shape authoring wasn't the facade's job — leaving the sample app's three
     most-visible buttons (add rectangle / KPI tile / bar chart) calling `app.createShapes`
     directly. `Deck.insertContent`/`Deck.addBlock`, built on `TldrawApp.insertContent` (Phase 6),
     close that: one general escape hatch for a host's own shape JSON, one `ComponentShape`
     convenience over it for the fork's actual headline capability. Required threading an optional
     `pageId` through `TDInsertContentOpts`/`Commands.insertContent`/`TldrawApp.insertContent`
     (which previously only ever targeted `app.currentPageId`), and, while doing that, catching and
     fixing a real bug the change would otherwise have introduced — `Commands.insertContent`'s
     selection patch read `app.selectedIds` (always the *current* page's) regardless of which page
     it was patching, which would have silently corrupted a different slide's selection the moment
     `pageId` could differ from the current page. Full detail in the README notes.
- **`getThumbnail` is real, but scoped to exactly what's honestly achievable without Phase 15**:
  it works only for `app.currentPageId` (most shapes' SVG export clones a live, currently-mounted
  DOM node) and only in a browser (`document`/`XMLSerializer`), returning `undefined` rather than
  a wrong-looking image or a throw in either case. A full thumbnail grid without mounting an editor
  per slide still needs Phase 15's `renderPageToSvg`, unchanged from the original plan's reasoning.
- **A pre-existing, unrelated bug fixed on review, not left as a documented workaround: `<Tldraw
  darkMode>` was a dead prop** (declared, never read anywhere in `Tldraw.tsx`; found while
  building `DeckViewer`, which needed it). The first cut worked around it inside `DeckViewer`
  alone; flagged on review as exactly the kind of trap this phase's host audience shouldn't be
  handed, so it's now wired up at the source (`app.setSetting('isDarkMode', ...)` in `Tldraw.tsx`
  itself) and `DeckViewer` simplified back to a plain pass-through. Not part of the original plan
  at all — an incidental find, fixed because leaving a public prop silently broken is worse than
  not having it.
- **Not built, and out of scope on purpose:** `previousSlide`/`nextSlide` convenience methods (the
  plan's own list didn't ask for them either; `listSlides()` + `goToSlide()` compose into the same
  thing host-side, demonstrated in the sample app's `goRelative` helper) and any batching primitive
  for a multi-option call like `addSlide({ name, background })` — each option beyond `id` is its
  own undo step, documented rather than solved, since no such primitive exists anywhere in the
  command stack today and inventing one was well outside this phase's scope.

### Phase 15 — Headless render + export ✅ done

Shipped close to the plan's shape (`renderPageToSvg(page, opts)` — a single options bag rather
than a separate `assets` positional parameter, since `assets`/`theme`/`defaultPageSize` are all
the same kind of "document-level context a page can't resolve alone"), plus every item in the
plan's list except whole-deck PDF, which shipped as a documented recipe instead of a method — the
plan's own "PDF becomes straightforward once headless SVG exists" turned out to be half right: SVG
being headless was necessary but not sufficient, since PDF still needs a rasterizer this package
has no way to pick on a host's behalf (see below). Full detail in `reviews/README.md`'s Phase 15
notes; the short version of what differed from the plan:

- **The foundation shipped as planned, and turned out to need far less new geometry code than the
  plan's own framing ("investigate what is genuinely reusable") worried it might.** Reading every
  shape util end to end (not assumed from the outside) found that only the *assembly* into SVG
  markup strings was genuinely new — the geometry itself (`getRectanglePath`, the `Ellipse`/
  `Triangle` equivalents, every `DrawUtil`/`ArrowUtil` helper including a bent arrow's circular-arc
  math, `getShapeStyle`) was already factored into plain, DOM-free functions the live `Component`s
  and `Indicator`s both already call. Reused directly, not reimplemented, for every shape type
  including `ArrowShape` — the plan's own text singled out text layout as "the hard part... where
  I expect you to spend your thinking," which was correct, but arrows looked at first like a
  second hard case (no `getSvgElement` override, same as Rectangle/Ellipse) and turned out not to
  be one, once the same "is the geometry already pure?" question was actually asked of it.
- **Text layout is exactly the honest approximation the plan asked for, scoped more narrowly than
  it first appears.** Only two things are ever *measured* rather than stored: a bare `TextShape`'s
  own bounds, and a shape `label`'s centering box. Everything else about text rendering (line
  splitting, alignment, `<text>` positioning) needed no measurement at all, since it's relative to
  a bounds value, not to the text's own natural size. `estimateTextSize`, a hand-tuned
  average-character-width heuristic, stands in for the two real cases — documented in both
  `renderPageToSvg.ts`'s own comment and `guides/documentation.md` as approximate, not exact.
- **A real, previously-invisible bug was found via this phase's own screenshot, in pre-existing
  code this phase didn't write** — `getTextSvgElement.ts` (the shared DOM-imperative helper both
  the live `copySvg` export path and this phase's `renderTextLines` are built on) never multiplied
  font size by `style.scale`, while the bounds it centers text against always assumed scale *was*
  applied. Every one of Phase 13's twelve starter templates sets `scale` on its text, so this had
  silently made "Copy as SVG"/PNG export of any template render oversized, overlapping text since
  Phase 13 shipped — invisible until this phase rendered an export to an actual image and looked
  at it, exactly the class of bug the roadmap's own "screenshot everything" rule exists to catch,
  just one phase later than it was introduced. Fixed at the shared root cause, once, with a new
  regression test (`getTextSvgElement.spec.ts` — the function had no coverage before this phase).
- **`Deck.getThumbnail` lifted exactly the limitation Phase 14 documented**: works for any slide,
  needs no browser, same method signature. Confirmed by rewriting the two `Deck.spec.ts` tests that
  used to lock the old limitation in, not by only adding new passing tests alongside stale ones.
- **PNG shipped as a new method, `Deck.exportSlidePng`, not a `getThumbnail` format option** —
  rasterizing is unavoidably asynchronous (no synchronous browser SVG→canvas decode exists), and
  `getThumbnail`'s Phase 14 contract is synchronous; a format flag that sometimes returns a
  `Promise` would have been a confusing, inconsistent signature. Browser-only by necessity (needs
  `<canvas>`), resolving `undefined` in Node per the same convention `getThumbnail` already set,
  rather than throwing.
- **No PNG or PDF dependency was added — a deliberate scope decision, reasoned through rather than
  defaulted to "skip it."** Node has no dependency-free SVG rasterizer (every real option is a
  native binding — `sharp`, `canvas` — or a full headless browser); which one, if any, a given
  host's deployment already has isn't something this package can know. `renderPageToSvg`'s plain
  string output works against any of them, so the choice is documented as a recipe
  (`guides/nextjs-integration.md`) rather than forced as a dependency.
- **Whole-deck PDF is the one plan item not built, named here as the explicit follow-up the plan's
  own rules ask for, not silently dropped.** It needs a vector SVG→PDF converter (nothing
  lightweight and dependency-free does this well) or rasterizing every slide to PNG first (the
  same environment question as above) and assembling a PDF of full-page images with a small,
  pure-JS library (`pdf-lib` — no native bindings, works in Node and the browser). A full worked
  recipe for the second approach is in `guides/nextjs-integration.md`; shipping it as a real
  `Deck.exportPdf()` would have meant either bundling a rasterizer for every consumer of this
  package or silently failing for hosts that don't have one, and "a correct partial beats a broken
  whole" (this phase's own instruction) argued for stopping at the documented recipe instead.
- **Deck JSON in/out shipped as `Deck.exportDeckJson`/`importDeckJson`** — thin
  `JSON.stringify`/`JSON.parse` wrappers, since `getDeck`/`loadDeck` (Phase 14) already moved a
  `TDDocument` in and out as a plain, already-serializable object; these exist only for a host that
  specifically wants text.

### Phase 16 — Presentation runtime ✅ done

`ShapeAnimation`, `AnimationEffect`, `AnimationTrigger` and `TDPage.notes`/`skipInPresentation`
were reserved in the schema (Phase 3) and unused; this phase made them real, with no migration and
no version bump — every field this phase needed already existed. Full write-up:
`reviews/README.md`'s **Phase 16 notes**. Summary of what shipped vs. what this plan assumed:

- **Build-order animation playback — shipped as planned, plus a concrete answer to a question
  this entry didn't ask.** `onClick`/`withPrevious`/`afterPrevious` all behave distinctly
  (`withPrevious` joins the previous step with no advance of its own; `afterPrevious` gets its own
  step that reveals on a timer, no click needed); "Next"/"Back" compose build steps and slide
  navigation into one action, with "Back" landing on a previous slide **fully built** rather than
  at its own first step (a deliberate, documented choice this entry left for the implementer to
  make). Kept fully out of `renderPageToSvg`/`copySvg`/normal editing, verified directly (a
  `fadeIn` shape exports at full opacity), not assumed.
- **Speaker notes — shipped in `PageOptionsDialog`** (the existing per-page settings dialog), not
  a new panel; committed on blur, with `stopKeyPropagationUnlessEscape` on the textarea per this
  repo's established convention.
- **`skipInPresentation` — shipped as a `DeckContextMenu` checkbox plus a "SKIPPED" thumbnail
  badge** (the badge wasn't asked for; added because a context-menu checkbox alone is easy to set
  and forget). Honoured by `nextPage`/`previousPage` only while presenting.
- **Presenter view — shipped as a `window.open` popup, the plan's own suggested "conventional"
  choice, not the in-app split view.** Current slide + skip-aware "up next" preview (via
  `renderPageToSvg`, no second mounted editor) + speaker notes + a local elapsed timer, with
  Back/Next buttons that drive the opener's own `TldrawApp` directly (same-origin, direct function
  calls — no `postMessage`). **What it cannot do, as flagged as a risk by this plan and confirmed,
  not hedged, by shipping it:** needs a real, unblockable popup and a user gesture; same-origin
  and same-machine only (not a remote/networked presenter view); polls the app's state on a
  ~300ms interval rather than a push subscription, so it can lag the main window by that much.
  **A real, non-hypothetical bug this pairing produced, not anticipated by this entry:** opening
  the popup could silently end the presentation it was opened from, because opening any new
  window is a well-known trigger for a browser to auto-exit fullscreen, and this fork's Phase 6
  `fullscreenchange` listener treated any fullscreen loss as "leave presentation mode." Fixed with
  a narrowly-scoped, self-consuming suppression flag — see the Phase 16 notes for the full story.
- **Slide transitions — shipped as a small, fixed set (fade / push / cut), exactly "small and
  tasteful" as asked, as an editor-wide `settings` preference (like `isDarkMode`), not a document
  field** — the same "this phase needs no schema change" property the rest of it has. `push` is
  honestly one-sided (the incoming slide animates in; there is no outgoing frame left to animate
  against once React has already swapped the page's shape tree), not a two-slide crossfade/push.
- **An authoring UI for animations (T16.2) wasn't explicitly scoped by this entry, and shipped
  as `AnimateMenu`** next to `StyleMenu`, editing effect/trigger/order/duration/delay on the
  current selection through the command layer (undo/redo work). Reads/writes only the *first*
  selected shape for a multi-selection — a deliberate, documented scope cut (`computeBuildSteps`'
  own grouping rules make "the same build step, two different triggers" an ambiguous idea, so
  authoring is almost always one shape at a time) — a full `StyleMenu`-style merge across the
  selection is the natural follow-up if that ever stops being true in practice.
- **`app.deck` grew `setSlideSkip`, `advance`, `back`, `getPresentationState`, and
  `openPresenterView`, plus a `presentationChanged` event** — "presenting is something a host will
  absolutely want to drive," per the Phase 16 brief in `reviews/README.md`'s scope decision.
  Deliberately *not* added: a per-shape animation setter on the facade — Phase 14's own line
  ("add/replace a slide's content as a unit," not "edit an existing shape's fields") still holds;
  `getDeck().pages[id]` plus `TldrawApp.setShapeAnimation` covers a host that genuinely needs it.

**Explicit follow-ups, not silently dropped:**
- Click-anywhere-on-the-canvas to advance (a common presenter convention) wasn't wired — the
  canvas click already has meaning in this editor (selection), and giving it a second, contextual
  meaning during presentation felt like a real interaction-design decision to make deliberately
  later, not a default to ship quietly now. Right arrow/Space, the deck's own Back/Next buttons,
  and the host API (`Deck.advance`/`back`) are the driving surfaces today.
- `AnimateMenu`'s multi-selection merge (see above).
- A remote/cross-origin presenter view for a host that can't rely on `window.open` same-origin
  access — buildable today from `Deck.getThumbnail`/`Deck.on('presentationChanged', ...)`/
  `Deck.advance`/`back`, just not shipped as a ready component.

### Phase 17 — Typography and text (done — shipped vs. planned)

All six asks shipped as optional `ShapeStyles` fields (`lineHeight`, `letterSpacing`, `list`,
`verticalAlign`, `fontFamily`, `fontToken`, `autoFit`), no migration, no version bump. Full design
rationale and the two real bugs a screenshot caught: `reviews/README.md`'s Phase 17 notes.
Reference: `guides/documentation.md`'s "Typography (Phase 17)" section.

**Shipped, narrower than "every shape everywhere," on purpose:**
- Bullet/numbered `list` markers — **`TextShape` only**, not shape labels or `StickyShape`.
- `verticalAlign`/`autoFit` — **Rectangle/Ellipse/Triangle labels only**. Not Arrow (its own
  independent auto-shrink-to-length `scale` already exists; a second auto-sizing mechanism would
  collide with it, not complement it). Not `StickyShape` (its box *grows* to fit text — the
  opposite philosophy from "shrink text into a fixed box"). Not a bare `TextShape` (no independent
  box — its bounds *are* the measured text).
- `fontFamily` — an arbitrary CSS font-family, trusted verbatim; a host owns making it load (a
  `<link>` tag, a self-hosted `@font-face`, or a web-safe name). Resolved by one function,
  `resolveFont`, everywhere a font is used (live CSS, `getSvgElement`, `renderPageToSvg`).
- `fontToken` (`'heading' | 'body'`) closes the Phase 12 "theme switch doesn't restyle fonts"
  follow-up, but **only for shape labels and `StickyShape`** — see the follow-up rewritten below
  for exactly why a bare `TextShape` (and therefore every one of the twelve starter templates,
  which render all their real content as `TextShape`) is excluded, and confirmed, not assumed.

**Explicitly NOT built, named here as follow-ups rather than left silent:**
- **Live web-font-loading detection.** No `FontFaceObserver`/`document.fonts.ready` hook forces a
  re-measure once a slow-loading `fontFamily` finishes; text can reflow once, the same as any page
  using `font-display: swap`. A real, separate feature (an async load-and-invalidate lifecycle no
  shape util has needed before), not a corollary of resolving the field — worth adding once a real
  host reports it as a problem in practice, not speculatively.
- **A `fontToken` UI control.** `StyleMenu` has no "bind this shape's font to the theme's
  heading/body pairing" checkbox — only `resolveFont`/the field itself exist; a host or future
  template author sets it via `app.style({ fontToken: 'heading' })` directly. Small, addable
  without any data-model change whenever it's wanted.
- **Closing the theme-font-switch follow-up for `TextShape`/the shipped templates.** `TextUtil.
  getBounds` measures a shape's own box from its rendered font, and its inherited signature
  (`getBounds(shape)`, cached by shape identity) has no way to receive "the active theme" or
  invalidate that cache on a theme switch. Resolving `fontToken` in the live render while
  `getBounds` kept measuring the old font would make a label's *displayed* font drift from the box
  it was *sized for* — worse than the bug being fixed. Real fix needs either widening a base-
  library (`@tlslides/core`) interface this fork doesn't own, or `buildTemplateShapes` rewriting a
  concrete `style.font` into every `TextShape` on each theme switch (Phase 12's "less invasive, less
  consistent" alternative, not attempted here) — left as the next concrete step for this specific
  follow-up, not a redo of Phase 17's own scope.
- **Pixel-exact `verticalAlign` at an edge, headlessly.** `renderPageToSvg`'s `Start`/`End` label
  positioning is a few pixels off (glyph ink starts slightly outside the computed anchor) — an
  extension of `estimateTextSize`'s pre-existing "approximate, not measured" text-layout limitation
  from Phase 15, exposed rather than introduced by this phase's edge-anchoring (the pre-existing
  `Middle` default masked the same slack by symmetry). Not fixable without real font-metrics data
  this module doesn't have, especially not for an arbitrary `fontFamily`.
- **Lists/vertical-align beyond their shipped shape types** (a bulleted `StickyShape`, a vertically-
  aligned bare `TextShape`) — the `applyListMarkers`/box-offset mechanisms are already centralized
  and shape-agnostic, so extending them is mechanical whenever a real use case asks for it.

## Suggested, not yet scheduled

Worth doing, in rough order of value per effort:

- **Theme colours are chosen against the theme's own background, but a slide can have any
  background.** A theme picks `text`/`textMuted` for contrast against `colors.background`; Phase 11
  then lets any slide override its background with an arbitrary solid or gradient. Put a
  `mono-grid` stat-row on a teal gradient and the muted captions are very nearly illegible — see
  `tools/visual/shots/export-headless.png`, where the three captions almost vanish. Nothing is
  broken; the two features are simply unaware of each other. Worth either deriving muted text from
  the *effective* background, or warning in the background picker when contrast drops below a
  threshold.
- **Make a theme switch restyle fonts, not just colours — partially closed by Phase 17, not fully.**
  `ShapeStyles.fontToken` (`'heading' | 'body'`, resolved by `resolveFont`) is exactly the "resolve
  fonts lazily too" fix this bullet originally proposed, and it works: a shape **label**'s or
  `StickyShape`'s font now does restyle live on `setDeckTheme`, with no shape rewritten. It does
  **not** yet apply to a bare `TextShape` — which is what all twelve starter templates actually use
  for their real content (`buildTemplateShapes` still bakes a concrete `style.font` there, unchanged
  from Phase 12) — because `TextUtil.getBounds` measures a `TextShape`'s own box from its rendered
  font and has no way to receive "the active theme" or invalidate its cache on a switch; see the
  Phase 17 section above and its own report notes for the full reasoning. The remaining half of
  this bullet is now `setDeckTheme` rewriting `style.font` on every `TextShape` that still carries
  the outgoing theme's pairing (Phase 12's original "less invasive, less consistent" alternative)
  — the concrete next step, not a re-opening of Phase 17's own scope.
- **Alignment & distribute + smart guides** — check what tldraw 1.9 already ships before building.
- ~~**Locked / background layer** — shapes that can't be selected by a click, only from the layers
  panel.~~ **Closed by Phase 8c**, as a side effect rather than a dedicated feature: `SelectTool`
  already refused to select a locked shape by clicking it (`isLocked` guards at
  `SelectTool.ts:404`/`438`, pre-existing, not new), but nothing before Phase 8c's layers panel
  offered an alternate way in — `app.select(...)` (the public API the panel's row click uses)
  never checked `isLocked` at all. So a shape locked via the layers panel's own lock toggle is now
  exactly "unselectable by a click, selectable only from the layers panel," without any new
  guard code — the panel just exposes a pre-existing asymmetry. Pairing with a "master slide"
  concept is still open.
- **Icon & illustration library** — as `ComponentShape` blocks (Phase 5 already built the registry),
  so the host supplies them and the editor stays dependency-free.
- **Tables** — the most common thing a slide tool lacks. Also a `ComponentShape`.
- **Deterministic ids + a pure `createDeck()` builder** — lets the host (or a script, or later the
  AI pipeline) construct a valid `TDDocument` server-side with no editor instance. Cheap now,
  and it is what makes "generate a deck from an outline" a small feature instead of a project.
- **Copy/paste between decks** — `insertContent()` (Phase 6) already does the hard part.
- **Alt text surfacing** — `alt` is reserved on image/video shapes but has no UI.
- **i18n of the editor chrome** — only if the host app needs it.

Explicitly still deferred, per the scope decision in `reviews/README.md`: the AI pipeline, and
real-time collaboration.
