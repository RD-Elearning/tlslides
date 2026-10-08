/**
 * Schema and defaults for tls.g.steps — numbered process diagram.
 *
 * Phase 6.1: One exemplar for diagram family.
 */

import type { BlockSchema } from '../../../types'

export const STEPS_MAX = 8

export const schema: BlockSchema = {
  steps: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          title: { type: { kind: 'text', maxChars: 40 }, required: true, role: 'content', label: 'Title', guidance: '1-3 words naming the step.' },
          description: { type: { kind: 'text', maxChars: 120 }, role: 'content', label: 'Description', guidance: 'One short line; optional.' },
        },
      },
      min: 2,
      max: STEPS_MAX,
    },
    role: 'content',
    label: 'Steps',
    required: true,
    guidance: 'Steps in order. Numbered 1..n automatically.',
  },
  direction: {
    type: { kind: 'enum', values: ['horizontal', 'vertical'] },
    role: 'option',
    label: 'Direction',
    help: 'Row (wraps when narrow) or column.',
  },
  connector: {
    type: { kind: 'enum', values: ['line', 'arrow', 'none'] },
    role: 'option',
    label: 'Connector',
    help: 'Between badges.',
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
  steps: [
    { title: 'Brief', description: 'Agree the goal' },
    { title: 'Draft', description: 'Build the first version' },
    { title: 'Review', description: 'Collect feedback' },
  ],
  direction: 'horizontal',
  connector: 'line',
}