/**
 * tls.m.backdrop — the slide's ground, drawn by the engine in one of sixteen kinds (sprint 2026-11b
 * S13-b): placed by the style masters and the deck's backdrop rhythm, never chosen by the composer.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

export const tlsMBackdrop: BlockDefinition = {
  type: 'tls.m.backdrop',
  name: 'Backdrop',
  family: 'media',
  tier: 'A',
  summary: 'The slide ground: soft glows, aurora bands, a split field, a diagonal band, rings, contours, halftone, blueprint, paper, ruled lines, slate, waves, a frame, a spotlight or a dot field.',
  keywords: ['backdrop', 'background', 'ground', 'mesh', 'aurora', 'paper', 'blueprint', 'waves', 'topographic', 'halftone', 'frame', 'spotlight'],
  category: 'decoration',
  scope: 'element',
  shortDescription: 'Full-slide ground: glows, fields, line work, textures or waves',
  related: ['tls.m.pattern', 'tls.m.decoration'],
  describe: {
    when: 'Under a whole slide (full bleed, backdrop layer). The deck rhythm places it: deep cover/closing, accent dividers, calm content, quiet dense slides.',
    avoid: 'Inside a region or a card (a texture there is tls.m.pattern); busy kinds (halftone, topo at medium) under text without a panel.',
    example: { id: 'b_backdrop', type: 'tls.m.backdrop', props: { kind: 'aurora', tone: 'calm', intensity: 'soft' } },
  },
  schema,
  defaults,
  size: { preferred: [1920, 1080], min: [200, 120] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
