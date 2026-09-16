/**
 * Tests for vertical-align.ts — adjust text baselines for vertical alignment.
 */

import type { TextLine } from '../types'
import { alignVertically } from './vertical-align'

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Test helpers                                                                     */
/* ─────────────────────────────────────────────────────────────────────────────── */

/** Create a simple TextLine array simulating n lines with the given line height. */
function makeLines(
  count: number,
  lineHeight: number,
  text: string = 'test',
): TextLine[] {
  return Array.from({ length: count }, (_, i) => ({
    text,
    baseline: Math.round(i * lineHeight + lineHeight * 0.8),
    width: 100,
  }))
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Tests                                                                           */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('alignVertically', () => {
  it('returns lines unchanged for "start" alignment', () => {
    const lines = makeLines(3, 40)
    const result = alignVertically(lines, 500, 'start')

    expect(result).not.toBe(lines) // new array
    for (let i = 0; i < lines.length; i++) {
      expect(result[i].baseline).toBe(lines[i].baseline)
    }
  })

  it('shifts baselines down for "center" alignment', () => {
    const lines = makeLines(2, 40) // total height ≈ 40 * 2 = 80 + small descent
    const boxHeight = 200
    const result = alignVertically(lines, boxHeight, 'center')

    // The first baseline should be shifted down from the original.
    expect(result[0].baseline).toBeGreaterThan(lines[0].baseline)
  })

  it('shifts baselines down for "end" alignment', () => {
    const lines = makeLines(2, 40)
    const boxHeight = 200
    const result = alignVertically(lines, boxHeight, 'end')

    // The shift for "end" should be larger than for "center" (or equal if no free space).
    expect(result[0].baseline).toBeGreaterThanOrEqual(lines[0].baseline)
  })

  it('end alignment pushes more than center alignment', () => {
    const lines = makeLines(3, 40)
    const boxHeight = 500

    const centerResult = alignVertically(lines, boxHeight, 'center')
    const endResult = alignVertically(lines, boxHeight, 'end')

    expect(endResult[0].baseline).toBeGreaterThan(centerResult[0].baseline)
  })

  it('does not shift when text fills the box exactly', () => {
    // Lines that exactly fill the box → no free space → no shift.
    const lines = makeLines(5, 40) // ≈ 5 lines * 40 = ~200 + descent
    const boxHeight = 210 // barely fits
    const result = alignVertically(lines, boxHeight, 'center')

    // If text block height >= box height, offset is 0.
    // The block height for 5 lines: ascent(32) + 4*40 + descent(8) = 200
    // boxHeight = 210, freeSpace = 10, so there IS some shift.
    // Let's use a tighter box.
    const linesTight = makeLines(5, 40)
    const resultTight = alignVertically(linesTight, 200, 'center')
    // Block height = 200, box height = 200, freeSpace = 0, no shift.
    expect(resultTight[0].baseline).toBe(linesTight[0].baseline)
  })

  it('does not shift when text is taller than box', () => {
    const lines = makeLines(10, 40) // ≈ 400+
    const boxHeight = 100
    const result = alignVertically(lines, boxHeight, 'center')

    // No shift possible: text overflows.
    expect(result[0].baseline).toBe(lines[0].baseline)
  })

  it('returns empty array for empty input', () => {
    const result = alignVertically([], 200, 'center')
    expect(result).toEqual([])
  })

  it('does not mutate original lines', () => {
    const lines = makeLines(2, 40)
    const originalBaselines = lines.map((l) => l.baseline)
    alignVertically(lines, 500, 'center')

    expect(lines.map((l) => l.baseline)).toEqual(originalBaselines)
  })

  it('preserves line properties other than baseline', () => {
    const lines: TextLine[] = [
      { text: 'Hello', baseline: 32, width: 200, runs: [{ text: 'Hello', bold: true }] },
      { text: 'World', baseline: 72, width: 180, runs: [{ text: 'World', italic: true }] },
    ]
    const result = alignVertically(lines, 300, 'end')

    expect(result[0].text).toBe('Hello')
    expect(result[0].width).toBe(200)
    expect(result[0].runs).toEqual([{ text: 'Hello', bold: true }])
    expect(result[1].text).toBe('World')
    expect(result[1].width).toBe(180)
    expect(result[1].runs).toEqual([{ text: 'World', italic: true }])
  })

  it('single line center aligns correctly', () => {
    const lines = makeLines(1, 40) // baseline = 32 (0.8 * 40)
    const boxHeight = 200
    const result = alignVertically(lines, boxHeight, 'center')

    // Block height for 1 line: 32 * 1.25 = 40
    // Free space = 200 - 40 = 160
    // Offset = 80
    expect(result[0].baseline).toBe(lines[0].baseline + 80)
  })

  it('single line end aligns correctly', () => {
    const lines = makeLines(1, 40)
    const boxHeight = 200
    const result = alignVertically(lines, boxHeight, 'end')

    // Block height = 40, free space = 160, offset = 160
    expect(result[0].baseline).toBe(lines[0].baseline + 160)
  })

  it('all three alignment modes produce different offsets', () => {
    const lines = makeLines(3, 40)
    const boxHeight = 500

    const startResult = alignVertically(lines, boxHeight, 'start')
    const centerResult = alignVertically(lines, boxHeight, 'center')
    const endResult = alignVertically(lines, boxHeight, 'end')

    // start < center < end offsets (applied to first line's baseline).
    expect(startResult[0].baseline).toBeLessThan(centerResult[0].baseline)
    expect(centerResult[0].baseline).toBeLessThan(endResult[0].baseline)
  })
})
