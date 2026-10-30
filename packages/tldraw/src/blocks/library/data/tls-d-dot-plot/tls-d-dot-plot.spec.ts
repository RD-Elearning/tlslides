/**
 * tls.d.dot-plot — the dot family (spro creative CR13): order, scale, highlight, capacity.
 */
import { tlsDDotPlot } from './index'
import { absoluteLeaves, standardBlockSuite } from '../../text/standard-suite'
import { isNoData, layoutOf, textsOf, assertExampleFits } from '../_chart/chart-test'

const SZ = { width: 900, height: 420 }
const lay = (props: Record<string, unknown>) => layoutOf(tlsDDotPlot, props, SZ)
const part = (t: any, p: string) => absoluteLeaves(t).filter((l) => l.part === p)[0]
const items = [
  { label: 'Low', value: 10 },
  { label: 'High', value: 100 },
  { label: 'Mid', value: 50 },
]

standardBlockSuite(tlsDDotPlot, { overflowProps: { items: Array.from({ length: 11 }, (_, i) => ({ label: `E${i}`, value: i })) } })

describe('tls.d.dot-plot', () => {
  it('empty or non-numeric items render "No data"', () => {
    expect(isNoData(lay({ items: [] }))).toBe(true)
    expect(isNoData(lay({ items: [{ label: 'a', value: 'x' }] }))).toBe(true)
  })

  it('the dot sits on a shared scale from zero (largest at the far end, half at the middle)', () => {
    const t = lay({ items, sorted: false })
    const cx = (i: number) => part(t, `row[${i}].dot`).x
    expect(cx(1)).toBeGreaterThan(cx(2))
    expect(cx(2)).toBeGreaterThan(cx(0))
    const x0 = part(t, 'row[0].label').x + part(t, 'row[0].label').width
    expect((cx(2) - x0) / (cx(1) - x0)).toBeGreaterThan(0.4)
  })

  it('sorted puts the largest row first; unsorted keeps the author order', () => {
    const first = (t: any) => (part(t, 'row[0].label').node as any).lines[0].text
    expect(first(lay({ items, sorted: true }))).toBe('High')
    expect(first(lay({ items, sorted: false }))).toBe('Low')
  })

  it('the highlight (or the largest) takes the accent, the others a tint', () => {
    const fill = (t: any, i: number) => (part(t, `row[${i}].dot`).node as any).fill?.color
    const t = lay({ items, sorted: false, highlight: 'Low' })
    expect(fill(t, 0)).not.toBe(fill(t, 1))
    expect(fill(t, 1)).toBe(fill(t, 2))
    const d = lay({ items, sorted: false })
    expect(fill(d, 1)).not.toBe(fill(d, 0))
  })

  it('labels none drops the value text', () => {
    expect(textsOf(lay({ items, labels: 'none' }))).not.toContain('100')
    expect(textsOf(lay({ items, labels: 'end' }))).toContain('100')
  })

  it('the example fits', () => {
    assertExampleFits(tlsDDotPlot)
  })
})
