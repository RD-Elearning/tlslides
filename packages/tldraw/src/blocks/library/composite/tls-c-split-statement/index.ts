/**
 * tls.c.split-statement — spro sprint 2026-11b S09-4: a strong sentence and the 2–4 pieces of evidence
 * behind it (where S07 sends a statement-shaped teaching slide: the claim carries its support).
 * Evidence cells: `../_rich.ts` (text + optional muted source line).
 */
import type { BlockSchema, BlockSpec, LayoutContext, LayoutNode } from '../../../types'
import { enumSlot } from '../../data/_chart/schema-kit'
import { composeFlat, measureHeights, pick, type Piece } from '../_kit'
import { defineRichBlock, objectOf, rows, txt } from '../_rich-block'
import { richFit, type RichItem } from '../_rich'

export interface SplitStatementProps extends Record<string, unknown> {
  statement: string
  evidence: Array<{ text: string; source?: string }>
  variant?: 'left-claim' | 'top-claim' | 'band'
}
const VARIANTS = ['left-claim', 'top-claim', 'band'] as const

export const schema: BlockSchema = {
  statement: { type: { kind: 'text', maxChars: 130 }, role: 'content', label: 'Claim', required: true, guidance: 'The claim in one strong sentence (≤ 130).' },
  evidence: {
    type: { kind: 'list', of: objectOf({ text: { kind: 'text', maxChars: 120 }, source: { kind: 'text', maxChars: 60 } }), min: 2, max: 4 },
    role: 'content',
    label: 'Evidence',
    required: true,
    guidance: 'Each: `text` = a fact, figure or example that supports the claim (≤ 120); optional `source` (≤ 60).',
  },
  variant: enumSlot([...VARIANTS], 'Variant', 'left-claim (default: claim beside the evidence), top-claim or band (claim on a tinted band).'),
}

export const defaults: SplitStatementProps = {
  statement: 'Sleep is part of learning, not a break from it.',
  evidence: [
    { text: 'Students who slept after studying recalled 20–40% more the next day.', source: 'Sleep and memory studies' },
    { text: 'During deep sleep the brain replays what was learned during the day.' },
    { text: 'One night without sleep cuts the ability to form new memories by about 40%.' },
  ],
  variant: 'left-claim',
}

const CLAIM_SIZES = ['heading', 'subheading', 'lead'] as const

function evidenceItems(p: SplitStatementProps): RichItem[] {
  return rows<{ text?: unknown; source?: unknown }>(p.evidence, 4).map((e) => ({ text: txt(e.text, 120), note: txt(e.source, 60) }))
}

function layoutSplit(p: SplitStatementProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(0, ctx.box.width) || 0
  const H = Math.max(0, ctx.box.height) || 0
  const sp = ctx.tokens.space
  const v = pick(p.variant, VARIANTS, 'left-claim')
  const items = evidenceItems(p)
  const statement = txt(p.statement, 130)
  let best: { pieces: Piece[]; height: number } | undefined
  for (const size of CLAIM_SIZES) {
    const claim: BlockSpec = { id: 'claim', type: 'tls.t.title', props: { text: statement, size, color: v === 'band' ? 'text' : 'accent' } }
    const pieces: Piece[] = []
    let height: number
    if (v === 'left-claim') {
      const gap = sp.xl * 1.5
      const lw = Math.round((W - gap) * 0.4)
      const rw = W - gap - lw
      const [ch] = measureHeights(ctx, [claim], lw)
      const { plan } = richFit(ctx, items, rw, H, { columns: 1, marker: 'none', gap: 'lg' })
      pieces.push({ id: 'claim', spec: claim, box: { x: 0, y: 0, width: lw, height: ch } })
      pieces.push({ id: 'rule', spec: { id: 'rule', type: 'tls.x.rule', props: { axis: 'vertical', weight: 'md', tone: 'accent' } }, box: { x: lw + gap / 2 - 2, y: 0, width: 4, height: Math.max(ch, plan.height) } })
      pieces.push(...plan.pieces(lw + gap, 0))
      height = Math.max(ch, plan.height)
    } else {
      const pad = v === 'band' ? sp.lg : 0
      const [ch] = measureHeights(ctx, [claim], W - 2 * pad)
      const top = ch + 2 * pad
      if (v === 'band') pieces.push({ id: 'band', spec: { id: 'band', type: 'tls.l.card', props: { padding: 'md', children: [] } }, box: { x: 0, y: 0, width: W, height: top } })
      pieces.push({ id: 'claim', spec: claim, box: { x: pad, y: pad, width: W - 2 * pad, height: ch } })
      const y = top + sp.xl
      const cols = (items.length === 4 ? 2 : Math.min(3, Math.max(1, items.length))) as 1 | 2 | 3
      const { plan } = richFit(ctx, items, W, H - y, { columns: cols, marker: 'none', card: v === 'band' ? 'none' : 'card' })
      pieces.push(...plan.pieces(0, y))
      height = y + plan.height
    }
    best = { pieces, height }
    if (H <= 0 || height <= H) break
  }
  return composeFlat(ctx, best!.pieces, Math.max(1, best!.height))
}

export const tlsCSplitStatement = defineRichBlock<SplitStatementProps>({
  type: 'tls.c.split-statement',
  name: 'Claim and evidence',
  summary: 'A strong sentence and the 2–4 facts or examples that support it.',
  keywords: ['claim', 'evidence', 'statement', 'support', 'argument', 'luận điểm', 'dẫn chứng'],
  category: 'emphasis',
  shortDescription: 'A claim with 2–4 pieces of evidence',
  related: ['tls.t.statement', 'tls.c.key-points', 'tls.c.quote-context'],
  schema,
  defaults,
  size: { preferred: [1600, 640], min: [960, 440] },
  describe: {
    when: 'A slide whose point is one claim the passage supports with facts, figures or examples: the claim large, its evidence beside or under it. The teaching form of a statement slide.',
    avoid: 'A claim alone, for effect, in a presented deck: tls.t.statement. Several points of equal weight: tls.c.key-points.',
    example: { id: 'b_split_statement', type: 'tls.c.split-statement', props: { statement: defaults.statement, evidence: defaults.evidence.slice(0, 2) } },
  },
  sections: { head: ['claim'] },
  shape: (p) => ({
    items: evidenceItems(p),
    opts: { columns: 1 },
    head: [{ spec: { id: 'claim', type: 'tls.t.title', props: { text: txt(p.statement, 130), size: 'heading', color: 'accent' } } }],
    layout: (ctx) => layoutSplit(p, ctx),
  }),
})
