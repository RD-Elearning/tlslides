import * as React from 'react'
import { Utils, SVGContainer, TLBounds } from '@tlslides/core'
import Vec from '@tlslides/vec'
import { intersectBoundsPolygon, intersectLineSegmentPolyline } from '@tlslides/intersect'
import { PolygonShape, TDShapeType, TDMeta } from '~types'
import { TDShapeUtil } from '../TDShapeUtil'
import {
  defaultStyle,
  getBoundsRectangle,
  transformRectangle,
  transformSingleRectangle,
  getFontStyle,
  getLetterSpacingCss,
  getLineHeight,
  getShapeOpacity,
  getShapeStyle,
  PolygonBody,
  TextLabel,
} from '~state/shapes/shared'
import { LABEL_POINT } from '~constants'
import { getPolygonPoints } from './polygonHelpers'
import { styled } from '~styles'

type T = PolygonShape
type E = HTMLDivElement

const DEFAULT_SIDES = 6

// Phase 8c — a regular N-sided polygon. See the Phase 8c report for the full scoping rationale;
// summarized at each cut below:
//  - **`canBind = false`.** Arrows cannot bind to this shape. Precise binding (the anchor/distance
//    math `RectangleUtil`/`TriangleUtil`/`EllipseUtil` each hand-roll against their own exact
//    outline) is a separate, per-shape-geometry feature roughly the size of everything else in
//    this file combined; the base `TDShapeUtil`'s default binding behaviour is bounds-only, which
//    would silently bind to empty corner space outside a hexagon's actual outline — judged worse
//    than not offering binding at all, so it's off rather than approximate.
//  - **No corner radius.** Meaningful for a rectangle's four right-angle corners; a regular
//    polygon's vertices already aren't right angles, and rounding an arbitrary-angle vertex is a
//    materially different (and, per-vertex, more expensive) computation than
//    `clampCornerRadius`'s rectangle-arc insertion — not attempted here.
//  - **No per-instance "change side count" UI** — `sides` is set at creation time only (see the
//    `PolygonShape` interface comment).
//  - **Hit-testing matches `TriangleUtil`'s own level of precision, not more**: `hitTestPoint`
//    uses the inherited bounds-only test (a click anywhere in the bounding box selects the shape),
//    exactly like Triangle does today; `hitTestLineSegment`/`hitTestBounds` (marquee selection)
//    test against the real polygon outline via `intersectLineSegmentPolyline`/
//    `intersectBoundsPolygon` — the same two functions, and the same split, `TriangleUtil` uses.
export class PolygonUtil extends TDShapeUtil<T, E> {
  type = TDShapeType.Polygon as const

  canBind = false

  canClone = true

  canEdit = true

  getShape = (props: Partial<T>): T => {
    return Utils.deepMerge<T>(
      {
        id: 'id',
        type: TDShapeType.Polygon,
        name: 'Polygon',
        parentId: 'page',
        childIndex: 1,
        point: [0, 0],
        size: [1, 1],
        sides: DEFAULT_SIDES,
        rotation: 0,
        style: defaultStyle,
        label: '',
        labelPoint: [0.5, 0.5],
      },
      props
    )
  }

  Component = TDShapeUtil.Component<T, E, TDMeta>(
    (
      { shape, bounds, isEditing, isSelected, isGhost, meta, events, onShapeChange, onShapeBlur },
      ref
    ) => {
      const { id, label = '', size, sides, style, labelPoint = LABEL_POINT } = shape
      const font = getFontStyle(style, meta.deckTheme)
      const styles = getShapeStyle(style, meta.isDarkMode, id, meta.deckTheme)
      const opacity = getShapeOpacity(style, isGhost)
      const vertices = React.useMemo(() => getPolygonPoints(size, sides), [size, sides])
      const handleLabelChange = React.useCallback(
        (label: string) => onShapeChange?.({ id, label }),
        [onShapeChange]
      )
      return (
        <FullWrapper ref={ref} {...events}>
          <TextLabel
            font={font}
            text={label}
            color={styles.stroke}
            offsetX={(labelPoint[0] - 0.5) * bounds.width}
            offsetY={(labelPoint[1] - 0.5) * bounds.height}
            isEditing={isEditing}
            onChange={handleLabelChange}
            onBlur={onShapeBlur}
            opacity={opacity}
            letterSpacing={getLetterSpacingCss(style)}
            lineHeight={getLineHeight(style)}
            verticalAlign={style.verticalAlign}
            boxSize={[bounds.width, bounds.height]}
            autoFit={style.autoFit}
          />
          {/* Opacity on this inner <g>, not <SVGContainer> — see RectangleUtil's comment for why. */}
          <SVGContainer id={shape.id + '_svg'}>
            <g opacity={opacity}>
              <PolygonBody
                id={id}
                style={style}
                vertices={vertices}
                isSelected={isSelected}
                isDarkMode={meta.isDarkMode}
                deckTheme={meta.deckTheme}
              />
            </g>
          </SVGContainer>
        </FullWrapper>
      )
    }
  )

  Indicator = TDShapeUtil.Indicator<T>(({ shape }) => {
    return (
      <polygon
        points={getPolygonPoints(shape.size, shape.sides)
          .map((p) => p.join(','))
          .join(' ')}
      />
    )
  })

  shouldRender = (prev: T, next: T) => {
    return (
      next.size !== prev.size ||
      next.sides !== prev.sides ||
      next.style !== prev.style ||
      next.label !== prev.label
    )
  }

  getBounds = (shape: T) => {
    return getBoundsRectangle(shape, this.boundsCache)
  }

  private getPoints(shape: T) {
    return getPolygonPoints(shape.size, shape.sides).map((pt) => Vec.add(pt, shape.point))
  }

  hitTestLineSegment = (shape: T, A: number[], B: number[]): boolean => {
    return intersectLineSegmentPolyline(A, B, this.getPoints(shape)).didIntersect
  }

  hitTestBounds = (shape: T, bounds: TLBounds): boolean => {
    return (
      Utils.boundsContained(this.getBounds(shape), bounds) ||
      intersectBoundsPolygon(bounds, this.getPoints(shape)).length > 0
    )
  }

  transform = transformRectangle

  transformSingle = transformSingleRectangle
}

const FullWrapper = styled('div', { width: '100%', height: '100%' })
