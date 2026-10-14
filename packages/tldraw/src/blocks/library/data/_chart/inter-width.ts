/**
 * Real Inter Regular advance widths (em), measured in headless Chromium against the font the app
 * ships (2026-10-06, RV04). The default `estimateMetrics` runs 20-30% off on figures and the
 * `tableMetrics` Inter table is 17% narrow on digits and 35% narrow on "%" ("72%" is 2.16 em,
 * the table says 1.68), so right-aligned values overshot their bars. Kerning is ignored (a sum
 * is within ~3% of the browser, usually slightly wide; AC3 adds the measured kerning pairs). Unknown
 * glyphs use `INTER_FALLBACK_EM`.
 *
 * Pure and DOM-free.
 */

import type { ResolvedTextStyle } from '../../../types'
import { interCharEm } from '../../../layout/inter-metrics'
import { faceCharEm, faceForFamily, faceKernEm, INTER_METRICS } from '../../../layout/font-metrics'

// The table moved to `layout/inter-metrics.ts` (LO5) so `tableMetrics` uses the same browser-true
// widths; re-exported here for the chart kit and its specs.
export { INTER_EM } from '../../../layout/inter-metrics'

/** Width of one line of `text` as the browser draws it (slide units), from the measured table.
 *  AC3: a `family` with a measured table (`layout/font-metrics`) uses it; otherwise Inter. */
export function realWidth(text: string, style: Pick<ResolvedTextStyle, 'size' | 'letterSpacing'> & { family?: string }): number {
  const face = style.family ? faceForFamily(style.family) : undefined
  let em = 0
  let n = 0
  let prev: string | undefined
  for (const ch of text) {
    // AC3: with the face's kerning pairs (Inter's too), as the browser sets the line.
    em += (face ? faceCharEm(face, ch) : interCharEm(ch)) + faceKernEm(face ?? INTER_METRICS, prev, ch)
    prev = ch
    n++
  }
  return (em + (style.letterSpacing || 0) * n) * style.size
}

/**
 * Greedy word wrap with browser-true widths. Returns the lines, or `null` when a single word is
 * wider than `maxW` (the caller decides: ellipsise, thin out, or let the estimator break it).
 */
export function wrapReal(text: string, style: Pick<ResolvedTextStyle, 'size' | 'letterSpacing'> & { family?: string }, maxW: number): string[] | null {
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
