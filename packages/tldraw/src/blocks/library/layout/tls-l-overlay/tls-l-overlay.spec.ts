/**
 * Geometry tests for tls.l.overlay — layered children (z-stacked).
 */

import { tlsLOverlay } from './index'
import { makeCtx, makeRegistry, makeChildren, SIZES, assertValidNode } from '../test-helpers'

describe('tls.l.overlay', () => {
  const registry = makeRegistry()

  describe('layout at 3 sizes with 3 children', () => {
    it.each(SIZES)('produces valid tree at $label ($box.width×$box.height)', ({ box }) => {
      const ctx = makeCtx(box, registry)
      const node = tlsLOverlay.layout(
        { children: makeChildren(3) } as any,
        ctx
      )
      assertValidNode(node)
      expect(node.k).toBe('group')
      expect(node.children).toHaveLength(3)
    })
  })

  describe('all children fill the full box', () => {
    it('each child has the same box as the parent', () => {
      const box = { width: 960, height: 540 }
      const ctx = makeCtx(box, registry)
      const node = tlsLOverlay.layout(
        { children: makeChildren(3) } as any,
        ctx
      )
      for (const child of node.children) {
        expect(child.box).toEqual({ x: 0, y: 0, width: 960, height: 540 })
      }
    })
  })

  describe('clip is set', () => {
    it('root group has clip: true', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsLOverlay.layout(
        { children: makeChildren(2) } as any,
        ctx
      )
      expect(node.clip).toBe(true)
    })
  })

  describe('no children', () => {
    it('returns empty group', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsLOverlay.layout({} as any, ctx)
      expect(node.children).toHaveLength(0)
    })
  })
})
