/**
 * tls.g.swot — composite structure (depth, colours as roles, letters toggle) and rendering.
 */

import { tlsGSwot, buildSwot, defaults } from './index'
import { standardBlockSuite, absoluteLeaves } from '../../text/standard-suite'
import { assertChartSane } from '../../data/_chart/chart-test'
import { allText, chartCtx } from '../diagram-test'
import { makeCtx } from '../../layout/test-helpers'
import { registerBuiltInBlocks } from '../../index'
import { BlockRegistry } from '../../../registry'
import type { BlockSpec } from '../../../types'

const SZ = { width: 1100, height: 620 }
const MIN = { width: 640, height: 380 }
const reg = new BlockRegistry()
registerBuiltInBlocks(reg)
const layoutOf = (def: typeof tlsGSwot, props: Record<string, unknown>, size: { width: number; height: number }) => def.layout({ ...(def.defaults as any), ...props } as any, makeCtx(size, reg))

standardBlockSuite(tlsGSwot, { overflowProps: { strengths: ['a', 'b', 'c', 'd', 'e', 'f'] } })

const depthOf = (b: BlockSpec): number => {
  const kids = ((b.props as any).children ?? []) as BlockSpec[]
  return 1 + Math.max(0, ...kids.map(depthOf))
}
const walk = (b: BlockSpec, out: BlockSpec[] = []): BlockSpec[] => {
  out.push(b)
  for (const k of ((b.props as any).children ?? []) as BlockSpec[]) walk(k, out)
  return out
}

describe('tls.g.swot', () => {
  it('is a composite of grid > card > stack > kicker/bullets, at most 4 levels deep (the layout depth cap)', () => {
    for (const letters of [false, true]) {
      const spec = buildSwot({ ...defaults, letters })
      expect(spec.type).toBe('tls.l.grid')
      expect(depthOf(spec)).toBeLessThanOrEqual(4)
      const types = new Set(walk(spec).map((b) => b.type))
      expect([...types].sort()).toEqual(['tls.l.card', 'tls.l.grid', 'tls.l.stack', 'tls.t.bullets', 'tls.t.kicker', ...(letters ? ['tls.t.hero-number'] : [])].sort())
    }
  })

  it('colours each quadrant by a role (S positive, W negative, O accent, T warning), never a hex', () => {
    const spec = buildSwot(defaults)
    const cards = ((spec.props as any).children as BlockSpec[]).map((c) => ((c.props as any).$block?.style as any)?.surface)
    expect(cards).toEqual(['positive', 'negative', 'accent', 'warning'])
    expect(JSON.stringify(spec)).not.toMatch(/#[0-9a-fA-F]{3,8}/)
    const outline = buildSwot({ ...defaults, style: 'outline' })
    expect(((outline.props as any).children as BlockSpec[]).every((c) => (c.props as any).$block === undefined)).toBe(true)
  })

  it('headings use the quadrant role in outline style and the text role on a coloured card', () => {
    const accents = (style: 'tinted' | 'outline') =>
      walk(buildSwot({ ...defaults, style })).filter((b) => b.type === 'tls.t.kicker').map((b) => (b.props as any).$block.style.accent)
    expect(accents('outline')).toEqual(['positive', 'negative', 'accent', 'warning'])
    expect(accents('tinted')).toEqual(['text', 'text', 'text', 'text'])
  })

  it('letters adds one big letter per quadrant, off by default', () => {
    expect(walk(buildSwot(defaults)).filter((b) => b.type === 'tls.t.hero-number')).toHaveLength(0)
    const letters = walk(buildSwot({ ...defaults, letters: true })).filter((b) => b.type === 'tls.t.hero-number')
    expect(letters.map((b) => (b.props as any).value)).toEqual(['S', 'W', 'O', 'T'])
  })

  it('empty lists, junk entries and extra items are tolerated and capped at 5 per quadrant', () => {
    const spec = buildSwot({ ...defaults, strengths: ['1', '2', '3', '4', '5', '6', '7'], weaknesses: [] as any, opportunities: [null, 3, 'ok'] as any, threats: undefined as any })
    const items = walk(spec).filter((b) => b.type === 'tls.t.bullets').map((b) => ((b.props as any).items as unknown[]).length)
    expect(items).toEqual([5, 0, 1, 0])
  })

  it('renders all four headings and every item, inside the box, at preferred and min size', () => {
    for (const size of [SZ, MIN]) {
      const t = layoutOf(tlsGSwot, { strengths: ['S one', 'S two'], weaknesses: ['W one'], opportunities: ['O one'], threats: ['T one'] }, size)
      assertChartSane(t, size)
      const texts = allText(t).join(' | ').toLowerCase()
      for (const w of ['strengths', 'weaknesses', 'opportunities', 'threats', 's one', 's two', 'w one', 'o one', 't one']) expect(texts).toContain(w)
      expect(absoluteLeaves(t).filter((l) => l.k === 'rect').length).toBeGreaterThanOrEqual(4)
    }
  })

  it('capacity: six items in a quadrant do not fit', () => {
    expect(tlsGSwot.capacity!({ ...defaults, threats: ['1', '2', '3', '4', '5', '6'] } as any, SZ, chartCtx(SZ)).fits).toBe(false)
  })
})
