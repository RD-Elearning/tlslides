/**
 * Schema and defaults for tls.m.image — image block.
 *
 * An image with fit mode, focal point, optional caption, alt text, and corner radius.
 * The `src` slot holds an asset id or URL; the layout function resolves it via
 * `ctx.resolveAsset()`.
 */

import type { BlockSchema } from '../../../types'

export const schema: BlockSchema = {
  src: {
    type: { kind: 'image' },
    role: 'content',
    label: 'Image',
    help: 'Asset id or URL of the image to display.',
    required: true,
  },
  alt: {
    type: { kind: 'text', maxChars: 200 },
    role: 'content',
    label: 'Alt text',
    help: 'Accessible description of the image. Required for accessibility and model compliance.',
    required: true,
    guidance: '1–10 words describing what the image shows.',
  },
  fit: {
    type: { kind: 'enum', values: ['cover', 'contain'] },
    role: 'option',
    label: 'Fit',
    help: 'How the image fills its box: cover (crop to fill) or contain (letterbox).',
  },
  focal: {
    type: { kind: 'object', fields: {
      fx: { type: { kind: 'number', min: 0, max: 1 }, role: 'option', label: 'Focal X', help: 'Horizontal focal point (0 = left, 1 = right).' },
      fy: { type: { kind: 'number', min: 0, max: 1 }, role: 'option', label: 'Focal Y', help: 'Vertical focal point (0 = top, 1 = bottom).' },
    }},
    role: 'option',
    label: 'Focal point',
    help: 'Focus area when fit is "cover". Default is center [0.5, 0.5].',
  },
  caption: {
    type: { kind: 'text', maxChars: 200 },
    role: 'content',
    label: 'Caption',
    help: 'Optional caption displayed below the image.',
  },
}

export interface ImageProps extends Record<string, unknown> {
  /** Asset id or URL of the image. */
  src: string
  /** Accessible alt text. Required. */
  alt: string
  /** How the image fills its box. Default: 'cover'. */
  fit?: 'cover' | 'contain'
  /** Focal point [fx, fy] in 0–1 range. Default: [0.5, 0.5]. */
  focal?: [number, number]
  /** Optional caption text below the image. */
  caption?: string
  /** Corner radius in slide units. */
  radius?: number
}

export const defaults: ImageProps = {
  src: '',
  alt: 'Image',
  fit: 'cover',
  focal: [0.5, 0.5],
}
