/**
 * Schema and defaults for tls.d.pie — shares of a whole as slices.
 */

import type { BlockSchema } from '../../../types'
import { boolSlot, categoriesSlot, enumSlot, highlightSlot, numberSlot } from '../_chart/schema-kit'

export const PIE_MAX_SLICES = 6

export const schema: BlockSchema = {
  categories: categoriesSlot(2, PIE_MAX_SLICES, 'One name per slice.'),
  values: {
    type: { kind: 'list', of: { kind: 'number' }, min: 2, max: PIE_MAX_SLICES },
    role: 'content',
    label: 'Values',
    required: true,
    help: 'One non-negative number per category.',
  },
  labels: enumSlot(['outside', 'inside', 'legend'], 'Labels'),
  showPercent: boolSlot('Show percent'),
  sort: enumSlot(['desc', 'none'], 'Sort', 'desc = largest slice first.'),
  highlightIndex: highlightSlot('Slice'),
  startAngle: numberSlot('Start angle', 'Degrees clockwise from 12 o\'clock.'),
}

export interface PieProps extends Record<string, unknown> {
  categories: string[]
  values: number[]
  labels?: 'outside' | 'inside' | 'legend'
  showPercent?: boolean
  sort?: 'desc' | 'none'
  highlightIndex?: number
  startAngle?: number
}

export const defaults: PieProps = {
  categories: ['Subscriptions', 'Services', 'Licences', 'Other'],
  values: [48, 27, 17, 8],
  labels: 'outside',
  showPercent: true,
  sort: 'desc',
}
