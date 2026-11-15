/**
 * tls.c.image-notes — spro sprint 2026-11b S09-10: a figure or photo with 2–5 numbered notes beside or
 * under it and the matching numbers pinned on the picture (positions as fractions `fx`, `fy` of the
 * picture, not coordinates). A picture whose shape is known (`aspect`, else the asset table: a `fig:`
 * from the document, an `img:` from the library) is drawn whole at that shape and the pins land on it;
 * an unknown shape fills the area (cover). Pins without `fx`/`fy` stand in a column on the picture's
 * right edge. A pin always stays inside the picture.
 */
import type { BlockSchema, BlockSpec, Box, LayoutContext, LayoutNode } from '../../../types'
import { enumSlot } from '../../data/_chart/schema-kit'
import { composeFlat, measureHeights, pick, type Piece } from '../_kit'
import { defineRichBlock, objectOf, rows, txt } from '../_rich-block'
import { richFit, type RichItem } from '../_rich'

export interface ImageNotesProps extends Record<string, unknown> {
  image: string
  alt: string
  aspect?: number
  notes: Array<{ text: string; fx?: number; fy?: number }>
  variant?: 'notes-right' | 'notes-below'
}
const VARIANTS = ['notes-right', 'notes-below'] as const

export const schema: BlockSchema = {
  image: { type: { kind: 'image' }, role: 'content', label: 'Picture', required: true, guidance: 'A figure of the document (`fig:`) or a library picture (`img:`).' },
  alt: { type: { kind: 'text', maxChars: 200 }, role: 'content', label: 'Alt text', required: true, guidance: 'What the picture shows (≤ 200).' },
  aspect: { type: { kind: 'number', min: 0.2, max: 8 }, role: 'option', label: 'Aspect', help: 'Width / height of the picture when the asset table does not know it.' },
  notes: {
    type: { kind: 'list', of: objectOf({ text: { kind: 'text', maxChars: 120 }, fx: { kind: 'number', min: 0, max: 1 }, fy: { kind: 'number', min: 0, max: 1 } }), min: 2, max: 5 },
    role: 'content',
    label: 'Notes',
    required: true,
    guidance: 'Each: `text` (≤ 120) and optionally where its number goes on the picture: `fx`, `fy` = fractions 0–1 from the left / top.',
  },
  variant: enumSlot([...VARIANTS], 'Variant', 'notes-right (default) or notes-below.'),
}

export const defaults: ImageNotesProps = {
  image: 'img:plant-cell',
  alt: 'A plant cell with its wall, nucleus and chloroplasts',
  notes: [
    { text: 'The cell wall keeps the cell rigid.', fx: 0.08, fy: 0.5 },
    { text: 'The nucleus holds the genetic material.', fx: 0.5, fy: 0.45 },
    { text: 'Chloroplasts capture light for photosynthesis.', fx: 0.72, fy: 0.25 },
  ],
  variant: 'notes-right',
}

export const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : undefined)

function notesOf(p: ImageNotesProps) {
  return rows<{ text?: unknown; fx?: unknown; fy?: unknown }>(p.notes, 5).map((n) => ({ text: txt(n.text, 120), fx: num(n.fx), fy: num(n.fy) }))
}

/** The picture's rectangle in `area`: its own shape centred when known, else the whole area. */
function pictureIn(area: Box, ratio: number | undefined): Box {
  if (!ratio) return area
  const w = Math.min(area.width, area.height * ratio)
  const h = w / ratio
  return { x: area.x + (area.width - w) / 2, y: area.y + (area.height - h) / 2, width: w, height: h }
}

/** Pin centres inside `pic` (a pin of size `s` never leaves it). */
export function pinCentres(pic: Box, notes: Array<{ fx?: number; fy?: number }>, s: number): Array<{ x: number; y: number }> {
  const n = notes.length
  const half = s / 2 + 4
  const cl = (v: number, lo: number, hi: number) => (hi < lo ? (lo + hi) / 2 : Math.max(lo, Math.min(hi, v)))
  return notes.map((p, i) => {
    const fx = p.fx ?? 1 - half / Math.max(1, pic.width)
    const fy = p.fy ?? (i + 1) / (n + 1)
    return { x: cl(pic.x + fx * pic.width, pic.x + half, pic.x + pic.width - half), y: cl(pic.y + fy * pic.height, pic.y + half, pic.y + pic.height - half) }
  })
}

function layoutNotes(p: ImageNotesProps, ctx: LayoutContext): LayoutNode {
  const notes = notesOf(p)
  return layoutPinned(ctx, p, notes, notes.map((n) => ({ text: n.text })))
}

/** S09/S10 — a picture with numbered pins and the matching numbered cells (image-notes, hotspots). */
export function layoutPinned(ctx: LayoutContext, p: { image?: unknown; alt?: unknown; aspect?: unknown; variant?: unknown }, notes: Array<{ fx?: number; fy?: number }>, items: RichItem[]): LayoutNode {
  const W = Math.max(0, ctx.box.width) || 0
  const H0 = Math.max(0, ctx.box.height) || 0
  const sp = ctx.tokens.space
  const v = pick(p.variant, VARIANTS, 'notes-right')
  const aspect = typeof p.aspect === 'number' && p.aspect > 0 ? Math.min(8, Math.max(0.2, p.aspect)) : undefined
  const size = ctx.asset?.(String(p.image ?? ''))
  const ratio = aspect ?? (size && size.width > 0 && size.height > 0 ? size.width / size.height : undefined)
  const pieces: Piece[] = []
  let area: Box
  let height: number
  if (v === 'notes-right') {
    const gap = sp.xl * 1.5
    const iw = Math.round((W - gap) * 0.6)
    const nw = W - gap - iw
    const H = H0 > 0 ? H0 : Math.round(iw / (ratio ?? 4 / 3))
    const { plan } = richFit(ctx, items, nw, H, { columns: 1, marker: 'number', markerSide: 'left' })
    area = { x: 0, y: 0, width: iw, height: Math.max(H, plan.height) }
    pieces.push(...plan.pieces(iw + gap, Math.max(0, (area.height - plan.height) / 2)))
    height = area.height
  } else {
    const cols = (notes.length >= 4 ? 3 : 2) as 2 | 3
    const H = H0 > 0 ? H0 : Math.round(W / (ratio ?? 16 / 9)) + 240
    const probe = richFit(ctx, items, W, H * 0.4, { columns: cols, marker: 'number', markerSide: 'left' })
    const ih = Math.max(160, H - probe.plan.height - sp.xl)
    area = { x: 0, y: 0, width: W, height: ih }
    pieces.push(...probe.plan.pieces(0, ih + sp.xl))
    height = ih + sp.xl + probe.plan.height
  }
  const pic = pictureIn(area, ratio)
  const image: BlockSpec = { id: 'image', type: 'tls.m.image', props: { src: String(p.image ?? ''), alt: txt(p.alt, 200), fit: ratio ? 'contain' : 'cover', ...(aspect ? { aspect } : {}) } }
  const pinSpec = (i: number): BlockSpec => ({ id: `pin[${i}]`, type: 'tls.t.marker', props: { value: String(i + 1), tone: 'solid', size: 'md' } })
  const s = measureHeights(ctx, [pinSpec(0)], 56)[0]
  const centres = pinCentres(pic, notes, s)
  pieces.unshift({ id: 'image', spec: image, box: pic })
  centres.forEach((c, i) => pieces.push({ id: `pin[${i}]`, spec: pinSpec(i), box: { x: c.x - s / 2, y: c.y - s / 2, width: s, height: s } }))
  return composeFlat(ctx, pieces, Math.max(1, height))
}

export const tlsCImageNotes = defineRichBlock<ImageNotesProps>({
  type: 'tls.c.image-notes',
  name: 'Picture with notes',
  summary: 'A figure or photo with 2–5 numbered notes and the matching numbers pinned on it.',
  keywords: ['figure', 'image', 'notes', 'labels', 'annotated', 'diagram', 'hình', 'chú thích', 'ghi chú'],
  category: 'media',
  shortDescription: 'A picture with numbered notes pinned on it',
  related: ['tls.g.annotated', 'tls.c.image-text', 'tls.m.image'],
  schema,
  defaults,
  size: { preferred: [1600, 760], min: [960, 540] },
  fillPolicy: ['type'],
  describe: {
    when: 'A figure from the document or a photo whose parts the slide explains: 2–5 numbered notes beside it, each number pinned on the part it explains.',
    avoid: 'A picture with one caption: tls.m.image. A picture beside a paragraph: tls.c.image-text.',
    example: { id: 'b_image_notes', type: 'tls.c.image-notes', props: { image: defaults.image, alt: defaults.alt, notes: defaults.notes } },
  },
  sections: { head: ['image'], foot: ['pin'] },
  shape: (p) => ({
    items: notesOf(p).map((n) => ({ text: n.text })),
    opts: { columns: 1, marker: 'number' },
    head: [{ spec: { id: 'image', type: 'tls.m.image', props: { src: String(p.image ?? ''), alt: txt(p.alt, 200) } } }],
    layout: (ctx) => layoutNotes(p, ctx),
  }),
})
