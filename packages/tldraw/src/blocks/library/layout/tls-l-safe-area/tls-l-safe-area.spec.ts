/**
 * Geometry tests for tls.l.safe-area — content safe area (editorOnly).
 */

import { tlsLSafeArea } from './index'
import { makeCtx, makeRegistry, makeChildren, SIZES, assertValidNode } from '../test-helpers'

describe('tls.l.safe-area', () => {
  const registry = makeRegistry()

  describe('layout at 3 sizes with 2 children', () => {
    it.each(SIZES)('produces valid tree at $label ($box.width×$box.height)', ({ box }) => {
      const ctx = makeCtx(box, registry)
      const node = tlsLSafeArea.layout(
        { inset: 'md', children: makeChildren(2) } as any,
        ctx
      )
      assertValidNode(node)
      expect(node.k).toBe('group')
      expect(node.children).toHaveLength(2)
    })
  })

  describe('editor mode inset', () => {
    it('children are inset by md (24)', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsLSafeArea.layout(
        { inset: 'md', children: makeChildren(1) } as any,
        ctx
      )
      const child = node.children[0]
      expect(child.box.x).toBe(24)
      expect(child.box.y).toBe(24)
      expect(child.box.width).toBe(960 - 48)
      expect(child.box.height).toBe(540 - 48)
    })
  })

  describe('headless mode', () => {
    it('children fill full box when headless', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      // Override headless
      ctx.headless = true
      const node = tlsLSafeArea.layout(
        { inset: 'md', children: makeChildren(1) } as any,
        ctx
      )
      const child = node.children[0]
      expect(child.box.x).toBe(0)
      expect(child.box.y).toBe(0)
      expect(child.box.width).toBe(960)
      expect(child.box.height).toBe(540)
    })
  })

  describe('different inset tokens', () => {
    it('lg inset is 32', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsLSafeArea.layout(
        { inset: 'lg', children: makeChildren(1) } as any,
        ctx
      )
      const child = node.children[0]
      expect(child.box.x).toBe(32)
      expect(child.box.width).toBe(960 - 64)
    })
  })
})
