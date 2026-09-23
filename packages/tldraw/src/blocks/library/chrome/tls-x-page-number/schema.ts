/**
 * Schema and defaults for tls.x.page-number — page number chrome.
 */

import type { BlockSchema } from '../../../types'

export const schema: BlockSchema = {
  number: {
    type: { kind: 'number', min: 1 },
    role: 'content',
    label: 'Page number',
    help: 'The page number to display.',
    required: true,
    guidance: 'Typically 1-2 digits.',
  },
  align: {
    type: { kind: 'enum', values: ['start', 'center', 'end'] },
    role: 'option',
    label: 'Alignment',
    help: 'Text alignment.',
  },
}

export interface PageNumberProps extends Record<string, unknown> {
  number: number
  align?: string
}

export const defaults: PageNumberProps = {
  number: 1,
  align: 'center',
}