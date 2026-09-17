/**
 * Schema and defaults for tls.t.kicker — kicker / eyebrow label.
 *
 * Small label above the title (e.g. "OVERVIEW", "Q3 RESULTS"). Supports
 * text case transformation, letter spacing, and an optional leading marker.
 */

import type { BlockSchema } from '../../../types'

export const schema: BlockSchema = {
  text: {
    type: { kind: 'text', maxChars: 60 },
    role: 'content',
    label: 'Kicker',
    help: 'A short label above the title. 1–4 words.',
    required: true,
    guidance: 'A short label: section name, category, or status. UPPERCASE by default. 1–4 words.',
  },
  case: {
    type: { kind: 'enum', values: ['uppercase', 'lowercase', 'capitalize', 'none'] },
    role: 'option',
    label: 'Text case',
    help: 'Text transformation. Defaults to uppercase.',
  },
  tracking: {
    type: { kind: 'enum', values: ['wide', 'normal', 'narrow'] },
    role: 'option',
    label: 'Letter spacing',
    help: 'Letter spacing for the kicker text.',
  },
  marker: {
    type: { kind: 'boolean' },
    role: 'option',
    label: 'Show marker',
    help: 'Show a small accent dot before the text.',
  },
}

export interface KickerProps extends Record<string, unknown> {
  text: string
  case?: string
  tracking?: string
  marker?: boolean
}

export const defaults: KickerProps = {
  text: 'OVERVIEW',
  case: 'uppercase',
  tracking: 'wide',
  marker: false,
}
