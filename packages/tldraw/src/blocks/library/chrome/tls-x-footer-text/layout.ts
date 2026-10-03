/**
 * Pure layout for tls.x.footer-text — one muted footer line: up to three items, optional separator
 * glyphs and an optional hairline above.
 *
 * Items and separators are separate single-line text nodes positioned from glyph-table widths (an
 * item longer than its share is ellipsised, never wrapped). `spread` pins the first item to the left
 * edge and the last to the right; a middle item sits at the centre of the free space.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { CapacityReport, LayoutContext, LayoutNode, Size } from '../../../types'
import type { FooterTextProps } from './schema'
import { FOOTER_MAX_ITEMS } from './schema'
import { asArr, enumOf, str } from '../../data/_chart/kit'
import { isShown } from '../../../schema-helpers'
import { HAIR, RULE_GAP, fitText, hairline, runNode, textWidth } from '../_kit'

const GAP = 16

export function layout(props: FooterTextProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, Number.isFinite(ctx.box.width) ? ctx.box.width : 1)
  const align = enumOf(props.align, ['start', 'center', 'end', 'spread'] as const, 'start')
  const sepKind = enumOf(props.separator, ['dot', 'bar', 'none'] as const, 'dot')
  const style = { ...ctx.resolveText('footnote'), color: ctx.resolveColor('textMuted').color }
  const sepStyle = { ...style, color: ctx.resolveColor('line').color }
  const raw = asArr<unknown>(props.items).map(str).filter((s) => s.trim() !== '').slice(0, FOOTER_MAX_ITEMS)
  const showRule = isShown(props, 'showRule') && props.showRule === true
  const top = showRule ? HAIR + RULE_GAP : 0
  const sepGlyph = sepKind === 'dot' ? '·' : sepKind === 'bar' ? '|' : ''
  const useSep = align !== 'spread' && sepGlyph !== ''
  const sepW = useSep ? runNode(ctx, sepGlyph, sepStyle, 0, 0, 'sep').width : 0
  const between = useSep ? 2 * GAP + sepW : GAP * 2

  // Each item gets an equal share of the width left after the gaps.
  const n = raw.length
  // A node box is 6% + 4 px wider than its text (see runNode), so trim to that.
  const share = n > 0 ? Math.max(1, ((W - between * (n - 1)) / n - 4) / 1.06) : 0
  const probe = raw.map((t, i) => runNode(ctx, fitText(t, style, share), style, 0, 0, `item[${i}]`, `items.${i}`))
  const items = raw.map((t, i) => ({ text: fitText(t, style, share), i }))
  const widths = probe.map((p) => p.width)
  const total = widths.reduce((a, b) => a + b, 0) + between * Math.max(0, n - 1)

  let xs: number[] = []
  if (align === 'spread') {
    xs = widths.map((w, i) => (i === 0 ? 0 : i === n - 1 ? W - w : (W - w) / 2))
  } else {
    let x = align === 'center' ? (W - total) / 2 : align === 'end' ? W - total : 0
    x = Math.max(0, x)
    for (let i = 0; i < n; i++) {
      xs.push(x)
      x += widths[i] + between
    }
  }

  const children: LayoutNode[] = []
  if (showRule) children.push(hairline(ctx, 0, 0, W, HAIR, 'rule'))
  let textH = 0
  items.forEach(({ text, i }) => {
    const r = runNode(ctx, text, style, xs[i], top, `item[${i}]`, `items.${i}`)
    textH = Math.max(textH, r.node.box.height)
    children.push(r.node)
    if (useSep && i < n - 1) {
      const sx = xs[i] + widths[i] + GAP
      children.push(runNode(ctx, sepGlyph, sepStyle, sx, top, `sep[${i}]`).node)
    }
  })
  return { k: 'group', part: 'root', box: { x: 0, y: 0, width: W, height: top + textH }, children }
}

/** Fits when there are at most three items and the whole line is wide enough to show them untrimmed. */
export function capacity(props: FooterTextProps, box: Size, ctx: LayoutContext): CapacityReport {
  const style = ctx.resolveText('footnote')
  const all = asArr<unknown>(props.items).map(str).filter((s) => s.trim() !== '')
  const used = all.reduce((a, t) => a + textWidth(t, style), 0) + Math.max(0, all.length - 1) * 2 * GAP
  const W = Math.max(1, box.width)
  const fits = all.length <= FOOTER_MAX_ITEMS && used <= W
  return {
    fits,
    budget: {
      items: { max: FOOTER_MAX_ITEMS, used: all.length, unit: 'items' },
    },
    remedy: fits ? [] : [{ kind: 'truncate', slot: 'items' }],
  }
}
