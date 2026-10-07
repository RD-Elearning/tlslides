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
