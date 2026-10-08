/**
 * Schema and defaults for tls.t.title — slide title.
 *
 * Accepts RichText (the §2.4 example bolds one word), with autofit for long titles,
 * and maxLines truncation with a visible marker.
 */

import type { BlockSchema } from '../../../types'

export const schema: BlockSchema = {
  text: {
    type: { kind: 'richText' },
    role: 'content',
    label: 'Title',
    help: 'The slide title. Supports inline bold and italic. 1–12 words.',
    required: true,
    guidance: 'A concise slide title. Bold one key word for emphasis. Never a full sentence.',
  },
  size: {
    type: { kind: 'enum', values: ['display', 'title', 'heading', 'subheading'] },
    role: 'option',
    label: 'Size',
    help: 'Type scale step for the title.',
  },
  align: {
    type: { kind: 'enum', values: ['start', 'center', 'end'] },
    role: 'option',
    label: 'Alignment',
    help: 'Text alignment.',
  },
  rule: {
    type: { kind: 'boolean' },
    role: 'option',
    label: 'Decorative rule',
    help: 'Show a short accent rule below the title.',
  },
  maxLines: {
    type: { kind: 'number', min: 1, max: 10 },
    role: 'option',
    label: 'Max lines',
    help: 'Maximum number of lines before truncation. Truncation adds a visible marker.',
  },
  color: {
    type: { kind: 'color' },
    role: 'option',
    label: 'Color',
    help: 'Override the default text color role.',
  },
}

export interface TitleProps extends Record<string, unknown> {
  text: string | { runs: Array<{ text: string; bold?: boolean; italic?: boolean; color?: string; size?: number }> }
  size?: string
  align?: string
  rule?: boolean
  maxLines?: number
  color?: string
}

export const defaults: TitleProps = {
  text: { runs: [{ text: 'Quarterly ' }, { text: 'Results', bold: true }] },
  size: 'title',
  align: 'start',
  rule: false,
}
