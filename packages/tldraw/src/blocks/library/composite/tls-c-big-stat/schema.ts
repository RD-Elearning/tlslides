/**
 * Schema and defaults for tls.c.big-stat — one enormous headline number
 * with a label and a context line.
 *
 * This is a `kind: 'html'` block — the template renders as real DOM, and
 * the poster supplies the geometry for SVG export and thumbnails.
 *
 * The shared `formatValue()` helper is used by BOTH `template.ts` and
 * `poster.ts` so they cannot drift — the "same story" rule.
 */

import type { BlockSchema } from '../../../types'

export interface BigStatProps extends Record<string, unknown> {
  /** The headline number. */
  value: number
  showLabel?: boolean
  /** Short label below the number (1–4 words). */
  label: string
  showContext?: boolean
  /** Optional context line below the label (e.g. "vs last quarter"). */
  context?: string
  /** How to format the number. Default: 'plain'. */
  format?: 'plain' | 'compact' | 'percent' | 'currency'
  /** Optional prefix before the formatted number (e.g. "$", "€"). */
  prefix?: string
  /** Optional suffix after the formatted number (e.g. "%", "M", "B"). */
  suffix?: string
}

/**
 * Shared pure formatter. Used by BOTH template.ts and poster.ts so the
 * rendered number text is always identical — the "same story" rule.
 *
 * This is the single source of truth for how the value appears on screen.
 */
export function formatValue(props: BigStatProps): string {
  const { value, format = 'plain', prefix = '', suffix = '' } = props
  let formatted: string

  switch (format) {
    case 'compact': {
      const abs = Math.abs(value)
      if (abs >= 1_000_000_000) {
        formatted = (value / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B'
      } else if (abs >= 1_000_000) {
        formatted = (value / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
      } else if (abs >= 1_000) {
        formatted = (value / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
      } else {
        formatted = value.toFixed(1).replace(/\.0$/, '')
      }
      break
    }
    case 'percent': {
      const pct = value * 100
      // Use at most 1 decimal place, dropping trailing .0
      formatted = pct.toFixed(1).replace(/\.0$/, '') + '%'
      break
    }
    case 'currency': {
      // Format with thousands separator and 0 decimal places
      formatted = Math.round(value).toLocaleString('en-US')
      break
    }
    case 'plain':
    default: {
      // Default: format with up to 10 significant digits, dropping trailing zeros.
      // Special-case zero so it does not become an empty string.
      const num = Number(value.toFixed(10))
      formatted = num === 0 ? '0' : num.toString().replace(/\.?0+$/, '')
      break
    }
  }

  return prefix + formatted + suffix
}

export const schema: BlockSchema = {
  value: {
    type: { kind: 'number' },
    role: 'content',
    label: 'Value',
    required: true,
    guidance: 'The headline number to display. Any numeric value.',
  },
  label: {
    type: { kind: 'text', maxChars: 40 },
    role: 'content',
    label: 'Label',
    required: true,
    guidance: 'Short label describing the number. 1–4 words, e.g. "Total Revenue".',
  },
  showLabel: {
    type: { kind: 'boolean' },
    role: 'option',
    label: 'Show Label',
    help: 'Toggle the label below the value on/off.',
    toggles: 'label',
  },
  context: {
    type: { kind: 'text', maxChars: 60 },
    role: 'option',
    label: 'Context',
    guidance: 'Optional supporting line below the label (e.g. "vs last quarter").',
  },
  showContext: {
    type: { kind: 'boolean' },
    role: 'option',
    label: 'Show Context',
    help: 'Toggle the context line on/off.',
    toggles: 'context',
  },
  format: {
    type: { kind: 'enum', values: ['plain', 'compact', 'percent', 'currency'] },
    role: 'option',
    label: 'Format',
    guidance: 'Number format: plain (default), compact (1.2K/3.4M), percent (12%), currency (1,234).',
  },
  prefix: {
    type: { kind: 'text', maxChars: 4 },
    role: 'option',
    label: 'Prefix',
    guidance: 'Optional prefix before the number (e.g. "$", "€"). Max 4 chars.',
  },
  suffix: {
    type: { kind: 'text', maxChars: 4 },
    role: 'option',
    label: 'Suffix',
    guidance: 'Optional suffix after the number (e.g. "%", "M"). Max 4 chars.',
  },
}

export const defaults: BigStatProps = {
  value: 4200000,
  label: 'Total Revenue',
  context: 'vs last quarter',
  format: 'compact',
  prefix: '$',
  suffix: '',
}
