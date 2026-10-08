/**
 * Geometry tests for tls.l.row — horizontal row with gap.
 */

import { tlsLRow } from './index'
import { makeCtx, makeRegistry, makeChildren, SIZES, assertValidNode } from '../test-helpers'

describe('tls.l.row', () => {
  const registry = makeRegistry()

  describe('layout at 3 sizes with 3 children', () => {
    it.each(SIZES)('produces valid tree at $label ($box.width×$box.height)', ({ box }) => {
      const ctx = makeCtx(box, registry)
      const node = tlsLRow.layout(
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
      const node = tlsLRow.layout({ gap: 'md' } as any, ctx)
      expect(node.k).toBe('group')
      expect(node.children).toHaveLength(0)
    })
  })

  describe('child positioning', () => {
    it('distributes children horizontally with md gap', () => {
      const box = { width: 960, height: 540 }
      const ctx = makeCtx(box, registry)
      const node = tlsLRow.layout(
        { gap: 'md', children: makeChildren(3) } as any,
        ctx
      )
      // 3 children, 2 gaps of 24 = 48 total gap
      // Each child: (960 - 48) / 3 = 304
      expect(node.children).toHaveLength(3)
      const c0 = node.children[0]
      const c1 = node.children[1]
      const c2 = node.children[2]
      expect(c0.box.x).toBe(0)
      expect(c1.box.x).toBe(304 + 24)
      expect(c2.box.x).toBe(2 * (304 + 24))
      // All children span full height
      expect(c0.box.height).toBe(540)
      expect(c1.box.height).toBe(540)
      expect(c2.box.height).toBe(540)
    })
  })
})
