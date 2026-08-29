# Documentation

## Introduction

This file contains the documentation for the `<Tldraw>` component as well as the data model that the component accepts.

In addition to the docs written below, this project also includes **generated documentation**. To view the generated docs:

1. Run `yarn docs` from the root folder
2. Open the file at:

```
/packages/tldraw/docs/classes/TldrawApp.html
```

## `tldraw`

The `Tldraw` React component is the [tldraw](https://tldraw.com) editor exported as a standalone component. You can control the editor through props, or through the `TldrawApp`'s imperative API. **All props are optional.**

| Prop              | Type         | Description                                                                                               |
| ----------------- | ------------ | --------------------------------------------------------------------------------------------------------- |
| `id`              | `string`     | An id under which to persist the component's state.                                                       |
| `document`        | `TDDocument` | An initial [`TDDocument`](#TDDocument) object.                                                            |
| `currentPageId`   | `string`     | A current page id, referencing the `TDDocument` object provided via the `document` prop.                  |
| `autofocus`       | `boolean`    | Whether the editor should immediately receive focus. Defaults to true.                                    |
| `showMenu`        | `boolean`    | Whether to show the menu.                                                                                 |
| `showPages`       | `boolean`    | Whether to show the pages menu.                                                                           |
| `showStyles`      | `boolean`    | Whether to show the styles menu.                                                                          |
| `showTools`       | `boolean`    | Whether to show the tools.                                                                                |
| `showUI`          | `boolean`    | Whether to show any UI other than the canvas.                                                             |
| `showSponsorLink` | `boolean`    | Whether to show a sponsor link.                                                                           |
| `onMount`         | `Function`   | Called when the editor first mounts, receiving the current `TldrawApp`.                                   |
| `onPatch`         | `Function`   | Called when the state is updated via a patch.                                                             |
| `onCommand`       | `Function`   | Called when the state is updated via a command.                                                           |
| `onPersist`       | `Function`   | Called when the state is persisted after an action.                                                       |
| `onChange`        | `Function`   | Called when the `TldrawApp` updates for any reason.                                                       |
| `onUserChange`    | `Function`   | Called when the user's "presence" information changes.                                                    |
| `onUndo`          | `Function`   | Called when the `TldrawApp` updates after an undo.                                                        |
| `onRedo`          | `Function`   | Called when the `TldrawApp` updates after a redo.                                                         |
| `onSignIn`        | `Function`   | Called when the user selects Sign In from the menu.                                                       |
| `onSignOut`       | `Function`   | Called when the user selects Sign Out from the menu.                                                      |
| `onNewProject`    | `Function`   | Called when the user when the user creates a new project through the menu or through a keyboard shortcut. |
| `onSaveProject`   | `Function`   | Called when the user saves a project through the menu or through a keyboard shortcut.                     |
| `onSaveProjectAs` | `Function`   | Called when the user saves a project as a new project through the menu or through a keyboard shortcut.    |
| `onOpenProject`   | `Function`   | Called when the user opens new project through the menu or through a keyboard shortcut.                   |

> **Note**: For help with the file-related callbacks, see `useFileSystem`.

## `useFileSystem`

You can use the `useFileSystem` hook to get prepared callbacks for `onNewProject`, `onOpenProject`, `onSaveProject`, and `onSaveProjectAs`. These callbacks allow a user to save files via the [FileSystem](https://developer.mozilla.org/en-US/docs/Web/API/FileSystem) API.

```ts
import { Tldraw, useFileSystem } from '@tlslides/tldraw'

function App() {
  const fileSystemEvents = useFileSystem()

  return <Tldraw {...fileSystemEvents} />
}
```

## `TDDocument`

You can initialize or control the `<Tldraw>` component via its `document` property. A `TDDocument` is an object with three properties:

- `id` - A unique ID for this document
- `pages` - A table of `TDPage` objects
- `pageStates` - A table of `TLPageState` objects
- `version` - The document's version, used internally for migrations.

```ts
import { TDDocument, TldrawApp } from '@tlslides/tldraw'

const myDocument: TDDocument = {
  id: 'doc',
  version: TldrawApp.version,
  pages: {
    page1: {
      id: 'page1',
      shapes: {},
      bindings: {},
    },
  },
  pageStates: {
    page1: {
      id: 'page1',
      selectedIds: [],
      currentParentId: 'page1',
      camera: {
        point: [0, 0],
        zoom: 1,
      },
    },
  },
  assets: {},
}

function App() {
  return <Tldraw document={myDocument} />
}
```

**Tip:** The pages and pageStates in tldraw are objects containing `TLPage` and `TLPageState` objects from the [@tlslides/core](/packages/core) library.

**Tip:** The `assets` in tldraw is a table of `TDAssets` (images and videos).

**Important:** In the `pages` object, each `TLPage` object must be keyed under its `id` property. Likewise, each `TLPageState` object must be keyed under its `id`. In addition, each `TLPageState` object must have an `id` that matches its corresponding page.

## Shapes

Your `TLPage` objects may include shapes: objects that fit one of the `TldrawShape` interfaces listed below. All `TldrawShapes` extends a common interface:

| Property              | Type         | Description                                                     |
| --------------------- | ------------ | --------------------------------------------------------------- |
| `id`                  | `string`     | A unique ID for the shape.                                      |
| `name`                | `string`     | The shape's name.                                               |
| `type`                | `string`     | The shape's type.                                               |
| `parentId`            | `string`     | The ID of the shape's parent (a shape or its page).             |
| `childIndex`          | `number`     | The shape's order within its parent's children, indexed from 1. |
| `point`               | `number[]`   | The `[x, y]` position of the shape.                             |
| `rotation`            | `number[]`   | (optional) The shape's rotation in radians.                     |
| `children`            | `string[]`   | (optional) The shape's child shape ids.                         |
| `handles`             | `TDHandle{}` | (optional) A table of `TLHandle` objects.                       |
| `isLocked`            | `boolean`    | (optional) True if the shape is locked.                         |
| `isHidden`            | `boolean`    | (optional) True if the shape is hidden.                         |
| `isEditing`           | `boolean`    | (optional) True if the shape is currently editing.              |
| `isGenerated`         | `boolean`    | (optional) True if the shape is generated.                      |
| `isAspectRatioLocked` | `boolean`    | (optional) True if the shape's aspect ratio is locked.          |

> **Important:** In order for re-ordering to work, a shape's `childIndex` values _must_ start from 1, not 0. The page or parent shape's "bottom-most" child should have a `childIndex` of 1.

The `ShapeStyle` object is a common style API for all shapes.

| Property   | Type         | Description                             |
| ---------- | ------------ | --------------------------------------- |
| `size`     | `SizeStyle`  | The size of the shape's stroke.         |
| `dash`     | `DashStyle`  | The style of the shape's stroke.        |
| `color`    | `ColorStyle` | The shape's color.                      |
| `isFilled` | `boolean`    | (optional) True if the shape is filled. |

### `DrawShape`

A hand-drawn line.

| Property | Type         | Description                               |
| -------- | ------------ | ----------------------------------------- |
| `points` | `number[][]` | An array of points as `[x, y, pressure]`. |

#### `RectangleShape`

A rectangular shape.

| Property | Type       | Description                             |
| -------- | ---------- | --------------------------------------- |
| `size`   | `number[]` | The `[width, height]` of the rectangle. |

### `EllipseShape`

An elliptical shape.

| Property | Type       | Description                         |
| -------- | ---------- | ----------------------------------- |
| `radius` | `number[]` | The `[x, y]` radius of the ellipse. |

### `ArrowShape`

An arrow that can connect shapes.

| Property      | Type     | Description                                                             |
| ------------- | -------- | ----------------------------------------------------------------------- |
| `handles`     | `object` | An object with three `TLHandle` properties: `start`, `end`, and `bend`. |
| `decorations` | `object` | An object with two properties `start`, `end`, and `bend`.               |

### `TextShape`

A line of text.

| Property | Type     | Description               |
| -------- | -------- | ------------------------- |
| `text`   | `string` | The shape's text content. |

### `StickyShape`

A sticky note.

| Property | Type     | Description               |
| -------- | -------- | ------------------------- |
| `text`   | `string` | The shape's text content. |

### `PolygonShape`, `StarShape`, `SpeechBubbleShape` (Phase 8c)

Three additional closed-polygon shapes, additive like every field/type on this page since Phase 3
— new `TDShapeType` members and new shape interfaces need no document migration.

| Type                | Property          | Type       | Description                                                                 |
| ------------------- | ----------------- | ---------- | ---------------------------------------------------------------------------- |
| `PolygonShape`       | `size`            | `number[]` | The `[width, height]` bounding box.                                          |
|                      | `sides`           | `number`   | Number of sides (clamped to a minimum of 3). Set at creation time only — there is no in-editor control to change it afterwards; the toolbar tool always creates a 6-sided polygon. |
| `StarShape`          | `size`            | `number[]` | The `[width, height]` bounding box.                                          |
|                      | `points`          | `number`   | Number of star points (clamped to a minimum of 3). Same "creation-time only" note as `sides` above; the toolbar tool always creates a 5-pointed star. |
|                      | `innerRadiusRatio`| `number`   | Inner-vertex radius as a fraction of the outer radius (clamped to `0.05`–`0.95`). Default `0.5`. |
| `SpeechBubbleShape`  | `size`            | `number[]` | The **full** `[width, height]` bounding box, tail included — the tail is carved out of the bottom edge, not appended below it, so this shape needs no bounds override for selection/resize/rotate to work like every other box shape. |

All three support every `ShapeStyles` field a Rectangle does **except `cornerRadius`** (not
meaningful for a polygon's non-right-angle vertices, or worth the extra geometry for the tail-
bearing speech bubble — see each shape util's own comment) and render through `getShapeStyle`
like every other shape, so opacity, arbitrary stroke width, hex/gradient fills, and the dash
styles all work identically. They cannot bind arrows (`canBind = false`) — precise binding math
against an arbitrary polygon outline was judged a separably-sized feature and left for later; an
arrow released near one of these shapes lands as a free-floating point instead of binding.

### Typography (Phase 17)

The `ShapeStyle` table above predates several phases' worth of style additions (opacity/stroke-
width/corner-radius/hex-colours/gradients from Phases 8a/8b/11, all still valid `ShapeStyles` keys
that table was simply never updated to list); this section documents the typography fields Phase
17 added on top, all optional with a today's-behaviour fallback (no document migration):

| Property         | Type                        | Applies to                                    | Description |
| ----------------- | --------------------------- | ---------------------------------------------- | ----------- |
| `lineHeight`      | `number`                    | `TextShape`, labels, `StickyShape`             | Line spacing, as a multiplier of font size. Undefined keeps the pre-existing hardcoded default (`1` live, `1.3` in SVG export — two different pre-existing conventions, not unified by this field; see `ShapeStyles.lineHeight`'s own comment). |
| `letterSpacing`   | `number`                    | `TextShape`, labels, `StickyShape`             | Letter spacing, in em, as a bare number (not a CSS string — see below). Undefined keeps the pre-existing `-0.03em` constant. |
| `verticalAlign`   | `AlignStyle` (`start`/`middle`/`end`; `justify` is treated as `start`) | Shape **labels** only (Rectangle/Ellipse/Triangle) | Vertical position within the shape's own box. **No effect on a bare `TextShape` or an Arrow label** — see below. |
| `list`            | `'bullet' \| 'number'`       | `TextShape` only                               | Prepends a marker to each `\n`-split line of the *rendered* text. The raw `shape.text`/what you edit is never rewritten — only the display form gets markers (`applyListMarkers`). |
| `fontFamily`      | `string`                    | Anything with a `font`                          | An arbitrary CSS `font-family` value (ideally a full stack, e.g. `'"Poppins", sans-serif'`), trusted verbatim, in place of the four bundled faces. See "Arbitrary font families" below. |
| `fontToken`       | `'heading' \| 'body'`       | Shape labels and `StickyShape` (**not** `TextShape` — see below) | A reference into the active `DeckTheme`'s `fonts.heading`/`fonts.body` pairing, resolved fresh on every render — the lazy-font counterpart to the `'theme:accent1'` colour tokens (Phase 12). |
| `autoFit`         | `boolean`                   | Rectangle/Ellipse/Triangle labels only          | Shrinks (never grows) the label's effective scale so it fits inside the shape's own box. Overrides `scale`'s effect while `true`. Not offered for Arrow (has its own auto-shrink-to-length behaviour already), `StickyShape` (its box grows to fit text — the opposite philosophy), or a bare `TextShape` (no independent box). |

**Arbitrary font families — the honest version.** This fork does not fetch, bundle, or verify that
a `fontFamily`/theme `headingFamily`/`bodyFamily` you set is ever actually loaded. You own making
the family available exactly as you would for any other web page — a `<link>` to a Google Fonts (or
other) stylesheet in your host page's `<head>`, a self-hosted `@font-face`, or a name you know the
browser already has (a web-safe stack like `'Georgia, serif'`, no loading required at all). Two
concrete consequences, stated rather than hidden:
- **In the editor**, if the font hasn't finished loading when text is measured, the browser
  measures/renders with its fallback until the real font loads — text may visibly reflow once,
  the same way any web page using `font-display: swap` can. This fork does not add a
  `FontFaceObserver`/`document.fonts.ready` hook to force a re-measure; that's a documented,
  not-yet-scheduled follow-up (`reviews/roadmap-slides.md`).
- **In `renderPageToSvg` (Node, no DOM, no fonts installed at all)**, the SVG `font-family`
  attribute is set to your literal value, exactly as it already is for the four bundled faces
  (which Node can't "measure" either — text layout there was always an approximation; see
  `estimateTextSize`). Whatever ends up displaying that SVG (a browser, your own SVG→PNG pipeline)
  resolves the family the normal CSS way, including its own fallback if the family isn't available
  there either. `estimateTextSize`'s average-glyph-width table has no entry for an arbitrary
  family (it can't — there's no way to measure an unbundled font's real metrics), so it falls back
  to one neutral, `FontStyle`-independent guess, documented in `renderPageToSvg.ts` as an
  approximation of an approximation.

**Scope cuts, named rather than silent:**
- `verticalAlign`/`autoFit`/`list` are each restricted to the shape type(s) listed above — set on
  an unsupported shape type, the field is simply inert (harmless, not an error).
- `fontToken` has **no effect on a bare `TextShape`**: unlike a label, a `TextShape`'s own on-canvas
  bounds are *measured from its rendered text* (`TextUtil.getBounds`), and that method has no way
  to receive "the currently active theme" without either widening a base-library interface this
  fork doesn't own, or a non-pure global that would make its own bounds cache stale on a theme
  switch — worse than the problem `fontToken` exists to solve. `buildTemplateShapes` therefore still
  bakes a concrete `style.font` into every template's (all `TextShape`-based) content at
  instantiation time, exactly as before Phase 17; a *label's* `fontToken` **does** restyle live on
  a theme switch, since a label's box comes from `size`/`radius`, never from measured text.
- `verticalAlign`/`autoFit`'s headless rendering (`renderPageToSvg`) can be a handful of pixels off
  at the box edges for `start`/`end` (not `middle`, the pre-existing default) — an extension of the
  pre-existing "text layout is an approximation, not a measurement" limitation from Phase 15's own
  `estimateTextSize`, not a new one; see that function's own comment for the concrete numbers.
- No StyleMenu control binds a shape to a theme's `fontToken` interactively yet — only
  `buildTemplateShapes` sets it (on label-bearing content; see above). A host or future template
  author can still set it directly via `app.style({ fontToken: 'heading' })`.

### Editor UI additions (Phase 8c)

None of these introduce a persisted field beyond what's documented above — each reads and writes
data that already existed (`point`/`rotation`, `ShapeStyles`, `isLocked`/`isHidden`, `childIndex`),
so they need no migration either.

- **Numeric inspector ("Position" in the top panel).** Shows and edits a selection's X/Y (`point`),
  W/H (the shape's own dimension field — `size` or `radius`\*2, not the rotated on-screen bounding
  box), and rotation (degrees, stored as radians). With more than one shape selected, X/Y edits
  translate the whole selection by the same delta (preserving relative layout); W/H and rotation
  are shown disabled — resizing/rotating a multi-shape selection to an exact number would need the
  same per-shape-geometry math the interactive resize handles use, a separably-sized feature not
  attempted here. Hidden entirely with no selection (matching `AnimateMenu`'s own precedent); W/H
  is disabled (not hidden) for a shape with no independent size field, e.g. `TextShape`.
- **Format painter (the wand icon next to "Position").** Copies every `ShapeStyles` field except
  `scale` from one shape onto others: select the source, click the button to arm it, then click a
  target (or select several) to apply — one undo step. `scale` is excluded because it's `ArrowUtil`'s
  own internal auto-shrink-to-length factor, not an author-facing style choice. The copy is a *full*
  replacement — a field the source never overrode is written as an explicit `undefined` in the
  patch, clearing any pre-existing override on the target, so the target ends up looking exactly
  like the source rather than merely gaining whatever the source happened to have set.
- **Layers panel** (`app.setSetting('showLayers', ...)` to toggle, default off). Lists the current
  slide's *top-level* shapes (`parentId === pageId`; a group's children aren't individually listed)
  in z-order, front-most first. Supports click-to-select, drag-and-drop reordering (via a new
  `moveShapeToIndex` command — the same "renumber to a gap-free 1..N sequence" design as the
  pre-existing `movePage`, generalized from pages to shapes), and per-shape lock/hide toggles
  (`app.toggleLocked`/`app.toggleHidden`, both pre-existing commands newly exposed in this panel).

## Bindings

A binding is a connection **from** one shape and **to** another shape. At the moment, only arrows may be bound "from". Most shapes may be bound "to", except other `ArrowShape` and `DrawShape`s.

| Property   | Type             | Description                                              |
| ---------- | ---------------- | -------------------------------------------------------- |
| `id`       | `string`         | The binding's own unique ID.                             |
| `fromId`   | `string`         | The id of the `ArrowShape` that the binding is bound to. |
| `toId`     | `string`         | The id of the other shape that the binding is bound to.  |
| `handleId` | `start` or `end` | The connected arrow handle.                              |
| `distance` | `number`         | The distance from the bound point.                       |
| `point`    | `number[]`       | A normalized point representing the bound point.         |

## `TldrawApp` API

You can change the `tldraw` component's state through an imperative API called `TldrawApp`. To access this API, use the `onMount` callback, or any of the component's callback props, like `onPersist`.

```tsx
import { Tldraw, TldrawApp } from '@tlslides/tldraw'

function App() {
  const handleMount = React.useCallback((app: TldrawApp) => {
    app.selectAll()
  }, [])

  return <Tldraw onMount={handleMount} />
}
```

To view the full documentation of the `TldrawApp` API, generate the project's documentation by running `yarn docs` from the root folder, then open the file at:

```
/packages/tldraw/docs/classes/TldrawApp.html
```

Here are some useful methods:

- `loadDocument`
- `select`
- `selectAll`
- `selectNone`
- `delete`
- `deleteAll`
- `deletePage`
- `changePage`
- `cut`
- `copy`
- `paste`
- `copyJson`
- `copySvg`
- `undo`
- `redo`
- `zoomIn`
- `zoomOut`
- `zoomToContent`
- `zoomToSelection`
- `zoomToFit`
- `zoomTo`
- `resetZoom`
- `setCamera`
- `resetCamera`
- `align`
- `distribute`
- `stretch`
- `nudge`
- `duplicate`
- `flipHorizontal`
- `flipVertical`
- `rotate`
- `style`
- `group`
- `ungroup`
- `createShapes`
- `updateShapes`
- `updateDocument`
- `updateUsers`
- `removeUser`
- `setSetting`
- `selectTool`
- `cancel`

Check the generated docs, source or the TypeScript types for more on these and other methods.

## `app.deck` — the host control API (Phase 14)

`TldrawApp` above is the *whole* imperative API — every tool, session, and shape-editing method
the editor itself uses. `app.deck` is a much narrower surface carved out of it: the methods a host
application (a Next.js app embedding `<Tldraw>`, say) actually needs for slide management, and
**the only part of the API a host is expected to call directly.** Everything below wraps one or
more of the `TldrawApp` page/command methods documented above (`createPage`, `movePage`,
`setPageBackground`, `setDeckTheme`, ...) — it never bypasses the command layer, so undo/redo and
multi-select keep working exactly as they do from the UI — and none of it accepts or returns a
canvas-level type (`TldrawApp` itself, `TLPageState`, a session object, ...). `TDDocument`,
`SlideBackground`, `DeckTheme`, and `Template` are the only types shared with the rest of the
package, and all four are plain, serializable data.

**Design rules that hold for every method below** — see `reviews/README.md`'s Phase 14 notes for
the full reasoning:
- **Every mutation returns the id / resulting state it produced, not `void`.** Chain calls without
  re-querying `listSlides()` afterwards: `const id = app.deck.addSlide(); app.deck.
  setSlideBackground(id, bg)`.
- **Caller-supplied slide ids.** `addSlide`, `duplicateSlide`, and `addSlideFromTemplate` all take
  an optional `id` in their options, so a host can key its own database row to a slide before the
  slide exists. Omit it for a generated id. A colliding id **throws** — never a silent overwrite.
- **The event stream is how a host panel stays live**, not polling `onPersist`. Every `on(...)`
  call (and `onDeckChange`, which is sugar for `on('deckChanged', ...)`) returns an unsubscribe
  function.

### Slide CRUD

| Method | Signature | Returns | Notes |
|---|---|---|---|
| `listSlides` | `()` | `DeckSlide[]` | Current order, front to back. |
| `getSlide` | `(id: string)` | `DeckSlide \| undefined` | |
| `addSlide` | `(opts?: { id?, name?, size?, background? })` | `string` (new id) | Each supplied option beyond `id` is its own undo step (`renamePage`/`setPageSize`/`setPageBackground`) — there's no batching primitive underneath, so `addSlide({ name, background })` undoes in two extra steps, not one. |
| `addSlideFromTemplate` | `(template: Template \| string, content?: Record<string,string>, opts?: { id? })` | `string \| undefined` | `undefined` for an unknown built-in template id (matches `TldrawApp.addSlideFromTemplate`'s own convention) — no slide is created in that case. See `listTemplates`. |
| `duplicateSlide` | `(id: string, opts?: { id? })` | `string \| undefined` | `undefined` if `id` doesn't name a slide. |
| `deleteSlide` | `(id: string)` | `boolean` | `false` if `id` is unknown, or if it's the deck's last remaining slide. |
| `moveSlide` | `(id: string, toIndex: number)` | `DeckSlide[]` | Returns the deck's slides in their resulting order. `toIndex` is the target position in the *final* order — see `Commands.movePage`. |
| `setSlideBackground` | `(id: string, background: SlideBackground \| undefined)` | `DeckSlide \| undefined` | |
| `setSlideNotes` | `(id: string, notes: string \| undefined)` | `DeckSlide \| undefined` | Speaker notes — editable from the UI (`PageOptionsDialog`'s textarea) and read back by the presenter view (Phase 16). |
| `setSlideSkip` | `(id: string, skip: boolean \| undefined)` | `DeckSlide \| undefined` | Phase 16 — whether presentation navigation should skip this slide. Editing navigation (the deck panel, `goToSlide`) still reaches it either way. |

`DeckSlide` is `{ id, name, index, size: [number, number], background?, notes?, skipInPresentation?
}` — a narrow, canvas-agnostic projection of a `TDPage` (no `shapes`/`bindings`/`childIndex`; a host
that genuinely needs shape data reads `getDeck().pages[id]` instead, since `TDDocument` isn't
hidden).

### Content

The one place this facade's types aren't slide-level: adding a whole block/batch of shapes to a
slide is in scope; editing an existing shape's own fields is not.

| Method | Signature | Returns | Notes |
|---|---|---|---|
| `insertContent` | `(slideId: string, content: DeckContent, opts?: DeckInsertContentOptions)` | `string[]` | The general escape hatch for a host with its own shape JSON (a server-generated slide, a paste, a future AI pipeline). `DeckContent` is `TDInsertableContent` (`{ shapes, bindings?, assets? }`) re-exported under a facade-local name. |
| `addBlock` | `(slideId: string, block: { componentId: string; props?: Record<string, unknown> }, opts?: AddBlockOptions)` | `string \| undefined` | Convenience over `insertContent` for a single `ComponentShape` — the headline "render your own React as a slide element" capability (Phase 5's `components` registry), now reachable through the facade instead of only via `TldrawApp.createShapes`. `opts: { point?, size? }`. |

Both wrap `TldrawApp.insertContent` (Phase 6) — the same command underlies `paste` and template
insertion — as one undoable command each, never `createShapes`. Three things worth knowing before
using either:

- **`slideId` does not have to be the current slide, and calling either never switches to it or
  moves the user's viewport.** `TldrawApp.insertContent` gained an optional `pageId` in
  `TDInsertContentOpts` (Phase 14) precisely so this facade could target an arbitrary slide
  without an extra `changePage` command (which would both move the viewport and cost a second
  undo step). Pass `center: false` in `opts` (both facade methods take the same option) whenever
  the content carries meaningful absolute coordinates — the default (`center: true`) centers
  against *that slide's own stored camera*, which is only meaningful if the slide is, or recently
  was, the current one. `addBlock` always uses `center: false` internally, since its whole point
  is placing a block at an explicit `point`.
- **Neither accepts a caller-supplied shape id.** Unlike the page-level methods above,
  `TldrawApp.insertContent` unconditionally remaps every shape/binding id it's given (the same
  collision-safety `paste` relies on) — so there is no `opts.id` here. The ids actually assigned
  are returned instead: `insertContent` returns every newly-created top-level shape id (`string[]`,
  unordered), and `addBlock` returns the one id it created.
- Both return an empty/`undefined` result — never throw — for an unknown `slideId`.

See `examples/nextjs-sample/components/Editor.tsx` for both in real use (`addRectangle` uses
`insertContent` directly; `addKpiTile`/`addBarChart` use `addBlock`).

### Thumbnails and export (Phase 15)

`getThumbnail(id: string, opts?: { format?: 'dataUrl' | 'svg' })` → `string | undefined`.

As of Phase 15, this is routed through `renderPageToSvg` (below) and works for **any slide in the
deck, in a browser or in Node, with no mounted editor required** — the Phase 14-era limitation
("only the current slide, only in a browser") is gone. It returns `undefined` only when `id`
doesn't name a slide. It never touches the system clipboard.

```tsx
const dataUrl = app.deck.getThumbnail(anySlideId) // works even if anySlideId isn't current
const raw = app.deck.getThumbnail(anySlideId, { format: 'svg' })
```

`exportSlidePng(id: string, opts?: { scale?: number })` → `Promise<string | undefined>` — the
raster counterpart. **Browser-only**, and therefore async (real image decode has no synchronous
browser API): resolves `undefined` in Node, or for an unknown `id`, rather than throwing. `scale`
(default `2`) multiplies the slide's own pixel dimensions before rasterizing, matching
`TldrawApp.exportShapesAs`'s own PNG export.

`exportDeckJson()` → `string` / `importDeckJson(json: string)` → `TDDocument` — thin
`JSON.stringify`/`JSON.parse` wrappers around `getDeck`/`loadDeck`, for a host that specifically
wants the deck as text (a file, a wire payload) rather than a JS object it already had either way.

#### `renderPageToSvg` — the headless renderer underneath all of the above

Also exported from the package root, for a host that wants to render a whole preview grid (or run
a Node-side export worker) without a mounted `TldrawApp` at all:

```ts
import { renderPageToSvg } from '@tlslides/tldraw'

const svg = renderPageToSvg(page, { assets, theme, defaultPageSize })
```

`renderPageToSvg(page: TDPage, opts?)` → `string` (a complete `<svg>...</svg>` document).
`opts`: `assets?: TDAssets`, `theme?: DeckTheme`, `defaultPageSize?: number[]`, `isDarkMode?:
boolean` (all optional — see the function's own doc comment in `packages/tldraw/src/state/render/
renderPageToSvg.ts` for each default). It is a **pure function of its arguments**: no React, no
DOM, no `document`/`window` reference anywhere in the module — verified by a dedicated jest test
that runs it under a real `@jest-environment node` (`renderPageToSvg.node.spec.ts`), not merely
asserted.

**What it reproduces exactly:** Phase 11 backgrounds and shape gradient fills (as real SVG
`<defs>`, never CSS), Phase 12 theme token resolution (`'theme:accent1'` → a real hex, via the
same `resolveThemeColor`/`activeDeckTheme` every other render path uses), Phase 8a
opacity/stroke-width/corner-radius, and every shape's hand-drawn ("Draw" dash style) geometry —
all reused directly from the same pure helper functions the live editor's own components call
(`getRectanglePath`, `getEllipsePath`, the `ArrowUtil`/`DrawUtil` helpers, `getShapeStyle`), not
reimplemented. Arrows get full fidelity too, straight and curved, arrowheads included.

**What it does not, honestly:**
- **Text layout is an approximation, not a measurement.** A bare `TextShape`'s own size, and a
  `label`'s centering box on Rectangle/Ellipse/Triangle/Arrow, are sized live by measuring against
  a mounted, invisible DOM element — there is no headless substitute for that. `estimateTextSize`
  (also exported, for a host that wants the same heuristic) uses a hand-tuned average-character-
  width table instead. Line count and rough proportions are right; exact pixel width/centering can
  be off by a handful of pixels. Every other shape's size is stored geometry, not layout, so it
  renders exactly, not approximately.
- **A `ComponentShape` block renders as a placeholder** — a dashed box labelled with its
  `componentId` — pixel-identical to what `ComponentUtil.getSvgElement` already renders for "Copy
  as SVG" today. It's a host's own React component; there is no general way to serialize arbitrary
  React to static SVG from a server that never mounted it.
- **A `VideoShape` renders as a neutral placeholder**, never a captured frame — the live SVG export
  path captures one from the currently-playing `<video>` element, and no poster frame is stored on
  the shape or its asset to substitute headlessly.

#### PNG and PDF: what's browser-only, what's Node-only, what isn't shipped

`renderSvgToPng(svg: string, width: number, height: number, opts?: { scale? })` →
`Promise<string | undefined>` (also exported from the package root) rasterizes via `<canvas>` —
**browser-only**, resolving `undefined` in Node rather than throwing. There is no
dependency-free way to rasterize SVG in Node (every real option is a native binding — `sharp`,
the `canvas` package — or a full headless browser), so none was added as a dependency of this
package; see `guides/nextjs-integration.md`'s "Server-side thumbnails and PDF export" section for
wiring your own choice of rasterizer server-side against `renderPageToSvg`'s plain string output.

**Whole-deck PDF is not implemented.** It needs either a vector SVG→PDF converter (nothing
lightweight and dependency-free does this well) or rasterizing every slide to PNG first and
assembling a PDF of full-page images (a small, pure-JS library like `pdf-lib` can do the assembly
part with no native dependency) — a full worked recipe is in `guides/nextjs-integration.md`. Left
as a follow-up rather than a shipped `Deck.exportPdf()` precisely because *which* rasterizer a host
already has is not something this package can decide on a caller's behalf.

### Navigation & presentation

| Method | Signature | Returns | Notes |
|---|---|---|---|
| `goToSlide` | `(id: string)` | `boolean` | Whether `id` named a slide. Always jumps directly — never skips a `skipInPresentation` slide (that's a presentation-only rule; a host asking for a specific slide by id gets that slide). |
| `present` | `(opts?: { slideId?, exit? })` | `boolean` | Enters presentation mode (fullscreen best-effort), jumping to `slideId` first if given; pass `exit: true` to leave instead. Returns whether presentation mode is active afterwards. |
| `advance` | `()` | `PresentationState \| undefined` | Phase 16 — reveal the current slide's next build step, or move to the next (non-skipped) slide once every step on this one is revealed. `undefined` outside presentation mode. See "Presentation runtime" below for the full build-step model. |
| `back` | `()` | `PresentationState \| undefined` | The mirror of `advance`. Un-reveals one build step; once there's nothing left to un-reveal, moves to the *previous* slide **fully built**, not at its own first step. |
| `getPresentationState` | `()` | `PresentationState \| undefined` | `{ slideId, buildStep, totalBuildSteps }`. `undefined` outside presentation mode — there's no build position to report while editing. |
| `openPresenterView` | `()` | `boolean` | Opens (or refocuses) the presenter-view popup. See "Presenter view" below for what it shows and what it cannot do. |

There's no `previousSlide`/`nextSlide` distinct from `advance`/`back` — a plain slide-only version
would have to duplicate `TldrawApp.nextPage`/`previousPage`'s own `skipInPresentation` handling for
no real benefit; `goToSlide` already covers "jump to a specific slide" for a host's own UI (see
`examples/nextjs-sample/components/Editor.tsx`'s `goRelative`).

### Presentation runtime (Phase 16)

`ShapeAnimation`/`AnimationEffect`/`AnimationTrigger`, `TDPage.notes`, and `TDPage.
skipInPresentation` were reserved in the schema since Phase 3 (see `packages/tldraw/src/
types.ts`) and unused until this phase. All four needed no migration or version bump — they were
already valid, inert fields on every existing document.

**Build-order animation playback.** A shape's `animation` field (set via the `AnimateMenu` UI, or
`TldrawApp.setShapeAnimation(animation, ids?)`) is `{ effect, trigger, order, durationMs,
delayMs }`. `computeBuildSteps(page)` (exported from the package root, also `app.buildSteps`)
groups every animated shape on a page into an ordered list of **build steps**, sorted by `order`:

- `AnimationTrigger.OnClick` starts a **new** step that only reveals on an explicit advance.
- `AnimationTrigger.WithPrevious` joins the **same** step as the cue immediately before it in
  `order` — it never gets its own advance, manual or automatic.
- `AnimationTrigger.AfterPrevious` also starts a new step, but one that reveals **automatically**
  (no click) once the previous step's own animation has finished playing.

`TldrawApp.advancePresentation`/`previousPresentation` (bound to the Right/Left arrow keys and
Space, and to the deck's Back/Next buttons, while presenting) compose build steps and slide
navigation into the single "Next"/"Back" action a presentation remote has: **advance** reveals the
next step, or moves to the next slide once every step is revealed; **back** un-reveals a step, or
— once nothing is revealed — moves to the *previous* slide fully built (every step already
revealed), not at its own first step. `app.deck.advance`/`app.deck.back` are the facade
equivalents, returning the resulting `PresentationState`.

**This only ever affects the live editor while presenting.** `renderPageToSvg`, `TldrawApp.
copySvg`, and normal (non-presenting) editing never read `animation` at all — a shape with a
`fadeIn` animation exports, and edits, at full opacity regardless of build state. The playback
itself (`PresentationRuntime`, mounted only while `settings.isPresentationMode`) sets `opacity`/
`translate`/`scale`/`clip-path` directly on a shape's own positioned container element, and
restores every touched node the moment presentation mode ends. It also respects `prefers-reduced-
motion`: builds still gate on the same steps, just without an animated transition.

**Slide transitions** (`settings.presentationTransition: 'fade' | 'push' | 'none'`, default
`'fade'`) are an editor-wide viewer preference, like `isDarkMode` — not a document field, so (like
the animation playback above) this needed no schema change either. Cycle it from the deck's own
control while presenting, or `app.setSetting('presentationTransition', 'push')`.

**Speaker notes** are editable from `PageOptionsDialog` (the gear icon next to a slide in the
`PageMenu` dropdown) — a plain textarea, committed on blur through `TldrawApp.setPageNotes`.

**`skipInPresentation`** has a checkbox in the deck panel's per-slide context menu
(`DeckContextMenu`, right-click a slide thumbnail), and a small "SKIPPED" badge on the thumbnail
itself. `TldrawApp.nextPage`/`previousPage` only honour it while `settings.isPresentationMode` —
editing navigation always reaches every slide.

**Presenter view** (`app.deck.openPresenterView()` / `TldrawApp.openPresenterView()`) opens a
separate `window.open` popup: the current slide, an "up next" preview (skip-aware, rendered via
`renderPageToSvg` — no second mounted editor), speaker notes, and an elapsed timer, with its own
Back/Next buttons that drive the main window. Deliberately **not** an in-app split view: a
presenter routinely wants this on a genuinely separate monitor, which only a real second window can
be. What it cannot do: it needs a real browser popup (a user gesture, and it can be silently
blocked); it's same-origin only (it calls back into the same `TldrawApp` instance directly, so "a
second display" means a second monitor on the *same* machine, not a remote viewer); it polls the
app's state roughly every 300ms rather than subscribing to a dedicated event, so it can lag the
main window by that much; and it's orphaned (not auto-closed) if the main tab crashes rather than
closing normally. A host wanting its own remote/cross-origin presenter surface should build it from
`Deck.getThumbnail`, `Deck.getSlide`, `Deck.on('presentationChanged', ...)`, and `Deck.advance`/
`back` instead — the same primitives this popup is built on.

### Theme & templates

| Method | Signature | Returns |
|---|---|---|
| `getTheme` | `()` | `DeckTheme \| undefined` |
| `setTheme` | `(theme: DeckTheme \| undefined)` | `TDDocument` |
| `listThemes` | `()` | `DeckTheme[]` (the built-in palettes) |
| `listTemplates` | `()` | `Template[]` (the built-in layout pack) |

A host may pass its own `DeckTheme`/`Template` to `setTheme`/`addSlideFromTemplate` — neither has
to come from the built-in lists. `BUILT_IN_DECK_THEMES`/`BUILT_IN_TEMPLATES` are also exported
directly from the package root, for a host that wants them before an editor is mounted.

### Whole deck & events

| Method | Signature | Returns |
|---|---|---|
| `loadDeck` | `(document: TDDocument)` | `TDDocument` |
| `getDeck` | `()` | `TDDocument` |
| `exportDeckJson` | `()` | `string` (`JSON.stringify(getDeck())`) |
| `importDeckJson` | `(json: string)` | `TDDocument` (`loadDeck(JSON.parse(json))`) |
| `on` | `(event, listener)` | `() => void` (unsubscribe) |
| `onDeckChange` | `(listener: (document: TDDocument) => void)` | `() => void` (unsubscribe) |

`on`'s events: `slideAdded { slideId, index }`, `slideRemoved { slideId }`, `slideReordered {
order: string[] }`, `selectionChanged { slideId, shapeIds }`, `deckChanged { document }`,
`presentationChanged { active, slideId, buildStep, totalBuildSteps }` (Phase 16 — fires on
entering/leaving presentation mode and on every build-step/slide change while presenting; `active:
false` on the one event fired when presentation mode turns off). `slideAdded`/`slideRemoved`/
`slideReordered` fire once per committed command (the same cadence as `onPersist`, never on an
in-progress drag); `selectionChanged`/`presentationChanged` fire on any relevant transient change,
including ones a plain click or a build-step advance produces (neither is a `Command` — undo/redo
never rewinds "what's selected" or "what's revealed," only content). `loadDeck` resyncs the event
baseline and fires exactly one `deckChanged`, rather than replaying the new document's pages as a
flood of `slideAdded` events.

### Read-only display: `<DeckViewer>`

For a host page that only needs to *show* a deck (a share link, a dashboard embed) rather than run
the full editor:

```tsx
import { DeckViewer } from '@tlslides/tldraw'

<DeckViewer document={myDocument} slideId="page1" style={{ height: 400 }} />
```

It wraps `<Tldraw readOnly showUI={false}>` — a real, self-contained `TldrawApp`, just with every
UI panel switched off and mutation blocked — rather than the internal `ReadOnlyEditor` component
(which needs an *already-mounted* editor's own context to sit inside, being built for the Deck
panel's thumbnail strip). Panning/zooming/selecting still work in a `<DeckViewer>` — only editing
is blocked — which reads as a normal "view" experience; for a literal static image, use
`app.deck.getThumbnail` instead (via `onMount`, which `<DeckViewer>` also accepts). `<Tldraw
darkMode>` (and so `<DeckViewer darkMode>`) actually forces dark/light mode as of Phase 14 — it
used to be declared and silently ignored; pass an explicit `true`/`false` to control it, or omit
it to leave the app's own default/toggled state alone.

### A note for anything else you build alongside the editor

`stopKeyPropagationUnlessEscape` is exported from the package root too. `@tlslides/core`'s
tool-shortcut keyboard handling listens on `window`, so a keystroke in *any* input on the page —
including a free-typed field in a host's own slide-manager UI, entirely outside the editor's React
tree — reaches it via normal DOM bubbling. Tab is the dramatic case: it clones the current
selection. Put this on `onKeyDown`/`onKeyUp` of any text input a host renders next to a mounted
`<Tldraw>`.
