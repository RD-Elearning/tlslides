/**
 * tls.c.takeaway-poster — spro creative CR8 (PLAN Appendix C.1): one to three takeaways at heading scale, each led by a giant numeral.
 * Layout: `../_poster.ts` (measured stacks centred in the block, a side column when the variant
 * has one, growing past a too-short box); `build()` is the same cells as a stack/row tree.
 */
import type { BlockDefinition, BlockSchema, BlockSpec, LayoutContext, LayoutNode, RichText } from '../../../types'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { enumSlot } from '../../data/_chart/schema-kit'
import { pick, strings, richItems } from '../_kit'
import { posterBuild, posterLayout, schemaCapacity, type Cell, type PosterOptions } from '../_poster'

export interface TakeawayPosterProps extends Record<string, unknown> {
  kicker?: string
  items: Array<string | RichText>
  variant?: 'row' | 'stack' | 'numerals-off'
}
const VARIANTS = ['row', 'stack', 'numerals-off'] as const

export const schema: BlockSchema = {
  kicker: { type: { kind: 'text', maxChars: 40 }, role: 'content', label: 'Kicker' },
  items: { type: { kind: 'list', of: { kind: 'richText', maxChars: 90 }, min: 1, max: 3 }, role: 'content', label: 'Takeaways', required: true, guidance: '1-3 sentences to remember.' },
  variant: enumSlot([...VARIANTS], 'Variant', 'row: side by side; stack: one under the other; numerals-off: no numbers.'),
}

export const defaults: TakeawayPosterProps = { kicker: 'Three things to keep', items: ['Data beats opinion when the question is clear', 'Measure before you change anything', 'Small tests, often'], variant: 'stack' }

function cells(props: TakeawayPosterProps): { main: Cell[]; opts: PosterOptions } {
  const v = pick(props.variant, VARIANTS, 'stack')
  const items = richItems(props.items, 3)
  const main: Cell[] = []
  if (props.kicker) main.push({ spec: { id: 'kicker', type: 'tls.t.kicker', props: { text: props.kicker } } })
  const numeral = (i: number): BlockSpec => ({ id: `numeral-${i}`, type: 'tls.t.marker', props: { value: String(i + 1), variant: 'numeral', tone: 'solid', size: items.length >= 3 ? 'md' : 'lg' } })
  const text = (t: string | RichText, i: number): BlockSpec => ({ id: `item-${i}`, type: 'tls.t.statement', props: { text: t, size: items.length > 1 ? 'md' : 'xl', showMark: false } })
  if (v === 'row' && items.length > 1) {
    const cols: BlockSpec[] = items.map((t, i) => ({ id: `col-${i}`, type: 'tls.l.stack', props: { gap: 'sm', sizing: 'content', children: [numeral(i), text(t, i)] } }))
    main.push({ spec: { id: 'items', type: 'tls.l.grid', props: { columns: items.length, gap: 'xl', sizing: 'equal', children: cols } }, group: 'item' })
  } else {
    items.forEach((t, i) => {
      if (v !== 'numerals-off') main.push({ spec: numeral(i), group: 'numeral', space: i ? 0.5 : 0 })
      main.push({ spec: text(t, i), group: 'item' })
    })
  }
  return { main, opts: { maxWidth: 1500 } }
}

export function buildTakeawayPoster(props: TakeawayPosterProps): BlockSpec {
  const c = cells(props)
  return posterBuild('takeaway_poster', c.main, c.opts.side)
}

export function layoutTakeawayPoster(props: TakeawayPosterProps, ctx: LayoutContext): LayoutNode {
  const c = cells(props)
  return posterLayout(ctx, c.main, c.opts)
}

const composite = defineCompositeBlock<TakeawayPosterProps>({
  type: 'tls.c.takeaway-poster',
  name: 'Takeaway poster',
  family: 'composite',
  tier: 'A',
  summary: 'One to three takeaways set large, each with a giant numeral.',
  keywords: ["takeaway", "summary", "closing", "key points", "remember", "poster"],
  category: 'closing',
  scope: 'slide',
  shortDescription: 'One to three takeaways with giant numerals',
  related: ["tls.c.recap", "tls.t.takeaway", "tls.c.one-question"],
  schema,
  defaults,
  size: { preferred: [1600, 800], min: [960, 640] },
  describe: {
    when: 'End or sum up with the one to three things to remember.',
    avoid: 'More than three points: tls.c.recap.',
    example: { id: 'b_takeaway_poster', type: 'tls.c.takeaway-poster', props: { kicker: 'To remember', items: ['Measure before you change', 'Small tests, often'] } },
  },
  motion: {
    parts: ["kicker", "numeral", "item"],
    preset: 'fade-up',
    partMotion: {
      'kicker': { preset: 'fade-up', delay: 0, stagger: 60 },
      'numeral': { preset: 'fade-up', delay: 150, stagger: 60 },
      'item': { preset: 'fade-up', delay: 300, stagger: 60 },
    },
  },
  build: buildTakeawayPoster,
})

export const tlsCTakeawayPoster: BlockDefinition = {
  ...composite,
  intrinsicSize: undefined,
  layout: ((props: TakeawayPosterProps, ctx: LayoutContext): LayoutNode => layoutTakeawayPoster(props, ctx)) as BlockDefinition['layout'],
  capacity: ((props: TakeawayPosterProps) => schemaCapacity(schema, props)) as BlockDefinition['capacity'],
}
