import * as React from 'react'
import { Utils, SVGContainer, TLBounds } from '@tlslides/core'
import Vec from '@tlslides/vec'
import { intersectBoundsPolygon, intersectLineSegmentPolyline } from '@tlslides/intersect'
import { SpeechBubbleShape, TDShapeType, TDMeta } from '~types'
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
import { getSpeechBubblePoints } from './speechBubbleHelpers'
import { styled } from '~styles'

type T = SpeechBubbleShape
type E = HTMLDivElement

// Phase 8c — a speech bubble (rectangle + fixed tail). Same scope cuts as `PolygonUtil`/`StarUtil`
// for the same reasons: `canBind = false`, no corner radius (see `getSpeechBubblePoints`'s comment
// — rounding the body's corners while keeping the tail's own notch square is a materially
// different computation from `clampCornerRadius`'s rectangle-arc insertion, not attempted here),
// no drag handle to reposition the tail, and hit-testing at Triangle's own level of precision.
// Unlike Polygon/Star, this shape's own label centers on the *full* bounding box (tail included),
// not just the body — see the Phase 8c report for why that's an accepted, minor simplification
// rather than Triangle's centroid-correction treatment.
export class SpeechBubbleUtil extends TDShapeUtil<T, E> {
  type = TDShapeType.SpeechBubble as const

  canBind = false

  canClone = true

  canEdit = true

  getShape = (props: Partial<T>): T => {
    return Utils.deepMerge<T>(
      {
        id: 'id',
        type: TDShapeType.SpeechBubble,
        name: 'Speech Bubble',
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
      { shape, bounds, isEditing, isSelected, isGhost, meta, events, onShapeChange, onShapeBlur },
      ref
    ) => {
      const { id, label = '', size, style, labelPoint = LABEL_POINT } = shape
      const font = getFontStyle(style, meta.deckTheme)
      const styles = getShapeStyle(style, meta.isDarkMode, id, meta.deckTheme)
      const opacity = getShapeOpacity(style, isGhost)
      const vertices = React.useMemo(() => getSpeechBubblePoints(size), [size])
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
        points={getSpeechBubblePoints(shape.size)
          .map((p) => p.join(','))
          .join(' ')}
      />
    )
  })

  shouldRender = (prev: T, next: T) => {
    return next.size !== prev.size || next.style !== prev.style || next.label !== prev.label
  }

  getBounds = (shape: T) => {
    return getBoundsRectangle(shape, this.boundsCache)
  }

  private getPoints(shape: T) {
    return getSpeechBubblePoints(shape.size).map((pt) => Vec.add(pt, shape.point))
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
