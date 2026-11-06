/**
 * tls.c.quote-context — spro sprint 2026-11b S09-5: a quotation, who said it, and why it matters here
 * (the context a learner needs to read it). Teaching form of a quote slide.
 */
import type { BlockSchema, BlockSpec, LayoutContext, LayoutNode } from '../../../types'
import { enumSlot } from '../../data/_chart/schema-kit'
import { composeFlat, measureHeights, pick, type Piece } from '../_kit'
import { defineRichBlock, txt } from '../_rich-block'

export interface QuoteContextProps extends Record<string, unknown> {
  quote: string
  author: string
  role?: string
  context: string
  variant?: 'side-context' | 'under-context'
}
const VARIANTS = ['side-context', 'under-context'] as const

export const schema: BlockSchema = {
  quote: { type: { kind: 'text', maxChars: 240 }, role: 'content', label: 'Quote', required: true, guidance: 'The words quoted, exactly as the passage gives them (≤ 240).' },
  author: { type: { kind: 'text', maxChars: 60 }, role: 'content', label: 'Author', required: true, guidance: 'Who said or wrote it (≤ 60).' },
  role: { type: { kind: 'text', maxChars: 60 }, role: 'content', label: 'Role', guidance: 'Who they are or when / where it was said (≤ 60).' },
  context: { type: { kind: 'text', maxChars: 220 }, role: 'content', label: 'Context', required: true, guidance: 'Why it matters for the lesson or how to read it (1–2 sentences, ≤ 220).' },
  variant: enumSlot([...VARIANTS], 'Variant', 'side-context (default: context beside the quote) or under-context.'),
}

export const defaults: QuoteContextProps = {
  quote: 'If I have seen further, it is by standing on the shoulders of giants.',
  author: 'Isaac Newton',
  role: 'Letter to Robert Hooke, 1675',
  context: 'Newton credits the scientists before him: every discovery builds on earlier work, which is why scientists publish and cite each other.',
  variant: 'side-context',
}

const RUNGS = [
  { quote: 'big', text: 'lead' },
  { quote: 'classic', text: 'lead' },
  { quote: 'classic', text: 'body' },
] as const

function layoutQuote(p: QuoteContextProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(0, ctx.box.width) || 0
  const H = Math.max(0, ctx.box.height) || 0
  const sp = ctx.tokens.space
  const v = pick(p.variant, VARIANTS, 'side-context')
  let best: { pieces: Piece[]; height: number } | undefined
  for (const r of RUNGS) {
    const quote: BlockSpec = { id: 'quote', type: 'tls.t.quote', props: { text: txt(p.quote, 240), attribution: txt(p.author, 60), role: txt(p.role, 60), variant: r.quote, markStyle: 'glyph' } }
    const context: BlockSpec = { id: 'context', type: 'tls.t.body', props: { text: txt(p.context, 220), size: r.text } }
    const pieces: Piece[] = []
    let height: number
    if (v === 'side-context') {
      const gap = sp.xl * 1.5
      const qw = Math.round((W - gap) * 0.58)
      const cw = W - gap - qw
      const [qh] = measureHeights(ctx, [quote], qw)
      const [ch] = measureHeights(ctx, [context], cw - sp.lg)
      height = Math.max(qh, ch)
      pieces.push({ id: 'quote', spec: quote, box: { x: 0, y: 0, width: qw, height: qh } })
      pieces.push({ id: 'rule', spec: { id: 'rule', type: 'tls.x.rule', props: { axis: 'vertical', weight: 'md', tone: 'accent' } }, box: { x: qw + gap, y: 0, width: 4, height: ch } })
      pieces.push({ id: 'context', spec: context, box: { x: qw + gap + sp.lg, y: 0, width: cw - sp.lg, height: ch } })
    } else {
      const [qh] = measureHeights(ctx, [quote], W)
      const [ch] = measureHeights(ctx, [context], W - sp.lg)
      pieces.push({ id: 'quote', spec: quote, box: { x: 0, y: 0, width: W, height: qh } })
      const y = qh + sp.xl
      pieces.push({ id: 'rule', spec: { id: 'rule', type: 'tls.x.rule', props: { axis: 'vertical', weight: 'md', tone: 'accent' } }, box: { x: 0, y, width: 4, height: ch } })
      pieces.push({ id: 'context', spec: context, box: { x: sp.lg, y, width: W - sp.lg, height: ch } })
      height = y + ch
    }
    best = { pieces, height }
    if (H <= 0 || height <= H) break
  }
  return composeFlat(ctx, best!.pieces, Math.max(1, best!.height))
}

export const tlsCQuoteContext = defineRichBlock<QuoteContextProps>({
  type: 'tls.c.quote-context',
  name: 'Quote in context',
  summary: 'A quotation with its author and why it matters for the lesson.',
  keywords: ['quote', 'quotation', 'context', 'source', 'primary source', 'trích dẫn', 'bối cảnh'],
  category: 'emphasis',
  shortDescription: 'A quotation with its author and the context to read it',
  related: ['tls.t.quote', 'tls.c.split-statement', 'tls.c.testimonial'],
  schema,
  defaults,
  size: { preferred: [1600, 620], min: [960, 420] },
  fillPolicy: ['type'],
  describe: {
    when: 'A quotation from the passage that the learner must read with its context: who said it, when, and why it matters here.',
    avoid: 'A quote shown for mood in a presented deck: tls.t.quote or tls.t.pull-quote. A customer voice: tls.c.testimonial.',
    example: { id: 'b_quote_context', type: 'tls.c.quote-context', props: { quote: defaults.quote, author: defaults.author, role: defaults.role, context: defaults.context } },
  },
  sections: { head: ['quote'], foot: ['context'] },
  shape: (p) => ({
    items: [],
    opts: {},
    head: [{ spec: { id: 'quote', type: 'tls.t.quote', props: { text: txt(p.quote, 240), attribution: txt(p.author, 60), role: txt(p.role, 60) } } }],
    foot: [{ spec: { id: 'context', type: 'tls.t.body', props: { text: txt(p.context, 220) } } }],
    layout: (ctx) => layoutQuote(p, ctx),
  }),
})
