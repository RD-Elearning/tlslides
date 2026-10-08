/**
 * Geometry tests for tls.l.field — full-bleed background.
 */

import { tlsLField } from './index'
import { makeCtx, makeRegistry, SIZES, assertValidNode } from '../test-helpers'

describe('tls.l.field', () => {
  const registry = makeRegistry()

  describe('layout at 3 sizes', () => {
    it.each(SIZES)('produces valid tree at $label ($box.width×$box.height)', ({ box }) => {
      const ctx = makeCtx(box, registry)
      const node = tlsLField.layout({} as any, ctx)
      assertValidNode(node)
      expect(node.k).toBe('group')
    })
  })

  describe('background rect', () => {
    it('contains a single full-size rect', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsLField.layout({} as any, ctx)
      expect(node.children).toHaveLength(1)
      const rect = node.children[0]
      expect(rect.k).toBe('rect')
      expect(rect.box).toEqual({ x: 0, y: 0, width: 960, height: 540 })
    })
  })
})
