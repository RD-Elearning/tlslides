/**
 * Schema and defaults for tls.x.logo-mark — a small brand mark in a slide corner.
 */

import type { BlockSchema } from '../../../types'

export const schema: BlockSchema = {
  image: { type: { kind: 'image' }, role: 'content', label: 'Logo', required: true },
  alt: { type: { kind: 'text', maxChars: 80 }, role: 'content', label: 'Alt text', required: true, guidance: 'The brand name.' },
  ratio: {
    type: { kind: 'number', min: 0.2, max: 8 },
    role: 'option',
    label: 'Aspect ratio',
    help: 'Width / height of the logo file. Needed for corner placement; read from the asset when known.',
  },
  size: { type: { kind: 'enum', values: ['sm', 'md'] }, role: 'option', label: 'Size' },
  corner: {
    type: { kind: 'enum', values: ['top-right', 'top-left', 'bottom-right', 'bottom-left'] },
    role: 'option',
    label: 'Corner',
    help: 'Which corner of its box the logo sits in.',
  },
}

export interface LogoMarkProps extends Record<string, unknown> {
  image: string
  alt: string
  ratio?: number
  size?: 'sm' | 'md'
  corner?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
}

export const defaults: LogoMarkProps = {
  image: '',
  alt: 'Brand logo',
  size: 'sm',
  corner: 'top-right',
}
