/** tls.t.formula — notation, scripts, the size ladder. */

import { tlsTFormula } from './index'
import { parseFormula } from './parse'
import { makeCtx, makeRegistry } from '../test-helpers'
import { standardBlockSuite, leavesOf } from '../standard-suite'

const ctx = (w = 900, h = 300) => makeCtx({ width: w, height: h }, makeRegistry())
const lay = (props: Record<string, unknown>, w = 900, h = 300) => tlsTFormula.layout({ ...(tlsTFormula.defaults as any), ...props } as any, ctx(w, h))

standardBlockSuite(tlsTFormula, { noCapacity: true })

describe('tls.t.formula', () => {
  it('parses one character or a braced group after _ and ^', () => {
    expect(parseFormula('log_2N')).toEqual([{ text: 'log', kind: 'base' }, { text: '2', kind: 'sub' }, { text: 'N', kind: 'base' }])
    expect(parseFormula('2^{h+1} - 1')).toEqual([{ text: '2', kind: 'base' }, { text: 'h+1', kind: 'sup' }, { text: ' - 1', kind: 'base' }])
    expect(parseFormula('a_')).toEqual([{ text: 'a_', kind: 'base' }])
    expect(parseFormula('h_min = 2^h')).toEqual([{ text: 'h', kind: 'base' }, { text: 'min', kind: 'sub' }, { text: ' = 2', kind: 'base' }, { text: 'h', kind: 'sup' }])
  })

  it('a subscript is smaller and lower, a superscript smaller and higher, on one line', () => {
    const tree = lay({ expression: 'x_i + y^2' })
    const parts = leavesOf(tree, 'expr').filter((l) => l.part?.startsWith('expr'))
    const [x, i, plus, two] = [parts[0], parts[1], parts[2], parts[3]]
    const size = (l: any) => l.node.style.size
    expect(size(i)).toBeLessThan(size(x))
    expect(i.y).toBeGreaterThan(x.y)
    expect(two.y).toBeLessThan(plus.y)
    expect(i.x).toBeGreaterThanOrEqual(x.x + x.width - 2)
  })

  it('steps down the size ladder until the widest line fits', () => {
    const long = 'T(n) = T(n-1) + T(n-2) + O(1) for every n >= 2'
    const wide = leavesOf(lay({ expression: 'O(n)', size: 'display' }, 700), 'expr')[0].node as any
    const narrow = leavesOf(lay({ expression: long, size: 'display' }, 700), 'expr')[0].node as any
    expect(narrow.style.size).toBeLessThan(wide.style.size)
  })

  it('several lines stack; the caption sits under them', () => {
    const tree = lay({ expression: 'a = 1\nb = 2' })
    const rows = leavesOf(tree, 'expr').filter((l) => l.part?.startsWith('expr'))
    expect(rows[1].y).toBeGreaterThan(rows[0].y)
    const cap = leavesOf(tree, 'caption')[0]
    expect(cap.y).toBeGreaterThan(rows[1].y)
  })
})
