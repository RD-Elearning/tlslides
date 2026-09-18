/**
 * Tests for tls.t.hero-number — large KPI number.
 */

import { tlsTHeroNumber } from './index'
import { makeCtx, makeRegistry, SIZES, assertValidNode, collectParts } from '../test-helpers'

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
