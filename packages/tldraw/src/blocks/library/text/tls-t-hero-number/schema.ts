/**
 * Schema and defaults for tls.t.hero-number — large KPI number.
 */

import type { BlockSchema } from '../../../types'

export interface HeroNumberProps extends Record<string, unknown> {
  /** The headline number, e.g. "$4.2M" or "67%". */
  value: string
  /** Unit label beneath the value, e.g. "Annual Revenue". */
  unit: string
  /** Short context line below the unit, e.g. "FY2024 total". */
  caption: string
  /** Number format hint for the renderer. */
  format: 'plain' | 'compact' | 'percent' | 'currency'
  /** Colour emphasis for the headline number. */
  emphasis: 'default' | 'accent' | 'muted'
}

export const schema: BlockSchema = {
  value: {
    type: { kind: 'text' },
    role: 'content',
    label: 'Value',
    guidance: 'The headline number. Include formatting, e.g. "$4.2M", "67%", "1,234".',
  },
  unit: {
    type: { kind: 'text' },
    role: 'content',
    label: 'Unit',
    guidance: 'Unit label, 1–4 words. e.g. "Annual Revenue", "Completion Rate".',
  },
  caption: {
    type: { kind: 'text' },
    role: 'content',
    label: 'Caption',
    guidance: 'Short context, 1 line max. e.g. "FY2024 total", "vs. last quarter".',
  },
  format: {
    type: { kind: 'enum', values: ['plain', 'compact', 'percent', 'currency'] },
    role: 'option',
    label: 'Format',
    help: 'Number format hint for the renderer.',
  },
  emphasis: {
    type: { kind: 'enum', values: ['default', 'accent', 'muted'] },
    role: 'option',
    label: 'Emphasis',
    help: 'Colour emphasis for the headline number.',
  },
}

export const defaults: HeroNumberProps = {
  value: '$4.2M',
  unit: 'Annual Revenue',
  caption: 'FY2024 total',
  format: 'plain',
  emphasis: 'default',
}
