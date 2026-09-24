/**
 * Schema and defaults for tls.l.section — titled section.
 */

import type { BlockSchema, BlockSpec } from '../../../types'

export const schema: BlockSchema = {
  title: {
    type: { kind: 'text', maxChars: 100 },
    role: 'content',
    label: 'Title',
    help: 'Section heading text.',
  },
  gap: {
    type: { kind: 'enum', values: ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'] },
    role: 'option',
    label: 'Gap',
    help: 'Spacing between title and children.',
  },
  children: {
    type: { kind: 'blocks', allow: ['layout', 'text', 'data', 'composite', 'media'] },
    role: 'content',
    label: 'Children',
    help: 'Child blocks laid out below the title.',
  },
}

export interface SectionProps extends Record<string, unknown> {
  title: string
  gap: string
  children?: BlockSpec[]
}

export const defaults: SectionProps = {
  title: 'Section',
  gap: 'sm',
}
