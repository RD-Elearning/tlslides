import * as React from 'react'
import { Utils, SVGContainer, TLBounds } from '@tlslides/core'
import Vec from '@tlslides/vec'
import { intersectBoundsPolygon, intersectLineSegmentPolyline } from '@tlslides/intersect'
import { StarShape, TDShapeType, TDMeta } from '~types'
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
import { getStarPoints } from './starHelpers'
import { styled } from '~styles'

type T = StarShape
type E = HTMLDivElement

const DEFAULT_POINTS = 5
const DEFAULT_INNER_RADIUS_RATIO = 0.5

// Phase 8c — a `points`-pointed star. Same scope cuts as `PolygonUtil`, for the same reasons (see
// that file's comment): `canBind = false`, no corner radius, no per-instance "change point count /
// inner radius" UI, and hit-testing at Triangle's own level of precision (bounds-only for a click,
// real-outline for marquee/line-segment tests).
export class StarUtil extends TDShapeUtil<T, E> {
  type = TDShapeType.Star as const

  canBind = false

  canClone = true

  canEdit = true

  getShape = (props: Partial<T>): T => {
    return Utils.deepMerge<T>(
      {
        id: 'id',
        type: TDShapeType.Star,
        name: 'Star',
        parentId: 'page',
        childIndex: 1,
        point: [0, 0],
        size: [1, 1],
        points: DEFAULT_POINTS,
        innerRadiusRatio: DEFAULT_INNER_RADIUS_RATIO,
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
      const {
        id,
        label = '',
        size,
        points,
        innerRadiusRatio,
        style,
        labelPoint = LABEL_POINT,
      } = shape
      const font = getFontStyle(style, meta.deckTheme)
      const styles = getShapeStyle(style, meta.isDarkMode, id, meta.deckTheme)
      const opacity = getShapeOpacity(style, isGhost)
      const vertices = React.useMemo(
        () => getStarPoints(size, points, innerRadiusRatio),
        [size, points, innerRadiusRatio]
      )
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
        points={getStarPoints(shape.size, shape.points, shape.innerRadiusRatio)
          .map((p) => p.join(','))
          .join(' ')}
      />
    )
  })

  shouldRender = (prev: T, next: T) => {
    return (
      next.size !== prev.size ||
      next.points !== prev.points ||
      next.innerRadiusRatio !== prev.innerRadiusRatio ||
      next.style !== prev.style ||
      next.label !== prev.label
    )
  }

  getBounds = (shape: T) => {
    return getBoundsRectangle(shape, this.boundsCache)
  }

  private getPoints(shape: T) {
    return getStarPoints(shape.size, shape.points, shape.innerRadiusRatio).map((pt) =>
      Vec.add(pt, shape.point)
    )
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
