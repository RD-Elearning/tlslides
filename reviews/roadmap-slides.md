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

### Phase 14 — Host control API (`app.deck.*`)

The narrow surface, and the deliverable the Next.js integration actually depends on:

```
listSlides()            addSlide(opts)         addSlideFromTemplate(id, content?)
duplicateSlide(id)      deleteSlide(id)        moveSlide(id, toIndex)
getSlide(id)            setSlideBackground(id, bg)     setSlideNotes(id, notes)
getThumbnail(id, opts)  goToSlide(id)          present(opts)
loadDeck(doc)           getDeck()              onDeckChange(cb)
```

Plus a typed event stream (`slideAdded`, `slideRemoved`, `slideReordered`, `selectionChanged`,
`deckChanged`) so a host's slide-manager panel stays in sync without polling `onPersist`.

**Suggested extras:** every mutation returns the new id / resulting state rather than `void`, so
hosts can chain without re-querying; a `readOnly` deck viewer entry point separate from the editor,
since most host pages only display; and stable, caller-supplied slide ids so the host's own
database rows can key to slides directly.

### Phase 15 — Headless render + export

- `renderPageToSvg(page, assets, opts)` — pure, no DOM. The foundation (see "three things" above).
- Per-slide PNG/SVG, whole-deck PDF, deck JSON in/out.
- Server-side thumbnail generation so a host slide grid does not mount N canvases.

PDF is the most-requested export and currently unimplemented; it becomes straightforward once
headless SVG exists.

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
