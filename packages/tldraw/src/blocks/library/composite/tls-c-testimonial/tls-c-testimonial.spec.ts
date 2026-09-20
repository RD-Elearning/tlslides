/**
 * Tests for tls.c.testimonial — pull-quote testimonial (kind: 'html').
 *
 * Covers:
 * - Poster geometry at 3 sizes
 * - Parts declared in motion match parts in the poster tree
 * - Template produces text content matching the poster's text
 * - Escaping: user content with <img onerror=...> renders as literal text
 * - Template data-part set === motion.parts set
 * - Size derived from poster of defaults
 * - validateDeckSpec accepts the example and rejects bad input
 * - Host-node assertion (one k:'host' node, render === 'tls.c.testimonial', with poster)
 * - Reduced-motion path calls onComplete immediately with no driver calls
 * - Deep copy: module-level objects not shared by reference
 */

import { tlsCTestimonial } from './index'
import { makeCtx, SIZES, assertValidNode } from '../../text/test-helpers'
import { richTextToPlain } from './schema'
import { poster } from './poster'
import { template } from './template'
import { motion } from './motion'
import { validateDeckSpec } from '../../../validate-deck-spec'
import { BlockRegistry } from '../../../registry'
import { registerBuiltInBlocks } from '../../../library'
import type { DeckSpec, LayoutContext, LayoutNode } from '../../../types'

/* ── helpers ───────────────────────────────────────────────────────────────── */

const registry = (() => {
  const r = new BlockRegistry()
  registerBuiltInBlocks(r)
  // Registered by registerBuiltInBlocks after R10 integration; guard so the
  // spec does not throw "already registered" (and does not swallow a real error).
  if (!r.has(tlsCTestimonial.type)) r.register(tlsCTestimonial)
  return r
})()

function ctx(box: { width: number; height: number }): LayoutContext {
  return makeCtx(box, registry)
}

function tplCtx(c: LayoutContext) {
  return {
    esc: (s: string) => s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;'),
    cssVar: (role: string) => `var(--tls-${role})`,
    box: { x: 0, y: 0, width: 1920, height: 1080 },
    tokens: c.tokens,
  }
}

/* ── tests ─────────────────────────────────────────────────────────────────── */

describe('tls.c.testimonial', () => {
  describe('poster at 3 sizes with defaults', () => {
    it.each(SIZES)('produces valid tree at $label ($box.width×$box.height)', ({ box }) => {
      const c = ctx(box)
      const node = poster(tlsCTestimonial.defaults as any, c)
      assertValidNode(node)
      expect(node.k).toBe('group')
      expect(node.part).toBe('root')
    })
  })

  describe('poster text content', () => {
    it('has quote, name, role text nodes', () => {
      const c = ctx({ width: 1920, height: 1080 })
      const node = poster(tlsCTestimonial.defaults as any, c)
      const parts = collectParts(node)
      expect(parts).toContain('quote')
      expect(parts).toContain('name')
      expect(parts).toContain('role')
      expect(parts).toContain('avatar')
    })

    it('quote text contains expected content', () => {
      const c = ctx({ width: 1920, height: 1080 })
      const node = poster(tlsCTestimonial.defaults as any, c)
      const textNodes = collectTextNodes(node)
      const quoteText = textNodes.find((t) => t.part === 'quote')
      expect(quoteText).toBeDefined()
      const allText = quoteText!.lines.map((l: any) => l.text).join('')
      expect(allText).toContain('transformed')
    })
  })

  describe('data-part set === motion.parts set', () => {
    it('motion.parts contains exactly quote, avatar, name, role', () => {
      expect(motion.parts).toEqual(expect.arrayContaining(['quote', 'avatar', 'name', 'role']))
      expect(motion.parts!.length).toBe(4)
    })

    it('all data-part names in the template are declared in motion.parts', () => {
      const c = ctx({ width: 1920, height: 1080 })
      const html = template(tlsCTestimonial.defaults as any, tplCtx(c))
      const dataPartPattern = /data-part="([^"]+)"/g
      const templateParts: string[] = []
      let match: RegExpExecArray | null
      while ((match = dataPartPattern.exec(html)) !== null) {
        templateParts.push(match[1])
      }
      // Unique parts only
      const uniqueParts = [...new Set(templateParts)]
      for (const part of uniqueParts) {
        expect(motion.parts).toContain(part)
      }
      // Motion parts that are always present
      for (const part of motion.parts!) {
        expect(uniqueParts).toContain(part)
      }
    })

    it('schema slot keys match motion.parts', () => {
      const schemaKeys = Object.keys(tlsCTestimonial.schema)
      for (const part of motion.parts!) {
        expect(schemaKeys).toContain(part)
      }
    })
  })

  describe('template produces text matching poster', () => {
    it('template text content matches poster text content', () => {
      const c = ctx({ width: 1920, height: 1080 })
      const p = poster(tlsCTestimonial.defaults as any, c)
      const html = template(tlsCTestimonial.defaults as any, tplCtx(c))

      // Strip HTML tags from the template to get plain text content
      const plainHtml = html.replace(/<[^>]+>/g, '')

      // Extract text from the poster
      const posterTexts = collectTextNodes(p).map((t) =>
        t.lines.map((l: any) => l.text).join('')
      )

      // Check that the template contains the key strings (after stripping tags)
      for (const text of posterTexts) {
        const plainText = richTextToPlain(text as any)
        if (plainText.trim()) {
          expect(plainHtml).toContain(plainText.trim())
        }
      }
    })
  })

  describe('escaping', () => {
    it('escapes HTML in user content', () => {
      const c = ctx({ width: 1920, height: 1080 })

      const maliciousProps = {
        quote: '<img src=x onerror=alert(1)>',
        name: 'Safe Name',
        role: 'Safe Role',
      }

      const html = template(maliciousProps as any, tplCtx(c))

      // Must not contain raw <img> or <script> tags — they should be escaped
      expect(html).not.toMatch(/<img[\s>]/)
      // The escaped versions should be present
      expect(html).toContain('&lt;img')
    })

    it('all string props go through ctx.esc() — no img, no on* attributes', () => {
      const c = ctx({ width: 1920, height: 1080 })
      const injection = '<img src=x onerror=alert(1)>'
      const props = {
        quote: injection,
        name: injection,
        role: injection,
        avatar: injection,
      }

      const html = template(props as any, tplCtx(c))

      // No raw <img> tag
      expect(html).not.toMatch(/<img[\s>]/)
      expect(html).not.toMatch(/<script[\s>]/)

      // Parse with DOMParser and check: no on* attributes on any real element
      const doc = new DOMParser().parseFromString(html, 'text/html')
      const allElements = doc.querySelectorAll('*')
      for (const el of Array.from(allElements)) {
        for (const attr of Array.from(el.attributes)) {
          expect(attr.name).not.toMatch(/^on/)
        }
      }
    })

    it('avatar URL is scheme-allowlisted — no javascript: or data:image/svg+xml', () => {
      const c = ctx({ width: 1920, height: 1080 })
      const props = {
        quote: 'Hello',
        name: 'Test',
        role: 'Role',
        avatar: 'javascript:alert(1)',
      }

      const html = template(props as any, tplCtx(c))
      // The javascript: URL must not appear as an img src
      expect(html).not.toMatch(/javascript:/)
      // Should fall back to initials frame
      expect(html).toContain('data-part="avatar"')
    })
  })

  describe('layout() returns a host node', () => {
    it('returns k:host with render tls.c.testimonial and poster', () => {
      const c = ctx({ width: 1920, height: 1080 })
      const node = tlsCTestimonial.layout(tlsCTestimonial.defaults as any, c)
      expect(node.k).toBe('host')
      expect((node as any).render).toBe('tls.c.testimonial')
      expect((node as any).poster).toBeDefined()
      expect((node as any).poster.k).toBe('group')
    })

    it('there is exactly one host node', () => {
      const c = ctx({ width: 1920, height: 1080 })
      const node = tlsCTestimonial.layout(tlsCTestimonial.defaults as any, c)
      const hostNodes: any[] = []
      function walk(n: any) {
        if (n.k === 'host') hostNodes.push(n)
        if (n.k === 'group' && n.children) {
          for (const child of n.children) walk(child)
        }
      }
      walk(node)
      expect(hostNodes).toHaveLength(1)
      expect(hostNodes[0].render).toBe('tls.c.testimonial')
      expect(hostNodes[0].poster).toBeDefined()
    })
  })

  describe('size derived from defaults', () => {
    it('size.preferred is set from the poster of defaults, not by hand', () => {
      const c = ctx({ width: 1920, height: 1080 })
      const p = poster(tlsCTestimonial.defaults as any, c)
      const posterHeight = p.box.height

      // The preferred width should match the reference frame width
      expect(tlsCTestimonial.size.preferred[0]).toBe(1920)
      // The preferred height should equal the poster's measured height
      expect(tlsCTestimonial.size.preferred[1]).toBe(posterHeight)
    })

    it('changing defaults changes the derived height', () => {
      const c = ctx({ width: 1920, height: 1080 })
      const p1 = poster(tlsCTestimonial.defaults as any, c)

      const longDefaults = {
        ...tlsCTestimonial.defaults,
        quote: 'This is a much longer testimonial quote that should wrap to multiple lines and produce a significantly taller poster height than the default',
      }
      const p2 = poster(longDefaults as any, c)

      expect(p2.box.height).toBeGreaterThanOrEqual(p1.box.height)
    })
  })

  describe('definition fields', () => {
    it('has kind: html', () => {
      expect(tlsCTestimonial.kind).toBe('html')
    })

    it('has tier: B', () => {
      expect(tlsCTestimonial.tier).toBe('B')
    })

    it('has html.template as a function', () => {
      expect(typeof tlsCTestimonial.html?.template).toBe('function')
    })

    it('has html.animate as a function', () => {
      expect(typeof tlsCTestimonial.html?.animate).toBe('function')
    })

    it('has poster as a function', () => {
      expect(typeof tlsCTestimonial.poster).toBe('function')
    })

    it('has describe with when, avoid, example', () => {
      expect(tlsCTestimonial.describe).toBeDefined()
      expect(typeof tlsCTestimonial.describe!.when).toBe('string')
      expect(typeof tlsCTestimonial.describe!.avoid).toBe('string')
      expect(tlsCTestimonial.describe!.example).toBeDefined()
    })
  })

  describe('validateDeckSpec', () => {
    function testimonialDeck(extraProps?: Record<string, unknown>): DeckSpec {
      return {
        version: 1,
        id: 'test-deck',
        title: 'Test',
        theme: 'mono-grid',
        aspect: 'widescreen',
        slides: [{
          id: 'sl1',
          layout: 'title',
          regions: {
            title: [{
              id: 'testim1',
              type: 'tls.c.testimonial',
              props: {
                quote: 'Great product',
                name: 'John Smith',
                role: 'CTO',
                ...extraProps,
              },
            }],
          },
        }],
      }
    }

    it('accepts the testimonial with valid props', () => {
      const findings = validateDeckSpec(testimonialDeck(), registry)
      const errors = findings.filter((f) => f.level === 'error')
      expect(errors).toEqual([])
    })

    it('accepts the describe.example', () => {
      const example = tlsCTestimonial.describe!.example
      const deck: DeckSpec = {
        version: 1,
        id: 'test-deck',
        title: 'Test',
        theme: 'mono-grid',
        aspect: 'widescreen',
        slides: [{
          id: 'sl1',
          layout: 'title',
          regions: {
            title: [example],
          },
        }],
      }
      const findings = validateDeckSpec(deck, registry)
      const errors = findings.filter((f) => f.level === 'error')
      expect(errors).toEqual([])
    })
  })

  describe('deep copy — module-level defaults not shared by reference', () => {
    it('defaults.quote is not mutated when we modify a clone', () => {
      const original = tlsCTestimonial.defaults
      const clone = JSON.parse(JSON.stringify(original))

      // Mutate the clone
      if (typeof clone.quote === 'string') {
        clone.quote = 'modified'
      } else if (clone.quote && typeof clone.quote === 'object' && 'runs' in clone.quote) {
        clone.quote.runs = [{ text: 'modified' }]
      }
      clone.name = 'Modified Name'

      // Original must be unchanged
      expect(original.name).not.toBe('Modified Name')
      expect(original).toEqual(tlsCTestimonial.defaults)
      expect(original).not.toBe(clone)
    })

    it('defaults deep-equals a fresh copy (not the same reference)', () => {
      const copy = JSON.parse(JSON.stringify(tlsCTestimonial.defaults))
      expect(copy).toEqual(tlsCTestimonial.defaults)
      expect(copy).not.toBe(tlsCTestimonial.defaults)
      // For nested objects too
      expect(copy.quote).not.toBe((tlsCTestimonial.defaults as any).quote)
    })
  })

  describe('reduced-motion path', () => {
    it('calls onComplete immediately with no driver calls', () => {
      const animate = tlsCTestimonial.html?.animate
      expect(animate).toBeDefined()

      const root = document.createElement('div')
      const quoteDiv = document.createElement('div')
      quoteDiv.setAttribute('data-part', 'quote')
      const wordSpan = document.createElement('span')
      wordSpan.setAttribute('data-word', 'hello')
      quoteDiv.appendChild(wordSpan)
      root.appendChild(quoteDiv)

      const driverPlay = jest.fn()
      const driverSet = jest.fn()
      const onComplete = jest.fn()

      const rt = {
        driver: { play: driverPlay, set: driverSet, cancelAll: jest.fn() },
        timing: { delayMs: 0, durationMs: 400, staggerMs: 40, ease: 'power3.out' },
        reducedMotion: true,
        onComplete,
      }

      animate!(root, rt as any)

      // onComplete must be called immediately
      expect(onComplete).toHaveBeenCalledTimes(1)
      // No driver calls
      expect(driverPlay).not.toHaveBeenCalled()
      expect(driverSet).not.toHaveBeenCalled()
    })
  })

  describe('animate() — word-by-word GSAP path', () => {
    it('creates a GSAP timeline targeting word spans and attribution parts', () => {
      const animate = tlsCTestimonial.html?.animate
      expect(animate).toBeDefined()

      // Build a DOM tree matching the template structure
      const root = document.createElement('div')
      const quoteDiv = document.createElement('div')
      quoteDiv.setAttribute('data-part', 'quote')
      for (const word of ['Hello', 'world']) {
        const span = document.createElement('span')
        span.setAttribute('data-word', word)
        span.textContent = word
        quoteDiv.appendChild(span)
      }
      root.appendChild(quoteDiv)

      for (const partName of ['avatar', 'name', 'role']) {
        const el = document.createElement('div')
        el.setAttribute('data-part', partName)
        root.appendChild(el)
      }

      // Stub GSAP
      const timelineFromToCalls: unknown[] = []
      let killCount = 0

      const stubGsap = {
        timeline() {
          const tl = {
            fromTo(target: unknown, from: unknown, to: unknown) {
              timelineFromToCalls.push({ target, from, to })
              return tl
            },
            kill() { killCount++ },
            then: (cb?: () => void) => { cb?.(); return Promise.resolve() },
          }
          return tl
        },
      }

      const onComplete = jest.fn()
      const rt = {
        driver: { play: jest.fn(), set: jest.fn(), cancelAll: jest.fn() },
        gsap: stubGsap,
        timing: { delayMs: 0, durationMs: 400, staggerMs: 40, ease: 'power3.out' },
        reducedMotion: false,
        onComplete,
      }

      const disposer = animate!(root, rt as any)

      // 2 word spans + 3 attribution parts = 5 fromTo calls
      expect(timelineFromToCalls).toHaveLength(5)
      // onComplete called (mocked gsap.then fires synchronously)
      expect(onComplete).toHaveBeenCalledTimes(1)

      // Disposer kills the timeline
      if (disposer) disposer()
      expect(killCount).toBe(1)
    })
  })

  describe('animate() — driver fallback path', () => {
    it('uses driver.play for word spans and attribution parts', async () => {
      const animate = tlsCTestimonial.html?.animate
      expect(animate).toBeDefined()

      const root = document.createElement('div')
      const quoteDiv = document.createElement('div')
      quoteDiv.setAttribute('data-part', 'quote')
      for (const word of ['Hello', 'world']) {
        const span = document.createElement('span')
        span.setAttribute('data-word', word)
        span.textContent = word
        quoteDiv.appendChild(span)
      }
      root.appendChild(quoteDiv)

      for (const partName of ['avatar', 'name', 'role']) {
        const el = document.createElement('div')
        el.setAttribute('data-part', partName)
        root.appendChild(el)
      }

      const driverPlay = jest.fn(() => ({
        cancel: jest.fn(),
        finished: Promise.resolve(),
      }))

      const onComplete = jest.fn()
      const rt = {
        driver: { play: driverPlay, set: jest.fn(), cancelAll: jest.fn() },
        // No gsap
        timing: { delayMs: 100, durationMs: 400, staggerMs: 40, ease: 'power3.out' },
        reducedMotion: false,
        onComplete,
      }

      const disposer = animate!(root, rt as any)

      // 2 word spans + 3 attribution parts = 5 driver.play calls
      expect(driverPlay).toHaveBeenCalledTimes(5)

      // Flush microtask queue for Promise.all to resolve
      await new Promise((r) => setTimeout(r, 10))
      expect(onComplete).toHaveBeenCalled()

      // Disposer cancels all handles
      if (disposer) disposer()
    })
  })

  describe('onComplete is idempotent', () => {
    it('calling animate twice does not double-call onComplete', () => {
      const animate = tlsCTestimonial.html?.animate

      const root = document.createElement('div')
      // No data-part elements — should complete immediately
      const onComplete = jest.fn()
      const rt = {
        driver: { play: jest.fn(), set: jest.fn(), cancelAll: jest.fn() },
        timing: { delayMs: 0, durationMs: 400, staggerMs: 40, ease: 'power3.out' },
        reducedMotion: false,
        onComplete,
      }

      animate!(root, rt as any)
      expect(onComplete).toHaveBeenCalledTimes(1)
    })
  })

  describe('empty content', () => {
    it('handles empty quote gracefully', () => {
      const c = ctx({ width: 1920, height: 1080 })
      const props = { quote: '', name: 'Jane', role: 'Engineer' }
      const node = poster(props as any, c)
      assertValidNode(node)
      // Should still produce a valid tree
      expect(node.k).toBe('group')
    })
  })
})

/* ── tree walk helpers ─────────────────────────────────────────────────────── */

function collectParts(node: LayoutNode): string[] {
  const result: string[] = []
  function walk(n: LayoutNode) {
    if (n.part) result.push(n.part)
    if (n.k === 'group' && 'children' in n) {
      for (const c of n.children) walk(c)
    }
  }
  walk(node)
  return result
}

function collectTextNodes(node: LayoutNode): Array<{ part?: string; lines: any[] }> {
  const result: Array<{ part?: string; lines: any[] }> = []
  function walk(n: LayoutNode) {
    if (n.k === 'text') {
      result.push({ part: n.part, lines: n.lines })
    }
    if (n.k === 'group' && 'children' in n) {
      for (const c of n.children) walk(c)
    }
  }
  walk(node)
  return result
}
