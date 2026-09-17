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
import { useTldrawComponents, useBlockRegistry } from '~hooks'
import { renderNodeToDom } from '~blocks/render-dom'
import { createLayoutContext } from '~blocks/layout'
import type { ResolvedTokens, SurfaceContext } from '~blocks/types'
import { MissingBlockPlaceholder } from './MissingBlockPlaceholder'
import { BlockErrorBoundary } from './BlockErrorBoundary'

/**
 * Minimal default tokens for the block renderer. Used when a BlockDefinition's layout()
 * needs a LayoutContext but no host-supplied tokens are available. These cover the fields
 * createLayoutContext requires; the values are safe defaults that let probe/test blocks
 * render correctly without a full design-token pipeline.
 */
const DEFAULT_TOKENS: ResolvedTokens = {
  color: {
    surface: '#ffffff',
    surfaceAlt: '#f3f4f6',
    accent: '#3b82f6',
    accent2: '#8b5cf6',
    text: '#1a1a1a',
    textMuted: '#6b7280',
    positive: '#22c55e',
    negative: '#ef4444',
    warning: '#f59e0b',
    neutral: '#71717a',
    line: '#d1d5db',
    scrim: '#00000066',
  },
  categorical: ['#3b82f6', '#8b5cf6', '#ef4444', '#22c55e', '#f59e0b', '#06b6d4'],
  space: { '3xs': 2, '2xs': 4, xs: 6, sm: 8, md: 12, lg: 16, xl: 24, '2xl': 32, '3xl': 48, '4xl': 64 },
  radius: { none: 0, sm: 4, md: 8, lg: 12, xl: 16, pill: 9999 },
  type: {
    display: { size: 48, lineHeight: 1.1 },
    title: { size: 36, lineHeight: 1.2 },
    heading: { size: 28, lineHeight: 1.3 },
    subheading: { size: 22, lineHeight: 1.35 },
    lead: { size: 18, lineHeight: 1.4 },
    body: { size: 16, lineHeight: 1.5 },
    caption: { size: 13, lineHeight: 1.4 },
    footnote: { size: 11, lineHeight: 1.35 },
  },
  elevation: {
    0: { level: 0, dx: 0, dy: 0, blur: 0, color: 'transparent', shadow: 'none' },
    1: { level: 1, dx: 0, dy: 1, blur: 3, color: '#0000001a', shadow: '0 1px 3px #0000001a' },
    2: { level: 2, dx: 0, dy: 2, blur: 8, color: '#00000026', shadow: '0 2px 8px #00000026' },
  },
  motion: {
    duration: { fast: 150, normal: 300, slow: 500 },
    ease: { linear: 'linear', 'ease-in': 'ease-in', 'ease-out': 'ease-out', 'ease-in-out': 'ease-in-out' },
  },
  density: 'default',
}

const DEFAULT_SURFACE: SurfaceContext = {
  behind: { type: 'solid', color: '#ffffff' },
  luminance: 1,
  overImage: false,
}

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
        const ctx = createLayoutContext({
          box: { width: size[0], height: size[1] },
          tokens: DEFAULT_TOKENS,
          surface: DEFAULT_SURFACE,
          headless: false,
        })
        blockNode = renderNodeToDom(blockDef.layout(layoutProps as Record<string, unknown>, ctx))
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
              {blockNode ??
                (Registered ? (
                  <Registered {...props} />
                ) : (
                  <MissingBlockPlaceholder componentId={componentId} />
                ))}
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
