/**
 * Schema and defaults for tls.t.formula — one to four lines of plain-text math, with subscripts
 * and superscripts drawn by the engine (`log_2 N`, `2^{h+1} - 1`).
 */

import type { BlockSchema } from '../../../types'

export const schema: BlockSchema = {
  expression: {
    type: { kind: 'text', maxChars: 200 },
    role: 'content',
    label: 'Expression',
    required: true,
    guidance:
      'Plain characters; `_x` / `^x` raise or lower ONE character, `_{…}` / `^{…}` a group: "h = log_2(N+1)", "n_0 = 2^{h+1} - 1", "O(n^2)". One line per step, separated by a new line (at most 4). Never Unicode sub/superscripts (₂, ²).',
  },
  caption: {
    type: { kind: 'text', maxChars: 160 },
    role: 'content',
    label: 'Caption',
    guidance: 'Optional: what the symbols mean, e.g. "N = number of nodes, h = height".',
  },
  size: {
    type: { kind: 'enum', values: ['display', 'title', 'heading'] },
    role: 'option',
    label: 'Size',
    help: 'The largest size that fits is used, down to heading.',
  },
  align: {
    type: { kind: 'enum', values: ['center', 'start'] },
    role: 'option',
    label: 'Align',
  },
  showCaption: { type: { kind: 'boolean' }, role: 'option', label: 'Show caption', toggles: 'caption' },
}

export interface FormulaProps extends Record<string, unknown> {
  expression: string
  caption?: string
  size?: 'display' | 'title' | 'heading'
  align?: 'center' | 'start'
  showCaption?: boolean
}

export const defaults: FormulaProps = {
  expression: 'h = log_2(N + 1) - 1',
  caption: 'Height of a complete binary tree with N nodes',
  size: 'title',
  align: 'center',
  showCaption: true,
}
