/**
 * Schema and defaults for tls.l.footer — content + footer.
 */

import type { BlockSchema } from '../../../types'

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
}

export interface FooterProps extends Record<string, unknown> {
  footerHeight: number
  gutter: string
}

export const defaults: FooterProps = {
  footerHeight: 120,
  gutter: 'md',
}
