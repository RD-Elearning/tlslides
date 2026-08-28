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

### Phase 11 — Background system

`TDPage.background` is currently a reserved `string` that **nothing renders**, so it can be widened
to a structured type with no migration and no version bump.

```ts
type SlideBackground =
  | { type: 'solid'; color: string }
  | { type: 'linearGradient'; angle: number; stops: { color: string; at: number }[] }
  | { type: 'radialGradient'; cx: number; cy: number; stops: { color: string; at: number }[] }
  | { type: 'image'; assetId: string; fit: 'cover' | 'contain' | 'tile'; opacity?: number }
```

Multi-stop linear gradients at an arbitrary angle are the headline ask. Notes:

- Rendered inside `packages/core/src/components/Frame/Frame.tsx`, which already owns the slide
  paper rect and does its own camera math. Core stays slide-agnostic: it receives a resolved paint
  spec, not a `TDPage`.
- Must be an **SVG `<defs>` gradient**, not a CSS one, so the same definition survives SVG/PNG
  export and headless rendering unchanged. A CSS-only gradient would look right in the editor and
  vanish from every export — the same class of bug Phase 8a hit with opacity.
- Also needed on *shapes*, not just pages (a gradient-filled rectangle is table stakes for a
  slide deck). Same union, resolved in `getShapeStyle`, reusing Phase 8b's arbitrary-colour work.
- Deck thumbnails must pick it up — they render through the same `Frame`.

**Suggested extras:** a curated preset list (~24 gradients that actually look good) so users are
not colour-picking from scratch; a mesh/blob decorative layer is *not* worth it yet.

### Phase 12 — Deck theme / brand kit

A `TDDocument.theme`: palette (named brand colours), font pairing (heading/body), default shape
style. Templates reference *theme slots* (`accent1`, `surface`) rather than hard-coded hex, so one
theme switch restyles a whole deck — the thing that makes a template library feel designed rather
than assembled. Depends on Phase 8b's arbitrary colour landing first.

### Phase 13 — Template system

- `slot?: string` added to `TDBaseShape` (optional, no migration).
- A template is a serializable `{ id, name, thumbnail, size, background, shapes[] }` — plain JSON,
  no code, so templates can later be authored, stored, and fetched by the host app.
- `app.deck.addSlideFromTemplate(templateId, content?)` — where `content` maps slot name → value.
- A starter pack of genuinely usable layouts: title, title+subtitle, section break, bullets,
  two-column, image-left/right, quote, stat row, comparison, timeline, closing.
- Templates resolve against the active theme (Phase 12), so the pack is a dozen layouts × N themes
  rather than a dozen fixed pictures.

**Suggested extra: a master/layout slide.** Shapes marked as belonging to the master (logo, page
number, footer) render on every slide, are not individually selectable, and are edited in one
place. This is the difference between a drawing tool and a presentation tool, and hosts always ask
for it.

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
