/**
 * tls.c.closing-recap — spro sprint 2026-11b S09-12 (frame): a teaching closing — 2–3 takeaways as
 * support and the one next action (homework, a question to carry home) landed on its own panel
 * (`compose-frame.md`'s closing rule: one thing — the action). Cells: `../_rich.ts`.
 */
import type { BlockSchema, BlockSpec, LayoutContext, LayoutNode } from '../../../types'
import { enumSlot } from '../../data/_chart/schema-kit'
import { composeFlat, measureHeights, onSurface, pick, type Piece } from '../_kit'
import { defineRichBlock, strs, txt } from '../_rich-block'
import { richFit } from '../_rich'

export interface ClosingRecapProps extends Record<string, unknown> {
  takeaways: string[]
  action: string
  actionLabel?: string
  variant?: 'columns' | 'stack'
}
const VARIANTS = ['columns', 'stack'] as const

export const schema: BlockSchema = {
  takeaways: { type: { kind: 'list', of: { kind: 'text', maxChars: 110 }, min: 2, max: 3 }, role: 'content', label: 'Takeaways', required: true, guidance: '2–3 things to remember (≤ 110 each).' },
  action: { type: { kind: 'text', maxChars: 120 }, role: 'content', label: 'Next action', required: true, guidance: 'The one thing to do next: homework, a question to think about (≤ 120).' },
  actionLabel: { type: { kind: 'text', maxChars: 24 }, role: 'content', label: 'Action label', guidance: 'A short label over the action in the deck language (≤ 24), e.g. "Bài về nhà".' },
  variant: enumSlot([...VARIANTS], 'Variant', 'columns (default: takeaways beside the action) or stack (takeaways above it).'),
}

export const defaults: ClosingRecapProps = {
  takeaways: ['Plants make sugar from light, water and carbon dioxide.', 'Chlorophyll in the leaves captures the light.', 'Oxygen is released as a by-product.'],
  action: 'Put a leaf in the dark for two days, then test it for starch.',
  actionLabel: 'Try at home',
  variant: 'columns',
}

function actionSpecs(p: ClosingRecapProps, size: 'heading' | 'subheading' | 'lead' = 'heading'): { label?: BlockSpec; action: BlockSpec } {
  const label = txt(p.actionLabel, 24).trim()
  return {
    label: label ? { id: 'actionLabel', type: 'tls.t.kicker', props: { text: label, tracking: 'wide' } } : undefined,
    action: { id: 'action', type: 'tls.t.title', props: { text: txt(p.action, 120) || ' ', size } },
  }
}

function layoutRecap(p: ClosingRecapProps, ctx: LayoutContext): LayoutNode {
  // the action at the largest size whose whole block fits the box
  let last: { node: LayoutNode; height: number } | undefined
  for (const size of ['heading', 'subheading', 'lead'] as const) {
    last = layoutAt(p, ctx, size)
    if (!(ctx.box.height > 0) || last.height <= ctx.box.height) break
  }
  return last!.node
}

function layoutAt(p: ClosingRecapProps, ctx: LayoutContext, size: 'heading' | 'subheading' | 'lead'): { node: LayoutNode; height: number } {
  const W = Math.max(0, ctx.box.width) || 0
  const H = Math.max(0, ctx.box.height) || 0
  const sp = ctx.tokens.space
  const v = pick(p.variant, VARIANTS, 'columns')
  const items = strs(p.takeaways, 3).map((text) => ({ text: txt(text, 110) }))
  const a = actionSpecs(p, size)
  const pad = sp.xl
  const pieces: Piece[] = []
  let height: number
  const panel = (x: number, y: number, w: number) => {
    const iw = Math.max(60, w - 2 * pad)
    const lh = a.label ? measureHeights(ctx, [a.label], iw)[0] : 0
    const ah = measureHeights(ctx, [a.action], iw)[0]
    const h = 2 * pad + lh + (a.label ? sp.sm : 0) + ah
    return {
      h,
      place: (ph: number) => {
        pieces.push({ id: 'panel', spec: { id: 'panel', type: 'tls.l.card', props: { padding: 'md', children: [], $block: { style: { surface: 'accent' } } } }, box: { x, y, width: w, height: ph } })
        let cy = y + (ph - (h - 2 * pad)) / 2
        if (a.label) {
          pieces.push({ id: 'actionLabel', spec: { ...a.label, props: { ...a.label.props, ...onSurface({ type: 'solid', color: ctx.resolveColor('accent').color }) } }, box: { x: x + pad, y: cy, width: iw, height: lh } })
          cy += lh + sp.sm
        }
        pieces.push({ id: 'action', spec: { ...a.action, props: { ...a.action.props, ...onSurface({ type: 'solid', color: ctx.resolveColor('accent').color }) } }, box: { x: x + pad, y: cy, width: iw, height: ah } })
      },
    }
  }
  if (v === 'columns') {
    const gap = sp.xl * 1.5
    const lw = Math.round((W - gap) * 0.56)
    const rw = W - gap - lw
    const { plan } = richFit(ctx, items, lw, H, { columns: 1, marker: 'number', markerSide: 'left' })
    const pn = panel(lw + gap, 0, rw)
    height = Math.max(plan.height, pn.h)
    pieces.push(...plan.pieces(0, Math.max(0, (height - plan.height) / 2)))
    pn.place(height)
  } else {
    const pn = panel(0, 0, W)
    const cols = items.length as 2 | 3
    const { plan } = richFit(ctx, items, W, Math.max(0, H - pn.h - sp.xl), { columns: cols, marker: 'number', markerSide: 'top' })
    pieces.push(...plan.pieces(0, 0))
    const py = plan.height + sp.xl
    const p2 = panel(0, py, W)
    p2.place(p2.h)
    height = py + p2.h
  }
  return { node: composeFlat(ctx, pieces, Math.max(1, height)), height }
}

export const tlsCClosingRecap = defineRichBlock<ClosingRecapProps>({
  type: 'tls.c.closing-recap',
  name: 'Closing recap',
  summary: 'A teaching closing: 2–3 takeaways and the one next action on its own panel.',
  keywords: ['closing', 'recap', 'takeaways', 'homework', 'next step', 'tổng kết', 'bài về nhà'],
  category: 'closing',
  shortDescription: 'Takeaways plus one next action',
  related: ['tls.c.closing', 'tls.c.homework', 'tls.c.takeaway-poster', 'tls.c.summary-sheet'],
  schema,
  defaults,
  size: { preferred: [1600, 760], min: [960, 640] },
  fillPolicy: ['type'],
  describe: {
    when: 'The last slide of a lesson: 2–3 takeaways as support and the one thing learners do next (homework, a question to carry home), landed on its own panel.',
    avoid: 'A thank-you or contact slide: tls.c.closing. A full summary of the lesson: tls.c.summary-sheet. Homework with several tasks: tls.c.homework.',
    example: { id: 'b_closing_recap', type: 'tls.c.closing-recap', props: { takeaways: defaults.takeaways, action: defaults.action, actionLabel: defaults.actionLabel } },
  },
  sections: { foot: ['panel', 'actionLabel', 'action'] },
  shape: (p) => ({
    items: strs(p.takeaways, 3).map((text) => ({ text: txt(text, 110) })),
    opts: { columns: 1, marker: 'number' },
    foot: [{ spec: actionSpecs(p).action }],
    layout: (ctx) => layoutRecap(p, ctx),
  }),
})
