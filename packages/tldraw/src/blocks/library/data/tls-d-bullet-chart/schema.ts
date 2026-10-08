/**
 * Schema and defaults for tls.d.bullet-chart — bars against target markers over range bands.
 */

import type { BlockSchema } from '../../../types'
import { enumSlot, formatSlot } from '../_chart/schema-kit'

export const BULLET_MAX_ITEMS = 5

export const schema: BlockSchema = {
  items: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          label: { type: { kind: 'text', maxChars: 30 }, required: true, role: 'content', label: 'Label' },
          value: { type: { kind: 'number' }, required: true, role: 'content', label: 'Actual' },
          target: { type: { kind: 'number' }, required: true, role: 'content', label: 'Target' },
          max: { type: { kind: 'number' }, role: 'content', label: 'Scale max', help: 'Default: from the data.' },
        },
      },
      min: 1,
      max: BULLET_MAX_ITEMS,
    },
    role: 'content',
    label: 'KPIs',
    required: true,
    guidance: 'Each KPI: actual value, its target, optional scale maximum.',
  },
  bands: enumSlot(['three', 'none'], 'Range bands', 'three = poor / ok / good shading.'),
  format: formatSlot(),
}

export interface BulletItem {
  label: string
  value: number
  target: number
  max?: number
}

export interface BulletChartProps extends Record<string, unknown> {
  items: BulletItem[]
  bands?: 'three' | 'none'
  format?: 'plain' | 'compact' | 'percent' | 'currency'
}

export const defaults: BulletChartProps = {
  items: [
    { label: 'Revenue', value: 270, target: 300, max: 400 },
    { label: 'Profit', value: 22, target: 20, max: 30 },
    { label: 'New customers', value: 1200, target: 1500, max: 2000 },
  ],
  bands: 'three',
}
