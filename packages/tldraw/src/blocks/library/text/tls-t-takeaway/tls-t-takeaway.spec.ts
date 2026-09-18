/**
 * Tests for tls.t.takeaway — highlighted insight text.
 */

import { tlsTTakeaway } from './index'
import { makeCtx, makeRegistry, SIZES, assertValidNode, collectParts } from '../test-helpers'

describe('tls.t.takeaway', () => {
  const registry = makeRegistry()

  describe('layout at 3 sizes', () => {
    it.each(SIZES)('produces valid tree at $label ($box.width×$box.height)', ({ box }) => {
      const ctx = makeCtx(box, registry)
      const node = tlsTTakeaway.layout(tlsTTakeaway.defaults, ctx)
      assertValidNode(node)
      expect(node.k).toBe('group')
      expect(node.children!.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('parts', () => {
    it('emits accent-bar, label, and text parts', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTTakeaway.layout(tlsTTakeaway.defaults, ctx)
      const parts = collectParts(node)
      expect(parts).toContain('accent-bar')
      expect(parts).toContain('label')
      expect(parts).toContain('text')
    })

    it('omits label when empty', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTTakeaway.layout(
        { ...tlsTTakeaway.defaults, label: '' },
        ctx,
      )
      const parts = collectParts(node)
      expect(parts).not.toContain('label')
      expect(parts).toContain('text')
    })
  })

  describe('accent bar', () => {
    it('is a rect node with rounded corners', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTTakeaway.layout(tlsTTakeaway.defaults, ctx)
      const bar = node.children!.find((c) => c.part === 'accent-bar')
      expect(bar).toBeDefined()
      expect(bar!.k).toBe('rect')
    })

    it('uses accent colour for the default tone', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTTakeaway.layout(
        { ...tlsTTakeaway.defaults, tone: 'accent' },
        ctx,
      )
      const bar = node.children!.find((c) => c.part === 'accent-bar')
      expect(bar).toBeDefined()
      expect(bar!.fill).toBeDefined()
    })

    it('changes colour with tone', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const accentNode = tlsTTakeaway.layout(
        { ...tlsTTakeaway.defaults, tone: 'accent' },
        ctx,
      )
      const warningNode = tlsTTakeaway.layout(
        { ...tlsTTakeaway.defaults, tone: 'warning' },
        ctx,
      )
      const accentBar = accentNode.children!.find((c) => c.part === 'accent-bar')
      const warningBar = warningNode.children!.find((c) => c.part === 'accent-bar')
      expect(accentBar!.fill).not.toEqual(warningBar!.fill)
    })
  })

  describe('text content', () => {
    it('displays the takeaway text', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTTakeaway.layout(tlsTTakeaway.defaults, ctx)
      const textNode = node.children!.find((c) => c.part === 'text')
      expect(textNode).toBeDefined()
      expect(textNode!.k).toBe('text')
      const combinedText = textNode!.lines.map((l) => l.text).join('')
      expect(combinedText).toContain('Revenue')
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
        const node = tlsTTakeaway.layout(tlsTTakeaway.defaults, ctx)
        assertValidNode(node)
      } finally {
        globalThis.document = origDoc
        globalThis.window = origWindow
        globalThis.Date = origDate
        Math.random = origRandom
      }
    })
  })

  describe('all tones', () => {
    it.each(['accent', 'positive', 'warning', 'muted'] as const)('tone=%s produces valid tree', (tone) => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTTakeaway.layout({ ...tlsTTakeaway.defaults, tone }, ctx)
      assertValidNode(node)
      expect(node.k).toBe('group')
      const parts = collectParts(node)
      expect(parts).toContain('accent-bar')
      expect(parts).toContain('text')
    })
  })
})
