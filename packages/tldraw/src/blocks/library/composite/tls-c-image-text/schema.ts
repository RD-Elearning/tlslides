/**
 * Schema and defaults for tls.c.image-text — image beside/above a text cluster.
 *
 * A composite block that pairs an image (delegated to tls.m.image) with a text
 * cluster (kicker + title + body). The `placement` prop controls whether the
 * image sits to the left, right, or above the text.
 */

import type { BlockSchema } from '../../../types'

export interface ImageTextProps extends Record<string, unknown> {
  /** Asset id or URL of the image. */
  image: string
  /** Accessible alt text for the image. */
  alt: string
  /** Placement of the image relative to the text. */
  placement: 'left' | 'right' | 'top'
  /** Fraction of the box width (left/right) or height (top) given to the image. */
  imageRatio: number
  /** Kicker / eyebrow label above the title. */
  kicker?: string
  showKicker?: boolean
  /** Title text. */
  title: string
  showTitle?: boolean
  /** Body text. */
  body?: string
  showBody?: boolean
  /** Gap between image and text columns in left/right mode. */
  gutter?: string
}

export const schema: BlockSchema = {
  image: {
    type: { kind: 'image' },
    role: 'content',
    label: 'Image',
    help: 'Asset id or URL of the image to display beside or above the text.',
    required: true,
  },
  alt: {
    type: { kind: 'text', maxChars: 200 },
    role: 'content',
    label: 'Alt text',
    help: 'Accessible description of the image. Required for model compliance.',
    required: true,
    guidance: '1–10 words describing what the image shows.',
  },
  placement: {
    type: { kind: 'enum', values: ['left', 'right', 'top'] },
    role: 'option',
    label: 'Placement',
    help: 'Where the image sits relative to the text cluster.',
  },
  imageRatio: {
    type: { kind: 'number', min: 0.2, max: 0.8 },
    role: 'option',
    label: 'Image ratio',
    help: 'Fraction of the box given to the image (left/right splits width, top splits height).',
  },
  kicker: {
    type: { kind: 'text', maxChars: 60 },
    role: 'content',
    label: 'Kicker',
    guidance: 'Short label above the title: section name, category, or status. 1–4 words.',
  },
  showKicker: {
    type: { kind: 'boolean' },
    role: 'option',
    label: 'Show Kicker',
    help: 'Toggle the kicker label on/off.',
    toggles: 'kicker',
  },
  title: {
    type: { kind: 'text', maxChars: 120 },
    role: 'content',
    label: 'Title',
    required: true,
    guidance: 'A concise slide title. 3–10 words. Never a full sentence.',
  },
  showTitle: {
    type: { kind: 'boolean' },
    role: 'option',
    label: 'Show Title',
    help: 'Toggle the title text on/off.',
    toggles: 'title',
  },
  body: {
    type: { kind: 'text', maxChars: 500 },
    role: 'content',
    label: 'Body',
    guidance: '1–3 sentences of supporting body copy.',
  },
  showBody: {
    type: { kind: 'boolean' },
    role: 'option',
    label: 'Show Body',
    help: 'Toggle the body text on/off.',
    toggles: 'body',
  },
  gutter: {
    type: { kind: 'enum', values: ['xs', 'sm', 'md', 'lg', 'xl'] },
    role: 'option',
    label: 'Gutter',
    help: 'Gap between the image and the text cluster.',
  },
}

export const defaults: ImageTextProps = {
  image: '',
  alt: 'Team collaborating in an office',
  placement: 'left',
  imageRatio: 0.48,
  kicker: 'OVERVIEW',
  title: 'Our approach to design systems',
  body: 'A unified design system ensures consistency across every surface. Tokens, blocks and templates keep the product coherent at scale.',
  gutter: 'lg',
}
