/**
 * tls.c.chapter-divider — spro creative CR8 (PLAN Appendix C.1): a section divider: a big numeral, the section's title and question, and the progress through the deck.
 * Layout: `../_poster.ts` (measured stacks centred in the block, a side column when the variant
 * has one, growing past a too-short box); `build()` is the same cells as a stack/row tree.
 */
import type { BlockDefinition, BlockSchema, BlockSpec, LayoutContext, LayoutNode, RichText } from '../../../types'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { enumSlot } from '../../data/_chart/schema-kit'
import { pick, strings, richItems } from '../_kit'
import { posterBuild, posterLayout, schemaCapacity, type Cell, type PosterOptions } from '../_poster'

export interface ChapterDividerProps extends Record<string, unknown> {
  number?: string
  title: string
  question?: string
  index?: number
  total?: number
  variant?: 'numeral' | 'question' | 'progress'
}
const VARIANTS = ['numeral', 'question', 'progress'] as const

export const schema: BlockSchema = {
  number: { type: { kind: 'text', maxChars: 4 }, role: 'content', label: 'Number' },
  title: { type: { kind: 'text', maxChars: 60 }, role: 'content', label: 'Title', required: true },
  question: { type: { kind: 'text', maxChars: 100 }, role: 'content', label: 'Question', guidance: 'What this section answers.' },
  index: { type: { kind: 'number', min: 1, max: 20 }, role: 'option', label: 'Section', help: 'This section number (progress).' },
  total: { type: { kind: 'number', min: 1, max: 20 }, role: 'option', label: 'Sections', help: 'How many sections (progress).' },
  variant: enumSlot([...VARIANTS], 'Variant'),
}

export const defaults: ChapterDividerProps = { number: '02', title: 'What we measured', question: 'Where does the time go between arrival and the visit?', index: 2, total: 4, variant: 'numeral' }

function cells(props: ChapterDividerProps): { main: Cell[]; opts: PosterOptions } {
  const v = pick(props.variant, VARIANTS, 'numeral')
  const main: Cell[] = []
  main.push({ spec: { id: 'title', type: 'tls.t.title', props: { text: props.title, size: v === 'question' ? 'heading' : 'title' } } })
  if (props.question) main.push({ spec: { id: 'question', type: 'tls.t.statement', props: { text: props.question, size: v === 'question' ? 'xl' : 'md', showMark: false } } })
  const idx = Number(props.index) || 0
  const tot = Number(props.total) || 0
  if (v === 'progress' && idx > 0 && tot >= idx) main.push({ spec: { id: 'progress', type: 'tls.t.badge', props: { text: `${idx} / ${tot}`, tone: 'soft', size: 'md' } }, space: 1 })
  const side: Cell[] | undefined = props.number && v !== 'question' ? [{ spec: { id: 'numeral', type: 'tls.t.marker', props: { value: String(props.number), variant: 'numeral', tone: 'solid', size: 'lg', align: 'center' } }, align: 'center' }] : undefined
  return { main, opts: side ? { side, ratio: 0.68, sideFirst: true } : { maxWidth: 1400 } }
}

export function buildChapterDivider(props: ChapterDividerProps): BlockSpec {
  const c = cells(props)
  return posterBuild('chapter_divider', c.main, c.opts.side)
}

export function layoutChapterDivider(props: ChapterDividerProps, ctx: LayoutContext): LayoutNode {
  const c = cells(props)
  return posterLayout(ctx, c.main, c.opts)
}

const composite = defineCompositeBlock<ChapterDividerProps>({
  type: 'tls.c.chapter-divider',
  name: 'Chapter divider',
  family: 'composite',
  tier: 'A',
  summary: 'A section divider with a big numeral, the section’s question and the progress.',
  keywords: ["divider", "section", "chapter", "numeral", "progress"],
  category: 'divider',
  scope: 'slide',
  shortDescription: 'Section divider with a numeral, a question and progress',
  related: ["tls.c.divider", "tls.c.route-agenda", "tls.t.statement"],
  schema,
  defaults,
  size: { preferred: [1600, 800], min: [640, 360] },
  describe: {
    when: 'Open a section: its number, its title and the question it answers.',
    avoid: 'A colour field with the title only: tls.c.divider.',
    example: { id: 'b_chapter_divider', type: 'tls.c.chapter-divider', props: { number: '02', title: 'What we measured', question: 'Where does the time go?', index: 2, total: 4 } },
  },
  motion: {
    parts: ["numeral", "title", "question", "progress"],
    preset: 'fade-up',
    partMotion: {
      'numeral': { preset: 'fade-up', delay: 0, stagger: 60 },
      'title': { preset: 'fade-up', delay: 150, stagger: 60 },
      'question': { preset: 'fade-up', delay: 300, stagger: 60 },
      'progress': { preset: 'fade-up', delay: 450, stagger: 60 },
    },
  },
  build: buildChapterDivider,
})

export const tlsCChapterDivider: BlockDefinition = {
  ...composite,
  intrinsicSize: undefined,
  layout: ((props: ChapterDividerProps, ctx: LayoutContext): LayoutNode => layoutChapterDivider(props, ctx)) as BlockDefinition['layout'],
  capacity: ((props: ChapterDividerProps) => schemaCapacity(schema, props)) as BlockDefinition['capacity'],
}
