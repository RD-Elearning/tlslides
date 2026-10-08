/**
 * Geometry tests for tls.l.grid-guide — alignment grid (editorOnly).
 */

import { tlsLGridGuide } from './index'
import { makeCtx, makeRegistry, SIZES, assertValidNode } from '../test-helpers'

describe('tls.l.grid-guide', () => {
  const registry = makeRegistry()

  describe('layout at 3 sizes', () => {
    it.each(SIZES)('produces valid tree at $label ($box.width×$box.height)', ({ box }) => {
      const ctx = makeCtx(box, registry)
      const node = tlsLGridGuide.layout({ divisions: 3 } as any, ctx)
      assertValidNode(node)
      expect(node.k).toBe('group')
    })
  })

  describe('guide lines', () => {
    it('3 divisions produces 2 vertical + 2 horizontal lines = 4 total', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsLGridGuide.layout({ divisions: 3 } as any, ctx)
      // 2 vertical + 2 horizontal = 4 lines
      expect(node.children).toHaveLength(4)
    })

    it('4 divisions produces 3 + 3 = 6 lines', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsLGridGuide.layout({ divisions: 4 } as any, ctx)
      expect(node.children).toHaveLength(6)
    })

    it('all lines are line nodes', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsLGridGuide.layout({ divisions: 3 } as any, ctx)
      for (const child of node.children) {
        expect(child.k).toBe('line')
      }
    })
  })

  describe('headless mode', () => {
    it('returns empty children when headless', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      ctx.headless = true
      const node = tlsLGridGuide.layout({ divisions: 3 } as any, ctx)
      expect(node.children).toHaveLength(0)
    })
  })
})
