/**
 * Geometry tests for tls.l.footer — content + footer.
 */

import { tlsLFooter } from './index'
import { makeCtx, makeRegistry, makeChildren, SIZES, assertValidNode } from '../test-helpers'

describe('tls.l.footer', () => {
  const registry = makeRegistry()

  describe('layout at 3 sizes with 2 children', () => {
    it.each(SIZES)('produces valid tree at $label ($box.width×$box.height)', ({ box }) => {
      const ctx = makeCtx(box, registry)
      const node = tlsLFooter.layout(
        { footerHeight: 120, gutter: 'md', children: makeChildren(2) } as any,
        ctx
      )
      assertValidNode(node)
      expect(node.k).toBe('group')
      expect(node.children).toHaveLength(2)
    })
  })

  describe('vertical split', () => {
    it('main area is on top, footer on bottom', () => {
      const box = { width: 960, height: 600 }
      const ctx = makeCtx(box, registry)
      const node = tlsLFooter.layout(
        { footerHeight: 120, gutter: 'md', children: makeChildren(2) } as any,
        ctx
      )
      const main = node.children[0]
      const footer = node.children[1]
      // ratio = 1 - 120/600 = 0.8
      // splitBox with y-axis: available = 600 - 24 = 576, h1 = round(576 * 0.8) = 461
      expect(main.box.height).toBe(461)
      expect(footer.box.y).toBe(461 + 24)
      expect(footer.box.height).toBe(600 - 461 - 24)
    })
  })

  describe('single child (content only)', () => {
    it('renders only the main content', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsLFooter.layout(
        { footerHeight: 120, gutter: 'md', children: makeChildren(1) } as any,
        ctx
      )
      expect(node.children).toHaveLength(1)
    })
  })
})
