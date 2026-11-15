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
const NBSP = '\u00a0'

/** Number format of a deck language (S01 §2.4). A language missing here keeps the English format. */
interface NumberFormat {
  decimal: string
  group: string
  /** compact scales as words; absent = the English letters ("4,2M") */
  scales?: Record<string, string>
}

const FORMATS: Record<string, NumberFormat> = {
  vi: { decimal: ',', group: '.', scales: VI_SCALE },
  fr: { decimal: ',', group: NBSP },
  pl: { decimal: ',', group: NBSP },
  de: { decimal: ',', group: '.' },
  es: { decimal: ',', group: '.' },
  pt: { decimal: ',', group: '.' },
  it: { decimal: ',', group: '.' },
  nl: { decimal: ',', group: '.' },
  tr: { decimal: ',', group: '.' },
  id: { decimal: ',', group: '.' },
}

/**
 * An English-formatted number text in the deck's language: the language's decimal and thousands
 * separators (vi/de/es/pt/it/nl/tr/id: "1,240.5" → "1.240,5"; fr/pl: "1 240,5" with a no-break
 * space), and in Vietnamese the compact scales as words ("4.2M" → "4,2 triệu", "620B" → "620 tỷ").
 * English, Malay and unknown languages are left as they are. Other text in the string is left
 * alone. Pure.
 */
export function localizeNumber(text: string, locale?: string): string {
  const f = FORMATS[(locale ?? '').toLowerCase().split(/[-_]/)[0]]
  if (!f) return text
  return text.replace(/(\d+(?:,\d{3})*(?:\.\d+)?)([KMB](?![A-Za-z]))?/g, (_m, num: string, scale?: string) => {
    const [int, frac] = num.split('.')
    const swapped = int.replace(/,/g, f.group) + (frac !== undefined ? `${f.decimal}${frac}` : '')
    return swapped + (scale ? (f.scales?.[scale] ?? scale) : '')
  })
}

/**
 * `value` is a number, or the author's text. A text that carries its own separator, sign or unit
 * ("1.200", "2,70", "−8%", "3 lần") is drawn as written — it is already in the deck's language, and
 * reading it as English turns the Vietnamese "1.200" (one thousand two hundred) into "1,200"
 * (spro sprint 2026-11c c0, the same rule as the table's T28 fix). Bare digits are a number.
 */
export function formatValue(value: number | string, format?: ValueFormat | string, opts: FormatOptions = {}): string {
  if (typeof value === 'string') {
    const t = value.trim()
    if (!/^\d+$/.test(t)) return value
    value = Number(t)
  }
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
      // ".0" dropped as in compact: a document's "38%" stays 38%, not an invented "38.0%" (c0, clinic s3)
      return `${value.toFixed(1).replace(/\.0$/, '')}%`
    case 'currency':
      return `${opts.currency ?? '$'}${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    default:
      return plainNumber(value)
  }
}

/**
 * A plain number in English form with its thousands grouped ("1380" → "1,380", then `localizeNumber` makes it the
 * deck's "1.380"). A four-digit whole number that reads as a year (1800–2199) stays as it is, so "2027" is not drawn
 * "2,027". spro c10 (2026-11-15): coffee s04 "1380 tấn" and solar s07 "5500 °C" lost the Vietnamese thousands dot the
 * documents wrote (1.380, 5.500).
 */
export function plainNumber(value: number): string {
  const text = String(Number(value.toFixed(10)))
  const abs = Math.abs(value)
  if (abs < 1000 || !Number.isFinite(value) || /e/i.test(text)) return text
  if (abs < 10000 && Number.isInteger(value) && abs >= 1800 && abs < 2200) return text
  const [int, frac] = text.split('.')
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (frac !== undefined ? `.${frac}` : '')
}
