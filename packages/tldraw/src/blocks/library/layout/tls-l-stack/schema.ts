/**
 * Schema and defaults for tls.l.stack — vertical stack with gap.
 */

import type { BlockSchema } from '../../../types'

export const schema: BlockSchema = {
  gap: {
    kind: 'enum',
    values: ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'],
    role: 'option',
    label: 'Gap',
    help: 'Spacing between stacked children.',
  },
}

export interface StackProps {
  gap: string
}

export const defaults: StackProps = {
  gap: 'md',
}
