/**
 * Pure layout for tls.x.rule — one thin filled rect used as a divider.
 *
 * A `rect`, not a `line` node (`line` is unreliable in the DOM renderer). Horizontal rules are as wide
 * as the box (or a 64 px bar for `short`) and as tall as their weight; vertical rules swap the two.
 * The gradient is a two-stop `linearGradient` from `accent` to `accent2` along the rule.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { LayoutContext, LayoutNode, Paint } from '../../../types'
import type { RuleProps } from './schema'
import { enumOf, side } from '../../media/_kit'

export const RULE_PX = { hairline: 2, md: 4, bold: 8 } as const
/** CMP3 (P14): a separator dashes 1:1; dash length per thickness (hairline 6, md 12, bold 24). */
export const RULE_DASH = 3
export const SHORT_PX = 64

export function layout(props: RuleProps, ctx: LayoutContext): LayoutNode {
  const W = side(ctx.box.width)
  const H = side(ctx.box.height)
  const axis = enumOf(props.axis, ['horizontal', 'vertical'] as const, 'horizontal')
  const weight = enumOf(props.weight, ['hairline', 'md', 'bold'] as const, 'hairline')
  const tone = enumOf(props.tone, ['line', 'accent', 'gradient'] as const, 'line')
  const length = enumOf(props.length, ['full', 'short'] as const, 'full')
  const t = RULE_PX[weight]
  const horizontal = axis === 'horizontal'
  const along = horizontal ? W : H
  const len = length === 'short' ? Math.min(SHORT_PX, along) : along
  const width = horizontal ? len : Math.min(t, W)
  const height = horizontal ? Math.min(t, H > 0 ? Math.max(H, 0) : t) : len
  const fill: Paint =
    tone === 'gradient'
      ? {
          type: 'linearGradient',
          angle: horizontal ? 90 : 180,
          stops: [
            { color: ctx.resolveColor('accent').color, at: 0 },
            { color: ctx.resolveColor('accent2').color, at: 1 },
          ],
        }
      : { type: 'solid', color: ctx.resolveColor(tone === 'accent' ? 'accent' : 'line').color }
  if (props.dash === true && len > 0) {
    // CMP3: a dashed rule is a stroked path along the centre line (`Stroke.dash`, butt caps), in the
    // same box and part as the solid bar, so the wipe motion and the anchor geometry are unchanged.
    // A stroke has one colour: a gradient rule dashes in accent.
    const color = fill.type === 'solid' ? fill.color : ctx.resolveColor('accent').color
    const d = horizontal ? `M0 ${height / 2}L${width} ${height / 2}` : `M${width / 2} 0L${width / 2} ${height}`
    const seg = t * RULE_DASH
    const dashed: LayoutNode = {
      k: 'path',
      part: horizontal ? 'rule' : 'rule-v',
      box: { x: 0, y: 0, width, height },
      d,
      stroke: { color, width: horizontal ? height : width, dash: [seg, seg] },
    }
    return { k: 'group', part: 'root', box: { x: 0, y: 0, width, height }, children: [dashed] }
  }
  const bar: LayoutNode = {
    k: 'rect',
    // A vertical rule is its own motion part so it can draw top-down along its length (M1b/E7).
    part: horizontal ? 'rule' : 'rule-v',
    box: { x: 0, y: 0, width, height },
    fill,
    ...(weight === 'hairline' ? {} : { radius: Math.min(t, width, height) / 2 }),
  } as LayoutNode
  return { k: 'group', part: 'root', box: { x: 0, y: 0, width, height }, children: [bar] }
}
