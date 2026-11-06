/**
 * tls.c.sidenotes — spro sprint 2026-11b S08-12: a main text of 2–3 paragraphs with 2–4 margin notes
 * (a definition, a warning, a reference) beside the paragraph each belongs to.
 */
import type { BlockSchema, LayoutContext, LayoutNode } from '../../../types'
import { enumSlot } from '../../data/_chart/schema-kit'
import { composeFlat, measureHeights, pick, type Piece } from '../_kit'
import { defineRichBlock, objectOf, rows, txt } from '../_rich-block'

export interface SidenotesProps extends Record<string, unknown> {
  text: string
  notes: Array<{ label: string; text: string; at?: number }>
  variant?: 'right-margin' | 'left-margin'
}
const VARIANTS = ['right-margin', 'left-margin'] as const

export const schema: BlockSchema = {
  text: { type: { kind: 'text', maxChars: 640 }, role: 'content', label: 'Text', required: true, guidance: '2–3 paragraphs separated by a blank line (≤ 640 chars in all).' },
  notes: {
    type: { kind: 'list', of: objectOf({ label: { kind: 'text', maxChars: 20 }, text: { kind: 'text', maxChars: 120 }, at: { kind: 'number', min: 0, max: 2 } }), min: 2, max: 4 },
    role: 'content',
    label: 'Margin notes',
    required: true,
    guidance: '`label` (e.g. "Definition", "Careful"), `text` (≤ 120), `at` = the paragraph it belongs to (0 = first).',
  },
  variant: enumSlot([...VARIANTS], 'Variant', 'right-margin (default) or left-margin.'),
}

export const defaults: SidenotesProps = {
  text: 'A hash table stores each key at a position computed from the key itself, so looking a key up takes about the same time however many keys there are.\n\nTwo keys can land on the same position. The table then keeps both, in a short list or in the next free slot, and a lookup checks them one by one.',
  notes: [
    { label: 'Definition', text: 'Hash function: turns a key into a position in the table.', at: 0 },
    { label: 'Careful', text: 'A table that is too full makes collisions frequent and lookups slow.', at: 1 },
  ],
  variant: 'right-margin',
}

function paragraphs(text: string): string[] {
  return text.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean).slice(0, 3)
}

function layoutSidenotes(p: SidenotesProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(0, ctx.box.width) || 0
  const gap = ctx.tokens.space.lg
  const colGap = ctx.tokens.space.xl * 1.5
  const mw = Math.round((W - colGap) * 0.66)
  const nw = W - colGap - mw
  const left = pick(p.variant, VARIANTS, 'right-margin') === 'left-margin'
  const mx = left ? nw + colGap : 0
  const nx = left ? 0 : mw + colGap
  const paras = paragraphs(txt(p.text, 640))
  const notes = rows<{ label?: unknown; text?: unknown; at?: unknown }>(p.notes, 4)
  const pieces: Piece[] = []
  const tops: number[] = []
  let y = 0
  paras.forEach((t, i) => {
    const spec = { id: `item[${i}].text`, type: 'tls.t.body', props: { text: t, size: 'lead' } }
    const [h] = measureHeights(ctx, [spec], mw)
    tops.push(y)
    pieces.push({ id: spec.id, spec, box: { x: mx, y, width: mw, height: h } })
    y += h + gap
  })
  const mainH = Math.max(0, y - gap)
  let ny = 0
  notes.forEach((n, i) => {
    const at = Math.max(0, Math.min(paras.length - 1, typeof n.at === 'number' ? Math.round(n.at) : i))
    const spec = { id: `note[${i}]`, type: 'tls.t.callout', props: { title: txt(n.label, 20) || 'Note', text: txt(n.text, 120), variant: 'info', fill: 'tint' } }
    const [h] = measureHeights(ctx, [spec], nw)
    const top = Math.max(ny, tops[at] ?? 0)
    pieces.push({ id: `note[${i}]`, spec, box: { x: nx, y: top, width: nw, height: h } })
    ny = top + h + ctx.tokens.space.md
  })
  return composeFlat(ctx, pieces, Math.max(1, mainH, ny - ctx.tokens.space.md))
}

export const tlsCSidenotes = defineRichBlock<SidenotesProps>({
  type: 'tls.c.sidenotes',
  name: 'Text with side notes',
  summary: 'A main text of 2–3 paragraphs with margin notes beside the paragraphs they explain.',
  keywords: ['sidenotes', 'margin notes', 'reading', 'text', 'annotations', 'ghi chú lề', 'bài đọc'],
  category: 'text',
  shortDescription: 'Paragraphs with margin notes beside them',
  related: ['tls.t.body', 'tls.c.explainer', 'tls.t.callout'],
  schema,
  defaults,
  size: { preferred: [1600, 800], min: [960, 620] },
  fillPolicy: ['type'],
  describe: {
    when: 'A reading slide: 2–3 paragraphs of explanation with short notes in the margin (a definition, a warning, a source) beside the paragraph they belong to.',
    avoid: 'A paragraph alone: tls.t.body. An idea with an example box: tls.c.explainer.',
    example: { id: 'b_sidenotes', type: 'tls.c.sidenotes', props: { text: defaults.text, notes: defaults.notes } },
  },
  sections: { foot: ['note'] },
  shape: (p) => ({
    items: paragraphs(txt(p.text, 640)).map((text) => ({ text })),
    opts: {},
    foot: rows<{ label?: unknown; text?: unknown }>(p.notes, 4).map((n, i) => ({ spec: { id: `note[${i}]`, type: 'tls.t.callout', props: { title: txt(n.label, 20) || 'Note', text: txt(n.text, 120), variant: 'info', fill: 'tint' } } })),
    layout: (ctx) => layoutSidenotes(p, ctx),
  }),
})
