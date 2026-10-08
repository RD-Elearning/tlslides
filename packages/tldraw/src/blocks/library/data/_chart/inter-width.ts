/**
 * Real Inter Regular advance widths (em), measured in headless Chromium against the font the app
 * ships (2026-10-06, RV04). The default `estimateMetrics` runs 20-30% off on figures and the
 * `tableMetrics` Inter table is 17% narrow on digits and 35% narrow on "%" ("72%" is 2.16 em,
 * the table says 1.68), so right-aligned values overshot their bars. Kerning is ignored (a sum
 * is within ~3% of the browser, usually slightly wide). Unknown glyphs use `FALLBACK_EM`.
 *
 * Pure and DOM-free.
 */

import type { ResolvedTextStyle } from '../../../types'

export const INTER_EM: Record<string, number> = {
  '0': 0.631, '1': 0.407, '2': 0.61, '3': 0.618, '4': 0.646, '5': 0.593, '6': 0.62, '7': 0.566,
  '8': 0.619, '9': 0.62, ' ': 0.281, '!': 0.288, '"': 0.466, '#': 0.633, '$': 0.642, '%': 0.982,
  '&': 0.644, '\'': 0.3, '(': 0.365, ')': 0.365, '*': 0.501, '+': 0.662, ',': 0.288, '-': 0.46,
  '.': 0.288, '/': 0.36, ':': 0.288, ';': 0.302, '<': 0.662, '=': 0.662, '>': 0.662, '?': 0.511,
  '@': 0.966, 'A': 0.69, 'B': 0.654, 'C': 0.73, 'D': 0.722, 'E': 0.601, 'F': 0.59, 'G': 0.746,
  'H': 0.743, 'I': 0.269, 'J': 0.571, 'K': 0.672, 'L': 0.565, 'M': 0.903, 'N': 0.753, 'O': 0.765,
  'P': 0.639, 'Q': 0.765, 'R': 0.644, 'S': 0.642, 'T': 0.646, 'U': 0.744, 'V': 0.69, 'W': 0.985,
  'X': 0.682, 'Y': 0.679, 'Z': 0.629, '[': 0.365, '\\': 0.36, ']': 0.365, '^': 0.471, '_': 0.456,
  '`': 0.323, 'a': 0.562, 'b': 0.612, 'c': 0.571, 'd': 0.612, 'e': 0.583, 'f': 0.37, 'g': 0.613,
  'h': 0.591, 'i': 0.242, 'j': 0.242, 'k': 0.549, 'l': 0.242, 'm': 0.876, 'n': 0.591, 'o': 0.6,
  'p': 0.612, 'q': 0.612, 'r': 0.376, 's': 0.528, 't': 0.327, 'u': 0.591, 'v': 0.562, 'w': 0.818,
  'x': 0.546, 'y': 0.562, 'z': 0.552, '{': 0.426, '|': 0.333, '}': 0.426, '~': 0.662, '×': 0.662,
  '÷': 0.662, '−': 0.662, '–': 0.5, '—': 1, '…': 0.864, '•': 0.563, '°': 0.456, '±': 0.662,
  '€': 0.667, '£': 0.611, '¥': 0.55, '↑': 0.834, '↓': 0.834, '→': 0.838, '←': 0.838, '✓': 0.838,
  '✗': 0.838, '·': 0.288, '“': 0.44, '”': 0.44, '‘': 0.261, '’': 0.261,
}

const FALLBACK_EM = 0.58

/** Width of one line of `text` as the browser draws it (slide units), from the measured table. */
export function realWidth(text: string, style: Pick<ResolvedTextStyle, 'size' | 'letterSpacing'>): number {
  let em = 0
  let n = 0
  for (const ch of text) {
    // Accented Latin (Vietnamese ...) is as wide as its base letter; the marks are zero-advance.
    em += INTER_EM[ch] ?? INTER_EM[ch.normalize('NFD')[0]] ?? FALLBACK_EM
    n++
  }
  return (em + (style.letterSpacing || 0) * n) * style.size
}

/**
 * Greedy word wrap with browser-true widths. Returns the lines, or `null` when a single word is
 * wider than `maxW` (the caller decides: ellipsise, thin out, or let the estimator break it).
 */
export function wrapReal(text: string, style: Pick<ResolvedTextStyle, 'size' | 'letterSpacing'>, maxW: number): string[] | null {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return ['']
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    if (realWidth(w, style) > maxW) return null
    const next = cur ? `${cur} ${w}` : w
    if (!cur || realWidth(next, style) <= maxW) cur = next
    else {
      lines.push(cur)
      cur = w
    }
  }
  lines.push(cur)
  return lines
}
