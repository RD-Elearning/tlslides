/**
 * Schema and defaults for tls.x.header — a thin running header: label left, meta right.
 */

import type { BlockSchema } from '../../../types'

export const schema: BlockSchema = {
  label: {
    type: { kind: 'text', maxChars: 40 },
    role: 'content',
    label: 'Label',
    guidance: 'Section, chapter or course code, shown at the left.',
  },
  meta: {
    type: { kind: 'text', maxChars: 40 },
    role: 'content',
    label: 'Meta',
    guidance: 'Client, date or version, shown at the right.',
  },
  showRule: { type: { kind: 'boolean' }, role: 'option', label: 'Hairline below', toggles: 'rule' },
  tone: {
    type: { kind: 'enum', values: ['muted', 'accent'] },
    role: 'option',
    label: 'Label colour',
    help: 'accent colours the label only; the meta stays muted.',
  },
}

export interface HeaderProps extends Record<string, unknown> {
  label?: string
  meta?: string
  showRule?: boolean
  tone?: 'muted' | 'accent'
}

export const defaults: HeaderProps = {
  label: 'Chapter 2: Methods',
  meta: 'BIO 201',
  showRule: false,
  tone: 'muted',
}
