/**
 * Schema and defaults for tls.g.pyramid — stacked levels from tip to base.
 */

import type { BlockSchema } from '../../../types'
import { enumSlot } from '../../data/_chart/schema-kit'

export const PYRAMID_MAX = 6

export const schema: BlockSchema = {
  levels: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          label: { type: { kind: 'text', maxChars: 30 }, required: true, role: 'content', label: 'Level' },
          text: { type: { kind: 'text', maxChars: 100 }, role: 'content', label: 'Note' },
        },
      },
      min: 3,
      max: PYRAMID_MAX,
    },
    role: 'content',
    label: 'Levels',
    required: true,
    guidance: 'Top (tip) first, base last. Keep the tip label short.',
  },
  direction: enumSlot(['up', 'down'], 'Direction', 'down = inverted pyramid, widest level first.'),
  notes: enumSlot(['side', 'inside', 'none'], 'Notes', 'side = notes beside the pyramid with leaders.'),
  fill: enumSlot(['gradient', 'series', 'single'], 'Fill'),
}

export interface PyramidLevel {
  label: string
  text?: string
}

export interface PyramidProps extends Record<string, unknown> {
  levels: PyramidLevel[]
  direction?: 'up' | 'down'
  notes?: 'side' | 'inside' | 'none'
  fill?: 'gradient' | 'series' | 'single'
}

export const defaults: PyramidProps = {
  levels: [
    { label: 'Vision', text: 'Where we want to be' },
    { label: 'Strategy', text: 'How we get there' },
    { label: 'Tactics', text: 'The projects we run' },
    { label: 'Operations', text: 'Daily work that pays for it' },
  ],
  direction: 'up',
  notes: 'side',
  fill: 'gradient',
}
