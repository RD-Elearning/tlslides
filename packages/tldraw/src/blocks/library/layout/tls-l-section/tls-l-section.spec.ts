/**
 * Geometry tests for tls.l.section — titled section.
 */

import { tlsLSection } from './index'
import { makeCtx, makeRegistry, makeChildren, SIZES, assertValidNode } from '../test-helpers'
import type { LayoutNode, Paint } from '../../../types'

/** Narrow a `LayoutNode` to its group variant (the discriminated union has no shared children). */
function asGroup(node: LayoutNode): Extract<LayoutNode, { k: 'group' }> {
  if (node.k !== 'group') throw new Error(`expected group, got ${node.k}`)
  return node
}

describe('tls.l.section', () => {
  const registry = makeRegistry()

  describe('layout at 3 sizes with 2 children', () => {
    it.each(SIZES)('produces valid tree at $label ($box.width×$box.height)', ({ box }) => {
      const ctx = makeCtx(box, registry)
      const node = tlsLSection.layout(
        { title: 'My Section', gap: 'sm', children: makeChildren(2) } as any,
        ctx
      )
      assertValidNode(node)
      expect(node.k).toBe('group')
      // surface + title + divider + 1 stack group (containing 2 children) = 4 nodes
      expect(asGroup(node).children).toHaveLength(4)
    })
  })

  describe('title node', () => {
    it('second child is a text node', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsLSection.layout(
        { title: 'Hello', gap: 'sm', children: makeChildren(1) } as any,
        ctx
      )
      const title = asGroup(node).children[1]
      expect(title.k).toBe('text')
      expect(title.part).toBe('title')
    })
  })

  describe('divider node', () => {
    it('third child is a thin rect', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsLSection.layout(
        { title: 'Hello', gap: 'sm', children: makeChildren(1) } as any,
        ctx
      )
      const divider = asGroup(node).children[2]
      expect(divider.k).toBe('rect')
      expect(divider.part).toBe('divider')
      if (divider.k !== 'rect') throw new Error('expected rect')
      expect(divider.box.height).toBe(1)
    })
  })

  describe('surface background', () => {
    it('first child is a full-box surface rect', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsLSection.layout({ title: 'Hello' } as any, ctx)
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
      const node = tlsLSection.layout({ title: 'Hello' } as any, ctx)
      const surface = asGroup(node).children[0] as Extract<LayoutNode, { k: 'rect' }>
      expect(surface.fill).toEqual(paint)
    })
  })

  describe('no children', () => {
    it('returns surface + title + divider only', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsLSection.layout(
        { title: 'Empty', gap: 'sm' } as any,
        ctx
      )
      expect(asGroup(node).children).toHaveLength(3) // surface + title + divider
    })
  })
})
