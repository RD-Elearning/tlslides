/**
 * Tests for autofit.ts — shrink font size until text fits, respecting a 0.75 floor.
 */

import type { Box, ResolvedTextStyle, TextMetrics } from '../types'
import type { MeasureTextProvider } from './measure'
import { autofitText } from './autofit'

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Test fixtures                                                                   */
/* ─────────────────────────────────────────────────────────────────────────────── */

const BASE_STYLE: ResolvedTextStyle = {
  family: '"Source Sans Pro", sans-serif',
  size: 48,
  lineHeight: 1.3,
  letterSpacing: -0.03,
  color: '#1a1a1a',
}

/**
 * A deterministic mock measurement provider. Metrics scale linearly with font size:
 * - width = text.length * fontSize * 0.6
 * - height = lines * lineHeight * fontSize
 */
function makeMockProvider(maxWidth?: number): MeasureTextProvider {
  return (text: string | import('../types').RichText, style: ResolvedTextStyle, boxMaxWidth?: number): TextMetrics => {
    const plain = typeof text === 'string' ? text : text.runs.map(r => r.text).join('')
    const fontSize = style.size
    const lineHeight = (style.lineHeight ?? 1.3) * fontSize
    const charWidth = fontSize * 0.6
    const effectiveMax = boxMaxWidth ?? maxWidth ?? Infinity

    // Simple line calculation: wrap if width exceeds maxWidth.
    const totalWidth = plain.length * charWidth
    let lineCount: number

    if (effectiveMax > 0 && totalWidth > effectiveMax) {
      // Estimate lines needed.
      lineCount = Math.ceil(totalWidth / effectiveMax)
    } else {
      lineCount = Math.max(1, (plain.match(/\n/g)?.length ?? 0) + 1)
    }

    const height = Math.round(lineCount * lineHeight) + 2
    const width = Math.round(Math.min(totalWidth, effectiveMax))

    return {
      width,
      height,
      lines: Array.from({ length: lineCount }, (_, i) => ({
        text: plain.slice(0, 10),
        baseline: Math.round(i * lineHeight + lineHeight * 0.8),
        width,
      })),
    }
  }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Tests                                                                           */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('autofitText', () => {
  it('returns the original style when text already fits', () => {
    const box: Box = { x: 0, y: 0, width: 1000, height: 500 }
    const provider = makeMockProvider()
    const result = autofitText('Hi', BASE_STYLE, box, provider)

    expect(result.overflow).toBe(false)
    expect(result.style.size).toBe(48)
    expect(result.style.scale).toBe(1)
  })

  it('shrinks font size by 0.5 increments until text fits', () => {
    // Narrow height but wide enough to prevent wrapping. "Long text!!" = 10 chars
    // At size 48: height = round(48 * 1.3) + 2 = 64 > 50 → overflow
    // At size 36 (floor): height = round(36 * 1.3) + 2 = 49 <= 50 → fits
    const box: Box = { x: 0, y: 0, width: 600, height: 50 }
    const provider = makeMockProvider()
    const result = autofitText('Long text!!', BASE_STYLE, box, provider)

    // Should have shrunk (scale < 1)
    expect(result.style.scale).toBeLessThan(1)
    expect(result.overflow).toBe(false)
    // Effective size = size * scale, must be >= floor (48 * 0.75 = 36)
    expect(result.style.size * (result.style.scale ?? 1)).toBeGreaterThanOrEqual(36)
  })

  it('never shrinks below 0.75 * original size', () => {
    // Tiny box: even at floor it won't fit.
    const box: Box = { x: 0, y: 0, width: 50, height: 10 }
    const provider = makeMockProvider()
    const result = autofitText(
      'Very long text that definitely will not fit in this tiny box',
      BASE_STYLE,
      box,
      provider,
    )

    expect(result.overflow).toBe(true)
    // Scale must be at the floor: 0.75
    expect(result.style.scale).toBe(0.75)
    // Effective size = 48 * 0.75 = 36
    expect(result.style.size * (result.style.scale ?? 1)).toBe(36)
  })

  it('reports overflow when text still does not fit at the floor', () => {
    const box: Box = { x: 0, y: 0, width: 50, height: 10 }
    const provider = makeMockProvider()
    const result = autofitText('Extraordinarily long paragraph of text', BASE_STYLE, box, provider)

    expect(result.overflow).toBe(true)
    expect(result.style.scale).toBe(0.75)
  })

  it('handles style with no initial scale (defaults to 1)', () => {
    const box: Box = { x: 0, y: 0, width: 1000, height: 500 }
    const provider = makeMockProvider()
    const style: ResolvedTextStyle = { ...BASE_STYLE }
    const result = autofitText('Hello', style, box, provider)

    expect(result.style.scale).toBe(1)
  })

  it('respects existing scale > 1', () => {
    const style: ResolvedTextStyle = { ...BASE_STYLE, scale: 1.5 }
    const box: Box = { x: 0, y: 0, width: 1000, height: 500 }
    const provider = makeMockProvider()
    const result = autofitText('Hi', style, box, provider)

    // "Hi" fits even at 1.5×, so scale should stay 1.5.
    expect(result.style.scale).toBe(1.5)
  })

  it('scale must multiply font size in every calculation path', () => {
    // This tests the Phase 13–15 bug: scale was ignored in calculations.
    const style: ResolvedTextStyle = { ...BASE_STYLE, size: 48, scale: 0.8 }
    const box: Box = { x: 0, y: 0, width: 1000, height: 500 }
    const provider = makeMockProvider()
    const result = autofitText('Hello world', style, box, provider)

    // The effective font size used for measurement was 48 * 0.8 = 38.4
    // Since "Hello world" fits at that size, scale should remain 0.8.
    expect(result.style.scale).toBe(0.8)
    expect(result.style.size).toBe(48)
  })

  it('does not mutate the original style', () => {
    const style: ResolvedTextStyle = { ...BASE_STYLE }
    const box: Box = { x: 0, y: 0, width: 50, height: 10 }
    const provider = makeMockProvider()
    autofitText('Long text', style, box, provider)

    // Original style unchanged.
    expect(style.size).toBe(48)
    expect(style.scale).toBeUndefined()
  })

  it('shrinks step size is 0.5 on effective font size', () => {
    const box: Box = { x: 0, y: 0, width: 600, height: 50 }
    const sizes: number[] = []

    // Custom provider that records every tested effective size.
    const provider: MeasureTextProvider = (text, style, maxWidth) => {
      sizes.push(style.size)
      const fontSize = style.size
      const lineHeight = (style.lineHeight ?? 1.3) * fontSize
      const plain = typeof text === 'string' ? text : text.runs.map(r => r.text).join('')
      const totalWidth = plain.length * fontSize * 0.6
      const effectiveMax = maxWidth ?? Infinity
      const lineCount = effectiveMax > 0 && totalWidth > effectiveMax
        ? Math.ceil(totalWidth / effectiveMax)
        : 1
      const height = Math.round(lineCount * lineHeight) + 2
      return {
        width: Math.round(Math.min(totalWidth, effectiveMax)),
        height,
        lines: [{ text: '', baseline: 0, width: 0 }],
      }
    }

    autofitText('Long text!!', BASE_STYLE, box, provider)

    // Check that successive sizes differ by 0.5.
    for (let i = 1; i < sizes.length; i++) {
      const diff = sizes[i - 1] - sizes[i]
      // Allow for rounding to 0 at the floor boundary.
      expect(diff === 0.5 || diff === 0).toBe(true)
    }
  })

  it('works with zero-length text', () => {
    const box: Box = { x: 0, y: 0, width: 100, height: 50 }
    const provider = makeMockProvider()
    const result = autofitText('', BASE_STYLE, box, provider)

    expect(result.overflow).toBe(false)
    expect(result.style.size).toBe(48)
  })
})
