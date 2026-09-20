/**
 * Layout for tls.v.counter — animated numeric counter.
 *
 * Phase 7: Renders large number text, animation handled in motion.
 */

import type { LayoutContext, LayoutNode } from '../../../types'
import type { CounterProps } from './schema'

export function layout(props: CounterProps, ctx: LayoutContext): LayoutNode {
  const W = ctx.box.width
  const H = ctx.box.height
  const value = ctx.style?.value ?? props.to

  const textStyle = ctx.resolveText('heading-xl', {
    family: ctx.tokens.fontFamily ?? '"Source Sans Pro", sans-serif',
    color: ctx.resolveColor('on').color,
  })

  return {
    k: 'text',
    box: { x: 0, y: 0, width: W, height: H },
    part: 'counter-value',
    text: {
      ...textStyle,
      text: String(Math.round(value)),
      align: 'center',
    },
  }
}