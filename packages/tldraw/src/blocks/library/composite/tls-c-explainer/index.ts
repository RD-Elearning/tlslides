/**
 * tls.c.explainer — spro sprint 2026-11b S08-2: one concept explained: a claim line, a paragraph, 2–3
 * sub-points and an example box. Cells: `../_rich.ts`; `side-example` puts the example in a right column.
 */
import type { BlockSchema, BlockSpec, LayoutContext, LayoutNode } from '../../../types'
import { enumSlot } from '../../data/_chart/schema-kit'
import { composeFlat, pick, type Piece } from '../_kit'
import { sectionHeights, type RichSection } from '../_rich'
import { defineRichBlock, objectOf, strs, txt } from '../_rich-block'

export interface ExplainerProps extends Record<string, unknown> {
  claim: string
  text: string
  points?: string[]
  example?: { label?: string; text?: string }
  variant?: 'stacked' | 'side-example' | 'boxed'
}
const VARIANTS = ['stacked', 'side-example', 'boxed'] as const

export const schema: BlockSchema = {
  claim: { type: { kind: 'text', maxChars: 90 }, role: 'content', label: 'Claim', required: true, guidance: 'The idea in one line.' },
  text: { type: { kind: 'text', maxChars: 420 }, role: 'content', label: 'Explanation', required: true, guidance: '2–4 sentences: what it means and why.' },
  points: { type: { kind: 'list', of: { kind: 'text', maxChars: 120 }, min: 0, max: 3 }, role: 'content', label: 'Sub-points' },
  example: { type: objectOf({ label: { kind: 'text', maxChars: 20 }, text: { kind: 'text', maxChars: 240 } }), role: 'content', label: 'Example', guidance: 'A concrete case: `label` (e.g. "Example") and `text`.' },
  variant: enumSlot([...VARIANTS], 'Variant', 'stacked = the example under the text; side-example = the example in a right column; boxed = the whole explanation on a card.'),
}

export const defaults: ExplainerProps = {
  claim: 'Interest compounds: you earn interest on the interest',
  text: 'Each period the interest is added to the balance, so the next period pays interest on a larger amount. The growth is slow at first and fast later.',
  points: ['The rate and the time both matter', 'Doubling time ≈ 72 / rate in %'],
  example: { label: 'Example', text: '1,000 at 6 % a year becomes about 2,000 after 12 years, not 1,720 as simple interest would give.' },
  variant: 'stacked',
}

function sections(p: ExplainerProps): { head: RichSection[]; example: BlockSpec | null } {
  const head: RichSection[] = [
    { spec: { id: 'claim', type: 'tls.t.title', props: { text: txt(p.claim, 90), size: 'subheading' } } },
    { spec: { id: 'text', type: 'tls.t.body', props: { text: txt(p.text, 420) } } },
  ]
  const pts = strs(p.points, 3)
  if (pts.length) head.push({ spec: { id: 'points', type: 'tls.t.bullets', props: { items: pts.map((text) => ({ text })), spacing: 'sm' } } })
  const ex = p.example && typeof p.example === 'object' ? p.example : undefined
  const example: BlockSpec | null = ex && txt(ex.text)
    ? { id: 'example', type: 'tls.t.callout', props: { title: txt(ex.label, 20) || 'Example', text: txt(ex.text, 240), variant: 'tip', fill: 'tint' } }
    : null
  return { head, example }
}

function sideLayout(ctx: LayoutContext, head: RichSection[], example: BlockSpec): LayoutNode {
  const W = Math.max(0, ctx.box.width) || 0
  const gap = ctx.tokens.space.lg
  const colGap = ctx.tokens.space.xl * 1.5
  const mw = Math.round((W - colGap) * 0.6)
  const sw = W - colGap - mw
  const hs = sectionHeights(ctx, head, mw)
  const [eh] = sectionHeights(ctx, [{ spec: example }], sw)
  const pieces: Piece[] = []
  let y = 0
  head.forEach((s, i) => {
    pieces.push({ id: s.spec.id, spec: s.spec, box: { x: 0, y, width: mw, height: hs[i] } })
    y += hs[i] + gap
  })
  pieces.push({ id: 'example', spec: example, box: { x: mw + colGap, y: 0, width: sw, height: eh } })
  return composeFlat(ctx, pieces, Math.max(y - gap, eh, 1))
}

export const tlsCExplainer = defineRichBlock<ExplainerProps>({
  type: 'tls.c.explainer',
  name: 'Explainer',
  summary: 'One concept explained: a claim, a paragraph, sub-points and an example.',
  keywords: ['explain', 'concept', 'idea', 'why', 'example', 'giải thích', 'khái niệm', 'ví dụ'],
  category: 'text',
  shortDescription: 'One idea explained with sub-points and an example',
  related: ['tls.t.definition', 'tls.t.body', 'tls.c.case-study', 'tls.c.key-points'],
  schema,
  defaults,
  size: { preferred: [1600, 760], min: [960, 660] },
  describe: {
    when: 'One idea that needs explaining on its own slide: the claim, why it holds, and a concrete example.',
    avoid: 'A term with a short definition only: tls.t.definition. Several parallel points: tls.c.key-points.',
    example: { id: 'b_explainer', type: 'tls.c.explainer', props: { claim: defaults.claim, text: defaults.text } },
  },
  sections: { head: ['claim', 'text', 'points'], foot: ['example'] },
  shape: (p) => {
    const v = pick(p.variant, VARIANTS, 'stacked')
    const { head, example } = sections(p)
    if (v === 'side-example' && example) return { items: [], opts: {}, head, layout: (ctx) => sideLayout(ctx, head, example) }
    if (v === 'boxed') {
      // the explanation on a card (one rich cell), the example under it
      const items = [{ lead: txt(p.claim, 90), text: txt(p.text, 420), points: strs(p.points, 3) }]
      return { items, opts: { card: 'card' }, foot: example ? [{ spec: example }] : [] }
    }
    return { items: [], opts: {}, head, foot: example ? [{ spec: example }] : [] }
  },
})
