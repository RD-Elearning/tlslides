/**
 * tls.c.gallery-wall — spro creative CR13 (PLAN Appendix C.4): Three to six framed pictures or icons hung as on a wall, each with a label.
 * Layout: `../_poster.ts` (measured stacks centred in the block, a side column when the variant
 * has one, growing past a too-short box); `build()` is the same cells as a stack/row tree.
 */
import type { BlockDefinition, BlockSchema, BlockSpec, LayoutContext, LayoutNode, RichText } from '../../../types'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { enumSlot } from '../../data/_chart/schema-kit'
import { pick, strings, richItems } from '../_kit'
import { objects, text as str } from '../_wave2'
import { posterBuild, posterLayout, schemaCapacity, type Cell, type PosterOptions } from '../_poster'

export interface GalleryWallProps extends Record<string, unknown> {
  items: Array<{ visual: string; label: string }>
  variant?: 'salon' | 'row'
}
const VARIANTS = ['salon', 'row'] as const

export const schema: BlockSchema = {
  items: { type: { kind: 'list', of: { kind: 'object', fields: {
    visual: { type: { kind: 'text', maxChars: 400 }, role: 'content', label: 'Icon name or image', required: true },
    label: { type: { kind: 'text', maxChars: 32 }, role: 'content', label: 'Label', required: true },
  } }, min: 3, max: 6 }, role: 'content', label: 'Items', required: true },
  variant: enumSlot([...VARIANTS], 'Variant'),
}

export const defaults: GalleryWallProps = { items: [{ visual: 'stethoscope', label: 'Doctors' }, { visual: 'heart', label: 'Nurses' }, { visual: 'users', label: 'Families' }, { visual: 'clipboard', label: 'Clerks' }], variant: 'salon' }

const isImage = (s: string) => /^(\/|https?:|data:|fig:)/.test(s)

function cells(props: GalleryWallProps): { main: Cell[]; opts: PosterOptions } {
  const v = pick(props.variant, VARIANTS, 'salon')
  const items = objects<{ visual?: unknown; label?: unknown }>(props.items, 6).filter((x) => str(x.label, 32))
  const cards: BlockSpec[] = items.map((x, i) => {
    const vis = str(x.visual, 400)
    const pic: BlockSpec = isImage(vis)
      ? { id: `item-visual-${i}`, type: 'tls.m.image', props: { src: vis, alt: str(x.label, 32), fit: 'cover' } }
      : { id: `item-visual-${i}`, type: 'tls.m.icon', props: { icon: vis || 'image', size: v === 'salon' && i % 3 === 0 ? 'xl' : 'lg', iconStyle: 'tile' } }
    return { id: `item-${i}`, type: 'tls.l.card', props: { padding: 'md', children: [pic, { id: `item-label-${i}`, type: 'tls.t.caption', props: { text: str(x.label, 32), align: 'center' } }] } }
  })
  const columns = v === 'row' ? Math.max(1, cards.length) : Math.min(3, Math.max(1, cards.length))
  return { main: cards.length ? [{ spec: { id: 'wall', type: 'tls.l.grid', props: { columns, gap: 'lg', sizing: 'equal', children: cards } }, group: 'item', grid: { columns, items: cards } }] : [], opts: {} }
}

export function buildGalleryWall(props: GalleryWallProps): BlockSpec {
  const c = cells(props)
  return posterBuild('gallery_wall', c.main, c.opts.side)
}

export function layoutGalleryWall(props: GalleryWallProps, ctx: LayoutContext): LayoutNode {
  const c = cells(props)
  return posterLayout(ctx, c.main, c.opts)
}

const composite = defineCompositeBlock<GalleryWallProps>({
  type: 'tls.c.gallery-wall',
  name: "Gallery wall",
  family: 'composite',
  tier: 'A',
  summary: "Three to six framed pictures or icons hung as on a wall, each with a label.",
  keywords: ["gallery", "wall", "frames", "portraits", "people", "collection"],
  category: 'media',
  scope: 'slide',
  shortDescription: "Framed pictures with labels",
  related: ["tls.c.photo-essay", "tls.c.team", "tls.m.icon-list"],
  schema,
  defaults,
  size: { preferred: [1600, 800], min: [640, 360] },
  describe: {
    when: "A collection to look at: people, objects, examples.",
    avoid: "Pictures that tell a sequence: tls.c.photo-essay.",
    example: {"id": "b_gallery_wall", "type": "tls.c.gallery-wall", "props": {"items": [{"visual": "stethoscope", "label": "Doctors"}, {"visual": "heart", "label": "Nurses"}, {"visual": "users", "label": "Families"}]}},
  },
  motion: {
    parts: ["item"],
    preset: 'fade-up',
    partMotion: {
      'item': { preset: 'fade-up', delay: 0, stagger: 60 },
    },
  },
  build: buildGalleryWall,
})

export const tlsCGalleryWall: BlockDefinition = {
  ...composite,
  intrinsicSize: undefined,
  layout: ((props: GalleryWallProps, ctx: LayoutContext): LayoutNode => layoutGalleryWall(props, ctx)) as BlockDefinition['layout'],
  capacity: ((props: GalleryWallProps) => schemaCapacity(schema, props)) as BlockDefinition['capacity'],
}
