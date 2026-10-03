/**
 * Schema and defaults for tls.m.image-grid — several images in even cells or a feature pattern.
 */

import type { BlockSchema } from '../../../types'

export const GRID_MAX_IMAGES = 9

export const schema: BlockSchema = {
  images: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          image: { type: { kind: 'image' }, role: 'content', label: 'Image', required: true },
          alt: { type: { kind: 'text', maxChars: 120 }, role: 'content', label: 'Alt text', required: true },
          caption: { type: { kind: 'text', maxChars: 60 }, role: 'content', label: 'Caption' },
        },
      },
      min: 2,
      max: GRID_MAX_IMAGES,
    },
    role: 'content',
    label: 'Images',
    required: true,
    guidance: '2-9 items {image, alt (1-10 words), caption?}.',
  },
  pattern: {
    type: { kind: 'enum', values: ['even', 'feature-left', 'feature-top', 'mosaic'] },
    role: 'option',
    label: 'Pattern',
    help: 'feature-* enlarges the first image.',
  },
  cols: {
    type: { kind: 'enum', values: ['auto', '2', '3', '4'] },
    role: 'option',
    label: 'Columns',
    help: 'Pattern even only.',
  },
  gap: { type: { kind: 'enum', values: ['sm', 'md', 'none'] }, role: 'option', label: 'Gap' },
  radius: { type: { kind: 'enum', values: ['md', 'none', 'lg'] }, role: 'option', label: 'Corner radius' },
  captions: {
    type: { kind: 'enum', values: ['below', 'overlay', 'none'] },
    role: 'option',
    label: 'Captions',
  },
}

export interface ImageGridItem {
  image: string
  alt: string
  caption?: string
}

export interface ImageGridProps extends Record<string, unknown> {
  images: ImageGridItem[]
  pattern?: 'even' | 'feature-left' | 'feature-top' | 'mosaic'
  cols?: 'auto' | '2' | '3' | '4'
  gap?: 'sm' | 'md' | 'none'
  radius?: 'md' | 'none' | 'lg'
  captions?: 'below' | 'overlay' | 'none'
}

export const defaults: ImageGridProps = {
  images: [
    { image: '', alt: 'Photo one', caption: 'First' },
    { image: '', alt: 'Photo two', caption: 'Second' },
    { image: '', alt: 'Photo three', caption: 'Third' },
    { image: '', alt: 'Photo four', caption: 'Fourth' },
  ],
  pattern: 'even',
  cols: 'auto',
  gap: 'md',
  radius: 'md',
  captions: 'below',
}
