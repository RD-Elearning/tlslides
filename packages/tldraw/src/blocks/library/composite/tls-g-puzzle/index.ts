/**
 * tls.g.puzzle — spro creative CR13 (PLAN Appendix C.3): Parts that fit together into a whole.
 * Layout: `../_poster.ts` (measured stacks centred in the block, a side column when the variant
 * has one, growing past a too-short box); `build()` is the same cells as a stack/row tree.
 */
import type { BlockDefinition, BlockSchema, BlockSpec, LayoutContext, LayoutNode, RichText } from '../../../types'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { enumSlot } from '../../data/_chart/schema-kit'
import { pick, strings, richItems } from '../_kit'
import { objects, text as str } from '../_wave2'
import { posterBuild, posterLayout, schemaCapacity, type Cell, type PosterOptions } from '../_poster'

export interface PuzzleProps extends Record<string, unknown> {
  whole?: string
  pieces: Array<{ label: string; text?: string; icon?: string }>
  variant?: 'row' | 'grid' | 'ring'
}
const VARIANTS = ['row', 'grid', 'ring'] as const

export const schema: BlockSchema = {
  whole: { type: { kind: 'text', maxChars: 32 }, role: 'content', label: 'The whole' },
  pieces: { type: { kind: 'list', of: { kind: 'object', fields: {
    label: { type: { kind: 'text', maxChars: 24 }, role: 'content', label: 'Label', required: true },
    text: { type: { kind: 'text', maxChars: 60 }, role: 'content', label: 'Text' },
    icon: { type: { kind: 'icon' }, role: 'content', label: 'Icon' },
  } }, min: 2, max: 6 }, role: 'content', label: 'Pieces', required: true },
  variant: enumSlot([...VARIANTS], 'Variant'),
}

export const defaults: PuzzleProps = { whole: 'A working model', pieces: [{ label: 'Data', text: 'Clean and labelled', icon: 'database' }, { label: 'Features', text: 'Chosen with care', icon: 'sliders' }, { label: 'Evaluation', text: 'On held-out data', icon: 'check' }, { label: 'Feedback', text: 'From real users', icon: 'message-circle' }], variant: 'grid' }

function cells(props: PuzzleProps): { main: Cell[]; opts: PosterOptions } {
  const v = pick(props.variant, VARIANTS, 'grid')
  const pieces = objects<{ label?: unknown; text?: unknown; icon?: unknown }>(props.pieces, 6).filter((p) => str(p.label, 24))
  const items: BlockSpec[] = pieces.map((p, i) => ({ id: `piece-${i}`, type: 'tls.l.card', props: { padding: 'md', children: [
    { id: `piece-icon-${i}`, type: 'tls.m.icon', props: { icon: str(p.icon, 40) || 'puzzle', size: 'md', iconStyle: 'disc' } },
    { id: `piece-label-${i}`, type: 'tls.t.title', props: { text: str(p.label, 24), size: 'subheading' } },
    ...(str(p.text, 60) ? [{ id: `piece-text-${i}`, type: 'tls.t.body', props: { text: str(p.text, 60) } }] : []),
  ], $block: { style: { surface: i % 2 ? 'surfaceAlt' : 'surface' } } } }))
  const n = Math.max(1, items.length)
  const columns = v === 'row' ? Math.min(n, 6) : Math.min(3, n <= 4 ? Math.min(n, 2) : 3)
  const main: Cell[] = []
  if (str(props.whole, 32)) main.push({ spec: { id: 'whole', type: 'tls.t.title', props: { text: str(props.whole, 32), size: 'heading', align: 'center' } } })
  if (items.length) main.push({ spec: { id: 'pieces', type: 'tls.l.grid', props: { columns, gap: v === 'ring' ? 'lg' : 'sm', sizing: 'equal', children: items } }, group: 'piece', grid: { columns, items } })
  return { main, opts: {} }
}

export function buildPuzzle(props: PuzzleProps): BlockSpec {
  const c = cells(props)
  return posterBuild('puzzle', c.main, c.opts.side)
}

export function layoutPuzzle(props: PuzzleProps, ctx: LayoutContext): LayoutNode {
  const c = cells(props)
  return posterLayout(ctx, c.main, c.opts)
}

const composite = defineCompositeBlock<PuzzleProps>({
  type: 'tls.g.puzzle',
  name: "Puzzle",
  family: 'composite',
  tier: 'A',
  summary: "Parts that fit together into a whole.",
  keywords: ["puzzle", "pieces", "parts", "whole", "fit", "components"],
  category: 'relationship',
  scope: 'slide',
  shortDescription: "Pieces that fit into one whole",
  related: ["tls.c.cards", "tls.g.hub-spoke", "tls.g.venn"],
  schema,
  defaults,
  size: { preferred: [1600, 800], min: [640, 680] },
  describe: {
    when: "A few parts that only work together, making one whole.",
    avoid: "Peers that stand alone: tls.c.cards.",
    example: {"id": "b_puzzle", "type": "tls.g.puzzle", "props": {"whole": "A working model", "pieces": [{"label": "Data", "text": "Clean and labelled", "icon": "database"}, {"label": "Features", "text": "Chosen with care", "icon": "sliders"}, {"label": "Evaluation", "text": "On held-out data", "icon": "check"}]}},
  },
  motion: {
    parts: ["whole", "piece"],
    preset: 'fade-up',
    partMotion: {
      'whole': { preset: 'fade-up', delay: 0, stagger: 60 },
      'piece': { preset: 'fade-up', delay: 150, stagger: 60 },
    },
  },
  build: buildPuzzle,
})

export const tlsGPuzzle: BlockDefinition = {
  ...composite,
  intrinsicSize: undefined,
  layout: ((props: PuzzleProps, ctx: LayoutContext): LayoutNode => layoutPuzzle(props, ctx)) as BlockDefinition['layout'],
  capacity: ((props: PuzzleProps) => schemaCapacity(schema, props)) as BlockDefinition['capacity'],
}
