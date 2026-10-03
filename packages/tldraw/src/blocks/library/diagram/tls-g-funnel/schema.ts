/**
 * Schema and defaults for tls.g.funnel — narrowing stages with a note per stage.
 */

import type { BlockSchema } from '../../../types'
import { enumSlot } from '../../data/_chart/schema-kit'

export const FUNNEL_MAX = 6

export const schema: BlockSchema = {
  stages: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          label: { type: { kind: 'text', maxChars: 30 }, required: true, role: 'content', label: 'Stage' },
          text: { type: { kind: 'text', maxChars: 90 }, role: 'content', label: 'Note' },
        },
      },
      min: 3,
      max: FUNNEL_MAX,
    },
    role: 'content',
    label: 'Stages',
    required: true,
    guidance: 'Broadest stage first. No numbers needed.',
  },
  orientation: enumSlot(['vertical', 'horizontal'], 'Orientation'),
  notes: enumSlot(['side', 'inside'], 'Notes', 'side = beside (vertical) or below (horizontal).'),
}

export interface FunnelStage {
  label: string
  text?: string
}

export interface FunnelProps extends Record<string, unknown> {
  stages: FunnelStage[]
  orientation?: 'vertical' | 'horizontal'
  notes?: 'side' | 'inside'
}

export const defaults: FunnelProps = {
  stages: [
    { label: 'Aware', text: 'People who hear about us' },
    { label: 'Interested', text: 'Visit and read' },
    { label: 'Trial', text: 'Try the product' },
    { label: 'Customer', text: 'Pay and stay' },
  ],
  orientation: 'vertical',
  notes: 'side',
}
