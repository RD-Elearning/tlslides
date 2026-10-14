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

  describe('RV02 — fits its box (review G02)', () => {
    const ex = tlsTQuote.describe!.example.props as any
    const leaves = (n: any, ox = 0, oy = 0, out: any[] = []): any[] => {
      const x = ox + n.box.x
      const y = oy + n.box.y
      if (n.k !== 'group') out.push({ ...n, ax: x, ay: y })
      for (const c of n.children ?? []) leaves(c, x, y, out)
      return out
    }

    it('scales the glyph path into its box instead of drawing the 100x80 master clipped', () => {
      for (const box of [{ width: 960, height: 400 }, { width: 480, height: 380 }, { width: 1760, height: 600 }]) {
        const node: any = tlsTQuote.layout(ex, makeCtx(box, registry))
        const glyph = node.children!.find((c: any) => c.part === 'glyph') as any
        const nums = (glyph.d.match(/-?\d+(\.\d+)?/g) as string[]).map(Number)
        const xs = nums.filter((_, i) => i % 2 === 0)
        const ys = nums.filter((_, i) => i % 2 === 1)
        expect(Math.max(...xs)).toBeLessThanOrEqual(glyph.box.width + 0.01)
        expect(Math.max(...ys)).toBeLessThanOrEqual(glyph.box.height + 0.01)
        // and it is not a speck: the ink covers most of the box
        expect(Math.max(...xs)).toBeGreaterThan(glyph.box.width * 0.8)
      }
    })

    it('the glyph ink and the rule never overlap the quote text', () => {
      for (const markStyle of ['glyph', 'rule']) {
        const node: any = tlsTQuote.layout({ ...ex, markStyle }, makeCtx({ width: 960, height: 400 }, registry))
        const mark = node.children!.find((c: any) => c.part === 'glyph') as any
        const text = node.children!.find((c: any) => c.part === 'text') as any
        const inkRight = mark.k === 'path' ? mark.box.x + mark.box.width * 0.92 : mark.box.x + mark.box.width
        expect(inkRight).toBeLessThan(text.box.x)
      }
    })

    it('the example fits size.preferred and size.min (autofit shrinks the quote)', () => {
      for (const [w, h] of [tlsTQuote.size.preferred, tlsTQuote.size.min]) {
        const node: any = tlsTQuote.layout(ex, makeCtx({ width: w, height: h }, registry))
        expect(node.box.height).toBeLessThanOrEqual(h)
        for (const l of leaves(node)) {
          expect(l.ax + l.box.width).toBeLessThanOrEqual(w + 0.5)
          expect(l.ay + l.box.height).toBeLessThanOrEqual(h + 0.5)
        }
      }
    })

    it('keeps the full heading size when the box is roomy, and never shrinks below 60%', () => {
      const roomy = tlsTQuote.layout(ex, makeCtx({ width: 1760, height: 800 }, registry))
      const tight = tlsTQuote.layout(ex, makeCtx({ width: 300, height: 100 }, registry))
      const size = (n: any) => n.children.find((c: any) => c.part === 'text').style.size
      expect(size(roomy)).toBe(64)
      expect(size(tight)).toBeGreaterThanOrEqual(64 * 0.6 - 0.01)
    })
  })

  // AC8 — the designed variants, at size.preferred and size.min
  describe('AC8 variants', () => {
    const LONG = 'We stopped buying tools for one person and started buying them for the whole team, and the numbers moved within a quarter.'
    const VARIANTS = ['big', 'card', 'side', 'image'] as const
    const boxes = [tlsTQuote.size.preferred, tlsTQuote.size.min, [1728, 888]] as const
    it.each(VARIANTS.flatMap((v) => ['glyph', 'rule', 'none'].map((m) => [v, m] as const)))('%s with markStyle %s fits its box, text inside', (variant, markStyle) => {
      for (const [w, h] of boxes) {
        for (const text of [tlsTQuote.defaults.text, LONG]) {
          const ctx = makeCtx({ width: w, height: h }, registry)
          const node: any = tlsTQuote.layout({ ...tlsTQuote.defaults, text, variant, markStyle } as never, ctx)
          assertValidNode(node)
          expect(node.box.height).toBeLessThanOrEqual(h + 1)
          for (const c of (node.children ?? []) as any[]) {
            expect(c.box.x).toBeGreaterThanOrEqual(-0.5)
            expect(c.box.x + c.box.width).toBeLessThanOrEqual(w + 0.5)
            expect(c.box.y + c.box.height).toBeLessThanOrEqual(node.box.height + 0.5)
          }
          expect(collectParts(node)).toEqual(expect.arrayContaining(['text', 'attribution']))
        }
      }
    })

    it('big sets the quote larger than classic; card draws a card; side a full-height bar', () => {
      const ctx = () => makeCtx({ width: 1728, height: 888 }, registry)
      const size = (n: any) => n.children.find((c: any) => c.part === 'text').style.size
      const classic = tlsTQuote.layout(tlsTQuote.defaults, ctx())
      expect(size(tlsTQuote.layout({ ...tlsTQuote.defaults, variant: 'big' } as never, ctx()))).toBeGreaterThan(size(classic))
      expect(collectParts(tlsTQuote.layout({ ...tlsTQuote.defaults, variant: 'card' } as never, ctx()))).toContain('card')
      const side: any = tlsTQuote.layout({ ...tlsTQuote.defaults, variant: 'side' } as never, ctx())
      const bar = side.children.find((c: any) => c.part === 'glyph')
      const text = side.children.find((c: any) => c.part === 'text')
      expect(bar.box.height).toBeGreaterThanOrEqual(text.box.height)
    })

    it('a long two-line quote is balanced (no orphan word on the last line)', () => {
      const ctx = makeCtx({ width: 1728, height: 888 }, registry)
      const n: any = tlsTQuote.layout({ ...tlsTQuote.defaults, variant: 'big' } as never, ctx)
      const lines = n.children.find((c: any) => c.part === 'text').lines
      if (lines.length >= 2) expect(lines[lines.length - 1].width).toBeGreaterThan(lines[0].width * 0.4)
    })

    it('classic is unchanged by the variant knob (default and explicit)', () => {
      const ctx = () => makeCtx({ width: 960, height: 540 }, registry)
      expect(tlsTQuote.layout({ ...tlsTQuote.defaults, variant: 'classic' } as never, ctx())).toEqual(tlsTQuote.layout({ ...tlsTQuote.defaults, variant: undefined } as never, ctx()))
    })
  })

  // AC8: DOM and SVG agree on every designed variant (layout leaves only; parity probe)
  it('DOM and SVG agree for big, card, side and image (parity probe)', async () => {
    const { assertParity } = await import('../../../parity-harness')
    for (const variant of ['big', 'card', 'side', 'image']) {
      await assertParity(tlsTQuote, { ...tlsTQuote.defaults, variant } as any, { width: 1600, height: 800 })
    }
  }, 120000)
})
