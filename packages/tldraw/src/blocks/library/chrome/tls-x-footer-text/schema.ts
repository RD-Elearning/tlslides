/**
 * Schema and defaults for tls.x.footer-text — one quiet footer line of up to three items.
 */

import type { BlockSchema } from '../../../types'

export const FOOTER_MAX_ITEMS = 3

export const schema: BlockSchema = {
  items: {
    type: { kind: 'list', of: { kind: 'text', maxChars: 40 }, min: 1, max: FOOTER_MAX_ITEMS },
    role: 'content',
    label: 'Items',
    required: true,
    guidance: 'Deck title, event or author, date or confidentiality note: short phrases, one line in total.',
  },
  align: {
    type: { kind: 'enum', values: ['start', 'center', 'end', 'spread'] },
    role: 'option',
    label: 'Alignment',
    help: 'spread puts the first item at the left edge and the last at the right.',
  },
  separator: {
    type: { kind: 'enum', values: ['dot', 'bar', 'none'] },
    role: 'option',
    label: 'Separator',
  },
  showRule: {
    type: { kind: 'boolean' },
    role: 'option',
    label: 'Hairline above',
    toggles: 'rule',
  },
}

export interface FooterTextProps extends Record<string, unknown> {
  items: string[]
  align?: 'start' | 'center' | 'end' | 'spread'
  separator?: 'dot' | 'bar' | 'none'
  showRule?: boolean
}

export const defaults: FooterTextProps = {
  items: ['Annual review 2026', 'Confidential'],
  align: 'start',
  separator: 'dot',
  showRule: false,
}
