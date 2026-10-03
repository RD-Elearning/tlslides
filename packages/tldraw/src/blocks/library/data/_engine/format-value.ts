/**
 * The single numeric formatter for data blocks and KPI tiles.
 *
 * Moved verbatim from `tls.c.kpi-tile` (P0.6) so there is one implementation; kpi-tile now
 * imports it. Pure: no `Intl` options that vary by host beyond `en-US`.
 */

export type ValueFormat = 'plain' | 'compact' | 'percent' | 'currency'

export interface FormatOptions {
  /** Currency symbol for `currency`. Default `$`. */
  currency?: string
}

export function formatValue(value: number, format?: ValueFormat | string, opts: FormatOptions = {}): string {
  switch (format) {
    case 'compact': {
      if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(1)}B`
      if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)}M`
      if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(1)}K`
      return value.toFixed(1)
    }
    case 'percent':
      return `${value.toFixed(1)}%`
    case 'currency':
      return `${opts.currency ?? '$'}${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    default:
      return String(value)
  }
}
