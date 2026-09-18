/**
 * Geometry tests for tls.l.overlay — layered children (z-stacked).
 */

import { tlsLOverlay } from './index'
import { makeCtx, makeRegistry, makeChildren, SIZES, assertValidNode } from '../test-helpers'
import type { LayoutNode, Paint } from '../../../types'

/** Narrow a `LayoutNode` to its group variant (the discriminated union has no shared children). */
function asGroup(node: LayoutNode): Extract<LayoutNode, { k: 'group' }> {
  if (node.k !== 'group') throw new Error(`expected group, got ${node.k}`)
  return node
}

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
      // surface + 3 children = 4 nodes
      expect(asGroup(node).children).toHaveLength(4)
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
      for (const child of asGroup(node).children) {
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
      expect(asGroup(node).clip).toBe(true)
    })
  })

  describe('surface background', () => {
    it('first child is a full-box surface rect', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsLOverlay.layout({ children: makeChildren(1) } as any, ctx)
      const surface = asGroup(node).children[0]
      expect(surface.k).toBe('rect')
      expect(surface.part).toBe('surface')
      expect(surface.box).toEqual({ x: 0, y: 0, width: 960, height: 540 })
    })

    it('uses the instance Paint when style.surface is a gradient (B.5 item 6)', () => {
      const paint: Paint = {
        type: 'linearGradient',
        angle: 0,
        stops: [
          { at: 0, color: '#111111' },
          { at: 1, color: '#EEEEEE' },
        ],
      }
      const ctx = makeCtx({ width: 960, height: 540 }, registry, { surface: paint })
      const node = tlsLOverlay.layout({ children: makeChildren(1) } as any, ctx)
      const surface = asGroup(node).children[0] as Extract<LayoutNode, { k: 'rect' }>
      expect(surface.fill).toEqual(paint)
    })
  })

  describe('no children', () => {
    it('returns just the surface rect', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsLOverlay.layout({} as any, ctx)
      const children = asGroup(node).children
      expect(children).toHaveLength(1)
      expect(children[0].part).toBe('surface')
    })
  })
})
