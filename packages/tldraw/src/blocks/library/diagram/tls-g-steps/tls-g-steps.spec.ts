/**
 * Tests for tls.g.steps — steps diagram block.
 */

import { tlsGSteps } from './index'
import { assertExampleFits, assertChartSane } from '../../data/_chart/chart-test'
import { assertNoOverlap, layoutOf, rectsOf, assertMotionTargetsExist } from '../diagram-test'
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

// RV07/08: the block's own example fits size.preferred and size.min (every line as wide as its glyphs).
describe('tls.g.steps example', () => {
  it('fits size.preferred and size.min', () => assertExampleFits(tlsGSteps))
  it('motion parts exist in the layout and use presets that animate', () => assertMotionTargetsExist(tlsGSteps))
})

describe('tls.g.steps adapts to its box (RV07)', () => {
  const steps = (n: number) => Array.from({ length: n }, (_, i) => ({ title: `Step ${i + 1}`, description: 'A short description of what happens in this step' }))
  const lay = (props: Record<string, unknown>, size: { width: number; height: number }) => layoutOf(tlsGSteps, props, size)

  it('keeps one row when it fits, wraps to two rows in a half-width box (no squashed columns)', () => {
    const wide = lay({ steps: steps(6) }, { width: 1100, height: 260 })
    const xs = new Set(rectsOf(wide, /\.badge$/).map((r) => Math.round(r.y)))
    expect(xs.size).toBe(1)
    const narrow = lay({ steps: steps(6) }, { width: 420, height: 320 })
    const rows = new Set(rectsOf(narrow, /\.badge$/).map((r) => Math.round(r.y)))
    expect(rows.size).toBeGreaterThan(1)
    
    assertChartSane(narrow, { width: 420, height: 320 })
  })

  it('drops descriptions before overflowing a short box', () => {
    const size = { width: 700, height: 90 }
    const tree = lay({ steps: steps(4) }, size)
    assertChartSane(tree, size)
    expect(rectsOf(tree, /description/).length).toBe(0)
  })

  it('the connector never crosses a row end and the arrow tip stops at the next badge', () => {
    const tree = lay({ steps: steps(4), connector: 'arrow' }, { width: 300, height: 360 })
    const conns = rectsOf(tree, /^step\[\d\]\.connector$/)
    expect(conns.length).toBeLessThan(3)
    assertNoOverlap(rectsOf(tree, /badge|title|description/))
  })

  it('vertical: badge left, text right, rail between badges, everything inside the box', () => {
    const size = { width: 400, height: 320 }
    const tree = lay({ steps: steps(4), direction: 'vertical', connector: 'line' }, size)
    assertChartSane(tree, size)
    const badges = rectsOf(tree, /\.badge$/)
    expect(new Set(badges.map((b) => Math.round(b.x))).size).toBe(1)
    const titles = rectsOf(tree, /\.title$/)
    expect(titles[0].x).toBeGreaterThan(badges[0].x + badges[0].width)
    expect(rectsOf(tree, /\.connector$/)).toHaveLength(3)
  })

  it('accepts the legacy JSON-string form of steps', () => {
    const tree = lay({ steps: JSON.stringify(steps(3)) }, { width: 800, height: 200 })
    expect(rectsOf(tree, /\.badge$/)).toHaveLength(3)
  })
})
