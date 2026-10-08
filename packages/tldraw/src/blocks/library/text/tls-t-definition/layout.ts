/**
 * Pure layout for tls.t.definition — a term, its meta line, definition and example.
 *
 * `stacked` runs everything down one column. `inline` puts the term (and its meta line) in a left
 * column and the definition and example in a right column; boxes narrower than 560 fall back to
 * stacked. The meta line holds the pronunciation and the part of speech side by side.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { LayoutContext, LayoutNode, ResolvedTextStyle } from '../../../types'
import type { DefinitionProps } from './schema'
import { str, toMeasurable } from '../_engine/rich'
import { isShown } from '../../../schema-helpers'

const INLINE_MIN_WIDTH = 560

export function layout(props: DefinitionProps, ctx: LayoutContext): LayoutNode {
  const width = Math.max(1, ctx.box.width)
  const sp = ctx.tokens.space
  const text = ctx.resolveColor('text').color
  const muted = ctx.resolveColor('textMuted').color
  const accent = ctx.resolveColor('accent').color
  const inline = props.layout === 'inline' && width >= INLINE_MIN_WIDTH

  const termStyle: ResolvedTextStyle = {
    ...ctx.resolveText('heading'),
    color: props.termTone === 'text' ? text : accent,
  }
  const metaStyle: ResolvedTextStyle = { ...ctx.resolveText('caption'), color: muted }
  const defStyle: ResolvedTextStyle = { ...ctx.resolveText('lead'), color: text }
  const exStyle: ResolvedTextStyle = { ...ctx.resolveText('body'), color: muted }

  const term = str(props.term)
  const pron = isShown(props, 'showPronunciation') ? str(props.pronunciation) : ''
  const pos = str(props.partOfSpeech)
  const example = isShown(props, 'showExample') ? str(props.example) : ''

  const leftW = inline
    ? Math.min(width * 0.4, Math.max(width * 0.25, ctx.measureText({ runs: [{ text: term, bold: true }] }, termStyle).width + 2))
    : width
  const colGap = sp.lg
  const rightX = inline ? leftW + colGap : 0
  const rightW = Math.max(1, width - rightX)

  const children: LayoutNode[] = []
  // ── left column (or the top of the stack): term + meta ──
  let yl = 0
  const tm = ctx.measureText({ runs: [{ text: term, bold: true }] }, termStyle, leftW)
  children.push({ k: 'text', part: 'term', box: { x: 0, y: yl, width: leftW, height: tm.height }, lines: tm.lines, style: termStyle, propPath: 'term' })
  yl += tm.height

  if (pron || pos) {
    yl += sp['2xs']
    let x = 0
    const place = (part: string, value: string, italic: boolean, propPath: string) => {
      const m = ctx.measureText(italic ? { runs: [{ text: value, italic: true }] } : value, metaStyle)
      const w = Math.min(m.width, Math.max(1, leftW - x))
      children.push({ k: 'text', part, box: { x, y: yl, width: w + 1, height: m.height }, lines: m.lines, style: metaStyle, propPath })
      x += w + sp.sm
      return m.height
    }
    let h = 0
    if (pron) h = Math.max(h, place('pronunciation', pron, false, 'pronunciation'))
    if (pos) h = Math.max(h, place('meta', pos, true, 'partOfSpeech'))
    yl += h
  }

  // ── right column (or the rest of the stack): definition + example ──
  let yr = inline ? 0 : yl + sp.md
  const dm = ctx.measureText(toMeasurable(props.definition), defStyle, rightW)
  children.push({ k: 'text', part: 'definition', box: { x: rightX, y: yr, width: rightW, height: dm.height }, lines: dm.lines, style: defStyle, propPath: 'definition' })
  yr += dm.height

  if (example) {
    yr += sp.md
    const bar = 4
    const em = ctx.measureText({ runs: [{ text: example, italic: true }] }, exStyle, Math.max(1, rightW - bar - sp.sm))
    children.push({
      k: 'rect',
      part: 'example.bar',
      box: { x: rightX, y: yr, width: bar, height: em.height },
      fill: { type: 'solid', color: accent },
      radius: bar / 2,
    })
    children.push({
      k: 'text',
      part: 'example',
      box: { x: rightX + bar + sp.sm, y: yr, width: Math.max(1, rightW - bar - sp.sm), height: em.height },
      lines: em.lines,
      style: exStyle,
      propPath: 'example',
    })
    yr += em.height
  }

  const height = inline ? Math.max(yl, yr) : yr
  return { k: 'group', part: 'root', box: { x: 0, y: 0, width, height }, children }
}
