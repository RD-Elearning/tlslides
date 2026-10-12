/** tls.t.code — lines, gutter, marks, the size step. */

import { tlsTCode } from './index'
import { highlighted, MONO } from './layout'
import { makeCtx, makeRegistry } from '../test-helpers'
import { standardBlockSuite, leavesOf } from '../standard-suite'

const ctx = (w = 900, h = 520) => makeCtx({ width: w, height: h }, makeRegistry())
const lay = (props: Record<string, unknown>, w = 900, h = 520) => tlsTCode.layout({ ...(tlsTCode.defaults as any), ...props } as any, ctx(w, h))

standardBlockSuite(tlsTCode, { noCapacity: true })

describe('tls.t.code', () => {
  it('one monospace leaf per line, in order, inside the panel', () => {
    const tree = lay({})
    const rows = leavesOf(tree, 'line')
    expect(rows).toHaveLength(6)
    for (let i = 1; i < rows.length; i++) expect(rows[i].y).toBeGreaterThan(rows[i - 1].y)
    expect((rows[0].node as any).style.family).toBe(MONO)
    const panel = leavesOf(tree, 'panel')[0]
    expect(rows[5].y + rows[5].height).toBeLessThanOrEqual(panel.y + panel.height)
  })

  it('parses highlighted lines and tints exactly those rows', () => {
    expect([...highlighted('2, 5-6')]).toEqual([2, 5, 6])
    expect([...highlighted('x, 3')]).toEqual([3])
    const tree = lay({ highlight: '2-3' })
    const marks = leavesOf(tree, 'mark')
    const rows = leavesOf(tree, 'line')
    expect(marks.map((m) => Math.round(m.y))).toEqual([Math.round(rows[1].y), Math.round(rows[2].y)])
  })

  it('line numbers make a gutter; without them the code starts at the padding', () => {
    const withNums = leavesOf(lay({}), 'line')[0]
    const without = leavesOf(lay({ lineNumbers: false }), 'line')[0]
    expect(withNums.x).toBeGreaterThan(without.x)
    expect(leavesOf(lay({ lineNumbers: false }), 'number')).toHaveLength(0)
  })

  it('a long line steps the type down to the caption size', () => {
    const long = 'result = some_function_with_a_long_name(argument_one, argument_two, argument_three)'
    const small = (leavesOf(lay({ code: long }, 600), 'line')[0].node as any).style.size
    const normal = (leavesOf(lay({ code: 'x = 1' }, 600), 'line')[0].node as any).style.size
    expect(small).toBeLessThan(normal)
  })
})
