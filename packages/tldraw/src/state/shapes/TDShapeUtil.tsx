/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Utils, TLShapeUtil } from '@tlslides/core'
import type { TLPointerInfo, TLBounds } from '@tlslides/core'
import {
  intersectLineSegmentBounds,
  intersectLineSegmentPolyline,
  intersectRayBounds,
} from '@tlslides/intersect'
import { Vec } from '@tlslides/vec'
import type { DeckTheme, ShapesWithProp, TDBinding, TDMeta, TDShape, TransformInfo } from '~types'
import * as React from 'react'
import { BINDING_DISTANCE } from '~constants'
import { getTextSvgElement } from './shared/getTextSvgElement'
import { getTextLabelSize } from './shared/getTextSize'
import { getFontStyle, getShapeStyle, getLetterSpacingCss, getLineHeight } from './shared'
import { AlignStyle } from '~types'

export abstract class TDShapeUtil<T extends TDShape, E extends Element = any> extends TLShapeUtil<
  T,
  E,
  TDMeta
> {
  abstract type: T['type']

  canBind = false

  canEdit = false

  canClone = false

  isAspectRatioLocked = false

  hideResizeHandles = false

  bindingDistance = BINDING_DISTANCE

  abstract getShape: (props: Partial<T>) => T

  hitTestPoint = (shape: T, point: number[]): boolean => {
    return Utils.pointInBounds(point, this.getRotatedBounds(shape))
  }

  hitTestLineSegment = (shape: T, A: number[], B: number[]): boolean => {
    const box = Utils.getBoundsFromPoints([A, B])
    const bounds = this.getBounds(shape)

    return Utils.boundsContain(bounds, box) || shape.rotation
      ? intersectLineSegmentPolyline(A, B, Utils.getRotatedCorners(this.getBounds(shape)))
          .didIntersect
      : intersectLineSegmentBounds(A, B, this.getBounds(shape)).length > 0
  }

  create = (props: { id: string } & Partial<T>) => {
    this.refMap.set(props.id, React.createRef())
    return this.getShape(props)
  }

  getCenter = (shape: T) => {
    return Utils.getBoundsCenter(this.getBounds(shape))
  }

  getExpandedBounds = (shape: T) => {
    return Utils.expandBounds(this.getBounds(shape), this.bindingDistance)
  }

  getBindingPoint = <K extends TDShape>(
    shape: T,
    fromShape: K,
    point: number[],
    origin: number[],
    direction: number[],
    bindAnywhere: boolean
  ) => {
    // Algorithm time! We need to find the binding point (a normalized point inside of the shape, or around the shape, where the arrow will point to) and the distance from the binding shape to the anchor.

    const bounds = this.getBounds(shape)
    const expandedBounds = this.getExpandedBounds(shape)

    // The point must be inside of the expanded bounding box
    if (!Utils.pointInBounds(point, expandedBounds)) return

    const intersections = intersectRayBounds(origin, direction, expandedBounds)
      .filter((int) => int.didIntersect)
      .map((int) => int.points[0])

    if (!intersections.length) return

    // The center of the shape
    const center = this.getCenter(shape)

    // Find furthest intersection between ray from origin through point and expanded bounds. TODO: What if the shape has a curve? In that case, should we intersect the circle-from-three-points instead?
    const intersection = intersections.sort((a, b) => Vec.dist(b, origin) - Vec.dist(a, origin))[0]

    // The point between the handle and the intersection
    const middlePoint = Vec.med(point, intersection)

    // The anchor is the point in the shape where the arrow will be pointing
    let anchor: number[]

    // The distance is the distance from the anchor to the handle
    let distance: number

    if (bindAnywhere) {
      // If the user is indicating that they want to bind inside of the shape, we just use the handle's point
      anchor = Vec.dist(point, center) < BINDING_DISTANCE / 2 ? center : point
      distance = 0
    } else {
      if (Vec.distanceToLineSegment(point, middlePoint, center) < BINDING_DISTANCE / 2) {
        // If the line segment would pass near to the center, snap the anchor the center point
        anchor = center
      } else {
        // Otherwise, the anchor is the middle point between the handle and the intersection
        anchor = middlePoint
      }

      if (Utils.pointInBounds(point, bounds)) {
        // If the point is inside of the shape, use the shape's binding distance

        distance = this.bindingDistance
      } else {
        // Otherwise, use the actual distance from the handle point to nearest edge
        distance = Math.max(
          this.bindingDistance,
          Utils.getBoundsSides(bounds)
            .map((side) => Vec.distanceToLineSegment(side[1][0], side[1][1], point))
            .sort((a, b) => a - b)[0]
        )
      }
    }

    // The binding point is a normalized point indicating the position of the anchor.
    // An anchor at the middle of the shape would be (0.5, 0.5). When the shape's bounds
    // changes, we will re-recalculate the actual anchor point by multiplying the
    // normalized point by the shape's new bounds.
    const bindingPoint = Vec.divV(Vec.sub(anchor, [expandedBounds.minX, expandedBounds.minY]), [
      expandedBounds.width,
      expandedBounds.height,
    ])

    return {
      point: Vec.clampV(bindingPoint, 0, 1),
      distance,
    }
  }

  mutate = (shape: T, props: Partial<T>): Partial<T> => {
    return props
  }

  transform = (shape: T, bounds: TLBounds, info: TransformInfo<T>): Partial<T> => {
    return { ...shape, point: [bounds.minX, bounds.minY] }
  }

  transformSingle = (shape: T, bounds: TLBounds, info: TransformInfo<T>): Partial<T> | void => {
    return this.transform(shape, bounds, info)
  }

  updateChildren?: <K extends TDShape>(shape: T, children: K[]) => Partial<K>[] | void

  onChildrenChange?: (shape: T, children: TDShape[]) => Partial<T> | void

  onHandleChange?: (shape: T, handles: Partial<T['handles']>) => Partial<T> | void

  onRightPointHandle?: (
    shape: T,
    handles: Partial<T['handles']>,
    info: Partial<TLPointerInfo>
  ) => Partial<T> | void

  onDoubleClickHandle?: (
    shape: T,
    handles: Partial<T['handles']>,
    info: Partial<TLPointerInfo>
  ) => Partial<T> | void

  onDoubleClickBoundsHandle?: (shape: T) => Partial<T> | void

  onSessionComplete?: (shape: T) => Partial<T> | void

  // `deckTheme` (Phase 12) is only needed for the label-fill line below: the shape's own body is
  // cloned straight from the live, already-rendered DOM node (`getElementById(...).cloneNode`),
  // which baked in the resolved colour at render time — see `deck-theme.ts`'s "survives export"
  // point. The label text is the one part of this method that computes a colour fresh rather than
  // cloning it, so it's the one call here that needs the theme passed through explicitly.
  getSvgElement = (shape: T, deckTheme?: DeckTheme): SVGElement | void => {
    const elm = document.getElementById(shape.id + '_svg')?.cloneNode(true) as SVGElement
    if (!elm) return // possibly in test mode
    if ('label' in shape && (shape as any).label !== undefined) {
      const s = shape as TDShape & { label: string }
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      const bounds = this.getBounds(shape)
      const labelElm = getTextSvgElement(s['label'], shape.style, bounds, deckTheme)
      labelElm.setAttribute('fill', getShapeStyle(shape.style, false, undefined, deckTheme).stroke)
      const font = getFontStyle(shape.style, deckTheme)
      // Phase 17 — must match the live label's own measurement inputs (letter-spacing, line-
      // height) or this translate — the only place export centers a label, since it never clones
      // a live `TextLabel` node — drifts off-center exactly the way the Phase 15 report's `scale`
      // bug did for font size.
      const size = getTextLabelSize(
        s['label'],
        font,
        getLetterSpacingCss(shape.style),
        getLineHeight(shape.style)
      )
      const tx = (bounds.width - size[0]) / 2
      const ty = verticalAlignOffset(shape.style.verticalAlign, bounds.height, size[1])
      labelElm.setAttribute('transform-origin', 'top left')
      labelElm.setAttribute('transform', `translate(${tx}, ${ty})`)
      g.appendChild(elm)
      g.appendChild(labelElm)
      return g
    }
    return elm
  }
}

// Phase 17 — shared with `renderPageToSvg.ts`'s `renderShapeLabel` in spirit (same formula), but
// kept as its own tiny function here rather than imported: this one centers against a *live-DOM-
// measured* label size, that one against `estimateTextSize`'s heuristic — different enough inputs
// that sharing the function itself would mean threading one more parameter through a module that
// otherwise has no reason to import from this one (`renderPageToSvg.ts` deliberately doesn't
// import any DOM-touching module — see that file's own module comment on why). `AlignStyle.Justify`
// has no vertical meaning; treated the same as `Start` (top), matching `TextLabel`'s own live
// vertical-align handling (its layout-effect comment explains why that one is a plain translate,
// not CSS `align-items`).
//
// This path (`getSvgElement`, used by "Copy as SVG"/`TldrawApp.copySvg`) shares the same
// `Start`/`End` edge-slop `renderPageToSvg.ts`'s `renderShapeLabel` documents: `getTextSvgElement`'s
// per-line `y` formula was calibrated for a centered `ty`, so anchoring at `0` here doesn't put the
// glyph *ink* flush at the box edge, only its nominal layout box. This path at least measures via
// the real DOM (`getTextLabelSize`, not a heuristic), so the *size* is exact — only the same
// font-ascent-metric slop as the headless path remains.
function verticalAlignOffset(
  verticalAlign: AlignStyle | undefined,
  boxHeight: number,
  labelHeight: number
): number {
  switch (verticalAlign) {
    case AlignStyle.Start:
    case AlignStyle.Justify:
      return 0
    case AlignStyle.End:
      return boxHeight - labelHeight
    default:
      return (boxHeight - labelHeight) / 2
  }
}
