/**
 * tls.d.swatches — spro sprint 2026-11c S25 (T17, lookbook s4 / mam s5): a colour palette as chips, each with its name,
 * the value as the document writes it and an optional use. A chip's colour is a `category:<n>` tone of the deck (S21-j:
 * the document's named colours, checked against the source) — the block holds no literal colour, so it cannot show a
 * colour the document does not have; a chip without a tone is drawn as an outline, never a guessed fill.
 * One row up to five, two rows past that; the text type is the largest tier at which every text is whole.
 */
import type { BlockDefinition, BlockSchema, CapacityReport, LayoutContext, LayoutNode, MotionRecipe, Size, TypeToken } from '../../../types'
import { capacityOf, emptyState, fitTier, lineH, linesNeeded, mutedStyle, objs, placeLines, root, str, style } from '../../diagram/_kit'
import { slot } from '../../diagram/_motion'
import { categoryColor } from '../../text/_engine/color'
import { DEFAULT_PROBE_HEIGHT } from '../../../layout/measure-block'

export const SWATCHES_MAX = 10
const ROW_MAX = 5
const GAP = 28

export interface Swatch extends Record<string, unknown> {
  name: string
  value?: string
  use?: string
  tone?: string
}
export interface SwatchesProps extends Record<string, unknown> {
  swatches: Swatch[]
  shape?: 'square' | 'round' | 'strip'
}

export const schema: BlockSchema = {
  swatches: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          name: { type: { kind: 'text', maxChars: 28 }, required: true, role: 'content', label: 'Name' },
          value: { type: { kind: 'text', maxChars: 24 }, role: 'content', label: 'Value', help: 'As the document writes it (#1F6F5C, rgb(…), Pantone 342 C).' },
          use: { type: { kind: 'text', maxChars: 48 }, role: 'content', label: 'Use' },
          tone: { type: { kind: 'text', maxChars: 12 }, role: 'option', label: 'Colour', help: '`category:<n>`: the deck\'s n-th document colour (0-based).' },
        },
      },
      min: 2,
      max: SWATCHES_MAX,
    },
    role: 'content',
    label: 'Colours',
    required: true,
    guidance: 'One swatch per colour the document names, in its order; tone `category:<n>` for the n-th document colour.',
  },
  shape: { type: { kind: 'enum', values: ['square', 'round', 'strip'] }, role: 'option', label: 'Chip shape' },
}

export const defaults: SwatchesProps = {
  swatches: [
    { name: 'Deep sea', value: '#1F4E5F', use: 'Headings', tone: 'category:0' },
    { name: 'Sand', value: '#E8D9B5', use: 'Backgrounds', tone: 'category:1' },
    { name: 'Coral', value: '#E2725B', use: 'Accents', tone: 'category:2' },
  ],
  shape: 'square',
}

const TIERS: ReadonlyArray<readonly [TypeToken, TypeToken]> = [
  ['heading', 'body'],
  ['subheading', 'body'],
  ['body', 'caption'],
  ['caption', 'footnote'],
]

export function layout(props: SwatchesProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const items = objs(props.swatches).slice(0, SWATCHES_MAX).map((s) => ({ name: str(s.name), value: str(s.value), use: str(s.use), tone: s.tone }))
  const N = items.length
  if (N < 1) return emptyState(ctx, 'No colours')
  const shape = props.shape === 'round' || props.shape === 'strip' ? props.shape : 'square'
  const rows = N > ROW_MAX ? 2 : 1
  const cols = Math.ceil(N / rows)
  const colW = Math.max(1, (W - (cols - 1) * GAP) / cols)
  const rowH = Math.max(1, (H - (rows - 1) * GAP) / rows)
  const sized = !ctx.tokens.measuring && H < DEFAULT_PROBE_HEIGHT
  const textH = (t: readonly [TypeToken, TypeToken]) => {
    const ns = style(ctx, t[0])
    const vs = mutedStyle(ctx, t[1])
    return Math.max(...items.map((it) => linesNeeded(ctx, it.name, ns, colW) * lineH(ns) + (it.value ? lineH(vs) + 2 : 0) + (it.use ? linesNeeded(ctx, it.use, vs, colW) * lineH(vs) + 2 : 0)))
  }
  const whole = (t: readonly [TypeToken, TypeToken]) => {
    const ns = style(ctx, t[0])
    const vs = mutedStyle(ctx, t[1])
    return items.every((it) => linesNeeded(ctx, it.name, ns, colW) <= 2 && (!it.value || linesNeeded(ctx, it.value, vs, colW) <= 1) && (!it.use || linesNeeded(ctx, it.use, vs, colW) <= 2))
  }
  // a chip at least as tall as a third of its cell keeps the colour the subject of the slide
  const tier = fitTier(TIERS, (t) => t === TIERS[TIERS.length - 1] || (sized && whole(t) && textH(t) + 12 <= rowH * 0.62), ctx)
  const nameS = style(ctx, tier[0])
  const valS = mutedStyle(ctx, tier[1])
  const tH = textH(tier)
  const chipH = Math.max(1, Math.min(shape === 'strip' ? 64 : colW, Math.max(24, rowH - tH - 12)))
  const blockH = chipH + 12 + tH
  const nodes: LayoutNode[] = []
  const surfaceAlt = ctx.resolveColor('surfaceAlt').color
  const line = ctx.resolveColor('line').color
  items.forEach((it, i) => {
    const r = Math.floor(i / cols)
    const c = i % cols
    const x = c * (colW + GAP)
    const y = r * (rowH + GAP) + Math.max(0, (rowH - blockH) / 2)
    const fill = categoryColor(ctx, it.tone)
    const chipW = shape === 'round' ? Math.min(colW, chipH) : colW
    const chipX = shape === 'round' ? x + (colW - chipW) / 2 : x
    const kids: LayoutNode[] = [
      {
        k: 'rect',
        part: `chip[${i}]`,
        box: { x: chipX, y, width: chipW, height: chipH },
        fill: { type: 'solid', color: fill ?? surfaceAlt },
        ...(fill ? {} : { stroke: { color: line, width: 2 } }),
        radius: shape === 'round' ? chipH / 2 : Math.min(16, chipH / 6),
      } as LayoutNode,
    ]
    let ty = y + chipH + 12
    const al = shape === 'round' ? 'center' : 'start'
    const nm = placeLines(ctx, it.name, nameS, { x, y: ty, width: colW }, al, 2, `name[${i}]`)
    kids.push(...nm.nodes)
    ty += nm.height
    if (it.value) {
      const v = placeLines(ctx, it.value, valS, { x, y: ty + 2, width: colW }, al, 1, `value[${i}]`)
      kids.push(...v.nodes)
      ty += v.height + 2
    }
    if (it.use) kids.push(...placeLines(ctx, it.use, valS, { x, y: ty + 2, width: colW }, al, 2, `use[${i}]`).nodes)
    nodes.push(slot(`swatch[${i}]`, { width: W, height: H }, kids))
  })
  return root(ctx, nodes)
}

export function capacity(props: SwatchesProps, box: Size): CapacityReport {
  const n = Array.isArray(props.swatches) ? props.swatches.length : 0
  const cols = Math.ceil(n / (n > ROW_MAX ? 2 : 1))
  const ok = n < 1 || (box.width - (cols - 1) * GAP) / Math.max(1, cols) >= 120
  return capacityOf({ swatches: { max: SWATCHES_MAX, used: n } }, ok, [{ kind: 'truncate', slot: 'swatches' }])
}

export const motion: MotionRecipe = {
  parts: ['swatch[*]'],
  preset: 'stagger-children',
  partMotion: { 'swatch[*]': { preset: 'fade-up', delay: 0, stagger: 70 } },
}

export const tlsDSwatches: BlockDefinition = {
  type: 'tls.d.swatches',
  name: 'Colour swatches',
  family: 'data',
  tier: 'A',
  summary: 'A palette as colour chips, each with its name, value and use.',
  keywords: ['palette', 'colours', 'colors', 'swatches', 'brand colours', 'bảng màu', 'màu sắc', 'tokens'],
  category: 'media',
  scope: 'group',
  shortDescription: 'Colour chips with name, value and use',
  related: ['tls.t.kv-list', 'tls.c.cards'],
  describe: {
    when: 'The colours a document names with their values: a brand palette, a collection\'s colours, design tokens.',
    avoid: 'Colour words without values, or categories that only happen to have colours (bins, priorities): tls.c.cards.',
    example: { id: 'b_swatches', type: 'tls.d.swatches', props: { swatches: [{ name: 'Deep sea', value: '#1F4E5F', tone: 'category:0' }, { name: 'Sand', value: '#E8D9B5', tone: 'category:1' }, { name: 'Coral', value: '#E2725B', tone: 'category:2' }] } },
  },
  schema,
  defaults,
  size: { preferred: [1400, 520], min: [600, 300] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
