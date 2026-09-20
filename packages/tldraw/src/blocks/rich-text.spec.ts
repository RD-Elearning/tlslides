/**
 * Tests for RichText + line breaking (C1): CJK-aware measurement, run boundary
 * preservation across line breaks, and mixed CJK+Latin text handling.
 *
 * Pure and DOM-free — exercises estimateMetrics and isCJK directly.
 */

import type { RichText, ResolvedTextStyle } from './types'
import { estimateMetrics, isCJK } from './layout/measure'

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Test fixtures                                                                   */
/* ─────────────────────────────────────────────────────────────────────────────── */

const SANS_STYLE: ResolvedTextStyle = {
  family: '"Source Sans Pro", sans-serif',
  size: 28,
  lineHeight: 1.45,
  letterSpacing: -0.03,
  color: '#1a1a1a',
}

const MONO_STYLE: ResolvedTextStyle = {
  family: '"Source Code Pro", monospace',
  size: 28,
  lineHeight: 1.45,
  letterSpacing: 0,
  color: '#1a1a1a',
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* isCJK detection tests                                                           */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('isCJK', () => {
  it('detects CJK Unified Ideographs', () => {
    expect(isCJK('中')).toBe(true)
    expect(isCJK('国')).toBe(true)
    expect(isCJK('人')).toBe(true)
  })

  it('detects Hiragana', () => {
    expect(isCJK('あ')).toBe(true)
    expect(isCJK('の')).toBe(true)
  })

  it('detects Katakana', () => {
    expect(isCJK('ア')).toBe(true)
    expect(isCJK('カ')).toBe(true)
  })

  it('detects CJK punctuation', () => {
    expect(isCJK('。')).toBe(true)
    expect(isCJK('、')).toBe(true)
    expect(isCJK('「')).toBe(true)
  })

  it('detects fullwidth forms', () => {
    expect(isCJK('Ａ')).toBe(true)
    expect(isCJK('１')).toBe(true)
  })

  it('returns false for Latin characters', () => {
    expect(isCJK('a')).toBe(false)
    expect(isCJK('Z')).toBe(false)
    expect(isCJK('0')).toBe(false)
    expect(isCJK('9')).toBe(false)
  })

  it('returns false for ASCII punctuation', () => {
    expect(isCJK('.')).toBe(false)
    expect(isCJK(',')).toBe(false)
    expect(isCJK('!')).toBe(false)
    expect(isCJK(' ')).toBe(false)
  })

  it('returns false for Korean Hangul (not in CJK ideograph ranges)', () => {
    // Hangul syllables (0xAC00–0xD7AF) are not in our CJK ranges — they use
    // a different encoding model. This is an expected limitation for P1.
    expect(isCJK('한')).toBe(false)
    expect(isCJK('글')).toBe(false)
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Core RichText line breaking tests                                               */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('RichText line breaking — run boundary preservation', () => {
  it('wraps 3 runs over 4 lines while keeping run boundaries', () => {
    // 3 runs: "Hello " (6 chars), "beautiful " (10 chars), "world of text" (13 chars)
    // Total: 29 chars. With a narrow maxWidth, this should wrap to 4+ lines.
    const rich: RichText = {
      runs: [
        { text: 'Hello ', bold: true },
        { text: 'beautiful ', italic: true, color: '#ff0000' },
        { text: 'world of text' },
      ],
    }

    const m = estimateMetrics(rich, SANS_STYLE, 120)

    expect(m.lines.length).toBeGreaterThanOrEqual(4)

    // Verify that every line's runs concatenate to the line's text.
    for (const line of m.lines) {
      if (line.runs && line.runs.length > 0) {
        const concatenated = line.runs.map((r) => r.text).join('')
        expect(concatenated).toBe(line.text)
      }
    }

    // Verify that no single run's text spans across a line boundary.
    // (A run may be split into parts on different lines, but the part on each
    // line must be a substring of the original run text.)
    const allRunTexts = new Set<string>()
    for (const line of m.lines) {
      if (line.runs) {
        for (const run of line.runs) {
          allRunTexts.add(run.text)
        }
      }
    }
    // Each piece found on a line must be a substring of one of the original runs.
    const originalTexts = rich.runs.map((r) => r.text)
    for (const piece of allRunTexts) {
      const isSubstringOfOriginal = originalTexts.some((orig) => orig.includes(piece))
      expect(isSubstringOfOriginal).toBe(true)
    }
  })

  it('preserves run styling across line breaks', () => {
    const rich: RichText = {
      runs: [
        { text: 'AAAA', bold: true },
        { text: 'BBBB', italic: true },
      ],
    }

    // Narrow enough to force a break in the middle.
    const m = estimateMetrics(rich, SANS_STYLE, 80)

    expect(m.lines.length).toBeGreaterThanOrEqual(2)

    // Check that run styles are preserved in the line runs.
    for (const line of m.lines) {
      if (line.runs) {
        for (const run of line.runs) {
          if (run.text.startsWith('A')) {
            expect(run.bold).toBe(true)
          }
          if (run.text.startsWith('B')) {
            expect(run.italic).toBe(true)
          }
        }
      }
    }
  })

  it('handles a single run that wraps to multiple lines', () => {
    const rich: RichText = {
      runs: [{ text: 'AAAA BBBB CCCC DDDD', color: '#00ff00' }],
    }

    const m = estimateMetrics(rich, SANS_STYLE, 100)

    expect(m.lines.length).toBeGreaterThanOrEqual(2)

    // Every line should have the color preserved.
    for (const line of m.lines) {
      if (line.runs) {
        for (const run of line.runs) {
          expect(run.color).toBe('#00ff00')
        }
      }
    }

    // All line texts concatenate to the original.
    const fullText = m.lines.map((l) => l.text).join('')
    expect(fullText).toBe('AAAA BBBB CCCC DDDD')
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Empty and edge-case runs                                                        */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('RichText edge cases', () => {
  it('handles empty runs', () => {
    const rich: RichText = {
      runs: [
        { text: '' },
        { text: 'Hello' },
        { text: '' },
      ],
    }

    const m = estimateMetrics(rich, SANS_STYLE)
    expect(m.lines.length).toBe(1)
    expect(m.lines[0].text).toBe('Hello')
    expect(m.lines[0].runs).toBeDefined()
    // Empty runs are preserved in the output (they may carry styling).
    // The important thing is that the runs concatenate to the line text.
    const concatenated = m.lines[0].runs!.map((r) => r.text).join('')
    expect(concatenated).toBe('Hello')
  })

  it('handles all-empty runs', () => {
    const rich: RichText = {
      runs: [
        { text: '' },
        { text: '' },
      ],
    }

    const m = estimateMetrics(rich, SANS_STYLE)
    expect(m.lines.length).toBe(1)
    expect(m.lines[0].text).toBe('')
  })

  it('handles single-character runs', () => {
    const rich: RichText = {
      runs: [
        { text: 'A', bold: true },
        { text: 'B', italic: true },
        { text: 'C', color: '#ff0000' },
        { text: 'D', size: 2 },
      ],
    }

    const m = estimateMetrics(rich, SANS_STYLE)
    expect(m.lines.length).toBe(1)
    expect(m.lines[0].text).toBe('ABCD')
    expect(m.lines[0].runs).toBeDefined()
    expect(m.lines[0].runs!.length).toBe(4)
    expect(m.lines[0].runs![0].bold).toBe(true)
    expect(m.lines[0].runs![1].italic).toBe(true)
    expect(m.lines[0].runs![2].color).toBe('#ff0000')
    expect(m.lines[0].runs![3].size).toBe(2)
  })

  it('handles single-character runs that wrap', () => {
    const rich: RichText = {
      runs: [
        { text: 'X', bold: true },
        { text: 'Y', italic: true },
      ],
    }

    // Very narrow maxWidth to force wrapping.
    const m = estimateMetrics(rich, SANS_STYLE, 5)

    // With such a narrow width, X and Y should be on separate lines or
    // at least be handled without error.
    expect(m.lines.length).toBeGreaterThanOrEqual(1)
    // The full text should be recoverable.
    const fullText = m.lines.map((l) => l.text).join('')
    expect(fullText).toBe('XY')
  })

  it('handles plain string input (no runs)', () => {
    const m = estimateMetrics('Hello world', SANS_STYLE, 120)
    expect(m.lines.length).toBeGreaterThanOrEqual(1)
    // No runs for plain string.
    for (const line of m.lines) {
      expect(line.runs).toBeUndefined()
    }
  })

  it('handles explicit newlines in RichText', () => {
    const rich: RichText = {
      runs: [
        { text: 'Line one\nLine two\nLine three' },
      ],
    }

    const m = estimateMetrics(rich, SANS_STYLE)
    expect(m.lines.length).toBe(3)
    expect(m.lines[0].text).toBe('Line one')
    expect(m.lines[1].text).toBe('Line two')
    expect(m.lines[2].text).toBe('Line three')
  })

  it('handles newlines within runs spanning multiple run boundaries', () => {
    const rich: RichText = {
      runs: [
        { text: 'First', bold: true },
        { text: '\n' },
        { text: 'Second', italic: true },
      ],
    }

    const m = estimateMetrics(rich, SANS_STYLE)
    expect(m.lines.length).toBe(2)
    expect(m.lines[0].text).toBe('First')
    expect(m.lines[1].text).toBe('Second')
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* CJK-only text line breaking                                                     */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('CJK text line breaking', () => {
  it('breaks CJK-only text between characters', () => {
    // 10 CJK characters at fontSize 28, each ~28px wide = ~280px total.
    // With maxWidth 150, should break to at least 2 lines.
    const rich: RichText = {
      runs: [{ text: '你好世界测试文本内容' }],
    }

    const m = estimateMetrics(rich, SANS_STYLE, 150)

    expect(m.lines.length).toBeGreaterThanOrEqual(2)

    // All characters should be preserved.
    const fullText = m.lines.map((l) => l.text).join('')
    expect(fullText).toBe('你好世界测试文本内容')
  })

  it('CJK text without maxWidth fits on one line', () => {
    const rich: RichText = {
      runs: [{ text: '你好世界' }],
    }

    const m = estimateMetrics(rich, SANS_STYLE)
    expect(m.lines.length).toBe(1)
    expect(m.lines[0].text).toBe('你好世界')
  })

  it('CJK text with maxWidth produces lines that fit', () => {
    const rich: RichText = {
      runs: [{ text: '一二三四五六七八九十' }],
    }

    const maxWidth = 120
    const m = estimateMetrics(rich, SANS_STYLE, maxWidth)

    expect(m.lines.length).toBeGreaterThanOrEqual(2)

    // Each line should be within maxWidth (with tolerance for rounding).
    for (const line of m.lines) {
      expect(line.width).toBeLessThanOrEqual(maxWidth + 30) // tolerance for full-width chars
    }
  })

  it('single CJK character produces valid metrics', () => {
    const m = estimateMetrics('中', SANS_STYLE)
    expect(m.lines.length).toBe(1)
    expect(m.lines[0].text).toBe('中')
    expect(m.lines[0].width).toBeGreaterThan(0)
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* CJK + Latin mixed text                                                          */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('CJK + Latin mixed text', () => {
  it('measures CJK wider than Latin (different rates)', () => {
    // Pure Latin: "AAAA" at fontSize 28, charWidth ~28*INTER_AVG_WIDTH = 15.4 per char
    const latinOnly = estimateMetrics('AAAA', SANS_STYLE)
    // Pure CJK: "中中中中" at fontSize 28, charWidth ~28*1.0 = 28 per char
    const cjkOnly = estimateMetrics('中中中中', SANS_STYLE)

    // CJK should be wider because each CJK char is ~1.0em vs Latin's ~INTER_AVG_WIDTHem.
    expect(cjkOnly.width).toBeGreaterThan(latinOnly.width)
  })

  it('breaks mixed CJK+Latin text at appropriate points', () => {
    // Mix: "Hello你好World世界" — should break between CJK and Latin boundaries.
    const rich: RichText = {
      runs: [{ text: 'Hello你好World世界' }],
    }

    const m = estimateMetrics(rich, SANS_STYLE, 150)

    // The text should wrap.
    expect(m.lines.length).toBeGreaterThanOrEqual(2)

    // Full text preserved.
    const fullText = m.lines.map((l) => l.text).join('')
    expect(fullText).toBe('Hello你好World世界')
  })

  it('mixed text with runs preserves run boundaries across CJK/Latin breaks', () => {
    const rich: RichText = {
      runs: [
        { text: 'Hello你好', bold: true },
        { text: 'World世界', italic: true },
      ],
    }

    const m = estimateMetrics(rich, SANS_STYLE, 150)

    expect(m.lines.length).toBeGreaterThanOrEqual(2)

    // Verify run pieces are substrings of original runs.
    const originalTexts = rich.runs.map((r) => r.text)
    for (const line of m.lines) {
      if (line.runs) {
        const concatenated = line.runs.map((r) => r.text).join('')
        expect(concatenated).toBe(line.text)
        for (const run of line.runs) {
          const isSubstring = originalTexts.some((orig) => orig.includes(run.text))
          expect(isSubstring).toBe(true)
        }
      }
    }
  })

  it('CJK+Latin mixed width produces correct total measurement', () => {
    // "AB中中" = 2 Latin + 2 CJK
    // Latin width per char: 28 * 0.5385 ≈ 15.08
    // CJK width per char: 28 * 1.0 = 28
    // Total: 2*15.08 + 2*28 ≈ 30.16 + 56 = 86.16 → 86 (rounded)
    const m = estimateMetrics('AB中中', SANS_STYLE)

    expect(m.lines.length).toBe(1)
    expect(m.lines[0].width).toBeCloseTo(86.16, 0)
  })

  it('handles CJK text mixed with explicit newlines', () => {
    const rich: RichText = {
      runs: [{ text: '你好\nWorld\n世界' }],
    }

    const m = estimateMetrics(rich, SANS_STYLE)
    expect(m.lines.length).toBe(3)
    expect(m.lines[0].text).toBe('你好')
    expect(m.lines[1].text).toBe('World')
    expect(m.lines[2].text).toBe('世界')
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Line width accuracy                                                             */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('line width calculation', () => {
  // Inter font average width is 0.5385 em (from generated metrics)
  const INTER_AVG_WIDTH = 0.5385

  it('all-Latin line width matches character count × latinWidth', () => {
    const m = estimateMetrics('ABCDEF', SANS_STYLE)
    const expectedWidth = 6 * 28 * INTER_AVG_WIDTH // 6 chars × fontSize × Inter avg
    expect(m.lines[0].width).toBe(Math.round(expectedWidth))
  })

  it('all-CJK line width matches character count × fontSize', () => {
    const m = estimateMetrics('中中中', SANS_STYLE)
    const expectedWidth = 3 * 28 // 3 chars × fontSize (1.0em)
    expect(m.lines[0].width).toBe(Math.round(expectedWidth))
  })

  it('total width is sum of Latin and CJK portions', () => {
    const m = estimateMetrics('A中B', SANS_STYLE)
    const expectedWidth = 28 * INTER_AVG_WIDTH + 28 + 28 * INTER_AVG_WIDTH // Latin (Inter) + CJK + Latin (Inter)
    expect(m.lines[0].width).toBe(Math.round(expectedWidth))
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Baseline positioning                                                            */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('baseline positioning', () => {
  it('baselines are cumulative and consistent', () => {
    const rich: RichText = {
      runs: [{ text: 'Line one\nLine two\nLine three' }],
    }

    const m = estimateMetrics(rich, SANS_STYLE)
    expect(m.lines.length).toBe(3)

    // Each baseline should increase by lineHeight.
    const lineHeight = SANS_STYLE.lineHeight! * SANS_STYLE.size!
    for (let i = 1; i < m.lines.length; i++) {
      const diff = m.lines[i].baseline - m.lines[i - 1].baseline
      expect(diff).toBe(Math.round(lineHeight))
    }
  })

  it('first baseline is positive (within-line offset)', () => {
    const m = estimateMetrics('Hello', SANS_STYLE)
    expect(m.lines[0].baseline).toBeGreaterThan(0)
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Monospace CJK handling                                                          */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('CJK with monospace font', () => {
  it('CJK characters are still full-width in mono context', () => {
    const latinMono = estimateMetrics('ABCD', MONO_STYLE)
    const cjkMono = estimateMetrics('中中中中', MONO_STYLE)

    // CJK should be wider than Latin even in monospace.
    expect(cjkMono.width).toBeGreaterThan(latinMono.width)
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Determinism                                                                     */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('determinism', () => {
  it('returns identical results for RichText across multiple calls', () => {
    const rich: RichText = {
      runs: [
        { text: 'Hello ', bold: true },
        { text: '你好', italic: true },
        { text: ' World' },
      ],
    }

    const m1 = estimateMetrics(rich, SANS_STYLE, 150)
    const m2 = estimateMetrics(rich, SANS_STYLE, 150)
    expect(m1).toEqual(m2)
  })

  it('returns identical results for CJK text across multiple calls', () => {
    const text = '你好世界测试文本内容一二三四五'
    const m1 = estimateMetrics(text, SANS_STYLE, 100)
    const m2 = estimateMetrics(text, SANS_STYLE, 100)
    expect(m1).toEqual(m2)
  })
})
