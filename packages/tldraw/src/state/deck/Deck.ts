import { Utils } from '@tlslides/core'
import { DEFAULT_SLIDE_SIZE } from '~constants'
import { defaultStyle } from '~state/shapes/shared/shape-styles'
import { BUILT_IN_DECK_THEMES } from '~state/shapes/shared/deck-theme'
import { BUILT_IN_TEMPLATES } from '~state/templates'
import { TDShapeType } from '~types'
import type { ComponentShape, DeckTheme, SlideBackground, TDDocument, TDPage, Template } from '~types'
import type { TldrawApp } from '../internal'
import type {
  AddBlockOptions,
  AddSlideOptions,
  DeckContent,
  DeckEventListener,
  DeckEventMap,
  DeckEventName,
  DeckInsertContentOptions,
  DeckSlide,
  NewSlideOptions,
  PresentOptions,
  ThumbnailOptions,
} from './deck-types'

/**
 * `app.deck` — the host control API (Phase 14). This is the *only* surface a host application
 * (e.g. a Next.js app embedding the editor — see `guides/nextjs-integration.md`) is expected to
 * call for slide CRUD, reordering, backgrounds, notes, theme, presentation, and change
 * notifications. Everything below is a thin wrapper over `TldrawApp`'s own page/command methods
 * (`createPage`, `movePage`, `setPageBackground`, `setDeckTheme`, ...) — it never mutates the
 * document directly, so undo/redo and multi-select keep working exactly as they do from the UI.
 *
 * **Design rules that hold across every method here** (see `reviews/README.md`'s Phase 14 notes
 * for the full reasoning):
 * - **Every mutation returns the id / resulting state it produced, never `void`** — a host can
 *   chain (`const id = app.deck.addSlide(); app.deck.setSlideBackground(id, bg)`) without
 *   re-querying `listSlides()` afterwards.
 * - **Nothing here accepts or returns a canvas-level internal** — no `TldrawApp`, no `TLPageState`,
 *   no session object. `TDDocument`, `SlideBackground`, `DeckTheme`, and `Template` are the only
 *   shared types that leak through, and they're plain, serializable data by design (a host can
 *   construct or store them without importing anything canvas-shaped).
 * - **Caller-supplied slide ids.** `addSlide`, `duplicateSlide`, and `addSlideFromTemplate` all
 *   accept an optional `id` so a host can key its own database row to a slide before the slide
 *   even exists (e.g. insert a row, get its primary key, create the slide with that same id).
 *   Omit it and a generated id is used, exactly as before this existed. A colliding id **throws**
 *   rather than silently overwriting or renaming — the same guarantee any primary key gives you,
 *   and far safer than the alternative of a host's "new" slide quietly clobbering another one.
 */
export class Deck {
  private readonly app: TldrawApp

  // A `Map`, not a per-key mapped-type record: TS's mapped optional-property types can't express
  // "the value type here co-varies with whatever key was read", so a plain indexed write to a
  // record typed `{ [K in DeckEventName]?: Set<DeckEventListener<K>> }` doesn't type-check no
  // matter how it's phrased. A `Map` sidesteps that — the one, explicit, narrowly-scoped cast
  // lives in `on`/`emit` below instead of leaking into every call site.
  private listeners = new Map<DeckEventName, Set<(payload: never) => void>>()

  // Baseline used by `_onCommitted` to derive slideAdded/slideRemoved/slideReordered from a
  // before/after diff of `document.pages`, rather than requiring every page-mutating command to
  // remember to fire an event by hand. Reset wholesale (not diffed) by `_resync`.
  private knownOrder: string[]
  private prevSelection: { slideId: string; shapeIds: string[] }

  constructor(app: TldrawApp) {
    this.app = app
    this.knownOrder = this.sortedPageIds()
    this.prevSelection = { slideId: app.currentPageId, shapeIds: [...app.pageState.selectedIds] }
  }

  /* -------------------------------------------------- */
  /*                       Slides                       */
  /* -------------------------------------------------- */

  /** List every slide in the deck, in their current order. */
  listSlides = (): DeckSlide[] => {
    return this.sortedPages().map((page, index) => this.toDeckSlide(page, index))
  }

  /** Get a single slide, or `undefined` if `id` doesn't name one. */
  getSlide = (id: string): DeckSlide | undefined => {
    const page = this.app.document.pages[id]
    if (!page) return undefined
    return this.toDeckSlide(page, this.sortedPageIds().indexOf(id))
  }

  /**
   * Add a new, blank slide at the end of the deck and switch to it.
   * @param opts (optional) `id` (see the class doc comment), `name`, `size`, and/or `background`
   * to set on the new slide immediately. Each supplied option is applied as its own undoable step
   * after the slide is created (`renamePage`/`setPageSize`/`setPageBackground`) — there is no
   * batching primitive in the underlying command stack, so `addSlide({ name, background })`
   * undoes in three steps, not one. Omit what you don't need to avoid the extra steps.
   * @returns The new slide's id.
   */
  addSlide = (opts: AddSlideOptions = {}): string => {
    this.assertNoCollision(opts.id)
    this.app.createPage(opts.id)
    const id = this.app.currentPageId
    if (opts.name !== undefined) this.app.renamePage(id, opts.name)
    if (opts.size !== undefined) this.app.setPageSize(id, opts.size)
    if (opts.background !== undefined) this.app.setPageBackground(id, opts.background)
    return id
  }

  /**
   * Add a new slide built from a template (built-in or a host's own `Template` object), filling
   * any matching `content[slot]` values, and switch to it. See `listTemplates` for the built-in
   * pack.
   * @param template Either a `Template` object or the `id` of a built-in.
   * @param content Maps a template's `slot` names to replacement text.
   * @param opts (optional) `id` — see the class doc comment.
   * @returns The new slide's id, or `undefined` if `template` was an unknown built-in id (no
   * slide is created in that case — matching `TldrawApp.addSlideFromTemplate`'s own convention).
   */
  addSlideFromTemplate = (
    template: Template | string,
    content?: Record<string, string>,
    opts: NewSlideOptions = {}
  ): string | undefined => {
    this.assertNoCollision(opts.id)
    const before = this.app.currentPageId
    this.app.addSlideFromTemplate(template, content, opts.id)
    return this.app.currentPageId === before ? undefined : this.app.currentPageId
  }

  /**
   * Duplicate a slide and switch to the copy.
   * @param opts (optional) `id` — see the class doc comment.
   * @returns The copy's id, or `undefined` if `id` doesn't name a slide.
   */
  duplicateSlide = (id: string, opts: NewSlideOptions = {}): string | undefined => {
    if (!this.app.document.pages[id]) return undefined
    this.assertNoCollision(opts.id)
    this.app.duplicatePage(id, opts.id)
    return this.app.currentPageId
  }

  /**
   * Delete a slide.
   * @returns `true` if it was deleted, `false` if `id` doesn't name a slide or it's the deck's
   * last remaining slide (a deck can't go to zero slides — same guard `TldrawApp.deletePage`
   * itself enforces, checked here too so this return value is accurate without diffing page
   * counts before/after).
   */
  deleteSlide = (id: string): boolean => {
    if (!this.app.document.pages[id]) return false
    if (Object.keys(this.app.document.pages).length <= 1) return false
    this.app.deletePage(id)
    return true
  }

  /**
   * Move a slide to a new position in the deck.
   * @param toIndex The slide's target 0-based position in the deck's *final* order — see
   * `Commands.movePage` for the exact semantics (the natural index for both a drag-and-drop UI
   * and a "move up"/"move down" menu item).
   * @returns The deck's slides in their resulting order (a no-op, returning the unchanged order,
   * if `id` doesn't name a slide).
   */
  moveSlide = (id: string, toIndex: number): DeckSlide[] => {
    if (this.app.document.pages[id]) this.app.movePage(id, toIndex)
    return this.listSlides()
  }

  /**
   * Set (or clear) a slide's background.
   * @returns The updated slide, or `undefined` if `id` doesn't name one.
   */
  setSlideBackground = (id: string, background: SlideBackground | undefined): DeckSlide | undefined => {
    if (!this.app.document.pages[id]) return undefined
    this.app.setPageBackground(id, background)
    return this.getSlide(id)
  }

  /**
   * Set (or clear) a slide's speaker notes.
   * @returns The updated slide, or `undefined` if `id` doesn't name one.
   */
  setSlideNotes = (id: string, notes: string | undefined): DeckSlide | undefined => {
    if (!this.app.document.pages[id]) return undefined
    this.app.setPageNotes(id, notes)
    return this.getSlide(id)
  }

  /**
   * Render a slide to an SVG image — the "honestly achievable now" stand-in for a real headless
   * thumbnail renderer (Phase 15's `renderPageToSvg`, which doesn't exist yet).
   *
   * **What this can and cannot do, precisely:**
   * - It reuses `TldrawApp.copySvg`'s export path (the same one "Copy as SVG" uses), which builds
   *   most shapes' SVG by cloning `document.getElementById(shape.id + '_svg')` — the *live,
   *   currently-mounted* DOM node for that shape. That only exists for the page that's actually
   *   rendered on screen right now.
   * - **This method therefore only works for the current slide** (`id === app.currentPageId`,
   *   i.e. `listSlides()[i].index` matching wherever `goToSlide`/the editor currently is) — it
   *   returns `undefined` for any other slide, rather than attempting it and risking a
   *   blank/incomplete image that merely *looks* like a valid thumbnail. It does not switch pages
   *   to get around this: that would make a "just get me a preview" call move the user's own
   *   viewport and add an undo-stack entry (`changePage` is itself a `Command`), a destructive
   *   side effect no thumbnail API should have.
   * - **It requires a mounted editor in a browser.** It builds the SVG via `document.
   *   createElementNS`/`XMLSerializer`, so it returns `undefined` (not a throw) when `document`
   *   doesn't exist — a server/Node context, exactly the situation Phase 15's headless renderer is
   *   for. It does not need the resulting image to *currently* be visible in the viewport — it
   *   rebuilds from the document data, not a screen capture — only for that slide's shapes to be
   *   the ones presently mounted, which is true for whichever slide is current.
   * - Never touches the system clipboard (unlike `copySvg`'s normal "Copy as SVG" use).
   * @returns A data URL or raw SVG markup (see `ThumbnailOptions.format`), or `undefined` per the
   * two limitations above.
   */
  getThumbnail = (id: string, opts: ThumbnailOptions = {}): string | undefined => {
    if (typeof document === 'undefined') return undefined
    if (id !== this.app.currentPageId) return undefined
    const svg = this.app.copySvg([], id, true, false)
    if (!svg) return undefined
    if (opts.format === 'svg') return svg
    const base64 = btoa(unescape(encodeURIComponent(svg)))
    return `data:image/svg+xml;base64,${base64}`
  }

  /* -------------------------------------------------- */
  /*                       Content                      */
  /* -------------------------------------------------- */

  /**
   * Insert a batch of shapes (and optional bindings/assets) into a slide, as one undoable
   * command — the general escape hatch for a host with its own shape JSON (a server-generated
   * slide, a paste, a future AI pipeline). Thin wrapper over `TldrawApp.insertContent`, which
   * does the real work (id remapping, placement, the undo/redo patch); this method's only jobs
   * are targeting an arbitrary slide (not just the current one) and returning the ids that were
   * actually created.
   *
   * **`slideId` does not have to be the current slide, and switching to it is never a side
   * effect of calling this.** `TldrawApp.insertContent` operates on `app.currentPageId` by
   * default; this method always passes `slideId` through as `TDInsertContentOpts.pageId`
   * instead, so content lands on the requested slide — including one the user isn't currently
   * looking at — without moving their viewport or `changePage`'s own undo-stack entry. Returns
   * `[]` (not a thrown error) if `slideId` doesn't name a slide, matching this facade's existing
   * convention for a bad id elsewhere.
   *
   * **The ids you get back are never the ones on the `TDShape` objects you passed in.**
   * `TldrawApp.insertContent` unconditionally remaps every shape/binding id before inserting —
   * load-bearing behaviour that's what makes pasting or re-inserting the same content twice safe
   * rather than colliding — so, unlike `addSlide`/`duplicateSlide`/`addSlideFromTemplate`, there
   * is no `opts.id` here to request a specific one. The ids actually assigned are recovered by
   * diffing the slide's shape ids before and after the call and returned as an array, in no
   * particular order, one per top-level shape inserted.
   * @param opts `center: false` (see `DeckInsertContentOptions`) keeps each shape's own authored
   * `point` — use this whenever `content` carries meaningful absolute coordinates, the same
   * reason a template applies it. The default (`center: true`) centers against the *target
   * slide's own stored camera*, which is only meaningful if that slide is, or recently was,
   * current — prefer `center: false` with explicit coordinates for a slide the user isn't
   * looking at.
   * @returns The ids of the top-level shapes that were inserted.
   */
  insertContent = (
    slideId: string,
    content: DeckContent,
    opts: DeckInsertContentOptions = {}
  ): string[] => {
    const page = this.app.document.pages[slideId]
    if (!page) return []
    const idsBefore = new Set(Object.keys(page.shapes))
    this.app.insertContent(content, { ...opts, pageId: slideId })
    const after = this.app.document.pages[slideId]
    if (!after) return []
    return Object.keys(after.shapes).filter((id) => !idsBefore.has(id))
  }

  /**
   * Add a single `ComponentShape` block to a slide — the host's own React component (a chart, a
   * KPI tile, a branded element, ...) rendered as slide content, registered by `componentId`
   * against the `components` registry passed to `<Tldraw components={...}>` (Phase 5). This is
   * the headline "render your own React as a slide element" capability, reachable through the
   * facade rather than only via `TldrawApp.createShapes` — see `examples/nextjs-sample/
   * components/Editor.tsx` for the sample app's own use of it (KPI tile / bar chart buttons).
   *
   * A thin convenience over `insertContent` above: builds a minimal, valid `ComponentShape` (the
   * fields `insertContent`/`TLDR.getShapeUtil(...).create` fill in or overwrite regardless —
   * `parentId`, `childIndex`, `name`, `style`, `rotation` — are given inert placeholders, not
   * meaningful input) and inserts it with `center: false` so `opts.point` lands exactly where
   * given, never recentered against a viewport. Same `slideId`/id-remapping rules as
   * `insertContent` apply — this does not take a caller-supplied shape id either.
   * @param slideId The slide to add the block to — does not have to be the current slide.
   * @param block `componentId` must match an entry in the host's `components` registry (an
   * unregistered id renders a placeholder rather than crashing — see `ComponentUtil`). `props` is
   * whatever plain, serializable data that component expects.
   * @returns The new shape's id, or `undefined` if `slideId` doesn't name a slide.
   */
  addBlock = (
    slideId: string,
    block: { componentId: string; props?: Record<string, unknown> },
    opts: AddBlockOptions = {}
  ): string | undefined => {
    const shape: ComponentShape = {
      id: Utils.uniqueId(), // discarded by insertContent's id remap; a placeholder to satisfy TDShape
      type: TDShapeType.Component,
      name: 'Component',
      parentId: slideId,
      childIndex: 1,
      point: opts.point ?? [0, 0],
      size: opts.size ?? [320, 200],
      rotation: 0,
      style: defaultStyle,
      componentId: block.componentId,
      props: block.props ?? {},
    }
    const [insertedId] = this.insertContent(
      slideId,
      { shapes: [shape] },
      { center: false, select: false }
    )
    return insertedId
  }

  /* -------------------------------------------------- */
  /*                    Navigation                      */
  /* -------------------------------------------------- */

  /**
   * Switch the current slide.
   * @returns `true` if `id` named a slide (and the switch happened), `false` otherwise.
   */
  goToSlide = (id: string): boolean => {
    if (!this.app.document.pages[id]) return false
    this.app.changePage(id)
    return true
  }

  /**
   * Enter or leave presentation mode (fullscreen best-effort — see `TldrawApp.
   * togglePresentationMode`'s own doc comment for why it's best-effort).
   * @param opts (optional) `slideId` to jump to first, and/or `exit: true` to leave presentation
   * mode instead of entering it.
   * @returns Whether presentation mode is active after this call.
   */
  present = (opts: PresentOptions = {}): boolean => {
    if (opts.slideId && this.app.document.pages[opts.slideId]) {
      this.app.changePage(opts.slideId)
    }
    if (opts.exit) {
      this.app.exitPresentationMode()
    } else if (!this.app.settings.isPresentationMode) {
      this.app.togglePresentationMode()
    }
    return this.app.settings.isPresentationMode
  }

  /* -------------------------------------------------- */
  /*                  Theme & templates                 */
  /* -------------------------------------------------- */

  /** The deck's active brand theme, or `undefined` if none is set. */
  getTheme = (): DeckTheme | undefined => this.app.document.theme

  /** Set (or clear) the deck's active theme — see `TldrawApp.setDeckTheme`. */
  setTheme = (theme: DeckTheme | undefined): TDDocument => {
    this.app.setDeckTheme(theme)
    return this.app.document
  }

  /** The shipped brand themes (`ThemeMenu` renders this same list) — a starting point for a
   *  host's own theme picker. A host is free to pass any other `DeckTheme` to `setTheme`; it
   *  doesn't need to come from this list. */
  listThemes = (): DeckTheme[] => BUILT_IN_DECK_THEMES

  /** The shipped slide-layout templates (`TemplatePicker` renders this same list) — pass one's
   *  `id` straight to `addSlideFromTemplate`. As with themes, a host may pass its own `Template`
   *  object there instead of one from this list. */
  listTemplates = (): Template[] => BUILT_IN_TEMPLATES

  /* -------------------------------------------------- */
  /*                    Whole deck                      */
  /* -------------------------------------------------- */

  /** Load a new document, replacing the current deck entirely. */
  loadDeck = (document: TDDocument): TDDocument => {
    this.app.loadDocument(document)
    return this.app.document
  }

  /** The current document. Shared, not facade-specific — see the class doc comment. */
  getDeck = (): TDDocument => this.app.document

  /* -------------------------------------------------- */
  /*                      Events                        */
  /* -------------------------------------------------- */

  /**
   * Subscribe to a typed deck event. See `DeckEventMap` for the full list and payload shapes.
   * @returns An unsubscribe function. Safe to call more than once, and safe to call from inside
   * the listener itself (e.g. a one-shot listener that unsubscribes on its first call).
   */
  on = <E extends DeckEventName>(event: E, listener: DeckEventListener<E>): (() => void) => {
    let set = this.listeners.get(event)
    if (!set) {
      set = new Set()
      this.listeners.set(event, set)
    }
    const erased = listener as (payload: never) => void
    set.add(erased)
    return () => {
      set!.delete(erased)
    }
  }

  /**
   * Sugar for `on('deckChanged', ({ document }) => ...)` — the typed, multi-subscriber
   * replacement for polling `<Tldraw onPersist>` to keep a host's own slide-manager UI in sync.
   * @returns An unsubscribe function.
   */
  onDeckChange = (listener: (document: TDDocument) => void): (() => void) => {
    return this.on('deckChanged', ({ document }) => listener(document))
  }

  private emit = <E extends DeckEventName>(event: E, payload: DeckEventMap[E]): void => {
    const set = this.listeners.get(event)
    if (!set || set.size === 0) return
    // Copy before iterating: a listener that unsubscribes (itself or another listener) mid-emit
    // must not mutate the Set this loop is walking.
    ;[...set].forEach((listener) => (listener as DeckEventListener<E>)(payload))
  }

  /* -------------------------------------------------- */
  /*     Internal — called by TldrawApp, not public     */
  /* -------------------------------------------------- */

  /**
   * @internal Called by `TldrawApp.onPersist`, once per committed command. Diffs `document.pages`
   * against the last-known order to derive `slideAdded`/`slideRemoved`/`slideReordered`, then
   * always fires `deckChanged`. Not part of the `app.deck` public surface.
   */
  _onCommitted = (): void => {
    const nextOrder = this.sortedPageIds()
    const prevOrder = this.knownOrder
    const orderChanged =
      nextOrder.length !== prevOrder.length || nextOrder.some((id, i) => id !== prevOrder[i])

    if (orderChanged) {
      const prevSet = new Set(prevOrder)
      const nextSet = new Set(nextOrder)
      const added = nextOrder.filter((id) => !prevSet.has(id))
      const removed = prevOrder.filter((id) => !nextSet.has(id))
      this.knownOrder = nextOrder
      added.forEach((id) => this.emit('slideAdded', { slideId: id, index: nextOrder.indexOf(id) }))
      removed.forEach((id) => this.emit('slideRemoved', { slideId: id }))
      if (added.length === 0 && removed.length === 0) {
        this.emit('slideReordered', { order: nextOrder })
      }
    }

    this.emit('deckChanged', { document: this.app.document })
  }

  /**
   * @internal Called by `TldrawApp.onStateDidChange`, on every state change (including the
   * transient ones a plain click produces, which never reach `onPersist`) — this is the only
   * lifecycle hook that fires for a selection change. Not part of the `app.deck` public surface.
   */
  _onSelectionMaybeChanged = (): void => {
    const slideId = this.app.currentPageId
    const shapeIds = this.app.pageState.selectedIds
    const prev = this.prevSelection
    if (prev.slideId === slideId && sameIds(prev.shapeIds, shapeIds)) return
    this.prevSelection = { slideId, shapeIds: [...shapeIds] }
    this.emit('selectionChanged', { slideId, shapeIds: [...shapeIds] })
  }

  /**
   * @internal Called by `TldrawApp.loadDocument` (which `loadDeck` above just forwards to, but
   * also the initial IndexedDB-restore call `onReady` makes before `loadDeck` is ever reachable —
   * this has to live here, not in `loadDeck`, to cover that call too). Resyncs the page-order and
   * selection baselines to the freshly-loaded document instead of diffing against the old one —
   * a whole-deck swap should read as one `deckChanged`, not a replay of every page in the new
   * document as `slideAdded`. Not part of the `app.deck` public surface.
   */
  _resync = (): void => {
    this.knownOrder = this.sortedPageIds()
    this.prevSelection = {
      slideId: this.app.currentPageId,
      shapeIds: [...this.app.pageState.selectedIds],
    }
    this.emit('deckChanged', { document: this.app.document })
  }

  /* -------------------------------------------------- */
  /*                      Private                       */
  /* -------------------------------------------------- */

  private sortedPages = (): TDPage[] => {
    return Object.values(this.app.document.pages).sort(
      (a, b) => (a.childIndex || 0) - (b.childIndex || 0)
    )
  }

  private sortedPageIds = (): string[] => this.sortedPages().map((page) => page.id)

  private toDeckSlide = (page: TDPage, index: number): DeckSlide => {
    const size = page.size ?? this.app.document.defaultPageSize ?? DEFAULT_SLIDE_SIZE
    const background =
      typeof page.background === 'string'
        ? ({ type: 'solid', color: page.background } as const)
        : page.background
    return {
      id: page.id,
      // `TLPage.name` is optional at the type level (core is shared with non-slide uses of the
      // canvas); every page this fork actually creates gets one (`createPage`'s `Slide N`,
      // `addSlideFromTemplate`'s template name, ...), so this fallback should be unreachable in
      // practice — it exists only so `DeckSlide.name` can be a plain, always-present `string`.
      name: page.name ?? 'Untitled slide',
      index,
      size: [size[0], size[1]],
      background,
      notes: page.notes,
      skipInPresentation: page.skipInPresentation,
    }
  }

  private assertNoCollision = (id: string | undefined): void => {
    if (id !== undefined && this.app.document.pages[id]) {
      throw new Error(`app.deck: a slide with id "${id}" already exists.`)
    }
  }
}

function sameIds(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  return a.every((id, i) => id === b[i])
}
