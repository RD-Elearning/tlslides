/**
 * Geometry tests for tls.l.grid — grid with columns/rows.
 */

import { tlsLGrid } from './index'
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
    it('clips children beyond cols*rows', () => {
      const box = { width: 960, height: 540 }
      const ctx = makeCtx(box, registry)
      const node = tlsLGrid.layout(
        { columns: 2, rows: 2, gap: 'md', children: makeChildren(6) } as any,
        ctx
      )
      // Only 4 cells, so 4 children
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
})
