/**
 * Geometry tests for tls.l.repeater — repeats template for each item.
 */

import { tlsLRepeater } from './index'
import { makeCtx, makeRegistry, makeChildren, SIZES, assertValidNode } from '../test-helpers'

describe('tls.l.repeater', () => {
  const registry = makeRegistry()

  describe('layout at 3 sizes with template', () => {
    it.each(SIZES)('produces valid tree at $label ($box.width×$box.height)', ({ box }) => {
      const ctx = makeCtx(box, registry)
      const node = tlsLRepeater.layout(
        { count: 3, direction: 'y', gap: 'sm', children: makeChildren(1) } as any,
        ctx
      )
      assertValidNode(node)
      expect(node.k).toBe('group')
      expect(node.children).toHaveLength(3)
    })
  })

  describe('vertical repeat', () => {
    it('distributes 3 items vertically with xs gap', () => {
      const box = { width: 960, height: 300 }
      const ctx = makeCtx(box, registry)
      const node = tlsLRepeater.layout(
        { count: 3, direction: 'y', gap: 'xs', children: makeChildren(1) } as any,
        ctx
      )
      expect(node.children).toHaveLength(3)
      // xs = 12. Total gap = 2 * 12 = 24. Each item: (300 - 24) / 3 = 92
      const c0 = node.children[0]
      const c1 = node.children[1]
      expect(c0.box.y).toBe(0)
      expect(c1.box.y).toBe(92 + 12)
    })
  })

  describe('horizontal repeat', () => {
    it('distributes items horizontally', () => {
      const box = { width: 600, height: 200 }
      const ctx = makeCtx(box, registry)
      const node = tlsLRepeater.layout(
        { count: 4, direction: 'x', gap: 'xs', children: makeChildren(1) } as any,
        ctx
      )
      expect(node.children).toHaveLength(4)
      // xs = 12. Total gap = 3 * 12 = 36. Each item: (600 - 36) / 4 = 141
      expect(node.children[0].box.x).toBe(0)
      expect(node.children[1].box.x).toBe(141 + 12)
    })
  })

  describe('no template', () => {
    it('produces placeholder rects', () => {
      const ctx = makeCtx({ width: 960, height: 300 }, registry)
      const node = tlsLRepeater.layout(
        { count: 3, direction: 'y', gap: 'sm' } as any,
        ctx
      )
      expect(node.children).toHaveLength(3)
      for (const child of node.children) {
        expect(child.k).toBe('rect')
      }
    })
  })
})
