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
  // Inter and other sans-serif families use the sans average width.
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
/* MetricsProviderChoice type                                                       */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Deck-level text measurement strategy. Choosing at the deck level (not per call)
 * ensures the editor and server agree on layout, avoiding reflows.
 */
export type MetricsProviderChoice = 'estimate' | 'canvas' | 'table'

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
      lines: [{ text: '', top: 0, baseline: Math.round(lh * 0.8), width: 0 }],
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
  // `top` is the distance from the top of the text box to the top of this line's line box.
  // `baseline` is the distance from the top of the text box to the glyph baseline.
  // DOM renderer uses `top` for CSS `top`; SVG renderer uses `baseline` for <tspan y>.
  const withinLineBaseline = lineHeight * 0.8
  const lines: TextLine[] = visualLines.map((lineText, i) => {
    const lineWidth = measureStringWidth(lineText, latinWidth, fontSize)
    const lineRuns = runsForLine
      ? sliceRunsForLine(runsForLine, lineText)
      : undefined
    return {
      text: lineText,
      top: Math.round(i * lineHeight),
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

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Canvas-based line breaking helper                                               */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Minimal interface for the canvas context methods we need. This avoids requiring
 * the full `CanvasRenderingContext2D` type at the module level, keeping the module
 * loadable in Node without DOM types.
 */
export interface MinimalCanvasContext {
  font: string
  measureText(text: string): { width: number }
}

/**
 * Break a single logical line into visual lines using canvas `measureText` for
 * accurate width measurement. Break opportunities: whitespace and after CJK characters
 * (same semantics as `breakLineWithWidth` for the estimate provider).
 */
function breakCanvasLine(
  logical: string,
  ctx: MinimalCanvasContext,
  maxWidth: number,
): string[] {
  if (!logical) return ['']

  const lines: string[] = []
  let currentStart = 0
  let lastBreakPos = -1 // index where the last break opportunity ended

  for (let i = 0; i < logical.length; i++) {
    const ch = logical[i]

    // Check if we've exceeded budget.
    if (currentStart < i) {
      const substring = logical.slice(currentStart, i)
      const w = ctx.measureText(substring).width
      if (w > maxWidth) {
        if (lastBreakPos > currentStart) {
          // Break at the last opportunity (the break char is included on this line).
          lines.push(logical.slice(currentStart, lastBreakPos + 1))
          currentStart = lastBreakPos + 1
          lastBreakPos = -1
        } else {
          // Hard break at previous character.
          const breakAt = Math.max(currentStart + 1, i)
          lines.push(logical.slice(currentStart, breakAt))
          currentStart = breakAt
          lastBreakPos = -1
        }
      }
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

/**
 * Apply letter-spacing to a text string for width measurement. Each character
 * (except the last) gets `letterSpacing * fontSize` added.
 */
function applyLetterSpacing(text: string, letterSpacing: number, fontSize: number): number {
  if (!text || text.length === 0) return 0
  // Canvas already handles letter-spacing through the font; we do NOT add extra
  // measurement here. The letterSpacing in our types is an em value that should be
  // applied via CSS font-feature-settings or canvas attribute. For measurement purposes
  // we rely on the canvas context's own text layout, so we return the raw text width.
  // This helper exists for future use if we need to simulate letterSpacing.
  return 0
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* canvasMetrics — browser opt-in provider                                         */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Browser-only measurement provider backed by `CanvasRenderingContext2D.measureText`.
 * This is the most accurate option in the browser because it uses the actual font
 * rasteriser to measure glyphs. Not available in Node.
 *
 * Usage:
 * ```ts
 * const canvas = document.createElement('canvas').getContext('2d')!
 * const measure = canvasMetrics(canvas)
 * const metrics = measure('Hello world', style, 400)
 * ```
 *
 * @param ctx A canvas 2D context whose `font` property will be set on each call.
 *            The context is mutated (font is set), but no drawing occurs.
 */
export function canvasMetrics(ctx: MinimalCanvasContext): MeasureTextProvider {
  return (text: string | RichText, style: ResolvedTextStyle, maxWidth?: number): TextMetrics => {
    const plain = richTextToPlain(text)
    const runs = richTextRuns(text)

    // Empty text: minimal box (same contract as estimateMetrics).
    if (!plain) {
      const fontSize = style.size || 28
      const lh = (style.lineHeight || DEFAULT_LINE_HEIGHT) * fontSize
      return {
        width: 1,
        height: Math.max(1, Math.round(lh) + 2),
        lines: [{ text: '', top: 0, baseline: Math.round(lh * 0.8), width: 0 }],
      }
    }

    const fontSize = style.size || 28
    const lineHeight = (style.lineHeight || DEFAULT_LINE_HEIGHT) * fontSize
    const family = style.family || ''

    // Set canvas font for measurement.
    ctx.font = `${fontSize}px ${family}`

    const logicalLines = plain.split('\n')
    const visualLines: string[] = []

    if (maxWidth != null && maxWidth > 0) {
      for (const logical of logicalLines) {
        if (!logical) {
          visualLines.push('')
          continue
        }
        const w = ctx.measureText(logical).width
        if (w <= maxWidth) {
          visualLines.push(logical)
        } else {
          const broken = breakCanvasLine(logical, ctx, maxWidth)
          visualLines.push(...broken)
        }
      }
    } else {
      for (const line of logicalLines) {
        visualLines.push(line)
      }
    }

    // Build TextLine[] with canvas-measured widths.
    const withinLineBaseline = lineHeight * 0.8
    const runsForLine = runs ? [...runs] : undefined

    const lines: TextLine[] = visualLines.map((lineText, i) => {
      const lineWidth = ctx.measureText(lineText).width
      const lineRuns = runsForLine
        ? sliceRunsForLine(runsForLine, lineText)
        : undefined
      return {
        text: lineText,
        baseline: Math.round(i * lineHeight + withinLineBaseline),
        top: Math.round(i * lineHeight),
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
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* tableMetrics — per-face advance-width tables                                    */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Advance-width tables for the 4 built-in font faces. Each table maps individual
 * characters to their advance width in em (1 em = font size). Characters not
 * listed use the face's default width. Values are based on typical metrics for
 * each font category.
 *
 * Coverage: a-z, A-Z, 0-9, and common punctuation/symbols.
 */
const ADVANCE_WIDTH_TABLES: Record<string, { default: number; chars: Record<string, number> }> = {
  sans: {
    default: 0.55,
    chars: {
      // Narrow
      i: 0.28, j: 0.28, l: 0.28, t: 0.34, f: 0.34, r: 0.36,
      I: 0.30, J: 0.34,
      // Wide
      m: 0.72, w: 0.74, M: 0.78, W: 0.82,
      // Medium-wide
      d: 0.56, b: 0.56, k: 0.52, h: 0.56, n: 0.56, p: 0.56, q: 0.56,
      u: 0.56, D: 0.62, B: 0.62, K: 0.60, H: 0.66, N: 0.66, P: 0.58, Q: 0.66, R: 0.62,
      // Narrow-ish
      a: 0.50, c: 0.46, e: 0.50, g: 0.50, o: 0.52, s: 0.44, v: 0.46, x: 0.44, y: 0.44, z: 0.44,
      A: 0.60, C: 0.62, E: 0.58, F: 0.54, G: 0.64, O: 0.68, S: 0.54, T: 0.56, U: 0.62,
      V: 0.58, X: 0.58, Y: 0.56, Z: 0.54,
      // Digits
      '0': 0.56, '1': 0.42, '2': 0.54, '3': 0.54, '4': 0.58,
      '5': 0.54, '6': 0.54, '7': 0.52, '8': 0.54, '9': 0.54,
      // Punctuation
      '.': 0.28, ',': 0.28, ':': 0.28, ';': 0.28, '!': 0.30, '?': 0.48,
      "'": 0.24, '"': 0.38, '-': 0.36, '–': 0.44, '—': 0.64,
      '(': 0.32, ')': 0.32, '[': 0.30, ']': 0.30, '{': 0.34, '}': 0.34,
      '/': 0.34, '\\': 0.34, '@': 0.66, '#': 0.56, '$': 0.54, '%': 0.64,
      '&': 0.60, '*': 0.38, '+': 0.56, '=': 0.56, '<': 0.56, '>': 0.56,
      '~': 0.52, '^': 0.36, '_': 0.48, '|': 0.28, '`': 0.30,
    },
  },
  serif: {
    default: 0.52,
    chars: {
      // Narrow
      i: 0.26, j: 0.26, l: 0.26, t: 0.32, f: 0.34, r: 0.34,
      I: 0.28, J: 0.32,
      // Wide
      m: 0.70, w: 0.72, M: 0.76, W: 0.80,
      // Medium-wide
      d: 0.54, b: 0.54, k: 0.50, h: 0.54, n: 0.54, p: 0.54, q: 0.54,
      u: 0.54, D: 0.60, B: 0.60, K: 0.58, H: 0.64, N: 0.64, P: 0.56, Q: 0.64, R: 0.60,
      // Medium
      a: 0.48, c: 0.44, e: 0.48, g: 0.48, o: 0.50, s: 0.42, v: 0.44, x: 0.42, y: 0.42, z: 0.42,
      A: 0.58, C: 0.60, E: 0.56, F: 0.52, G: 0.62, O: 0.66, S: 0.52, T: 0.54, U: 0.60,
      V: 0.56, X: 0.56, Y: 0.54, Z: 0.52,
      // Digits
      '0': 0.54, '1': 0.40, '2': 0.52, '3': 0.52, '4': 0.56,
      '5': 0.52, '6': 0.52, '7': 0.50, '8': 0.52, '9': 0.52,
      // Punctuation
      '.': 0.26, ',': 0.26, ':': 0.26, ';': 0.26, '!': 0.28, '?': 0.46,
      "'": 0.22, '"': 0.36, '-': 0.34, '–': 0.42, '—': 0.60,
      '(': 0.30, ')': 0.30, '[': 0.28, ']': 0.28, '{': 0.32, '}': 0.32,
      '/': 0.32, '\\': 0.32, '@': 0.64, '#': 0.54, '$': 0.52, '%': 0.62,
      '&': 0.58, '*': 0.36, '+': 0.54, '=': 0.54, '<': 0.54, '>': 0.54,
      '~': 0.50, '^': 0.34, '_': 0.46, '|': 0.26, '`': 0.28,
    },
  },
  mono: {
    default: 0.60,
    chars: {
      // Monospaced: most characters are the same width. Slight variation for
      // common narrow/wide glyphs only.
      i: 0.52, j: 0.52, l: 0.52, I: 0.52, J: 0.52,
      m: 0.68, w: 0.68, M: 0.68, W: 0.68,
      '.': 0.52, ',': 0.52, ':': 0.52, ';': 0.52, '!': 0.52, '?': 0.60,
      "'": 0.52, '"': 0.60, '-': 0.52, '–': 0.52, '—': 0.68,
      '(': 0.52, ')': 0.52, '[': 0.52, ']': 0.52, '{': 0.52, '}': 0.52,
      '/': 0.52, '\\': 0.52, '|': 0.52, '`': 0.52, '~': 0.60,
      ' ': 0.52,
    },
  },
  script: {
    default: 0.42,
    chars: {
      // Handwriting fonts: more compact, some variation.
      i: 0.22, j: 0.22, l: 0.22, t: 0.28, f: 0.30,
      I: 0.24, J: 0.26,
      m: 0.62, w: 0.64, M: 0.68, W: 0.70,
      d: 0.44, b: 0.44, k: 0.40, h: 0.44, n: 0.44, p: 0.44, q: 0.44,
      u: 0.44, D: 0.50, B: 0.50, K: 0.48, H: 0.54, N: 0.54, P: 0.46, Q: 0.54, R: 0.50,
      a: 0.38, c: 0.36, e: 0.38, g: 0.38, o: 0.40, s: 0.34, v: 0.36, x: 0.34, y: 0.36, z: 0.34,
      A: 0.48, C: 0.50, E: 0.46, F: 0.42, G: 0.52, O: 0.56, S: 0.42, T: 0.44, U: 0.50,
      V: 0.46, X: 0.46, Y: 0.44, Z: 0.42,
      '0': 0.44, '1': 0.34, '2': 0.42, '3': 0.42, '4': 0.46,
      '5': 0.42, '6': 0.42, '7': 0.40, '8': 0.42, '9': 0.42,
      '.': 0.22, ',': 0.22, ':': 0.22, ';': 0.22, '!': 0.24, '?': 0.38,
      "'": 0.20, '"': 0.30, '-': 0.28, '–': 0.36, '—': 0.52,
      '(': 0.24, ')': 0.24, '[': 0.24, ']': 0.24, '{': 0.28, '}': 0.28,
      '/': 0.28, '\\': 0.28, '@': 0.54, '#': 0.44, '$': 0.42, '%': 0.52,
      '&': 0.48, '*': 0.30, '+': 0.44, '=': 0.44, '<': 0.44, '>': 0.44,
      '~': 0.40, '^': 0.28, '_': 0.38, '|': 0.22, '`': 0.24,
    },
  },
  /**
   * Inter — the neutral theme font for tlslides. Per-glyph advance widths
   * hand-authored from visual inspection of Inter Regular at display sizes.
   * These are estimates, not measurements extracted from the actual font file.
   * TODO: replace with a real per-glyph table generated from the font binary
   * (see R0 addendum item 2 / R0.5 item 7 for the extraction-script task).
   */
  inter: {
    default: 0.54,
    chars: {
      // Narrow
      i: 0.26, j: 0.28, l: 0.24, t: 0.34, f: 0.34, r: 0.36,
      I: 0.26, J: 0.32,
      // Wide
      m: 0.74, w: 0.76, M: 0.78, W: 0.84,
      // Medium-wide
      d: 0.56, b: 0.56, k: 0.52, h: 0.56, n: 0.56, p: 0.56, q: 0.56,
      u: 0.56, D: 0.62, B: 0.62, K: 0.60, H: 0.66, N: 0.66, P: 0.58, Q: 0.66, R: 0.62,
      // Narrow-ish
      a: 0.50, c: 0.46, e: 0.50, g: 0.50, o: 0.52, s: 0.44, v: 0.46, x: 0.44, y: 0.44, z: 0.44,
      A: 0.60, C: 0.62, E: 0.58, F: 0.54, G: 0.64, O: 0.68, S: 0.54, T: 0.56, U: 0.62,
      V: 0.58, X: 0.58, Y: 0.56, Z: 0.54,
      // Digits
      '0': 0.56, '1': 0.42, '2': 0.54, '3': 0.54, '4': 0.58,
      '5': 0.54, '6': 0.54, '7': 0.52, '8': 0.54, '9': 0.54,
      // Punctuation
      '.': 0.26, ',': 0.26, ':': 0.26, ';': 0.26, '!': 0.28, '?': 0.48,
      "'": 0.22, '"': 0.38, '-': 0.36, '–': 0.44, '—': 0.64,
      '(': 0.32, ')': 0.32, '[': 0.30, ']': 0.30, '{': 0.34, '}': 0.34,
      '/': 0.34, '\\': 0.34, '@': 0.66, '#': 0.56, '$': 0.54, '%': 0.64,
      '&': 0.60, '*': 0.38, '+': 0.56, '=': 0.56, '<': 0.56, '>': 0.56,
      '~': 0.52, '^': 0.36, '_': 0.48, '|': 0.26, '`': 0.30,
    },
  },
}

/**
 * Look up the advance width of a character in em for a given font face key.
 * Falls back to the face's default width for unlisted characters.
 */
function tableCharWidth(char: string, faceKey: string): number {
  const table = ADVANCE_WIDTH_TABLES[faceKey]
  if (!table) return CUSTOM_FONT_AVG_CHAR_WIDTH_EM
  return table.chars[char] ?? table.default
}

/**
 * Map a CSS font-family string to the closest built-in face key for tableMetrics.
 * Returns 'sans' as the neutral fallback.
 */
function tableFaceKey(family: string): string {
  const lower = family.toLowerCase()
  if (lower.includes('mono') || lower.includes('source code')) return 'mono'
  if (lower.includes('inter') && !lower.includes('sans')) return 'inter'
  if (lower.includes('serif') && !lower.includes('sans')) return 'serif'
  if (lower.includes('script') || lower.includes('caveat')) return 'script'
  return 'sans'
}

/**
 * Measure the width of a text string using per-character advance-width tables.
 */
function measureTableStringWidth(str: string, faceKey: string, fontSize: number): number {
  let w = 0
  for (let i = 0; i < str.length; i++) {
    const ch = str[i]
    if (isCJK(ch)) {
      w += fontSize * CJK_WIDTH_EM
    } else {
      w += tableCharWidth(ch, faceKey) * fontSize
    }
  }
  return w
}

/**
 * Break a line using table-based widths. Same line-breaking algorithm as
 * `breakLineWithWidth` but using `measureTableStringWidth` for character widths.
 */
function breakLineWithTableWidth(
  logical: string,
  maxWidth: number,
  faceKey: string,
  fontSize: number,
): string[] {
  if (!logical) return ['']

  const lines: string[] = []
  let currentStart = 0
  let currentWidth = 0
  let lastBreakPos = -1

  for (let i = 0; i < logical.length; i++) {
    const ch = logical[i]
    const cw = isCJK(ch) ? fontSize * CJK_WIDTH_EM : tableCharWidth(ch, faceKey) * fontSize

    if (currentWidth + cw > maxWidth && currentStart < i) {
      if (lastBreakPos > currentStart) {
        const lineText = logical.slice(currentStart, lastBreakPos + 1)
        lines.push(lineText)
        currentStart = lastBreakPos + 1
        currentWidth = 0
        lastBreakPos = -1
        for (let j = currentStart; j <= i; j++) {
          const cj = logical[j]
          currentWidth += isCJK(cj) ? fontSize * CJK_WIDTH_EM : tableCharWidth(cj, faceKey) * fontSize
        }
      } else {
        const breakAt = Math.max(currentStart + 1, i)
        lines.push(logical.slice(currentStart, breakAt))
        currentStart = breakAt
        currentWidth = 0
        lastBreakPos = -1
        currentWidth = cw
      }
    } else {
      currentWidth += cw
    }

    const nextCh = i + 1 < logical.length ? logical[i + 1] : undefined
    if (isBreakOpportunity(ch, nextCh)) {
      lastBreakPos = i
    }
  }

  if (currentStart < logical.length) {
    lines.push(logical.slice(currentStart))
  }

  return lines.length > 0 ? lines : ['']
}

/**
 * Table-based text measurement provider. Uses per-face advance-width lookup tables
 * for the 4 built-in font families (script, sans, serif, mono). This is a middle
 * ground between `estimateMetrics` (single avg-char-width) and `canvasMetrics`
 * (actual font rasteriser).
 *
 * Pure and DOM-free: suitable for Node.js server-side rendering.
 *
 * @param faceKey Optional override for the font face key. If omitted, the face is
 *                auto-detected from `style.family` on each call (just like estimateMetrics).
 *                Pass a face key to lock to a specific table regardless of family string.
 */
export function tableMetrics(faceKey?: string): MeasureTextProvider {
  return (text: string | RichText, style: ResolvedTextStyle, maxWidth?: number): TextMetrics => {
    const plain = richTextToPlain(text)
    const runs = richTextRuns(text)

    // Empty text: minimal box (same contract as estimateMetrics).
    if (!plain) {
      const fontSize = style.size || 28
      const lh = (style.lineHeight || DEFAULT_LINE_HEIGHT) * fontSize
      return {
        width: 1,
        height: Math.max(1, Math.round(lh) + 2),
        lines: [{ text: '', top: 0, baseline: Math.round(lh * 0.8), width: 0 }],
      }
    }

    const fontSize = style.size || 28
    const lineHeight = (style.lineHeight || DEFAULT_LINE_HEIGHT) * fontSize
    const resolvedFace = faceKey ?? tableFaceKey(style.family || '')

    const logicalLines = plain.split('\n')
    const visualLines: string[] = []

    if (maxWidth != null && maxWidth > 0 && fontSize > 0) {
      for (const logical of logicalLines) {
        const lineWidth = measureTableStringWidth(logical, resolvedFace, fontSize)
        if (lineWidth <= maxWidth) {
          visualLines.push(logical)
        } else {
          const broken = breakLineWithTableWidth(logical, maxWidth, resolvedFace, fontSize)
          visualLines.push(...broken)
        }
      }
    } else {
      for (const line of logicalLines) {
        visualLines.push(line)
      }
    }

    const withinLineBaseline = lineHeight * 0.8
    const runsForLine = runs ? [...runs] : undefined

    const lines: TextLine[] = visualLines.map((lineText, i) => {
      const lineWidth = measureTableStringWidth(lineText, resolvedFace, fontSize)
      const lineRuns = runsForLine
        ? sliceRunsForLine(runsForLine, lineText)
        : undefined
      return {
        text: lineText,
        top: Math.round(i * lineHeight),
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
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* createMetricsProvider — factory                                                 */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Factory that picks the right measurement provider for a deck. The choice is made
 * once at the deck level — not per call — so the editor and server agree on layout
 * and a slide never reflows between environments.
 *
 * @param choice Which provider to use.
 * @param opts   Provider-specific options. `canvas` is required when `choice` is `'canvas'`.
 */
export function createMetricsProvider(
  choice: MetricsProviderChoice,
  opts?: { canvas?: MinimalCanvasContext }
): MeasureTextProvider {
  switch (choice) {
    case 'estimate':
      return estimateMetrics
    case 'canvas':
      if (!opts?.canvas) {
        throw new Error(
          'createMetricsProvider: "canvas" choice requires opts.canvas (a CanvasRenderingContext2D)'
        )
      }
      return canvasMetrics(opts.canvas)
    case 'table':
      return tableMetrics()
    default: {
      const _exhaustive: never = choice
      throw new Error(`createMetricsProvider: unknown choice "${_exhaustive}"`)
    }
  }
}
