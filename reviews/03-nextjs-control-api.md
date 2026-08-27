# 3. Programmatic Control from a Next.js App

Your question: *"is the API and feature set sufficient for a Next.js app to control it?"*

**Short answer: yes for imperative control, no for declarative control.** The supported
architecture is: seed once, drive imperatively through the `TldrawApp` instance, persist from
callbacks. `apps/www` is a working in-repo proof this composes with Next.js.

## 3.1 The control surface is genuinely large

All citations `packages/tldraw/src/state/TldrawApp.ts` unless noted. Almost every method is a
chainable arrow-function class property returning `this`.

### Shapes
| Method | Line | Signature |
|---|---|---|
| `createShapes` | 2536 | `(...shapes: ({id, type: TDShapeType} & Partial<TDShape>)[]) => this` |
| `updateShapes` | 2554 | `(...shapes: ({id} & Partial<TDShape>)[]) => this` |
| `create` | 2638 | `(shapes: TDShape[], bindings: TDBinding[]) => this` |
| `patchCreate` | 2648 | same, but **bypasses undo stack + persist** |
| `delete` / `deleteAll` | 2658 / 2684 | |
| `setShapeProps` | 2882 | `<T>(props: Partial<T>, ids = selectedIds)` |
| `createTextShapeAtPoint` | 2564 | also calls `setEditingId` |
| `createImageOrVideoShapeAtPoint` | 2595 | `(id, type, point, size, assetId)` |
| **`replacePageContent`** | 675 | `(shapes, bindings, assets, pageId?) => this` — the main bulk-write escape hatch |

### Style / layout
`style` (2695), `align` (2704), `distribute` (2714, no-op if `< 3` ids), `stretch` (2724),
`flipHorizontal`/`flipVertical` (2733/2742), `rotate` (2891), `nudge` (2806), `duplicate` (2823),
`moveToBack`/`moveBackward`/`moveForward`/`moveToFront` (2768-2795), `moveToPage` (2753),
`toggleHidden`/`toggleLocked`/`toggleAspectRatioLocked` (2844-2872), `group` (2903),
`ungroup` (2925).

### Slides
`createPage` (1670), `changePage` (1680), `previousPage` (1687), `nextPage` (1699),
`renamePage` (1713), `duplicatePage` (1722), `deletePage` (1731 — refuses if only one remains).

### Document
`loadDocument` (1374), `updateDocument` (1298), `mergeDocument` (1212), `resetDocument` (1169),
`loadRoom` (1351).

### Camera & selection
`setCamera` (2040 — note `reason` is **required, no default**), `resetCamera` (2058),
`pan` (2066), `zoomTo` (2095), `zoomIn`/`zoomOut` (2105/2114), `zoomToFit` (2123),
`zoomToSelection` (2150), `zoomToContent` (2181), `resetZoom` (2204),
`zoomBy` (2213 — **throttled at 16ms, can silently drop a programmatic call**);
`select` (2295), `selectAll` (2309), `selectNone` (2329), `setEditingId` (911),
`setHoveredId` (933), `isSelected` (3561).

### View & settings
`togglePresentationMode` (976), `toggleFocusMode` (996), `toggleDarkMode` (1030),
`toggleGrid` (1104), `selectTool` (1115), `cancel` (2942), and the generic
`setSetting<T extends keyof TDSnapshot['settings']>(name, value)` (955) — which lets you write
`isPresentationMode` / `showDeck` / `showGrid` / `isDarkMode` **idempotently**, unlike the
toggles.

### Working example (real code, `examples/tldraw-example/src/api.tsx:9-27`)

```tsx
const handleMount = React.useCallback((app: TldrawApp) => {
  app
    .createShapes({ id: 'rect1', type: TDShapeType.Rectangle, point: [100, 100], size: [200, 200] })
    .selectAll()
    .nudge([1, 1], true)
    .duplicate()
    .select('rect1')
    .style({ color: ColorStyle.Blue })
    .selectNone()
}, [])
return <Tldraw onMount={handleMount} />
```

Field shapes differ per type (`types.ts`): Rectangle/Triangle use `size: number[]`;
**Ellipse uses `radius`, not `size`** (`:324`); **Text has no `size` at all** (`:378-381`);
Sticky has both `size` and `text` (`:384-388`); Image/Video need `assetId` (`:361-375`);
Arrow uses `handles.start/bend/end` (`:337-352`).

## 3.2 Observability: the callbacks

`TDCallbacks` (`TldrawApp.ts:87-169`), all passed as `<Tldraw>` props.

| Prop | Signature | Fires |
|---|---|---|
| `onMount` | `(app) => void` | once, after IndexedDB restore (`:295`) |
| `onChange` | `(app, reason?: string) => void` | **every state mutation**, patches included (`:534`) |
| `onPatch` / `onCommand` | `(app, reason?)` | `:493` / `:497` (undoable only) |
| `onPersist` | `(app)` | `:518-524` |
| `onUndo` / `onRedo` | `(app)` | `:508-516` |
| `onChangePage` | `(app, shapes, bindings, assets)` | `:609` — **diffed deltas**, `undefined` = deleted |
| `onAssetCreate` | `(file: File, id) => Promise<string \| false>` | returns the `src` to use |
| `onAssetDelete` | `(assetId) => void` | `:2675` |
| `onExport` | `(info: TDExport) => Promise<void>` | `:3672` |

Two things to know:

1. **`onChange` gives you no diff** — only `(app, reason)`. To sync to a database you must either
   serialize `app.document` wholesale or use `onChangePage`, which is **current-page-only** and
   **only fires if you supply the callback** (`:520-522` gates the broadcast on its presence).
2. **Callbacks are hot-swapped on every identity change** (`Tldraw.tsx:216-217`). Pass memoized
   callbacks or that effect thrashes.

## 3.3 The editor is UNCONTROLLED — plan around it

`TldrawApp` is constructed once in `React.useState(() => new TldrawApp(...))`
(`Tldraw.tsx:135-157`) and is a zustand store. The `document` prop is a **one-way seeding input,
not a controlled value**:

```tsx
// Tldraw.tsx:190-196
React.useEffect(() => {
  if (!document) return
  if (document.id === app.document.id) app.updateDocument(document)   // soft merge
  else                                  app.loadDocument(document)    // hard reset
}, [document, app])
```

So the pattern keys off `document.id`: same id → merge, different id → full reset. Changing the
**`id` prop** is more destructive still — it constructs an entirely new `TldrawApp`
(`Tldraw.tsx:160-184`) and remounts via `key={sId}` (`:280`).

### Why you cannot make it controlled

1. **`updateDocument` never deletes.** It only copies changed incoming pages in
   (`:1312-1321`). Removing a slide from your server-side document will **not** remove it from
   the editor. `mergeDocument` (`:1212-1292`) *does* handle deletion — but it is not wired to the
   prop.
2. **No echo guard on the prop path.** `updateDocument` → `replaceState` → `onStateDidChange` →
   `onChange`. If you set React state from `onChange` and feed it back into `document`, you loop.
   The only de-dup flag in the codebase (`justSent`, `:547, 608, 681-685`) protects **only** the
   `replacePageContent` path.
3. **Identity-based diffing.** `updateDocument` compares `nextPage !== prevPage` by reference
   (`:1313`). Any JSON round-trip from a server produces all-new identities, so every page is
   rewritten every time.
4. **The spec file admits it is unfinished** — two `it.todo` tests for "when the document prop
   changes" at `TldrawApp.spec.ts:618-621`.

### `patchState` / `replaceState` / `setState` are `protected`

`StateManager.ts:195, 210, 230` — confirmed in the shipped typings
(`dist/state/StateManager/StateManager.d.ts:87, 95, 103`). `TldrawApp` does not re-expose them.
They exist at runtime (instance arrow properties) but TypeScript will reject `app.patchState(...)`
without a cast. **The only sanctioned bulk-write path is `replacePageContent` (675).**

## 3.4 Persistence is fully controllable

```ts
// StateManager.ts:127-137
protected persist = (id?: string) => {
  if (this._status !== 'ready') return
  if (this.onPersist) { this.onPersist(this._state, id) }        // ← always fires
  if (this._idbId) { return idb.set(this._idbId, this._state) }  // ← only if `id` prop given
}
```

`_idbId` comes from the `id` prop (`StateManager.ts:67`, `Tldraw.tsx:136`).

> **Render `<Tldraw>` with no `id` prop and IndexedDB persistence is completely disabled** — the
> constructor skips the read (`:113-117`) and `persist()` short-circuits at line 134. **But
> `onPersist` still fires**, which is exactly the hook for "save to my database via a Next.js API
> route."

`examples/tldraw-example/src/basic.tsx:7` shows the no-persistence form;
`persisted.tsx:7` the idb-backed form.

## 3.5 The multiplayer hook is the best external-backend pattern in the repo

`apps/www/hooks/useMultiplayerState.ts` is worth copying even if you never use Liveblocks. It is
a **bidirectional delta-out / snapshot-in** design:

**Outbound** — `onChangePage` deltas are written to the store, `undefined` meaning delete:
```ts
room.batch(() => {
  Object.entries(shapes).forEach(([id, shape]) => {
    if (!shape) lShapes.delete(id); else lShapes.set(shape.id, shape)
  })
})
```

**Inbound** — subscribe, then push a **full page snapshot**:
```ts
app?.replacePageContent(
  Object.fromEntries(lShapes.entries()),
  Object.fromEntries(lBindings.entries()),
  {}
)
```

**Echo suppression** — `replacePageContent` opens with the `justSent` guard
(`TldrawApp.ts:681-685`), set by `broadcastPageChanges` right before it fires `onChangePage`
(`:608-609`). This is the loop-breaker the `document`-prop path lacks.

**Conflict handling** — `getReservedContent` (`:616-670`) holds back selected shapes, the shape
being edited, and bound arrows; incoming *text* changes to reserved shapes are dropped entirely
(`:712`), only `style` and arrow `decorations` merge through (`:735-740`).

**Undo/redo** is delegated out via `app.pause()` (`StateManager.ts:244-250`).

Swap `LiveMap` for a WebSocket/SSE/Postgres store and the two hook points — `onChangePage` out,
`replacePageContent` in — are the whole contract. Two caveats: it is **per-page only**, so
multi-slide sync needs your own fan-out; and `replacePageContent` writes via
`useStore.setState(..., true)` (`:696, 858`), **bypassing the undo stack, `persist()`, and
`onPersist`**.

## 3.6 Recommended architecture for your product

```tsx
'use client'
import dynamic from 'next/dynamic'
const Editor = dynamic(() => import('./Editor'), { ssr: false })   // required — see §3.8

// Editor.tsx
export default function Editor({ initialDoc }: { initialDoc: TDDocument }) {
  const appRef = React.useRef<TldrawApp>()

  const onMount = React.useCallback((app: TldrawApp) => {
    appRef.current = app
    app.loadDocument(initialDoc)      // seed once, server-generated
  }, [initialDoc])

  const onPersist = React.useCallback((app: TldrawApp) => {
    void saveToServer(app.document)   // debounce this
  }, [])

  // NO `id` prop → no IndexedDB; your server owns storage
  return <Tldraw onMount={onMount} onPersist={onPersist} />
}
```

Then drive AI-generated updates through `appRef.current.*`. **Do not** try to make `document` a
controlled prop.

## 3.7 Thirteen friction points to budget for

| # | Issue | Evidence |
|---|---|---|
| 1 | **`createShapes` is hard-wired to the current page** (`parentId: this.currentPageId`). Building a 20-slide deck means 20 × (`createPage` → `changePage` → `createShapes`), each an undo entry and a persist. **Build a whole `TDDocument` server-side and call `loadDocument` once instead.** | `:2542`, `commands/createShapes.ts:9,32,47` |
| 2 | `createPage` force-switches `currentPageId` — page creation has view side effects. | `commands/createPage.ts:56` |
| 3 | **Presentation mode blocks all programmatic writes.** `togglePresentationMode` sets `readOnly = true` (`:988`), and `cleanup` does `next.document.pages = prev.document.pages` (`:486-488`) — silently reverting every page mutation, programmatic ones included. | as cited |
| 4 | **Text has no width and does not wrap** (`white-space: pre`). Server-generated prose must be pre-wrapped with explicit `\n`, or use `StickyShape`. | `getTextSize.ts:6-70` |
| 5 | `getTextLabelSize` returns a hardcoded `[10, 10]` under SSR. | `getTextSize.ts:54-57` |
| 6 | **`zoomToFit`/`zoomToSelection` inside `onMount` give wrong values** — `rendererBounds` is a dummy `[0,0]-[100,100]` until the resize observer fires. Defer a tick. | `:226-229, 883` |
| 7 | `patchState`/`replaceState` are `protected` — no atomic multi-part external write. | `StateManager.ts:195-230` |
| 8 | `onChange` gives no diff; `onChangePage` is current-page-only. | `:534`, `:520-522` |
| 9 | **`app.select()` throws** on unknown ids — must be try/caught when driving from AI-generated ids. | `:2297-2299` |
| 10 | `zoomBy` is throttled at 16ms and can drop programmatic calls. | `:2213` |
| 11 | `setCamera` requires a `reason` argument (no default). | `:2040` |
| 12 | **`TDCallbacks` is not exported** from the package root — you get the types only indirectly via `TldrawProps`. | `index.ts:4` |
| 13 | **No headless render.** Rasterizing a slide requires launching a browser (`puppeteer-core` + `chrome-aws-lambda`). | `apps/www/pages/api/export.ts` |

Plus bug **B-09**: `examples/tldraw-example/src/api-control.tsx:50` calls `app.patchShapes`,
which does not exist. Do not copy that example — use `updateShapes`.

## 3.8 Next.js integration constraints (recap)

Covered in full in `guides/nextjs-integration.md`; the load-bearing points:

- **`ssr: false` is mandatory** — `<Tldraw>` touches `window`/DOM at import time.
- **The package must be transpiled** — `dist/index.mjs` ships **raw JSX**. Use
  `transpilePackages: ['@tlslides/tldraw', '@tlslides/core']` (Next 13.1+) or
  `next-transpile-modules` (Next ≤12).
- **The packages are not on npm** — you must vendor them as workspace packages.
- **React 18/19 tearing risk** (`zustand@3`, `mobx-react-lite@3`) is the biggest unknown. See
  **R-01** in [06-feature-backlog.md](06-feature-backlog.md).

## 3.9 Verdict

The API **is sufficient** for an AI-driven Next.js product, with one architectural constraint
(imperative, not controlled) and a meaningful adapter layer to write. The single most important
design decision: **generate whole `TDDocument` objects server-side and load them atomically**
rather than issuing hundreds of incremental `createShapes` calls.
