/**
 * Schema and defaults for tls.c.steps — process/timeline of steps.
 *
 * A process or timeline of steps, each with a marker (number/dot/icon),
 * a title and a description. Supports horizontal and vertical orientation.
 */

import type { BlockSchema } from '../../../types'

export interface StepItem {
  title: string
  desc?: string
}

export interface StepsProps extends Record<string, unknown> {
  steps: StepItem[]
  orientation?: 'horizontal' | 'vertical'
}

export const schema: BlockSchema = {
  steps: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          title: {
            type: { kind: 'text', maxChars: 60 },
            required: true,
            role: 'content',
            label: 'Step title',
          },
          desc: {
            type: { kind: 'text', maxChars: 200 },
            role: 'content',
            label: 'Step description',
          },
        },
      },
      min: 1,
      max: 12,
    },
    role: 'content',
    label: 'Steps',
    help: 'Process steps. Each step has a title and optional description.',
    required: true,
    guidance: '2–6 steps, each 2–8 words in the title. Description is optional, 1–2 sentences.',
  },
  orientation: {
    type: { kind: 'enum', values: ['horizontal', 'vertical'] },
    role: 'option',
    label: 'Orientation',
    help: 'Layout direction: horizontal (left to right) or vertical (top to bottom).',
  },
}

export const defaults: StepsProps = {
  steps: [
    { title: 'Plan', desc: 'Define scope and requirements' },
    { title: 'Build', desc: 'Implement the solution' },
    { title: 'Ship', desc: 'Deploy to production' },
    { title: 'Measure', desc: 'Track key metrics' },
  ],
  orientation: 'horizontal',
}
