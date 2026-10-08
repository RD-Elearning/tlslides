/**
 * Schema and defaults for tls.g.layers — stacked equal-weight layers, top to bottom.
 */

import type { BlockSchema } from '../../../types'
import { enumSlot } from '../../data/_chart/schema-kit'

export const LAYERS_MIN = 2
export const LAYERS_MAX = 7

export const schema: BlockSchema = {
  layers: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          label: { type: { kind: 'text', maxChars: 30 }, required: true, role: 'content', label: 'Layer' },
          text: { type: { kind: 'text', maxChars: 100 }, role: 'content', label: 'Note' },
          icon: { type: { kind: 'icon' }, role: 'content', label: 'Icon' },
        },
      },
      min: LAYERS_MIN,
      max: LAYERS_MAX,
    },
    role: 'content',
    label: 'Layers',
    required: true,
    guidance: 'Top layer first. {label, text?, icon?}.',
  },
  style: enumSlot(['flat', 'perspective'], 'Style', 'perspective = slanted slabs.'),
  notes: enumSlot(['side', 'inside'], 'Notes', 'side = notes beside the stack, inside = in the bar.'),
}

export interface LayersProps extends Record<string, unknown> {
  layers: Array<{ label: string; text?: string; icon?: string }>
  style?: 'flat' | 'perspective'
  notes?: 'side' | 'inside'
}

export const defaults: LayersProps = {
  layers: [
    { label: 'Application', text: 'What users touch', icon: 'smartphone' },
    { label: 'Services', text: 'Business logic and APIs', icon: 'server' },
    { label: 'Data', text: 'Storage and pipelines', icon: 'database' },
    { label: 'Infrastructure', text: 'Compute, network, security', icon: 'cloud' },
  ],
  style: 'flat',
  notes: 'inside',
}
