/**
 * Geometry tests for tls.l.spacer — empty space.
 */

import { tlsLSpacer } from './index'
import { makeCtx, makeRegistry, SIZES, assertValidNode } from '../test-helpers'

describe('tls.l.spacer', () => {
  const registry = makeRegistry()

  describe('layout at 3 sizes', () => {
    it.each(SIZES)('produces valid tree at $label ($box.width×$box.height)', ({ box }) => {
      const ctx = makeCtx(box, registry)
      const node = tlsLSpacer.layout({} as any, ctx)
      assertValidNode(node)
      expect(node.k).toBe('group')
    })
  })

  describe('box matches input', () => {
    it('fills the provided box', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsLSpacer.layout({} as any, ctx)
      expect(node.box).toEqual({ x: 0, y: 0, width: 960, height: 540 })
    })
  })

  describe('no children', () => {
    it('always returns empty children', () => {
      const ctx = makeCtx({ width: 480, height: 270 }, registry)
      const node = tlsLSpacer.layout({} as any, ctx)
      expect(node.children).toHaveLength(0)
    })
  })
})
