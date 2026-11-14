/**
 * spro sprint 2026-11c S26-a — frame scenes: a cover, divider or closing drawn from the deck's motif icons.
 *
 * A frame slide names a scene (`SlideSpec.scene = { id, seed }`); `placeScenes` resolves it into free
 * backdrop blocks of existing types, placed where the page's text is not (the report's painted text and
 * pictures), so text never sits on the art. It runs with `placeDeckMotifs` before a deck is rendered or
 * checked; a page that already carries its scene blocks (an edited deck back from the decompiler) is left
 * alone, so it is idempotent. A scene whose needs are not met (too few motif icons, no free zone big
 * enough) degrades along `SCENE_FALLBACK` and ends at `type-only` (nothing drawn) — never an empty slot.
 *
 * Pure and DOM-free.
 */
import { analyzeDeck } from './layout-report'
import { resolveDeckFrame } from './deck-document'
import { deckMotifIcons } from './backdrops'
import type { BlockSpec, Box, DeckSpec, PlacedBlock, SlideSpec } from './types'

export const SCENE_IDS = ['ghost-mark', 'sticker-burst', 'tile-row', 'tile-corner', 'icon-field', 'type-only'] as const
export type SceneId = (typeof SCENE_IDS)[number]

/** What a scene needs: motif icons, and the free zone its art takes (slide units). */
export const SCENE_NEEDS: Readonly<Record<SceneId, { icons: number; zone?: { w: number; h: number } }>> = {
  'ghost-mark': { icons: 1 },
  'sticker-burst': { icons: 3, zone: { w: 380, h: 340 } },
  'tile-row': { icons: 3, zone: { w: 560, h: 150 } },
  'tile-corner': { icons: 1, zone: { w: 200, h: 200 } },
  'icon-field': { icons: 2 },
  'type-only': { icons: 0 },
}

/** The next scene to try when one's needs are not met. */
export const SCENE_FALLBACK: Readonly<Record<SceneId, SceneId>> = {
  'sticker-burst': 'tile-corner',
  'tile-row': 'tile-corner',
  'tile-corner': 'ghost-mark',
  'icon-field': 'ghost-mark',
  'ghost-mark': 'type-only',
  'type-only': 'type-only',
}

/** Id prefix of the blocks a scene places. */
export const SCENE_PREFIX = 'scene-'
/** Art keeps this far from text (slide units), as the deck motif does. */
const CLEAR = 48
/** The frame margin the art keeps (slide units). */
const PAD = 56

function gap(a: Box, b: Box): number {
  const dx = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.width, b.x + b.width))
  const dy = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.height, b.y + b.height))
  return Math.hypot(dx, dy)
}

/** The largest free rectangle of the four bands beside the page's ink (right, left, below, above). */
export function freeZone(ink: Box[], frame: { width: number; height: number }): Box | undefined {
  const W = frame.width
  const H = frame.height
  if (!ink.length) return { x: PAD, y: PAD, width: W - 2 * PAD, height: H - 2 * PAD }
  const left = Math.min(...ink.map((b) => b.x))
  const right = Math.max(...ink.map((b) => b.x + b.width))
  const top = Math.min(...ink.map((b) => b.y))
  const bottom = Math.max(...ink.map((b) => b.y + b.height))
  const bands: Box[] = [
    { x: right + CLEAR, y: PAD, width: W - PAD - right - CLEAR, height: H - 2 * PAD },
    { x: PAD, y: PAD, width: left - CLEAR - PAD, height: H - 2 * PAD },
    { x: PAD, y: bottom + CLEAR, width: W - 2 * PAD, height: H - PAD - bottom - CLEAR },
    { x: PAD, y: PAD, width: W - 2 * PAD, height: top - CLEAR - PAD },
  ].filter((b) => b.width > 0 && b.height > 0 && ink.every((t) => gap(b, t) >= CLEAR - 0.5))
  bands.sort((a, b) => b.width * b.height - a.width * a.height)
  return bands[0]
}

type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

/** The frame corner farthest from the page's ink. */
function farCorner(ink: Box[], frame: { width: number; height: number }, side: number): { corner: Corner; box: Box } {
  const corners: Array<{ corner: Corner; box: Box }> = [
    { corner: 'top-left', box: { x: 0, y: 0, width: side, height: side } },
    { corner: 'top-right', box: { x: frame.width - side, y: 0, width: side, height: side } },
    { corner: 'bottom-left', box: { x: 0, y: frame.height - side, width: side, height: side } },
    { corner: 'bottom-right', box: { x: frame.width - side, y: frame.height - side, width: side, height: side } },
  ]
  const score = (b: Box) => (ink.length ? Math.min(...ink.map((t) => gap(b, t))) : Infinity)
  return corners.reduce((best, c) => (score(c.box) > score(best.box) ? c : best))
}

const block = (id: string, type: string, props: Record<string, unknown>): BlockSpec => ({ id: SCENE_PREFIX + id, type, layer: 'backdrop', props }) as BlockSpec

/** The placed blocks of scene `id` on a page, or undefined when its needs are not met there. */
export function sceneBlocks(id: SceneId, icons: string[], ink: Box[], frame: { width: number; height: number }, seed: number): PlacedBlock[] | 'backdrop' | undefined {
  const need = SCENE_NEEDS[id]
  if (icons.length < need.icons) return undefined
  const zone = need.zone ? freeZone(ink, frame) : undefined
  if (need.zone && (!zone || zone.width < need.zone.w || zone.height < need.zone.h)) return undefined
  const pick = (k: number) => icons[(seed + k) % icons.length]
  switch (id) {
    case 'type-only':
      return []
    case 'icon-field':
      return 'backdrop'
    case 'ghost-mark': {
      const side = Math.round(frame.height * 0.56)
      const { corner, box } = farCorner(ink, frame, side)
      // `bleed`: the glyph runs past its box (clipped there); the report must not read that as overflow
      return [{ block: { ...block('ghost', 'tls.m.decoration', { shape: 'icon', icon: pick(0), crop: corner, tone: 'accent', opacity: 'soft' }), bleed: true } as BlockSpec, box }]
    }
    case 'tile-corner': {
      const side = 200
      const { corner } = farCorner(ink, frame, side + PAD)
      const z = zone!
      const x = corner.endsWith('left') ? z.x : z.x + z.width - side
      const y = corner.startsWith('top') ? z.y : z.y + z.height - side
      return [{ block: block('tile', 'tls.m.icon', { icon: pick(0), size: 'xl', iconStyle: 'tile', color: 'accent' }), box: { x: Math.round(x), y: Math.round(y), width: side, height: side } }]
    }
    case 'sticker-burst': {
      const z = zone!
      const w = Math.min(z.width, 640)
      const h = Math.min(z.height, 560)
      const box = { x: Math.round(z.x + (z.width - w) / 2), y: Math.round(z.y + (z.height - h) / 2), width: Math.round(w), height: Math.round(h) }
      const list = [0, 1, 2, 3, 4].slice(0, Math.min(5, icons.length)).map(pick)
      return [{ block: block('cluster', 'tls.m.icon-cluster', { icons: list, tone: 'mixed', opacity: 'strong', backing: 'disc', seed }), box }]
    }
    case 'tile-row': {
      const z = zone!
      const n = Math.min(icons.length, 5, Math.floor((z.width + 32) / 152))
      const side = Math.min(120, z.height)
      const step = side + 32
      const x0 = z.x + (z.width - (n * step - 32)) / 2
      const y = z.y + (z.height - side) / 2
      return Array.from({ length: n }, (_, k) => ({
        block: block(`tile-${k}`, 'tls.m.icon', { icon: pick(k), size: 'lg', iconStyle: 'tile', color: k % 2 ? 'accent2' : 'accent' }),
        box: { x: Math.round(x0 + k * step), y: Math.round(y), width: side, height: side },
      }))
    }
  }
}

/** The ink a scene keeps clear of: the page's text and pictures, as laid out without a scene. */
function pageInk(deck: DeckSpec, slide: SlideSpec): Box[] {
  const report = analyzeDeck({ ...deck, slides: [slide] })[0]
  const out: Box[] = []
  for (const b of report.blocks) {
    if (b.layer === 'backdrop') continue
    out.push(...b.text.map((t) => t.painted))
    if (/^tls\.m\.(image|image-grid|illustration|device-mock)$/.test(b.type) && b.painted) out.push(b.painted)
  }
  return out
}

/** `deck` with every slide's `scene` resolved into placed blocks (or its ground, for `icon-field`). */
export function placeScenes(deck: DeckSpec): DeckSpec {
  if (!deck.slides.some((s) => s.scene)) return deck
  const icons = deckMotifIcons(deck)
  const frame = resolveDeckFrame(deck.aspect)
  let changed = false
  const slides = deck.slides.map((slide): SlideSpec => {
    const want = slide.scene
    if (!want || !(SCENE_IDS as readonly string[]).includes(want.id)) return slide
    if (slide.free?.some((f) => f.block?.id?.startsWith(SCENE_PREFIX))) return slide
    if (slide.backdrop?.kind === 'icon-field' && want.id === 'icon-field') return slide
    const seed = typeof want.seed === 'number' && Number.isFinite(want.seed) ? Math.abs(Math.floor(want.seed)) : 0
    let ink: Box[] | undefined
    let id = want.id as SceneId
    for (let guard = 0; guard < SCENE_IDS.length; guard++) {
      // the page's ink is needed only by scenes that place art
      if (!ink && id !== 'icon-field' && id !== 'type-only') ink = pageInk(deck, slide)
      const got = sceneBlocks(id, icons, ink ?? [], frame, seed)
      if (got === 'backdrop') {
        changed = true
        return { ...slide, backdrop: { ...slide.backdrop, kind: 'icon-field' } }
      }
      if (got) {
        if (!got.length) return slide
        changed = true
        return { ...slide, free: [...(slide.free ?? []), ...got] }
      }
      id = SCENE_FALLBACK[id]
    }
    return slide
  })
  return changed ? { ...deck, slides } : deck
}
