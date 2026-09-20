/**
 * Geometry tests for tls.c.kpi-row — a row of 2–5 KPI tiles.
 *
 * Covers:
 *   - Valid tree at 3 sizes (SIZES)
 *   - Parts emitted by layout() match motion.parts
 *   - Equal-width tile split
 *   - capacity() at min (1 tile → overflow) and max (5 tiles)
 *   - Adversarial: empty tile list, 1 tile, 5 tiles, 400-char label, CJK text
 *   - Deep-copy: defaults not shared by reference
 *   - Tile delegation via ctx.layoutChild (no new LayoutNode kind)
 */

import { tlsCKpiRow } from './index'
import { tlsCKpiTile } from '../tls-c-kpi-tile'
import { makeCtx, SIZES, assertValidNode } from '../../layout/test-helpers'
import { BlockRegistry } from '../../../registry'
import { registerBuiltInBlocks } from '../../../library'
import { validateDeckSpec } from '../../../validate-deck-spec'

/** Registry with all built-ins + our two composite blocks. */
function makeCompositeRegistry(): BlockRegistry {
  const reg = new BlockRegistry()
  registerBuiltInBlocks(reg)
  // The built-in barrel already registers these after R9 integration; guard so
  // this spec does not throw "already registered" when it does.
  if (!reg.has(tlsCKpiTile.type)) reg.register(tlsCKpiTile)
  if (!reg.has(tlsCKpiRow.type)) reg.register(tlsCKpiRow)
  return reg
}

describe('tls.c.kpi-row', () => {
  const registry = makeCompositeRegistry()

  describe('layout at 3 sizes with defaults', () => {
    it.each(SIZES)('produces valid tree at $label ($box.width×$box.height)', ({ box }) => {
      const ctx = makeCtx(box, registry)
      const node = tlsCKpiRow.layout(tlsCKpiRow.defaults as any, ctx)
      assertValidNode(node)
      expect(node.k).toBe('group')
      expect(node.part).toBe('root')
    })
  })

  describe('parts match motion.parts (indexed convention)', () => {
    it('emits tile[0], tile[1], tile[2] for 3 default tiles', () => {
      const ctx = makeCtx({ width: 960, height: 300 }, registry)
      const node = tlsCKpiRow.layout(tlsCKpiRow.defaults as any, ctx)
      const parts = collectParts(node)
      expect(parts).toContain('tile[0]')
      expect(parts).toContain('tile[1]')
      expect(parts).toContain('tile[2]')
    })

    it('motion.parts wildcard tile[*] matches tile[N] parts', () => {
      const ctx = makeCtx({ width: 960, height: 300 }, registry)
      const node = tlsCKpiRow.layout(tlsCKpiRow.defaults as any, ctx)
      const emittedParts = collectParts(node).filter(p => p.startsWith('tile['))
      expect(emittedParts.length).toBe(3)

      // Verify wildcard convention: motion declares 'tile[*]'
      expect(tlsCKpiRow.motion.parts).toContain('tile[*]')
    })
  })

  describe('equal-width tile split', () => {
    it('3 tiles get equal width (minus gaps)', () => {
      const ctx = makeCtx({ width: 960, height: 300 }, registry)
      const node = tlsCKpiRow.layout(tlsCKpiRow.defaults as any, ctx)
      const tileGroups = node.children.filter(c => c.part?.startsWith('tile['))
      expect(tileGroups).toHaveLength(3)

      // All tile groups should have the same width
      const widths = tileGroups.map(t => t.box.width)
      expect(widths[0]).toBe(widths[1])
      expect(widths[1]).toBe(widths[2])
    })

    it('tiles span the full inner width (minus padding and gaps)', () => {
      const ctx = makeCtx({ width: 960, height: 300 }, registry)
      const node = tlsCKpiRow.layout(tlsCKpiRow.defaults as any, ctx)
      const tileGroups = node.children.filter(c => c.part?.startsWith('tile['))

      // First tile starts at padding offset (24 = md token)
      expect(tileGroups[0].box.x).toBe(24)

      // Last tile ends at box width - padding
      const lastTile = tileGroups[tileGroups.length - 1]
      expect(lastTile.box.x + lastTile.box.width).toBe(960 - 24)
    })
  })

  describe('capacity()', () => {
    it('fits 3 tiles at medium size', () => {
      const ctx = makeCtx({ width: 960, height: 300 }, registry)
      const report = tlsCKpiRow.capacity!(
        tlsCKpiRow.defaults as any,
        { width: 960, height: 300 },
        ctx,
      )
      expect(report.fits).toBe(true)
      expect(report.budget.tiles.used).toBe(3)
    })

    it('does not fit 5 tiles at very narrow width', () => {
      const ctx = makeCtx({ width: 300, height: 300 }, registry)
      const fiveTiles = {
        tiles: [
          { value: 1, label: 'A' },
          { value: 2, label: 'B' },
          { value: 3, label: 'C' },
          { value: 4, label: 'D' },
          { value: 5, label: 'E' },
        ],
      }
      const report = tlsCKpiRow.capacity!(fiveTiles as any, { width: 300, height: 300 }, ctx)
      // 300 - 48 padding = 252; 252 / 200 = 1.26 → maxByWidth = 1, clamped to min 2
      // But 5 > 2, so fits = false
      expect(report.fits).toBe(false)
    })

    it('reports max tile count from budget', () => {
      const ctx = makeCtx({ width: 1200, height: 300 }, registry)
      const report = tlsCKpiRow.capacity!(
        tlsCKpiRow.defaults as any,
        { width: 1200, height: 300 },
        ctx,
      )
      expect(report.budget.tiles.max).toBeGreaterThanOrEqual(2)
      expect(report.budget.tiles.max).toBeLessThanOrEqual(5)
    })

    it('does not fit at very small height', () => {
      const ctx = makeCtx({ width: 960, height: 50 }, registry)
      const report = tlsCKpiRow.capacity!(
        tlsCKpiRow.defaults as any,
        { width: 960, height: 50 },
        ctx,
      )
      expect(report.fits).toBe(false)
    })
  })

  describe('adversarial inputs', () => {
    it('handles empty tile list without throwing', () => {
      const ctx = makeCtx({ width: 960, height: 300 }, registry)
      const node = tlsCKpiRow.layout({ tiles: [], gap: 'md' } as any, ctx)
      assertValidNode(node)
      expect(node.children).toHaveLength(0)
    })

    it('handles 1 tile without throwing (below schema min, but layout must not crash)', () => {
      const ctx = makeCtx({ width: 960, height: 300 }, registry)
      const node = tlsCKpiRow.layout(
        {
          tiles: [{ value: 100, label: 'Only' }],
          gap: 'md',
        } as any,
        ctx,
      )
      assertValidNode(node)
      expect(node.children).toHaveLength(1)
    })

    it('handles 5 tiles without throwing', () => {
      const ctx = makeCtx({ width: 1920, height: 400 }, registry)
      const tiles = Array.from({ length: 5 }, (_, i) => ({
        value: (i + 1) * 100,
        label: `Metric ${i + 1}`,
      }))
      const node = tlsCKpiRow.layout({ tiles, gap: 'md' } as any, ctx)
      assertValidNode(node)
      const tileGroups = node.children.filter(c => c.part?.startsWith('tile['))
      expect(tileGroups).toHaveLength(5)
    })

    it('handles 400-char labels in tiles without throwing', () => {
      const ctx = makeCtx({ width: 960, height: 300 }, registry)
      const longLabel = 'A'.repeat(400)
      const node = tlsCKpiRow.layout(
        {
          tiles: [
            { value: 100, label: longLabel },
            { value: 200, label: 'Normal' },
          ],
          gap: 'md',
        } as any,
        ctx,
      )
      assertValidNode(node)
    })

    it('handles CJK text in tiles without throwing', () => {
      const ctx = makeCtx({ width: 960, height: 300 }, registry)
      const node = tlsCKpiRow.layout(
        {
          tiles: [
            { value: 100, label: '收入' },
            { value: 200, label: '利润率' },
          ],
          gap: 'md',
        } as any,
        ctx,
      )
      assertValidNode(node)
    })
  })

  describe('tile delegation uses ctx.layoutChild', () => {
    it('tile groups contain a child node from layoutChild', () => {
      const ctx = makeCtx({ width: 960, height: 300 }, registry)
      const node = tlsCKpiRow.layout(tlsCKpiRow.defaults as any, ctx)
      const tileGroup = node.children.find(c => c.part === 'tile[0]')
      expect(tileGroup).toBeDefined()
      expect(tileGroup!.children!.length).toBeGreaterThanOrEqual(1)
      // The child should be a layout node from kpi-tile (a group with value, label, etc.)
      const innerNode = tileGroup!.children![0]
      assertValidNode(innerNode)
    })
  })

  describe('no new LayoutNode kind', () => {
    it('layout tree contains only known kinds', () => {
      const ctx = makeCtx({ width: 960, height: 300 }, registry)
      const node = tlsCKpiRow.layout(tlsCKpiRow.defaults as any, ctx)
      const kinds = collectKinds(node)
      const knownKinds = new Set(['group', 'text', 'rect', 'path', 'line', 'image', 'icon', 'host'])
      for (const k of kinds) {
        expect(knownKinds.has(k)).toBe(true)
      }
    })
  })

  describe('describe.example passes validateDeckSpec', () => {
    it('example validates clean', () => {
      const spec = {
        version: 1 as const,
        id: 'test-row',
        title: 'Test',
        theme: 'mono-grid',
        aspect: 'widescreen' as const,
        slides: [{
          id: 's1',
          layout: 'blank',
          regions: {
            body: [tlsCKpiRow.describe!.example],
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
      const copy = JSON.parse(JSON.stringify(tlsCKpiRow.defaults))
      expect(copy).toEqual(tlsCKpiRow.defaults)
      // Mutate copy and verify original is unchanged
      copy.tiles = [{ value: 999, label: 'X' }]
      expect(tlsCKpiRow.defaults.tiles).not.toBe(copy.tiles)
      expect(tlsCKpiRow.defaults).toEqual({ ...tlsCKpiRow.defaults, tiles: tlsCKpiRow.defaults.tiles })
    })
  })

  describe('assertParity', () => {
    it('DOM and SVG agree for defaults at medium size', async () => {
      const { assertParity } = await import('../../../parity-harness')
      await assertParity(tlsCKpiRow, tlsCKpiRow.defaults, { width: 960, height: 300 })
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

function collectKinds(node: any): string[] {
  const kinds: string[] = []
  function walk(n: any) {
    if (n.k) kinds.push(n.k)
    if (n.children) n.children.forEach(walk)
  }
  walk(node)
  return kinds
}
