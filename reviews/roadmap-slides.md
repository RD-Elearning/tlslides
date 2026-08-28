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

### Phase 16 — Presentation runtime

`ShapeAnimation`, `AnimationEffect`, `AnimationTrigger` and `TDPage.notes` /
`skipInPresentation` are **already reserved in the schema** (Phase 3) and unused. This phase makes
them real: build-order animation playback, speaker notes, a presenter view (next slide + notes +
timer), and slide transitions.

### Phase 17 — Typography and text

Bullet/numbered lists, line height, letter spacing, arbitrary font families with a loading story,
text auto-fit within a box, and vertical alignment. Slide decks are mostly text; the current four
built-in fonts and single text block are the weakest part of the editor for this use case.

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
- **Make a theme switch restyle fonts, not just colours.** Theme colours resolve lazily at render
  time (through `resolveThemeColor`), so switching a theme repaints an existing deck. The font
  pairing does not: `buildTemplateShapes` bakes `style.font` into each shape once, at
  instantiation. A host that switches theme therefore sees colours change and typography stay put,
  which reads as a bug even though each half is behaving as designed. Either resolve fonts lazily
  too (a `theme:heading` token, mirroring the colour tokens) or have `setDeckTheme` rewrite the
  font of every shape that still carries the outgoing theme's pairing — the first is more
  consistent, the second is less invasive.
- **Alignment & distribute + smart guides** — check what tldraw 1.9 already ships before building.
- **Locked / background layer** — shapes that can't be selected by a click, only from the layers
  panel. Pairs with the master slide.
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
