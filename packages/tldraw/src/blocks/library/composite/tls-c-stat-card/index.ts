/**
 * tls.c.stat-card — a KPI tile built with `defineCompositeBlock`.
 *
 * A card containing an icon, a hero number, and a caption. All geometry is
 * delegated to existing blocks (`tls.l.card` → `tls.l.stack` → child specs);
 * no hand-written layout math.
 *
 * This block exists to prove the `defineCompositeBlock()` path end-to-end (B5).
 */

import type { BlockSpec, BlockSchema } from '../../../types'
import { isShown } from '../../../schema-helpers'
import { defineCompositeBlock } from '../../../layout/define-composite'

export interface StatCardProps extends Record<string, unknown> {
  /** Icon name from the icon set. */
  icon?: string
  /** Whether to show the icon. */
  showIcon?: boolean
  /** Headline value, e.g. "$4.2M" or "67%". */
  value: string
  /** Unit label beneath the value. */
  unit?: string
  /** Short context line below the unit. */
  caption?: string
  /** Number format hint. */
  format?: 'plain' | 'compact' | 'percent' | 'currency'
  /** Colour emphasis for the headline number. */
  emphasis?: 'default' | 'accent' | 'muted'
  /** Card padding. */
  padding?: string
}

export const schema: BlockSchema = {
  icon: {
    type: { kind: 'icon' },
    role: 'content',
    label: 'Icon',
    help: 'Icon name from the set (zap, shield, globe, …).',
  },
  showIcon: {
    type: { kind: 'boolean' },
    role: 'option',
    label: 'Show Icon',
    help: 'Toggle the icon on/off.',
    toggles: 'icon',
  },
  value: {
    type: { kind: 'text' },
    role: 'content',
    label: 'Value',
    required: true,
    guidance: 'The headline number. Include formatting, e.g. "$4.2M", "67%".',
  },
  unit: {
    type: { kind: 'text' },
    role: 'content',
    label: 'Unit',
    guidance: 'Unit label, 1–4 words. e.g. "Annual Revenue".',
  },
  caption: {
    type: { kind: 'text' },
    role: 'content',
    label: 'Caption',
    guidance: 'Short context, 1 line max. e.g. "FY2024 total".',
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
  padding: {
    type: { kind: 'enum', values: ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl'] },
    role: 'option',
    label: 'Padding',
    help: 'Inner padding of the card.',
  },
}

export const defaults: StatCardProps = {
  icon: 'zap',
  value: '$4.2M',
  unit: 'Annual Revenue',
  caption: 'FY2024 total',
  format: 'plain',
  emphasis: 'accent',
  padding: 'md',
}

/**
 * Build the spec tree for a stat-card. The outer `tls.l.card` provides the filled
 * background; the inner `tls.l.stack` arranges the children vertically.
 *
 * When `showIcon` is false (or icon is absent), the icon child is omitted —
 * the stack reflows automatically.
 */
function buildStatCard(props: StatCardProps): BlockSpec {
  const children: BlockSpec[] = []

  // Icon (optional)
  if (isShown(props, 'showIcon') && props.icon) {
    children.push({
      id: 'icon',
      type: 'tls.m.icon',
      props: {
        icon: props.icon,
        color: 'accent',
      },
    })
  }

  // Hero number (value + unit + caption + format)
  const heroProps: Record<string, unknown> = {
    value: props.value,
    format: props.format ?? 'plain',
    emphasis: props.emphasis ?? 'default',
  }
  if (props.unit) heroProps.unit = props.unit
  if (props.caption) heroProps.caption = props.caption

  children.push({
    id: 'value',
    type: 'tls.t.hero-number',
    props: heroProps,
  })

  return {
    id: 'stat-card',
    type: 'tls.l.card',
    props: {
      padding: props.padding ?? 'md',
      children,
      sizing: 'content',
    },
  }
}

export const tlsCStatCard = defineCompositeBlock({
  type: 'tls.c.stat-card',
  name: 'Stat Card',
  family: 'composite',
  tier: 'A',
  summary: 'KPI on a card: icon, value, unit, and caption. Built with defineCompositeBlock.',
  keywords: ['stat', 'card', 'kpi', 'metric', 'number', 'composite'],
  schema,
  defaults,
  size: { preferred: [320, 200], min: [160, 120] },
  describe: {
    when:
      'Use when you need a single KPI inside a filled card — icon, headline value, unit, and a caption line. ' +
      'Built compositionally from tls.l.card, tls.l.stack, tls.m.icon, and tls.t.hero-number.',
    avoid:
      'Do not use for multiple metrics side by side — use tls.c.kpi-row instead. ' +
      'Do not use when you need custom geometry or a chart — write a hand-written layout().',
    example: {
      id: 'b_stat_card',
      type: 'tls.c.stat-card',
      props: {
        icon: 'zap',
        value: '$4.2M',
        unit: 'Annual Revenue',
        caption: 'FY2024 total',
        format: 'plain',
        emphasis: 'accent',
        padding: 'md',
      },
    },
  },
  motion: {
    parts: ['root'],
    preset: 'stagger',
  },
  build: buildStatCard,
})
