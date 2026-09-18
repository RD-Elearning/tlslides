/**
 * Geometry tests for tls.t.caption — caption text.
 */

import { tlsTCaption } from './index'
import { makeCtx, makeRegistry, SIZES, assertValidNode } from '../test-helpers'

describe('tls.t.caption', () => {
  const registry = makeRegistry()

  describe('layout at 3 sizes with defaults', () => {
    it.each(SIZES)('produces valid tree at $label ($box.width×$box.height)', ({ box }) => {
      const ctx = makeCtx(box, registry)
      const node = tlsTCaption.layout(tlsTCaption.defaults as any, ctx)
      assertValidNode(node)
      expect(node.k).toBe('group')
      expect(node.part).toBe('root')
    })
  })

  describe('text node structure', () => {
    it('has a single text child with lines', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTCaption.layout(tlsTCaption.defaults as any, ctx)
      expect(node.children).toHaveLength(1)
      const textNode = node.children[0]
      expect(textNode.k).toBe('text')
      expect(textNode.part).toBe('text')
      expect(Array.isArray((textNode as any).lines)).toBe(true)
      expect((textNode as any).lines.length).toBeGreaterThanOrEqual(1)
    })

    it('uses caption type token size', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTCaption.layout(tlsTCaption.defaults as any, ctx)
      const textNode = node.children[0] as any
      // Caption token should be smaller than body
      expect(textNode.style.size).toBeLessThan(28)
    })
  })

  describe('empty text', () => {
    it('handles empty string gracefully', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTCaption.layout({ text: '' } as any, ctx)
      assertValidNode(node)
      expect(node.children).toHaveLength(1)
      expect(node.children[0].k).toBe('text')
    })
  })

  describe('long single word (adversarial)', () => {
    it('handles a 400-char word without throwing', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const longWord = 'a'.repeat(400)
      const node = tlsTCaption.layout({ text: longWord } as any, ctx)
      assertValidNode(node)
    })
  })

  describe('CJK text', () => {
    it('handles CJK characters', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTCaption.layout({ text: '图一：设计系统架构概览' } as any, ctx)
      assertValidNode(node)
      const textNode = node.children[0] as any
      expect(textNode.lines.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('single character', () => {
    it('handles a single character', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTCaption.layout({ text: 'X' } as any, ctx)
      assertValidNode(node)
    })
  })

  describe('40 items (adversarial)', () => {
    it('handles very long caption text without throwing', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const longCaption = Array.from({ length: 40 }, (_, i) => `Word${i + 1}`).join(' ')
      const node = tlsTCaption.layout({ text: longCaption } as any, ctx)
      assertValidNode(node)
    })
  })

  describe('missing values', () => {
    it('handles undefined optional fields', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTCaption.layout({ text: 'A simple caption' } as any, ctx)
      assertValidNode(node)
    })
  })
})
