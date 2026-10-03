/**
 * Schema and defaults for tls.t.footnote — small-print sources and footnotes.
 */

import type { BlockSchema } from '../../../types'

export const FOOTNOTE_MAX_ITEMS = 4
export const FOOTNOTE_MAX_LINES = 4

export const schema: BlockSchema = {
  items: {
    type: { kind: 'list', of: { kind: 'text', maxChars: 200 }, min: 1, max: FOOTNOTE_MAX_ITEMS },
    role: 'content',
    label: 'Lines',
    required: true,
    guidance: 'One source or note per line; no marker characters, the marker option adds them.',
  },
  marker: {
    type: { kind: 'enum', values: ['none', 'number', 'asterisk', 'source'] },
    role: 'option',
    label: 'Marker',
    help: 'source prefixes the first line with "Source:".',
  },
  align: {
    type: { kind: 'enum', values: ['start', 'end'] },
    role: 'option',
    label: 'Alignment',
  },
}

export interface FootnoteProps extends Record<string, unknown> {
  items: string[]
  marker?: 'none' | 'number' | 'asterisk' | 'source'
  align?: 'start' | 'end'
}

export const defaults: FootnoteProps = {
  items: ['Company filings, FY2025 annual report', 'Figures rounded to the nearest million'],
  marker: 'number',
  align: 'start',
}
