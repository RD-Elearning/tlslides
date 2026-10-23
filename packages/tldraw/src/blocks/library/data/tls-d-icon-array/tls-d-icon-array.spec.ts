/**
 * tls.d.icon-array (vivid V4) — the grid, the filled count, both text placements, the figure.
 */

import { tlsDIconArray } from './index'
import { iconGrid } from './layout'
import { standardBlockSuite, absoluteLeaves } from '../../text/standard-suite'
import { assertChartSane, assertExampleFits, chartCtx } from '../_chart/chart-test'

const lay = (props: Record<string, unknown>, size = { width: 1000, height: 440 }) =>
  tlsDIconArray.layout({ ...(tlsDIconArray.defaults as any), ...props } as any, chartCtx(size))
const parts = (tree: any, re: RegExp) => absoluteLeaves(tree).filter((l) => re.test(l.part ?? ''))
const texts = (tree: any) => absoluteLeaves(tree).filter((l) => l.k === 'text').map((l) => (l.node as any).lines.map((x: any) => x.text).join(' '))

standardBlockSuite(tlsDIconArray, { overflowProps: { total: 400 } })

describe('tls.d.icon-array', () => {
  it('iconGrid picks the shape with the largest cell', () => {
    expect(iconGrid(10, 500, 200)).toMatchObject({ cols: 5, rows: 2 })
    expect(iconGrid(10, 200, 500)).toMatchObject({ cols: 2, rows: 5 })
    expect(iconGrid(1, 100, 100)).toMatchObject({ cols: 1, rows: 1, cell: 100 })
  })

  it.each([
    [{ width: 1000, height: 440 }],
    [{ width: 480, height: 300 }],
    [{ width: 520, height: 700 }],
  ])('%o: value of total icons, the filled ones first, sane', (size) => {
    for (const [value, total] of [[7, 10], [1, 4], [13, 20], [0, 10], [10, 10]]) {
      const t = lay({ value, total }, size)
      assertChartSane(t, size)
      expect(parts(t, /^on\[/)).toHaveLength(value)
      expect(parts(t, /^off\[/)).toHaveLength(total - value)
    }
  })

  it('the figure reads as a fraction, a percent, or not at all; a value past the total is the total', () => {
    expect(texts(lay({ value: 7, total: 10 }))).toContain('7/10')
    expect(texts(lay({ value: 7, total: 10, figure: 'percent' }))).toContain('70%')
    expect(parts(lay({ figure: 'none' }), /^value/)).toHaveLength(0)
    expect(parts(lay({ value: 14, total: 10 }), /^on\[/)).toHaveLength(10)
  })

  it('beside the icons in a wide box, above them in a tall one', () => {
    const wide = lay({}, { width: 1000, height: 440 })
    const vx = parts(wide, /^value$/)[0]
    expect(Math.min(...parts(wide, /^(on|off)\[/).map((p) => p.x))).toBeGreaterThan(vx.x + vx.width - 1)
    const tall = lay({}, { width: 520, height: 700 })
    const v = parts(tall, /^value$/)[0]
    expect(Math.min(...parts(tall, /^(on|off)\[/).map((p) => p.y))).toBeGreaterThan(v.y + v.height - 1)
  })

  it('the example fits its sizes', () => assertExampleFits(tlsDIconArray))
})
