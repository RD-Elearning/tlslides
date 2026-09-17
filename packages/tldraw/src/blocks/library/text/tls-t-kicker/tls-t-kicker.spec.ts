/**
 * Geometry tests for tls.t.kicker — kicker / eyebrow label.
 */

import { tlsTKicker } from './index'
import { makeCtx, makeRegistry, SIZES, assertValidNode } from '../test-helpers'

describe('tls.t.kicker', () => {
  const registry = makeRegistry()

  describe('layout at 3 sizes with defaults', () => {
    it.each(SIZES)('produces valid tree at $label ($box.width×$box.height)', ({ box }) => {
      const ctx = makeCtx(box, registry)
      const node = tlsTKicker.layout(tlsTKicker.defaults as any, ctx)
      assertValidNode(node)
      expect(node.k).toBe('group')
      expect(node.part).toBe('root')
    })
  })

  describe('text node structure', () => {
    it('has a text child with lines', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTKicker.layout(tlsTKicker.defaults as any, ctx)
      expect(node.children).toHaveLength(1)
      const textNode = node.children[0]
      expect(textNode.k).toBe('text')
      expect(textNode.part).toBe('text')
      expect(Array.isArray((textNode as any).lines)).toBe(true)
      expect((textNode as any).lines.length).toBe(1)
    })
  })

  describe('uses caption type token', () => {
    it('resolves to size 22 (caption)', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTKicker.layout(tlsTKicker.defaults as any, ctx)
      const textNode = node.children[0] as any
      expect(textNode.style.size).toBe(22)
    })
  })

  describe('text case transformation', () => {
    it('uppercases by default', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTKicker.layout({ text: 'overview' } as any, ctx)
      const textNode = node.children[0] as any
      expect(textNode.lines[0].text).toBe('OVERVIEW')
    })

    it('preserves case when case=none', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTKicker.layout({ text: 'Q3 Results', case: 'none' } as any, ctx)
      const textNode = node.children[0] as any
      expect(textNode.lines[0].text).toBe('Q3 Results')
    })

    it('lowercases when case=lowercase', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTKicker.layout({ text: 'OVERVIEW', case: 'lowercase' } as any, ctx)
      const textNode = node.children[0] as any
      expect(textNode.lines[0].text).toBe('overview')
    })

    it('capitalizes when case=capitalize', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTKicker.layout({ text: 'q3 results', case: 'capitalize' } as any, ctx)
      const textNode = node.children[0] as any
      expect(textNode.lines[0].text).toBe('Q3 Results')
    })
  })

  describe('marker', () => {
    it('adds a marker dot when marker=true', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTKicker.layout({ ...tlsTKicker.defaults, marker: true } as any, ctx)
      const markerNode = node.children.find((c) => c.part === 'marker')
      expect(markerNode).toBeDefined()
      expect(markerNode!.k).toBe('rect')
    })

    it('has no marker when marker=false', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTKicker.layout({ ...tlsTKicker.defaults, marker: false } as any, ctx)
      const markerNode = node.children.find((c) => c.part === 'marker')
      expect(markerNode).toBeUndefined()
    })
  })

  describe('empty text', () => {
    it('handles empty string gracefully', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTKicker.layout({ text: '' } as any, ctx)
      assertValidNode(node)
    })
  })

  describe('CJK text', () => {
    it('handles CJK characters', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTKicker.layout({ text: '概述' } as any, ctx)
      assertValidNode(node)
      const textNode = node.children[0] as any
      expect(textNode.lines.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('long single word (adversarial)', () => {
    it('handles a 400-char word without throwing', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const longWord = 'a'.repeat(400)
      const node = tlsTKicker.layout({ text: longWord } as any, ctx)
      assertValidNode(node)
    })
  })

  describe('single character', () => {
    it('handles a single character', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTKicker.layout({ text: 'X' } as any, ctx)
      assertValidNode(node)
    })
  })
})
