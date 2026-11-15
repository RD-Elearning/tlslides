/**
 * tls.c.infographic-row — spro sprint 2026-11b S09-3: a row of 3–5 columns, each an icon (or a step
 * number), a keyword or figure and a caption, joined by a thin line behind the icons. For presented
 * decks: little text, read at a glance.
 */
import type { BlockSchema, BlockSpec, LayoutContext, LayoutNode } from '../../../types'
import { enumSlot } from '../../data/_chart/schema-kit'
import { composeFlat, measureHeights, pick, type Piece } from '../_kit'
import { defineRichBlock, objectOf, rows, txt } from '../_rich-block'

export interface InfographicRowProps extends Record<string, unknown> {
  items: Array<{ icon?: string; head: string; text?: string }>
  variant?: 'line' | 'circles' | 'steps'
}
const VARIANTS = ['line', 'circles', 'steps'] as const

export const schema: BlockSchema = {
  items: {
    type: { kind: 'list', of: objectOf({ icon: { kind: 'icon' }, head: { kind: 'text', maxChars: 24 }, text: { kind: 'text', maxChars: 90 } }), min: 3, max: 5 },
    role: 'content',
    label: 'Columns',
    required: true,
    guidance: 'Each: `icon`, `head` = a keyword or a figure (≤ 24), `text` = a caption (≤ 90).',
  },
  variant: enumSlot([...VARIANTS], 'Variant', 'line (default: icons on a line), circles (icons in large circles) or steps (numbers instead of icons).'),
}

export const defaults: InfographicRowProps = {
  items: [
    { icon: 'sun', head: 'Sunlight', text: 'Leaves catch the light energy.' },
    { icon: 'droplet', head: 'Water', text: 'Roots draw water up the stem.' },
    { icon: 'wind', head: 'Carbon dioxide', text: 'Air enters through tiny pores.' },
    { icon: 'leaf', head: 'Sugar + oxygen', text: 'The plant stores sugar and releases oxygen.' },
  ],
  variant: 'line',
}

type Item = { icon: string; head: string; text: string }
const itemsOf = (p: InfographicRowProps): Item[] =>
  rows<{ icon?: unknown; head?: unknown; text?: unknown }>(p.items, 5).map((x) => ({ icon: typeof x.icon === 'string' && x.icon ? x.icon : 'circle', head: txt(x.head, 24), text: txt(x.text, 90) }))

const RUNGS = [
  { head: 'subheading', text: 'lead' },
  { head: 'subheading', text: 'body' },
  { head: 'lead', text: 'body' },
] as const

function markerOf(v: (typeof VARIANTS)[number], it: Item, i: number): BlockSpec {
  if (v === 'steps') return { id: `item[${i}].marker`, type: 'tls.t.marker', props: { value: String(i + 1), tone: 'solid', size: 'lg' } }
  return { id: `item[${i}].marker`, type: 'tls.m.icon', props: { icon: it.icon, size: v === 'circles' ? 'xl' : 'lg', iconStyle: 'disc' } }
}

function layoutRow(p: InfographicRowProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(0, ctx.box.width) || 0
  const H = Math.max(0, ctx.box.height) || 0
  const v = pick(p.variant, VARIANTS, 'line')
  const items = itemsOf(p)
  const n = Math.max(1, items.length)
  const sp = ctx.tokens.space
  const gap = sp.lg
  const cw = Math.max(60, (W - gap * (n - 1)) / n)
  const md = v === 'circles' ? 160 : v === 'steps' ? 72 : 112
  let best: { pieces: Piece[]; height: number } | undefined
  for (const r of RUNGS) {
    const pieces: Piece[] = []
    const markers = items.map((it, i) => markerOf(v, it, i))
    const mh = Math.max(...markers.map((m) => measureHeights(ctx, [m], md)[0]))
    // the line behind the markers, from the first centre to the last
    if (n > 1) {
      const y = mh / 2 - 2
      pieces.push({ id: 'line', spec: { id: 'line', type: 'tls.x.rule', props: { axis: 'horizontal', weight: 'md', tone: v === 'line' ? 'accent' : 'line' } }, box: { x: cw / 2, y, width: W - cw, height: 4 } })
    }
    let height = mh
    items.forEach((it, i) => {
      const x = i * (cw + gap)
      pieces.push({ id: `item[${i}].marker`, spec: markers[i], box: { x: x + (cw - md) / 2, y: 0, width: md, height: mh } })
      const head: BlockSpec = { id: `item[${i}].head`, type: 'tls.t.title', props: { text: it.head, size: r.head, align: 'center' } }
      const text: BlockSpec | undefined = it.text ? { id: `item[${i}].text`, type: 'tls.t.body', props: { text: it.text, size: r.text, align: 'center' } } : undefined
      let y = mh + sp.md
      const [hh] = measureHeights(ctx, [head], cw)
      pieces.push({ id: head.id, spec: head, box: { x, y, width: cw, height: hh } })
      y += hh + sp.xs
      if (text) {
        const [th] = measureHeights(ctx, [text], cw)
        pieces.push({ id: text.id, spec: text, box: { x, y, width: cw, height: th } })
        y += th
      }
      height = Math.max(height, y)
    })
    best = { pieces, height }
    if (H <= 0 || height <= H) break
  }
  return composeFlat(ctx, best!.pieces, Math.max(1, best!.height))
}

export const tlsCInfographicRow = defineRichBlock<InfographicRowProps>({
  type: 'tls.c.infographic-row',
  name: 'Infographic row',
  summary: 'A row of 3–5 icons, each with a keyword or figure and a caption, joined by a line.',
  keywords: ['infographic', 'icons', 'row', 'overview', 'at a glance', 'biểu đồ thông tin', 'tổng quan'],
  category: 'list',
  shortDescription: 'A row of icons with keywords and captions joined by a line',
  related: ['tls.c.feature-grid', 'tls.m.icon-list', 'tls.c.steps', 'tls.c.number-grid'],
  schema,
  defaults,
  size: { preferred: [1600, 520], min: [960, 380] },
  fillPolicy: ['type'],
  describe: {
    when: 'A presented slide that shows 3–5 parts, inputs or stages at a glance: an icon, a keyword or figure and a short caption each.',
    avoid: 'Points that each need a sentence or more: tls.c.key-points. Ordered steps with instructions: tls.c.process-detail.',
    example: { id: 'b_infographic_row', type: 'tls.c.infographic-row', props: { items: defaults.items.slice(0, 3) } },
  },
  sections: { head: ['line'] },
  shape: (p) => ({
    items: itemsOf(p).map((it) => ({ lead: it.head, text: it.text, marker: it.icon })),
    opts: { columns: Math.min(4, Math.max(1, itemsOf(p).length)) as 1 | 2 | 3 | 4, marker: pick(p.variant, VARIANTS, 'line') === 'steps' ? 'number' : 'icon', markerSide: 'top' },
    layout: (ctx) => layoutRow(p, ctx),
  }),
})
