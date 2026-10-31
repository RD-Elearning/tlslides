/**
 * tls.g.target — concentric rings from the core outward, with labels and notes (vivid V4).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsGTarget: BlockDefinition = {
  type: 'tls.g.target',
  name: 'Target',
  family: 'diagram',
  tier: 'A',
  summary: 'Concentric rings from the core outward (core concept to periphery), each ring with a label and a note in a column beside it.',
  keywords: ['target', 'bullseye', 'concentric', 'rings', 'onion', 'core', 'circles of', 'sphere of influence', 'layers'],
  category: 'hierarchy',
  scope: 'group',
  shortDescription: 'Concentric rings: the core and what surrounds it',
  related: ['tls.g.layers', 'tls.g.pyramid', 'tls.g.venn'],
  describe: {
    when: 'Things that nest around a centre: a core concept and its wider contexts, circles of influence, must / should / could know, the layers of an onion model.',
    avoid: 'Parts that do not contain one another — the terms of a definition, steps, a list (each ring must hold the one inside it); levels stacked or ranked by size (use tls.g.pyramid); overlapping sets (use tls.g.venn); equal layers of a system (use tls.g.layers).',
    example: {
      id: 'b_target',
      type: 'tls.g.target',
      props: {
        rings: [
          { label: 'Must know', text: 'Definitions and the main theorem' },
          { label: 'Should know', text: 'Proof ideas and typical exercises' },
          { label: 'Could know', text: 'History and extensions' },
        ],
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [1100, 560], min: [600, 320], hug: true },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
