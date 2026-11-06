/**
 * spro sprint 2026-11b S13-b — which backdrop a slide paints, and the block that draws it.
 *
 * A slide's role picks from the deck's set (`DeckSpec.backdrops`): its own `backdrop.tone`, else
 * `deep` / `accent` from its `tone`, else `calm`; its own `backdrop.kind` / `intensity` win over the
 * set's. The block is a full-bleed `tls.m.backdrop` placed under every other shape, with a `style:`
 * id (the style's, never written back by the decompiler), and it replaces the style master's own
 * texture blocks (`tls.m.pattern`: mesh, grain, paper) on that slide — the master's furniture (rules,
 * mastheads, motifs) stays. `flat` paints nothing but still drops the master's texture.
 */

import type { BackdropRole, BlockSpec, Box, DeckSpec, SlideSpec } from './types'
import { BACKDROP_KINDS } from './library/media/tls-m-backdrop/schema'

export interface ResolvedBackdrop {
  kind: string
  tone: BackdropRole
  intensity: 'soft' | 'medium'
  seed: number
}

/** The style-master block types a deck backdrop replaces. */
export const MASTER_TEXTURE_TYPES: ReadonlySet<string> = new Set(['tls.m.pattern'])

const hash = (s: string) => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return (h >>> 0) % 10000
}

/** The slide's backdrop, or `undefined` when neither the slide nor the deck names one. */
export function slideBackdrop(deck: Pick<DeckSpec, 'backdrops'>, slide: Pick<SlideSpec, 'id' | 'tone' | 'backdrop'>): ResolvedBackdrop | undefined {
  const own = slide.backdrop
  const role: BackdropRole = own?.tone ?? (slide.tone === 'deep' ? 'deep' : slide.tone === 'accent' ? 'accent' : 'calm')
  const set = deck.backdrops?.[role]
  const kind = own?.kind ?? set?.kind
  if (!kind || !(BACKDROP_KINDS as readonly string[]).includes(kind)) return undefined
  return { kind, tone: role, intensity: own?.intensity ?? set?.intensity ?? 'soft', seed: typeof own?.seed === 'number' ? own.seed : hash(slide.id) }
}

/** The full-frame block that draws it (`undefined` for `flat`). */
export function backdropBlock(b: ResolvedBackdrop | undefined, frame: { width: number; height: number }): { block: BlockSpec; box: Box } | undefined {
  if (!b || b.kind === 'flat') return undefined
  return {
    block: { id: 'style-backdrop', type: 'tls.m.backdrop', layer: 'backdrop', bleed: true, props: { kind: b.kind, tone: b.tone, intensity: b.intensity, seed: b.seed } } as BlockSpec,
    box: { x: 0, y: 0, width: frame.width, height: frame.height },
  }
}
