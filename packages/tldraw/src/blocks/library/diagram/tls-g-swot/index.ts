/**
 * tls.g.swot — strengths / weaknesses / opportunities / threats as a 2x2 of cards (Tier A composite).
 *
 * Built with `defineCompositeBlock`, no layout math: `tls.l.grid` (2x2) of `tls.l.card`, each
 * holding one `tls.l.stack` with `tls.t.kicker` + `tls.t.bullets`. The spec tree is 4 deep
 * (grid, card, stack, leaf), which is the layout depth cap, so a SWOT must sit directly in a slide
 * region; nested inside another container it would be cut off by the depth guard.
 *
 * Colours are roles, never hex: S positive, W negative, O accent, T warning. `tinted` fills each
 * card with its role colour, `outline` keeps neutral cards and only colours the heading marker.
 */

import type { BlockDefinition, BlockSchema, BlockSpec, CapacityReport, LayoutContext, LayoutNode } from '../../../types'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { enumSlot } from '../../data/_chart/schema-kit'
import { capacityOf } from '../_kit'

export const SWOT_MAX_ITEMS = 5

const listSlot = (label: string, guidance: string) => ({
  type: { kind: 'list', of: { kind: 'text', maxChars: 80 }, min: 1, max: SWOT_MAX_ITEMS },
  role: 'content',
  label,
  required: true,
  guidance,
}) as BlockSchema[string]

export const schema: BlockSchema = {
  strengths: listSlot('Strengths', 'Internal positives, 3-5 short phrases.'),
  weaknesses: listSlot('Weaknesses', 'Internal negatives.'),
  opportunities: listSlot('Opportunities', 'External positives.'),
  threats: listSlot('Threats', 'External negatives.'),
  style: enumSlot(['tinted', 'outline'], 'Style', 'tinted = coloured cards, outline = neutral cards.'),
  letters: { type: { kind: 'boolean' }, role: 'option', label: 'Big letters', help: 'A large S, W, O or T above each heading. Needs tall quadrants: full-width slide, 3 items or fewer.' },
}

export interface SwotProps extends Record<string, unknown> {
  strengths: string[]
  weaknesses: string[]
  opportunities: string[]
  threats: string[]
  style?: 'tinted' | 'outline'
  letters?: boolean
}

export const defaults: SwotProps = {
  strengths: ['Strong brand', 'Loyal customers', 'Lean team'],
  weaknesses: ['Small budget', 'One key supplier'],
  opportunities: ['New markets', 'Partner channels'],
  threats: ['New entrants', 'Price pressure'],
  style: 'tinted',
  letters: false,
}

const QUADS = [
  { key: 'strengths', title: 'Strengths', letter: 'S', role: 'positive' },
  { key: 'weaknesses', title: 'Weaknesses', letter: 'W', role: 'negative' },
  { key: 'opportunities', title: 'Opportunities', letter: 'O', role: 'accent' },
  { key: 'threats', title: 'Threats', letter: 'T', role: 'warning' },
] as const

const textsOf = (v: unknown): string[] =>
  (Array.isArray(v) ? v : []).filter((x): x is string => typeof x === 'string' && x.trim() !== '').slice(0, SWOT_MAX_ITEMS)

/** The spec tree. Exported for tests (depth and toggle checks). */
export function buildSwot(props: SwotProps): BlockSpec {
  const tinted = props.style !== 'outline'
  const children: BlockSpec[] = QUADS.map((q) => {
    // On a role-coloured card the heading must not use that same role, so it falls back to the text role.
    const mark = tinted ? 'text' : q.role
    const stack: BlockSpec[] = []
    if (props.letters === true) {
      stack.push({ id: `${q.key}-letter`, type: 'tls.t.hero-number', props: { value: q.letter, format: 'plain', emphasis: 'accent', $block: { style: { accent: mark } } } })
    }
    stack.push({ id: `${q.key}-title`, type: 'tls.t.kicker', props: { text: q.title, marker: true, $block: { style: { accent: mark } } } })
    stack.push({ id: `${q.key}-items`, type: 'tls.t.bullets', props: { items: textsOf(props[q.key]).map((text) => ({ text })), marker: 'dot', spacing: 'sm' } })
    return {
      id: q.key,
      type: 'tls.l.card',
      props: {
        padding: 'md',
        children: [{ id: `${q.key}-stack`, type: 'tls.l.stack', props: { gap: 'sm', sizing: 'content', children: stack } }],
        // Child styles travel in `props.$block.style` (what `ctx.layoutChild` reads), not `BlockSpec.style`.
        ...(tinted ? { $block: { style: { surface: q.role } } } : {}),
      },
    }
  })
  return { id: 'swot', type: 'tls.l.grid', props: { columns: 2, rows: 2, gap: 'md', sizing: 'equal', children } }
}

const swotDef = defineCompositeBlock<SwotProps>({
  type: 'tls.g.swot',
  name: 'SWOT',
  family: 'diagram',
  tier: 'A',
  summary: 'SWOT grid: strengths, weaknesses, opportunities and threats as four bullet lists.',
  keywords: ['swot', 'strengths', 'weaknesses', 'opportunities', 'threats', 'assessment'],
  category: 'comparison',
  scope: 'group',
  shortDescription: 'SWOT grid of strengths, weaknesses, opportunities and threats as bullet lists',
  related: ['tls.g.matrix-2x2', 'tls.c.comparison'],
  schema,
  defaults,
  size: { preferred: [1100, 620], min: [640, 380] },
  describe: {
    when: 'Contrast: a strategic assessment of an organisation, product or idea (internal vs external, good vs bad).',
    avoid: 'Any other two-axis grid (use tls.g.matrix-2x2) or a plain pro/con list (use tls.g.pros-cons).',
    example: {
      id: 'b_swot',
      type: 'tls.g.swot',
      props: {
        strengths: ['Strong brand', 'Loyal users'],
        weaknesses: ['Small budget'],
        opportunities: ['New markets'],
        threats: ['New entrants'],
      },
    },
  },
  motion: { parts: ['root'], preset: 'stagger-grid' },
  build: buildSwot,
})

function capacity(props: SwotProps): CapacityReport {
  const used = (k: keyof SwotProps) => (Array.isArray(props[k]) ? (props[k] as unknown[]).length : 0)
  return capacityOf(
    Object.fromEntries(QUADS.map((q) => [q.key, { max: SWOT_MAX_ITEMS, used: used(q.key) }])),
    true,
    [{ kind: 'truncate', slot: 'strengths' }, { kind: 'paginate' }]
  )
}

/** Below this the nested cards would get negative boxes (grid gap + card padding): render nothing. */
const MIN_BOX = { width: 120, height: 80 }

export const tlsGSwot: BlockDefinition = {
  ...swotDef,
  // Fill the region instead of reporting the card stack's content height (which overran the slide).
  intrinsicSize: undefined,
  layout: ((props: SwotProps, ctx: LayoutContext): LayoutNode => {
    const { width, height } = ctx.box
    if (!(width >= MIN_BOX.width && height >= MIN_BOX.height)) {
      return { k: 'group', part: 'root', box: { x: 0, y: 0, width: Math.max(0, width) || 0, height: Math.max(0, height) || 0 }, children: [] }
    }
    return swotDef.layout(props, ctx)
  }) as BlockDefinition['layout'],
  capacity: capacity as BlockDefinition['capacity'],
}
