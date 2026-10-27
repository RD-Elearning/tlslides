/**
 * tls.c.storyboard — spro creative CR13 (PLAN Appendix C.3): Three or four panels with captions and speech bubbles: a scenario told in pictures.
 * Layout: `../_poster.ts` (measured stacks centred in the block, a side column when the variant
 * has one, growing past a too-short box); `build()` is the same cells as a stack/row tree.
 */
import type { BlockDefinition, BlockSchema, BlockSpec, LayoutContext, LayoutNode, RichText } from '../../../types'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { enumSlot } from '../../data/_chart/schema-kit'
import { pick, strings, richItems } from '../_kit'
import { objects, text as str } from '../_wave2'
import { posterBuild, posterLayout, schemaCapacity, type Cell, type PosterOptions } from '../_poster'

export interface StoryboardProps extends Record<string, unknown> {
  panels: Array<{ visual?: string; caption: string; bubble?: string }>
  variant?: 'strip' | 'grid'
}
const VARIANTS = ['strip', 'grid'] as const

export const schema: BlockSchema = {
  panels: { type: { kind: 'list', of: { kind: 'object', fields: {
    visual: { type: { kind: 'icon' }, role: 'content', label: 'Icon' },
    caption: { type: { kind: 'text', maxChars: 60 }, role: 'content', label: 'Caption', required: true },
    bubble: { type: { kind: 'text', maxChars: 80 }, role: 'content', label: 'Speech bubble' },
  } }, min: 3, max: 4 }, role: 'content', label: 'Panels', required: true },
  variant: enumSlot([...VARIANTS], 'Variant'),
}

export const defaults: StoryboardProps = { panels: [{ visual: 'user', caption: 'Lan arrives at 9 pm', bubble: 'Where do I go?' }, { visual: 'clipboard', caption: 'Triage on a tablet' }, { visual: 'bed', caption: 'A bed in 40 minutes', bubble: 'That was quick!' }], variant: 'strip' }

function cells(props: StoryboardProps): { main: Cell[]; opts: PosterOptions } {
  const v = pick(props.variant, VARIANTS, 'strip')
  const panels = objects<{ visual?: unknown; caption?: unknown; bubble?: unknown }>(props.panels, 4).filter((p) => str(p.caption, 60))
  const items: BlockSpec[] = panels.map((p, i) => ({ id: `panel-${i}`, type: 'tls.l.card', props: { padding: 'md', children: [
    { id: `panel-visual-${i}`, type: 'tls.m.icon', props: { icon: str(p.visual, 40) || 'user', size: 'md', iconStyle: 'blob' } },
    // the bubble as a quoted line in the accent colour (a drawn bubble with a tail is too tall for a panel)
    ...(str(p.bubble, 80) ? [{ id: `panel-bubble-${i}`, type: 'tls.t.body', props: { text: `“${str(p.bubble, 80)}”`, color: 'accent' } }] : []),
    { id: `panel-caption-${i}`, type: 'tls.t.body', props: { text: `${i + 1}. ${str(p.caption, 60)}` } },
  ], $block: { style: { surface: 'surfaceAlt' } } } }))
  const columns = v === 'grid' ? 2 : Math.max(1, items.length)
  return { main: items.length ? [{ spec: { id: 'panels', type: 'tls.l.grid', props: { columns, gap: 'md', sizing: 'equal', children: items } }, group: 'panel', grid: { columns, items } }] : [], opts: {} }
}

export function buildStoryboard(props: StoryboardProps): BlockSpec {
  const c = cells(props)
  return posterBuild('storyboard', c.main, c.opts.side)
}

export function layoutStoryboard(props: StoryboardProps, ctx: LayoutContext): LayoutNode {
  const c = cells(props)
  return posterLayout(ctx, c.main, c.opts)
}

const composite = defineCompositeBlock<StoryboardProps>({
  type: 'tls.c.storyboard',
  name: "Storyboard",
  family: 'composite',
  tier: 'A',
  summary: "Three or four panels with captions and speech bubbles: a scenario told in pictures.",
  keywords: ["storyboard", "scenario", "story", "comic", "panels", "user journey", "case"],
  category: 'people',
  scope: 'slide',
  shortDescription: "Captioned panels telling a scenario",
  related: ["tls.c.journey", "tls.t.speech-bubble", "tls.g.timeline"],
  schema,
  defaults,
  size: { preferred: [1600, 800], min: [640, 360] },
  describe: {
    when: "A short scenario: who does what, in three or four moments.",
    avoid: "Dated events: tls.g.timeline.",
    example: {"id": "b_storyboard", "type": "tls.c.storyboard", "props": {"panels": [{"visual": "user", "caption": "Lan arrives at 9 pm", "bubble": "Where do I go?"}, {"visual": "clipboard", "caption": "Triage on a tablet"}, {"visual": "bed", "caption": "A bed in 40 minutes", "bubble": "That was quick!"}]}},
  },
  motion: {
    parts: ["panel"],
    preset: 'fade-up',
    partMotion: {
      'panel': { preset: 'fade-up', delay: 0, stagger: 60 },
    },
  },
  build: buildStoryboard,
})

export const tlsCStoryboard: BlockDefinition = {
  ...composite,
  intrinsicSize: undefined,
  layout: ((props: StoryboardProps, ctx: LayoutContext): LayoutNode => layoutStoryboard(props, ctx)) as BlockDefinition['layout'],
  capacity: ((props: StoryboardProps) => schemaCapacity(schema, props)) as BlockDefinition['capacity'],
}
