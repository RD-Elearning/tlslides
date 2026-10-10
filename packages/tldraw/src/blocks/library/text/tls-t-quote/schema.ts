/**
 * Schema and defaults for tls.t.quote — pull quote with quotation glyph.
 */

import type { BlockSchema } from '../../../types'

export interface QuoteProps extends Record<string, unknown> {
  /** The quoted text. */
  text: string
  /** Attribution name, e.g. "Steve Jobs". */
  attribution: string
  /** Role / title of the attributed person. */
  role: string
  /** How the quotation mark is rendered. */
  markStyle: 'glyph' | 'rule' | 'none'
  /** AC8: the design. classic = mark beside the text (the original look); big = display-size quote
   *  under a large mark; card = on a card with a name row; side = a heavy accent bar down the left;
   *  image = a photo beside the quote. */
  variant?: 'classic' | 'big' | 'card' | 'side' | 'image'
  /** AC8: the photo for `variant: image` (ignored by the other designs). */
  image?: string
  /** AC8: alt text for `image`. */
  alt?: string
}

export const schema: BlockSchema = {
  text: {
    type: { kind: 'richText' },
    role: 'content',
    label: 'Text',
    guidance: 'The quoted text. Can be 1–3 sentences.',
  },
  attribution: {
    type: { kind: 'text' },
    role: 'content',
    label: 'Attribution',
    guidance: 'Name of the person being quoted.',
  },
  role: {
    type: { kind: 'text' },
    role: 'content',
    label: 'Role',
    guidance: 'Title or role of the attributed person.',
  },
  markStyle: {
    type: { kind: 'enum', values: ['glyph', 'rule', 'none'] },
    role: 'option',
    label: 'Mark Style',
    help: 'How the quotation mark is rendered.',
  },
  variant: {
    type: { kind: 'enum', values: ['classic', 'big', 'card', 'side', 'image'] },
    role: 'option',
    label: 'Variant',
    help: 'classic: mark beside; big: display type; card: on a card; side: accent bar; image: photo beside.',
  },
  image: { type: { kind: 'image' }, role: 'content', label: 'Photo', guidance: 'Only drawn with variant image.' },
  alt: { type: { kind: 'text', maxChars: 160 }, role: 'content', label: 'Photo alt text' },
}

export const defaults: QuoteProps = {
  text: 'The only way to do great work is to love what you do.',
  attribution: 'Steve Jobs',
  role: 'Co-founder, Apple',
  markStyle: 'glyph',
  variant: 'classic',
}
