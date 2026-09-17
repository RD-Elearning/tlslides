/**
 * Geometry tests for tls.t.subtitle — subtitle / secondary heading.
 */

import { tlsTSubtitle } from './index'
import { makeCtx, makeRegistry, SIZES, assertValidNode } from '../test-helpers'

describe('tls.t.subtitle', () => {
  const registry = makeRegistry()

  describe('layout at 3 sizes with defaults', () => {
    it.each(SIZES)('produces valid tree at $label ($box.width×$box.height)', ({ box }) => {
      const ctx = makeCtx(box, registry)
      const node = tlsTSubtitle.layout(tlsTSubtitle.defaults as any, ctx)
      assertValidNode(node)
      expect(node.k).toBe('group')
      expect(node.part).toBe('root')
    })
  })

  describe('text node structure', () => {
    it('has a text child with lines', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTSubtitle.layout(tlsTSubtitle.defaults as any, ctx)
      expect(node.children).toHaveLength(1)
      const textNode = node.children[0]
      expect(textNode.k).toBe('text')
      expect(textNode.part).toBe('text')
      expect(Array.isArray((textNode as any).lines)).toBe(true)
      expect((textNode as any).lines.length).toBeGreaterThanOrEqual(1)
    })

    it('preserves rich-text runs from italic word', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTSubtitle.layout(tlsTSubtitle.defaults as any, ctx)
      const textNode = node.children[0] as any
      const allRuns = textNode.lines.flatMap((l: any) => l.runs ?? [])
      expect(allRuns.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('uses subheading type token', () => {
    it('resolves to size 44 (subheading)', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTSubtitle.layout(tlsTSubtitle.defaults as any, ctx)
      const textNode = node.children[0] as any
      expect(textNode.style.size).toBe(44)
    })
  })

  describe('wrapping', () => {
    it('wraps long text within box width', () => {
      const ctx = makeCtx({ width: 480, height: 270 }, registry)
      const node = tlsTSubtitle.layout(
        { text: 'This is a very long subtitle that should wrap across multiple lines within the narrow box' } as any,
        ctx
      )
      const textNode = node.children[0] as any
      expect(textNode.lines.length).toBeGreaterThan(1)
    })
  })

  describe('empty text', () => {
    it('handles empty string gracefully', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTSubtitle.layout({ text: '' } as any, ctx)
      assertValidNode(node)
      expect(node.children).toHaveLength(1)
    })
  })

  describe('CJK text', () => {
    it('handles CJK characters', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTSubtitle.layout({ text: '最新的季度洞察' } as any, ctx)
      assertValidNode(node)
      const textNode = node.children[0] as any
      expect(textNode.lines.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('long single word (adversarial)', () => {
    it('handles a 400-char word without throwing', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const longWord = 'a'.repeat(400)
      const node = tlsTSubtitle.layout({ text: longWord } as any, ctx)
      assertValidNode(node)
    })
  })
})
