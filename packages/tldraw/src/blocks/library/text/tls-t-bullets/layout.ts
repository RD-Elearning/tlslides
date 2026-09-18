/**
 * Pure layout function for tls.t.bullets — bullet list.
 *
 * Uses the existing list marker system from blocks/layout/lists.ts
 * (dot/dash/chevron/number markers and indent levels).
 * Does NOT write a second list layout.
 *
 * Each item gets its own part name (item[0], item[1], ...) for staggered
 * reveal animation. The layout produces individual text nodes per item
 * with per-item part names, so the motion system can stagger them.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { LayoutContext, LayoutNode, SpaceToken } from '../../../types'
import type { BulletsProps } from './schema'
import { renderList } from '../../../layout/lists'

/**
 * Marker characters for visual markers.
 */
const MARKER_CHARS: Record<string, string> = {
  dot: '\u2022',
  dash: '\u2013',
  chevron: '\u203A',
}

/**
 * Format a marker string for a given item index.
 */
function formatMarker(marker: string, index: number, startNumber?: number): string {
  switch (marker) {
    case 'dot':
      return MARKER_CHARS.dot ?? '\u2022'
    case 'dash':
      return MARKER_CHARS.dash ?? '\u2013'
    case 'chevron':
      return MARKER_CHARS.chevron ?? '\u203A'
    case 'number':
      return `${(startNumber ?? 1) + index}.`
    case 'icon':
      return '\u2192' // default arrow icon
    default:
      return MARKER_CHARS.dot ?? '\u2022'
  }
}

export function layout(props: BulletsProps, ctx: LayoutContext): LayoutNode {
  const marker = props.marker ?? 'dot'
  const spacingToken = (props.spacing ?? 'sm') as SpaceToken
  const gap = ctx.tokens.space[spacingToken] ?? ctx.tokens.space.sm
  const textColor = props.color ?? 'text'

  const style = ctx.resolveText('body')
  const resolvedStyle = {
    ...style,
    color: ctx.resolveColor(textColor).color,
  }

  const inner = { x: 0, y: 0, width: ctx.box.width, height: ctx.box.height }
  const items = props.items ?? []

  if (items.length === 0) {
    return {
      k: 'group',
      box: { x: 0, y: 0, width: ctx.box.width, height: 0 },
      part: 'root',
      children: [],
    }
  }

  // Measure marker width based on font size
  const markerW = resolvedStyle.size * 0.9
  let y = inner.y

  const children: LayoutNode[] = []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const indent = (props.indentLevels && item.level ? item.level : 0) * ctx.tokens.space.lg
    const textBox = {
      x: inner.x + indent + markerW + ctx.tokens.space.xs,
      y,
      width: Math.max(0, inner.width - indent - markerW - ctx.tokens.space.xs),
      height: inner.height - y,
    }

    // Measure text with maxWidth for wrapping
    const m = ctx.measureText(item.text, resolvedStyle, textBox.width)

    // Marker text node (rendered as text, not as a path)
    const markerText = formatMarker(marker, i)
    const markerNode: LayoutNode = {
      k: 'text',
      part: `item[${i}].marker`,
      box: { x: inner.x + indent, y, width: markerW, height: m.height },
      lines: [{ text: markerText, baseline: m.lines[0]?.baseline ?? resolvedStyle.size * 0.8, width: markerW }],
      style: { ...resolvedStyle, size: resolvedStyle.size },
    }

    // Item text node
    const textNode: LayoutNode = {
      k: 'text',
      part: `item[${i}].text`,
      box: { ...textBox, height: m.height },
      lines: m.lines,
      style: resolvedStyle,
    }

    children.push(markerNode, textNode)
    y += m.height + gap
  }

  // Return measured content height, not the full available box height.
  // Subtract the last gap that was added after the final item.
  const contentHeight = y - gap
  return { k: 'group', box: { x: 0, y: 0, width: ctx.box.width, height: contentHeight }, part: 'root', children }
}
