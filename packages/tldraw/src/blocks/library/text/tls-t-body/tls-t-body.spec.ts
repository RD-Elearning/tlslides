/**
 * Geometry tests for tls.t.body — body copy paragraph.
 */

import { tlsTBody } from './index'
import { makeCtx, makeRegistry, SIZES, assertValidNode } from '../test-helpers'

describe('tls.t.body', () => {
  const registry = makeRegistry()

  describe('layout at 3 sizes with defaults', () => {
    it.each(SIZES)('produces valid tree at $label ($box.width×$box.height)', ({ box }) => {
      const ctx = makeCtx(box, registry)
      const node = tlsTBody.layout(tlsTBody.defaults as any, ctx)
      assertValidNode(node)
      expect(node.k).toBe('group')
      expect(node.part).toBe('root')
    })
  })

  describe('text node structure', () => {
    it('has a text child with lines', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTBody.layout(tlsTBody.defaults as any, ctx)
      expect(node.children.length).toBeGreaterThanOrEqual(1)
      const textNode = node.children[0]
      expect(textNode.k).toBe('text')
      expect(textNode.part).toBe('text')
      expect(Array.isArray((textNode as any).lines)).toBe(true)
      expect((textNode as any).lines.length).toBeGreaterThanOrEqual(1)
    })

    it('preserves rich-text runs', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTBody.layout(tlsTBody.defaults as any, ctx)
      const textNode = node.children[0] as any
      const allRuns = textNode.lines.flatMap((l: any) => l.runs ?? [])
      // Should have runs from the rich-text defaults
      expect(allRuns.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('autofit', () => {
    it('does not shrink when text fits', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTBody.layout({ ...tlsTBody.defaults, autoFit: true } as any, ctx)
      const textNode = node.children[0] as any
      const scale = textNode.style.scale ?? 1
      expect(scale).toBe(1)
    })

    it('does not shrink when autoFit is false', () => {
      const ctx = makeCtx({ width: 960, height: 40 }, registry)
      const node = tlsTBody.layout({ text: 'A very long paragraph that should overflow the box', autoFit: false } as any, ctx)
      const textNode = node.children[0] as any
      const scale = textNode.style.scale ?? 1
      expect(scale).toBe(1)
    })
  })

  describe('multi-column', () => {
    it('creates multiple text nodes for columns > 1', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTBody.layout(
        { text: 'First paragraph\nSecond paragraph', columns: 2 } as any,
        ctx
      )
      expect(node.children).toHaveLength(2)
    })

    it('creates a single text node for columns = 1', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTBody.layout(
        { text: 'Single column text', columns: 1 } as any,
        ctx
      )
      expect(node.children).toHaveLength(1)
    })
  })

  describe('empty text', () => {
    it('handles empty string gracefully', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTBody.layout({ text: '' } as any, ctx)
      assertValidNode(node)
      expect(node.children).toHaveLength(1)
      expect(node.children[0].k).toBe('text')
    })
  })

  describe('long single word (adversarial)', () => {
    it('handles a 400-char word without throwing', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const longWord = 'a'.repeat(400)
      const node = tlsTBody.layout({ text: longWord } as any, ctx)
      assertValidNode(node)
    })
  })

  describe('CJK text', () => {
    it('handles CJK characters', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTBody.layout({ text: '这是中文正文文本用于测试' } as any, ctx)
      assertValidNode(node)
      const textNode = node.children[0] as any
      expect(textNode.lines.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('single character', () => {
    it('handles a single character', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTBody.layout({ text: 'X' } as any, ctx)
      assertValidNode(node)
    })
  })

  describe('40 items adversarial', () => {
    it('handles 40 paragraphs without throwing', () => {
      const ctx = makeCtx({ width: 960, height: 2000 }, registry)
      const text = Array.from({ length: 40 }, (_, i) => `Paragraph ${i + 1} of body text.`).join('\n')
      const node = tlsTBody.layout({ text } as any, ctx)
      assertValidNode(node)
    })
  })

  describe('missing values', () => {
    it('handles undefined optional fields', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTBody.layout({ text: 'Hello world' } as any, ctx)
      assertValidNode(node)
    })
  })
})
