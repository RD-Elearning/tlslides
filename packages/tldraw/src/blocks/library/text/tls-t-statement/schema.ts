/**
 * Schema and defaults for tls.t.statement — one large sentence as the slide's message.
 */

import type { BlockSchema } from '../../../types'

export const schema: BlockSchema = {
  text: {
    type: { kind: 'richText', maxChars: 140 },
    role: 'content',
    label: 'Statement',
    required: true,
    guidance: 'One claim, a single sentence. Wrap the 1–3 key words in **double asterisks**.',
  },
  attribution: {
    type: { kind: 'text', maxChars: 60 },
    role: 'content',
    label: 'Attribution',
    guidance: 'Optional source line, e.g. "Q3 board review".',
  },
  size: {
    type: { kind: 'enum', values: ['display', 'xl', 'lg', 'md'] },
    role: 'option',
    label: 'Size',
    help: 'Shrinks to fit, never below md.',
  },
  align: {
    type: { kind: 'enum', values: ['start', 'center'] },
    role: 'option',
    label: 'Alignment',
  },
  emphasis: {
    type: { kind: 'enum', values: ['accent', 'underline', 'highlight'] },
    role: 'option',
    label: 'Emphasis',
    help: 'How the **bold** words render: accent colour, accent underline, or accent highlight.',
  },
  showAttribution: {
    type: { kind: 'boolean' },
    role: 'option',
    label: 'Show attribution',
    toggles: 'attribution',
  },
  showMark: {
    type: { kind: 'boolean' },
    role: 'option',
    label: 'Show accent rule',
    toggles: 'mark',
  },
}

export interface StatementProps extends Record<string, unknown> {
  text: string
  attribution?: string
  size?: 'display' | 'xl' | 'lg' | 'md'
  align?: 'start' | 'center'
  emphasis?: 'accent' | 'underline' | 'highlight'
  showAttribution?: boolean
  showMark?: boolean
}

export const defaults: StatementProps = {
  text: 'We win by making the **simplest** option the **default** one.',
  attribution: '',
  size: 'lg',
  align: 'start',
  emphasis: 'accent',
  showAttribution: true,
  showMark: true,
}
