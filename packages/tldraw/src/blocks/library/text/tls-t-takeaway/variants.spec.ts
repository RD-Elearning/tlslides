/** spro enhance L4 — takeaway looks: only `bar` paints the edge stripe; `line` has no panel. */
import { tlsTTakeaway } from './index'
import { ctxNoAssets } from '../../media/media-test'
import type { LayoutNode } from '../../../types'

const parts = (n: LayoutNode): string[] => [n.part ?? '', ...(n.k === 'group' ? n.children.flatMap(parts) : [])]
const lay = (variant?: string) => tlsTTakeaway.layout({ ...(tlsTTakeaway.defaults as object), ...(variant ? { variant } : {}) } as never, ctxNoAssets(800, 300))

describe('tls.t.takeaway variants', () => {
  it('bar (default) keeps the accent bar on a tinted surface', () => {
    expect(parts(lay())).toEqual(expect.arrayContaining(['surface', 'accent-bar', 'text']))
    expect(JSON.stringify(lay('bar'))).toBe(JSON.stringify(lay()))
  })
  it('tint and note have a panel and no bar', () => {
    for (const v of ['tint', 'note']) {
      const p = parts(lay(v))
      expect(p).toContain('surface')
      expect(p).not.toContain('accent-bar')
    }
  })
  it('line has a short rule above and no panel', () => {
    const t = lay('line') as Extract<LayoutNode, { k: 'group' }>
    const p = parts(t)
    expect(p).not.toContain('surface')
    const rule = t.children.find((c) => c.part === 'accent-bar')!
    expect(rule.box.width).toBeLessThan(200)
    expect(rule.box.y).toBe(0)
  })
})
