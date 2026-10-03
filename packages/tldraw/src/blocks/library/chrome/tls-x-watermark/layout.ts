/**
 * Pure layout for tls.x.watermark — one large, faint, horizontal line of text centred in its box.
 *
 * The text is sized to fill about 90% of the box width (and 80% of its height) and drawn in the
 * `text` colour at 7% / 14% alpha (`rgba`). `LayoutNode` has no rotation, so there is no diagonal
 * variant: the plan's `angle: diagonal` is blocked on that. Place the block first in its region (or
 * under the content) so the content reads on top of it.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { LayoutContext, LayoutNode } from '../../../types'
import type { WatermarkProps } from './schema'
import { enumOf, str } from '../../data/_chart/kit'
import { side } from '../../media/_kit'
import { tryHexToRgb } from '../../../color-math'
import { runNode, textWidth } from '../_kit'

export const ALPHA = { faint: 0.07, soft: 0.14 } as const

/** `rgba(...)` of a hex colour at `alpha`; anything that is not a hex colour is returned unchanged. */
export function withAlpha(color: string, alpha: number): string {
  const c = tryHexToRgb(color)
  return c ? `rgba(${c.r},${c.g},${c.b},${alpha})` : color
}

export function layout(props: WatermarkProps, ctx: LayoutContext): LayoutNode {
  const W = side(ctx.box.width)
  const H = side(ctx.box.height)
  const strength = enumOf(props.opacity, ['faint', 'soft'] as const, 'faint')
  const text = str(props.text).replace(/\s+/g, ' ').trim()
  const root = (children: LayoutNode[]): LayoutNode => ({ k: 'group', part: 'root', box: { x: 0, y: 0, width: W, height: H }, children })
  if (!text || W < 1 || H < 1) return root([])

  const base = { ...ctx.resolveText('display'), color: withAlpha(ctx.resolveColor('text').color, ALPHA[strength]) }
  const w0 = textWidth(text, base) || 1
  const k = Math.min((W * 0.9) / w0, (H * 0.8) / (base.size * base.lineHeight))
  const size = Math.max(4, Math.floor(base.size * k))
  const style = { ...base, size }
  const w = Math.min(W, textWidth(text, style))
  const probe = runNode(ctx, text, style, 0, 0, 'text', 'text')
  const bw = Math.min(W, probe.node.box.width)
  const x = Math.max(0, (W - w) / 2)
  const nodeX = Math.min(x, W - bw)
  const y = Math.max(0, (H - probe.node.box.height) / 2)
  const node = runNode(ctx, text, style, Math.max(0, nodeX), y, 'text', 'text').node
  node.box = { ...node.box, width: Math.min(node.box.width, W - Math.max(0, nodeX)) }
  return root([node])
}
