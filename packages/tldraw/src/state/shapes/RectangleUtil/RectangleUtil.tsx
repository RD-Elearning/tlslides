import * as React from 'react'
import { Utils, SVGContainer } from '@tlslides/core'
import { RectangleShape, DashStyle, TDShapeType, TDMeta } from '~types'
import { LABEL_POINT } from '~constants'
import { TDShapeUtil } from '../TDShapeUtil'
import {
  defaultStyle,
  getShapeStyle,
  getShapeOpacity,
  clampCornerRadius,
  getBoundsRectangle,
  transformRectangle,
  getFontStyle,
  transformSingleRectangle,
} from '~state/shapes/shared'
import { TextLabel } from '../shared/TextLabel'
import { getRectangleIndicatorPathTDSnapshot } from './rectangleHelpers'
import { DrawRectangle } from './components/DrawRectangle'
import { DashedRectangle } from './components/DashedRectangle'
import { BindingIndicator } from './components/BindingIndicator'
import { styled } from '~styles'

type T = RectangleShape
type E = HTMLDivElement

export class RectangleUtil extends TDShapeUtil<T, E> {
  type = TDShapeType.Rectangle as const

  canBind = true

  canClone = true

  canEdit = true

  getShape = (props: Partial<T>): T => {
    return Utils.deepMerge<T>(
      {
        id: 'id',
        type: TDShapeType.Rectangle,
        name: 'Rectangle',
        parentId: 'page',
        childIndex: 1,
        point: [0, 0],
        size: [1, 1],
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
      {
        shape,
        isEditing,
        isBinding,
        isSelected,
        isGhost,
        meta,
        bounds,
        events,
        onShapeBlur,
        onShapeChange,
      },
      ref
    ) => {
      const { id, size, style, label = '', labelPoint = LABEL_POINT } = shape
      const font = getFontStyle(style)
      const styles = getShapeStyle(style, meta.isDarkMode)
      const Component = style.dash === DashStyle.Draw ? DrawRectangle : DashedRectangle
      const handleLabelChange = React.useCallback(
        (label: string) => onShapeChange?.({ id, label }),
        [onShapeChange]
      )
      const opacity = getShapeOpacity(style, isGhost)
      return (
        <FullWrapper ref={ref} {...events}>
          <TextLabel
            isEditing={isEditing}
            onChange={handleLabelChange}
            onBlur={onShapeBlur}
            font={font}
            text={label}
            color={styles.stroke}
            offsetX={(labelPoint[0] - 0.5) * bounds.width}
            offsetY={(labelPoint[1] - 0.5) * bounds.height}
            opacity={opacity}
          />
          {/* Opacity is applied to this inner <g>, not to <SVGContainer> itself: SVGContainer
              spreads unknown props (including `opacity`) onto the outer, uncloned <svg>, while
              `getSvgElement` clones the inner `<g id="..._svg">` for SVG export. Opacity set on
              the outer element would look right live but silently vanish on export. */}
          <SVGContainer id={shape.id + '_svg'}>
            <g opacity={opacity}>
              {isBinding && <BindingIndicator strokeWidth={styles.strokeWidth} size={size} />}
              <Component
                id={id}
                style={style}
                size={size}
                isSelected={isSelected}
                isDarkMode={meta.isDarkMode}
              />
            </g>
          </SVGContainer>
        </FullWrapper>
      )
    }
  )

  Indicator = TDShapeUtil.Indicator<T>(({ shape }) => {
    const { id, style, size } = shape

    const styles = getShapeStyle(style, false)
    const sw = styles.strokeWidth

    if (style.dash === DashStyle.Draw) {
      return <path d={getRectangleIndicatorPathTDSnapshot(id, style, size)} />
    }

    const width = Math.max(1, size[0] - sw * 2)
    const height = Math.max(1, size[1] - sw * 2)
    const cornerRadius =
      style.cornerRadius !== undefined ? clampCornerRadius(style.cornerRadius, [width, height]) : 1

    return <rect x={sw} y={sw} rx={cornerRadius} ry={cornerRadius} width={width} height={height} />
  })

  getBounds = (shape: T) => {
    return getBoundsRectangle(shape, this.boundsCache)
  }

  shouldRender = (prev: T, next: T) => {
    return next.size !== prev.size || next.style !== prev.style || next.label !== prev.label
  }

  transform = transformRectangle

  transformSingle = transformSingleRectangle
}

const FullWrapper = styled('div', { width: '100%', height: '100%' })
