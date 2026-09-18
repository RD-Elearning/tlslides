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
}

export const defaults: QuoteProps = {
  text: 'The only way to do great work is to love what you do.',
  attribution: 'Steve Jobs',
  role: 'Co-founder, Apple',
  markStyle: 'glyph',
}
