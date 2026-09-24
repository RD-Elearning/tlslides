/**
 * Pure layout function for tls.x.page-number — page number chrome.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { LayoutContext, LayoutNode, TypeToken } from '../../../types'
import type { PageNumberProps } from './schema'

export function layout(props: PageNumberProps, ctx: LayoutContext): LayoutNode {
  const typeToken = 'caption' as TypeToken
  const align = props.align ?? 'center'

  const style = ctx.resolveText(typeToken)

  const text = String(props.number ?? 1)
  const m = ctx.measureText(text, style, ctx.box.width)

  const textNode: LayoutNode = {
    k: 'text',
    part: 'text',
    box: { x: 0, y: 0, width: ctx.box.width, height: m.height },
    lines: m.lines,
    style,
    propPath: 'number',
  }

  return { k: 'group', box: { x: 0, y: 0, width: ctx.box.width, height: m.height }, part: 'root', children: [textNode] }
}