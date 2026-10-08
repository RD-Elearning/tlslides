export * from './Tldraw'
export * from './types'
export * from './state/shapes'
export { TldrawApp } from './state'
export { useFileSystem } from './hooks'

// Phase 14 — the host control API. `Deck` is the class behind `app.deck`; the rest are the
// facade's own request/event types (never `TldrawApp`/`TLPageState`/session internals — see the
// `Deck` class doc comment). `BUILT_IN_DECK_THEMES` and `BUILT_IN_TEMPLATES` are exported here too
// (via `Deck.listThemes()`/`Deck.listTemplates()`, but also directly, for a host that wants them
// before an editor is even mounted, e.g. to render a picker on a page with no `<Tldraw>` yet).
export { Deck } from './state/deck'
export type {
  DeckSlide,
  AddSlideOptions,
  NewSlideOptions,
  ThumbnailOptions,
  RenderSlidePngOptions,
  PresentOptions,
  DeckEventMap,
  DeckEventName,
  DeckEventListener,
  DeckInsertContentOptions,
  DeckContent,
  AddBlockOptions,
  PresentationState,
} from './state/deck'
export {
  BUILT_IN_DECK_THEMES,
  DEFAULT_DECK_THEME,
  // Phase 9 audit — found unreachable from outside the package, fixed here rather than just
  // reported: a host resolving `TDDocument.theme` (optional, since it's a read-side default —
  // see the function's own doc comment) had no supported way to reproduce this one-line
  // fallback (`theme ?? DEFAULT_DECK_THEME`) other than duplicating it, which silently drifts
  // if the default ever changes. `renderPageToSvg`'s own `opts.theme` and every internal
  // rendering path already resolve through this function; a host embedding its own headless
  // preview/thumbnail logic around `renderPageToSvg` should too.
  activeDeckTheme,
} from './state/shapes/shared/deck-theme'
export { BUILT_IN_TEMPLATES, getTemplate } from './state/templates'

// Phase 15 — headless render + export. `renderPageToSvg` is the pure, no-DOM function `Deck.
// getThumbnail`/`exportSlidePng` are built on; exported directly too, for a host that wants to
// render a whole preview grid (or a Node-side export worker) without going through a mounted
// `TldrawApp` at all — see the module's own doc comment for what it does and does not reproduce,
// and `renderSvgToPng`'s for why PNG rasterization is browser-only.
export { renderPageToSvg, renderSvgToPng } from './state/render'
export type { RenderPageToSvgOptions, RenderSvgToPngOptions } from './state/render'

// Phase 16 — build-order animation playback. `computeBuildSteps` is the same pure function
// `TldrawApp.buildSteps`/`Deck.getPresentationState` use internally; exported directly for a host
// building its own presenter chrome around `Deck.advance`/`Deck.back` that wants to show e.g. a
// "3 of 5" indicator without re-deriving the grouping rules itself.
export { computeBuildSteps } from './state/deck/presentation'
export type { BuildStep } from './state/deck/presentation'

// Phase 14 — a standalone, editor-backed read-only deck EMBED for host pages that only need to
// show a deck, not edit it (pannable/zoomable — a full `<Tldraw readOnly>` under the hood). See
// the component's own doc comment for why this wraps `<Tldraw>` rather than `ReadOnlyEditor`.
// Renamed from `DeckViewer` in Q14 (`reviews/blocks/BACKLOG-demo.md` §7) to make room for the
// real, editor-free `<DeckViewer>` below.
// Imported from its own leaf file, not `./components/DeckViewer` (that folder's `index.ts`
// deliberately re-exports only `DeckViewer` — see its own comment — so bundling it in isolation
// never pulls in `DeckEmbed`'s `<Tldraw>`/TldrawApp/MobX).
export { DeckEmbed } from './components/DeckViewer/DeckEmbed'
export type { DeckEmbedProps } from './components/DeckViewer/DeckEmbed'

// Q14 — the animated, read-only deck VIEWER: `DeckSpec` -> `layout()` -> `renderNodeToDom` + a
// `MotionDriver`, with no `TldrawApp`, no MobX, no canvas, no session system anywhere in its
// import graph (verified by `components/DeckViewer/import-graph.spec.ts`). This is the primary
// product surface — viewers vastly outnumber authors — and should be the default choice for a
// host that only needs to show a deck; reach for `DeckEmbed` only when the host wants pan/zoom or
// already ships the editor bundle anyway.
export { DeckViewer } from './components/DeckViewer'
export type { DeckViewerProps } from './components/DeckViewer'

// Phase 14 — exported for a host, not just for this package's own internal panels. Any free-typed
// input a host renders on the same page as a mounted `<Tldraw>` (a rename field, a hex colour box
// in its own slide-manager UI, ...) needs this on `onKeyDown`/`onKeyUp`, for the same reason every
// such field inside the editor's own UI already carries it — see the function's own doc comment.
// `@tlslides/core`'s global keydown listener is attached to `window`, so it fires on a keystroke
// in *any* DOM element on the page the editor shares, not only ones inside the editor's own React
// tree; Tab is the dramatic case (it clones the current selection) but not the only one.
export { stopKeyPropagationUnlessEscape } from './components/preventEvent'

// Phase 18 — block system runtime primitives. The registry, type definitions, and bridge between
// block instances (BlockSpec, plain JSON) and shapes (ComponentShape). Concrete block definitions
// live in `@tlslides/blocks`; this package provides the primitives every block host needs, whether
// they embed an editor, render blocks headlessly, or validate AI output on a server. The split keeps
// the editor independent of any concrete block (no circular dependency), and lets a host import
// the library alone without mounting the editor.
export * from './blocks'
