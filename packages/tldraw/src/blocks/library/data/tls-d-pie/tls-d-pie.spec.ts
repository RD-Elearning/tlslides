/**
 * tls.d.pie — ordering, percentages, label modes, hues, highlight, folding, tiny slices.
 */

import { tlsDPie } from './index'
import { absoluteLeaves, leavesOf, standardBlockSuite } from '../../text/standard-suite'
import { assertChartSane, chartCtx, coloursOf, isNoData, layoutOf, textsOf } from '../_chart/chart-test'

const SZ = { width: 760, height: 460 }
const lay = (props: Record<string, unknown>, size = SZ) => layoutOf(tlsDPie, props, size)
const names = ['A', 'B', 'C', 'D', 'E', 'F']
const exact = (t: any, part: string) => absoluteLeaves(t).filter((l) => l.part === part)[0]
const label = (t: any, i: number) => (leavesOf(t, `label[${i}]`).filter((l) => l.part === `label[${i}]`)[0]?.node as any)?.lines.map((x: any) => x.text).join(' ')

standardBlockSuite(tlsDPie, { overflowProps: { categories: [...names, 'G'], values: [1, 2, 3, 4, 5, 6, 7] } })

describe('tls.d.pie', () => {
  it('empty, all-zero and negative data render "No data"', () => {
    expect(isNoData(lay({ categories: [], values: [] }))).toBe(true)
    expect(isNoData(lay({ categories: ['a', 'b'], values: [0, 0] }))).toBe(true)
    expect(isNoData(lay({ categories: ['a', 'b'], values: [-3, NaN] }))).toBe(true)
  })

  it('sort desc puts the largest slice first; sort none keeps the author order', () => {
    const data = { categories: ['Small', 'Big', 'Mid'], values: [10, 60, 30] }
    expect(label(lay({ ...data, sort: 'desc' }), 0)).toBe('Big')
    expect(label(lay({ ...data, sort: 'none' }), 0)).toBe('Small')
  })

  it('percentages are each value over the total', () => {
    const t = lay({ categories: ['a', 'b', 'c', 'd'], values: [50, 25, 15, 10] })
    expect(textsOf(t)).toEqual(expect.arrayContaining(['50%', '25%', '15%', '10%']))
  })

  it('showPercent: false drops the percent text', () => {
    const t = lay({ showPercent: false })
    expect(textsOf(t).some((s) => /%$/.test(s))).toBe(false)
  })

  it('six slices use six distinct hues; the single-slice pie uses accent', () => {
    const six = lay({ categories: names, values: [30, 25, 20, 12, 8, 5], labels: 'legend' })
    const cols = [0, 1, 2, 3, 4, 5].map((i) => coloursOf(six, new RegExp(`^slice\\[${i}\\]$`))[0])
    expect(new Set(cols).size).toBe(6)
    for (const col of cols) expect(col).toMatch(/^#[0-9a-f]{6}$/i)
    const c = chartCtx(SZ)
    expect(coloursOf(lay({ categories: ['only'], values: [5] }), /^slice\[0\]$/)[0]).toBe(c.resolveColor('accent').color)
  })

  it('more than six slices fold the tail into a neutral Other slice', () => {
    const c = chartCtx(SZ)
    const t = lay({ categories: [...names, 'G', 'H'], values: [30, 25, 20, 12, 8, 5, 3, 2], labels: 'legend' })
    expect(leavesOf(t, 'slice[5]').filter((l) => l.part === 'slice[5]')).toHaveLength(1)
    expect(leavesOf(t, 'slice[6]')).toHaveLength(0)
    expect(coloursOf(t, /^slice\[5\]$/)[0]).toBe(c.resolveColor('neutral').color)
    expect(textsOf(t).join(' ')).toContain('Other')
    expect(tlsDPie.lint!({ categories: [...names, 'G'], values: [1, 2, 3, 4, 5, 6, 7] } as any, {} as any)[0].level).toBe('warning')
  })

  it('highlightIndex colours that slice with accent and mutes the rest (neutral)', () => {
    const c = chartCtx(SZ)
    const t = lay({ categories: ['a', 'b', 'c'], values: [50, 30, 20], highlightIndex: 1, labels: 'legend' })
    expect(coloursOf(t, /^slice\[1\]$/)[0]).toBe(c.resolveColor('accent').color)
    expect(coloursOf(t, /^slice\[0\]$/)[0]).toBe(c.tokens.color.neutral)
    expect(coloursOf(t, /^slice\[2\]$/)[0]).toBe(c.tokens.color.neutral)
  })

  it('highlightIndex follows the author index even after sorting', () => {
    const c = chartCtx(SZ)
    const t = lay({ categories: ['small', 'big'], values: [10, 90], highlightIndex: 0, labels: 'legend' })
    expect(coloursOf(t, /^slice\[1\]$/)[0]).toBe(c.resolveColor('accent').color)
  })

  it('outside labels never overlap, even for neighbouring tiny slices', () => {
    const t = lay({ categories: names, values: [40, 30, 20, 5, 3, 2] })
    assertChartSane(t, SZ)
    const lbl = absoluteLeaves(t).filter((l) => /^label\[\d\]$/.test(l.part ?? ''))
    expect(lbl).toHaveLength(6)
  })

  it('outside labels stay in their column, left of the circle for left-hand slices', () => {
    const t = lay({ categories: ['R', 'L'], values: [50, 50], startAngle: 0 })
    const slice = absoluteLeaves(t).filter((l) => l.part === 'slice[0]')[0]
    expect(slice).toBeDefined()
    const l0 = exact(t, 'label[0]')
    const l1 = exact(t, 'label[1]')
    expect(l0.x).toBeGreaterThan(SZ.width / 2)
    expect(l1.x + l1.width).toBeLessThan(SZ.width / 2)
  })

  it('inside labels sit within their slice and tiny slices fall back to outside', () => {
    const t = lay({ categories: ['Big', 'Mid', 'Tiny'], values: [60, 38, 2], labels: 'inside' })
    assertChartSane(t, SZ)
    const inside = exact(t, 'label[0]')
    expect(Math.abs(inside.x + inside.width / 2 - SZ.width / 2)).toBeLessThan(SZ.width / 2)
    expect(leavesOf(t, 'label[2].leader')).toHaveLength(1)
    expect(leavesOf(t, 'label[0].leader')).toHaveLength(0)
  })

  it('legend mode lists every slice in a legend and has no leaders', () => {
    const t = lay({ labels: 'legend' })
    const parts = absoluteLeaves(t).map((l) => l.part ?? '')
    expect(parts.filter((p) => p.startsWith('legend/label'))).toHaveLength(4)
    expect(parts.some((p) => p.endsWith('.leader'))).toBe(false)
  })

  it('a single slice is a closed circle with valid path data', () => {
    const t = lay({ categories: ['a', 'b'], values: [10, 0] })
    const d = (leavesOf(t, 'slice[0]')[0].node as any).d as string
    expect(d).not.toMatch(/NaN|Infinity/)
    expect(leavesOf(t, 'slice[1]')).toHaveLength(0)
  })

  it('startAngle rotates the pie', () => {
    const d = (a: number) => (leavesOf(lay({ startAngle: a }), 'slice[0]')[0].node as any).d
    expect(d(0)).not.toBe(d(90))
  })

  it('long names and tiny boxes stay inside the box', () => {
    const long = lay({ categories: ['A very long category name indeed', 'Another quite long name here', 'Third'], values: [5, 3, 2] })
    assertChartSane(long, SZ)
    assertChartSane(lay({}, { width: 300, height: 220 }), { width: 300, height: 220 })
  })

  it('a box too small for outside labels falls back to a legend instead of overlapping', () => {
    const t = lay({ categories: ['Subscriptions', 'Services', 'Licences', 'Other'], values: [48, 27, 17, 8] }, { width: 300, height: 220 })
    expect(absoluteLeaves(t).some((l) => (l.part ?? '').startsWith('legend/'))).toBe(true)
    assertChartSane(t, { width: 300, height: 220 })
  })

  it('capacity: more than six slices fails', () => {
    const r = tlsDPie.capacity!({ categories: [...names, 'G'], values: [1, 2, 3, 4, 5, 6, 7] } as any, SZ, chartCtx(SZ))
    expect(r.fits).toBe(false)
  })
})
