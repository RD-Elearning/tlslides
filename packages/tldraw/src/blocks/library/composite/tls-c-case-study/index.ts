/**
 * tls.c.case-study — success story: challenge, solution and result, with one headline result number.
 *
 * `defineCompositeBlock` supplies metadata and `build()` (a row of three card > stack columns);
 * `layout()` places the same content by hand and flattens it (see `../_kit.ts`): `columns` = three
 * rounded panels side by side, `rows` = three full-width bands with the label on the left. With
 * `emphasis: result` the result panel is accent-filled and carries the metric. Slide scope: the
 * block is vertically centred in its region and never taller than needed (capped at 480 for panels).
 */

import type { BlockDefinition, BlockSchema, BlockSpec, LayoutContext, LayoutNode } from '../../../types'
import { isShown } from '../../../schema-helpers'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { enumSlot } from '../../data/_chart/schema-kit'
import { onColor } from '../../text/_engine/color'
import { composeFlat, measureHeights, onSurface, pick, pickToken, type Piece } from '../_kit'

export interface CaseStudyMetric {
  value?: string
  label?: string
}

export interface CaseStudyProps extends Record<string, unknown> {
  client?: string
  challenge: string
  solution: string
  result: string
  metric?: CaseStudyMetric
  layout?: 'columns' | 'rows'
  emphasis?: 'result' | 'none'
  showMetric?: boolean
  showClient?: boolean
}

export const schema: BlockSchema = {
  client: { type: { kind: 'text', maxChars: 40 }, role: 'content', label: 'Client', guidance: 'Name of the client or project.' },
  challenge: { type: { kind: 'text', maxChars: 220 }, role: 'content', label: 'Challenge', required: true, guidance: '1-2 sentences: the problem.' },
  solution: { type: { kind: 'text', maxChars: 220 }, role: 'content', label: 'Solution', required: true, guidance: '1-2 sentences: what was done.' },
  result: { type: { kind: 'text', maxChars: 220 }, role: 'content', label: 'Result', required: true, guidance: '1-2 sentences: the outcome.' },
  metric: {
    type: { kind: 'object', fields: {
      value: { type: { kind: 'text', maxChars: 12 }, role: 'content', label: 'Value', required: true, guidance: 'Short: "+42%", "3x".' },
      label: { type: { kind: 'text', maxChars: 40 }, role: 'content', label: 'Label', required: true },
    } },
    role: 'content',
    label: 'Headline result',
    guidance: 'Fields: value, label.',
  },
  layout: enumSlot(['columns', 'rows'], 'Layout', 'rows = full-width bands.'),
  emphasis: enumSlot(['result', 'none'], 'Emphasis', 'result = accent-filled result.'),
  showMetric: { type: { kind: 'boolean' }, role: 'option', label: 'Show headline result', toggles: 'metric' },
  showClient: { type: { kind: 'boolean' }, role: 'option', label: 'Show client', toggles: 'client' },
}

export const defaults: CaseStudyProps = {
  client: 'Vinh University Library',
  challenge: 'Students queued for 20 minutes at peak hours to borrow and return books.',
  solution: 'Self-service kiosks with a mobile app for renewals, rolled out in two weeks.',
  result: 'Queues disappeared at peak hours and staff moved to study support.',
  metric: { value: '-80%', label: 'waiting time at peak' },
  layout: 'columns',
  emphasis: 'result',
}

const LAYOUTS = ['columns', 'rows'] as const
const EMPH = ['result', 'none'] as const
const LABELS = ['Challenge', 'Solution', 'Result']
const KEYS = ['challenge', 'solution', 'result'] as const

const s = (v: unknown): string => (typeof v === 'string' ? v : '')

function metricOf(props: CaseStudyProps): { value: string; label: string } | undefined {
  const m = props.metric
  if (!isShown(props, 'showMetric') || !m || typeof m !== 'object') return undefined
  const value = s(m.value).trim()
  return value ? { value, label: s(m.label).trim() } : undefined
}

export function buildCaseStudy(props: CaseStudyProps): BlockSpec {
  const m = metricOf(props)
  const cols = KEYS.map((k, i) => {
    const kids: BlockSpec[] = [
      { id: `label-${i}`, type: 'tls.t.kicker', props: { text: LABELS[i], marker: false } },
      ...(k === 'result' && m ? ([{ id: 'metric', type: 'tls.t.title', props: { text: m.value, size: 'title', color: 'accent' } }] as BlockSpec[]) : []),
      { id: `text-${i}`, type: 'tls.t.body', props: { text: s(props[k]) } },
    ]
    return { id: `col-${i}`, type: 'tls.l.card', props: { padding: 'lg', children: [{ id: `stack-${i}`, type: 'tls.l.stack', props: { gap: 'sm', sizing: 'content', children: kids } }] } }
  })
  return { id: 'case', type: 'tls.l.row', props: { gap: 'md', sizing: 'equal', children: cols } }
}

const TOKENS = ['title', 'heading'] as const

export function layoutCaseStudy(props: CaseStudyProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(0, ctx.box.width) || 0
  const H = Math.max(0, ctx.box.height) || 0
  const layout = pick(props.layout, LAYOUTS, 'columns')
  const emphasis = pick(props.emphasis, EMPH, 'result')
  const rows = layout === 'rows'
  const g = ctx.tokens.space.md
  const pad = ctx.tokens.space.lg
  const sm = ctx.tokens.space.sm
  const m = metricOf(props)
  const accent = ctx.resolveColor('accent').color
  const alt = ctx.resolveColor('surfaceAlt').color
  const fgOnAccent = onColor(ctx, accent)
  const client = isShown(props, 'showClient') && s(props.client).trim() ? s(props.client).trim() : ''
  const pieces: Piece[] = []

  const clientSpec: BlockSpec | undefined = client ? { id: 'client', type: 'tls.t.kicker', props: { text: client, marker: false } } : undefined
  const clientH = clientSpec ? measureHeights(ctx, [clientSpec], W)[0] : 0
  const headH = clientH ? clientH + g : 0

  // Cell geometry.
  const labelW = rows ? 260 : 0
  const metricW = rows && m ? Math.min(420, W * 0.28) : 0
  const cw = rows ? W : Math.max(1, (W - 2 * g) / 3)
  const tw = (i: number) => (rows ? Math.max(1, W - 2 * pad - labelW - g - (i === 2 && metricW ? metricW + g : 0)) : Math.max(1, cw - 2 * pad))

  // The kicker block is always accent-coloured, which vanishes on the accent-filled panel: an emphasised label is a caption in the on-accent colour.
  const label = (i: number, on: Record<string, unknown>, fg?: string): BlockSpec =>
    fg
      ? { id: `label-${i}`, type: 'tls.t.caption', props: { text: LABELS[i].toUpperCase(), color: fg, ...on } }
      : { id: `label-${i}`, type: 'tls.t.kicker', props: { text: LABELS[i], marker: false, ...on } }
  const body = (i: number, on: Record<string, unknown>, fg?: string): BlockSpec => ({ id: `text-${i}`, type: 'tls.t.body', props: { text: s(props[KEYS[i]]), ...(fg ? { color: fg } : {}), ...on } })

  const emph = (i: number) => emphasis === 'result' && i === 2
  const onOf = (i: number) => onSurface({ type: 'solid', color: emph(i) ? accent : alt })

  // Metric size: largest token whose value fits one line in its box.
  const mw = rows ? metricW : Math.max(1, cw - 2 * pad)
  const mTok = m ? (pickToken(ctx, m.value, mw, [...TOKENS], 1) as (typeof TOKENS)[number]) : 'title'
  const mSpec = (on: Record<string, unknown>, fg?: string): BlockSpec | undefined =>
    m ? { id: 'metric', type: 'tls.t.title', props: { text: m.value, size: mTok, color: fg ?? 'accent', ...on } } : undefined
  const mLabel = (on: Record<string, unknown>, fg?: string): BlockSpec | undefined =>
    m && m.label ? { id: 'metriclabel', type: 'tls.t.caption', props: { text: m.label, color: fg ?? 'textMuted', ...on } } : undefined

  const labelH = measureHeights(ctx, [label(0, {})], Math.max(1, rows ? labelW : cw - 2 * pad))[0]
  const bodyH = [0, 1, 2].map((i) => measureHeights(ctx, [body(i, {})], tw(i))[0])
  const metricBlock = (i: number): { vh: number; lh: number } => {
    if (!m || i !== 2) return { vh: 0, lh: 0 }
    const ms = mSpec({})
    const ml = mLabel({})
    return { vh: ms ? measureHeights(ctx, [ms], mw)[0] : 0, lh: ml ? measureHeights(ctx, [ml], mw)[0] : 0 }
  }

  // Per-cell content height.
  const cellH = [0, 1, 2].map((i) => {
    const mb = metricBlock(i)
    if (rows) return 2 * pad + Math.max(labelH, bodyH[i], mb.vh ? mb.vh + (mb.lh ? sm + mb.lh : 0) : 0)
    return 2 * pad + labelH + sm + (mb.vh ? mb.vh + mb.lh + sm : 0) + bodyH[i]
  })
  const colH = Math.max(...cellH)
  const bodyBlockH = rows ? cellH.reduce((a, b) => a + b, 0) + g * 2 : colH
  const avail = Math.max(0, H - headH)
  const panelsH = rows ? bodyBlockH : Math.max(colH, Math.min(avail, 480))
  const rowScale = rows && avail > bodyBlockH ? Math.min(1.25, avail / bodyBlockH) : 1
  const needed = headH + panelsH * (rows ? rowScale : 1)
  const total = Math.max(H, Math.ceil(needed))
  const top = (total - needed) / 2
  const rect = (id: string, x: number, y: number, w: number, h: number, color: string): Piece => ({
    id,
    raw: [{ k: 'rect', box: { x, y, width: w, height: h }, fill: { type: 'solid', color }, radius: ctx.tokens.radius.lg } as LayoutNode],
    box: { x, y, width: w, height: h },
  })

  if (clientSpec) pieces.push({ id: 'client', spec: clientSpec, box: { x: 0, y: top, width: W, height: clientH } })
  let y = top + headH
  for (let i = 0; i < 3; i++) {
    const on = onOf(i)
    const fg = emph(i) ? fgOnAccent : undefined
    const x = rows ? 0 : i * (cw + g)
    const h = rows ? cellH[i] * rowScale : panelsH
    pieces.push(rect(`panel[${i}]`, x, y, cw, h, emph(i) ? accent : alt))
    const ix = x + pad
    if (rows) {
      const cy = y + (h - labelH) / 2
      pieces.push({ id: `label[${i}]`, spec: label(i, on, fg), box: { x: ix, y: cy, width: labelW, height: labelH } })
      pieces.push({ id: `text[${i}]`, spec: body(i, on, fg), box: { x: ix + labelW + g, y: y + (h - bodyH[i]) / 2, width: tw(i), height: bodyH[i] } })
      if (i === 2 && m) {
        const mb = metricBlock(2)
        const stackH = mb.vh + (mb.lh ? sm + mb.lh : 0)
        const mx = x + cw - pad - metricW
        const my = y + (h - stackH) / 2
        const ms = mSpec(on, fg)
        const ml = mLabel(on, fg ? fg : undefined)
        if (ms) pieces.push({ id: 'metric', spec: ms, box: { x: mx, y: my, width: metricW, height: mb.vh }, align: 'start' })
        if (ml) pieces.push({ id: 'metriclabel', spec: ml, box: { x: mx, y: my + mb.vh + sm, width: metricW, height: mb.lh } })
      }
    } else {
      let cy = y + pad
      pieces.push({ id: `label[${i}]`, spec: label(i, on, fg), box: { x: ix, y: cy, width: cw - 2 * pad, height: labelH } })
      cy += labelH + sm
      if (i === 2 && m) {
        const mb = metricBlock(2)
        const ms = mSpec(on, fg)
        const ml = mLabel(on, fg)
        if (ms) pieces.push({ id: 'metric', spec: ms, box: { x: ix, y: cy, width: cw - 2 * pad, height: mb.vh } })
        cy += mb.vh
        if (ml) {
          pieces.push({ id: 'metriclabel', spec: ml, box: { x: ix, y: cy, width: cw - 2 * pad, height: mb.lh } })
          cy += mb.lh
        }
        cy += sm
      }
      pieces.push({ id: `text[${i}]`, spec: body(i, on, fg), box: { x: ix, y: cy, width: cw - 2 * pad, height: bodyH[i] } })
    }
    if (rows) y += h + g
  }
  return composeFlat(ctx, pieces, total)
}

const composite = defineCompositeBlock<CaseStudyProps>({
  type: 'tls.c.case-study',
  name: 'Case study',
  family: 'composite',
  tier: 'A',
  summary: 'Success story: challenge, solution and result, with one headline result number.',
  keywords: ['case study', 'success story', 'reference', 'project showcase', 'before after result', 'customer story'],
  category: 'comparison',
  scope: 'slide',
  shortDescription: 'Challenge, solution and result panels, with one headline result number',
  related: ['tls.c.cards', 'tls.c.testimonial', 'tls.g.before-after'],
  schema,
  defaults,
  size: { preferred: [1500, 640], min: [820, 520] },
  describe: {
    when: 'Success stories, project showcases and references.',
    avoid: 'A generic 3-point list: tls.c.cards.',
    example: {
      id: 'b_case',
      type: 'tls.c.case-study',
      props: {
        client: 'Vinh University Library',
        challenge: 'Long queues at peak hours.',
        solution: 'Self-service kiosks and a renewal app.',
        result: 'Queues gone, staff moved to study support.',
        metric: { value: '-80%', label: 'waiting time' },
        layout: 'columns',
      },
    },
  },
  // RVM3: the client line, then the three panels side by side left to right (challenge, solution,
  // result), each label and text with its panel; the result metric counts up. Bare family names,
  // because a multi-line piece is numbered per line. It was one `root` piece.
  motion: {
    parts: ['client', 'panel', 'label', 'text', 'metric', 'metriclabel'],
    preset: 'stagger-grid',
    partMotion: {
      client: { preset: 'sweep-nodes', delay: 0 },
      panel: { preset: 'fade-up', delay: 60, stagger: 120 },
      label: { preset: 'sweep-nodes', delay: 120, stagger: 120 },
      text: { preset: 'fade-up', delay: 160, stagger: 120 },
      metric: { preset: 'count-up', delay: 360 },
      metriclabel: { preset: 'sweep-nodes', delay: 440 },
    },
  },
  build: buildCaseStudy,
})

export const tlsCCaseStudy: BlockDefinition = {
  ...composite,
  intrinsicSize: undefined,
  layout: ((props: CaseStudyProps, ctx: LayoutContext): LayoutNode => layoutCaseStudy(props, ctx)) as BlockDefinition['layout'],
}
