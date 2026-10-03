/**
 * Pure layout for tls.x.header — one quiet running-header line: label at the left, meta at the right,
 * an optional hairline below.
 *
 * Both texts are single lines placed from glyph-table widths; when they do not fit together the longer
 * one is ellipsised (never wrapped, never overlapping). The rule sits under the text.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { LayoutContext, LayoutNode } from '../../../types'
import type { HeaderProps } from './schema'
import { enumOf, str } from '../../data/_chart/kit'
import { isShown } from '../../../schema-helpers'
import { HAIR, RULE_GAP, fitText, hairline, runNode, textWidth } from '../_kit'

const GAP = 24
/** A node box is 6% + 4 px wider than its text (see runNode). */
const boxW = (w: number) => Math.ceil(w * 1.06 + 4)

export function layout(props: HeaderProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, Number.isFinite(ctx.box.width) ? ctx.box.width : 1)
  const tone = enumOf(props.tone, ['muted', 'accent'] as const, 'muted')
  const base = ctx.resolveText('caption')
  const labelStyle = { ...base, color: ctx.resolveColor(tone === 'accent' ? 'accent' : 'textMuted').color }
  const metaStyle = { ...base, color: ctx.resolveColor('textMuted').color }
  const label = str(props.label).replace(/\s+/g, ' ').trim()
  const meta = str(props.meta).replace(/\s+/g, ' ').trim()
  const showRule = isShown(props, 'showRule') && props.showRule === true

  // Room for the texts: each box is 6% + 4 px wider than its glyphs.
  const room = (W - (label && meta ? GAP : 0) - 8) / 1.06
  let lw = label ? textWidth(label, labelStyle) : 0
  let mw = meta ? textWidth(meta, metaStyle) : 0
  if (lw + mw > room) {
    const half = room / 2
    if (lw > half && mw > half) lw = mw = half
    else if (lw > half) lw = Math.max(0, room - mw)
    else mw = Math.max(0, room - lw)
  }
  const l = label ? fitText(label, labelStyle, lw) : ''
  const m = meta ? fitText(meta, metaStyle, mw) : ''

  const children: LayoutNode[] = []
  let textH = 0
  if (l) {
    const r = runNode(ctx, l, labelStyle, 0, 0, 'label', 'label')
    textH = Math.max(textH, r.node.box.height)
    children.push(r.node)
  }
  if (m) {
    const w = boxW(textWidth(m, metaStyle))
    const r = runNode(ctx, m, metaStyle, Math.max(0, W - w), 0, 'meta', 'meta')
    textH = Math.max(textH, r.node.box.height)
    children.push(r.node)
  }
  const height = showRule ? textH + RULE_GAP + HAIR : textH
  if (showRule) children.push(hairline(ctx, 0, textH + RULE_GAP, W, HAIR, 'rule'))
  return { k: 'group', part: 'root', box: { x: 0, y: 0, width: W, height }, children }
}
