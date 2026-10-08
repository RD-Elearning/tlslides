/**
 * Schema and defaults for tls.x.watermark — large faint text such as DRAFT across the slide.
 */

import type { BlockSchema } from '../../../types'

export const schema: BlockSchema = {
  text: {
    type: { kind: 'text', maxChars: 20 },
    role: 'content',
    label: 'Text',
    required: true,
    guidance: 'One short word or phrase, usually upper case: DRAFT, CONFIDENTIAL.',
  },
  opacity: {
    type: { kind: 'enum', values: ['faint', 'soft'] },
    role: 'option',
    label: 'Strength',
    help: 'faint is a barely visible 6% tint, soft 11%.',
  },
}

export interface WatermarkProps extends Record<string, unknown> {
  text: string
  opacity?: 'faint' | 'soft'
}

export const defaults: WatermarkProps = {
  text: 'DRAFT',
  opacity: 'faint',
}
