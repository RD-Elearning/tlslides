/**
 * Schema and defaults for tls.c.kpi-tile — a KPI tile with value, delta, label,
 * optional sparkline, and polarity-driven colour.
 *
 * Replaces tls.t.hero-number for KPI contexts. The delta colour is driven by
 * a `polarity` prop: 'upGood' means up is positive, 'downGood' means up is
 * negative (e.g. churn, cost).
 */

import type { BlockSchema } from '../../../types'

export interface KpiTileProps extends Record<string, unknown> {
  /** The headline number. */
  value: number
  /** Optional change indicator (e.g. +12, -5). */
  delta?: number
  /** Short label for the metric, 1–3 words. */
  label: string
  /** Optional sparkline data — an array of numbers for a mini line chart. */
  sparkline?: number[]
  /** Polarity: which direction is "good". 'upGood' = higher is better (default).
   *  'downGood' = lower is better (e.g. churn, cost, latency). */
  polarity?: 'upGood' | 'downGood'
  /** Number format hint for display. */
  format?: 'plain' | 'compact' | 'percent' | 'currency'
}

export const schema: BlockSchema = {
  value: {
    type: { kind: 'number', min: -1e12, max: 1e12 },
    role: 'content',
    label: 'Value',
    required: true,
    guidance: 'The headline metric number. Use a plain number; formatting is applied by the block.',
  },
  delta: {
    type: { kind: 'number' },
    role: 'content',
    label: 'Delta',
    guidance: 'Change indicator. Positive = improved, negative = declined (relative to polarity).',
  },
  label: {
    type: { kind: 'text', maxChars: 30 },
    role: 'content',
    label: 'Label',
    guidance: 'Metric name. 1–3 words, never a sentence.',
  },
  sparkline: {
    type: {
      kind: 'list',
      of: { kind: 'number' },
      min: 2,
      max: 20,
    },
    role: 'content',
    label: 'Sparkline data',
    guidance: '2–20 numbers for a mini trend line. Omit for a single-point metric.',
  },
  polarity: {
    type: { kind: 'enum', values: ['upGood', 'downGood'] },
    role: 'option',
    label: 'Polarity',
    help: 'Which direction is "good". upGood = higher is better (revenue). downGood = lower is better (churn).',
  },
  format: {
    type: { kind: 'enum', values: ['plain', 'compact', 'percent', 'currency'] },
    role: 'option',
    label: 'Format',
    help: 'Number formatting hint.',
  },
}

export const defaults: KpiTileProps = {
  value: 4200000,
  delta: 12.5,
  label: 'Revenue',
  polarity: 'upGood',
  format: 'compact',
}
