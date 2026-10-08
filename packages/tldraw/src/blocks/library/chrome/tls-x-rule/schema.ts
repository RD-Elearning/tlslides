/**
 * Schema and defaults for tls.x.rule — a divider line, plain or accent gradient.
 */

import type { BlockSchema } from '../../../types'

export const schema: BlockSchema = {
  axis: { type: { kind: 'enum', values: ['horizontal', 'vertical'] }, role: 'option', label: 'Direction' },
  weight: {
    type: { kind: 'enum', values: ['hairline', 'md', 'bold'] },
    role: 'option',
    label: 'Thickness',
    help: 'hairline 2, md 4, bold 8 slide units.',
  },
  tone: {
    type: { kind: 'enum', values: ['line', 'accent', 'gradient'] },
    role: 'option',
    label: 'Colour',
    help: 'gradient runs from accent to accent2.',
  },
  length: {
    type: { kind: 'enum', values: ['full', 'short'] },
    role: 'option',
    label: 'Length',
    help: 'short is a 64 px bar at the start, e.g. under a heading.',
  },
}

export interface RuleProps extends Record<string, unknown> {
  axis?: 'horizontal' | 'vertical'
  weight?: 'hairline' | 'md' | 'bold'
  tone?: 'line' | 'accent' | 'gradient'
  length?: 'full' | 'short'
}

export const defaults: RuleProps = {
  axis: 'horizontal',
  weight: 'hairline',
  tone: 'line',
  length: 'full',
}
