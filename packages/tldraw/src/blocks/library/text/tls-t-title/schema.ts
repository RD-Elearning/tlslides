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
    // CS2 (content-stress README §2): measured capacity, not a word count — a content slide holds one
    // line at title size (p10 41 characters over 596 designs); "1–12 words" broke 377 of 618 designs.
    help: 'The slide title. Supports inline bold and italic. Count characters, not words: at most 40 on content, data, process, comparison and closing slides (one line at title size), at most 60 on a cover or section.',
    required: true,
    guidance: 'One line: at most 40 characters (60 on a cover or section). Bold one key word. Never a full sentence.',
  },
  size: {
    type: { kind: 'enum', values: ['display', 'title', 'heading', 'subheading', 'fit'] },
    role: 'option',
    label: 'Size',
    help: 'Type scale step for the title. `fit`: the largest of display/title/heading that wraps cleanly (≤ 3 lines, no one-word line).',
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
