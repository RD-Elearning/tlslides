/**
 * tls.d.table — number alignment and formatting, text fallback, status/rating/check cells,
 * wrapping, header styles, footer, emphasis, density, capacity, flat tree.
 */

import { tlsDTable } from './index'
import { numberWidthEm } from '../_table/kit'
import { absoluteLeaves, allNodes, standardBlockSuite } from '../../text/standard-suite'
import { assertChartSane, chartCtx, isNoData, layoutOf, textsOf } from '../_chart/chart-test'
import { assertExampleFits } from '../_chart/chart-test'

const SZ = { width: 1200, height: 520 }
const lay = (props: Record<string, unknown>, size = SZ) => layoutOf(tlsDTable, props, size)
const exact = (t: any, part: string) => absoluteLeaves(t).filter((l) => l.part === part)[0]
const cols = [{ label: 'Name' }, { label: 'Amount', kind: 'number' }]

standardBlockSuite(tlsDTable, { overflowProps: { rows: Array.from({ length: 15 }, (_, i) => [`R${i}`, `${i}`, `${i}`, 'good']) } })

describe('tls.d.table', () => {
  it('no columns or no rows render "No data"', () => {
    expect(isNoData(lay({ columns: [], rows: [['a']] }))).toBe(true)
    expect(isNoData(lay({ columns: cols, rows: [] }))).toBe(true)
  })

  it('number cells are right-aligned to one edge and formatted', () => {
    const t = lay({ columns: cols, rows: [['a', '5'], ['b', '1234567'], ['c', '42']], header: 'none', footer: undefined, showFooter: false })
    const cells = [0, 1, 2].map((r) => exact(t, `row[${r}].c1`))
    const edge = cells[0].x + cells[0].width
    for (const c of cells) expect(c.x + c.width).toBeCloseTo(edge, 3)
    expect(textsOf(t)).toEqual(expect.arrayContaining(['5', '1,234,567', '42']))
    expect(cells[1].x).toBeLessThan(cells[0].x)
  })

  it('format applies to number columns; a percent or currency literal keeps its unit', () => {
    const t = lay({ columns: cols, rows: [['a', '2500'], ['b', '12%'], ['c', '$9']], format: 'compact' })
    const texts = textsOf(t)
    expect(texts).toContain('2.5K')
    expect(texts).toContain('12%')
    expect(texts).toContain('$9')
  })

  it('a value that does not parse as a number renders as text in its number column', () => {
    const t = lay({ columns: cols, rows: [['a', 'n/a'], ['b', '7']] })
    expect(textsOf(t)).toContain('n/a')
    const na = exact(t, 'row[0].c1')
    expect(na.k).toBe('text')
    // still right-aligned like the numbers
    const seven = exact(t, 'row[1].c1')
    expect(na.x + na.width).toBeCloseTo(seven.x + seven.width, 3)
  })

  it('status, rating and check cells render as shapes and icons, not words alone', () => {
    const t = lay({
      columns: [{ label: 'S', kind: 'status' }, { label: 'R', kind: 'rating' }, { label: 'C', kind: 'check' }],
      rows: [['good', '4', 'yes'], ['bad', '2', 'no'], ['watch', '5', 'partial'], ['whatever', 'x', '??']],
      footer: undefined,
    })
    const ctx = chartCtx(SZ)
    expect((exact(t, 'row[0].c0/dot').node as any).fill.color).toBe(ctx.resolveColor('positive').color)
    expect((exact(t, 'row[1].c0/dot').node as any).fill.color).toBe(ctx.resolveColor('negative').color)
    expect((exact(t, 'row[2].c0/dot').node as any).fill.color).toBe(ctx.resolveColor('warning').color)
    // rating: 4 filled, 1 outlined
    const dots = [0, 1, 2, 3, 4].map((i) => exact(t, `row[0].c1/dot-${i}`).node as any)
    expect(dots.filter((d) => d.fill).length).toBe(4)
    expect(dots.filter((d) => !d.fill).length).toBe(1)
    expect(exact(t, 'row[0].c2').k).toBe('icon')
    expect(exact(t, 'row[1].c2').k).toBe('icon')
    expect((exact(t, 'row[0].c2').node as any).icon).not.toBe((exact(t, 'row[1].c2').node as any).icon)
    // unrecognised values fall back to text
    expect(exact(t, 'row[3].c0').k).toBe('text')
    expect(exact(t, 'row[3].c1').k).toBe('text')
    expect(exact(t, 'row[3].c2').k).toBe('text')
  })

  it('long text wraps inside its column instead of overflowing; numbers keep their width', () => {
    const size = { width: 520, height: 900 }
    const long = 'An extraordinarily long description that has to wrap onto several lines'
    const t = lay({ columns: [{ label: 'Item' }, { label: 'Qty', kind: 'number' }], rows: [[long, '12345']], footer: undefined, showFooter: false }, size)
    const cell = exact(t, 'row[0].c0').node as any
    expect(cell.lines.length).toBeGreaterThan(1)
    assertChartSane(t, size)
    const num = exact(t, 'row[0].c1').node as any
    expect(num.lines.length).toBe(1)
  })

  it('the tree is flat: every group sits at the origin so DOM and SVG agree', () => {
    const t = lay({})
    for (const n of allNodes(t)) if (n.k === 'group') expect([n.box.x, n.box.y]).toEqual([0, 0])
  })

  it('header filled draws an accent bar; bold keeps none; none removes the head', () => {
    const ctx = chartCtx(SZ)
    expect((exact(lay({ header: 'filled' }), 'head.bg').node as any).fill.color).toBe(ctx.resolveColor('accent').color)
    expect(exact(lay({ header: 'bold' }), 'head.bg')).toBeUndefined()
    const bold = exact(lay({ header: 'bold' }), 'head[0]').node as any
    expect(bold.lines[0].runs[0].bold).toBe(true)
    expect(exact(lay({ header: 'none' }), 'head[0]')).toBeUndefined()
  })

  it('footer is separated by a rule and hides with showFooter: false', () => {
    expect(exact(lay({}), 'footer.rule')).toBeDefined()
    expect(absoluteLeaves(lay({ showFooter: false })).some((l) => l.part?.startsWith('footer'))).toBe(false)
  })

  it('emphasisRow and emphasisCol add tint rects over the right area', () => {
    const t = lay({ emphasisRow: 1, emphasisCol: 1 })
    const row = exact(t, 'emphasis.row')
    const r1 = exact(t, 'row[1].c0')
    expect(row.y).toBeLessThanOrEqual(r1.y)
    expect(row.y + row.height).toBeGreaterThanOrEqual(r1.y + r1.height)
    const col = exact(t, 'emphasis.col')
    const c1 = exact(t, 'row[0].c1')
    expect(col.x).toBeLessThanOrEqual(c1.x)
    expect(col.x + col.width).toBeGreaterThanOrEqual(c1.x + c1.width - 1)
    expect(exact(lay({ emphasisRow: -1, emphasisCol: -1 }), 'emphasis.row')).toBeUndefined()
  })

  it('zebra tints odd rows; rules horizontal draws hairline rects (not line nodes)', () => {
    const z = lay({ zebra: true })
    expect(exact(z, 'zebra[1]')).toBeDefined()
    expect(exact(z, 'zebra[0]')).toBeUndefined()
    const r = lay({ rules: 'horizontal' })
    expect(exact(r, 'rule[0]').k).toBe('rect')
    expect(absoluteLeaves(r).some((l) => l.k === 'line')).toBe(false)
  })

  it('compact density is shorter and uses smaller text', () => {
    const a = lay({ density: 'default' })
    const b = lay({ density: 'compact' })
    expect(b.box.height).toBeLessThan(a.box.height)
    expect((exact(b, 'row[0].c0').node as any).style.size).toBeLessThan((exact(a, 'row[0].c0').node as any).style.size)
  })

  it('capacity: too many rows fails and suggests compact then paginate; compact fits more', () => {
    const rows = Array.from({ length: 9 }, (_, i) => [`R${i}`, `${i}`, `${i}`, 'good'])
    const ctx = chartCtx(SZ)
    const d = tlsDTable.capacity!({ ...(tlsDTable.defaults as any), rows, showFooter: false } as any, { width: 1200, height: 560 }, ctx)
    expect(d.fits).toBe(false)
    expect(d.remedy.map((r) => r.kind)).toEqual(['reflow', 'paginate'])
    const c = tlsDTable.capacity!({ ...(tlsDTable.defaults as any), rows, density: 'compact', showFooter: false } as any, { width: 1200, height: 560 }, ctx)
    expect(c.fits).toBe(true)
    const many = tlsDTable.capacity!({ ...(tlsDTable.defaults as any), rows: Array.from({ length: 15 }, () => ['a', '1', '1', 'good']) } as any, { width: 1200, height: 2000 }, ctx)
    expect(many.fits).toBe(false)
  })

  it('stays inside the box at the minimum size', () => {
    const size = { width: 320, height: 160 }
    const t = lay({ rows: [['A', '1', '2', 'good']], footer: undefined, showFooter: false }, size)
    expect(JSON.stringify(t)).not.toMatch(/NaN|Infinity|undefined/)
  })

  it('a table that cannot fit its columns side by side steps down to compact text instead of wrapping words', () => {
    const size = { width: 540, height: 400 }
    const props = { columns: [{ label: 'Metric' }, { label: 'Actual', kind: 'number' }, { label: 'Target', kind: 'number' }, { label: 'Status', kind: 'status' }], rows: [['Revenue', '4,200,000', '4,000,000', 'good'], ['Churn', '3.1%', '2.5%', 'watch']], footer: undefined, showFooter: false }
    const t = lay(props, size)
    const wide = lay(props, { width: 1400, height: 400 })
    expect((exact(t, 'row[0].c0').node as any).style.size).toBeLessThan((exact(wide, 'row[0].c0').node as any).style.size)
    expect((exact(t, 'row[0].c3/label').node as any).lines.length).toBe(1)
    expect((exact(t, 'row[0].c0').node as any).lines.length).toBe(1)
  })

  it('rating dots and icons sit on the vertical centre of the text line', () => {
    const t = lay({ columns: [{ label: 'Name' }, { label: 'R', kind: 'rating' }, { label: 'C', kind: 'check' }], rows: [['Alpha', '3', 'yes']], showFooter: false })
    const text = exact(t, 'row[0].c0')
    const centre = text.y + (text.node as any).style.size * (text.node as any).style.lineHeight / 2
    const dot = exact(t, 'row[0].c1/dot-0')
    const icon = exact(t, 'row[0].c2')
    expect(Math.abs(dot.y + dot.height / 2 - centre)).toBeLessThan(1.5)
    expect(Math.abs(icon.y + icon.height / 2 - centre)).toBeLessThan(1.5)
  })

  it('numbers are measured with figure widths, so mixed-length numbers share a right edge', () => {
    expect(numberWidthEm('$4,820')).toBeCloseTo(3.18, 1)
    expect(numberWidthEm('1,000')).toBeLessThan(numberWidthEm('10,000'))
    const t = lay({ columns: cols, rows: [['a', '$4,820'], ['b', '12%'], ['c', '1.2M']], footer: undefined, showFooter: false })
    const edges = [0, 1, 2].map((r) => exact(t, `row[${r}].c1`)).map((l) => l.x + l.width)
    expect(Math.max(...edges) - Math.min(...edges)).toBeLessThan(0.5)
  })
})

describe('RV06 — example fits its box (review G06)', () => {
  it('the example fits size.preferred and size.min, every label as wide as its glyphs', () => {
    assertExampleFits(tlsDTable)
  })
})
