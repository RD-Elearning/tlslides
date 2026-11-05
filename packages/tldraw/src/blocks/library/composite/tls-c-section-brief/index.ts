/**
 * tls.c.section-brief — spro sprint 2026-11b S07-c (D33): a section divider that teaches: the section's
 * number, its title, its guiding question and the 2–4 things it covers. In a learning deck a divider is
 * a page of the course map, not a colour field.
 * Layout: `../_poster.ts` (measured stacks; the numeral or the points in a side column by variant).
 */
import type { BlockDefinition, BlockSchema, BlockSpec, LayoutContext, LayoutNode } from '../../../types'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { enumSlot } from '../../data/_chart/schema-kit'
import { pick, strings } from '../_kit'
import { posterBuild, posterLayout, schemaCapacity, type Cell, type PosterOptions } from '../_poster'

export interface SectionBriefProps extends Record<string, unknown> {
  number?: string
  title: string
  question?: string
  points?: string[]
  variant?: 'left-rail' | 'split' | 'numbered'
}
const VARIANTS = ['left-rail', 'split', 'numbered'] as const

export const schema: BlockSchema = {
  number: { type: { kind: 'text', maxChars: 4 }, role: 'content', label: 'Number' },
  title: { type: { kind: 'text', maxChars: 70 }, role: 'content', label: 'Title', required: true },
  question: { type: { kind: 'text', maxChars: 140 }, role: 'content', label: 'Question', guidance: 'The question this section answers, or its one-line objective.' },
  points: {
    type: { kind: 'list', of: { kind: 'text', maxChars: 90 }, min: 0, max: 4 },
    role: 'content',
    label: 'In this section',
    guidance: '2–4 things the section covers, each a short phrase from its passages.',
  },
  variant: enumSlot([...VARIANTS], 'Variant'),
}

export const defaults: SectionBriefProps = {
  number: '02',
  title: 'Sets of numbers',
  question: 'How do the natural numbers grow into the integers and the rationals?',
  points: ['Natural numbers and their operations', 'Integers: closing subtraction', 'Fractions and decimals'],
  variant: 'left-rail',
}

function cells(props: SectionBriefProps): { main: Cell[]; opts: PosterOptions } {
  const v = pick(props.variant, VARIANTS, 'left-rail')
  const points = strings(props.points).slice(0, 4)
  const title: Cell = { spec: { id: 'title', type: 'tls.t.title', props: { text: props.title, size: 'title' } } }
  const question: Cell | null = props.question ? { spec: { id: 'question', type: 'tls.t.body', props: { text: props.question, size: 'lead' } } } : null
  const list: Cell | null = points.length
    ? { spec: { id: 'points', type: 'tls.t.numbered', props: { items: points, markerStyle: 'badge', spacing: 'relaxed' } }, space: 1 }
    : null
  const numeral: Cell | null = props.number ? { spec: { id: 'numeral', type: 'tls.t.marker', props: { value: String(props.number), variant: 'numeral', tone: 'solid', size: 'lg', align: 'center' } }, align: 'center' } : null
  if (v === 'split') {
    // the section on the left (numeral, title, question), what it covers on the right
    const main = [...(numeral ? [{ ...numeral, align: 'start' as const }] : []), title, ...(question ? [question] : [])]
    return { main, opts: list ? { side: [{ ...list, space: 0 }], ratio: 0.52, valign: 'center' } : { maxWidth: 1400 } }
  }
  if (v === 'numbered') {
    const badge: Cell[] = props.number ? [{ spec: { id: 'numeral', type: 'tls.t.badge', props: { text: String(props.number), tone: 'solid', size: 'md' } } }] : []
    return { main: [...badge, title, ...(question ? [question] : []), ...(list ? [list] : [])], opts: { maxWidth: 1500 } }
  }
  const main = [title, ...(question ? [question] : []), ...(list ? [list] : [])]
  return { main, opts: numeral ? { side: [numeral], ratio: 0.74, sideFirst: true } : { maxWidth: 1500 } }
}

export function buildSectionBrief(props: SectionBriefProps): BlockSpec {
  const c = cells(props)
  return posterBuild('section_brief', c.main, c.opts.side)
}

export function layoutSectionBrief(props: SectionBriefProps, ctx: LayoutContext): LayoutNode {
  const c = cells(props)
  return posterLayout(ctx, c.main, c.opts)
}

const composite = defineCompositeBlock<SectionBriefProps>({
  type: 'tls.c.section-brief',
  name: 'Section brief',
  family: 'composite',
  tier: 'A',
  summary: 'A teaching section divider: number, title, guiding question and the points it covers.',
  keywords: ['divider', 'section', 'objectives', 'overview', 'chapter', 'learning'],
  category: 'divider',
  scope: 'slide',
  shortDescription: 'Section divider with its question and the points it covers',
  related: ['tls.c.chapter-divider', 'tls.c.divider', 'tls.c.route-agenda'],
  schema,
  defaults,
  size: { preferred: [1600, 800], min: [960, 600] },
  describe: {
    when: 'Open a section of a teaching deck: its title, the question it answers and the 2–4 things it covers.',
    avoid: 'A section with nothing to list (a big number and a title only): tls.c.chapter-divider.',
    example: { id: 'b_section_brief', type: 'tls.c.section-brief', props: { number: '02', title: 'Sets of numbers', question: 'How do the natural numbers grow into the rationals?', points: ['Natural numbers', 'Integers', 'Fractions and decimals'] } },
  },
  motion: {
    parts: ['numeral', 'title', 'question', 'points'],
    preset: 'fade-up',
    partMotion: {
      numeral: { preset: 'fade-up', delay: 0, stagger: 60 },
      title: { preset: 'fade-up', delay: 150, stagger: 60 },
      question: { preset: 'fade-up', delay: 300, stagger: 60 },
      points: { preset: 'fade-up', delay: 450, stagger: 90 },
    },
  },
  build: buildSectionBrief,
})

export const tlsCSectionBrief: BlockDefinition = {
  ...composite,
  intrinsicSize: undefined,
  layout: ((props: SectionBriefProps, ctx: LayoutContext): LayoutNode => layoutSectionBrief(props, ctx)) as BlockDefinition['layout'],
  capacity: ((props: SectionBriefProps) => schemaCapacity(schema, props)) as BlockDefinition['capacity'],
}
