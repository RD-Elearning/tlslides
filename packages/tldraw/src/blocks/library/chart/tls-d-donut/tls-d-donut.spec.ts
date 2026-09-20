/**
 * Tests for tls.d.donut — donut chart block.
 *
 * Phase 6.1: Basic rendering tests.
 */

import { tlsDDonut } from './index'
import { makeCtx, SIZES, assertValidNode } from '../../layout/test-helpers'

describe('tls.d.donut', () => {
  describe('layout at 3 sizes with 4 slices', () => {
    const registry = {
      get: () => undefined,
    }

    it.each(SIZES)('produces valid tree at $label ($box.width×$box.height)', ({ box }) => {
      const ctx = makeCtx(box, registry as any)
      const node = tlsDDonut.layout(
        {
          slices: [
            { value: 30, color: 'accent' },
            { value: 25, color: 'accent' },
            { value: 25, color: 'accent' },
            { value: 20, color: 'accent' },
          ],
          total: 100,
        } as any,
        ctx
      )
      assertValidNode(node)
      expect(node.k).toBe('group')
      expect(node.children).toHaveLength(4)
    })
  })

  describe('empty slices', () => {
    it('returns empty group', () => {
      const ctx = makeCtx({ width: 200, height: 200 }, { get: () => undefined } as any)
      const node = tlsDDonut.layout({ slices: [], total: 100 } as any, ctx)
      expect(node.k).toBe('group')
      expect(node.children).toHaveLength(0)
    })
  })
})