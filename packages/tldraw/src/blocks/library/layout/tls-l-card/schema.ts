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
  children: {
    type: { kind: 'blocks', allow: ['layout', 'text', 'data', 'composite', 'media'] },
    role: 'content',
    label: 'Children',
    help: 'Child blocks laid out inside the card.',
  },
}

export interface CardProps extends Record<string, unknown> {
  padding: string
  children?: BlockSpec[]
}

export const defaults: CardProps = {
  padding: 'md',
}
