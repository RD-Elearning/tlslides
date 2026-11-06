/**
 * tls.c.stat-explain — spro sprint 2026-11b S09-1: one big number with what it means and why it
 * matters (the teaching-friendly highlight: the number carries its explanation). The number keeps its
 * own part (`value[0]`, counts up) apart from its unit; both are shown as the author wrote them (the
 * deck language). Visual: a progress ring or bar of `share` (0–100), or an icon.
 */
import type { BlockSchema, BlockSpec, LayoutContext, LayoutNode } from '../../../types'
import { enumSlot } from '../../data/_chart/schema-kit'
import { composeFlat, pick, type Piece } from '../_kit'
import { defineRichBlock, txt } from '../_rich-block'
import { figureToken, RICH_RUNGS, stackPieces } from '../_rich'

export interface StatExplainProps extends Record<string, unknown> {
  value: string
  unit?: string
  label: string
  text: string
  source?: string
  visual?: 'none' | 'ring' | 'bar' | 'icon'
  share?: number
  icon?: string
  variant?: 'left-number' | 'top-number' | 'ring'
}
const VARIANTS = ['left-number', 'top-number', 'ring'] as const
const VISUALS = ['none', 'ring', 'bar', 'icon'] as const

export const schema: BlockSchema = {
  value: { type: { kind: 'text', maxChars: 12 }, role: 'content', label: 'Number', required: true, guidance: 'The figure as the passage gives it, in the deck language (e.g. "62%", "1,5", "3 lần"), ≤ 12 chars.' },
  unit: { type: { kind: 'text', maxChars: 12 }, role: 'content', label: 'Unit', guidance: 'Unit after the number when it is a word (≤ 12), e.g. "triệu người".' },
  label: { type: { kind: 'text', maxChars: 60 }, role: 'content', label: 'Label', required: true, guidance: 'What is counted, one line (≤ 60).' },
  text: { type: { kind: 'text', maxChars: 240 }, role: 'content', label: 'Meaning', required: true, guidance: 'What the number means and why it matters (1–2 sentences, ≤ 240).' },
  source: { type: { kind: 'text', maxChars: 90 }, role: 'content', label: 'Source', guidance: 'Where the number comes from (≤ 90).' },
  visual: enumSlot([...VISUALS], 'Visual', 'none (default); ring or bar draw `share`; icon draws `icon`.'),
  share: { type: { kind: 'number', min: 0, max: 100 }, role: 'content', label: 'Share (%)', help: 'For ring / bar: the share 0–100 the figure stands for.' },
  icon: { type: { kind: 'icon' }, role: 'content', label: 'Icon', help: 'For visual icon.' },
  variant: enumSlot([...VARIANTS], 'Variant', 'left-number (default), top-number or ring (needs `share`).'),
}

export const defaults: StatExplainProps = {
  value: '62%',
  label: 'of students who studied with practice tests passed',
  text: 'Twice the share of those who only reread their notes: recalling an answer makes the memory stronger than reading it again.',
  source: 'Study of 1,200 first-year students',
  visual: 'none',
  variant: 'left-number',
}

const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : undefined)

function specs(p: StatExplainProps, rung: (typeof RICH_RUNGS)[number]) {
  const value = txt(p.value, 12).trim() || '—'
  const unit = txt(p.unit, 12).trim()
  return {
    value: { id: 'value[0]', type: 'tls.t.title', props: { text: value, size: rung.figure, color: 'accent', maxLines: 1 } } as BlockSpec,
    unit: unit ? ({ id: 'item[0].unit', type: 'tls.t.title', props: { text: unit, size: rung.lead, color: 'textMuted' } } as BlockSpec) : undefined,
    label: { id: 'item[0].label', type: 'tls.t.title', props: { text: txt(p.label, 60), size: rung.lead } } as BlockSpec,
    text: { id: 'item[0].text', type: 'tls.t.body', props: { text: txt(p.text, 240), size: rung.text === 'body' && rung.lead === 'subheading' ? 'lead' : rung.text } } as BlockSpec,
    source: txt(p.source, 90).trim() ? ({ id: 'item[0].source', type: 'tls.t.body', props: { text: txt(p.source, 90), size: 'body', color: 'textMuted' } } as BlockSpec) : undefined,
  }
}

function layoutStat(p: StatExplainProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(0, ctx.box.width) || 0
  const H = Math.max(0, ctx.box.height) || 0
  const sp = ctx.tokens.space
  const share = num(p.share)
  let variant = pick(p.variant, VARIANTS, 'left-number')
  const visual = pick(p.visual, VISUALS, 'none')
  if (variant === 'ring' && share === undefined) variant = 'left-number'
  if (variant !== 'ring' && visual === 'ring' && share !== undefined) variant = 'ring'
  const icon = visual === 'icon' && typeof p.icon === 'string' && p.icon ? ({ id: 'item[0].visual', type: 'tls.m.icon', props: { icon: p.icon, size: 'lg', iconStyle: 'disc' } } as BlockSpec) : undefined
  const bar = visual === 'bar' && share !== undefined ? ({ id: 'item[0].visual', type: 'tls.d.progress-bar', props: { items: [{ label: ' ', value: share }], showValue: 'none', thickness: 'lg' } } as BlockSpec) : undefined
  let best: { pieces: Piece[]; height: number } | undefined
  for (const rung of RICH_RUNGS) {
    const s = specs(p, rung)
    const pieces: Piece[] = []
    let height = 0
    if (variant === 'top-number') {
      s.value.props.size = figureToken(ctx, String(s.value.props.text), W, rung.figure)
      const col = stackPieces(ctx, [icon, s.value, s.unit, bar, s.label, s.text, s.source], 0, 0, W, sp.sm)
      pieces.push(...col.pieces)
      height = col.height
    } else {
      const gap = sp.xl * 1.5
      const lw = Math.round((W - gap) * (variant === 'ring' ? 0.34 : 0.38))
      const rw = W - gap - lw
      if (variant === 'ring') {
        const D = Math.max(120, Math.min(lw, H > 0 ? H : lw))
        pieces.push({ id: 'item[0].visual', spec: { id: 'item[0].visual', type: 'tls.d.progress-ring', props: { value: share, max: 100, thickness: 'md' } }, box: { x: (lw - D) / 2, y: 0, width: D, height: D } })
        s.value.props.size = figureToken(ctx, String(s.value.props.text), rw, rung.figure)
        const col = stackPieces(ctx, [s.value, s.unit, s.label, s.text, s.source], lw + gap, 0, rw, sp.sm)
        pieces.push(...col.pieces)
        height = Math.max(D, col.height)
      } else {
        s.value.props.size = figureToken(ctx, String(s.value.props.text), lw, rung.figure)
        const left = stackPieces(ctx, [icon, s.value, s.unit, bar], 0, 0, lw, sp.sm)
        const right = stackPieces(ctx, [s.label, s.text, s.source], lw + gap, 0, rw, sp.sm)
        pieces.push(...left.pieces, ...right.pieces)
        height = Math.max(left.height, right.height)
      }
    }
    best = { pieces, height }
    if (H <= 0 || height <= H) break
  }
  return composeFlat(ctx, best!.pieces, Math.max(1, best!.height))
}

export const tlsCStatExplain = defineRichBlock<StatExplainProps>({
  type: 'tls.c.stat-explain',
  name: 'Number explained',
  summary: 'One big number with what it counts, what it means and where it comes from.',
  keywords: ['stat', 'number', 'figure', 'explain', 'meaning', 'percent', 'số liệu', 'con số', 'ý nghĩa'],
  category: 'metric',
  shortDescription: 'A big number with its meaning and source',
  related: ['tls.c.big-stat', 'tls.t.hero-number', 'tls.c.number-grid', 'tls.c.stat-card'],
  schema,
  defaults,
  size: { preferred: [1600, 640], min: [800, 420] },
  fillPolicy: ['type'],
  countUp: true,
  describe: {
    when: 'One figure from the passage that needs its explanation: what it counts, what it means or why it matters, and its source. Allowed in learning decks.',
    avoid: 'A number shown for effect with no explanation: tls.c.big-stat. Three to six figures: tls.c.number-grid. A trend: a chart.',
    example: { id: 'b_stat_explain', type: 'tls.c.stat-explain', props: { value: defaults.value, label: defaults.label, text: defaults.text, source: defaults.source } },
  },
  shape: (p) => ({
    items: [{ value: txt(p.value, 12), unit: txt(p.unit, 12), lead: txt(p.label, 60), text: txt(p.text, 240), note: txt(p.source, 90) }],
    opts: { marker: 'figure', markerSide: 'left' },
    layout: (ctx) => layoutStat(p, ctx),
  }),
})
