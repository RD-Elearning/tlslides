/**
 * Tests for tls.v.counter — animated counter block.
 *
 * Phase 7: Basic rendering tests.
 */

import { tlsVCounter } from './index'
import { makeCtx, assertValidNode } from '../../layout/test-helpers'

describe('tls.v.counter', () => {
  const registry = { get: () => undefined }

  describe('layout', () => {
    it('produces valid text node with value', () => {
      const ctx = makeCtx({ width: 100, height: 100 }, registry as any)
      const node = tlsVCounter.layout(
        { from: 0, to: 100, duration: 1 } as any,
        ctx
      )
      assertValidNode(node)
      expect(node.k).toBe('text')
    })
  })
})