/**
 * tls.c.photo-essay — spro creative CR13 (PLAN Appendix C.4): Two to four images with captions in an editorial grid.
 * Layout: `../_poster.ts` (measured stacks centred in the block, a side column when the variant
 * has one, growing past a too-short box); `build()` is the same cells as a stack/row tree.
 */
import type { BlockDefinition, BlockSchema, BlockSpec, LayoutContext, LayoutNode, RichText } from '../../../types'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { enumSlot } from '../../data/_chart/schema-kit'
import { pick, strings, richItems } from '../_kit'
import { objects, text as str } from '../_wave2'
import { posterBuild, posterLayout, schemaCapacity, type Cell, type PosterOptions } from '../_poster'

export interface PhotoEssayProps extends Record<string, unknown> {
  title?: string
  images: Array<{ ref: string; caption?: string }>
  variant?: 'hero-plus-two' | 'strip' | 'stagger'
}
const VARIANTS = ['hero-plus-two', 'strip', 'stagger'] as const

export const schema: BlockSchema = {
  title: { type: { kind: 'text', maxChars: 60 }, role: 'content', label: 'Title' },
  images: { type: { kind: 'list', of: { kind: 'object', fields: {
    ref: { type: { kind: 'image' }, role: 'content', label: 'Image', required: true },
    caption: { type: { kind: 'text', maxChars: 80 }, role: 'content', label: 'Caption' },
  } }, min: 2, max: 4 }, role: 'content', label: 'Images', required: true },
  variant: enumSlot([...VARIANTS], 'Variant'),
}

export const defaults: PhotoEssayProps = { title: 'A night in the ER', images: [{ ref: '/demo/photo-1.svg', caption: '9 pm: the queue forms' }, { ref: '/demo/photo-2.svg', caption: 'Triage on a tablet' }, { ref: '/demo/photo-3.svg', caption: 'A bed in forty minutes' }], variant: 'strip' }

function cells(props: PhotoEssayProps, width = 1600): { main: Cell[]; opts: PosterOptions } {
  const v = pick(props.variant, VARIANTS, 'strip')
  const images = objects<{ ref?: unknown; caption?: unknown }>(props.images, 4).filter((x) => str(x.ref, 400))
  const photo = (x: { ref?: unknown; caption?: unknown }, i: number): BlockSpec => ({ id: `photo-${i}`, type: 'tls.m.image', props: {
    src: str(x.ref, 400), alt: str(x.caption, 80) || `Photo ${i + 1}`, fit: 'cover', ...(str(x.caption, 80) ? { caption: str(x.caption, 80) } : {}),
  } })
  const main: Cell[] = []
  if (str(props.title, 60)) main.push({ spec: { id: 'title', type: 'tls.t.title', props: { text: str(props.title, 60), size: 'heading' } } })
  const all = images.map(photo)
  if (v === 'hero-plus-two' && all.length >= 3) {
    const rest = all.slice(1)
    return { main: [...main, { spec: { id: 'photos', type: 'tls.l.grid', props: { columns: 1, gap: 'sm', sizing: 'equal', children: rest } }, grow: true }], opts: { side: [{ spec: all[0], grow: true }], ratio: 0.36, sideFirst: true } }
  }
  // as many columns as fit at 160 units each (a tiny box gets one)
  const columns = Math.max(1, Math.min(all.length, Math.floor((width + 16) / 176)))
  // a grid that takes the height left under the title (an image measures as the whole box it is given)
  if (all.length) main.push({ spec: { id: 'photos', type: 'tls.l.grid', props: { columns, gap: v === 'stagger' ? 'lg' : 'sm', sizing: 'equal', children: all } }, grow: true })
  return { main, opts: {} }
}

export function buildPhotoEssay(props: PhotoEssayProps): BlockSpec {
  const c = cells(props)
  return posterBuild('photo_essay', c.main, c.opts.side)
}

export function layoutPhotoEssay(props: PhotoEssayProps, ctx: LayoutContext): LayoutNode {
  const c = cells(props, ctx.box.width)
  return posterLayout(ctx, c.main, c.opts)
}

const composite = defineCompositeBlock<PhotoEssayProps>({
  type: 'tls.c.photo-essay',
  name: "Photo essay",
  family: 'composite',
  tier: 'A',
  summary: "Two to four images with captions in an editorial grid.",
  keywords: ["photos", "images", "gallery", "essay", "pictures", "field trip"],
  category: 'media',
  scope: 'slide',
  shortDescription: "Captioned photos in an editorial grid",
  related: ["tls.c.gallery-wall", "tls.m.image", "tls.c.bento"],
  schema,
  defaults,
  size: { preferred: [1600, 800], min: [640, 360] },
  describe: {
    when: "The pictures carry the story; each gets one line.",
    avoid: "One image with text: tls.m.image in a split layout.",
    example: {"id": "b_photo_essay", "type": "tls.c.photo-essay", "props": {"title": "A night in the ER", "images": [{"ref": "/demo/photo-1.svg", "caption": "9 pm: the queue forms"}, {"ref": "/demo/photo-2.svg", "caption": "Triage on a tablet"}]}},
  },
  motion: {
    parts: ["title", "photos"],
    preset: 'fade-up',
    partMotion: {
      'title': { preset: 'fade-up', delay: 0, stagger: 60 },
      'photos': { preset: 'fade-up', delay: 150, stagger: 60 },
    },
  },
  build: buildPhotoEssay,
})

export const tlsCPhotoEssay: BlockDefinition = {
  ...composite,
  intrinsicSize: undefined,
  layout: ((props: PhotoEssayProps, ctx: LayoutContext): LayoutNode => layoutPhotoEssay(props, ctx)) as BlockDefinition['layout'],
  capacity: ((props: PhotoEssayProps) => schemaCapacity(schema, props)) as BlockDefinition['capacity'],
}
