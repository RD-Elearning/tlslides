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
  /** Deck language (`ResolvedTokens.locale`); see `localizeNumber`. */
  locale?: string
}

const VI_SCALE: Record<string, string> = { K: ' nghìn', M: ' triệu', B: ' tỷ' }

/**
 * An English-formatted number text in the deck's language. Only `vi` differs today: decimal comma,
 * dot thousands, and compact scales as words ("4.2M" → "4,2 triệu", "620B" → "620 tỷ",
 * "1,240.5" → "1.240,5", "12.4%" → "12,4%"). Other text in the string is left alone. Pure.
 */
export function localizeNumber(text: string, locale?: string): string {
  if (!locale || !/^vi\b/i.test(locale)) return text
  return text.replace(/(\d+(?:,\d{3})*(?:\.\d+)?)([KMB](?![A-Za-z]))?/g, (_m, num: string, scale?: string) => {
    const [int, frac] = num.split('.')
    const swapped = int.replace(/,/g, '.') + (frac !== undefined ? `,${frac}` : '')
    return swapped + (scale ? VI_SCALE[scale] : '')
  })
}

export function formatValue(value: number, format?: ValueFormat | string, opts: FormatOptions = {}): string {
  return localizeNumber(formatValueEn(value, format, opts), opts.locale)
}

function formatValueEn(value: number, format: ValueFormat | string | undefined, opts: FormatOptions): string {
  switch (format) {
    case 'compact': {
      // ".0" dropped like the big stat and the chart axes do ("620B", not "620.0B")
      const t = (x: number) => x.toFixed(1).replace(/\.0$/, '')
      if (Math.abs(value) >= 1e9) return `${t(value / 1e9)}B`
      if (Math.abs(value) >= 1e6) return `${t(value / 1e6)}M`
      if (Math.abs(value) >= 1e3) return `${t(value / 1e3)}K`
      return t(value)
    }
    case 'percent':
      return `${value.toFixed(1)}%`
    case 'currency':
      return `${opts.currency ?? '$'}${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    default:
      return String(value)
  }
}
