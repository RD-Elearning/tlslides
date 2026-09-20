/**
 * Schema and defaults for tls.v.counter — animated numeric counter.
 *
 * Phase 7: Live family exemplar (Tier B - interactive).
 */

import type { BlockSchema } from '../../../types'

export const schema: BlockSchema = {
  from: {
    type: { kind: 'number', min: 0 },
    role: 'option',
    label: 'From',
    help: 'Starting value.',
  },
  to: {
    type: { kind: 'number', min: 0 },
    role: 'option',
    label: 'To',
    help: 'Ending value.',
  },
  duration: {
    type: { kind: 'number', min: 0.1, max: 30 },
    role: 'option',
    label: 'Duration',
    help: 'Animation duration in seconds.',
  },
}

export interface CounterProps extends Record<string, unknown> {
  from: number
  to: number
  duration: number
}

export const defaults: CounterProps = {
  from: 0,
  to: 100,
  duration: 2,
}