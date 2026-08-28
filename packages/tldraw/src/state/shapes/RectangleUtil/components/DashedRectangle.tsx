import * as React from 'react'
import { Utils } from '@tlslides/core'
import { BINDING_DISTANCE } from '~constants'
import type { ShapeStyles } from '~types'
import { getShapeStyle, clampCornerRadius } from '~state/shapes/shared'

interface RectangleSvgProps {
  id: string
  style: ShapeStyles
  isSelected: boolean
  size: number[]
  isDarkMode: boolean
}

export const DashedRectangle = React.memo(function DashedRectangle({
  id,
  style,
  size,
  isSelected,
  isDarkMode,
}: RectangleSvgProps) {
  const { stroke, strokeWidth, fill } = getShapeStyle(style, isDarkMode, id)

  const sw = 1 + strokeWidth * 1.618

  const w = Math.max(0, size[0] - sw / 2)
  const h = Math.max(0, size[1] - sw / 2)

  const cornerRadius =
    style.cornerRadius !== undefined ? clampCornerRadius(style.cornerRadius, [w, h]) : 0

  // T8a.3 — corner radius, rounded-corner path. Below this, the un-rounded path (four independent
  // <line> segments, each with its own `getPerfectDashProps` so the dash pattern is centered on
  // every side) is untouched — that's the `cornerRadius === 0` fallback, matching every shape
  // drawn before this field existed.
  //
  // Once a radius is set we can't keep four independent segments — a shared, continuous outline is
  // needed for the corners to actually round — so this switches to a single <rect rx ry>. That
  // means giving up the per-side perfect dash centering above: `getPerfectDashProps` is called once
  // against the straight-edge perimeter (ignoring the small amount of length the corner arcs add)
  // and applied to the whole outline. The dash pattern is therefore very slightly out of phase right
  // at the rounded corners instead of perfectly centered on every straight run. That was judged an
  // acceptable trade for a cosmetic feature — a plain rounded rect with the existing dash props reads
  // correctly at a glance for Solid, Dashed, and Dotted alike.
  if (cornerRadius > 0) {
    const perimeter = 2 * (w - sw / 2) + 2 * (h - sw / 2)
    const { strokeDasharray, strokeDashoffset } = Utils.getPerfectDashProps(
      perimeter,
      strokeWidth * 1.618,
      style.dash
    )

    return (
      <>
        <rect
          className={isSelected || style.isFilled ? 'tl-fill-hitarea' : 'tl-stroke-hitarea'}
          x={sw / 2}
          y={sw / 2}
          rx={cornerRadius}
          ry={cornerRadius}
          width={w}
          height={h}
          strokeWidth={BINDING_DISTANCE}
        />
        {style.isFilled && (
          <rect
            x={sw / 2}
            y={sw / 2}
            rx={cornerRadius}
            ry={cornerRadius}
            width={w}
            height={h}
            fill={fill}
            pointerEvents="none"
          />
        )}
        <rect
          x={sw / 2}
          y={sw / 2}
          rx={cornerRadius}
          ry={cornerRadius}
          width={w}
          height={h}
          pointerEvents="none"
          fill="none"
          stroke={stroke}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
        />
      </>
    )
  }

  const strokes: [number[], number[], number][] = [
    [[sw / 2, sw / 2], [w, sw / 2], w - sw / 2],
    [[w, sw / 2], [w, h], h - sw / 2],
    [[w, h], [sw / 2, h], w - sw / 2],
    [[sw / 2, h], [sw / 2, sw / 2], h - sw / 2],
  ]

  const paths = strokes.map(([start, end, length], i) => {
    const { strokeDasharray, strokeDashoffset } = Utils.getPerfectDashProps(
      length,
      strokeWidth * 1.618,
      style.dash
    )

    return (
      <line
        key={id + '_' + i}
        x1={start[0]}
        y1={start[1]}
        x2={end[0]}
        y2={end[1]}
        strokeDasharray={strokeDasharray}
        strokeDashoffset={strokeDashoffset}
      />
    )
  })

  return (
    <>
      <rect
        className={isSelected || style.isFilled ? 'tl-fill-hitarea' : 'tl-stroke-hitarea'}
        x={sw / 2}
        y={sw / 2}
        width={w}
        height={h}
        strokeWidth={BINDING_DISTANCE}
      />
      {style.isFilled && (
        <rect x={sw / 2} y={sw / 2} width={w} height={h} fill={fill} pointerEvents="none" />
      )}
      <g pointerEvents="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round">
        {paths}
      </g>
    </>
  )
})
