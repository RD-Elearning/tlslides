/**
 * tls.c.problem-solution — a problem statement and its solution side by side, joined by an arrow.
 *
 * `defineCompositeBlock` supplies metadata and `build()` (a row of two callouts); `layout()` places the
 * content by hand and flattens it (see `../_kit.ts`). `panels` = two tinted panels (negative / positive
 * tint) with an optional icon, title and text; `callouts` = two `tls.t.callout` blocks (danger and
 * success). The arrow is a filled circle with a polygon arrow in the gutter. Group scope: the
 * block is content-height and sits in any region.
 */

import type { BlockDefinition, BlockSchema, BlockSpec, LayoutContext, LayoutNode, Size } from '../../../types'
import { isShown } from '../../../schema-helpers'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { enumSlot } from '../../data/_chart/schema-kit'
import { iconLeaf } from '../../text/_engine/icon'
import { onColor, readableOn, tintOf } from '../../text/_engine/color'
import { toMeasurable } from '../_kit'
import { composeFlat, measureHeights, onSurface, pick, type Piece } from '../_kit'

export interface Side {
  title?: string
  text?: unknown
}

export interface ProblemSolutionProps extends Record<string, unknown> {
  problem: Side
  solution: Side
  showIcons?: boolean
  style?: 'panels' | 'callouts'
}

const sideField = (label: string) => ({
  type: { kind: 'object' as const, fields: {
    title: { type: { kind: 'text' as const, maxChars: 40 }, role: 'content' as const, label: 'Title' },
    text: { type: { kind: 'richText' as const, maxChars: 200 }, role: 'content' as const, label: 'Text', required: true },
  } },
  role: 'content' as const,
  label,
  required: true,
  guidance: 'Fields: title, text.',
})

export const schema: BlockSchema = {
  problem: sideField('Problem'),
  solution: sideField('Solution'),
  showIcons: { type: { kind: 'boolean' }, role: 'option', label: 'Show icons', toggles: 'icon' },
  style: enumSlot(['panels', 'callouts'], 'Style', 'callouts = danger and success notes.'),
}

export const defaults: ProblemSolutionProps = {
  problem: { title: 'The problem', text: 'Students wait **20 minutes** in a queue to borrow a book at peak hours.' },
  solution: { title: 'The solution', text: 'Self-service kiosks and a renewal app cut the wait to **under 4 minutes**.' },
  showIcons: true,
  style: 'panels',
}

const STYLES = ['panels', 'callouts'] as const

const str = (v: unknown): string => (typeof v === 'string' ? v : '')
const sideOf = (v: unknown): { title: string; text: unknown } => {
  const o = v && typeof v === 'object' ? (v as Side) : {}
  return { title: str(o.title).trim(), text: o.text ?? '' }
}

const calloutSpec = (side: ReturnType<typeof sideOf>, variant: 'danger' | 'success', icons: boolean, id: string): BlockSpec => ({
  id,
  type: 'tls.t.callout',
  props: { title: side.title, text: toMeasurable(side.text), variant, fill: 'tint', showIcon: icons, showTitle: !!side.title },
})

export function buildProblemSolution(props: ProblemSolutionProps): BlockSpec {
  const icons = isShown(props, 'showIcons')
  return {
    id: 'ps',
    type: 'tls.l.row',
    props: { gap: 'lg', sizing: 'equal', children: [calloutSpec(sideOf(props.problem), 'danger', icons, 'problem'), calloutSpec(sideOf(props.solution), 'success', icons, 'solution')] },
  }
}

const ARROW = 72

interface Plan {
  cw: number
  gutter: number
  needed: number
  heights: number[]
}

function plan(props: ProblemSolutionProps, ctx: LayoutContext): Plan {
  const W = Math.max(0, ctx.box.width) || 0
  const style = pick(props.style, STYLES, 'panels')
  const gutter = ARROW + ctx.tokens.space.md * 2
  const cw = Math.max(1, (W - gutter) / 2)
  const sides = [sideOf(props.problem), sideOf(props.solution)]
  const icons = isShown(props, 'showIcons')
  const pad = ctx.tokens.space.lg
  const sm = ctx.tokens.space.sm
  let heights: number[]
  if (style === 'callouts') {
    heights = measureHeights(ctx, sides.map((s, i) => calloutSpec(s, i === 0 ? 'danger' : 'success', icons, `c${i}`)), cw)
  } else {
    const inner = Math.max(1, cw - 2 * pad)
    const head = icons ? 56 + sm : 0
    heights = sides.map((s, i) => {
      const t = s.title ? measureHeights(ctx, [{ id: `t${i}`, type: 'tls.t.title', props: { text: s.title, size: 'subheading' } }], inner)[0] + sm : 0
      const b = measureHeights(ctx, [{ id: `b${i}`, type: 'tls.t.body', props: { text: toMeasurable(s.text) } }], inner)[0]
      return 2 * pad + head + t + b
    })
  }
  const h = Math.max(1, ...heights)
  return { cw, gutter, needed: Math.max(h, ARROW), heights: [h, h] }
}

export function layoutProblemSolution(props: ProblemSolutionProps, ctx: LayoutContext): LayoutNode {
  const style = pick(props.style, STYLES, 'panels')
  const p = plan(props, ctx)
  const sides = [sideOf(props.problem), sideOf(props.solution)]
  const icons = isShown(props, 'showIcons')
  const total = Math.max(1, Math.ceil(p.needed))
  const pad = ctx.tokens.space.lg
  const sm = ctx.tokens.space.sm
  const surface = ctx.resolveColor('surface').color
  const neg = ctx.resolveColor('negative').color
  const pos = ctx.resolveColor('positive').color
  const accent = ctx.resolveColor('accent').color
  const pieces: Piece[] = []
  const names = ['problem', 'solution']

  sides.forEach((s, i) => {
    const x = i === 0 ? 0 : p.cw + p.gutter
    const role = i === 0 ? neg : pos
    if (style === 'callouts') {
      pieces.push({ id: names[i], spec: calloutSpec(s, i === 0 ? 'danger' : 'success', icons, names[i]), box: { x, y: 0, width: p.cw, height: total } })
      return
    }
    const bg = tintOf(surface, role, 0.12)
    const ink = readableOn(role, bg)
    const on = onSurface({ type: 'solid', color: bg })
    const inner = Math.max(1, p.cw - 2 * pad)
    pieces.push({
      id: `panel[${i}]`,
      raw: [{ k: 'rect', box: { x, y: 0, width: p.cw, height: total }, fill: { type: 'solid', color: bg }, radius: ctx.tokens.radius.lg } as LayoutNode],
      box: { x, y: 0, width: p.cw, height: total },
    })
    let y = pad
    if (icons) {
      pieces.push({ id: `icon[${i}]`, raw: [iconLeaf(i === 0 ? 'alert-triangle' : 'check-circle', { x: x + pad, y, width: 56, height: 56 }, ink)], box: { x: x + pad, y, width: 56, height: 56 } })
      y += 56 + sm
    }
    if (s.title) {
      const th = measureHeights(ctx, [{ id: 't', type: 'tls.t.title', props: { text: s.title, size: 'subheading' } }], inner)[0]
      pieces.push({ id: `title[${i}]`, spec: { id: `title-${i}`, type: 'tls.t.title', props: { text: s.title, size: 'subheading', color: ink, ...on } }, box: { x: x + pad, y, width: inner, height: th } })
      y += th + sm
    }
    const bh = measureHeights(ctx, [{ id: 'b', type: 'tls.t.body', props: { text: toMeasurable(s.text) } }], inner)[0]
    pieces.push({ id: `text[${i}]`, spec: { id: `text-${i}`, type: 'tls.t.body', props: { text: toMeasurable(s.text), ...on } }, box: { x: x + pad, y, width: inner, height: bh } })
  })

  // The arrow in the gutter.
  const ax = p.cw + (p.gutter - ARROW) / 2
  const ay = (total - ARROW) / 2
  pieces.push({
    id: 'arrowbg',
    raw: [{ k: 'rect', box: { x: ax, y: ay, width: ARROW, height: ARROW }, fill: { type: 'solid', color: accent }, radius: ARROW / 2 } as LayoutNode],
    box: { x: ax, y: ay, width: ARROW, height: ARROW },
  })
  // `arrow-right` in the icon set is a chevron, so the arrow is a filled polygon (shaft + head), absolute in block space.
  const cy = ay + ARROW / 2
  const x0 = ax + 18
  const x1 = ax + ARROW - 30
  const x2 = ax + ARROW - 16
  const arrowD = `M ${x0} ${cy - 7} L ${x1} ${cy - 7} L ${x1} ${cy - 18} L ${x2} ${cy} L ${x1} ${cy + 18} L ${x1} ${cy + 7} L ${x0} ${cy + 7} Z`
  const fullBox = { x: 0, y: 0, width: Math.max(0, ctx.box.width) || 0, height: total }
  pieces.push({ id: 'arrow', raw: [{ k: 'path', box: fullBox, d: arrowD, fill: { type: 'solid', color: onColor(ctx, accent) } } as LayoutNode], box: fullBox })

  const root = composeFlat(ctx, pieces, total)
  if (style === 'callouts' && root.k === 'group') {
    // The callouts' own icon nodes are renamed so the `icons` toggle has a part to remove.
    let n = 0
    root.children = root.children.map((c) => (c.k === 'icon' && /^(problem|solution)/.test(c.part ?? '') ? ({ ...c, part: `icon[${n++}]` } as LayoutNode) : c))
  }
  return root
}

const composite = defineCompositeBlock<ProblemSolutionProps>({
  type: 'tls.c.problem-solution',
  name: 'Problem and solution',
  family: 'composite',
  tier: 'A',
  summary: 'A problem statement and its solution side by side, joined by an arrow.',
  keywords: ['problem', 'solution', 'pain point', 'pitch', 'proposal', 'challenge', 'fix', 'before and after'],
  category: 'comparison',
  scope: 'group',
  shortDescription: 'Problem statement on one side, solution on the other, joined by an arrow',
  related: ['tls.g.before-after', 'tls.t.callout', 'tls.c.case-study'],
  schema,
  defaults,
  size: { preferred: [1500, 360], min: [560, 200] },
  describe: {
    when: 'Pitch and proposal slides framing a pain point and the answer to it.',
    avoid: 'A visual before and after: tls.g.before-after or tls.m.image-compare.',
    example: {
      id: 'b_ps',
      type: 'tls.c.problem-solution',
      props: {
        problem: { title: 'The problem', text: 'Queues of **20 minutes** at peak hours.' },
        solution: { title: 'The solution', text: 'Self-service kiosks: **under 4 minutes**.' },
        showIcons: true,
        style: 'panels',
      },
    },
  },
  motion: { parts: ['root'], preset: 'fade-up' },
  build: buildProblemSolution,
})

export const tlsCProblemSolution: BlockDefinition = {
  ...composite,
  layout: ((props: ProblemSolutionProps, ctx: LayoutContext): LayoutNode => layoutProblemSolution(props, ctx)) as BlockDefinition['layout'],
  intrinsicSize: ((props: ProblemSolutionProps, ctx: LayoutContext): Size => ({ width: Math.max(0, ctx.box.width), height: Math.max(1, Math.ceil(plan(props, ctx).needed)) })) as BlockDefinition['intrinsicSize'],
}
