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

import type { LayoutContext, LayoutNode, SpaceToken, TypeToken } from '../../../types'
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

/** AC8.5 `size: fit`: the rungs tried, largest first; the list may take this share of the box. */
export const FIT_LADDER: TypeToken[] = ['heading', 'subheading', 'lead', 'body']
export const FIT_SHARE = 0.6
/** At a rung above body an item may wrap to at most this many lines. */
export const FIT_MAX_LINES = 2

export function layout(props: BulletsProps, ctx: LayoutContext): LayoutNode {
  if (props.size === 'fit') {
    const H = ctx.box.height
    for (let i = 0; i < FIT_LADDER.length; i++) {
      const token = FIT_LADDER[i]
      const last = i === FIT_LADDER.length - 1
      const tree = layoutAt(props, ctx, token, Math.round(ctx.resolveText(token).size * 0.55))
      const kids = tree.k === 'group' ? tree.children : []
      const wraps = kids.some((c) => c.k === 'text' && !!c.part?.endsWith('.text') && c.lines.length > FIT_MAX_LINES)
      if (last || (tree.box.height <= H * FIT_SHARE && !wraps)) {
        // centred in the box: a short list beside a full-height photo sits at its middle
        const dy = Math.max(0, (H - tree.box.height) / 2)
        const children = (tree.k === 'group' ? tree.children : []).map((c) => ({ ...c, box: { ...c.box, y: c.box.y + dy } }) as LayoutNode)
        return { k: 'group', part: 'root', box: { ...tree.box, height: Math.max(H, tree.box.height) }, children }
      }
    }
  }
  const token: TypeToken = props.size === 'lead' ? 'lead' : 'body'
  const spacingToken = (props.spacing ?? 'sm') as SpaceToken
  return layoutAt(props, ctx, token, ctx.tokens.space[spacingToken] ?? ctx.tokens.space.sm)
}

function layoutAt(props: BulletsProps, ctx: LayoutContext, token: TypeToken, gap: number): LayoutNode {
  const marker = props.marker ?? 'dot'
  const textColor = props.color ?? 'text'

  const style = ctx.resolveText(token)
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
      propPath: `items.${i}.text`,
    }

    children.push(markerNode, textNode)
    y += m.height + gap
  }

  // Return measured content height, not the full available box height.
  // Subtract the last gap that was added after the final item.
  const contentHeight = y - gap
  return { k: 'group', box: { x: 0, y: 0, width: ctx.box.width, height: contentHeight }, part: 'root', children }
}
