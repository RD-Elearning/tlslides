/**
 * Pure layout function for tls.x.page-number — page number chrome.
 *
 * One muted caption line: "3" or, with `total`, "3 / 24". The text box hugs the glyphs (browser-true
 * widths from the chrome kit) and sits at the start, centre or end of the block box, so `align`
 * does what the inspector says and the digits are never clipped by a 20 px high box (RV11).
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { LayoutContext, LayoutNode } from '../../../types'
import type { PageNumberProps } from './schema'
import { runNode } from '../_kit'

export function layout(props: PageNumberProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, ctx.box.width)
  const align = props.align === 'start' || props.align === 'end' ? props.align : 'center'
  const style = { ...ctx.resolveText('caption'), color: ctx.resolveColor('textMuted').color }
  const n = Math.max(1, Math.round(Number(props.number) || 1))
  const total = Math.round(Number(props.total) || 0)
  const text = total > 0 ? `${n} / ${Math.max(total, n)}` : String(n)

  const probe = runNode(ctx, text, style, 0, 0, 'text', 'number')
  const w = Math.min(W, probe.width)
  const x = align === 'start' ? 0 : align === 'end' ? W - w : (W - w) / 2
  const node = runNode(ctx, text, style, Math.max(0, x), 0, 'text', 'number')
  if (node.node.k === 'text') node.node.box = { ...node.node.box, width: w }
  return { k: 'group', box: { x: 0, y: 0, width: W, height: node.node.box.height }, part: 'root', children: [node.node] }
}
