/**
 * Geometry tests for tls.l.stack — vertical stack with gap.
 */

import { tlsLStack } from './index'
import { makeCtx, makeRegistry, makeChildren, SIZES, assertValidNode } from '../test-helpers'

describe('tls.l.stack', () => {
  const registry = makeRegistry()

  describe('layout at 3 sizes with 3 children', () => {
    it.each(SIZES)('produces valid tree at $label ($box.width×$box.height)', ({ box }) => {
      const ctx = makeCtx(box, registry)
      const node = tlsLStack.layout(
        { gap: 'md', children: makeChildren(3) } as any,
        ctx
      )
      assertValidNode(node)
      expect(node.k).toBe('group')
      expect(node.children).toHaveLength(3)
    })
  })

  describe('layout with no children', () => {
    it('returns an empty group', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsLStack.layout({ gap: 'md' } as any, ctx)
      expect(node.k).toBe('group')
      expect(node.children).toHaveLength(0)
    })
  })

  describe('child positioning', () => {
    it('stacks children vertically with md gap', () => {
      const box = { width: 960, height: 300 }
      const ctx = makeCtx(box, registry)
      const node = tlsLStack.layout(
        { gap: 'md', children: makeChildren(3) } as any,
        ctx
      )
      // 3 children, 2 gaps of 24 (md) each = 48 total gap
      // Each child: (300 - 48) / 3 = 84
      expect(node.children).toHaveLength(3)
      const c0 = node.children[0]
      const c1 = node.children[1]
      const c2 = node.children[2]
      expect(c0.box.y).toBe(0)
      expect(c1.box.y).toBe(84 + 24)
      expect(c2.box.y).toBe(2 * (84 + 24))
      // All children span full width
      expect(c0.box.width).toBe(960)
      expect(c1.box.width).toBe(960)
      expect(c2.box.width).toBe(960)
    })

    it('single child fills the box', () => {
      const box = { width: 960, height: 540 }
      const ctx = makeCtx(box, registry)
      const node = tlsLStack.layout(
        { gap: 'md', children: makeChildren(1) } as any,
        ctx
      )
      expect(node.children).toHaveLength(1)
      expect(node.children[0].box.height).toBe(540)
    })
  })
})
