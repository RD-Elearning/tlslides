import * as React from 'react'
import { Utils, TLBounds, SVGContainer } from '@tlslides/core'
import { Vec } from '@tlslides/vec'
import { intersectLineSegmentBounds, intersectLineSegmentLineSegment } from '@tlslides/intersect'
import { defaultStyle, getShapeStyle, getShapeOpacity } from '../shared/shape-styles'
import { LineShape, TransformInfo, TDShapeType, DashStyle, TDMeta, ShapeStyles, DeckTheme } from '~types'
import { TDShapeUtil } from '../TDShapeUtil'
import { renderFreehandArrowShaft } from '../ArrowUtil/arrowHelpers'
import { styled } from '~styles'

type T = LineShape
type E = HTMLDivElement

// A line is a straight two-point primitive. It deliberately shares only geometry with ArrowUtil
// (the `start`/`end` handle shape and the hand-drawn shaft renderer) and drops everything that
// makes an arrow a *connector*:
//  - no binding: `handles` have no `canBind`, so lines never attach to other shapes and other
//    shapes never bind to a line (`canBind` stays false, the TDShapeUtil default).
//  - no bend/curve handle: a line is always straight, so there is no third "bend" handle.
//  - no label: lines are pure geometry, not annotated connectors, so there is no text editing
//    (`canEdit` stays false, the default).
export class LineUtil extends TDShapeUtil<T, E> {
  type = TDShapeType.Line as const

  hideBounds = true

  pathCache = new WeakMap<T, string>()

  getShape = (props: Partial<T>): T => {
    return {
      id: 'id',
      type: TDShapeType.Line,
      name: 'Line',
      parentId: 'page',
      childIndex: 1,
      point: [0, 0],
      rotation: 0,
      handles: {
        start: {
          id: 'start',
          index: 0,
          point: [0, 0],
          ...props.handles?.start,
        },
        end: {
          id: 'end',
          index: 1,
          point: [1, 1],
          ...props.handles?.end,
        },
      },
      style: {
        ...defaultStyle,
        isFilled: false,
        ...props.style,
      },
      ...props,
    }
  }

  Component = TDShapeUtil.Component<T, E, TDMeta>(({ shape, isGhost, meta, events }, ref) => {
    const {
      id,
      handles: { start, end },
      style,
    } = shape
    return (
      <FullWrapper ref={ref} {...events}>
        <SVGContainer id={shape.id + '_svg'}>
          <g pointerEvents="none" opacity={getShapeOpacity(style, isGhost)}>
            <LineShaft
              id={id}
              style={style}
              start={start.point}
              end={end.point}
              isDraw={style.dash === DashStyle.Draw}
              isDarkMode={meta.isDarkMode}
              deckTheme={meta.deckTheme}
            />
          </g>
        </SVGContainer>
      </FullWrapper>
    )
  })

  Indicator = TDShapeUtil.Indicator<T>(({ shape }) => {
    const {
      handles: { start, end },
    } = shape
    return <line x1={start.point[0]} y1={start.point[1]} x2={end.point[0]} y2={end.point[1]} />
  })

  getBounds = (shape: T) => {
    const bounds = Utils.getFromCache(this.boundsCache, shape, () => {
      const {
        handles: { start, end },
      } = shape
      return Utils.getBoundsFromPoints([start.point, end.point])
    })
    return Utils.translateBounds(bounds, shape.point)
  }

  getRotatedBounds = (shape: T) => {
    const {
      handles: { start, end },
    } = shape
    let points = [start.point, end.point]
    const { minX, minY, maxX, maxY } = Utils.getBoundsFromPoints(points)
    if (shape.rotation !== 0) {
      points = points.map((pt) =>
        Vec.rotWith(pt, [(minX + maxX) / 2, (minY + maxY) / 2], shape.rotation || 0)
      )
    }
    return Utils.translateBounds(Utils.getBoundsFromPoints(points), shape.point)
  }

  getCenter = (shape: T) => {
    const { start, end } = shape.handles
    return Vec.add(shape.point, Vec.med(start.point, end.point))
  }

  shouldRender = (prev: T, next: T) => {
    return next.handles !== prev.handles || next.style !== prev.style
  }

  hitTestPoint = (shape: T, point: number[]): boolean => {
    const {
      handles: { start, end },
    } = shape
    const pt = Vec.sub(point, shape.point)
    return Vec.distanceToLineSegment(start.point, end.point, pt) < 4
  }

  hitTestLineSegment = (shape: T, A: number[], B: number[]): boolean => {
    const {
      handles: { start, end },
    } = shape
    const ptA = Vec.sub(A, shape.point)
    const ptB = Vec.sub(B, shape.point)
    return intersectLineSegmentLineSegment(start.point, end.point, ptA, ptB).didIntersect
  }

  hitTestBounds = (shape: T, bounds: TLBounds) => {
    const { start, end } = shape.handles
    const sp = Vec.add(shape.point, start.point)
    const ep = Vec.add(shape.point, end.point)
    if (Utils.pointInBounds(sp, bounds) || Utils.pointInBounds(ep, bounds)) {
      return true
    }
    return intersectLineSegmentBounds(sp, ep, bounds).length > 0
  }

  transform = (
    shape: T,
    bounds: TLBounds,
    { initialShape, scaleX, scaleY }: TransformInfo<T>
  ): Partial<T> => {
    const initialShapeBounds = this.getBounds(initialShape)
    const handles: (keyof T['handles'])[] = ['start', 'end']
    const nextHandles = { ...initialShape.handles }
    handles.forEach((handle) => {
      const [x, y] = nextHandles[handle].point
      const nw = x / initialShapeBounds.width
      const nh = y / initialShapeBounds.height
      nextHandles[handle] = {
        ...nextHandles[handle],
        point: [
          bounds.width * (scaleX < 0 ? 1 - nw : nw),
          bounds.height * (scaleY < 0 ? 1 - nh : nh),
        ],
      }
    })
    return {
      point: Vec.toFixed([bounds.minX, bounds.minY]),
      handles: nextHandles,
    }
  }

  onHandleChange = (shape: T, handles: Partial<T['handles']>): Partial<T> | void => {
    let nextHandles = Utils.deepMerge<LineShape['handles']>(shape.handles, handles)
    nextHandles = Utils.deepMerge(nextHandles, {
      start: { point: Vec.toFixed(nextHandles.start.point) },
      end: { point: Vec.toFixed(nextHandles.end.point) },
    })
    // A zero-length line would produce NaNs downstream (e.g. in bounds math)
    if (Vec.isEqual(nextHandles.start.point, nextHandles.end.point)) return
    const nextShape = {
      point: shape.point,
      handles: nextHandles,
    }
    // Zero out the handles to prevent negative points, moving the shape's own point instead
    // (same technique as ArrowUtil.onHandleChange).
    const topLeft = shape.point
    const nextBounds = this.getBounds({ ...shape, ...nextShape } as LineShape)
    const offset = Vec.sub([nextBounds.minX, nextBounds.minY], topLeft)
    if (!Vec.isEqual(offset, [0, 0])) {
      Object.values(nextShape.handles).forEach((handle) => {
        handle.point = Vec.toFixed(Vec.sub(handle.point, offset))
      })
      nextShape.point = Vec.toFixed(Vec.add(nextShape.point, offset))
    }
    return nextShape
  }
}

// The line's shaft: a plain (or hand-drawn) stroke between two points, with no arrowheads and no
// binding-driven endpoint nudge. This reuses the freehand shaft renderer from ArrowUtil, since
// that geometry (and the "draw" style wobble) is identical for a line — but not the surrounding
// StraightArrow component, which carries decoration/arrowhead concepts a line does not have.
const LineShaft = React.memo(function LineShaft({
  id,
  style,
  start,
  end,
  isDraw,
  isDarkMode,
  deckTheme,
}: {
  id: string
  style: ShapeStyles
  start: number[]
  end: number[]
  isDraw: boolean
  isDarkMode: boolean
  deckTheme?: DeckTheme
}) {
  const dist = Vec.dist(start, end)
  if (dist < 2) return null
  const styles = getShapeStyle(style, isDarkMode, undefined, deckTheme)
  const { strokeWidth } = styles
  const sw = 1 + strokeWidth * 1.618
  const path = isDraw
    ? renderFreehandArrowShaft(id, style, start, end, undefined, undefined)
    : 'M' + Vec.toFixed(start) + 'L' + Vec.toFixed(end)
  const { strokeDasharray, strokeDashoffset } = Utils.getPerfectDashProps(
    dist,
    strokeWidth * 1.618,
    style.dash,
    2,
    false
  )
  return (
    <>
      <path className="tl-stroke-hitarea" d={path} />
      <path
        d={path}
        fill={styles.stroke}
        stroke={styles.stroke}
        strokeWidth={isDraw ? sw / 2 : sw}
        strokeDasharray={strokeDasharray}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        strokeLinejoin="round"
        pointerEvents="stroke"
      />
    </>
  )
})

const FullWrapper = styled('div', { width: '100%', height: '100%' })
