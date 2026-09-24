/**
 * Pure layout function for tls.t.body — body copy paragraph.
 *
 * Renders paragraph text with RichText support, optional autofit (shrink to 0.75 floor),
 * multi-column layout, and text alignment.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 *
 * G8.4 (resolved the V2.3 TODO above): the block reports its true measured height, unclamped.
 * The no-registry path never calls `layout()` for measurement at all (`slide-compiler.ts`'s
 * fallback branch sets every block height to -1 and equal-splits the region), so there was no
 * regression case to make the clamp conditional on — the clamp was traced and found to be
 * unconditionally safe to remove (BACKLOG-visual-fix-2.md §8.4).
 */

import type { LayoutContext, LayoutNode, TypeToken } from '../../../types'
import type { BodyProps } from './schema'

/**
 * Apply a scale factor to a resolved text style.
 */
function withScale(style: ReturnType<LayoutContext['resolveText']>, scale: number) {
  return { ...style, scale, size: style.size * scale }
}

/**
 * Effective font size accounting for scale multiplier.
 */
function effectiveFontSize(style: { size: number; scale?: number }): number {
  return style.size * (style.scale ?? 1)
}

export function layout(props: BodyProps, ctx: LayoutContext): LayoutNode {
  const typeToken = 'body' as TypeToken
  const align = props.align ?? 'start'
  const columns = Math.max(1, Math.min(4, props.columns ?? 1))
  const textColor = props.color ?? 'text'
  const autoFit = props.autoFit ?? false

  const style = ctx.resolveText(typeToken)
  const resolvedStyle = {
    ...style,
    color: ctx.resolveColor(textColor).color,
  }

  const inner = { x: 0, y: 0, width: ctx.box.width, height: ctx.box.height }

  if (columns <= 1) {
    // Single column — straightforward paragraph layout
    let currentStyle = resolvedStyle
    let m = ctx.measureText(props.text, resolvedStyle, inner.width)

    // Autofit: shrink by 0.5 per step to a 0.75 floor
    if (autoFit) {
      let scale = 1
      while (m.height > inner.height && scale > 0.75) {
        scale = Math.max(0.75, scale - 0.02)
        currentStyle = withScale(resolvedStyle, scale)
        m = ctx.measureText(props.text, currentStyle, inner.width)
      }
      if (scale <= 0.75 && m.height > inner.height) {
        currentStyle = withScale(resolvedStyle, 0.75)
        m = ctx.measureText(props.text, currentStyle, inner.width)
      }
    }

    const textNode: LayoutNode = {
      k: 'text',
      part: 'text',
      box: { ...inner, height: m.height },
      lines: m.lines,
      style: currentStyle,
      propPath: 'text',
    }

    // Return measured content height, not the full available box height.
    return { k: 'group', box: { x: 0, y: 0, width: ctx.box.width, height: m.height }, part: 'root', children: [textNode] }
  }

  // Multi-column: split text by newlines, or if no newlines, split by space
  // to approximate equal distribution across columns.
  const plainText = typeof props.text === 'string'
    ? props.text
    : props.text.runs.map(r => r.text).join('')

  const paragraphs = plainText.split(/\n+/).filter(Boolean)
  const colWidth = inner.width / columns
  const children: LayoutNode[] = []

  for (let col = 0; col < columns; col++) {
    const colBox = { x: inner.x + col * colWidth, y: inner.y, width: colWidth, height: inner.height }
    // Distribute paragraphs: wrap excess back to first columns
    const colText = paragraphs[col] ?? ''
    const colRichText = typeof props.text === 'object'
      ? { runs: props.text.runs }
      : colText

    const m = ctx.measureText(colRichText, resolvedStyle, colBox.width)

    children.push({
      k: 'text',
      part: `text[${col}]`,
      box: { ...colBox, height: m.height },
      lines: m.lines,
      style: resolvedStyle,
      propPath: 'text',
    })
  }

  // Multi-column: measure each column and take the max height.
  const maxColHeight = children.reduce((max, child) => Math.max(max, child.box.height), 0)
  return { k: 'group', box: { x: 0, y: 0, width: ctx.box.width, height: maxColHeight }, part: 'root', children }
}
