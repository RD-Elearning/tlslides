import * as React from 'react'
import { Tldraw } from '../../Tldraw'
import type { TDDocument } from '~types'
import type { TldrawApp } from '~state'

export interface DeckViewerProps {
  /** The deck to display. */
  document: TDDocument
  /** Which slide to show. Omit to show whichever slide `document`'s own `pageStates` last left
   *  current (the same default `<Tldraw currentPageId>` has). */
  slideId?: string
  /** Render the editor's dark UI chrome/shape palette. Off by default, matching a fresh deck. */
  darkMode?: boolean
  /**
   * (optional) Called once the viewer's own `TldrawApp` is ready. Exists for a host that wants to
   * drive `app.deck.present()`/`app.deck.goToSlide()` from this same instance (e.g. a "preview"
   * pane with its own play/next controls) rather than mount a second, separate viewer for that —
   * this is a real `TldrawApp`, so anything `app.deck` can do is available here too.
   */
  onMount?: (app: TldrawApp) => void
  className?: string
  style?: React.CSSProperties
}

/**
 * A read-only, chrome-free display of a deck — the entry point Phase 14 adds for host pages that
 * only need to *show* a deck (a share/preview link, a dashboard embed, a "view" route distinct
 * from the "edit" route) rather than run the full editor.
 *
 * **Why this wraps `<Tldraw readOnly showUI={false}>` and not `ReadOnlyEditor`** (the existing
 * `packages/tldraw/src/components/ReadOnlyEditor` component, which already renders a read-only
 * slide): `ReadOnlyEditor` is purpose-built as the *thumbnail strip* inside the Deck panel — it
 * calls `useTldrawApp()`, meaning it requires an already-mounted `TldrawApp`/store context to sit
 * inside (specifically, the main editor's own), and its `onPointerUp` handler exists to switch
 * *that* editor's current page when a thumbnail is clicked. A host page with no editor at all has
 * no such context to provide, and would have to hand-build the Provider/store plumbing `<Tldraw>`
 * already encapsulates just to satisfy `ReadOnlyEditor`'s dependency — strictly more work, for a
 * component that isn't shaped like a full-size single-slide view anyway. `<Tldraw>` mounts its
 * own self-contained `TldrawApp`, so wrapping it costs nothing extra and reuses the exact same
 * `Frame`/background/theme rendering path (the one Phases 11-13 verified against screenshots) —
 * this component only fixes a handful of its props (`readOnly`, `showUI`, every `show*` toggle)
 * and narrows the prop surface down to what a viewer actually needs.
 *
 * A mounted `<Tldraw readOnly>` still allows panning, zooming, and selecting shapes — it only
 * blocks document mutation (see `TldrawApp.readOnly`'s cleanup step) — which reads as a
 * reasonable "view" experience (the same trade every mainstream slide viewer makes) rather than a
 * static image. A host that wants a literal, non-interactive image should use
 * `app.deck.getThumbnail` instead (see its own doc comment for what that can and cannot do today).
 *
 * `darkMode` here just passes straight through to `<Tldraw darkMode>` — that prop used to be a
 * silent no-op (declared, never read), found while first building this component; it's now wired
 * up in `Tldraw.tsx` itself (`app.setSetting('isDarkMode', ...)`), so this component no longer
 * needs its own workaround for it.
 */
export function DeckViewer({
  document,
  slideId,
  darkMode = false,
  onMount,
  className,
  style,
}: DeckViewerProps) {
  return (
    <div
      className={className}
      style={{ position: 'relative', width: '100%', height: '100%', minHeight: 0, ...style }}
    >
      <Tldraw
        document={document}
        currentPageId={slideId}
        readOnly
        darkMode={darkMode}
        autofocus={false}
        showUI={false}
        showMenu={false}
        showPages={false}
        showTools={false}
        showZoom={false}
        showStyles={false}
        showMultiplayerMenu={false}
        onMount={onMount}
      />
    </div>
  )
}
