/**
 * Geometry tests for tls.l.grid — grid with columns/rows.
 */

import { tlsLGrid } from './index'
import { spanCells } from './layout'
import { makeCtx, makeRegistry, makeChildren, SIZES, assertValidNode } from '../test-helpers'

describe('tls.l.grid', () => {
  const registry = makeRegistry()

  describe('layout at 3 sizes with 2×2 grid', () => {
    it.each(SIZES)('produces valid tree at $label ($box.width×$box.height)', ({ box }) => {
      const ctx = makeCtx(box, registry)
      const node = tlsLGrid.layout(
        { columns: 2, rows: 2, gap: 'md', children: makeChildren(4) } as any,
        ctx
      )
      assertValidNode(node)
      expect(node.k).toBe('group')
      expect(node.children).toHaveLength(4)
    })
  })

  describe('child positioning', () => {
    it('arranges 2×2 grid with md gap', () => {
      const box = { width: 1000, height: 500 }
      const ctx = makeCtx(box, registry)
      const node = tlsLGrid.layout(
        { columns: 2, rows: 2, gap: 'md', children: makeChildren(4) } as any,
        ctx
      )
      expect(node.children).toHaveLength(4)
      // Gap = 24. Cell width = (1000 - 24) / 2 = 488
      // Cell height = (500 - 24) / 2 = 238
      const c0 = node.children[0] // top-left
      const c1 = node.children[1] // top-right
      const c2 = node.children[2] // bottom-left
      const c3 = node.children[3] // bottom-right

      expect(c0.box.x).toBe(0)
      expect(c0.box.y).toBe(0)
      expect(c1.box.x).toBe(488 + 24)
      expect(c1.box.y).toBe(0)
      expect(c2.box.x).toBe(0)
      expect(c2.box.y).toBe(238 + 24)
      expect(c3.box.x).toBe(488 + 24)
      expect(c3.box.y).toBe(238 + 24)
    })
  })

  describe('overflow children', () => {
    it('clips children beyond cols*rows (documented behavior)', () => {
      const box = { width: 960, height: 540 }
      const ctx = makeCtx(box, registry)
      const node = tlsLGrid.layout(
        { columns: 2, rows: 2, gap: 'md', children: makeChildren(6) } as any,
        ctx
      )
      // Grid clips to cols*rows cells. Children beyond capacity are documented as clipped.
      // TODO: Future: emit overflow warning via findings (R13) when grid underflows children.
      expect(node.children).toHaveLength(4)
    })
  })

  describe('single cell grid', () => {
    it('fills the box with one child', () => {
      const box = { width: 960, height: 540 }
      const ctx = makeCtx(box, registry)
      const node = tlsLGrid.layout(
        { columns: 1, rows: 1, gap: 'md', children: makeChildren(1) } as any,
        ctx
      )
      expect(node.children).toHaveLength(1)
      expect(node.children[0].box.width).toBe(960)
      expect(node.children[0].box.height).toBe(540)
    })
  })

  describe('S11 spans', () => {
    it('places a wide headline cell over two columns and wraps a span that does not fit', () => {
      expect(spanCells([2, 1, 1, 1], 4, 3)).toEqual([{ col: 0, row: 0, span: 2 }, { col: 2, row: 0, span: 1 }, { col: 0, row: 1, span: 1 }, { col: 1, row: 1, span: 1 }])
      expect(spanCells([1, 1, 2], 3, 2)).toEqual([{ col: 0, row: 0, span: 1 }, { col: 1, row: 0, span: 1 }, { col: 0, row: 1, span: 2 }])
      expect(spanCells([1, 2], 2, 3)).toEqual([{ col: 0, row: 0, span: 1 }, { col: 1, row: 0, span: 2 }])
      expect(spanCells(undefined, 4, 2)).toBeNull()
      expect(spanCells([1, 1, 1], 3, 3)).toBeNull()
    })

    it('a span-2 cell is two columns wide plus the gap; rows grow to fit', () => {
      const ctx = makeCtx({ width: 1000, height: 500 }, registry)
      const node = tlsLGrid.layout({ columns: 3, rows: 1, gap: 'md', spans: [2, 1, 1, 1, 1], children: makeChildren(5) } as any, ctx)
      expect(node.children).toHaveLength(5)
      const cw = (1000 - 48) / 3
      expect(node.children[0].box.width).toBeCloseTo(cw * 2 + 24)
      expect(node.children[1].box.x).toBeCloseTo(2 * (cw + 24))
      expect(node.children[2].box.y).toBeCloseTo((500 - 24) / 2 + 24)
      for (const c of node.children) expect(c.box.x + c.box.width).toBeLessThanOrEqual(1000.01)
    })
  })
})
