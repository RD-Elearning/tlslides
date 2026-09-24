/**
 * B7 — `BlockPreview`: a live preview thumbnail for a block in the gallery.
 *
 * Renders the block's `describe.example` props (falling back to `defaults`)
 * using the current deck's tokens and surface, so the thumbnail shows exactly
 * what the block will look like on this slide.
 *
 * - Tier A ('layout' kind): renders `def.layout(props, ctx)` via `renderNodeToDom`
 *   inside a scaled wrapper.
 * - Tier B ('html' kind): renders `def.poster(props, ctx)` via `renderNodeToDom`
 *   — never mounts the live HTML host template (H2).
 *
 * Lazy: only renders when scrolled into view via IntersectionObserver, and
 * memoised by `(def.type, themeId)` so switching the deck theme re-renders but
 * unrelated store ticks don't.
 *
 * Wrapped in `BlockErrorBoundary` so one broken block can't blank the gallery.
 */

import * as React from 'react'
import { useBlockLayoutContext } from '~hooks/useDeckTokens'
import { renderNodeToDom, HostLayoutContext } from '~blocks/render-dom'
import { layoutBlock } from '~blocks/layout/layout-child'
import { BlockErrorBoundary } from '~state/shapes/ComponentUtil/BlockErrorBoundary'
import type { BlockDefinition } from '~blocks/types'
import type { ResolvedTokens } from '~blocks/types'

export interface BlockPreviewProps {
  /** The block definition to preview. */
  def: BlockDefinition
  /** Width of the preview thumbnail (CSS px). Height is derived from the block's
   * preferred size ratio. */
  width: number
  /** Optional theme id for memo key (forces re-render on theme switch). */
  themeId?: string
}

/** The box a block "fills" at rest — origin (0,0), full preferred size. */
function makeBox(def: BlockDefinition) {
  const [w, h] = def.size.preferred
  return { x: 0, y: 0, width: w, height: h }
}

/**
 * Inner preview: builds the layout context, lays out the block, and renders the
 * LayoutNode tree as DOM. Wrapped in HostLayoutContext so any host children
 * (nested html-kind blocks) get the right CSS vars.
 */
function BlockPreviewInner({ def, width }: { def: BlockDefinition; width: number }) {
  const box = React.useMemo(() => makeBox(def), [def])

  // H1: one useBlockLayoutContext per card — fine for ~40 cards.
  // The box is at origin (0,0) with preferred width/height, so the surface
  // samples the page background at the block's own (origin) point.
  const ctx = useBlockLayoutContext(box, { headless: false })

  // Determine the node tree: Tier A uses def.layout; Tier B uses def.poster.
  // H2: never use def.layout() for kind: 'html' in the gallery — it returns a
  // host node and would mount the live template + animation hooks.
  const node = React.useMemo(() => {
    const props = (def.describe?.example?.props ?? def.defaults) as Record<string, unknown>
    if (def.kind === 'html') {
      // Tier B: use the poster (pure LayoutNode, no host rendering).
      // Every kind: 'html' block has a poster (validated by the conformance suite).
      return def.poster ? def.poster(props, ctx) : fallbackRectNode(box)
    }
    // Tier A: use the layout function.
    return layoutBlock(def, props, ctx)
  }, [def, ctx, box])

  const [origW, origH] = def.size.preferred
  const scale = width / origW

  return (
    <PreviewWrapper
      style={{
        width: `${width}px`,
        height: `${origH * scale}px`,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <HostLayoutContext.Provider
        value={{
          tokens: ctx.tokens,
          surface: ctx.surface,
          // Pass the block's own props for HostLayoutContext — host nodes read this.
          // For non-host layouts it's unused but harmless.
          props: (node as { props?: Record<string, unknown> }).props ?? (def.describe?.example?.props ?? def.defaults) as Record<string, unknown>,
          headless: false,
        }}
      >
        <PreviewInnerDiv>{renderNodeToDom(node)}</PreviewInnerDiv>
      </HostLayoutContext.Provider>
    </PreviewWrapper>
  )
}

/** Fallback node when a poster is missing (shouldn't happen for kind: 'html' blocks). */
function fallbackRectNode(box: { width: number; height: number }) {
  return {
    k: 'rect' as const,
    box: { x: 0, y: 0, width: box.width, height: box.height },
    fill: { type: 'solid' as const, color: '#ccc' },
  }
}

export const BlockPreview: React.FC<BlockPreviewProps> = React.memo(function BlockPreview({
  def,
  width,
  themeId,
}) {
  // H4: IntersectionObserver for lazy rendering — only render previews when
  // scrolled into view. For 40 cards this means ~8 rendered at a time.
  const [visible, setVisible] = React.useState(false)
  const ref = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return

    // If already intersecting (e.g. small gallery), render immediately.
    if (visible) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true)
            observer.disconnect()
            break
          }
        }
      },
      { rootMargin: '100px' }, // render a bit before they come on-screen
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [visible])

  return (
    <PreviewOuter ref={ref} data-block-type={def.type} data-theme={themeId ?? undefined}>
      {visible && (
        <BlockErrorBoundary componentId={def.type}>
          <BlockPreviewInner def={def} width={width} />
        </BlockErrorBoundary>
      )}
    </PreviewOuter>
  )
})

/* ── styled ────────────────────────────────────────────────────────────────── */

const PreviewOuter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function PreviewOuter(props, ref) {
    return (
      <div
        {...props}
        ref={ref}
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'var(--tl-color-surface, #f8f8f8)',
          border: '1px solid var(--tl-color-ui',
          borderRadius: '6px',
          overflow: 'hidden',
          ...props.style,
        }}
      />
    )
  },
)

const PreviewWrapper = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function PreviewWrapper(props, ref) {
    return <div {...props} ref={ref} />
  },
)

// A minimal inner div so absolute-positioned children from renderNodeToDom are
// scoped to the preview, not the entire page.
const PreviewInnerDiv = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function PreviewInnerDiv(props, ref) {
    return (
      <div
        {...props}
        ref={ref}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          ...props.style,
        }}
      />
    )
  },
)
