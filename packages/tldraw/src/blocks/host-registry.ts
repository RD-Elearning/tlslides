/**
 * Host registry — the contract between a `k: 'host'` layout node and the imperative DOM
 * renderer that mounts real content into it. A block's `layout()` returns `{ k: 'host',
 * render: 'some-id' }`, and the DOM renderer looks up `'some-id'` here to find the
 * `HostRenderer` that knows how to fill that box.
 *
 * The registry is intentionally separate from `BlockRegistry` — block definitions are
 * pure layout functions; host renderers are imperative DOM code. A host injects both,
 * and the two registries serve different layers.
 */

import type { Box, ResolvedTokens, SurfaceContext, BlockMotionRuntime } from './types'

/**
 * Resolved block motion (from R5); undefined until that phase lands.
 * Imported as a type-only reference so no runtime dependency is introduced.
 */
export interface ResolvedBlockMotion {
  /* opaque — the exact shape is R5's concern */
  [key: string]: unknown
}

/**
 * Context passed to a `HostRenderer.mount()` / `update()` call. Everything the
 * renderer needs to render its content at the correct size and theme.
 *
 * **Coordinates inside the host are slide units.** Both the editor (through the
 * camera) and the viewer (through one `scale()` on the slide root) scale the
 * whole canvas, so a host div of `box.width × box.height` CSS px is correct.
 * Templates must use `px` sizes equal to slide units — never `vw`, `rem` or
 * percentages of the viewport.
 */
export interface HostRenderContext {
  /** Block-local box, in slide units. Origin is the host's own top-left. */
  box: Box
  /** Resolved design tokens — a *copy*, not a shared reference (DoD item 5). */
  tokens: ResolvedTokens
  /** Surface behind this block, for contrast solving. */
  surface: SurfaceContext
  /** The block's own props. */
  props: Record<string, unknown>
  /** Resolved motion (from R5); `undefined` until that phase lands. */
  motion?: ResolvedBlockMotion
  /** Block motion runtime (R3). When present and the block defines `animate()`, it runs
   *  instead of the whole-block preset. Created by DeckViewer per build step. */
  blockMotion?: BlockMotionRuntime
  /** True when rendering for export/thumbnail rather than the live editor. */
  headless: boolean
}

/**
 * A host renderer: imperative DOM code that fills a host box with real content.
 *
 * - **Never set `transform` on the host root.** `.tl-positioned-div` owns it.
 *   Inside the host root, descendants are free (that is what makes GSAP usable).
 * - **Coordinates inside the host are slide units.** Both the editor (through the
 *   camera) and the viewer (through one `scale()` on the slide root) scale the
 *   whole canvas, so a host div of `box.width × box.height` CSS px is correct.
 *   Templates must use `px` sizes equal to slide units — never `vw`, `rem` or
 *   percentages of the viewport.
 */
export interface HostRenderer {
  /**
   * Mount the host content into `root`. Must call `root.replaceChildren()` first
   * (React StrictMode mounts twice in development). Returns an optional disposer
   * that is called on removal — it must be idempotent. If `update` is not
   * provided, this disposer should also handle prop changes (re-mount).
   *
   * @returns An optional cleanup function. If provided, it is called on unmount.
   *          Must be idempotent (safe to call more than once).
   */
  mount(root: HTMLElement, ctx: HostRenderContext): void | (() => void)

  /**
   * Called when props change (structural diff or box size change). Not called on
   * `box.x/y` changes (those are handled by CSS positioning).
   */
  update?(root: HTMLElement, ctx: HostRenderContext): void

  /**
   * Called when the host node is removed from the tree. If a disposer was
   * returned from `mount`, that is called first, then this is called.
   */
  unmount?(root: HTMLElement): void
}

/**
 * A registry of `HostRenderer` instances, keyed by the `render` id that a
 * `k: 'host'` node carries.
 */
export class HostRegistry {
  private renderers = new Map<string, HostRenderer>()

  /** Register a host renderer under the given id. Overwrites any previous registration. */
  register(id: string, renderer: HostRenderer): void {
    this.renderers.set(id, renderer)
  }

  /** Look up a host renderer by id. Returns `undefined` if not found. */
  get(id: string): HostRenderer | undefined {
    return this.renderers.get(id)
  }

  /** Check whether a host renderer is registered under the given id. */
  has(id: string): boolean {
    return this.renderers.has(id)
  }
}
