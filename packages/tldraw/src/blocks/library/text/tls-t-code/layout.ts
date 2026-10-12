/**
 * Pure layout for tls.t.code — a padded panel in the surface colour, one text leaf per code line
 * in Source Code Pro (indentation kept: leading spaces are measured), optional line numbers in a
 * muted gutter, highlighted lines on an accent tint, the language label at the top right and a
 * caption under the panel.
 *
 * Size: body type; the caption size when the longest line does not fit at body; below that the
 * line wraps (and the oracle reports a tall block). Pure and DOM-free.
 */

import type { LayoutContext, LayoutNode, ResolvedTextStyle } from '../../../types'
import type { CodeProps } from './schema'
import { str } from '../_engine/rich'
import { tintOf } from '../_engine/color'
import { isShown } from '../../../schema-helpers'

export const MONO = '"Source Code Pro", monospace'
export const MAX_LINES = 16

/** "2, 5-6" → {2, 5, 6}. */
export function highlighted(spec: unknown): Set<number> {
  const out = new Set<number>()
  for (const part of str(spec).split(',')) {
    const m = part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/)
    if (!m) continue
    const a = Number(m[1])
    const b = m[2] ? Number(m[2]) : a
    for (let i = Math.min(a, b); i <= Math.min(Math.max(a, b), a + 40); i++) out.add(i)
  }
  return out
}

export function layout(props: CodeProps, ctx: LayoutContext): LayoutNode {
  const width = Math.max(1, ctx.box.width)
  const sp = ctx.tokens.space
  const surface = ctx.resolveColor('surface').color
  const text = ctx.resolveColor('text').color
  const muted = ctx.resolveColor('textMuted').color
  const accent = ctx.resolveColor('accent').color
  const lines = str(props.code).replace(/\t/g, '  ').split('\n').slice(0, MAX_LINES)
  while (lines.length > 1 && !lines[lines.length - 1].trim()) lines.pop()
  const marks = highlighted(props.highlight)
  const numbers = props.lineNumbers !== false
  const pad = sp.lg

  const styleAt = (token: 'body' | 'caption'): ResolvedTextStyle => ({ ...ctx.resolveText(token), family: MONO, letterSpacing: 0, color: text })
  const gutterOf = (style: ResolvedTextStyle) => (numbers ? ctx.measureText(String(lines.length), style).width + sp.md : 0)
  let style = styleAt('body')
  const longest = (s: ResolvedTextStyle) => Math.max(0, ...lines.map((l) => ctx.measureText(l || ' ', s).width))
  if (longest(style) > width - pad * 2 - gutterOf(style)) style = styleAt('caption')
  const gutter = gutterOf(style)
  const codeW = Math.max(1, width - pad * 2 - gutter)
  const numStyle: ResolvedTextStyle = { ...style, color: muted }

  const children: LayoutNode[] = []
  const lang = str(props.language)
  let y = pad
  if (lang) {
    const ls: ResolvedTextStyle = { ...ctx.resolveText('caption'), color: muted }
    const m = ctx.measureText(lang, ls)
    children.push({ k: 'text', part: 'language', box: { x: width - pad - m.width - 1, y: sp.sm, width: m.width + 1, height: m.height }, lines: m.lines, style: ls, propPath: 'language' })
    y = Math.max(y, sp.sm + m.height + sp.xs)
  }
  const rows: LayoutNode[] = []
  lines.forEach((line, i) => {
    const m = ctx.measureText(line || ' ', style, codeW)
    if (marks.has(i + 1)) {
      rows.push({ k: 'rect', part: `mark[${i}]`, box: { x: pad / 2, y, width: width - pad, height: m.height }, fill: { type: 'solid', color: tintOf(surface, accent, 0.22) }, radius: ctx.tokens.radius.sm })
    }
    if (numbers) {
      const n = ctx.measureText(String(i + 1), numStyle)
      rows.push({ k: 'text', part: `number[${i}]`, box: { x: pad, y, width: n.width + 1, height: n.height }, lines: n.lines, style: numStyle })
    }
    rows.push({ k: 'text', part: `line[${i}]`, box: { x: pad + gutter, y, width: codeW, height: m.height }, lines: m.lines, style, propPath: 'code' })
    y += m.height
  })
  const panelH = y + pad
  children.unshift({ k: 'rect', part: 'panel', box: { x: 0, y: 0, width, height: panelH }, fill: { type: 'solid', color: surface }, radius: ctx.tokens.radius.md })
  // marks first so the code paints over them
  children.push(...rows.filter((r) => r.k === 'rect'), ...rows.filter((r) => r.k !== 'rect'))

  let height = panelH
  const caption = isShown(props, 'showCaption') ? str(props.caption) : ''
  if (caption) {
    const cs: ResolvedTextStyle = { ...ctx.resolveText('caption'), color: muted }
    const m = ctx.measureText(caption, cs, width)
    height += sp.sm
    children.push({ k: 'text', part: 'caption', box: { x: 0, y: height, width, height: m.height }, lines: m.lines, style: cs, propPath: 'caption' })
    height += m.height
  }
  return { k: 'group', part: 'root', box: { x: 0, y: 0, width, height }, children }
}
