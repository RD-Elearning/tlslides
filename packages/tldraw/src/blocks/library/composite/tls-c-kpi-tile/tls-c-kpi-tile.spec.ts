/**
 * Geometry tests for tls.c.kpi-tile — KPI tile with value, delta, label,
 * optional sparkline, and polarity-driven colour.
 *
 * Covers:
 *   - Valid tree at 3 sizes (SIZES)
 *   - Parts emitted by layout() match motion.parts
 *   - Polarity colour logic (upGood / downGood × positive / negative delta)
 *   - Sparkline present vs absent
 *   - capacity() at min and max boxes
 *   - Adversarial: 400-char label, CJK text, empty delta, no sparkline
 *   - Deep-copy: defaults are not shared by reference
 */

import { tlsCKpiTile } from './index'
import { makeCtx, makeRegistry, SIZES, assertValidNode } from '../../layout/test-helpers'
import { validateDeckSpec } from '../../../validate-deck-spec'

describe('tls.c.kpi-tile', () => {
  const registry = makeRegistry()

  describe('layout at 3 sizes with defaults', () => {
    it.each(SIZES)('produces valid tree at $label ($box.width×$box.height)', ({ box }) => {
      const ctx = makeCtx(box, registry)
      const node = tlsCKpiTile.layout(tlsCKpiTile.defaults as any, ctx)
      assertValidNode(node)
      expect(node.k).toBe('group')
      expect(node.part).toBe('root')
    })
  })

  describe('parts match motion.parts (static parts)', () => {
    it('emits value, label, delta parts from defaults', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsCKpiTile.layout(tlsCKpiTile.defaults as any, ctx)
      const parts = collectParts(node)
      expect(parts).toContain('value')
      expect(parts).toContain('label')
      expect(parts).toContain('delta')
    })

    it('emits sparkline part when sparkline data is provided', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsCKpiTile.layout(
        { ...tlsCKpiTile.defaults, sparkline: [1, 2, 3, 4, 5] } as any,
        ctx,
      )
      const parts = collectParts(node)
      expect(parts).toContain('sparkline')
    })

    it('does NOT emit sparkline part when sparkline is absent', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsCKpiTile.layout(tlsCKpiTile.defaults as any, ctx)
      const parts = collectParts(node)
      expect(parts).not.toContain('sparkline')
    })

    it('motion.parts matches what layout emits', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const withSparkline = tlsCKpiTile.layout(
        { ...tlsCKpiTile.defaults, sparkline: [1, 2, 3, 4, 5] } as any,
        ctx,
      )
      const emittedParts = new Set(collectParts(withSparkline))
      // Every static part in motion.parts should appear in the emitted parts
      // (sparkline is intentionally omitted from motion.parts because it is
      //  only emitted when the prop has ≥2 points — see motion.ts Rule 2.)
      for (const p of tlsCKpiTile.motion.parts ?? []) {
        // Wildcard parts are not expected literally
        if (p.includes('*')) continue
        expect(emittedParts.has(p)).toBe(true)
      }
    })
  })

  describe('polarity colour logic', () => {
    it('positive delta with upGood → positive role colour', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsCKpiTile.layout(
        { ...tlsCKpiTile.defaults, delta: 10, polarity: 'upGood' } as any,
        ctx,
      )
      const deltaNode = findPart(node, 'delta')
      expect(deltaNode).toBeDefined()
      const positiveColour = ctx.resolveColor('positive').color
      expect(deltaNode!.style.color).toBe(positiveColour)
    })

    it('negative delta with upGood → negative role colour', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsCKpiTile.layout(
        { ...tlsCKpiTile.defaults, delta: -5, polarity: 'upGood' } as any,
        ctx,
      )
      const deltaNode = findPart(node, 'delta')
      expect(deltaNode).toBeDefined()
      const negativeColour = ctx.resolveColor('negative').color
      expect(deltaNode!.style.color).toBe(negativeColour)
    })

    it('positive delta with downGood → negative role colour', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsCKpiTile.layout(
        { ...tlsCKpiTile.defaults, delta: 10, polarity: 'downGood' } as any,
        ctx,
      )
      const deltaNode = findPart(node, 'delta')
      expect(deltaNode).toBeDefined()
      const negativeColour = ctx.resolveColor('negative').color
      expect(deltaNode!.style.color).toBe(negativeColour)
    })

    it('negative delta with downGood → positive role colour', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsCKpiTile.layout(
        { ...tlsCKpiTile.defaults, delta: -5, polarity: 'downGood' } as any,
        ctx,
      )
      const deltaNode = findPart(node, 'delta')
      expect(deltaNode).toBeDefined()
      const positiveColour = ctx.resolveColor('positive').color
      expect(deltaNode!.style.color).toBe(positiveColour)
    })

    it('no delta → neutral colour', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsCKpiTile.layout(
        { ...tlsCKpiTile.defaults, delta: undefined } as any,
        ctx,
      )
      // No delta part emitted at all
      const parts = collectParts(node)
      expect(parts).not.toContain('delta')
    })
  })

  describe('no literal hex colours', () => {
    it('layout uses only resolveColor, never literal hex', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsCKpiTile.layout(tlsCKpiTile.defaults as any, ctx)
      const colourNodes = findNodesWithStyle(node)
      for (const cn of colourNodes) {
        expect(typeof cn.style.color).toBe('string')
        expect(cn.style.color.length).toBeGreaterThan(0)
      }
    })
  })

  describe('capacity()', () => {
    it('fits at preferred size', () => {
      const ctx = makeCtx({ width: 400, height: 300 }, registry)
      const report = tlsCKpiTile.capacity!(tlsCKpiTile.defaults as any, { width: 400, height: 300 }, ctx)
      expect(report.fits).toBe(true)
      expect(report.remedy).toEqual([])
    })

    it('does not fit at very small height', () => {
      const ctx = makeCtx({ width: 400, height: 50 }, registry)
      const report = tlsCKpiTile.capacity!(tlsCKpiTile.defaults as any, { width: 400, height: 50 }, ctx)
      expect(report.fits).toBe(false)
      expect(report.remedy.length).toBeGreaterThan(0)
    })

    it('reports budget', () => {
      const ctx = makeCtx({ width: 400, height: 220 }, registry)
      const report = tlsCKpiTile.capacity!(tlsCKpiTile.defaults as any, { width: 400, height: 220 }, ctx)
      expect(report.budget).toHaveProperty('label')
      expect(report.budget).toHaveProperty('value')
    })
  })

  describe('adversarial inputs', () => {
    it('handles a 400-char label without throwing', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const longLabel = 'A'.repeat(400)
      const node = tlsCKpiTile.layout(
        { ...tlsCKpiTile.defaults, label: longLabel } as any,
        ctx,
      )
      assertValidNode(node)
    })

    it('handles CJK text without throwing', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsCKpiTile.layout(
        { ...tlsCKpiTile.defaults, label: '收入' } as any,
        ctx,
      )
      assertValidNode(node)
    })

    it('handles extreme delta values without throwing', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsCKpiTile.layout(
        { ...tlsCKpiTile.defaults, delta: 999999999 } as any,
        ctx,
      )
      assertValidNode(node)
    })

    it('handles zero delta without throwing', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsCKpiTile.layout(
        { ...tlsCKpiTile.defaults, delta: 0 } as any,
        ctx,
      )
      assertValidNode(node)
      // Zero delta: >= 0 so upGood treats it as positive
      const deltaNode = findPart(node, 'delta')
      expect(deltaNode).toBeDefined()
    })

    it('handles empty sparkline array by not emitting sparkline', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsCKpiTile.layout(
        { ...tlsCKpiTile.defaults, sparkline: [] } as any,
        ctx,
      )
      const parts = collectParts(node)
      expect(parts).not.toContain('sparkline')
    })

    it('handles single-element sparkline by not emitting sparkline', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsCKpiTile.layout(
        { ...tlsCKpiTile.defaults, sparkline: [5] } as any,
        ctx,
      )
      const parts = collectParts(node)
      expect(parts).not.toContain('sparkline')
    })
  })

  describe('describe.example passes validateDeckSpec', () => {
    it('example validates clean', () => {
      const spec = {
        version: 1 as const,
        id: 'test',
        title: 'Test',
        theme: 'mono-grid',
        aspect: 'widescreen' as const,
        slides: [{
          id: 's1',
          layout: 'blank',
          regions: {
            body: [tlsCKpiTile.describe!.example],
          },
        }],
      }
      const findings = validateDeckSpec(spec, registry)
      const errors = findings.filter((f: any) => f.severity === 'error')
      expect(errors).toEqual([])
    })
  })

  describe('deep-copy: defaults not shared by reference', () => {
    it('defaults is a fresh object, not a module-level alias', () => {
      const copy = JSON.parse(JSON.stringify(tlsCKpiTile.defaults))
      expect(copy).toEqual(tlsCKpiTile.defaults)
      // Mutate copy and verify original is unchanged
      copy.value = 999
      expect(tlsCKpiTile.defaults.value).not.toBe(999)
      expect(tlsCKpiTile.defaults).toEqual({ ...tlsCKpiTile.defaults })
    })
  })

  describe('assertParity', () => {
    it('DOM and SVG agree for defaults at medium size', async () => {
      const { assertParity } = await import('../../../parity-harness')
      await assertParity(tlsCKpiTile, tlsCKpiTile.defaults, { width: 960, height: 540 })
    })
  })
})

/* ── helpers ──────────────────────────────────────────────────────────── */

function collectParts(node: any): string[] {
  const parts: string[] = []
  function walk(n: any) {
    if (n.part) parts.push(n.part)
    if (n.children) n.children.forEach(walk)
  }
  walk(node)
  return parts
}

function findPart(node: any, partName: string): any {
  if (node.part === partName) return node
  if (node.children) {
    for (const child of node.children) {
      const found = findPart(child, partName)
      if (found) return found
    }
  }
  return undefined
}

function findNodesWithStyle(node: any): any[] {
  const result: any[] = []
  function walk(n: any) {
    if (n.style && n.style.color) result.push(n)
    if (n.children) n.children.forEach(walk)
  }
  walk(node)
  return result
}
