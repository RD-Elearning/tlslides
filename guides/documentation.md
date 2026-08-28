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
| `setSlideNotes` | `(id: string, notes: string \| undefined)` | `DeckSlide \| undefined` | Speaker notes — reserved on `TDPage` since Phase 3, first written by this command. No presenter view reads it back yet (Phase 16). |

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

### Thumbnails

`getThumbnail(id: string, opts?: { format?: 'dataUrl' | 'svg' })` → `string | undefined`.

**Read this before using it — it is not a headless renderer** (that's Phase 15's
`renderPageToSvg`, which doesn't exist yet):
- It **only works for the current slide** (`id === app.currentPageId`). Most shapes' SVG export
  clones a *live, currently-mounted* DOM node, which only exists for whichever page is actually
  rendered on screen. Asking for a different slide returns `undefined` rather than risking a
  blank/incomplete image that merely looks like a valid thumbnail — it deliberately does not
  switch pages to work around this (that would move the user's viewport and add an undo-stack
  entry just to answer a read).
- It **requires a mounted editor in a browser** — it builds the SVG via `document.
  createElementNS`/`XMLSerializer`, so it returns `undefined` (not a throw) when there's no
  `document` global, i.e. a server/Node context.
- It never touches the system clipboard (unlike `TldrawApp.copySvg`'s normal "Copy as SVG" use,
  which this reuses internally).

### Navigation & presentation

| Method | Signature | Returns | Notes |
|---|---|---|---|
| `goToSlide` | `(id: string)` | `boolean` | Whether `id` named a slide. |
| `present` | `(opts?: { slideId?, exit? })` | `boolean` | Enters presentation mode (fullscreen best-effort), jumping to `slideId` first if given; pass `exit: true` to leave instead. Returns whether presentation mode is active afterwards. |

There's no `previousSlide`/`nextSlide` — compose them from `listSlides()` + `goToSlide()` on the
host side (see `examples/nextjs-sample/components/Editor.tsx`'s `goRelative`); it wasn't worth two
more facade methods for a one-line convenience.

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
| `on` | `(event, listener)` | `() => void` (unsubscribe) |
| `onDeckChange` | `(listener: (document: TDDocument) => void)` | `() => void` (unsubscribe) |

`on`'s events: `slideAdded { slideId, index }`, `slideRemoved { slideId }`, `slideReordered {
order: string[] }`, `selectionChanged { slideId, shapeIds }`, `deckChanged { document }`.
`slideAdded`/`slideRemoved`/`slideReordered` fire once per committed command (the same cadence as
`onPersist`, never on an in-progress drag); `selectionChanged` fires on any selection or
current-slide change, including transient ones a plain click produces. `loadDeck` resyncs the
event baseline and fires exactly one `deckChanged`, rather than replaying the new document's pages
as a flood of `slideAdded` events.

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
