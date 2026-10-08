/**
 * Geometry tests for tls.l.card — filled container with padding.
 */

import { tlsLCard } from './index'
import { makeCtx, makeRegistry, makeChildren, SIZES, assertValidNode } from '../test-helpers'

describe('tls.l.card', () => {
  const registry = makeRegistry()

  describe('layout at 3 sizes with 1 child', () => {
    it.each(SIZES)('produces valid tree at $label ($box.width×$box.height)', ({ box }) => {
      const ctx = makeCtx(box, registry)
      const node = tlsLCard.layout(
        { padding: 'md', children: makeChildren(1) } as any,
        ctx
      )
      assertValidNode(node)
      expect(node.k).toBe('group')
      // group has a background rect + child
      expect(node.children.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('background rect', () => {
    it('first child is a full-size background rect', () => {
      const box = { width: 960, height: 540 }
      const ctx = makeCtx(box, registry)
      const node = tlsLCard.layout(
        { padding: 'md', children: makeChildren(1) } as any,
        ctx
      )
      const bg = node.children[0]
      expect(bg.k).toBe('rect')
      expect(bg.box).toEqual({ x: 0, y: 0, width: 960, height: 540 })
    })
  })

  describe('content inset by padding', () => {
    it('child is inset by md (24) on all sides', () => {
      const box = { width: 960, height: 540 }
      const ctx = makeCtx(box, registry)
      const node = tlsLCard.layout(
        { padding: 'md', children: makeChildren(1) } as any,
        ctx
      )
      const content = node.children[1] // second child is the content
      expect(content.box.x).toBe(24)
      expect(content.box.y).toBe(24)
      expect(content.box.width).toBe(960 - 48)
      expect(content.box.height).toBe(540 - 48)
    })
  })

  describe('no children', () => {
    it('returns background rect only', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsLCard.layout({ padding: 'md' } as any, ctx)
      expect(node.children).toHaveLength(1)
      expect(node.children[0].k).toBe('rect')
    })
  })
})
