/**
 * Pure layout function for tls.t.kicker — kicker / eyebrow label.
 *
 * Renders a small label above the title with optional text case transformation,
 * letter spacing, and a leading accent marker dot.
 */

import type { LayoutContext, LayoutNode } from '../../../types'
import type { KickerProps } from './schema'

/**
 * Apply a text-case transformation to a string. These are the four CSS
 * text-transform values a kicker uses.
 */
function applyCase(text: string, textCase: string): string {
  switch (textCase) {
    case 'uppercase':
      return text.toUpperCase()
    case 'lowercase':
      return text.toLowerCase()
    case 'capitalize':
      return text.replace(/\b\w/g, (c) => c.toUpperCase())
    case 'none':
    default:
      return text
  }
}

/**
 * Letter-spacing values for the kicker. 'wide' is the default, matching
 * eyebrow label conventions.
 */
const TRACKING_VALUES: Record<string, number> = {
  wide: 0.08,
  normal: 0.02,
  narrow: -0.01,
}

export function layout(props: KickerProps, ctx: LayoutContext): LayoutNode {
  const textCase = props.case ?? 'uppercase'
  const tracking = TRACKING_VALUES[props.tracking ?? 'wide'] ?? 0.08
  const showMarker = props.marker ?? false

  const displayText = applyCase(props.text ?? '', textCase)

  // kicker uses 'caption' step: size 22, lineHeight 1.4
  const style = ctx.resolveText('caption', { letterSpacing: tracking })

  const resolvedStyle = {
    ...style,
    color: ctx.resolveColor('accent').color,
  }

  const markerWidth = showMarker ? ctx.tokens.space.xs : 0
  const innerWidth = Math.max(0, ctx.box.width - markerWidth)
  const inner = { x: markerWidth, y: 0, width: innerWidth, height: ctx.box.height }

  const m = ctx.measureText(displayText, resolvedStyle, inner.width)

  const children: LayoutNode[] = []

  // Optional leading marker dot
  if (showMarker) {
    const dotSize = resolvedStyle.size * 0.6
    children.push({
      k: 'rect',
      part: 'marker',
      box: {
        x: 0,
        y: (m.height - dotSize) / 2,
        width: dotSize,
        height: dotSize,
      },
      fill: { type: 'solid', color: resolvedStyle.color },
      radius: dotSize / 2,
    })
  }

  children.push({
    k: 'text',
    part: 'text',
    box: { ...inner, height: m.height },
    lines: m.lines,
    style: resolvedStyle,
    propPath: 'text',
  })

  // Return measured content height, not the full available box height.
  return { k: 'group', box: { x: 0, y: 0, width: ctx.box.width, height: m.height }, part: 'root', children }
}
