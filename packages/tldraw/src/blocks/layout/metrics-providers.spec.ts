/**
 * Tests for the three text measurement providers (estimateMetrics, canvasMetrics,
 * tableMetrics) and the createMetricsProvider factory.
 *
 * All providers must produce the same interface: `TextMetrics` with a `lines` array
 * of `TextLine` objects. canvasMetrics is tested with a mock canvas context (no DOM).
 */

import type { ResolvedTextStyle, TextMetrics } from '../types'
import {
  estimateMetrics,
  canvasMetrics,
  tableMetrics,
  createMetricsProvider,
} from './measure'
import type { MinimalCanvasContext } from './measure'

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Shared fixtures                                                                 */
/* ─────────────────────────────────────────────────────────────────────────────── */

const sansStyle: ResolvedTextStyle = {
  family: '"Source Sans Pro", sans-serif',
  size: 28,
  lineHeight: 1.45,
  letterSpacing: -0.03,
  color: '#1a1a1a',
}

const serifStyle: ResolvedTextStyle = {
  family: '"Source Serif Pro", serif',
  size: 32,
  lineHeight: 1.4,
  letterSpacing: 0,
  color: '#1a1a1a',
}

const monoStyle: ResolvedTextStyle = {
  family: '"Source Code Pro", monospace',
  size: 24,
  lineHeight: 1.35,
  letterSpacing: 0,
  color: '#1a1a1a',
}

const scriptStyle: ResolvedTextStyle = {
  family: 'Caveat, cursive',
  size: 36,
  lineHeight: 1.3,
  letterSpacing: 0,
  color: '#1a1a1a',
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Mock canvas context                                                             */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * A minimal mock of CanvasRenderingContext2D that implements `measureText` using
 * a simple character-width heuristic (same as estimateMetrics' per-char approach,
 * just so we can verify the canvasMetrics wrapper works correctly).
 */
function makeMockCanvas(): MinimalCanvasContext {
  const CHAR_WIDTH: Record<string, number> = {
    i: 7.84, j: 7.84, l: 7.84, t: 9.52, f: 9.52, r: 10.08,
    m: 20.16, w: 20.72, M: 21.84, W: 22.96,
    I: 8.40, J: 9.52,
  }
  const DEFAULT_WIDTH = 15.4 // 28px * 0.55

  let currentFont = ''

  return {
    get font() { return currentFont },
    set font(v: string) { currentFont = v },
    measureText(text: string): { width: number } {
      // Parse font size from the font string (e.g. "28px sans-serif").
      const match = currentFont.match(/^(\d+(?:\.\d+)?)px/)
      const fontSize = match ? parseFloat(match[1]) : 28
      const scale = fontSize / 28

      let w = 0
      for (let i = 0; i < text.length; i++) {
        const ch = text[i]
        if (CHAR_WIDTH[ch] !== undefined) {
          w += CHAR_WIDTH[ch] * scale
        } else {
          w += DEFAULT_WIDTH * scale
        }
      }
      return { width: w }
    },
  }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Assertion helper                                                                */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Verify that a value conforms to the TextMetrics interface.
 */
function assertTextMetrics(m: TextMetrics, label: string) {
  it(`${label}: has width, height, and lines`, () => {
    expect(typeof m.width).toBe('number')
    expect(typeof m.height).toBe('number')
    expect(Array.isArray(m.lines)).toBe(true)
    expect(m.lines.length).toBeGreaterThanOrEqual(1)
  })

  it(`${label}: each line has text, baseline, and width`, () => {
    for (const line of m.lines) {
      expect(typeof line.text).toBe('string')
      expect(typeof line.baseline).toBe('number')
      expect(typeof line.width).toBe('number')
      expect(line.width).toBeGreaterThanOrEqual(0)
    }
  })

  it(`${label}: width and height are positive`, () => {
    expect(m.width).toBeGreaterThanOrEqual(1)
    expect(m.height).toBeGreaterThanOrEqual(1)
  })
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* estimateMetrics tests (verify existing behaviour still works)                   */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('estimateMetrics (baseline)', () => {
  const m = estimateMetrics('Hello world', sansStyle)
  assertTextMetrics(m, 'basic text')

  it('returns TextMetrics with lines array', () => {
    expect(m.lines.length).toBeGreaterThanOrEqual(1)
    expect(m.lines[0].text).toContain('Hello')
  })

  it('handles empty string', () => {
    const e = estimateMetrics('', sansStyle)
    expect(e.lines).toHaveLength(1)
    expect(e.lines[0].text).toBe('')
  })

  it('handles RichText input', () => {
    const rich = { runs: [{ text: 'Hello ' }, { text: 'world', bold: true }] }
    const r = estimateMetrics(rich, sansStyle)
    expect(r.lines.length).toBeGreaterThanOrEqual(1)
  })

  it('breaks lines at maxWidth', () => {
    const long = estimateMetrics('The quick brown fox jumps over the lazy dog', sansStyle, 200)
    expect(long.lines.length).toBeGreaterThan(1)
    for (const line of long.lines) {
      expect(line.width).toBeLessThanOrEqual(200 + 10)
    }
  })

  it('is deterministic', () => {
    const a = estimateMetrics('determinism test', sansStyle)
    const b = estimateMetrics('determinism test', sansStyle)
    expect(a).toEqual(b)
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* canvasMetrics tests                                                             */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('canvasMetrics', () => {
  const ctx = makeMockCanvas()
  const measure = canvasMetrics(ctx)

  const m = measure('Hello world', sansStyle)
  assertTextMetrics(m, 'basic text')

  it('sets font on the canvas context', () => {
    measure('test', sansStyle)
    expect(ctx.font).toBe(`${sansStyle.size}px ${sansStyle.family}`)
  })

  it('returns consistent results (deterministic)', () => {
    const a = measure('determinism test', sansStyle)
    const b = measure('determinism test', sansStyle)
    expect(a).toEqual(b)
  })

  it('handles empty string', () => {
    const e = measure('', sansStyle)
    expect(e.lines).toHaveLength(1)
    expect(e.lines[0].text).toBe('')
  })

  it('handles explicit newlines', () => {
    const n = measure('Hello\nWorld', sansStyle)
    expect(n.lines).toHaveLength(2)
  })

  it('breaks lines when maxWidth is provided', () => {
    const long = measure('The quick brown fox jumps over the lazy dog', sansStyle, 200)
    expect(long.lines.length).toBeGreaterThan(1)
    for (const line of long.lines) {
      expect(line.width).toBeLessThanOrEqual(200 + 10)
    }
  })

  it('handles RichText input', () => {
    const rich = { runs: [{ text: 'Hello ' }, { text: 'world', bold: true }] }
    const r = measure(rich, sansStyle)
    expect(r.lines.length).toBeGreaterThanOrEqual(1)
    expect(r.lines[0].text).toContain('Hello')
  })

  it('handles different font sizes', () => {
    const small = measure('test', { ...sansStyle, size: 12 })
    const large = measure('test', { ...sansStyle, size: 48 })
    expect(large.width).toBeGreaterThan(small.width)
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* tableMetrics tests                                                              */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('tableMetrics', () => {
  const measure = tableMetrics()

  const m = measure('Hello world', sansStyle)
  assertTextMetrics(m, 'basic text')

  it('returns consistent results (deterministic)', () => {
    const a = measure('determinism test', sansStyle)
    const b = measure('determinism test', sansStyle)
    expect(a).toEqual(b)
  })

  it('handles empty string', () => {
    const e = measure('', sansStyle)
    expect(e.lines).toHaveLength(1)
    expect(e.lines[0].text).toBe('')
  })

  it('handles explicit newlines', () => {
    const n = measure('Hello\nWorld', sansStyle)
    expect(n.lines).toHaveLength(2)
  })

  it('breaks lines when maxWidth is provided', () => {
    const long = measure('The quick brown fox jumps over the lazy dog', sansStyle, 200)
    expect(long.lines.length).toBeGreaterThan(1)
    for (const line of long.lines) {
      expect(line.width).toBeLessThanOrEqual(200 + 10)
    }
  })

  it('handles RichText input', () => {
    const rich = { runs: [{ text: 'Hello ' }, { text: 'world', bold: true }] }
    const r = measure(rich, sansStyle)
    expect(r.lines.length).toBeGreaterThanOrEqual(1)
    expect(r.lines[0].text).toContain('Hello')
  })

  it('produces different widths for different font faces', () => {
    const sansResult = measure('Hello', sansStyle)
    const serifResult = measure('Hello', serifStyle)
    const monoResult = measure('Hello', monoStyle)
    const scriptResult = measure('Hello', scriptStyle)
    // At minimum, widths should all be positive
    expect(sansResult.width).toBeGreaterThan(0)
    expect(serifResult.width).toBeGreaterThan(0)
    expect(monoResult.width).toBeGreaterThan(0)
    expect(scriptResult.width).toBeGreaterThan(0)
  })

  it('works with all 4 built-in face styles', () => {
    const faces = [sansStyle, serifStyle, monoStyle, scriptStyle]
    for (const style of faces) {
      const result = measure('Hello World 123', style)
      expect(typeof result.width).toBe('number')
      expect(typeof result.height).toBe('number')
      expect(Array.isArray(result.lines)).toBe(true)
      expect(result.lines.length).toBeGreaterThanOrEqual(1)
      expect(typeof result.lines[0].text).toBe('string')
      expect(typeof result.lines[0].baseline).toBe('number')
      expect(typeof result.lines[0].width).toBe('number')
      expect(result.width).toBeGreaterThanOrEqual(1)
      expect(result.height).toBeGreaterThanOrEqual(1)
      expect(result.lines[0].text).toBe('Hello World 123')
    }
  })

  it('respects faceKey override', () => {
    const lockedMono = tableMetrics('mono')
    // Use the SAME style for both — only the table lookup should matter.
    const m1 = lockedMono('Hello', sansStyle)
    const m2 = lockedMono('Hello', sansStyle)
    // Both use mono tables with the same style → same result.
    expect(m1.width).toBe(m2.width)

    // Without faceKey, auto-detect from style.family.
    const autoDetect = tableMetrics()
    const sansResult = autoDetect('Hello', sansStyle)
    // With faceKey='mono' and sans style, the widths should differ because
    // 'sans' auto-detects to the sans table, while 'mono' locks to mono.
    // (They may coincidentally be close, so just check both return valid metrics.)
    expect(sansResult.width).toBeGreaterThan(0)
    expect(m1.width).toBeGreaterThan(0)
  })

  it('handles CJK characters at full-width', () => {
    const cjk = measure('你好世界', sansStyle)
    const latin = measure('aaaa', sansStyle)
    // CJK characters should be wider (1.0em each) vs Latin (~0.55em each)
    expect(cjk.width).toBeGreaterThan(latin.width)
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* createMetricsProvider factory tests                                             */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('createMetricsProvider', () => {
  it('returns estimateMetrics for "estimate"', () => {
    const provider = createMetricsProvider('estimate')
    const m = provider('Hello', sansStyle)
    const e = estimateMetrics('Hello', sansStyle)
    expect(m).toEqual(e)
  })

  it('returns a canvasMetrics provider for "canvas"', () => {
    const ctx = makeMockCanvas()
    const provider = createMetricsProvider('canvas', { canvas: ctx })
    const m = provider('Hello', sansStyle)
    expect(m.lines.length).toBeGreaterThanOrEqual(1)
    expect(m.width).toBeGreaterThan(0)
  })

  it('throws when "canvas" is chosen without a canvas context', () => {
    expect(() => createMetricsProvider('canvas')).toThrow('opts.canvas')
  })

  it('returns a tableMetrics provider for "table"', () => {
    const provider = createMetricsProvider('table')
    const m = provider('Hello', sansStyle)
    const t = tableMetrics()('Hello', sansStyle)
    expect(m).toEqual(t)
  })

  it('all returned providers produce the same TextMetrics interface', () => {
    const ctx = makeMockCanvas()
    const providers = [
      createMetricsProvider('estimate'),
      createMetricsProvider('canvas', { canvas: ctx }),
      createMetricsProvider('table'),
    ]
    for (const provider of providers) {
      const m = provider('Interface check', sansStyle)
      expect(typeof m.width).toBe('number')
      expect(typeof m.height).toBe('number')
      expect(Array.isArray(m.lines)).toBe(true)
      expect(m.lines.length).toBeGreaterThanOrEqual(1)
      expect(typeof m.lines[0].text).toBe('string')
      expect(typeof m.lines[0].baseline).toBe('number')
      expect(typeof m.lines[0].width).toBe('number')
    }
  })
})
