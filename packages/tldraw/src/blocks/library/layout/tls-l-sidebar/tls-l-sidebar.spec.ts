/**
 * Geometry tests for tls.l.sidebar — sidebar + main content.
 */

import { tlsLSidebar } from './index'
import { makeCtx, makeRegistry, makeChildren, SIZES, assertValidNode } from '../test-helpers'

describe('tls.l.sidebar', () => {
  const registry = makeRegistry()

  describe('layout at 3 sizes with 2 children', () => {
    it.each(SIZES)('produces valid tree at $label ($box.width×$box.height)', ({ box }) => {
      const ctx = makeCtx(box, registry)
      const node = tlsLSidebar.layout(
        { sidebarWidth: 320, gutter: 'md', sidebarSide: 'start', children: makeChildren(2) } as any,
        ctx
      )
      assertValidNode(node)
      expect(node.k).toBe('group')
      expect(node.children).toHaveLength(2)
    })
  })

  describe('sidebar on start', () => {
    it('sidebar is the first split panel', () => {
      const box = { width: 1000, height: 500 }
      const ctx = makeCtx(box, registry)
      const node = tlsLSidebar.layout(
        { sidebarWidth: 320, gutter: 'md', sidebarSide: 'start', children: makeChildren(2) } as any,
        ctx
      )
      const sidebar = node.children[0]
      const main = node.children[1]
      // ratio = 320/1000 = 0.32, splitBox: available = 1000 - 24 = 976
      // w1 = round(976 * 0.32) = 312
      expect(sidebar.box.width).toBe(312)
      expect(main.box.x).toBe(312 + 24)
    })
  })

  describe('sidebar on end', () => {
    it('main is the first split panel', () => {
      const box = { width: 1000, height: 500 }
      const ctx = makeCtx(box, registry)
      const node = tlsLSidebar.layout(
        { sidebarWidth: 320, gutter: 'md', sidebarSide: 'end', children: makeChildren(2) } as any,
        ctx
      )
      const main = node.children[0]
      const sidebar = node.children[1]
      expect(sidebar.box.x).toBeGreaterThan(main.box.x)
    })
  })

  describe('single child', () => {
    it('renders one panel', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsLSidebar.layout(
        { sidebarWidth: 320, gutter: 'md', sidebarSide: 'start', children: makeChildren(1) } as any,
        ctx
      )
      expect(node.children).toHaveLength(1)
    })
  })
})
