import * as React from 'react'
import { Utils } from '@tlslides/core'
import type { DeckTheme, ShapeStyles } from '~types'
import { getShapeStyle } from '~state/shapes/shared'

interface EllipseSvgProps {
  id: string
  radius: number[]
  style: ShapeStyles
  isSelected: boolean
  isDarkMode: boolean
  deckTheme?: DeckTheme
}

export const DashedEllipse = React.memo(function DashedEllipse({
  id,
  radius,
  style,
  isSelected,
  isDarkMode,
  deckTheme,
}: EllipseSvgProps) {
  const { stroke, strokeWidth, fill } = getShapeStyle(style, isDarkMode, id, deckTheme)
  const sw = 1 + strokeWidth * 1.618
  const rx = Math.max(0, radius[0] - sw / 2)
  const ry = Math.max(0, radius[1] - sw / 2)
  const perimeter = Utils.perimeterOfEllipse(rx, ry)
  const { strokeDasharray, strokeDashoffset } = Utils.getPerfectDashProps(
    perimeter < 64 ? perimeter * 2 : perimeter,
    strokeWidth * 1.618,
    style.dash,
    4
  )

  return (
    <>
      <ellipse
        className={style.isFilled || isSelected ? 'tl-fill-hitarea' : 'tl-stroke-hitarea'}
        cx={radius[0]}
        cy={radius[1]}
        rx={radius[0]}
        ry={radius[1]}
      />
      <ellipse
        cx={radius[0]}
        cy={radius[1]}
        rx={rx}
        ry={ry}
        fill={fill}
        stroke={stroke}
        strokeWidth={sw}
        strokeDasharray={strokeDasharray}
        strokeDashoffset={strokeDashoffset}
        pointerEvents="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  )
})
