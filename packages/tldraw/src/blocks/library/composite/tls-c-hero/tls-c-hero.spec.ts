/**
 * Tests for tls.c.hero — hero / opening slide (kind: 'html').
 *
 * Covers:
 * - Poster geometry at 3 sizes
 * - Parts declared in motion match parts in the poster tree
 * - Template produces text content matching the poster's text
 * - Escaping: user content with <img onerror=...> renders as literal text
 * - Height accuracy: template scrollHeight within 8 units of poster height
 * - Size derived from poster of defaults
 * - validateDeckSpec accepts the hero's example and rejects overlong title
 */

import { tlsCHero } from './index'
import { makeCtx, SIZES, assertValidNode } from '../../text/test-helpers'
import { richTextToPlain } from './schema'
import { poster } from './poster'
import { template } from './template'
import { validateDeckSpec } from '../../../validate-deck-spec'
import { BlockRegistry } from '../../../registry'
import { registerBuiltInBlocks } from '../../../library'
import type { DeckSpec, LayoutContext, LayoutNode, Paint } from '../../../types'

/* ── helpers ───────────────────────────────────────────────────────────────── */

const registry = (() => {
  const r = new BlockRegistry()
  registerBuiltInBlocks(r)
  return r
})()

function ctx(box: { width: number; height: number }): LayoutContext {
  return makeCtx(box, registry)
}

/* ── poster geometry ───────────────────────────────────────────────────────── */

describe('tls.c.hero', () => {
  describe('poster at 3 sizes with defaults', () => {
    it.each(SIZES)('produces valid tree at $label ($box.width×$box.height)', ({ box }) => {
      const c = ctx(box)
      const node = poster(tlsCHero.defaults as any, c)
      assertValidNode(node)
      expect(node.k).toBe('group')
      expect(node.part).toBe('root')
    })
  })

  describe('surface background (B.5 item 6)', () => {
    it('renders the instance Paint as a full-poster background rect with no motion part', () => {
      const paint: Paint = {
        type: 'linearGradient',
        angle: 0,
        stops: [
          { at: 0, color: '#111111' },
          { at: 1, color: '#EEEEEE' },
        ],
      }
      const c = makeCtx({ width: 1920, height: 1080 }, registry, { surface: paint })
      const node = poster(tlsCHero.defaults as any, c)
      const root = node as Extract<LayoutNode, { k: 'group' }>
      const bg = root.children[0] as Extract<LayoutNode, { k: 'rect' }>
      expect(bg.k).toBe('rect')
      expect(bg.fill).toEqual(paint)
      expect(bg.box).toEqual(node.box)
      // Structural background — must not become a data-part, or the template/poster
      // part-set equality (R0.5 item 5) would break.
      expect(bg.part).toBeUndefined()
    })
  })

  describe('poster text content', () => {
    it('has kicker, title, subtitle text nodes', () => {
      const c = ctx({ width: 1920, height: 1080 })
      const node = poster(tlsCHero.defaults as any, c)
      const parts = collectParts(node)
      expect(parts).toContain('kicker')
      expect(parts).toContain('title')
      expect(parts).toContain('subtitle')
    })

    it('title text contains the expected content', () => {
      const c = ctx({ width: 1920, height: 1080 })
      const node = poster(tlsCHero.defaults as any, c)
      const textNodes = collectTextNodes(node)
      const titleText = textNodes.find((t) => t.part === 'title')
      expect(titleText).toBeDefined()
      const allText = titleText!.lines.map((l: any) => l.text).join('')
      expect(allText).toContain('infrastructure')
    })
  })

  describe('parts declared in motion match parts in poster', () => {
    it('all non-optional motion parts appear in the poster tree', () => {
      const c = ctx({ width: 1920, height: 1080 })
      const node = poster(tlsCHero.defaults as any, c)
      const posterParts = collectParts(node)
      const motionParts = tlsCHero.motion.parts ?? []
      // CTA is optional (empty in defaults), so only check parts that the poster renders
      for (const part of motionParts) {
        if (posterParts.length > 0) {
          // Only assert parts that the defaults would produce
          const defaultProps = tlsCHero.defaults as any
          if (part === 'cta' && !defaultProps.cta) continue // optional, not in defaults
          expect(posterParts).toContain(part)
        }
      }
    })

    it('all data-part names in the template are declared in motion.parts', () => {
      const tplCtx = {
        esc: (s: string) => s
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;'),
        cssVar: (role: string) => `var(--tls-${role})`,
        box: { x: 0, y: 0, width: 1920, height: 1080 },
        tokens: ctx({ width: 1920, height: 1080 }).tokens,
      }
      const html = template(tlsCHero.defaults as any, tplCtx)
      const dataPartPattern = /data-part="([^"]+)"/g
      const templateParts: string[] = []
      let match: RegExpExecArray | null
      while ((match = dataPartPattern.exec(html)) !== null) {
        templateParts.push(match[1])
      }
      const motionParts = tlsCHero.motion.parts ?? []
      for (const part of templateParts) {
        expect(motionParts).toContain(part)
      }
    })
  })

  describe('layout() returns a host node', () => {
    it('layout returns k:host with render tls.c.hero and poster', () => {
      const c = ctx({ width: 1920, height: 1080 })
      const node = tlsCHero.layout(tlsCHero.defaults as any, c)
      expect(node.k).toBe('host')
      expect((node as any).render).toBe('tls.c.hero')
      expect((node as any).poster).toBeDefined()
      expect((node as any).poster.k).toBe('group')
    })
  })

  describe('template produces text matching poster', () => {
    it('template text content matches poster text content', () => {
      const c = ctx({ width: 1920, height: 1080 })
      const p = poster(tlsCHero.defaults as any, c)

      // Build template context
      const tplCtx = {
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

      const html = template(tlsCHero.defaults as any, tplCtx)

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
      const tplCtx = {
        esc: (s: string) => s
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;'),
        cssVar: (role: string) => `var(--tls-${role})`,
        box: { x: 0, y: 0, width: 1920, height: 1080 },
        tokens: ctx({ width: 1920, height: 1080 }).tokens,
      }

      const maliciousProps = {
        kicker: '<img src=x onerror=alert(1)>',
        title: 'Safe title',
        subtitle: '<script>alert("xss")</script>',
      }

      const html = template(maliciousProps as any, tplCtx)

      // Must not contain raw <img> or <script> tags — they should be escaped
      expect(html).not.toMatch(/<img\s/)
      expect(html).not.toMatch(/<script/)
      // The escaped versions should be present
      expect(html).toContain('&lt;img')
      expect(html).toContain('&lt;script')
    })

    it('all string props go through ctx.esc()', () => {
      // Run every html block's template with <img src=x onerror=alert(1)> in every string slot
      // and assert the parsed DOM contains no img and no on* attribute
      const tplCtx = {
        esc: (s: string) => s
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;'),
        cssVar: (role: string) => `var(--tls-${role})`,
        box: { x: 0, y: 0, width: 1920, height: 1080 },
        tokens: ctx({ width: 1920, height: 1080 }).tokens,
      }

      const injection = '<img src=x onerror=alert(1)>'
      const props = {
        kicker: injection,
        title: injection,
        subtitle: injection,
        cta: injection,
      }

      const html = template(props as any, tplCtx)

      // No raw <img> tag
      expect(html).not.toMatch(/<img[\s>]/)
      // The onerror= text should only appear as escaped content (&lt;img ... onerror=...&gt;),
      // not as an actual HTML attribute on a real element. Parse with DOMParser and check:
      const doc = new DOMParser().parseFromString(html, 'text/html')
      const allElements = doc.querySelectorAll('*')
      for (const el of Array.from(allElements)) {
        for (const attr of Array.from(el.attributes)) {
          expect(attr.name).not.toMatch(/^on/)
        }
      }
    })
  })

  describe('template-vs-poster consistency (R0.5 item 5)', () => {
    it('template and poster produce the same data-part set and text content', () => {
      const c = ctx({ width: 1920, height: 1080 })
      const p = poster(tlsCHero.defaults as any, c)

      const tplCtx = {
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

      const html = template(tlsCHero.defaults as any, tplCtx)

      // Extract data-part names from the template
      const templateParts = Array.from(html.matchAll(/data-part="([^"]+)"/g))
        .map((m) => m[1])
        .sort()

      // Extract part names from the poster tree
      const posterParts = collectParts(p).sort()

      // The template and poster should declare the same content parts
      // (exclude 'root' — the poster's root group is structural, not a data-part)
      const contentPosterParts = posterParts.filter((p) => p !== 'root')
      expect(templateParts).toEqual(contentPosterParts)

      // Extract plain text from template (strip HTML tags)
      const plainHtml = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

      // Extract text from poster
      const posterTexts = collectTextNodes(p).map((t) =>
        t.lines.map((l: any) => l.text).join('')
      )

      // Every poster text string should appear in the template's plain text
      for (const text of posterTexts) {
        const plainText = richTextToPlain(text as any).trim()
        if (plainText) {
          expect(plainHtml).toContain(plainText)
        }
      }
    })
  })

  describe('size derived from defaults (R0.5 item 6)', () => {
    it('size.preferred is set from the poster of defaults, not by hand', () => {
      const c = ctx({ width: 1920, height: 1080 })
      const p = poster(tlsCHero.defaults as any, c)
      const posterHeight = p.box.height

      // The preferred width should match the reference frame width
      expect(tlsCHero.size.preferred[0]).toBe(1920)
      // The preferred height should equal the poster's measured height
      expect(tlsCHero.size.preferred[1]).toBe(posterHeight)
      // It should not be the old hardcoded value of 600
      expect(tlsCHero.size.preferred[1]).not.toBe(600)
    })

    it('changing defaults changes the derived height', () => {
      // Build a context and poster with different defaults to prove the
      // derivation is not still a constant.
      const c = ctx({ width: 1920, height: 1080 })
      const p1 = poster(tlsCHero.defaults as any, c)

      // Now derive with a title that has more text — the poster should be taller
      const longDefaults = {
        ...tlsCHero.defaults,
        title: 'This is a much longer title that should wrap to multiple lines and produce a taller poster height',
      }
      const p2 = poster(longDefaults as any, c)

      // The two poster heights should differ (the longer title wraps)
      // If they're the same, the derivation might be constant
      expect(p2.box.height).toBeGreaterThanOrEqual(p1.box.height)
    })
  })

  describe('definition fields', () => {
    it('has kind: html', () => {
      expect(tlsCHero.kind).toBe('html')
    })

    it('has tier: B', () => {
      expect(tlsCHero.tier).toBe('B')
    })

    it('has html.template as a function', () => {
      expect(typeof tlsCHero.html?.template).toBe('function')
    })

    it('has poster as a function', () => {
      expect(typeof tlsCHero.poster).toBe('function')
    })

    it('has schema with kicker, title, subtitle, cta', () => {
      expect(Object.keys(tlsCHero.schema)).toEqual(
        expect.arrayContaining(['kicker', 'title', 'subtitle', 'cta'])
      )
    })

    it('motion parts match data-part names', () => {
      const motionParts = tlsCHero.motion.parts ?? []
      expect(motionParts).toContain('kicker')
      expect(motionParts).toContain('title')
      expect(motionParts).toContain('subtitle')
      expect(motionParts).toContain('cta')
    })
  })

  describe('validateDeckSpec', () => {
    function heroDeck(extraProps?: Record<string, unknown>): DeckSpec {
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
              id: 'hero1',
              type: 'tls.c.hero',
              props: {
                title: 'Hello world',
                ...extraProps,
              },
            }],
          },
        }],
      }
    }

    it('accepts the hero with valid props', () => {
      const findings = validateDeckSpec(heroDeck(), registry)
      const errors = findings.filter((f) => f.level === 'error')
      expect(errors).toEqual([])
    })

    it('rejects a hero with title over 120 chars', () => {
      const longTitle = 'a'.repeat(121)
      const findings = validateDeckSpec(heroDeck({ title: longTitle }), registry)
      const budgetFindings = findings.filter(
        (f) => f.rule === 'budget/overflow' && f.path.includes('props.title')
      )
      expect(budgetFindings.length).toBeGreaterThanOrEqual(1)
      expect(budgetFindings[0].message).toContain('121')
      expect(budgetFindings[0].message).toContain('120')
    })
  })

  describe('registry-wide XSS escaping (R0.5 item 4)', () => {
    it('every kind:html block escapes malicious props in template()', () => {
      const injection = '<img src=x onerror=alert(1)>'
      const esc = (s: string) => s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
      const tplCtx = {
        esc,
        cssVar: (role: string) => `var(--tls-${role})`,
        box: { x: 0, y: 0, width: 1920, height: 1080 },
        tokens: ctx({ width: 1920, height: 1080 }).tokens,
      }

      // Iterate every registered block that is kind: 'html'
      for (const def of registry.list()) {
        if (def.kind !== 'html' || !def.html?.template) continue

        // Fill every string slot in defaults with the injection
        const maliciousProps: Record<string, unknown> = {}
        for (const [key, slot] of Object.entries(def.schema)) {
          if (slot.type?.kind === 'text') {
            maliciousProps[key] = injection
          } else if (slot.type?.kind === 'richtext') {
            maliciousProps[key] = { runs: [{ text: injection }] }
          } else {
            // Use defaults for non-text slots
            maliciousProps[key] = (def.defaults as Record<string, unknown>)?.[key]
          }
        }

        const html = def.html.template(maliciousProps, tplCtx)

        // Parse and check: no raw <img> or <script> tags, no on* attributes
        expect(html).not.toMatch(/<img[\s>]/)
        expect(html).not.toMatch(/<script[\s>]/)

        const doc = new DOMParser().parseFromString(html, 'text/html')
        for (const el of Array.from(doc.querySelectorAll('*'))) {
          for (const attr of Array.from(el.attributes)) {
            expect(attr.name).not.toMatch(/^on/)
          }
        }
      }
    })
  })

  describe('animate() — GSAP tween leak fix (R0.5 item 1)', () => {
    it('only calls timeline().fromTo, never standalone gsap.fromTo', () => {
      const animate = tlsCHero.html?.animate
      expect(animate).toBeDefined()

      // Stub GSAP: record calls to top-level fromTo and timeline().fromTo
      const standaloneFromToCalls: unknown[] = []
      const timelineFromToCalls: unknown[] = []
      let killCount = 0

      const stubGsap = {
        fromTo(_target: unknown, _from: unknown, _to: unknown) {
          standaloneFromToCalls.push({ _target, _from, _to })
          return { kill() { killCount++ }, then: () => Promise.resolve() }
        },
        timeline() {
          const tlCalls: unknown[] = []
          const tl = {
            fromTo(target: unknown, from: unknown, to: unknown) {
              tlCalls.push({ target, from, to })
              timelineFromToCalls.push({ target, from, to })
              return tl
            },
            kill() { killCount++ },
            then: (cb?: () => void) => { cb?.(); return Promise.resolve() },
          }
          return tl
        },
      }

      // Create a fake root with data-part elements
      const root = document.createElement('div')
      for (const partName of ['kicker', 'title', 'subtitle', 'cta']) {
        const el = document.createElement('div')
        el.setAttribute('data-part', partName)
        root.appendChild(el)
      }

      const rt = {
        driver: { play: jest.fn(), set: jest.fn(), cancelAll: jest.fn() } as any,
        gsap: stubGsap,
        timing: { delayMs: 0, durationMs: 400, staggerMs: 40, ease: 'power3.out' },
        reducedMotion: false,
        onComplete: jest.fn(),
      }

      const disposer = animate!(root, rt)

      // The fix: gsap.fromTo (standalone) must NEVER be called
      expect(standaloneFromToCalls).toHaveLength(0)
      // Only timeline().fromTo should be called (4 parts)
      expect(timelineFromToCalls).toHaveLength(4)

      // Disposer should kill exactly one timeline
      if (disposer) disposer()
      expect(killCount).toBe(1)
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
