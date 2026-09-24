/**
 * Schema and defaults for tls.l.footer — content + footer.
 */

import type { BlockSchema, BlockSpec } from '../../../types'

export const schema: BlockSchema = {
  footerHeight: {
    type: { kind: 'number', min: 40, max: 400 },
    role: 'option',
    label: 'Footer Height',
    help: 'Height of the footer area in slide units.',
  },
  gutter: {
    type: { kind: 'enum', values: ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'] },
    role: 'option',
    label: 'Gutter',
    help: 'Spacing between main content and footer.',
  },
  children: {
    type: { kind: 'blocks', allow: ['layout', 'text', 'data', 'composite', 'media'], max: 2 },
    role: 'content',
    label: 'Children',
    help: 'First child is main content, second is the footer.',
  },
}

export interface FooterProps extends Record<string, unknown> {
  footerHeight: number
  gutter: string
  children?: BlockSpec[]
}

export const defaults: FooterProps = {
  footerHeight: 120,
  gutter: 'md',
}
