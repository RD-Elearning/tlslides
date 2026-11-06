/**
 * tls.c.cover-masthead — spro sprint 2026-11b S09-11 (frame): an editorial cover — a masthead rule, the
 * course / issue line, a big title, a subtitle and one meta row (author · date · course), each only
 * from the brief's own fields (an empty field is left out, never invented). Layout: `../_poster.ts`.
 */
import type { BlockDefinition, BlockSchema, BlockSpec, LayoutContext, LayoutNode } from '../../../types'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { enumSlot } from '../../data/_chart/schema-kit'
import { pick } from '../_kit'
import { text as str } from '../_wave2'
import { posterBuild, posterLayout, schemaCapacity, type Cell, type PosterOptions } from '../_poster'

export interface CoverMastheadProps extends Record<string, unknown> {
  kicker?: string
  title: string
  subtitle?: string
  meta?: string[]
  variant?: 'masthead' | 'band' | 'boxed'
}
const VARIANTS = ['masthead', 'band', 'boxed'] as const
/** Text on the band reads against the accent (what `layoutChild` resolves `text` roles on). */
const ON_ACCENT = { $block: { style: { surface: 'accent' } } }

export const schema: BlockSchema = {
  kicker: { type: { kind: 'text', maxChars: 60 }, role: 'content', label: 'Course line', guidance: 'The course, unit or issue line from the brief (≤ 60).' },
  title: { type: { kind: 'text', maxChars: 80 }, role: 'content', label: 'Title', required: true, guidance: 'The deck title (≤ 80).' },
  subtitle: { type: { kind: 'text', maxChars: 120 }, role: 'content', label: 'Subtitle', guidance: 'One line under the title (≤ 120).' },
  meta: { type: { kind: 'list', of: { kind: 'text', maxChars: 40 }, min: 0, max: 3 }, role: 'content', label: 'Meta', guidance: 'Up to 3 short facts from the brief only (author, date, course), shown in one row.' },
  variant: enumSlot([...VARIANTS], 'Variant', 'masthead (default: rules above and below), band (title on a colour band) or boxed.'),
}

export const defaults: CoverMastheadProps = {
  kicker: 'Biology · Unit 3',
  title: 'How plants make their food',
  subtitle: 'Light, water and air turned into sugar',
  meta: ['Grade 7', 'Week 5'],
  variant: 'masthead',
}

function cells(p: CoverMastheadProps): { main: Cell[]; opts: PosterOptions } {
  const v = pick(p.variant, VARIANTS, 'masthead')
  const meta = (Array.isArray(p.meta) ? p.meta : []).map((m) => str(m, 40)).filter((m) => m.trim()).slice(0, 3)
  const main: Cell[] = []
  if (v === 'masthead') main.push({ spec: { id: 'rule', type: 'tls.x.rule', props: { axis: 'horizontal', weight: 'bold', tone: 'accent', length: 'full' } } })
  if (str(p.kicker, 60)) main.push({ spec: { id: 'kicker', type: 'tls.t.kicker', props: { text: str(p.kicker, 60), tracking: 'wide', ...(v === 'band' ? ON_ACCENT : {}) } }, align: 'start' })
  main.push({ spec: { id: 'title', type: 'tls.t.title', props: { text: str(p.title, 80) || ' ', size: 'fit', align: 'start', ...(v === 'band' ? ON_ACCENT : {}) } }, space: v === 'masthead' ? 0.5 : 0 })
  if (str(p.subtitle, 120)) main.push({ spec: { id: 'subtitle', type: 'tls.t.body', props: { text: str(p.subtitle, 120), size: 'lead', ...(v === 'band' ? ON_ACCENT : {}) } } })
  if (meta.length) {
    if (v === 'masthead') main.push({ spec: { id: 'rule2', type: 'tls.x.rule', props: { axis: 'horizontal', weight: 'hairline', tone: 'line', length: 'full' } }, space: 1 })
    main.push({ spec: { id: 'meta', type: 'tls.t.body', props: { text: meta.join('  ·  '), size: 'body', ...(v === 'band' ? ON_ACCENT : { color: 'textMuted' }) } }, space: v === 'masthead' ? 0 : 1 })
  }
  const backdrop: BlockSpec | undefined =
    v === 'band' ? { id: 'band', type: 'tls.l.card', props: { padding: 'xl', children: [], $block: { style: { surface: 'accent' } } } } : v === 'boxed' ? { id: 'box', type: 'tls.l.card', props: { padding: 'xl', children: [] } } : undefined
  return { main, opts: { maxWidth: 1400, ...(backdrop ? { backdrop } : {}) } }
}

export function buildCoverMasthead(props: CoverMastheadProps): BlockSpec {
  const c = cells(props)
  return posterBuild('cover_masthead', c.main)
}

const composite = defineCompositeBlock<CoverMastheadProps>({
  type: 'tls.c.cover-masthead',
  name: 'Masthead cover',
  family: 'composite',
  tier: 'A',
  summary: 'An editorial cover: masthead rule, course line, big title, subtitle and one meta row.',
  keywords: ['cover', 'masthead', 'editorial', 'title slide', 'bìa', 'trang bìa'],
  category: 'cover',
  scope: 'slide',
  shortDescription: 'Editorial cover with a masthead and a meta row',
  related: ['tls.c.cover', 'tls.c.title-card', 'tls.c.poster-cover'],
  schema,
  defaults,
  size: { preferred: [1600, 900], min: [960, 600] },
  describe: {
    when: 'The cover of a lesson or report deck: course line, title, subtitle and up to three facts from the brief (author, date, course).',
    avoid: 'A cover with a big photo: tls.c.split-cover. A playful cover: tls.c.hook-cover.',
    example: { id: 'b_cover_masthead', type: 'tls.c.cover-masthead', props: { kicker: defaults.kicker, title: defaults.title, subtitle: defaults.subtitle, meta: defaults.meta } },
  },
  motion: {
    parts: ['rule', 'kicker', 'title', 'subtitle', 'meta'],
    preset: 'fade-up',
    partMotion: {
      rule: { preset: 'fade-up', delay: 0, stagger: 60 },
      kicker: { preset: 'fade-up', delay: 80, stagger: 60 },
      title: { preset: 'fade-up', delay: 180, stagger: 60 },
      subtitle: { preset: 'fade-up', delay: 320, stagger: 60 },
      meta: { preset: 'fade-up', delay: 440, stagger: 60 },
    },
  },
  build: buildCoverMasthead,
})

export const tlsCCoverMasthead: BlockDefinition = {
  ...composite,
  intrinsicSize: undefined,
  layout: ((props: CoverMastheadProps, ctx: LayoutContext): LayoutNode => {
    const c = cells(props)
    return posterLayout(ctx, c.main, c.opts)
  }) as BlockDefinition['layout'],
  capacity: ((props: CoverMastheadProps) => schemaCapacity(schema, props)) as BlockDefinition['capacity'],
}
