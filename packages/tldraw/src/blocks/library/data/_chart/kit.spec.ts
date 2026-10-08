/**
 * Chart kit helpers: ring / sector paths, nice axis, number formatting, series parsing.
 */

import { clipToWidth, fmtNum, fmtSigned, niceAxis, readSeries, ringArcPath, style } from './kit'
import { makeCtx, makeRegistry } from '../../text/test-helpers'

const nums = (d: string) => [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])])

describe('ringArcPath', () => {
  const cx = 100
  const cy = 100

  it('traces one closed outline: outer arc, radial edge, inner arc back on the SAME circle', () => {
    const d = ringArcPath(cx, cy, 80, 50, 0, Math.PI / 2)
    expect(d.match(/A /g)).toHaveLength(2)
    expect(d.match(/M /g)).toHaveLength(1)
    const [start, outerEnd, innerStart, innerEnd] = nums(d.replace(/A [\d.]+ [\d.]+ 0 [01] [01]/g, ''))
    expect(Math.hypot(start[0] - cx, start[1] - cy)).toBeCloseTo(80, 1)
    expect(Math.hypot(outerEnd[0] - cx, outerEnd[1] - cy)).toBeCloseTo(80, 1)
    expect(Math.hypot(innerStart[0] - cx, innerStart[1] - cy)).toBeCloseTo(50, 1)
    expect(Math.hypot(innerEnd[0] - cx, innerEnd[1] - cy)).toBeCloseTo(50, 1)
    // the inner arc is drawn counter-clockwise (sweep 0), the outer clockwise (sweep 1)
    expect(d).toMatch(/A 80 80 0 0 1/)
    expect(d).toMatch(/A 50 50 0 0 0/)
  })

  it('sets the large-arc flag for spans over half a turn, on both arcs', () => {
    const d = ringArcPath(cx, cy, 80, 50, 0, Math.PI * 1.5)
    expect(d).toMatch(/A 80 80 0 1 1/)
    expect(d).toMatch(/A 50 50 0 1 0/)
  })

  it('a wedge (no inner radius) starts at the centre', () => {
    const d = ringArcPath(cx, cy, 80, 0, 0, Math.PI / 2)
    expect(d.startsWith('M 100 100 L ')).toBe(true)
    expect(d.match(/A /g)).toHaveLength(1)
  })

  it('a full turn is two half-ring outlines', () => {
    const d = ringArcPath(cx, cy, 80, 50, 0, Math.PI * 2)
    expect(d.match(/M /g)).toHaveLength(2)
    expect(d).not.toMatch(/NaN|Infinity/)
  })
})

describe('niceAxis', () => {
  it('contains the data and lands on round steps', () => {
    const a = niceAxis(0, 91, 5)
    expect(a.min).toBe(0)
    expect(a.max).toBeGreaterThanOrEqual(91)
    expect(a.ticks).toEqual([0, 20, 40, 60, 80, 100])
  })
  it('handles negatives, a flat range and nonsense', () => {
    expect(niceAxis(-12, 30, 5).ticks).toContain(0)
    expect(niceAxis(5, 5, 5).max).toBeGreaterThan(niceAxis(5, 5, 5).min)
    expect(niceAxis(NaN, NaN, 5).ticks.length).toBeGreaterThan(1)
  })
})

describe('fmtNum / fmtSigned', () => {
  it('trims zeros and groups thousands', () => {
    expect(fmtNum(1234)).toBe('1,234')
    expect(fmtNum(2.5)).toBe('2.5')
    expect(fmtNum(0.30000000000000004)).toBe('0.3')
    expect(fmtNum(12500, 'compact')).toBe('12.5K')
    expect(fmtNum(2000, 'compact')).toBe('2K')
    expect(fmtNum(12, 'percent')).toBe('12%')
  })
  it('signs with + and -', () => {
    expect(fmtSigned(5)).toBe('+5')
    expect(fmtSigned(-5)).toBe('-5')
    expect(fmtSigned(0)).toBe('0')
  })
})

describe('readSeries', () => {
  it('pads, cuts, caps at 6 and keeps gaps as null', () => {
    const s = readSeries([{ name: 'a', values: [1, 'x', 3] }], 4)
    expect(s[0].values).toEqual([1, null, 3, null])
    expect(readSeries(Array.from({ length: 9 }, () => ({ name: 'n', values: [1] })), 1)).toHaveLength(6)
  })
  it('accepts a bare number array as one unnamed series and survives junk', () => {
    expect(readSeries([1, 2, 3], 3)[0].values).toEqual([1, 2, 3])
    expect(() => readSeries(null, 3)).not.toThrow()
    expect(readSeries([null, 7, {}], 3).length).toBeGreaterThanOrEqual(0)
  })
})

describe('clipToWidth', () => {
  const ctx = makeCtx({ width: 600, height: 300 }, makeRegistry())
  const s = style(ctx, 'footnote')
  it('leaves short labels alone and ellipsises a word that cannot fit', () => {
    expect(clipToWidth(ctx, 'Short', s, 200)).toBe('Short')
    const cut = clipToWidth(ctx, 'Extraordinarily', s, 60)
    expect(cut.endsWith('…')).toBe(true)
    expect(ctx.measureText(cut, s).width).toBeLessThanOrEqual(60)
  })
  it('wraps to at most two lines', () => {
    const out = clipToWidth(ctx, 'one two three four five six seven eight nine ten', s, 80)
    expect(ctx.measureText(out, s, 80).lines.length).toBeLessThanOrEqual(2)
  })
})
