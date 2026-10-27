/**
 * tls.t.highlight — spro creative CR8 (PLAN Appendix C.1): a passage with its key words marked (marker, underline or circle) and short margin notes.
 * Layout: `../_poster.ts` (measured stacks centred in the block, a side column when the variant
 * has one, growing past a too-short box); `build()` is the same cells as a stack/row tree.
 */
import type { BlockDefinition, BlockSchema, BlockSpec, LayoutContext, LayoutNode, RichText } from '../../../types'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { enumSlot } from '../../data/_chart/schema-kit'
import { pick, strings, richItems } from '../_kit'
import { posterBuild, posterLayout, schemaCapacity, type Cell, type PosterOptions } from '../_poster'

export interface HighlightProps extends Record<string, unknown> {
  text: string | RichText
  notes?: string[]
  source?: string
  variant?: 'marker' | 'underline' | 'circle'
}
const VARIANTS = ['marker', 'underline', 'circle'] as const
const EMPHASIS = { marker: 'highlight', underline: 'underline', circle: 'circle' } as const

export const schema: BlockSchema = {
  text: { type: { kind: 'richText', maxChars: 140 }, role: 'content', label: 'Passage', required: true, guidance: 'Verbatim from the source; the marked words in **bold**.' },
  notes: { type: { kind: 'list', of: { kind: 'text', maxChars: 60 }, min: 0, max: 3 }, role: 'content', label: 'Margin notes' },
  source: { type: { kind: 'text', maxChars: 60 }, role: 'content', label: 'Source' },
  variant: enumSlot([...VARIANTS], 'Mark'),
}

export const defaults: HighlightProps = { text: { runs: [{ text: 'A model is only as good as ' }, { text: 'the question', bold: true }, { text: ' it was trained to answer.' }] }, notes: ['Ask the question first', 'Then pick the data'], source: 'Lecture notes, ch. 1', variant: 'marker' }

function cells(props: HighlightProps): { main: Cell[]; opts: PosterOptions } {
  const v = pick(props.variant, VARIANTS, 'marker')
  const main: Cell[] = [{ spec: { id: 'text', type: 'tls.t.statement', props: { text: props.text, size: 'lg', emphasis: EMPHASIS[v], showMark: false } } }]
  if (props.source) main.push({ spec: { id: 'source', type: 'tls.t.caption', props: { text: props.source } } })
  const notes = strings(props.notes, 3)
  const side: Cell[] = notes.map((n, i) => ({ spec: { id: `note-${i}`, type: 'tls.t.caption', props: { text: n, color: 'accent' } } as BlockSpec, group: 'note' }))
  return { main, opts: side.length ? { side, ratio: 0.68 } : { maxWidth: 1400 } }
}

export function buildHighlight(props: HighlightProps): BlockSpec {
  const c = cells(props)
  return posterBuild('highlight', c.main, c.opts.side)
}

export function layoutHighlight(props: HighlightProps, ctx: LayoutContext): LayoutNode {
  const c = cells(props)
  return posterLayout(ctx, c.main, c.opts)
}

const composite = defineCompositeBlock<HighlightProps>({
  type: 'tls.t.highlight',
  name: 'Highlight',
  family: 'text',
  tier: 'A',
  summary: 'A passage with its key words marked and short margin notes.',
  keywords: ["highlight", "quote", "passage", "key words", "annotate", "text"],
  category: 'emphasis',
  scope: 'slide',
  shortDescription: 'Passage with marked key words and margin notes',
  related: ["tls.t.quote", "tls.t.statement", "tls.t.definition"],
  schema,
  defaults,
  size: { preferred: [1600, 800], min: [640, 360] },
  describe: {
    when: 'Show a short source passage and point at the words that matter.',
    avoid: 'A quote with its author only: tls.t.quote.',
    example: { id: 'b_highlight', type: 'tls.t.highlight', props: { text: { runs: [{ text: 'A model is only as good as ' }, { text: 'the question', bold: true }, { text: '.' }] }, notes: ['Ask the question first'] } },
  },
  motion: {
    parts: ["text", "source", "note"],
    preset: 'fade-up',
    partMotion: {
      'text': { preset: 'fade-up', delay: 0, stagger: 60 },
      'source': { preset: 'fade-up', delay: 150, stagger: 60 },
      'note': { preset: 'fade-up', delay: 300, stagger: 60 },
    },
  },
  build: buildHighlight,
})

export const tlsTHighlight: BlockDefinition = {
  ...composite,
  intrinsicSize: undefined,
  layout: ((props: HighlightProps, ctx: LayoutContext): LayoutNode => layoutHighlight(props, ctx)) as BlockDefinition['layout'],
  capacity: ((props: HighlightProps) => schemaCapacity(schema, props)) as BlockDefinition['capacity'],
}
