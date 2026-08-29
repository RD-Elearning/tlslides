import * as React from 'react'
import { Utils } from '@tlslides/core'
import Vec from '@tlslides/vec'
import { BINDING_DISTANCE } from '~constants'
import type { DeckTheme, ShapeStyles } from '~types'
import { DashStyle } from '~types'
import { getShapeStyle } from './shape-styles'
import { GradientDef } from './GradientDef'
import { getPolygonPath, getPolygonIndicatorPathTDSnapshot } from './polygonDrawPath'

interface PolygonBodyProps {
  id: string
  style: ShapeStyles
  /** Closed polygon vertices in the shape's own local space (top-left at `[0, 0]`) — the same
   *  convention `getTrianglePoints`/`getRectanglePath` already use. Not repeated/closed by the
   *  caller: this component connects the last point back to the first itself. */
  vertices: number[][]
  isSelected: boolean
  isDarkMode: boolean
  deckTheme?: DeckTheme
}

// Phase 8c — shared by PolygonUtil/StarUtil/SpeechBubbleUtil's live `Component`s. Every one of
// these three shapes is, geometrically, "an arbitrary closed polygon" differing only in *how* its
// vertices are generated (a regular N-gon, an alternating-radius star, a rect-plus-tail) — so
// rather than tripling `RectangleUtil`'s Dashed/Draw component split, the dash/fill/hand-drawn
// rendering itself (everything downstream of "here is a list of points") is written once here,
// against a plain `vertices: number[][]`, matching the "one place" discipline this fork already
// applies to style resolution (`getShapeStyle`) and font resolution (`resolveFont`) — now applied
// to shape-body rendering for this one family of shapes.
export const PolygonBody = React.memo(function PolygonBody({
  id,
  style,
  vertices,
  isSelected,
  isDarkMode,
  deckTheme,
}: PolygonBodyProps) {
  const { stroke, strokeWidth, fill, fillGradientDef } = getShapeStyle(
    style,
    isDarkMode,
    id,
    deckTheme
  )
  const pointsAttr = vertices.map((p) => p.join(',')).join(' ')
  const hitAreaClass = style.isFilled || isSelected ? 'tl-fill-hitarea' : 'tl-stroke-hitarea'

  if (style.dash === DashStyle.Draw) {
    const innerPath = getPolygonIndicatorPathTDSnapshot(id, style, vertices)
    const path = getPolygonPath(id, style, vertices)
    return (
      <>
        {fillGradientDef && <GradientDef gradient={fillGradientDef} />}
        <polygon className={hitAreaClass} points={pointsAttr} strokeWidth={BINDING_DISTANCE} />
        {style.isFilled && <path d={innerPath} fill={fill} pointerEvents="none" />}
        <path d={path} fill={stroke} stroke={stroke} strokeWidth={strokeWidth} pointerEvents="none" />
      </>
    )
  }

  const perimeter = vertices.reduce(
    (sum, p, i) => sum + Vec.dist(p, vertices[(i + 1) % vertices.length]),
    0
  )
  const sw = 1 + strokeWidth * 1.618
  const { strokeDasharray, strokeDashoffset } = Utils.getPerfectDashProps(
    perimeter,
    strokeWidth * 1.618,
    style.dash
  )
  return (
    <>
      {fillGradientDef && <GradientDef gradient={fillGradientDef} />}
      <polygon className={hitAreaClass} points={pointsAttr} strokeWidth={BINDING_DISTANCE} />
      {style.isFilled && <polygon points={pointsAttr} fill={fill} pointerEvents="none" />}
      <polygon
        points={pointsAttr}
        fill="none"
        stroke={stroke}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
        pointerEvents="none"
        strokeDasharray={strokeDasharray}
        strokeDashoffset={strokeDashoffset}
      />
    </>
  )
})
