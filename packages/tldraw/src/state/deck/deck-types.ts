import type { SlideBackground, TDDocument, TDInsertableContent } from '~types'

/**
 * A slide, as the `app.deck` facade (Phase 14) exposes it — a narrow, canvas-agnostic projection
 * of a `TDPage`. Deliberately excludes `shapes`/`bindings`/`childIndex`: per-shape editing (move
 * this shape, restyle that one) is not this facade's job, and `childIndex` is an internal
 * ordering detail a host should never need — `index` below is the position a host actually wants
 * (0-based, recomputed fresh on every call, never persisted on the slide itself). Adding whole
 * blocks of content *is* in scope (`Deck.insertContent`/`Deck.addBlock`, below) — the line this
 * facade draws is "add/replace a slide's content as a unit," not "edit an existing shape's
 * fields." A host that genuinely needs to read shape data can still do so from
 * `getDeck().pages[id]` — the same `TDPage` the main editor works with — since `TDDocument` isn't
 * hidden by this facade either.
 */
export interface DeckSlide {
  id: string
  name: string
  /** 0-based position in the deck's current order. */
  index: number
  /** `[width, height]` of the slide frame. Always present — falls back to the deck's default
   *  slide size (or the hard-coded 1920x1080 default) exactly the way the renderer does, so a
   *  host never has to duplicate that fallback itself. */
  size: [number, number]
  background?: SlideBackground
  notes?: string
  skipInPresentation?: boolean
}

/** Options for `Deck.addSlide`. Every field is optional — `addSlide()` with no arguments behaves
 *  exactly like the toolbar's "add slide" button. */
export interface AddSlideOptions {
  /** A caller-supplied id for the new slide — see the "caller-supplied ids" note on `Deck` itself.
   *  Omit to get a generated id (the pre-Phase-14 behaviour). Throws if it collides with an
   *  existing slide. */
  id?: string
  name?: string
  size?: [number, number]
  background?: SlideBackground
}

/** Options for `Deck.duplicateSlide` / `Deck.addSlideFromTemplate` — just the id override, since
 *  everything else about the new slide is derived from the source slide / template. */
export interface NewSlideOptions {
  id?: string
}

/** Options for `Deck.getThumbnail`. See the method's own doc comment for the (real) limitations
 *  this is working around — there is no headless renderer yet (that's Phase 15). */
export interface ThumbnailOptions {
  /** `'dataUrl'` (default) returns a `data:image/svg+xml;base64,...` string, ready to drop
   *  straight into an `<img src>`. `'svg'` returns the raw `<svg>...</svg>` markup instead, for a
   *  host that wants to inline it (e.g. to let it inherit CSS, or to post-process it). Either way
   *  the result is vector, not a fixed-resolution raster — there is no pixel width/height option
   *  here, since sizing a `<img>`/wrapper element is entirely the host's call. */
  format?: 'dataUrl' | 'svg'
}

/** Options for `Deck.present`. */
export interface PresentOptions {
  /** Jump to this slide before entering (or while remaining in) presentation mode. Omit to
   *  present starting from whichever slide is already current. */
  slideId?: string
  /** Pass `true` to leave presentation mode instead of entering it. */
  exit?: boolean
}

/** Payloads for the `app.deck` event stream — see `Deck.on`/`Deck.onDeckChange`. */
export interface DeckEventMap {
  /** A new slide was added, at `index` in the deck's (post-add) order. Fired once per added
   *  slide — `addSlide`/`duplicateSlide`/`addSlideFromTemplate` each add exactly one. */
  slideAdded: { slideId: string; index: number }
  /** A slide was removed. */
  slideRemoved: { slideId: string }
  /** The deck's slide order changed without any slide being added or removed (`moveSlide`, or a
   *  host dragging a slide in its own UI via the same command). `order` is the full, post-move
   *  list of slide ids, front to back. */
  slideReordered: { order: string[] }
  /** The active slide, or its shape selection, changed. `shapeIds` is empty when nothing is
   *  selected — this also fires on every plain "switch slide" (`goToSlide`, clicking a thumbnail,
   *  presenting), not just on a shape click, since the active slide is part of what it reports. */
  selectionChanged: { slideId: string; shapeIds: string[] }
  /** Fired after every committed (undoable) change to the document — the typed, subscribable
   *  replacement for polling `<Tldraw onPersist>`. Also fired once, alone, after `loadDeck`. */
  deckChanged: { document: TDDocument }
}

export type DeckEventName = keyof DeckEventMap
export type DeckEventListener<E extends DeckEventName> = (payload: DeckEventMap[E]) => void

/**
 * Options for `Deck.insertContent` — the general escape hatch for a host with its own shape JSON
 * (a server-generated slide, a paste, a future AI pipeline). Mirrors `TDInsertContentOpts` minus
 * `pageId` (the target slide is `insertContent`'s own first argument instead) and minus any
 * option to choose the inserted shapes' ids — see `Deck.insertContent`'s own doc comment for why
 * that one is not offered here, unlike every other facade method that creates something.
 */
export interface DeckInsertContentOptions {
  /** Where to place the center of the content's bounding box, in the *target slide's* page
   *  space. Ignored when `center` is `false`. Defaults to that slide's own stored camera center —
   *  see the caveat on `Deck.insertContent`. */
  point?: [number, number]
  /** Whether to select the inserted shapes afterward, in the *target slide's* own selection —
   *  which only has a visible effect once/if the user is looking at that slide. Defaults to
   *  `true`. */
  select?: boolean
  /** Whether to reposition the content at all. `false` keeps each shape's own authored `point` —
   *  what `addBlock` uses, and what any caller supplying explicit coordinates should use too.
   *  Defaults to `true`. */
  center?: boolean
}

/** The subset of `TDInsertableContent` `Deck.insertContent` accepts — re-exported here so a host
 *  can build one without reaching past this facade for the type. Identical to the underlying
 *  `TDInsertableContent` (plain, serializable shape/binding/asset data — the same tier of shared
 *  type as `TDDocument`), given a facade-local name for discoverability. */
export type DeckContent = TDInsertableContent

/** Options for `Deck.addBlock`. */
export interface AddBlockOptions {
  /** Top-left position on the slide, in the slide's own coordinate space. Defaults to `[0, 0]`. */
  point?: [number, number]
  /** `[width, height]`. Defaults to `[320, 200]` — the same default `ComponentUtil.getShape`
   *  itself falls back to for a Component shape created with no explicit size. */
  size?: [number, number]
}
