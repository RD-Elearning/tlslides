import * as React from 'react'
import { getShapeStyle } from '~state/shapes/shared'
import type { DeckTheme, ShapeStyles } from '~types'
import { getRectangleIndicatorPathTDSnapshot, getRectanglePath } from '../rectangleHelpers'

interface RectangleSvgProps {
  id: string
  style: ShapeStyles
  isSelected: boolean
  isDarkMode: boolean
  deckTheme?: DeckTheme
  size: number[]
}

export const DrawRectangle = React.memo(function DrawRectangle({
  id,
  style,
  size,
  isSelected,
  isDarkMode,
  deckTheme,
}: RectangleSvgProps) {
  const { isFilled } = style
  const { stroke, strokeWidth, fill } = getShapeStyle(style, isDarkMode, id, deckTheme)
  const pathTDSnapshot = getRectanglePath(id, style, size)
  const innerPath = getRectangleIndicatorPathTDSnapshot(id, style, size)

  return (
    <>
      <path
        className={style.isFilled || isSelected ? 'tl-fill-hitarea' : 'tl-stroke-hitarea'}
        d={innerPath}
      />
      {isFilled && <path d={innerPath} fill={fill} pointerEvents="none" />}
      <path
        d={pathTDSnapshot}
        fill={stroke}
        stroke={stroke}
        strokeWidth={strokeWidth}
        pointerEvents="none"
      />
    </>
  )
})
