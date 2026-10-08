/**
 * Schema and defaults for tls.m.image-compare — two images, before and after.
 */

import type { BlockSchema, SlotSpec } from '../../../types'

const panel = (label: string): SlotSpec => ({
  type: {
    kind: 'object',
    fields: {
      image: { type: { kind: 'image' }, role: 'content', label: 'Image', required: true },
      alt: { type: { kind: 'text', maxChars: 120 }, role: 'content', label: 'Alt text', required: true },
      label: { type: { kind: 'text', maxChars: 24 }, role: 'content', label: 'Label' },
    },
  },
  role: 'content',
  label,
  required: true,
  guidance: '{image, alt, label? (default Before/After, <= 24 chars)}.',
})

export const schema: BlockSchema = {
  before: panel('Before'),
  after: panel('After'),
  mode: {
    type: { kind: 'enum', values: ['side', 'split'] },
    role: 'option',
    label: 'Mode',
    help: 'side = two frames; split = one frame, left half before, right half after.',
  },
  divider: { type: { kind: 'boolean' }, role: 'option', label: 'Divider' },
}

export interface ComparePanel {
  image: string
  alt: string
  label?: string
}

export interface ImageCompareProps extends Record<string, unknown> {
  before: ComparePanel
  after: ComparePanel
  mode?: 'side' | 'split'
  divider?: boolean
}

export const defaults: ImageCompareProps = {
  before: { image: '', alt: 'The room before the renovation', label: 'Before' },
  after: { image: '', alt: 'The room after the renovation', label: 'After' },
  mode: 'side',
  divider: true,
}
