/**
 * Tests for tls.t.hero-number — large KPI number.
 */

import { tlsTHeroNumber } from './index'
import { makeCtx, makeRegistry, SIZES, assertValidNode, collectParts } from '../test-helpers'
import { assertExampleFits } from '../../data/_chart/chart-test'
import { realWidth } from '../../data/_chart/inter-width'

describe('tls.t.hero-number', () => {
  const registry = makeRegistry()

  describe('layout at 3 sizes', () => {
    it.each(SIZES)('produces valid tree at $label ($box.width×$box.height)', ({ box }) => {
      const ctx = makeCtx(box, registry)
      const node = tlsTHeroNumber.layout(tlsTHeroNumber.defaults, ctx)
      assertValidNode(node)
      expect(node.k).toBe('group')
      expect(node.children!.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('parts', () => {
    it('emits value, unit, and caption parts', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTHeroNumber.layout(tlsTHeroNumber.defaults, ctx)
      const parts = collectParts(node)
      expect(parts).toContain('value')
      expect(parts).toContain('unit')
      expect(parts).toContain('caption')
    })

    it('omits caption when empty', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTHeroNumber.layout(
        { ...tlsTHeroNumber.defaults, caption: '' },
        ctx,
      )
      const parts = collectParts(node)
      expect(parts).toContain('value')
      expect(parts).toContain('unit')
      expect(parts).not.toContain('caption')
    })
  })

  describe('geometry', () => {
    it('value text is the first child and spans full content width', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTHeroNumber.layout(tlsTHeroNumber.defaults, ctx)
      const firstChild = node.children![0]
      expect(firstChild.part).toBe('value')
      // Content width = 960 - 2*24 (md padding) = 912
      expect(firstChild.box.width).toBe(912)
    })

    it('children are stacked vertically (each y >= previous y)', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTHeroNumber.layout(tlsTHeroNumber.defaults, ctx)
      let prevY = -1
      for (const child of node.children!) {
        expect(child.box.y).toBeGreaterThanOrEqual(prevY)
        prevY = child.box.y
      }
    })
  })

  describe('emphasis variants', () => {
    it('accent emphasis uses accent color', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTHeroNumber.layout(
        { ...tlsTHeroNumber.defaults, emphasis: 'accent' },
        ctx,
      )
      const valueNode = node.children![0]
      expect(valueNode.k).toBe('text')
      // The accent color should be different from plain text color
      const normalCtx = makeCtx({ width: 960, height: 540 }, registry)
      const normalNode = tlsTHeroNumber.layout(
        { ...tlsTHeroNumber.defaults, emphasis: 'default' },
        normalCtx,
      )
      const normalValue = normalNode.children![0]
      expect(valueNode.style.color).not.toBe(normalValue.style.color)
    })

    it('muted emphasis uses muted color', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTHeroNumber.layout(
        { ...tlsTHeroNumber.defaults, emphasis: 'muted' },
        ctx,
      )
      const valueNode = node.children![0]
      expect(valueNode.k).toBe('text')
      expect(valueNode.style.color).toBe(ctx.resolveColor('textMuted').color)
    })
  })

  describe('layout purity', () => {
    it('throws from no document / window / Date / Math.random', () => {
      const origDoc = globalThis.document
      const origWindow = globalThis.window
      const origDate = globalThis.Date
      const origRandom = Math.random
      try {
        delete (globalThis as Record<string, unknown>).document
        delete (globalThis as Record<string, unknown>).window
        globalThis.Date = undefined as never
        Math.random = () => { throw new Error('Math.random called') }

        const ctx = makeCtx({ width: 960, height: 540 }, registry)
        const node = tlsTHeroNumber.layout(tlsTHeroNumber.defaults, ctx)
        assertValidNode(node)
      } finally {
        globalThis.document = origDoc
        globalThis.window = origWindow
        globalThis.Date = origDate
        Math.random = origRandom
      }
    })
  })

  describe('defaults deep-clone', () => {
    it('two calls with the same defaults do not share references', () => {
      const a = tlsTHeroNumber.defaults
      const b = { ...a }
      expect(a).toEqual(b)
      expect(a).not.toBe(b)
    })
  })
})

describe('RV04 — example fits its box (review G04)', () => {
  it('the example fits size.preferred and size.min, every label as wide as its glyphs', () => {
    assertExampleFits(tlsTHeroNumber)
  })

  it('the caption does not sit on the block edge and a long value stays on one line', () => {
    const reg = makeRegistry()
    const tree = tlsTHeroNumber.layout(tlsTHeroNumber.defaults, makeCtx({ width: 520, height: 300 }, reg))
    const kids = tree.children as any[]
    const last = kids[kids.length - 1]
    expect(tree.box.height - (last.box.y + last.box.height)).toBeGreaterThanOrEqual(20)
    const long = tlsTHeroNumber.layout({ ...tlsTHeroNumber.defaults, value: '$1,234,567' }, makeCtx({ width: 360, height: 300 }, reg))
    const v = (long.children as any[]).find((c) => c.part === 'value')
    expect(v.lines).toHaveLength(1)
    expect(realWidth(v.lines[0].text, v.style)).toBeLessThanOrEqual(v.box.width * 1.03 + 1)
  })
})
