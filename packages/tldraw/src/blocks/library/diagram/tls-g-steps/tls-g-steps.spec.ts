/**
 * Tests for tls.g.steps — steps diagram block.
 */

import { tlsGSteps } from './index'
import { makeCtx, assertValidNode } from '../../layout/test-helpers'

describe('tls.g.steps', () => {
  const registry = { get: () => undefined }

  describe('layout', () => {
    it('produces valid tree with steps', () => {
      const ctx = makeCtx({ width: 800, height: 200 }, registry as any)
      const node = tlsGSteps.layout(
        {
          steps: [
            { title: 'Step 1' },
            { title: 'Step 2' },
            { title: 'Step 3' },
          ],
          direction: 'horizontal',
          connector: 'line',
        } as any,
        ctx
      )
      assertValidNode(node)
      expect(node.k).toBe('group')
    })
  })

  describe('empty steps', () => {
    it('returns empty group', () => {
      const ctx = makeCtx({ width: 200, height: 200 }, registry as any)
      const node = tlsGSteps.layout({ steps: [] } as any, ctx)
      expect(node.k).toBe('group')
      expect(node.children).toHaveLength(0)
    })
  })
})