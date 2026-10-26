/**
 * spro creative PLAN §6.7 (CR7a) — masters v2: the deck motif in a free zone.
 *
 * A style's cover and section masters draw a signature motif at a fixed box (doodle's star at the
 * top left of the cover). A composed cover whose title sits there gets the star on its words
 * (spro expected cover and closing, doodle). Under `DeckSpec.motifZone: 'auto'` the masters leave
 * the signature out (`styleMasters`) and `placeDeckMotifs` puts it on each page that uses such a
 * master as a free backdrop block `deck-motif`: at the master's own box when that keeps clear of
 * the page's text, else at the mirrored corner farthest from it. The host runs it before it
 * renders or checks a deck; a page that already has its `deck-motif` (an edited deck coming back
 * through the decompiler) is left alone, so it is idempotent.
 *
 * Pure and DOM-free.
 */
import { analyzeDeck } from './layout-report'
import { resolveDeckFrame } from './deck-document'
import { getDeckStyle, styleMasterFor, styleMasters } from './styles'
import { splitBox } from './layout/box-model'
import type { BlockSpec, Box, DeckSpec, PlacedBlock, SlideSpec } from './types'

/** The id of the placed signature motif. */
export const DECK_MOTIF_ID = 'deck-motif'
/** A corner keeps clear of text from this distance (slide units). */
export const MOTIF_CLEARANCE = 48
/** The gutter `_place.ts` builds its placing splits with (`3xs`). */
const PLACE_GUTTER = 4

/** The motif leaf a master block places through nested splits (`styles/_place.ts`), and its box. */
export function placedLeaf(block: BlockSpec, frame: { width: number; height: number }): { leaf: BlockSpec; box: Box } {
  let box: Box = { x: 0, y: 0, width: frame.width, height: frame.height }
  let b = block
  while (b.type === 'tls.l.split') {
    const p = b.props as { axis?: 'x' | 'y'; ratio?: number; children?: BlockSpec[] }
    const kids = p.children ?? []
    const [first, second] = splitBox(box, p.ratio ?? 0.5, PLACE_GUTTER, p.axis ?? 'x')
    const i = kids[0]?.type === 'tls.l.spacer' ? 1 : 0
    box = i === 0 ? first : second
    b = kids[i]
    if (!b) break
  }
  return { leaf: b, box }
}

function distance(a: Box, b: Box): number {
  const dx = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.width, b.x + b.width))
  const dy = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.height, b.y + b.height))
  return Math.hypot(dx, dy)
}

/** The master's box and its mirrors across the frame (original first), scored by distance to text. */
export function motifBox(own: Box, text: Box[], frame: { width: number; height: number }): Box {
  const xs = [own.x, frame.width - own.x - own.width]
  const ys = [own.y, frame.height - own.y - own.height]
  const candidates = ys.flatMap((y) => xs.map((x) => ({ ...own, x, y })))
  const score = (c: Box) => (text.length ? Math.min(...text.map((t) => distance(c, t))) : Infinity)
  if (score(own) >= MOTIF_CLEARANCE) return own
  let best = own
  for (const c of candidates) if (score(c) > score(best)) best = c
  return best
}

/** `deck` with its signature motif placed on every cover/section page (only under `motifZone: 'auto'`). */
export function placeDeckMotifs(deck: DeckSpec): DeckSpec {
  if (deck.motifZone !== 'auto') return deck
  const style = getDeckStyle(deck.style)
  if (!style) return deck
  const frame = resolveDeckFrame(deck.aspect)
  const signatures = new Map<string, { leaf: BlockSpec; box: Box }>()
  for (const m of styleMasters(style, deck.motif)) {
    const block = m.signature ? m.blocks[m.signature] : undefined
    if (block) signatures.set(m.name, placedLeaf(block, frame))
  }
  if (!signatures.size) return deck
  let changed = false
  const slides = deck.slides.map((slide): SlideSpec => {
    const id = styleMasterFor(style, slide)
    const sig = id ? signatures.get(id) : undefined
    if (!sig || slide.free?.some((f) => f.block?.id === DECK_MOTIF_ID)) return slide
    // the page as the masters draw it under `auto` (no signature): where its text is
    const report = analyzeDeck({ ...deck, slides: [slide] })[0]
    const text = report.blocks.filter((b) => b.layer !== 'backdrop').flatMap((b) => b.text.map((t) => t.painted))
    const placed: PlacedBlock = {
      block: { ...sig.leaf, id: DECK_MOTIF_ID, layer: 'backdrop' },
      box: motifBox(sig.box, text, frame),
    }
    changed = true
    return { ...slide, free: [...(slide.free ?? []), placed] }
  })
  return changed ? { ...deck, slides } : deck
}
