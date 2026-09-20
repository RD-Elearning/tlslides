/**
 * Geometry tests for tls.l.split — two-panel split with ratio/gutter.
 */

import { tlsLSplit } from './index'
import { makeCtx, makeRegistry, makeChildren, SIZES, assertValidNode } from '../test-helpers'

describe('tls.l.split', () => {
  const registry = makeRegistry()

  describe('layout at 3 sizes with 2 children', () => {
    it.each(SIZES)('produces valid tree at $label ($box.width×$box.height)', ({ box }) => {
      const ctx = makeCtx(box, registry)
      const node = tlsLSplit.layout(
        { ratio: 0.5, gutter: 'md', axis: 'x', children: makeChildren(2) } as any,
        ctx
      )
      assertValidNode(node)
      expect(node.k).toBe('group')
      expect(node.children).toHaveLength(2)
    })
  })

  describe('horizontal split', () => {
    it('splits at 50/50 with md gutter', () => {
      const box = { width: 1000, height: 500 }
      const ctx = makeCtx(box, registry)
      const node = tlsLSplit.layout(
        { ratio: 0.5, gutter: 'md', axis: 'x', children: makeChildren(2) } as any,
        ctx
      )
      expect(node.children).toHaveLength(2)
      const [a, b] = node.children
      // splitBox: available = 1000 - 24 = 976, w1 = round(976 * 0.5) = 488
      expect(a.box.width).toBe(488)
      expect(b.box.x).toBe(488 + 24)
      expect(a.box.height).toBe(500)
      expect(b.box.height).toBe(500)
    })
  })

  describe('vertical split', () => {
    it('splits at 50/50 with md gutter along y', () => {
      const box = { width: 1000, height: 500 }
      const ctx = makeCtx(box, registry)
      const node = tlsLSplit.layout(
        { ratio: 0.5, gutter: 'md', axis: 'y', children: makeChildren(2) } as any,
        ctx
      )
      expect(node.children).toHaveLength(2)
      const [a, b] = node.children
      // available = 500 - 24 = 476, h1 = round(476 * 0.5) = 238
      expect(a.box.height).toBe(238)
      expect(b.box.y).toBe(238 + 24)
    })
  })

  describe('single child', () => {
    it('renders only the first panel', () => {
      const box = { width: 960, height: 540 }
      const ctx = makeCtx(box, registry)
      const node = tlsLSplit.layout(
        { ratio: 0.5, gutter: 'md', axis: 'x', children: makeChildren(1) } as any,
        ctx
      )
      expect(node.children).toHaveLength(1)
    })
  })
})
