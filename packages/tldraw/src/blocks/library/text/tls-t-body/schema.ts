/**
 * Schema and defaults for tls.t.body — body copy paragraph.
 *
 * Renders paragraph text with RichText support and autofit.
 * Typically used for slide body copy, descriptions, and prose.
 */

import type { BlockSchema } from '../../../types'

export const schema: BlockSchema = {
  text: {
    type: { kind: 'richText' },
    role: 'content',
    label: 'Body text',
    help: 'Paragraph body text. Supports inline bold and italic.',
    required: true,
    guidance: 'A concise paragraph, 1–3 sentences. Use bold for key terms.',
  },
  columns: {
    type: { kind: 'number', min: 1, max: 4 },
    role: 'option',
    label: 'Columns',
    help: 'Number of text columns. 1 = single paragraph.',
  },
  align: {
    type: { kind: 'enum', values: ['start', 'center', 'end'] },
    role: 'option',
    label: 'Alignment',
    help: 'Text alignment.',
  },
  autoFit: {
    type: { kind: 'boolean' },
    role: 'option',
    label: 'Auto-fit',
    help: 'Shrink font when content overflows the box.',
  },
  color: {
    type: { kind: 'color' },
    role: 'option',
    label: 'Color',
    help: 'Override the default text color role.',
  },
}

export interface BodyProps extends Record<string, unknown> {
  text: string | { runs: Array<{ text: string; bold?: boolean; italic?: boolean; color?: string; size?: number }> }
  columns?: number
  align?: string
  autoFit?: boolean
  color?: string
}

export const defaults: BodyProps = {
  text: {
    runs: [
      { text: 'Design systems scale because every ' },
      { text: 'decision', bold: true },
      { text: ' is made once and reused everywhere. This approach keeps teams aligned while reducing drift.' },
    ],
  },
  columns: 1,
  align: 'start',
  autoFit: false,
}
