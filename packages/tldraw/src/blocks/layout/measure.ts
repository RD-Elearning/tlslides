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
 * CJK characters occupy roughly 1.0em (full-width), compared to Latin's ~0.55em.
 * This is the width multiplier applied to CJK characters relative to the base
 * Latin character width for the font.
 */
const CJK_WIDTH_EM = 1.0

/**
 * Default line-height multiplier when `style.lineHeight` is absent.
 * Matches the shape system's `LINE_HEIGHT` constant (1.3).
 */
const DEFAULT_LINE_HEIGHT = 1.3

/* ─────────────────────────────────────────────────────────────────────────────── */
/* CJK character detection                                                         */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Detect whether a single character is a CJK (Chinese / Japanese / Korean) character
 * or a CJK punctuation / symbol. CJK characters occupy full-width cells and have
 * no inherent word boundaries, so line-breaking treats them differently from Latin.
 *
 * Covers: CJK Unified Ideographs, Extension A, Compatibility Ideographs,
 * CJK Symbols & Punctuation, Hiragana, Katakana, and Fullwidth Forms.
 */
export function isCJK(char: string): boolean {
  const code = char.charCodeAt(0)
  return (
    (code >= 0x4e00 && code <= 0x9fff) ||   // CJK Unified Ideographs
    (code >= 0x3400 && code <= 0x4dbf) ||    // CJK Extension A
    (code >= 0xf900 && code <= 0xfaff) ||    // CJK Compatibility Ideographs
    (code >= 0x3000 && code <= 0x303f) ||    // CJK Symbols and Punctuation
    (code >= 0xff00 && code <= 0xffef) ||    // Fullwidth Forms
    (code >= 0x3040 && code <= 0x309f) ||    // Hiragana
    (code >= 0x30a0 && code <= 0x30ff) ||    // Katakana
    (code >= 0x2e80 && code <= 0x2eff) ||    // CJK Radicals Supplement
    (code >= 0x2f00 && code <= 0x2fdf) ||    // Kangxi Radicals
    (code >= 0x31c0 && code <= 0x31ef) ||    // CJK Strokes
    (code >= 0xfe30 && code <= 0xfe4f) ||    // CJK Compatibility Forms
    (code >= 0x20000 && code <= 0x2a6df) ||  // CJK Extension B
    (code >= 0x2a700 && code <= 0x2b73f) ||  // CJK Extension C
    (code >= 0x2b740 && code <= 0x2b81f) ||  // CJK Extension D
    (code >= 0x2b820 && code <= 0x2ceaf) ||  // CJK Extension E
    (code >= 0x2ceb0 && code <= 0x2ebef) ||  // CJK Extension F
    (code >= 0x30000 && code <= 0x3134f)     // CJK Extension G
  )
}

/**
 * Whether a character is a break opportunity for line wrapping.
 * Break opportunities exist at whitespace and after CJK characters.
 */
function isBreakOpportunity(char: string, nextChar: string | undefined): boolean {
  // Whitespace is always a break opportunity (break after it).
  if (/\s/.test(char)) return true
  // After a CJK character, we can break before the next character.
  if (isCJK(char) && nextChar !== undefined) return true
  return false
}

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
/* Per-character width calculation                                                */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Compute the width of a single character in slide units. CJK characters are
 * treated as full-width (~1.0em) while Latin characters use the font-family's
 * average width heuristic. `latinWidth` is `fontSize * charWidthForFamily(...)`.
 */
function charWidthPx(char: string, latinWidth: number, fontSize: number): number {
  if (isCJK(char)) {
    // Full-width: 1.0em relative to font size.
    return fontSize * CJK_WIDTH_EM
  }
  // For whitespace, use the Latin width (space has the same approximate advance).
  return latinWidth
}

/**
 * Measure the width of a text string, character by character.
 * Used to compute accurate line widths for CJK+Latin mixed text.
 */
function measureStringWidth(str: string, latinWidth: number, fontSize: number): number {
  let w = 0
  for (let i = 0; i < str.length; i++) {
    w += charWidthPx(str[i], latinWidth, fontSize)
  }
  return w
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* CJK-aware line breaking                                                        */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Break a single logical line into visual lines that fit within `maxWidth`.
 * Uses width-based accumulation (not character counting) so CJK and Latin
 * characters are measured at their respective rates.
 *
 * Break opportunities:
 *  - After whitespace (word boundary)
 *  - Between any two characters when the preceding character is CJK
 *
 * When no break opportunity fits, a hard break is forced at the character boundary.
 */
function breakLineWithWidth(
  logical: string,
  maxWidth: number,
  latinWidth: number,
  fontSize: number,
): string[] {
  if (!logical) return ['']

  const lines: string[] = []
  let currentStart = 0
  let currentWidth = 0
  let lastBreakPos = -1    // index in `logical` where the last break opportunity ended

  for (let i = 0; i < logical.length; i++) {
    const ch = logical[i]
    const cw = charWidthPx(ch, latinWidth, fontSize)

    if (currentWidth + cw > maxWidth && currentStart < i) {
      // Exceeded budget — decide where to break.
      if (lastBreakPos > currentStart) {
        // Break at the last opportunity. The break character is included on this line.
        const lineText = logical.slice(currentStart, lastBreakPos + 1)
        lines.push(lineText)
        currentStart = lastBreakPos + 1
        currentWidth = 0
        lastBreakPos = -1
        // Re-accumulate from currentStart to current position.
        for (let j = currentStart; j <= i; j++) {
          currentWidth += charWidthPx(logical[j], latinWidth, fontSize)
        }
      } else {
        // No break opportunity — hard-break at the previous character.
        const breakAt = Math.max(currentStart + 1, i)
        lines.push(logical.slice(currentStart, breakAt))
        currentStart = breakAt
        currentWidth = 0
        lastBreakPos = -1
        // Include current character.
        currentWidth = cw
      }
    } else {
      currentWidth += cw
    }

    // Track break opportunities.
    const nextCh = i + 1 < logical.length ? logical[i + 1] : undefined
    if (isBreakOpportunity(ch, nextCh)) {
      lastBreakPos = i
    }
  }

  // Remaining text.
  if (currentStart < logical.length) {
    lines.push(logical.slice(currentStart))
  }

  return lines.length > 0 ? lines : ['']
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* estimateMetrics — the default measurement provider                              */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Adapt Phase 15's `estimateTextSize` heuristic to produce full `TextMetrics` with a `lines`
 * array and optional word-level line-breaking when `maxWidth` is provided.
 *
 * CJK characters are measured at full-width (~1.0em) vs Latin's ~0.55em, and line
 * breaking inserts opportunities between CJK characters (which lack inherent word
 * boundaries). Run boundaries are preserved across line breaks via `sliceRunsForLine`.
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
  const latinWidth = fontSize * charWidthForFamily(style.family || '')
  const runsForLine = runs ? [...runs] : undefined

  // Break into visual lines.
  const logicalLines = plain.split('\n')
  const visualLines: string[] = []

  if (maxWidth != null && maxWidth > 0 && latinWidth > 0) {
    for (const logical of logicalLines) {
      const lineWidth = measureStringWidth(logical, latinWidth, fontSize)
      if (lineWidth <= maxWidth) {
        visualLines.push(logical)
      } else {
        // Width-based line breaking with CJK awareness.
        const broken = breakLineWithWidth(logical, maxWidth, latinWidth, fontSize)
        visualLines.push(...broken)
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
    const lineWidth = measureStringWidth(lineText, latinWidth, fontSize)
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
 * Fully-consumed runs are shifted off the front of the array so subsequent calls
 * pick up where this call left off.
 */
function sliceRunsForLine(runs: RunEntry[], lineText: string): RunEntry[] {
  const result: RunEntry[] = []
  let remaining = lineText.length

  while (remaining > 0 && runs.length > 0) {
    const run = runs[0]
    if (run.text.length <= remaining) {
      result.push({ ...run })
      remaining -= run.text.length
      runs.shift()
    } else {
      // Split: this run spans across lines.
      result.push({ ...run, text: run.text.slice(0, remaining) })
      runs[0] = { ...run, text: run.text.slice(remaining) }
      remaining = 0
    }
  }

  return result
}
