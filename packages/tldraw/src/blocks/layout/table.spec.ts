/**
 * P0.7 — table engine: column solver (golden numbers) and layout (wrap, alignment, cell kinds).
 */
import { solveColumns, layoutTable, measureTable, measureColumns, capacityForTable, type TableSpec } from './table'
import { makeCtx } from '../library/layout/test-helpers'
import type { LayoutNode } from '../types'

const ctx = makeCtx({ width: 800, height: 600 })

function find(node: LayoutNode, part: string): LayoutNode | undefined {
  if (node.part === part) return node
  if (node.k === 'group') for (const c of node.children) { const f = find(c, part); if (f) return f }
  return undefined
}
function walk(node: LayoutNode, fn: (n: LayoutNode) => void) {
  fn(node)
  if (node.k === 'group') node.children.forEach((c) => walk(c, fn))
}

describe('solveColumns', () => {
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)

  it('content fits: leftover goes to weighted columns only', () => {
    const w = solveColumns([{}, { weight: 1 }, { weight: 3 }], 400, [50, 60, 40])
    expect(w).toEqual([50, 60 + 62.5, 40 + 187.5])
  })

  it('content fits, no weights: leftover shared equally', () => {
    expect(solveColumns([{}, {}], 300, [100, 100])).toEqual([150, 150])
  })

  it('overflow: only the part above min shrinks, proportionally', () => {
    // wants 200+100 = 300 vs width 240: need 60; extras 150 and 0 -> col0 shrinks by 60.
    const w = solveColumns([{ min: 50 }, { min: 100 }], 240, [200, 100])
    expect(w).toEqual([140, 100])
    expect(sum(w)).toBe(240)
  })

  it('overflow with two shrinkable columns splits the loss by their slack', () => {
    const w = solveColumns([{ min: 20 }, { min: 20 }], 120, [100, 100]) // slack 80/80, need 80
    expect(w).toEqual([60, 60])
  })

  it('minimums that alone overflow shrink proportionally', () => {
    const w = solveColumns([{ min: 100 }, { min: 300 }], 200, [0, 0])
    expect(w).toEqual([50, 150])
  })

  it('no columns / zero width are safe', () => {
    expect(solveColumns([], 100, [])).toEqual([])
    expect(solveColumns([{}, {}], 0, [10, 10])).toEqual([0, 0])
  })
})

describe('layoutTable', () => {
  const base: TableSpec = {
    head: ['Plan', 'Seats', 'Price'],
    rows: [
      ['Starter', 5, 49],
      ['Team', 25, 199],
      ['Enterprise with an extremely long descriptive name that must wrap', 500, 999],
    ],
    widths: [260, 100, 140],
    align: [undefined, undefined, 'end'],
    cellPad: 12,
    rowGap: 4,
    rules: 'rows',
    zebra: true,
  }

  it('exposes head, row-<i>, cell-<r>-<c> parts and total width', () => {
    const t = layoutTable(base, ctx)
    expect(t.box.width).toBe(500)
    expect(find(t, 'head')).toBeDefined()
    for (let r = 0; r < 3; r++) {
      expect(find(t, `row-${r}`)).toBeDefined()
      for (let c = 0; c < 3; c++) expect(find(t, `cell-${r}-${c}`)).toBeDefined()
    }
    expect(find(t, 'head-2')).toBeDefined()
  })

  it('wraps long text into a taller row and rows stack without overlap', () => {
    const m = measureTable(base, ctx)
    expect(m.rowHeights[2]).toBeGreaterThan(m.rowHeights[0])
    const t = layoutTable(base, ctx)
    let prevBottom = -Infinity
    for (let r = 0; r < 3; r++) {
      const row = find(t, `row-${r}`)!
      expect(row.box.y).toBeGreaterThanOrEqual(prevBottom)
      prevBottom = row.box.y + row.box.height
    }
    expect(prevBottom).toBeCloseTo(t.box.height, 6)
    const long = find(t, 'cell-2-0')
    expect(long && long.k === 'text' && long.lines.length).toBeGreaterThan(1)
  })

  it('every cell node stays inside its column', () => {
    const t = layoutTable(base, ctx)
    const xs = [0, 260, 360, 500]
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const n = find(t, `cell-${r}-${c}`)!
        expect(n.box.x).toBeGreaterThanOrEqual(xs[c] - 1e-9)
        expect(n.box.x + n.box.width).toBeLessThanOrEqual(xs[c + 1] + 1e-9)
      }
    }
  })

  it('alignment: numbers default to end, text to start, explicit centre centres', () => {
    const t = layoutTable({ ...base, align: [undefined, 'center', undefined] }, ctx)
    const name = find(t, 'cell-0-0')!
    const seats = find(t, 'cell-0-1')!
    const price = find(t, 'cell-0-2')!
    expect(name.box.x).toBe(12) // start: column x 0 + pad
    expect(seats.box.x + seats.box.width / 2).toBeCloseTo(260 + 50, 6) // centred in 260..360
    expect(price.box.x + price.box.width).toBeCloseTo(500 - 12, 6) // end: right pad edge
  })

  it('zebra tints odd rows only; rules appear between rows and under the head', () => {
    const t = layoutTable(base, ctx)
    const parts: string[] = []
    walk(t, (n) => n.part && parts.push(n.part))
    expect(parts).toContain('zebra-1')
    expect(parts).not.toContain('zebra-0')
    expect(parts).toContain('rule-head')
    expect(parts).toContain('rule-0')
    expect(parts).not.toContain('rule-2')
    const off = layoutTable({ ...base, zebra: false, rules: 'none' }, ctx)
    const offParts: string[] = []
    walk(off, (n) => n.part && offParts.push(n.part))
    expect(offParts.some((p) => p.startsWith('zebra') || p.startsWith('rule'))).toBe(false)
  })

  it('no head: no head group and rows start at y 0', () => {
    const t = layoutTable({ ...base, head: undefined }, ctx)
    expect(find(t, 'head')).toBeUndefined()
    expect(find(t, 'row-0')!.box.y).toBe(0)
  })

  it('number cells are formatted', () => {
    const t = layoutTable(
      { ...base, head: undefined, rows: [[{ kind: 'number', value: 1234567, format: 'compact' }, 'x', 'y']] },
      ctx
    )
    const n = find(t, 'cell-0-0')!
    expect(n.k === 'text' && n.lines[0].text).toBe('1.2M')
  })

  describe('cell kinds', () => {
    const spec: TableSpec = {
      rows: [
        [
          { kind: 'check', value: 'yes' },
          { kind: 'check', value: false },
          { kind: 'check', value: 'partial' },
          { kind: 'rating', value: 3 },
          { kind: 'status', status: 'warning', label: 'At risk' },
          { kind: 'node', width: 20, height: 30, build: (box) => ({ k: 'rect', box, part: 'custom', fill: { type: 'solid', color: '#123456' } }) },
        ],
      ],
      widths: [60, 60, 60, 120, 220, 60],
      cellPad: 8,
      rowGap: 0,
    }
    const t = layoutTable(spec, ctx)

    it('check: icon nodes coloured by positive / negative / neutral roles', () => {
      const yes = find(t, 'cell-0-0')!
      const no = find(t, 'cell-0-1')!
      const partial = find(t, 'cell-0-2')!
      expect(yes.k).toBe('icon')
      expect(yes.k === 'icon' && yes.fill).toBe(ctx.resolveColor('positive').color)
      expect(no.k === 'icon' && no.fill).toBe(ctx.resolveColor('negative').color)
      expect(partial.k === 'icon' && partial.fill).toBe(ctx.resolveColor('neutral').color)
      expect(yes.k === 'icon' && yes.icon).not.toBe(no.k === 'icon' && no.icon)
    })

    it('rating: 5 dots, 3 filled and 2 outlined', () => {
      const dots = [0, 1, 2, 3, 4].map((i) => find(t, `cell-0-3/dot-${i}`)!)
      expect(dots.every(Boolean)).toBe(true)
      expect(dots.map((d) => d.k === 'rect' && !!d.fill)).toEqual([true, true, true, false, false])
    })

    it('rating clamps out-of-range values', () => {
      const r = layoutTable({ ...spec, rows: [[{ kind: 'rating', value: 9 }]], widths: [120] }, ctx)
      expect([0, 1, 2, 3, 4].every((i) => { const d = find(r, `cell-0-0/dot-${i}`); return d && d.k === 'rect' && !!d.fill })).toBe(true)
      const z = layoutTable({ ...spec, rows: [[{ kind: 'rating', value: -2 }]], widths: [120] }, ctx)
      expect([0, 1, 2, 3, 4].every((i) => { const d = find(z, `cell-0-0/dot-${i}`); return d && d.k === 'rect' && !d.fill })).toBe(true)
    })

    it('status: dot in the status role plus a label', () => {
      const dot = find(t, 'cell-0-4/dot')!
      const label = find(t, 'cell-0-4/label')!
      expect(dot.k === 'rect' && dot.fill).toEqual({ type: 'solid', color: ctx.resolveColor('warning').color })
      expect(label.k === 'text' && label.lines[0].text).toBe('At risk')
      expect(label.box.x).toBeGreaterThan(dot.box.x + dot.box.width)
    })

    it('injected node: placed in the padded cell box and sizes the row', () => {
      const custom = find(t, 'custom')!
      expect(custom.box.x).toBe(60 + 60 + 60 + 120 + 220 + 8)
      expect(custom.box.height).toBe(30)
      const row = find(t, 'row-0')!
      expect(row.box.height).toBeGreaterThanOrEqual(30 + 8)
    })
  })

  it('never throws on empty input', () => {
    expect(() => layoutTable({ rows: [], widths: [], cellPad: 8, rowGap: 0 }, ctx)).not.toThrow()
    expect(layoutTable({ rows: [], widths: [], cellPad: 8, rowGap: 0 }, ctx).box.height).toBe(0)
  })
})

describe('measureColumns + solveColumns pipeline', () => {
  it('measured max-content feeds the solver and the result fills the width', () => {
    const spec = { head: ['A', 'B'], rows: [['short', 'a much longer cell of text here']], cellPad: 10 } as const
    const measured = measureColumns(spec, ctx)
    expect(measured[1]).toBeGreaterThan(measured[0])
    const widths = solveColumns([{ min: 40 }, { min: 40, weight: 1 }], 300, measured)
    expect(widths.reduce((a, b) => a + b, 0)).toBeCloseTo(300, 6)
  })
})

describe('capacityForTable', () => {
  it('counts the rows that fit under a header', () => {
    expect(capacityForTable([40, 40, 40, 40], { height: 130 }, { headHeight: 30, rowGap: 0 })).toEqual({ fits: false, maxRows: 2 })
  })
  it('fits when everything fits', () => {
    expect(capacityForTable([40, 40], { height: 100 }, { rowGap: 4 })).toEqual({ fits: true, maxRows: 2 })
  })
  it('row gaps count', () => {
    // 40 + 4 + 40 = 84 fits in 84; a third row would need 84 + 4 + 40.
    expect(capacityForTable([40, 40, 40], { height: 84 }, { rowGap: 4 })).toEqual({ fits: false, maxRows: 2 })
  })
  it('zero height fits nothing', () => {
    expect(capacityForTable([10], { height: 0 })).toEqual({ fits: false, maxRows: 0 })
  })
})
