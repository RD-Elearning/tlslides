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
  /** AC2: `plain` (default), `accent` (accent number under a short accent rule) or `split`
   *  (number left, label and context beside it). */
  variant?: 'plain' | 'accent' | 'split'
  /** AC2: `start` (default) or `center` (stacked variants). */
  align?: 'start' | 'center'
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
    guidance: 'The headline number.',
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
  variant: {
    type: { kind: 'enum', values: ['plain', 'accent', 'split'] },
    role: 'option',
    label: 'Variant',
    guidance: '`accent`: accent number under a rule; `split`: label beside the number.',
  },
  align: {
    type: { kind: 'enum', values: ['start', 'center'] },
    role: 'option',
    label: 'Align',
    guidance: '`center` for a stat alone on the slide.',
  },
}

/** AC2 `variant: accent`: the rule above the number (template and poster). */
export const BIG_STAT_RULE = { width: 96, height: 8, gap: 24 } as const
/**
 * AC2 (lead review) — the large tier. A big-stat with the room for it grows its number with the
 * box: the largest size (at most `maxGain`× the display token and `maxSize`) whose stack fits the
 * box height and whose number fits the width, with the label at `lead` and the context at `body`. Below
 * `minGain`× display the block keeps the compact tier (display / body / caption), unchanged.
 * Fixed point: laid out again at its own content height the block picks the same size (the stack
 * is linear in the size and the compiler rounds heights up).
 */
export const BIG_STAT_LARGE = { minGain: 1.25, maxGain: 2.25, maxSize: 320, valueGap: 24, fitW: 0.95 } as const

/** The large-tier number size for a stack of `fixedH` + `size × perSize` in `boxH` and a number
 *  `width0` wide at `size0` in `boxW`; `null` when the box only holds the compact tier. */
export function largeValueSize(size0: number, boxH: number, fixedH: number, perSize: number, boxW: number, width0: number): number | null {
  const byH = (boxH - fixedH) / perSize
  const byW = width0 > 0 ? (size0 * boxW * BIG_STAT_LARGE.fitW) / width0 : Infinity
  const s = Math.floor(Math.min(size0 * BIG_STAT_LARGE.maxGain, BIG_STAT_LARGE.maxSize, byH, byW) + 1e-6)
  return s >= size0 * BIG_STAT_LARGE.minGain ? s : null
}

/** True when a value painted at `valueSize` is the large tier (template side: read off the poster). */
export function isLargeTier(valueSize: number | undefined, displaySize: number): boolean {
  return valueSize !== undefined && valueSize >= displaySize * BIG_STAT_LARGE.minGain - 0.5
}

/** AC2 `variant: split`: the number's share of the width (at most), the gap, the narrowest column. */
const SPLIT = { share: 0.55, gap: 48, minCol: 220 } as const

/**
 * AC2 `variant: split` geometry, shared by template and poster: the number right-aligned in the
 * left half (wider when the number needs it, shrunk to fit `share` of the width), then the
 * label/context column from the centre line, so the pair sits across the middle of the box. `null`
 * when the box is too narrow for the column: the block then stacks as `plain`.
 */
export function splitGeometry(
  width: number,
  valueText: string,
  display: { size: number },
  tracking: number,
  measure: (text: string, style: { size: number; letterSpacing: number }) => number
): { valueW: number; valueSize: number; colX: number; colW: number; gap: number } | null {
  const rw = measure(valueText, { size: display.size, letterSpacing: tracking }) * 1.04 + 4
  const max = width * SPLIT.share
  const valueSize = rw > max ? (display.size * max) / rw : display.size
  const valueW = Math.ceil(Math.max(Math.min(rw, max), (width - SPLIT.gap) / 2))
  const colX = valueW + SPLIT.gap
  const colW = width - colX
  return colW >= SPLIT.minCol ? { valueW, valueSize, colX, colW, gap: SPLIT.gap } : null
}

export const defaults: BigStatProps = {
  value: 4200000,
  label: 'Total Revenue',
  context: 'vs last quarter',
  format: 'compact',
  prefix: '$',
  suffix: '',
}
