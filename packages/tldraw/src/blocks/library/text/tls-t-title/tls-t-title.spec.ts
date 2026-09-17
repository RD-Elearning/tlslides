/**
 * Geometry tests for tls.t.title — slide title.
 */

import { tlsTTitle } from './index'
import { makeCtx, makeRegistry, SIZES, assertValidNode } from '../test-helpers'

describe('tls.t.title', () => {
  const registry = makeRegistry()

  describe('layout at 3 sizes with defaults', () => {
    it.each(SIZES)('produces valid tree at $label ($box.width×$box.height)', ({ box }) => {
      const ctx = makeCtx(box, registry)
      const node = tlsTTitle.layout(tlsTTitle.defaults as any, ctx)
      assertValidNode(node)
      expect(node.k).toBe('group')
      expect(node.part).toBe('root')
    })
  })

  describe('text node structure', () => {
    it('has a text child with lines', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTTitle.layout(tlsTTitle.defaults as any, ctx)
      expect(node.children.length).toBeGreaterThanOrEqual(1)
      const textNode = node.children[0]
      expect(textNode.k).toBe('text')
      expect(textNode.part).toBe('text')
      expect(Array.isArray((textNode as any).lines)).toBe(true)
      expect((textNode as any).lines.length).toBeGreaterThanOrEqual(1)
    })

    it('preserves rich-text runs from bold word', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTTitle.layout(tlsTTitle.defaults as any, ctx)
      const textNode = node.children[0] as any
      // The defaults have "Quarterly " + "Results" (bold)
      const allRuns = textNode.lines.flatMap((l: any) => l.runs ?? [])
      expect(allRuns.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('autofit — shrinks on overflow', () => {
    it('reduces scale when text exceeds box height', () => {
      const ctx = makeCtx({ width: 960, height: 40 }, registry)
      const node = tlsTTitle.layout(
        { text: 'A very long title that should overflow and trigger autofit', size: 'display' } as any,
        ctx
      )
      const textNode = node.children[0] as any
      const scale = textNode.style.scale ?? 1
      expect(scale).toBeLessThan(1)
      expect(scale).toBeGreaterThanOrEqual(0.75)
    })

    it('does not shrink below 0.75 floor', () => {
      const ctx = makeCtx({ width: 960, height: 10 }, registry)
      const node = tlsTTitle.layout(
        { text: 'A very long title that should overflow', size: 'display' } as any,
        ctx
      )
      const textNode = node.children[0] as any
      const scale = textNode.style.scale ?? 1
      expect(scale).toBeGreaterThanOrEqual(0.75)
    })

    it('does not shrink when text fits', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTTitle.layout(tlsTTitle.defaults as any, ctx)
      const textNode = node.children[0] as any
      const scale = textNode.style.scale ?? 1
      expect(scale).toBe(1)
    })
  })

  describe('maxLines truncation', () => {
    it('truncates lines when text exceeds maxLines', () => {
      const ctx = makeCtx({ width: 300, height: 540 }, registry)
      const node = tlsTTitle.layout(
        { text: 'This is a very long title that should wrap across multiple lines and be truncated', maxLines: 2 } as any,
        ctx
      )
      const textNode = node.children[0] as any
      expect(textNode.lines.length).toBeLessThanOrEqual(2)
    })

    it('appends ellipsis marker when truncated', () => {
      const ctx = makeCtx({ width: 300, height: 540 }, registry)
      const node = tlsTTitle.layout(
        { text: 'This is a very long title that should wrap and be truncated by maxLines', maxLines: 1 } as any,
        ctx
      )
      const textNode = node.children[0] as any
      expect(textNode.lines.length).toBe(1)
      const lastText = textNode.lines[0].text
      expect(lastText).toContain('\u2026')
    })

    it('does not truncate when lines are within limit', () => {
      const ctx = makeCtx({ width: 1920, height: 1080 }, registry)
      const node = tlsTTitle.layout(
        { text: 'Short title', maxLines: 3 } as any,
        ctx
      )
      const textNode = node.children[0] as any
      expect(textNode.lines.length).toBeLessThanOrEqual(3)
      // No ellipsis
      const allText = textNode.lines.map((l: any) => l.text).join('')
      expect(allText).not.toContain('\u2026')
    })
  })

  describe('decorative rule', () => {
    it('adds a rule rect when rule is true', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTTitle.layout({ ...tlsTTitle.defaults, rule: true } as any, ctx)
      const ruleNode = node.children.find((c) => c.part === 'rule')
      expect(ruleNode).toBeDefined()
      expect(ruleNode!.k).toBe('rect')
    })

    it('has no rule node when rule is false', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTTitle.layout({ ...tlsTTitle.defaults, rule: false } as any, ctx)
      const ruleNode = node.children.find((c) => c.part === 'rule')
      expect(ruleNode).toBeUndefined()
    })
  })

  describe('size token selection', () => {
    it('uses display size when requested', () => {
      const ctx = makeCtx({ width: 1920, height: 1080 }, registry)
      const node = tlsTTitle.layout({ ...tlsTTitle.defaults, size: 'display' } as any, ctx)
      const textNode = node.children[0] as any
      expect(textNode.style.size).toBe(152) // display = 152
    })

    it('uses title size by default', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTTitle.layout(tlsTTitle.defaults as any, ctx)
      const textNode = node.children[0] as any
      expect(textNode.style.size).toBe(96) // title = 96
    })
  })

  describe('empty text', () => {
    it('handles empty string gracefully', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTTitle.layout({ text: '' } as any, ctx)
      assertValidNode(node)
      expect(node.children).toHaveLength(1)
      expect(node.children[0].k).toBe('text')
    })
  })

  describe('long single word (adversarial)', () => {
    it('handles a 400-char word without throwing', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const longWord = 'a'.repeat(400)
      const node = tlsTTitle.layout({ text: longWord } as any, ctx)
      assertValidNode(node)
    })
  })

  describe('CJK text', () => {
    it('handles CJK characters', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTTitle.layout({ text: '季度报告总结' } as any, ctx)
      assertValidNode(node)
      const textNode = node.children[0] as any
      expect(textNode.lines.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('single item', () => {
    it('handles a single character', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsTTitle.layout({ text: 'X' } as any, ctx)
      assertValidNode(node)
    })
  })
})
