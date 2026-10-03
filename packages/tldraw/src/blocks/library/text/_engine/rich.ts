/**
 * Small pure helpers shared by the P1 text/list blocks: inline `**strong**` parsing,
 * number-to-label conversion (roman, alpha) and the spacing scale.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { LayoutContext, RichText } from '../../../types'

/** One inline segment of a `richText` slot after `**strong**` parsing. */
export interface Segment {
  text: string
  strong: boolean
}

/**
 * Split a `richText` slot value on `**strong**` markers. Unbalanced markers stay literal, so
 * hostile or half-typed input never throws and never loses characters.
 */
export function parseStrong(input: unknown): Segment[] {
  // A RichText object ({ runs }) is accepted too: bold runs count as strong.
  if (input && typeof input === 'object' && Array.isArray((input as RichText).runs)) {
    const runs = (input as RichText).runs
      .filter((r) => r && typeof r.text === 'string')
      .map((r) => ({ text: r.text, strong: !!r.bold }))
    return runs.length > 0 ? runs : [{ text: '', strong: false }]
  }
  const text = typeof input === 'string' ? input : input == null ? '' : String(input)
  const out: Segment[] = []
  const re = /\*\*([^*]+?)\*\*/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), strong: false })
    out.push({ text: m[1], strong: true })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push({ text: text.slice(last), strong: false })
  return out.length > 0 ? out : [{ text: '', strong: false }]
}

/** The visible characters of a `richText` value (markers removed). */
export function plainOf(input: unknown): string {
  return parseStrong(input)
    .map((s) => s.text)
    .join('')
}

/** True when the value contains at least one balanced `**strong**` run. */
export function hasStrong(input: unknown): boolean {
  return parseStrong(input).some((s) => s.strong)
}

/**
 * Convert a `richText` value into measurable text: a plain string when it has no strong runs,
 * otherwise a `RichText` whose strong runs are bold (and coloured when `strongColor` is set).
 */
export function toMeasurable(input: unknown, strongColor?: string): string | RichText {
  const segs = parseStrong(input)
  if (!segs.some((s) => s.strong)) return segs.map((s) => s.text).join('')
  return {
    runs: segs.map((s) =>
      s.strong ? { text: s.text, bold: true, ...(strongColor ? { color: strongColor } : {}) } : { text: s.text }
    ),
  }
}

/** 1 -> "I", 4 -> "IV". Out-of-range input falls back to the decimal string. */
export function toRoman(n: number): string {
  const v = Math.floor(n)
  if (!Number.isFinite(v) || v < 1 || v > 3999) return String(v)
  const table: Array<[number, string]> = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ]
  let rest = v
  let out = ''
  for (const [value, glyph] of table) {
    while (rest >= value) {
      out += glyph
      rest -= value
    }
  }
  return out
}

/** 1 -> "A", 26 -> "Z", 27 -> "AA" (bijective base 26). */
export function toAlpha(n: number): string {
  let v = Math.floor(n)
  if (!Number.isFinite(v) || v < 1) return String(v)
  let out = ''
  while (v > 0) {
    const r = (v - 1) % 26
    out = String.fromCharCode(65 + r) + out
    v = Math.floor((v - 1) / 26)
  }
  return out
}

export type Spacing = 'default' | 'compact' | 'roomy'

/** Vertical gap between list items for the `spacing` option shared by the P1 list blocks. */
export function spacingGap(ctx: LayoutContext, spacing: unknown): number {
  const s = ctx.tokens.space
  switch (spacing) {
    case 'compact':
      return s['2xs']
    case 'roomy':
      return s.md
    default:
      return s.sm
  }
}

/** Coerce a possibly-missing array prop to an array. */
export function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : []
}

/** Coerce a prop to a string, tolerating numbers and nullish input. */
export function str(v: unknown): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v)
}
