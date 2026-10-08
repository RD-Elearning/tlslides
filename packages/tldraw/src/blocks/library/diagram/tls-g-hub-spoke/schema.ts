/**
 * Schema and defaults for tls.g.hub-spoke — a central hub with satellites on connecting lines.
 */

import type { BlockSchema } from '../../../types'
import { enumSlot } from '../../data/_chart/schema-kit'

export const SPOKE_MIN = 3
export const SPOKE_MAX = 8

export const schema: BlockSchema = {
  hub: {
    type: {
      kind: 'object',
      fields: {
        label: { type: { kind: 'text', maxChars: 24 }, required: true, role: 'content', label: 'Hub' },
        icon: { type: { kind: 'icon' }, role: 'content', label: 'Icon' },
      },
    },
    role: 'content',
    label: 'Hub',
    required: true,
    guidance: 'The centre: {label, icon?}.',
  },
  spokes: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          label: { type: { kind: 'text', maxChars: 24 }, required: true, role: 'content', label: 'Label' },
          text: { type: { kind: 'text', maxChars: 70 }, role: 'content', label: 'Note' },
          icon: { type: { kind: 'icon' }, role: 'content', label: 'Icon' },
        },
      },
      min: SPOKE_MIN,
      max: SPOKE_MAX,
    },
    role: 'content',
    label: 'Spokes',
    required: true,
    guidance: 'Satellites {label, text?, icon?}, clockwise from the top.',
  },
  layout: enumSlot(['circle', 'half'], 'Layout', 'half = spokes fan over the top half, hub at the bottom.'),
  connector: enumSlot(['line', 'arrow-out', 'arrow-in', 'none'], 'Connector'),
}

export interface HubSpokeProps extends Record<string, unknown> {
  hub: { label: string; icon?: string }
  spokes: Array<{ label: string; text?: string; icon?: string }>
  layout?: 'circle' | 'half'
  connector?: 'line' | 'arrow-out' | 'arrow-in' | 'none'
}

export const defaults: HubSpokeProps = {
  hub: { label: 'Platform', icon: 'layers' },
  spokes: [
    { label: 'Web app', text: 'Customer front door', icon: 'globe' },
    { label: 'Mobile', text: 'iOS and Android', icon: 'smartphone' },
    { label: 'Payments', text: 'Cards and invoices', icon: 'credit-card' },
    { label: 'Analytics', text: 'Dashboards', icon: 'chart-bar' },
    { label: 'Support', text: 'Help desk', icon: 'message' },
  ],
  layout: 'circle',
  connector: 'line',
}
