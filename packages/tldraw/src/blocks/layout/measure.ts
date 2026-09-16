/**
 * Text measurement for the block layout system. The `estimateMetrics` provider is the default
 * (Node + browser) — it adapts Phase 15's `estimateTextSize` heuristic to produce full
 * `TextMetrics` with a `lines` array and optional line-breaking when `maxWidth` is provided.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 *
 * Three providers will eventually exist behind the `MeasureTextProvider` interface (§4.6):
 * `estimateMetrics` (this file), `canvasMetrics` (browser), and `tableMetrics` (Node).
 * Only `estimateMetrics` is implemented for A1.
 */

import type { RichText, ResolvedTextStyle, TextLine, TextMetrics } from '../types'

/* ─────────────────────────────────────────────────────────────────────────────── */
/* MeasureTextProvider interface                                                    */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * The sole text measurement primitive for blocks. Deterministic and available in Node.
 * Both DOM and SVG renderers use the same result, which is why they cannot disagree.
 */
export type MeasureTextProvider = (
  text: string | RichText,
  style: ResolvedTextStyle,
  maxWidth?: number
) => TextMetrics

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Character-width heuristic constants (Phase 15, embedded)                         */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Average character widths in em, per font face — the same values Phase 15's
 * `estimateTextSize` uses in `renderPageToSvg.ts`. Embedded here rather than imported
 * from the shape system so the block layout module stays independent.
 */
const AVG_CHAR_WIDTH_EM: Record<string, number> = {
  script: 0.42,
  sans: 0.55,
  serif: 0.52,
  mono: 0.6,
}

/**
 * Neutral fallback for an arbitrary `fontFamily` override whose real metrics nobody has.
 * Matches Phase 15's `CUSTOM_FONT_AVG_CHAR_WIDTH_EM`.
 */
const CUSTOM_FONT_AVG_CHAR_WIDTH_EM = 0.55

/**
 * Default line-height multiplier when `style.lineHeight` is absent.
 * Matches the shape system's `LINE_HEIGHT` constant (1.3).
 */
const DEFAULT_LINE_HEIGHT = 1.3

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Font family → avg char width mapping                                            */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Map a CSS font-family string to the closest bundled face's average character width.
 * Matching is case-insensitive and substring-based — a pragmatic heuristic, not a parse.
 */
function charWidthForFamily(family: string): number {
  const lower = family.toLowerCase()
  if (lower.includes('mono') || lower.includes('source code')) {
    return AVG_CHAR_WIDTH_EM.mono
  }
  if (lower.includes('serif') && !lower.includes('sans')) {
    return AVG_CHAR_WIDTH_EM.serif
  }
  if (lower.includes('script') || lower.includes('caveat')) {
    return AVG_CHAR_WIDTH_EM.script
  }
  return CUSTOM_FONT_AVG_CHAR_WIDTH_EM
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* RichText → plain text extraction                                                */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Extract a plain-text string from a `RichText` value, joining all runs.
 * The runs are preserved in the output lines for the renderer.
 */
function richTextToPlain(text: string | RichText): string {
  if (typeof text === 'string') return text
  return text.runs.map((r) => r.text).join('')
}

/**
 * Convert a `RichText` into an array of `{ text, bold?, italic?, color?, size? }` runs
 * suitable for embedding in `TextLine.runs`. For a plain string, returns `undefined`.
 */
function richTextRuns(
  text: string | RichText
): Array<{ text: string; bold?: boolean; italic?: boolean; color?: string; size?: number }> | undefined {
  if (typeof text === 'string') return undefined
  return text.runs.map((r) => ({ ...r }))
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* estimateMetrics — the default measurement provider                              */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Adapt Phase 15's `estimateTextSize` heuristic to produce full `TextMetrics` with a `lines`
 * array and optional word-level line-breaking when `maxWidth` is provided.
 *
 * This is deliberately approximate (same contract as Phase 15) — documented as such in the
 * architecture reference (§4.6). Higher-accuracy providers (`canvasMetrics`, `tableMetrics`)
 * will replace this as opt-in alternatives behind the same interface.
 */
export function estimateMetrics(
  text: string | RichText,
  style: ResolvedTextStyle,
  maxWidth?: number
): TextMetrics {
  const plain = richTextToPlain(text)
  const runs = richTextRuns(text)

  // Empty text: a minimal box (matches Phase 15's empty-text case).
  if (!plain) {
    const fontSize = style.size || 28
    const lh = (style.lineHeight || DEFAULT_LINE_HEIGHT) * fontSize
    return {
      width: 1,
      height: Math.max(1, Math.round(lh) + 2),
      lines: [{ text: '', baseline: Math.round(lh * 0.8), width: 0 }],
    }
  }

  const fontSize = style.size || 28
  const lineHeight = (style.lineHeight || DEFAULT_LINE_HEIGHT) * fontSize
  const charWidth = fontSize * charWidthForFamily(style.family || '')
  const runsForLine = runs ? [...runs] : undefined

  // Break into visual lines.
  const logicalLines = plain.split('\n')
  const visualLines: string[] = []

  if (maxWidth != null && maxWidth > 0 && charWidth > 0) {
    const charsPerLine = Math.max(1, Math.floor(maxWidth / charWidth))
    for (const logical of logicalLines) {
      if (logical.length <= charsPerLine) {
        visualLines.push(logical)
      } else {
        // Greedy word-wrap: try to break at word boundaries.
        const words = logical.split(/(\s+)/)
        let current = ''
        for (const word of words) {
          if (current.length + word.length <= charsPerLine) {
            current += word
          } else if (current.length > 0) {
            visualLines.push(current)
            current = word.trimStart()
          } else {
            // A single word longer than the line — hard-break it.
            visualLines.push(word.slice(0, charsPerLine))
            current = word.slice(charsPerLine)
          }
        }
        if (current.length > 0) {
          visualLines.push(current)
        }
      }
    }
  } else {
    // No maxWidth: each logical line is one visual line.
    for (const line of logicalLines) {
      visualLines.push(line)
    }
  }

  // Build TextLine[] — each line gets its own runs (split from the original runs).
  // Baselines are cumulative from the text node's origin (top-left of the text box),
  // so the renderer can position each line with `y = line.baseline` directly.
  const withinLineBaseline = lineHeight * 0.8
  const lines: TextLine[] = visualLines.map((lineText, i) => {
    const lineWidth = lineText.length * charWidth
    const lineRuns = runsForLine
      ? sliceRunsForLine(runsForLine, lineText)
      : undefined
    return {
      text: lineText,
      baseline: Math.round(i * lineHeight + withinLineBaseline),
      width: Math.round(lineWidth),
      runs: lineRuns,
    }
  })

  const longestLineWidth = lines.reduce((max, l) => Math.max(max, l.width), 0)
  const totalHeight = Math.round(lines.length * lineHeight) + 2

  return {
    width: Math.max(1, longestLineWidth),
    height: Math.max(1, totalHeight),
    lines,
  }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Run splitting per line                                                          */
/* ─────────────────────────────────────────────────────────────────────────────── */

type RunEntry = { text: string; bold?: boolean; italic?: boolean; color?: string; size?: number }

/**
 * Slice inline runs to match a single visual line. This is a best-effort heuristic:
 * runs are split at the character boundary where the line ends, preserving inline
 * styling for the portion that appears on this line. Runs that extend beyond this line
 * are truncated and will reappear (with the same styling) on the next line.
 *
 * `runs` is mutated (consumed) during iteration, so callers must pass a copy.
 */
function sliceRunsForLine(runs: RunEntry[], lineText: string): RunEntry[] {
  const result: RunEntry[] = []
  let remaining = lineText.length
  let idx = 0

  while (remaining > 0 && idx < runs.length) {
    const run = runs[idx]
    if (run.text.length <= remaining) {
      result.push({ ...run })
      remaining -= run.text.length
      idx++
    } else {
      // Split: this run spans across lines.
      result.push({ ...run, text: run.text.slice(0, remaining) })
      runs[idx] = { ...run, text: run.text.slice(remaining) }
      remaining = 0
    }
  }

  return result
}
