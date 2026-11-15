/**
 * Schema and defaults for tls.l.panel — a card whose surface is a choice of the deck's roles (S11).
 */

import type { BlockSchema, BlockSpec } from '../../../types'

export const PANEL_SURFACES = ['base', 'alt', 'accent', 'inverted', 'glass', 'outline'] as const
export const PANEL_EMPHASES = ['none', 'band', 'corner'] as const

export const schema: BlockSchema = {
  surface: {
    type: { kind: 'enum', values: [...PANEL_SURFACES] },
    role: 'option',
    label: 'Surface',
    help: "base = the deck's card look; alt = the second surface; accent = the accent colour; inverted = text colour as background; glass = the style's own card treatment; outline = a hairline, no fill. At most one accent or inverted panel per slide.",
  },
  emphasis: {
    type: { kind: 'enum', values: [...PANEL_EMPHASES] },
    role: 'option',
    label: 'Emphasis',
    help: 'band = an accent strip along the left edge; corner = an accent mark in the top-left corner; none.',
  },
  padding: {
    type: { kind: 'enum', values: ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'] },
    role: 'option',
    label: 'Padding',
    help: 'Inner padding of the panel.',
  },
  children: {
    type: { kind: 'blocks', allow: ['layout', 'text', 'data', 'diagram', 'composite', 'media'] },
    role: 'content',
    label: 'Children',
    help: 'Child blocks laid out inside the panel (two or more are stacked).',
  },
}

export interface PanelProps extends Record<string, unknown> {
  surface?: (typeof PANEL_SURFACES)[number]
  emphasis?: (typeof PANEL_EMPHASES)[number]
  padding: string
  children?: BlockSpec[]
}

export const defaults: PanelProps = {
  surface: 'base',
  emphasis: 'none',
  padding: 'md',
}
