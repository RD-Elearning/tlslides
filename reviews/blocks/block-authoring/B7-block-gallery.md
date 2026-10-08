# B7 — Block gallery: live theme-coloured previews, drag-and-drop insert · L · UI

Files: `components/BlockInserter/BlockInserter.tsx` (palette, 343 lines),
`components/BlockInserter/BlockInserterPanel.tsx` (trigger + insert logic, 92 lines).

## Today

A 320px floating list: every registered block (`registry.list()`), grouped by family, name +
summary text, search. Click → inserts `def.defaults` at the viewport centre via `blockToShape`
(parented to `app.currentPageId`). Colours already follow the deck theme because blocks use roles.

## Target

- A gallery panel (docked left, ~360–420px, toggled by the existing "+" button and a keyboard
  shortcut) showing **every** block as a card with a **live preview thumbnail**, name, summary.
  Family tabs/filter + search (keep existing search logic).
- Preview content = the block's `describe.example.props` (the curated sample — every built-in has
  one; conformance guarantees it validates), falling back to `defaults`.
- Previews are rendered with the **current deck's tokens/theme**, so what you see is what you get
  on this slide; switching the deck theme re-renders previews.
- Insert by **click** (centre of current slide viewport, as today) **or drag-and-drop** onto the
  canvas (drop point = block centre, converted with `app.getPagePoint`).
- Inserted instance = example props (deep-cloned, fresh `id`s for the spec and any nested
  `children[].id`), with **no `style`** — i.e. it always starts on the slide's theme; the user
  overrides in the inspector (B6) and can reset there.

## Steps

1. **Preview component** `BlockPreview({ def, width })`:
   - Build a layout ctx with the deck tokens (same source as `useBlockLayoutContext` in
     `hooks/useDeckTokens.ts` — reuse, don't duplicate), box = `def.size.preferred`.
   - Tier A: `renderNodeToDom(layoutBlock(def, props, ctx))` (use B3's `layoutBlock` if merged,
     else `def.layout`) inside a fixed-size div scaled with CSS `transform: scale(width / preferredWidth)`,
     `pointer-events: none`.
   - Tier B: render the **poster** via the same path (DOM of `def.poster(props, ctx)`) or
     `renderNodeToSvg` — do **not** mount live HTML hosts 4× in a menu (no motion, no host
     lifecycle). Check `render-svg.ts` `renderNodeToSvg`'s signature.
   - Wrap in `BlockErrorBoundary` (`state/shapes/ComponentUtil/BlockErrorBoundary`) so one broken
     block can't blank the gallery.
   - Lazy: render only when scrolled into view (IntersectionObserver), memo by
     `(def.type, themeId)`.
2. **Gallery layout**: 2-column grid of cards; family chips; search; empty state. Keep
   `FAMILY_INFO`; drop the `live` family from the chips if it has 0 blocks.
3. **Insert logic** (move into a hook `useInsertBlock()` so click and drop share it):
   `(type, pagePoint?) => void` — clone example props, regenerate ids recursively, strip
   `style`/`$block.style`, `blockToShape(spec, box, { parentId: app.currentPageId, definitionMotion: def.motion })`,
   `createShapes`, `select`. Keep the existing comment about `parentId`.
4. **Drag-and-drop**: HTML5 DnD — `draggable` card sets `dataTransfer.setData('application/x-tls-block', type)`;
   on the canvas container listen for `dragover` (preventDefault when the type is present) and
   `drop` → screen point → `app.getPagePoint(...)` → `useInsertBlock(type, point)`. Find where
   the canvas root element is (`Tldraw.tsx` renders `BlockInserterPanel` at ~l.677) and attach
   there. Show a drop ghost only if cheap; not required.
5. Close behaviour: gallery stays open after insert when docked (users add several blocks);
   Escape closes.

## ⚠️ Hard parts — decisions already made

**H1. Hook calls per card.** `useBlockLayoutContext(box, opts)` is a hook (uses tokens, surface,
store, registry). Call it inside `BlockPreview` (one per card) — fine for 40 cards. Box =
`{ x: 0, y: 0, width: preferredW, height: preferredH }`; the surface it samples is the page
background at that box, which is what a freshly dropped block will sit on.
**H2. Tier B previews: no live HTML.** Render `def.poster!(props, ctx)` through
`renderNodeToDom` (it contains no `host` nodes) — never `def.layout()` for Tier B in the gallery
(that returns a `host` node and would mount the template + animation hooks 4× in a menu).
**H3. Scaling.** Render at preferred size inside a wrapper with
`transform: scale(s); transform-origin: 0 0`, outer box `width = cardW`, `height = preferredH * s`,
`overflow: hidden`, `pointer-events: none`. Text measurement is in slide units, so scaling after
layout keeps it exact.
**H4. Drop coordinates.** `app.getPagePoint(point)` expects a point in the **canvas's own
screen space** (the space of `app.centerPoint`), not `clientX/Y`. Use
`const r = canvasEl.getBoundingClientRect(); point = [e.clientX - r.left, e.clientY - r.top]`.
(The existing `app.onDrop` passes raw `clientX/clientY` for files — only correct when the editor
sits at the viewport origin; don't copy that.)
**H5. Hook into the existing drop handler, don't add a second one.** `Tldraw.tsx` ~l.641 wires
`onDrop={app.onDrop}` (`TldrawApp.ts` ~l.3755, handles files). Extend the flow: in that handler
(or a wrapper passed instead of it), check
`e.dataTransfer.types.includes('application/x-tls-block')` **first** → insert block; else fall
through to the file path. Also `dragover` must `preventDefault()` when that type is present or
`drop` never fires.
**H6. Id regeneration must be recursive:** `props.children[].id` (and nested again) — duplicate
ids across instances trip the validator's duplicate-id check (`seenBlockIds`) once B2 lands.
Write `cloneSpecWithFreshIds(spec)` (walk `props` for any `blocks` slot arrays).
**H7. Strip style:** delete `spec.style` from the clone (the example may carry one) so the block
lands on theme colours; literal colours inside props (e.g. donut slice `color: 'blue'`) stay —
they're content, not style.
**H8. Insert position clamp.** Clamp the dropped box so it stays inside the slide frame
(`resolveDeckFrame` — see how `collision.spec.ts` gets the frame) — dropping near an edge
otherwise leaves half the block off-slide.

## Tests

- Component test: gallery renders one card per registered block (40 today; assert against
  `registry.list().length`, not a literal); search filters; clicking a card calls insert with that
  type.
- `useInsertBlock` unit test: example props used, ids regenerated (no id equal to the example's),
  no `style` on the created shape, parent = current page.
- A theme test: preview of `tls.t.title` uses the current theme's text colour; after switching
  theme the colour changes.
- Manual: `localhost:5433/edit/deck-demo-q3` and `/edit/colorful-blocks-demo` (different
  themes) — open gallery, scroll all families, confirm previews look like the blocks and use each
  deck's colours; drag 3 blocks in; screenshot. Check the gallery with DevTools performance: opening
  it must not freeze the editor (> 200ms long task = fix lazy rendering).

## Done when

- [ ] Every registered block appears with a live preview in the deck's theme colours.
- [ ] Click and drag-and-drop both insert; inserted block has example content, fresh ids, no style.
- [ ] One broken block can't break the gallery (error boundary).
- [ ] Tests above pass; tsc 0; eslint no new errors; one full suite green; ledger row filled.
