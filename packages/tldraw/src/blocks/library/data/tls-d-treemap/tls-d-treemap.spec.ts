/**
 * tls.d.treemap — squarified areas, ordering, label dropping, capacity (spro creative CR13).
 */
import { tlsDTreemap, squarify } from './index'
import { absoluteLeaves, standardBlockSuite } from '../../text/standard-suite'
import { isNoData, layoutOf, textsOf, assertExampleFits } from '../_chart/chart-test'

const SZ = { width: 900, height: 480 }
const lay = (props: Record<string, unknown>, size = SZ) => layoutOf(tlsDTreemap, props, size)
const cellsOf = (t: any) => absoluteLeaves(t).filter((l) => /^cell\[\d+\]$/.test(String(l.part)))

standardBlockSuite(tlsDTreemap, { overflowProps: { items: Array.from({ length: 13 }, (_, i) => ({ label: `E${i}`, value: i + 1 })) } })

describe('tls.d.treemap', () => {
  it('squarify: areas are proportional to values and tile the box', () => {
    const rects = squarify([6, 6, 4, 3, 2, 2, 1], { x: 0, y: 0, w: 600, h: 400 })
    const area = rects.reduce((a, r) => a + r.w * r.h, 0)
    expect(area).toBeCloseTo(600 * 400, 3)
    expect((rects[0].w * rects[0].h) / (rects[2].w * rects[2].h)).toBeCloseTo(6 / 4, 3)
    for (const r of rects) {
      expect(r.x).toBeGreaterThanOrEqual(-1e-6)
      expect(r.x + r.w).toBeLessThanOrEqual(600 + 1e-6)
      expect(r.y + r.h).toBeLessThanOrEqual(400 + 1e-6)
    }
  })

  it('empty or non-positive items render "No data"', () => {
    expect(isNoData(lay({ items: [] }))).toBe(true)
    expect(isNoData(lay({ items: [{ label: 'a', value: 0 }, { label: 'b', value: -3 }] }))).toBe(true)
  })

  it('the largest part comes first and takes the accent', () => {
    const t = lay({ items: [{ label: 'Small', value: 1 }, { label: 'Big', value: 9 }, { label: 'Mid', value: 4 }] })
    const cells = cellsOf(t)
    expect((absoluteLeaves(t).find((l) => l.part === 'cell[0].label')!.node as any).lines[0].text).toBe('Big')
    expect((cells[0].node as any).fill?.color).not.toBe((cells[1].node as any).fill?.color)
    expect(cells[0].width * cells[0].height).toBeGreaterThan(cells[1].width * cells[1].height)
  })

  it('values: share shows percent of the whole; none drops them', () => {
    expect(textsOf(lay({ items: [{ label: 'A', value: 75 }, { label: 'B', value: 25 }, { label: 'C', value: 25 }], values: 'share' }))).toEqual(expect.arrayContaining(['60%']))
    expect(textsOf(lay({ items: [{ label: 'A', value: 75 }, { label: 'B', value: 25 }, { label: 'C', value: 25 }], values: 'none' })).some((t) => t.endsWith('%'))).toBe(false)
  })

  it('a cell too small for its label keeps its colour and drops the text (no ellipsis)', () => {
    const t = lay({ items: [{ label: 'Large', value: 1000 }, { label: 'Small part with a long name', value: 40 }, { label: 'Also small and long', value: 30 }] })
    expect(textsOf(t).join(' ')).not.toContain('…')
    expect(cellsOf(t).length).toBe(3)
  })

  it('the example fits', () => {
    assertExampleFits(tlsDTreemap)
  })
})
