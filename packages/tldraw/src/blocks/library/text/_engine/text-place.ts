/**
 * Place a measured text run inside a column with start / center / end alignment.
 *
 * `LayoutNode` text has no `textAlign`: every line is drawn from `box.x`. So non-start alignment
 * is built here by emitting one text node per line, each sized to its measured width and offset
 * to its aligned x. Start alignment emits a single node (inline-editable via `propPath`).
 *
 * Pure and DOM-free.
 */

import type { LayoutContext, LayoutNode, ResolvedTextStyle, RichText, TextLine } from '../../../types'

export type HAlign = 'start' | 'center' | 'end'

export interface PlacedText {
  nodes: LayoutNode[]
  height: number
  /** Number of visual lines. */
  lineCount: number
  /** Per-line geometry in the parent's coordinate space (for underline/highlight/strike). */
  lines: Array<{ x: number; y: number; width: number; height: number; line: TextLine }>
}

export function alignedX(x: number, width: number, contentWidth: number, align: HAlign): number {
  const free = Math.max(0, width - contentWidth)
  return align === 'center' ? x + free / 2 : align === 'end' ? x + free : x
}

export interface PlaceOpts {
  part: string
  /** Part used for each line when `align !== 'start'` (defaults to `${part}[i]`). */
  linePart?: (i: number) => string
  propPath?: string
}

export function placeText(
  ctx: LayoutContext,
  text: string | RichText,
  style: ResolvedTextStyle,
  box: { x: number; y: number; width: number },
  align: HAlign,
  opts: PlaceOpts
): PlacedText {
  const width = Math.max(1, box.width)
  const m = ctx.measureText(text, style, width)
  const lineH = style.size * style.lineHeight
  const lines = m.lines.map((line, i) => {
    const lw = Math.min(width, line.width)
    return {
      x: alignedX(box.x, width, lw, align),
      y: box.y + (line.top ?? i * lineH),
      width: lw,
      height: lineH,
      line,
    }
  })

  if (align === 'start') {
    return {
      nodes: [
        {
          k: 'text',
          part: opts.part,
          box: { x: box.x, y: box.y, width, height: m.height },
          lines: m.lines,
          style,
          ...(opts.propPath ? { propPath: opts.propPath } : {}),
        },
      ],
      height: m.height,
      lineCount: m.lines.length,
      lines,
    }
  }

  const nodes: LayoutNode[] = m.lines.map((line, i) => {
    const g = lines[i]
    const top = line.top ?? i * lineH
    return {
      k: 'text',
      part: opts.linePart ? opts.linePart(i) : `${opts.part}[${i}]`,
      box: { x: g.x, y: box.y + top, width: Math.max(1, Math.min(g.width + 1, box.x + width - g.x)), height: lineH },
      lines: [{ ...line, top: 0, baseline: line.baseline - top }],
      style,
      ...(opts.propPath ? { propPath: opts.propPath } : {}),
      // CMP1 (X3): the lines are one centred / end-aligned paragraph (renderers ignore it).
      align,
    } as LayoutNode
  })
  return { nodes, height: m.height, lineCount: m.lines.length, lines }
}
