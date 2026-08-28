import * as React from 'react'
import {
  resolveSlideBackground,
  resolveThemeColor,
  getFontSize,
} from '~state/shapes/shared'
import { DeckTheme, Template, TDShape, TDShapeType } from '~types'

/**
 * A cheap, geometry-accurate preview of a `Template`: not a real render (no live editor, no DOM
 * measurement — this has to work in a dropdown menu, not a mounted canvas), but built from the
 * template's own shape data rather than a hand-drawn icon, so the picker never drifts out of sync
 * with what `addSlideFromTemplate` actually produces. Text shapes are approximated as a rounded
 * bar (width from a character-count heuristic, since there's no DOM to measure against here) —
 * plenty for a thumbnail at this size.
 *
 * Resolves every colour against `theme` — the deck's active theme when there is one, so the
 * picker itself demonstrates the theme system: switch themes, and the gallery's own previews
 * restyle right along with the rest of the deck.
 */
export function TemplateThumbnail({
  template,
  theme,
}: {
  template: Template
  theme: DeckTheme | undefined
}) {
  const [w, h] = template.size
  const background = resolveSlideBackground(template.background, template.id, undefined, theme)
  const backgroundFill =
    background?.type === 'solid' ? background.color : theme?.colors.background ?? '#e8e8e8'

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
      <rect x={0} y={0} width={w} height={h} fill={backgroundFill} />
      {template.shapes.map((shape) => (
        <ThumbnailShape key={shape.id} shape={shape} theme={theme} />
      ))}
    </svg>
  )
}

function ThumbnailShape({ shape, theme }: { shape: TDShape; theme: DeckTheme | undefined }) {
  const fill = resolveThemeColor(shape.style.fill, theme)
  const stroke = resolveThemeColor(shape.style.stroke, theme)

  switch (shape.type) {
    case TDShapeType.Rectangle:
    case TDShapeType.Component:
    case TDShapeType.Image:
    case TDShapeType.Video: {
      if (!shape.style.isFilled) return null
      return (
        <rect
          x={shape.point[0]}
          y={shape.point[1]}
          width={shape.size[0]}
          height={shape.size[1]}
          rx={shape.style.cornerRadius ?? theme?.shapeDefaults?.cornerRadius ?? 0}
          fill={fill ?? 'none'}
          opacity={shape.style.opacity ?? 1}
        />
      )
    }
    case TDShapeType.Ellipse: {
      if (!shape.style.isFilled) return null
      return (
        <ellipse
          cx={shape.point[0] + shape.radius[0]}
          cy={shape.point[1] + shape.radius[1]}
          rx={shape.radius[0]}
          ry={shape.radius[1]}
          fill={fill ?? 'none'}
          opacity={shape.style.opacity ?? 1}
        />
      )
    }
    case TDShapeType.Line: {
      const { start, end } = shape.handles
      return (
        <line
          x1={start.point[0]}
          y1={start.point[1]}
          x2={end.point[0]}
          y2={end.point[1]}
          stroke={stroke ?? 'none'}
          strokeWidth={8}
        />
      )
    }
    case TDShapeType.Text: {
      // No DOM to measure against here (see the module doc) — approximate the natural width of
      // the longest line from its character count, the same rough constant used for centering
      // estimates when the templates themselves were laid out.
      const fontSize = getFontSize(shape.style.size, shape.style.font) * (shape.style.scale ?? 1)
      const lines = shape.text.split('\n')
      const longest = Math.max(...lines.map((line) => line.length), 1)
      const barWidth = longest * fontSize * 0.55
      const lineHeight = fontSize * 1.3
      return (
        <>
          {lines.map((line, i) => (
            <rect
              key={i}
              x={shape.point[0]}
              y={shape.point[1] + i * lineHeight}
              width={Math.max(4, (line.length / longest) * barWidth)}
              height={lineHeight * 0.55}
              rx={lineHeight * 0.2}
              fill={stroke ?? '#888'}
            />
          ))}
        </>
      )
    }
    default:
      return null
  }
}
