/**
 * Real Inter advance widths (em), measured in headless Chromium against the font the app ships
 * (Google Fonts Inter via `next/font`, variable 100-900; 2026-10-06 RV04, re-verified 2026-10-08
 * LO5: every ASCII glyph matches `canvas.measureText` to 0.001 em). Kerning is ignored (a sum is
 * within ~3% of the browser, usually slightly wide). Accented Latin (Vietnamese, ...) is as wide as
 * its NFD base letter (the marks are zero-advance); anything else unknown is `INTER_FALLBACK_EM`.
 *
 * Used by `tableMetrics` (the layout oracle's provider) and the chart kit (`_chart/inter-width.ts`).
 * Pure and DOM-free.
 */

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
  // LO5: glyphs the fixtures use that have no NFD base letter, measured the same way.
  'Đ': 0.735, 'đ': 0.612, '©': 0.914, '®': 0.666, '™': 0.611, '∞': 0.833, '≈': 0.838, '≤': 0.838,
  '≥': 0.838,
}


/** Width of a glyph with no entry and no NFD base letter in the table. */
export const INTER_FALLBACK_EM = 0.58

/**
 * Bold (700) over regular (400) advance, averaged over a-z/A-Z/0-9 in the same browser run
 * (lower-case 1.057, upper-case 1.029, digits 1.047). Used for `bold` rich-text runs.
 */
export const INTER_BOLD_FACTOR = 1.05

/** Advance width of one character in em (regular weight, no letter-spacing). */
export function interCharEm(ch: string): number {
  return INTER_EM[ch] ?? INTER_EM[ch.normalize('NFD')[0]] ?? INTER_FALLBACK_EM
}
