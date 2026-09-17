/**
 * Geometry tests for tls.t.bullets — bullet list.
 */

import { tlsTBullets } from './index'
import { makeCtx, makeRegistry, SIZES, assertValidNode } from '../test-helpers'

describe('tls.t.bullets', () => {
  const registry = makeRegistry()

  describe('layout at 3 sizes with defaults', () => {
    it.each(SIZES)('produces valid tree at $label ($box.width×$box.height)', ({ box }) => {
      const ctx = makeCtx(box, registry)
      const node = tlsTBullets.layout(tlsTBullets.defaults as any, ctx)
      assertValidNode(node)
      expect(node.k).toBe('group')
      expect(node.part).toBe('root')
    })
  })

  describe('item structure', () => {
    it('creates marker + text pairs for each item', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTBullets.layout(tlsTBullets.defaults as any, ctx)
      // 4 items => 8 children (marker + text per item)
      expect(node.children).toHaveLength(8)
    })

    it('parts follow item[i].marker and item[i].text naming', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTBullets.layout(tlsTBullets.defaults as any, ctx)
      const parts = node.children.map(c => c.part)
      expect(parts).toContain('item[0].marker')
      expect(parts).toContain('item[0].text')
      expect(parts).toContain('item[3].marker')
      expect(parts).toContain('item[3].text')
    })
  })

  describe('marker styles', () => {
    it('renders dot markers by default', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTBullets.layout(tlsTBullets.defaults as any, ctx)
      const markerNode = node.children.find(c => c.part === 'item[0].marker')
      expect(markerNode).toBeDefined()
      expect(markerNode!.k).toBe('text')
    })

    it('renders dash markers when specified', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTBullets.layout({ ...tlsTBullets.defaults, marker: 'dash' } as any, ctx)
      const markerNode = node.children.find(c => c.part === 'item[0].marker') as any
      expect(markerNode.lines[0].text).toBe('\u2013')
    })

    it('renders number markers', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTBullets.layout({ ...tlsTBullets.defaults, marker: 'number' } as any, ctx)
      const marker0 = node.children.find(c => c.part === 'item[0].marker') as any
      const marker1 = node.children.find(c => c.part === 'item[1].marker') as any
      expect(marker0.lines[0].text).toBe('1.')
      expect(marker1.lines[0].text).toBe('2.')
    })
  })

  describe('empty items', () => {
    it('returns an empty group for no items', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTBullets.layout({ items: [], marker: 'dot' } as any, ctx)
      expect(node.children).toHaveLength(0)
    })
  })

  describe('single item', () => {
    it('handles a single list item', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTBullets.layout(
        { items: [{ text: 'Only item' }], marker: 'dot' } as any,
        ctx
      )
      expect(node.children).toHaveLength(2) // marker + text
    })
  })

  describe('40 items (adversarial)', () => {
    it('handles 40 items without throwing', () => {
      const ctx = makeCtx({ width: 960, height: 2000 }, registry)
      const items = Array.from({ length: 40 }, (_, i) => ({ text: `Item ${i + 1}` }))
      const node = tlsTBullets.layout({ items, marker: 'dot' } as any, ctx)
      assertValidNode(node)
      // 40 items => 80 children
      expect(node.children).toHaveLength(80)
    })
  })

  describe('400-char word (adversarial)', () => {
    it('handles a 400-char word without throwing', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const longWord = 'a'.repeat(400)
      const node = tlsTBullets.layout(
        { items: [{ text: longWord }], marker: 'dot' } as any,
        ctx
      )
      assertValidNode(node)
    })
  })

  describe('CJK text', () => {
    it('handles CJK characters in list items', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTBullets.layout(
        { items: [{ text: '第一项' }, { text: '第二项' }], marker: 'dot' } as any,
        ctx
      )
      assertValidNode(node)
      expect(node.children).toHaveLength(4)
    })
  })

  describe('missing values', () => {
    it('handles items with undefined text gracefully', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTBullets.layout(
        { items: [{ text: '' }, { text: 'Valid item' }], marker: 'dot' } as any,
        ctx
      )
      assertValidNode(node)
    })
  })
})
