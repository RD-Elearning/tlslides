/** tls.g.number-line — spro sprint 2026-11b S09: ticks in the deck language, labels apart, lint for out-of-range values. */
import { tlsGNumberLine, lint, niceStep, tickText } from './index'
import { standardBlockSuite } from '../../text/standard-suite'
import { assertChartSane, chartCtx } from '../../data/_chart/chart-test'
import { assertNoOverlap, layoutOf, rectsOf, allText } from '../diagram-test'

standardBlockSuite(tlsGNumberLine, { overflowProps: { points: Array.from({ length: 7 }, (_, i) => ({ value: i, label: 'p' })) } })

const LONG = {
  min: 0, max: 10, step: 0.5,
  points: [0, 0.5, 1, 5, 9.5, 10].map((v, i) => ({ value: v, label: `Điểm số ${i + 1} khá dài` })),
  intervals: [{ from: 0, to: 5, label: 'Chưa đạt' }, { from: 5, to: 8, label: 'Khá' }, { from: 8, to: 10, label: 'Giỏi' }],
}

describe('tls.g.number-line', () => {
  it('tick values in the deck language (vi: decimal comma), round steps', () => {
    expect(tickText(2.5, 0.5, 'vi')).toBe('2,5')
    expect(tickText(1240, 10, 'vi')).toBe('1.240')
    expect(tickText(2.5, 0.5, 'en')).toBe('2.5')
    expect(tickText(-3, 1)).toBe('−3')
    expect(niceStep(10)).toBe(1)
    expect(niceStep(37)).toBe(5)
    const ctx = chartCtx({ width: 1600, height: 520 })
    const t = tlsGNumberLine.layout({ ...tlsGNumberLine.defaults, min: 0, max: 3, step: 0.5, points: [{ value: 1.5, label: 'x' }], intervals: [] } as any, { ...ctx, tokens: { ...ctx.tokens, locale: 'vi' } })
    expect(allText(t)).toContain('1,5')
  })

  it.each([['line'], ['ruler'], ['thermometer']])('%s: 6 points and 3 intervals at max length — texts apart, inside the box', (variant) => {
    for (const size of [{ width: 1600, height: 520 }, { width: 900, height: 380 }]) {
      const t = layoutOf(tlsGNumberLine, { ...LONG, variant }, size)
      assertChartSane(t, size)
      expect(rectsOf(t, /^dot\[\d+\]$/)).toHaveLength(6)
      assertNoOverlap(rectsOf(t, /^(label|tickLabel|intervalLabel)\[/), 1)
    }
  })

  it('a point or interval outside min..max is a validation error', () => {
    const f = lint({ ...LONG, points: [{ value: 12, label: 'x' }], intervals: [{ from: -1, to: 3, label: 'y' }] } as any)
    expect(f.map((x) => x.part)).toEqual(['points[0].value', 'intervals[0].from'])
    expect(lint({ ...LONG, min: 5, max: 5 } as any)[0].rule).toBe('number-line/range')
    expect(tlsGNumberLine.lintIsValidation).toBe(true)
  })
})
