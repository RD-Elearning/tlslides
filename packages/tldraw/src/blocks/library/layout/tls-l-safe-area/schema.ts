/**
 * Schema and defaults for tls.l.safe-area — content safe area (editorOnly).
 */

import type { BlockSchema } from '../../../types'

export const schema: BlockSchema = {
  inset: {
    type: { kind: 'enum', values: ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'] },
    role: 'option',
    label: 'Inset',
    help: 'Safe-area inset on all sides.',
  },
}

export interface SafeAreaProps extends Record<string, unknown> {
  inset: string
}

export const defaults: SafeAreaProps = {
  inset: 'md',
}
