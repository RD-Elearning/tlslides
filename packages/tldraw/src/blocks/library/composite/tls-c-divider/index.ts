/**
 * tls.c.divider — section break: oversized number, section title and one-line intro.
 *
 * `defineCompositeBlock` supplies the metadata and `build()` (a stack of number, title, subtitle);
 * `layout()` places those same specs by hand and flattens them (see `../_kit.ts` for why: the text
 * blocks ignore `align`, a content stack stretches in a tall region, nested wrappers break parity).
 * `numeral` = muted giant number above the title; `field` = accent field with contrast-solved text;
 * `minimal` = title with an accent rule, no number.
 */

import type { BlockDefinition, BlockSchema, BlockSpec, LayoutContext, LayoutNode } from '../../../types'
import { isShown } from '../../../schema-helpers'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { enumSlot } from '../../data/_chart/schema-kit'
import { onColor } from '../../text/_engine/color'
import { composeFlat, measureHeights, onSurface, pick, stableWrap, toMeasurable, type Piece } from '../_kit'

export interface DividerProps extends Record<string, unknown> {
  number?: string
  title: string
  subtitle?: string
  variant?: 'numeral' | 'field' | 'minimal'
  align?: 'start' | 'center'
  showNumber?: boolean
  showSubtitle?: boolean
}

export const schema: BlockSchema = {
  number: { type: { kind: 'text', maxChars: 8 }, role: 'content', label: 'Number', guidance: '"01", "II" or "Part 2".' },
  title: { type: { kind: 'text', maxChars: 60 }, role: 'content', label: 'Title', required: true },
  subtitle: { type: { kind: 'text', maxChars: 120 }, role: 'content', label: 'Intro line' },
  variant: enumSlot(['numeral', 'field', 'minimal'], 'Variant', 'field = accent background; minimal = no number.'),
  align: enumSlot(['start', 'center'], 'Alignment'),
  showNumber: { type: { kind: 'boolean' }, role: 'option', label: 'Show number', toggles: 'number' },
  showSubtitle: { type: { kind: 'boolean' }, role: 'option', label: 'Show intro line', toggles: 'subtitle' },
}

export const defaults: DividerProps = {
  number: '02',
  title: 'Describing data',
  subtitle: 'Centre, spread and shape of a sample',
  variant: 'numeral',
  align: 'start',
}

const VARIANTS = ['numeral', 'field', 'minimal'] as const

function specsOf(props: DividerProps, titleSize: 'display' | 'title' | 'heading', fg?: string, on?: Record<string, unknown>) {
  const col = fg ? { color: fg } : {}
  const dark = on ?? {}
  const variant = pick(props.variant, VARIANTS, 'numeral')
  const out: { number?: BlockSpec; title: BlockSpec; subtitle?: BlockSpec } = {
    title: { id: 'title', type: 'tls.t.title', props: { text: toMeasurable(props.title), size: titleSize, ...(variant === 'minimal' ? { rule: true } : {}), ...col, ...dark } },
  }
  if (variant !== 'minimal' && isShown(props, 'showNumber') && props.number) {
    out.number = {
      id: 'number',
      type: 'tls.t.title',
      props: { text: String(props.number), size: 'display', color: fg ?? (variant === 'numeral' ? 'textMuted' : 'accent'), ...dark },
    }
  }
  if (isShown(props, 'showSubtitle') && props.subtitle) out.subtitle = { id: 'subtitle', type: 'tls.t.subtitle', props: { text: props.subtitle, ...col, ...dark } }
  return out
}

export function buildDivider(props: DividerProps): BlockSpec {
  const s = specsOf(props, 'title')
  const children = [s.number, s.title, s.subtitle].filter(Boolean) as BlockSpec[]
  return { id: 'divider', type: 'tls.l.stack', props: { gap: 'md', sizing: 'content', children } }
}

export function layoutDivider(props: DividerProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(0, ctx.box.width) || 0
  const H = Math.max(0, ctx.box.height) || 0
  const variant = pick(props.variant, VARIANTS, 'numeral')
  const field = variant === 'field'
  const align = props.align === 'center' ? 'center' : 'start'
  const gap = ctx.tokens.space.md
  const inset = field ? ctx.tokens.space['2xl'] : 0
  // AC8.5: at most 1200 wide (was 1300): the style motifs of the section page sit right of x 1380
  // (luxury ring, gradient and glass orbs, doodle star, memphis half circle).
  // the first (size, width) with a stable wrap: display at 1200, 1100 or 1000 wide, then title, …
  const sizes: Array<'display' | 'title' | 'heading'> = ['display', 'title', 'heading']
  const widths = [1200, 1100, 1000].map((w) => Math.min(W - 2 * inset, w))
  let start = sizes.length - 1
  let tw = widths[0]
  search: for (let k = 0; k < sizes.length; k++) {
    for (const w of widths) {
      if (stableWrap(ctx, props.title, w, sizes[k], 3)) {
        start = k
        tw = w
        break search
      }
    }
  }
  const tx = align === 'center' ? (W - tw) / 2 : inset
  const accent = ctx.resolveColor('accent').color
  const fg = field ? onColor(ctx, accent) : undefined
  const on = field ? onSurface({ type: 'solid', color: accent }) : undefined
  // AC8.5: display type first (a title-size section title on an empty page read unfinished);
  // the ladder steps down while the title takes more than three lines, wraps near a break (the
  // browser could wrap it otherwise), leaves a one-word line, or the stack overflows the box.

  let s = specsOf(props, sizes[start], fg, on)
  let specs: BlockSpec[] = []
  let hs: number[] = []
  let blockH = 0
  for (let k = start; k < sizes.length; k++) {
    s = specsOf(props, sizes[k], fg, on)
    specs = [s.number, s.title, s.subtitle].filter(Boolean) as BlockSpec[]
    hs = measureHeights(ctx, specs, tw)
    blockH = hs.reduce((a, b) => a + b, 0) + gap * Math.max(0, specs.length - 1)
    if (blockH + 2 * inset <= H) break
  }
  const total = Math.max(H, blockH + 2 * inset)
  const pieces: Piece[] = []
  if (field) {
    pieces.push({ id: 'field', spec: { id: 'field', type: 'tls.l.card', props: { padding: 'md', children: [], $block: { style: { surface: 'accent' } } } }, box: { x: 0, y: 0, width: W, height: total } })
  }
  let y = Math.max(inset, (total - blockH) / 2)
  specs.forEach((spec, i) => {
    pieces.push({ id: spec.id, spec, box: { x: tx, y, width: tw, height: hs[i] }, align })
    y += hs[i] + gap
  })
  return composeFlat(ctx, pieces, total)
}

const composite = defineCompositeBlock<DividerProps>({
  type: 'tls.c.divider',
  name: 'Section Divider',
  family: 'composite',
  tier: 'A',
  summary: 'Section break: big section number, title and one-line intro.',
  keywords: ['divider', 'section', 'chapter', 'part', 'break', 'agenda item', 'transition slide'],
  category: 'divider',
  scope: 'slide',
  shortDescription: 'Section break with a big section number, section title and one-line intro',
  related: ['tls.c.cover', 'tls.c.agenda'],
  schema,
  defaults,
  size: { preferred: [1600, 800], min: [640, 360] },
  describe: {
    when: 'Between major parts of a deck or chapters of a lecture.',
    avoid: 'The first slide: use tls.c.cover.',
    example: { id: 'b_divider', type: 'tls.c.divider', props: { number: '02', title: 'Describing data', subtitle: 'Centre, spread and shape', variant: 'numeral' } },
  },
  // RVM5: the accent field (variant `field`) wipes in from the left, then the section number, the
  // title (line by line when centred) and the subtitle rise in. Was `root` fade-up (one unit).
  motion: {
    parts: ['field', 'number', 'title', 'subtitle'],
    preset: 'fade-up',
    partMotion: {
      field: { preset: 'wipe-x', delay: 0, stagger: 0 },
      number: { preset: 'fade-up', delay: 120, stagger: 60 },
      title: { preset: 'fade-up', delay: 230, stagger: 80 },
      subtitle: { preset: 'fade-up', delay: 430, stagger: 60 },
    },
  },
  build: buildDivider,
})

export const tlsCDivider: BlockDefinition = {
  ...composite,
  intrinsicSize: undefined,
  layout: ((props: DividerProps, ctx: LayoutContext): LayoutNode => layoutDivider(props, ctx)) as BlockDefinition['layout'],
}
