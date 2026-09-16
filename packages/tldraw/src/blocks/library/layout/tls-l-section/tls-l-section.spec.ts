/**
 * Geometry tests for tls.l.section — titled section.
 */

import { tlsLSection } from './index'
import { makeCtx, makeRegistry, makeChildren, SIZES, assertValidNode } from '../test-helpers'

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
      // title + divider + 2 children = 4 nodes
      expect(node.children).toHaveLength(4)
    })
  })

  describe('title node', () => {
    it('first child is a text node', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsLSection.layout(
        { title: 'Hello', gap: 'sm', children: makeChildren(1) } as any,
        ctx
      )
      const title = node.children[0]
      expect(title.k).toBe('text')
      expect(title.part).toBe('title')
    })
  })

  describe('divider node', () => {
    it('second child is a line', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsLSection.layout(
        { title: 'Hello', gap: 'sm', children: makeChildren(1) } as any,
        ctx
      )
      const divider = node.children[1]
      expect(divider.k).toBe('line')
      expect(divider.part).toBe('divider')
    })
  })

  describe('no children', () => {
    it('returns title + divider only', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsLSection.layout(
        { title: 'Empty', gap: 'sm' } as any,
        ctx
      )
      expect(node.children).toHaveLength(2) // title + divider
    })
  })
})
