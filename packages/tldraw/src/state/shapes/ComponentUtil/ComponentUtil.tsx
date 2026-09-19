import * as React from 'react'
import { Utils, HTMLContainer } from '@tlslides/core'
import { ComponentShape, TDMeta, TDShapeType } from '~types'
import { GHOSTED_OPACITY } from '~constants'
import { TDShapeUtil } from '../TDShapeUtil'
import {
  clampCornerRadius,
  defaultStyle,
  getBoundsRectangle,
  getShapeOpacity,
  transformRectangle,
  transformSingleRectangle,
} from '~state/shapes/shared'
import { styled } from '@stitches/react'
import { useTldrawComponents, useBlockRegistry, useBlockLayoutContext } from '~hooks'
import { renderNodeToDom, HostLayoutContext } from '~blocks/render-dom'
import { MissingBlockPlaceholder } from './MissingBlockPlaceholder'
import { BlockErrorBoundary } from './BlockErrorBoundary'
import { InlineEditor } from '~components/InlineEditor'

type T = ComponentShape
type E = HTMLDivElement

export class ComponentUtil extends TDShapeUtil<T, E> {
  type = TDShapeType.Component as const

  canBind = true

  canClone = true

  showCloneHandles = true

  // A host component may hold internal React state (data it fetched, a hover/expand state, a
  // running animation) or side effects (an interval, a subscription) that the host does not
  // expect to be torn down just because the editor scrolled it out of view. `useShapeTree` culls
  // off-screen shapes unless `isStateful` is set (the same reasoning `VideoUtil` uses to keep a
  // paused video from resetting). The cost is that every ComponentShape on a page stays mounted
  // regardless of viewport, which is acceptable for a deck-sized document (tens of blocks, not
  // thousands) and is the safer default for a shape whose contents this package does not control.
  isStateful = true

  getShape = (props: Partial<T>): T => {
    return Utils.deepMerge<T>(
      {
        id: 'component',
        type: TDShapeType.Component,
        name: 'Component',
        parentId: 'page',
        childIndex: 1,
        point: [0, 0],
        size: [320, 200],
        rotation: 0,
        style: defaultStyle,
        componentId: '',
        props: {},
      },
      props
    )
  }

  Component = TDShapeUtil.Component<T, E, TDMeta>(
    ({ shape, isGhost, isBinding, meta, events }, ref) => {
      const registry = useTldrawComponents()
      const blockRegistry = useBlockRegistry()
      const { size, style, componentId, props } = shape

      const rWrapper = React.useRef<HTMLDivElement>(null)

      React.useLayoutEffect(() => {
        const wrapper = rWrapper.current
        if (!wrapper) return
        const [width, height] = size
        wrapper.style.width = `${width}px`
        wrapper.style.height = `${height}px`
        // Corner radius is applied imperatively here (like width/height above) rather than
        // through stitches, since it depends on the shape's live size, not just its style.
        // `clampCornerRadius` degrades a too-large request to a stadium/circle instead of
        // producing an invalid negative CSS value.
        wrapper.style.borderRadius =
          style.cornerRadius === undefined
            ? '3px' // Wrapper's default, kept as the pre-8a fallback.
            : `${clampCornerRadius(style.cornerRadius, size)}px`
      }, [size, style.cornerRadius])

      const Registered = registry[componentId]

      // The deck's real tokens (theme + any per-doc override) and the real surface behind this
      // shape (the current page's background, sampled at this shape's own position) — not a
      // hardcoded second scale system. Called unconditionally (hooks can't run inside the `if`
      // below) — cheap when there is no `blockDef` since nothing downstream reads it, and both
      // `useDeckTokens`/`useBlockSurface` are memoised so an unrelated store tick doesn't produce
      // a new object here. See `hooks/useDeckTokens.ts` for why this doesn't call
      // `blocks/deck-context.ts`'s `deckLayoutContext` (it can't carry this shape's position).
      const blockMeta = (props as Record<string, unknown>).$block as
        | Record<string, unknown>
        | undefined
      const blockStyle = blockMeta?.style as import('~blocks/types').BlockStyleSpec | undefined
      const layoutCtx = useBlockLayoutContext(
        { x: shape.point[0], y: shape.point[1], width: size[0], height: size[1] },
        { headless: false, style: blockStyle },
      )

      // When a BlockDefinition exists in the BlockRegistry for this componentId, render
      // through the layout engine + DOM renderer instead of the createBlockComponents
      // placeholder. The layout props come from $block.props if present, otherwise the
      // full shape.props (which is what blockToShape puts at the top level).
      const blockDef = blockRegistry?.get(componentId)
      let blockNode: React.ReactNode = null
      if (blockDef) {
        const layoutProps = (props as Record<string, unknown>).$block
          ? ((props as Record<string, unknown>).$block as Record<string, unknown>).props ??
            props
          : props
        blockNode = renderNodeToDom(
          blockDef.layout(layoutProps as Record<string, unknown>, layoutCtx),
        )
      }

      return (
        <HTMLContainer ref={ref} {...events}>
          {isBinding && (
            <div
              className="tl-binding-indicator"
              style={{
                position: 'absolute',
                top: -this.bindingDistance,
                left: -this.bindingDistance,
                width: `calc(100% + ${this.bindingDistance * 2}px)`,
                height: `calc(100% + ${this.bindingDistance * 2}px)`,
                backgroundColor: 'var(--tl-selectFill)',
              }}
            />
          )}
          {/*
            Interactive by default: this Wrapper opts back into pointer events (`.tl-positioned`
            sets `pointer-events: none` above it) and carries the shape's `events`, exactly like
            ImageUtil/VideoUtil. That makes the block click-to-select and drag-to-move in select
            mode out of the box — a block you cannot click is a worse default than one that eats
            a click meant for its own content. Host components that render their own interactive
            controls (buttons, dropdowns, inputs) should call `e.stopPropagation()` in their own
            pointer/mouse-down handlers to stop that gesture from also starting a shape drag —
            the same pattern StickyUtil/TextUtil use for their text areas (`stopPropagation` is
            exported from `~components/stopPropagation`).

            Note also: `.tl-positioned-div` sets `overflow: hidden` and `contain: layout style
            size`, so anything a host component renders outside its own box — a portal-free
            dropdown, a tooltip, a popover — will be clipped. There is no general fix for this
            from inside a single shape; host authors should portal overlays to `document.body` or
            avoid them inside a block.
          */}
          {/* Opacity is set inline rather than through the `isGhost` variant below: that variant
              only knows two states (ghosted / not), while `style.opacity` is an arbitrary user
              value. Inline style wins over the class regardless, so the variant is kept only for
              its `transition` declaration. */}
          <Wrapper
            ref={rWrapper}
            isGhost={isGhost}
            isDarkMode={meta.isDarkMode}
            style={{ opacity: getShapeOpacity(style, isGhost) }}
          >
            <BlockErrorBoundary componentId={componentId}>
              {blockNode ? (
                <HostLayoutContext.Provider value={{
                  tokens: layoutCtx.tokens,
                  surface: layoutCtx.surface,
                  props: (props ?? {}) as Record<string, unknown>,
                  headless: false,
                }}>
                  {blockNode}
                </HostLayoutContext.Provider>
              ) : Registered ? (
                <Registered {...props} />
              ) : (
                <MissingBlockPlaceholder componentId={componentId} />
              )}
            </BlockErrorBoundary>
          </Wrapper>
        </HTMLContainer>
      )
    }
  )

  Indicator = TDShapeUtil.Indicator<T>(({ shape }) => {
    const {
      size: [width, height],
    } = shape

    return (
      <rect x={0} y={0} rx={2} ry={2} width={Math.max(1, width)} height={Math.max(1, height)} />
    )
  })

  getBounds = (shape: T) => {
    return getBoundsRectangle(shape, this.boundsCache)
  }

  shouldRender = (prev: T, next: T) => {
    return (
      next.size !== prev.size ||
      next.componentId !== prev.componentId ||
      next.props !== prev.props ||
      next.style !== prev.style
    )
  }

  transform = transformRectangle

  transformSingle = transformSingleRectangle

  // `TDShapeUtil.getSvgElement` clones a `#{id}_svg` node, which never exists for an
  // HTML-rendered shape (ComponentShape has no SVG twin the way DrawShape/RectangleShape do).
  // Without this override the default implementation returns `undefined` and the block is
  // silently dropped from SVG export. This emits an honest placeholder instead — a dashed rect
  // labelled with the block's componentId — so an SVG export at least records that a block was
  // there and which one, rather than leaving an unexplained hole. It does NOT attempt to render
  // the host's actual React content: there is no general way to serialize arbitrary React/DOM to
  // static SVG markup from here. PNG/PDF export is unaffected by this — it goes through headless
  // Chrome, which screenshots the real rendered DOM.
  getSvgElement = (shape: T): SVGElement => {
    const bounds = this.getBounds(shape)
    const svgNS = 'http://www.w3.org/2000/svg'

    const g = document.createElementNS(svgNS, 'g')

    const rect = document.createElementNS(svgNS, 'rect')
    rect.setAttribute('width', `${Math.max(1, bounds.width)}`)
    rect.setAttribute('height', `${Math.max(1, bounds.height)}`)
    rect.setAttribute('rx', '4')
    rect.setAttribute('ry', '4')
    rect.setAttribute('fill', 'none')
    rect.setAttribute('stroke', '#a1a1aa')
    rect.setAttribute('stroke-width', '2')
    rect.setAttribute('stroke-dasharray', '8 6')
    g.appendChild(rect)

    const text = document.createElementNS(svgNS, 'text')
    text.textContent = `Component: ${shape.componentId || '(none)'}`
    text.setAttribute('x', '12')
    text.setAttribute('y', '24')
    text.setAttribute('font-family', 'sans-serif')
    text.setAttribute('font-size', '14')
    text.setAttribute('fill', '#71717a')
    g.appendChild(text)

    return g
  }
}

const Wrapper = styled('div', {
  pointerEvents: 'all',
  position: 'relative',
  height: '100%',
  width: '100%',
  borderRadius: '3px',
  overflow: 'hidden',
  variants: {
    isGhost: {
      false: { opacity: 1 },
      true: { transition: 'opacity .2s', opacity: GHOSTED_OPACITY },
    },
    isDarkMode: {
      true: {},
      false: {},
    },
  },
})
