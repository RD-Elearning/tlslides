/**
 * Schema and defaults for tls.l.card — filled container with padding.
 */

import type { BlockSchema } from '../../../types'

export const schema: BlockSchema = {
  padding: {
    type: { kind: 'enum', values: ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'] },
    role: 'option',
    label: 'Padding',
    help: 'Inner padding of the card.',
  },
}

export interface CardProps extends Record<string, unknown> {
  padding: string
}

export const defaults: CardProps = {
  padding: 'md',
}
