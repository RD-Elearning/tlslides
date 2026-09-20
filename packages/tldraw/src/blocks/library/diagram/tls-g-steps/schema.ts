/**
 * Schema and defaults for tls.g.steps — numbered process diagram.
 *
 * Phase 6.1: One exemplar for diagram family.
 */

import type { BlockSchema } from '../../../types'

export const schema: BlockSchema = {
  steps: {
    type: { kind: 'object' },
    role: 'content',
    label: 'Steps',
    help: 'Array of step objects with title and description.',
  },
  direction: {
    type: { kind: 'enum', values: ['horizontal', 'vertical'] },
    role: 'option',
    label: 'Direction',
    help: 'Layout direction for steps.',
  },
  connector: {
    type: { kind: 'enum', values: ['line', 'arrow', 'none'] },
    role: 'option',
    label: 'Connector',
    help: 'Type of connector between steps.',
  },
}

export interface Step {
  title: string
  description?: string
  icon?: string
}

export interface StepsProps extends Record<string, unknown> {
  steps?: Step[]
  direction?: 'horizontal' | 'vertical'
  connector?: 'line' | 'arrow' | 'none'
}

export const defaults: StepsProps = {
  steps: [],
  direction: 'horizontal',
  connector: 'line',
}