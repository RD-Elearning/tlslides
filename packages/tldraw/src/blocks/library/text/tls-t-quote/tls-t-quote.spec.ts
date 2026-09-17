/**
 * Tests for tls.t.quote — blockquote with quotation glyph.
 */

import { tlsTQuote } from './index'
import { makeCtx, makeRegistry, SIZES, assertValidNode, collectParts } from '../test-helpers'

describe('tls.t.quote', () => {
  const registry = makeRegistry()

  describe('layout at 3 sizes', () => {
    it.each(SIZES)('produces valid tree at $label ($box.width×$box.height)', ({ box }) => {
      const ctx = makeCtx(box, registry)
      const node = tlsTQuote.layout(tlsTQuote.defaults, ctx)
      assertValidNode(node)
      expect(node.k).toBe('group')
      expect(node.children!.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('parts with glyph mark style', () => {
    it('emits glyph, text, and attribution parts', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTQuote.layout(tlsTQuote.defaults, ctx)
      const parts = collectParts(node)
      expect(parts).toContain('glyph')
      expect(parts).toContain('text')
      expect(parts).toContain('attribution')
    })
  })

  describe('glyph is a path node', () => {
    it('uses k=path for the glyph, not k=text', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTQuote.layout(tlsTQuote.defaults, ctx)
      const glyph = node.children!.find((c) => c.part === 'glyph')
      expect(glyph).toBeDefined()
      expect(glyph!.k).toBe('path')
    })

    it('glyph scales proportionally with box width', () => {
      const smallCtx = makeCtx({ width: 480, height: 270 }, registry)
      const smallNode = tlsTQuote.layout(tlsTQuote.defaults, smallCtx)
      const smallGlyph = smallNode.children!.find((c) => c.part === 'glyph')

      const largeCtx = makeCtx({ width: 1920, height: 1080 }, registry)
      const largeNode = tlsTQuote.layout(tlsTQuote.defaults, largeCtx)
      const largeGlyph = largeNode.children!.find((c) => c.part === 'glyph')

      expect(smallGlyph).toBeDefined()
      expect(largeGlyph).toBeDefined()
      // Larger box should produce a larger glyph
      expect(largeGlyph!.box.width).toBeGreaterThan(smallGlyph!.box.width)
    })
  })

  describe('rule mark style', () => {
    it('uses a rect for the glyph when markStyle=rule', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTQuote.layout(
        { ...tlsTQuote.defaults, markStyle: 'rule' },
        ctx,
      )
      const glyph = node.children!.find((c) => c.part === 'glyph')
      expect(glyph).toBeDefined()
      expect(glyph!.k).toBe('rect')
    })
  })

  describe('none mark style', () => {
    it('omits the glyph part', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTQuote.layout(
        { ...tlsTQuote.defaults, markStyle: 'none' },
        ctx,
      )
      const parts = collectParts(node)
      expect(parts).not.toContain('glyph')
      expect(parts).toContain('text')
      expect(parts).toContain('attribution')
    })
  })

  describe('text content', () => {
    it('displays the quote text', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTQuote.layout(tlsTQuote.defaults, ctx)
      const textNode = node.children!.find((c) => c.part === 'text')
      expect(textNode).toBeDefined()
      expect(textNode!.k).toBe('text')
      const combinedText = textNode!.lines.map((l) => l.text).join('')
      expect(combinedText).toContain('great work')
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
        const node = tlsTQuote.layout(tlsTQuote.defaults, ctx)
        assertValidNode(node)
      } finally {
        globalThis.document = origDoc
        globalThis.window = origWindow
        globalThis.Date = origDate
        Math.random = origRandom
      }
    })
  })
})
