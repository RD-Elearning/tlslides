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

  describe('RV02 — marker and box (review G02)', () => {
    it('the marker dot ends before the text starts (no overlap)', () => {
      const ctx = makeCtx({ width: 400, height: 34 }, registry)
      const node: any = tlsTKicker.layout({ text: 'Overview', marker: true } as any, ctx)
      const dot = node.children.find((c: any) => c.part === 'marker') as any
      const text = node.children.find((c: any) => c.part === 'text') as any
      expect(dot.box.x + dot.box.width).toBeLessThan(text.box.x)
      // and it is centred on the first line, not on a wrapped block
      const tall: any = tlsTKicker.layout({ text: 'A much longer eyebrow label that wraps', marker: true } as any, makeCtx({ width: 160, height: 200 }, registry))
      const d2 = tall.children.find((c: any) => c.part === 'marker') as any
      expect(d2.box.y + d2.box.height).toBeLessThan(22 * 1.4)
    })

    it('the example fits size.preferred and size.min', () => {
      for (const [w, h] of [tlsTKicker.size.preferred, tlsTKicker.size.min]) {
        const node: any = tlsTKicker.layout(tlsTKicker.describe!.example.props as any, makeCtx({ width: w, height: h }, registry))
        expect(node.box.height).toBeLessThanOrEqual(h)
        const text = node.children.find((c: any) => c.part === 'text') as any
        expect(text.lines).toHaveLength(1)
      }
    })
  })
})
