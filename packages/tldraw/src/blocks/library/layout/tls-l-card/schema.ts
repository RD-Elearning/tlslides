/**
 * Schema and defaults for tls.l.card — filled container with padding.
 */

import type { BlockSchema, BlockSpec } from '../../../types'

export const schema: BlockSchema = {
  padding: {
    type: { kind: 'enum', values: ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'] },
    role: 'option',
    label: 'Padding',
    help: 'Inner padding of the card.',
  },
  // spro sprint 2026-11c C6: set by the service when the card names one of the document's coloured groups
  tone: { type: { kind: 'text', maxChars: 12 }, role: 'option', label: 'Group colour', help: '`category:<n>`: the card in the colour the document gives its group (set by the service).' },
  children: {
    type: { kind: 'blocks', allow: ['layout', 'text', 'data', 'diagram', 'composite', 'media'] },
    role: 'content',
    label: 'Children',
    help: 'Child blocks laid out inside the card.',
  },
}

export interface CardProps extends Record<string, unknown> {
  padding: string
  /** C6: `category:<n>` — the card in its group's colour (set by the service). */
  tone?: string
  children?: BlockSpec[]
}

export const defaults: CardProps = {
  padding: 'md',
}
