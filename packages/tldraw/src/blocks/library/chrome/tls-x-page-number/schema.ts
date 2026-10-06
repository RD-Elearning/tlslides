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
  total: {
    type: { kind: 'number', min: 1 },
    role: 'option',
    label: 'Total pages',
    help: 'When set, shows "number / total" (e.g. 3 / 24).',
    guidance: 'Optional. Leave out for a bare number.',
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
  total?: number
  align?: string
}

export const defaults: PageNumberProps = {
  number: 1,
  align: 'center',
}