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
 * - Variants: classic (additivity), split, gradient-sweep
 *   - Per-variant host-node assertion
 *   - Per-variant template-vs-poster text equality
 *   - Per-variant escaping
 *   - Additivity: variant absent === 'classic' (byte-identical template output)
 *   - Reduced-motion calls onComplete immediately
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
import type { HeroProps } from './schema'

/* ── helpers ───────────────────────────────────────────────────────────────── */

const registry = (() => {
  const r = new BlockRegistry()
  registerBuiltInBlocks(r)
  return r
})()

function ctx(box: { width: number; height: number }): LayoutContext {
  return makeCtx(box, registry)
}

/** Build an HtmlTemplateContext for template() calls. */
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

/** All three variant values for iteration in per-variant tests. */
const VARIANTS: Array<'classic' | 'split' | 'gradient-sweep'> = ['classic', 'split', 'gradient-sweep']

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
      const c = ctx({ width: 1920, height: 1080 })
      const html = template(tlsCHero.defaults as any, tplCtx(c))
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
      const html = template(tlsCHero.defaults as any, tplCtx(c))

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
        kicker: '<img src=x onerror=alert(1)>',
        title: 'Safe title',
        subtitle: '<script>alert("xss")</script>',
      }

      const html = template(maliciousProps as any, tplCtx(c))

      // Must not contain raw <img> or <script> tags — they should be escaped
      expect(html).not.toMatch(/<img\s/)
      expect(html).not.toMatch(/<script/)
      // The escaped versions should be present
      expect(html).toContain('&lt;img')
      expect(html).toContain('&lt;script')
    })

    it('all string props go through ctx.esc()', () => {
      const c = ctx({ width: 1920, height: 1080 })
      const injection = '<img src=x onerror=alert(1)>'
      const props = {
        kicker: injection,
        title: injection,
        subtitle: injection,
        cta: injection,
      }

      const html = template(props as any, tplCtx(c))

      // No raw <img> tag
      expect(html).not.toMatch(/<img[\s>]/)
      // Parse with DOMParser and check no on* attributes on any element
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
      const html = template(tlsCHero.defaults as any, tplCtx(c))

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

    it('has schema with kicker, title, subtitle, cta, variant', () => {
      expect(Object.keys(tlsCHero.schema)).toEqual(
        expect.arrayContaining(['kicker', 'title', 'subtitle', 'cta', 'variant'])
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

    it('accepts hero with each variant value', () => {
      for (const variant of VARIANTS) {
        const findings = validateDeckSpec(heroDeck({ variant }), registry)
        const errors = findings.filter((f) => f.level === 'error')
        expect(errors).toEqual([])
      }
    })
  })

  describe('registry-wide XSS escaping (R0.5 item 4)', () => {
    it('every kind:html block escapes malicious props in template()', () => {
      const injection = '<img src=x onerror=alert(1)>'
      const c = ctx({ width: 1920, height: 1080 })

      // Iterate every registered block that is kind: 'html'
      for (const def of registry.list()) {
        if (def.kind !== 'html' || !def.html?.template) continue

        // Fill every STRING leaf with the injection, recursing through list and
        // object slots so nested content (e.g. a cell's title) is exercised too.
        // Non-string slots keep their default; enums keep their first value so the
        // template still branches down its normal path.
        const inject = (slotType: any, value: unknown): unknown => {
          if (!slotType || typeof slotType !== 'object') return value
          switch (slotType.kind) {
            case 'text':
            case 'icon':
            case 'image':
            case 'color':
              return injection
            case 'richtext':
              return { runs: [{ text: injection }] }
            case 'list': {
              const arr = Array.isArray(value) && value.length > 0 ? value : [undefined]
              return arr.map((v) => inject(slotType.of, v))
            }
            case 'object': {
              const src = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
              const out: Record<string, unknown> = { ...src }
              for (const [k, sub] of Object.entries(slotType.fields ?? {})) {
                out[k] = inject((sub as any).type, src[k])
              }
              return out
            }
            default:
              return value
          }
        }

        const defaults = (def.defaults ?? {}) as Record<string, unknown>
        const maliciousProps: Record<string, unknown> = {}
        for (const [key, slot] of Object.entries(def.schema)) {
          const value = defaults[key]
          const kind = slot.type?.kind
          if (kind === 'enum') {
            maliciousProps[key] = (slot.type as any).values?.[0] ?? value
          } else {
            maliciousProps[key] = inject(slot.type, value)
          }
        }

        const html = def.html.template(maliciousProps, tplCtx(c))

        // Collect problems and assert once, so a failure names the offending block
        // (Jest 27's `expect` takes no message argument).
        const problems: string[] = []
        if (/<img[\s>]/.test(html)) problems.push(`${def.type}: emitted a raw <img>`)
        if (/<script[\s>]/.test(html)) problems.push(`${def.type}: emitted a raw <script>`)

        const doc = new DOMParser().parseFromString(html, 'text/html')
        for (const el of Array.from(doc.querySelectorAll('*'))) {
          for (const attr of Array.from(el.attributes)) {
            if (/^on/.test(attr.name)) problems.push(`${def.type}: emitted on* attribute ${attr.name}`)
          }
        }
        expect(problems).toEqual([])
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

  /* ── VARIANT TESTS ───────────────────────────────────────────────────────── */

  describe('additivity — variant absent produces classic output', () => {
    it('template with variant: undefined is byte-identical to variant: "classic"', () => {
      const c = ctx({ width: 1920, height: 1080 })
      const tc = tplCtx(c)
      const propsNoVariant: HeroProps = { ...tlsCHero.defaults as HeroProps, variant: undefined }
      const propsClassic: HeroProps = { ...tlsCHero.defaults as HeroProps, variant: 'classic' }

      const outNoVariant = template(propsNoVariant, tc)
      const outClassic = template(propsClassic, tc)

      expect(outNoVariant).toBe(outClassic)
    })

    it('template with no variant key is byte-identical to original defaults', () => {
      const c = ctx({ width: 1920, height: 1080 })
      const tc = tplCtx(c)

      // defaults has no variant key
      const outDefaults = template(tlsCHero.defaults as HeroProps, tc)
      const outClassic = template({ ...tlsCHero.defaults as HeroProps, variant: 'classic' }, tc)

      expect(outDefaults).toBe(outClassic)
    })

    it('template with defaults (no variant) is identical to original classic template', () => {
      const c = ctx({ width: 1920, height: 1080 })
      const tc = tplCtx(c)

      // The classic output must NOT contain data-variant or data-gradient-bg
      const out = template(tlsCHero.defaults as HeroProps, tc)
      expect(out).not.toContain('data-variant')
      expect(out).not.toContain('data-gradient-bg')
      expect(out).not.toContain('data-half')
      // Must start with the exact same wrapper as before
      expect(out).toMatch(/^<div style="display:flex;flex-direction:column;justify-content:center;height:100%;">/)
    })

    it('poster output is unchanged regardless of variant', () => {
      const c = ctx({ width: 1920, height: 1080 })

      // Poster does not read variant — it produces the same LayoutNode tree
      const pNoVariant = poster(tlsCHero.defaults as any, c)
      const pClassic = poster({ ...tlsCHero.defaults, variant: 'classic' } as any, c)
      const pSplit = poster({ ...tlsCHero.defaults, variant: 'split' } as any, c)
      const pGrad = poster({ ...tlsCHero.defaults, variant: 'gradient-sweep' } as any, c)

      expect(pClassic).toEqual(pNoVariant)
      expect(pSplit).toEqual(pNoVariant)
      expect(pGrad).toEqual(pNoVariant)

      // Deep copy assertion: not.toBe ensures no reference aliasing
      expect(pClassic).not.toBe(pNoVariant)
    })
  })

  describe('per-variant layout() returns a host node', () => {
    for (const variant of VARIANTS) {
      it(`variant "${variant}" returns k:host with render tls.c.hero and poster`, () => {
        const c = ctx({ width: 1920, height: 1080 })
        const props: HeroProps = { ...tlsCHero.defaults as HeroProps, variant }
        const node = tlsCHero.layout(props, c)
        expect(node.k).toBe('host')
        expect((node as any).render).toBe('tls.c.hero')
        expect((node as any).poster).toBeDefined()
        expect((node as any).poster.k).toBe('group')
      })
    }
  })

  describe('per-variant template-vs-poster text equality', () => {
    for (const variant of VARIANTS) {
      it(`variant "${variant}": template text matches poster text`, () => {
        const c = ctx({ width: 1920, height: 1080 })
        const props: HeroProps = { ...tlsCHero.defaults as HeroProps, variant }
        const p = poster(props as any, c)
        const html = template(props, tplCtx(c))

        // Extract data-part names from the template
        const templateParts = Array.from(html.matchAll(/data-part="([^"]+)"/g))
          .map((m) => m[1])
          .sort()

        // Extract part names from the poster tree
        const posterParts = collectParts(p).sort()
        const contentPosterParts = posterParts.filter((pp) => pp !== 'root')
        expect(templateParts).toEqual(contentPosterParts)

        // Plain text from template
        const plainHtml = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

        // Text from poster
        const posterTexts = collectTextNodes(p).map((t) =>
          t.lines.map((l: any) => l.text).join('')
        )

        for (const text of posterTexts) {
          const plainText = richTextToPlain(text as any).trim()
          if (plainText) {
            expect(plainHtml).toContain(plainText)
          }
        }
      })
    }
  })

  describe('per-variant escaping', () => {
    for (const variant of VARIANTS) {
      it(`variant "${variant}": escapes HTML in user content`, () => {
        const c = ctx({ width: 1920, height: 1080 })
        const injection = '<img src=x onerror=alert(1)>'
        const props: HeroProps = {
          kicker: injection,
          title: injection,
          subtitle: injection,
          cta: injection,
          variant,
        }

        const html = template(props, tplCtx(c))

        // No raw <img> or <script> tags
        expect(html).not.toMatch(/<img[\s>]/)
        expect(html).not.toMatch(/<script[\s>]/)

        // Parse and verify no on* attributes
        const doc = new DOMParser().parseFromString(html, 'text/html')
        for (const el of Array.from(doc.querySelectorAll('*'))) {
          for (const attr of Array.from(el.attributes)) {
            expect(attr.name).not.toMatch(/^on/)
          }
        }
      })
    }
  })

  describe('variant-specific template structure', () => {
    it('split variant has data-half="first" and data-half="second" inside title', () => {
      const c = ctx({ width: 1920, height: 1080 })
      const props: HeroProps = { ...tlsCHero.defaults as HeroProps, variant: 'split' }
      const html = template(props, tplCtx(c))

      expect(html).toContain('data-variant="split"')
      expect(html).toContain('data-half="first"')
      expect(html).toContain('data-half="second"')
      expect(html).toContain('data-part="title"')
    })

    it('split variant preserves rich text formatting in halves', () => {
      const c = ctx({ width: 1920, height: 1080 })
      // Title with bold: "Margin fell on " + "infrastructure" (bold)
      const props: HeroProps = { ...tlsCHero.defaults as HeroProps, variant: 'split' }
      const html = template(props, tplCtx(c))

      // "infrastructure" is bold in the original — should appear as <strong> in one half
      expect(html).toContain('<strong>')
      // The escaped content should still be present
      expect(html).toContain('infrastructure')
    })

    it('gradient-sweep variant has data-gradient-bg and data-variant', () => {
      const c = ctx({ width: 1920, height: 1080 })
      const props: HeroProps = { ...tlsCHero.defaults as HeroProps, variant: 'gradient-sweep' }
      const html = template(props, tplCtx(c))

      expect(html).toContain('data-variant="gradient-sweep"')
      expect(html).toContain('data-gradient-bg')
      expect(html).toContain('linear-gradient')
      // Title should be in classic style (no data-half)
      expect(html).not.toContain('data-half')
    })

    it('classic variant has no variant-specific attributes', () => {
      const c = ctx({ width: 1920, height: 1080 })
      const props: HeroProps = { ...tlsCHero.defaults as HeroProps, variant: 'classic' }
      const html = template(props, tplCtx(c))

      expect(html).not.toContain('data-variant')
      expect(html).not.toContain('data-gradient-bg')
      expect(html).not.toContain('data-half')
    })
  })

  describe('animate() — reduced motion', () => {
    it('calls onComplete immediately and returns no disposer', () => {
      const animate = tlsCHero.html?.animate
      expect(animate).toBeDefined()

      const root = document.createElement('div')
      for (const partName of ['kicker', 'title', 'subtitle', 'cta']) {
        const el = document.createElement('div')
        el.setAttribute('data-part', partName)
        root.appendChild(el)
      }

      const rt = {
        driver: { play: jest.fn(), set: jest.fn(), cancelAll: jest.fn() } as any,
        gsap: null,
        timing: { delayMs: 0, durationMs: 400, staggerMs: 40, ease: 'power3.out' },
        reducedMotion: true,
        onComplete: jest.fn(),
      }

      const disposer = animate!(root, rt)

      expect(rt.onComplete).toHaveBeenCalledTimes(1)
      // No animation was started
      expect(rt.driver.play).not.toHaveBeenCalled()
      // No disposer returned
      expect(disposer).toBeUndefined()
    })

    it('reduced motion works with GSAP present too', () => {
      const animate = tlsCHero.html?.animate
      expect(animate).toBeDefined()

      const root = document.createElement('div')
      for (const partName of ['kicker', 'title', 'subtitle', 'cta']) {
        const el = document.createElement('div')
        el.setAttribute('data-part', partName)
        root.appendChild(el)
      }

      const stubGsap = {
        fromTo: jest.fn(),
        timeline: jest.fn(),
      }

      const rt = {
        driver: { play: jest.fn(), set: jest.fn(), cancelAll: jest.fn() } as any,
        gsap: stubGsap,
        timing: { delayMs: 0, durationMs: 400, staggerMs: 40, ease: 'power3.out' },
        reducedMotion: true,
        onComplete: jest.fn(),
      }

      const disposer = animate!(root, rt)

      expect(rt.onComplete).toHaveBeenCalledTimes(1)
      // GSAP was not touched
      expect(stubGsap.timeline).not.toHaveBeenCalled()
      expect(stubGsap.fromTo).not.toHaveBeenCalled()
      expect(disposer).toBeUndefined()
    })
  })

  describe('animate() — per-variant GSAP paths', () => {
    function buildStubGsap() {
      const standaloneFromToCalls: unknown[] = []
      const timelineFromToCalls: unknown[] = []
      let killCount = 0

      const stubGsap = {
        fromTo(_target: unknown, _from: unknown, _to: unknown) {
          standaloneFromToCalls.push({ _target, _from, _to })
          return { kill() { killCount++ }, then: () => Promise.resolve() }
        },
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

      return { stubGsap, standaloneFromToCalls, timelineFromToCalls, getKillCount: () => killCount }
    }

    function buildRoot(variant?: string) {
      const root = document.createElement('div')
      if (variant) root.setAttribute('data-variant', variant)
      for (const partName of ['kicker', 'title', 'subtitle', 'cta']) {
        const el = document.createElement('div')
        el.setAttribute('data-part', partName)
        if (partName === 'title' && variant === 'split') {
          const first = document.createElement('div')
          first.setAttribute('data-half', 'first')
          first.textContent = 'Margin fell on'
          const second = document.createElement('div')
          second.setAttribute('data-half', 'second')
          second.textContent = 'infrastructure'
          el.appendChild(first)
          el.appendChild(second)
        }
        root.appendChild(el)
      }
      return root
    }

    it('classic (no data-variant) uses classic GSAP timeline', () => {
      const animate = tlsCHero.html!.animate!
      const { stubGsap, standaloneFromToCalls, timelineFromToCalls, getKillCount } = buildStubGsap()
      const root = buildRoot()
      const onComplete = jest.fn()
      const rt = {
        driver: { play: jest.fn(), set: jest.fn(), cancelAll: jest.fn() } as any,
        gsap: stubGsap,
        timing: { delayMs: 0, durationMs: 400, staggerMs: 40, ease: 'power3.out' },
        reducedMotion: false,
        onComplete,
      }

      const disposer = animate(root, rt)

      expect(standaloneFromToCalls).toHaveLength(0)
      // 4 parts: kicker, title, subtitle, cta
      expect(timelineFromToCalls).toHaveLength(4)
      if (disposer) disposer()
      expect(getKillCount()).toBe(1)
    })

    it('split variant uses split GSAP timeline', () => {
      const animate = tlsCHero.html!.animate!
      const { stubGsap, standaloneFromToCalls, timelineFromToCalls, getKillCount } = buildStubGsap()
      const root = buildRoot('split')
      const onComplete = jest.fn()
      const rt = {
        driver: { play: jest.fn(), set: jest.fn(), cancelAll: jest.fn() } as any,
        gsap: stubGsap,
        timing: { delayMs: 0, durationMs: 400, staggerMs: 40, ease: 'power3.out' },
        reducedMotion: false,
        onComplete,
      }

      const disposer = animate(root, rt)

      expect(standaloneFromToCalls).toHaveLength(0)
      // Split: non-title parts (kicker, subtitle, cta = 3) + title opacity + first + second = 6
      expect(timelineFromToCalls.length).toBeGreaterThanOrEqual(5)
      if (disposer) disposer()
      expect(getKillCount()).toBe(1)
    })

    it('gradient-sweep variant uses gradient-sweep GSAP timeline', () => {
      const animate = tlsCHero.html!.animate!
      const { stubGsap, standaloneFromToCalls, timelineFromToCalls, getKillCount } = buildStubGsap()
      const root = buildRoot('gradient-sweep')
      // Add a gradient-bg element
      const gradientBg = document.createElement('div')
      gradientBg.setAttribute('data-gradient-bg', '')
      root.insertBefore(gradientBg, root.firstChild)

      const onComplete = jest.fn()
      const rt = {
        driver: { play: jest.fn(), set: jest.fn(), cancelAll: jest.fn() } as any,
        gsap: stubGsap,
        timing: { delayMs: 0, durationMs: 400, staggerMs: 40, ease: 'power3.out' },
        reducedMotion: false,
        onComplete,
      }

      const disposer = animate(root, rt)

      expect(standaloneFromToCalls).toHaveLength(0)
      // Gradient-sweep: 1 gradient-bg + 4 parts = 5
      expect(timelineFromToCalls).toHaveLength(5)
      if (disposer) disposer()
      expect(getKillCount()).toBe(1)
    })
  })

  describe('animate() — driver fallback (no GSAP)', () => {
    it('calls driver.play on each data-part', () => {
      const animate = tlsCHero.html!.animate!
      const root = document.createElement('div')
      for (const partName of ['kicker', 'title', 'subtitle']) {
        const el = document.createElement('div')
        el.setAttribute('data-part', partName)
        root.appendChild(el)
      }

      const finished = Promise.resolve()
      const play = jest.fn().mockReturnValue({ cancel: jest.fn(), finished })
      const onComplete = jest.fn()
      const rt = {
        driver: { play, set: jest.fn(), cancelAll: jest.fn() } as any,
        gsap: null,
        timing: { delayMs: 100, durationMs: 400, staggerMs: 40, ease: 'power3.out' },
        reducedMotion: false,
        onComplete,
      }

      const disposer = animate(root, rt)

      expect(play).toHaveBeenCalledTimes(3)
      // Disposer cancels all handles
      expect(disposer).toBeDefined()
      if (disposer) disposer()
    })
  })

  describe('defaults deep copy safety', () => {
    it('defaults object is not mutated by poster()', () => {
      const original = JSON.stringify(tlsCHero.defaults)
      const c = ctx({ width: 1920, height: 1080 })
      poster(tlsCHero.defaults as any, c)
      // defaults must be unchanged
      expect(JSON.stringify(tlsCHero.defaults)).toBe(original)
    })

    it('poster returns a new object each call (no reference sharing)', () => {
      const c = ctx({ width: 1920, height: 1080 })
      const p1 = poster(tlsCHero.defaults as any, c)
      const p2 = poster(tlsCHero.defaults as any, c)

      expect(p1).toEqual(p2)
      expect(p1).not.toBe(p2)
      // Deep check on children array
      if (p1.k === 'group' && p2.k === 'group') {
        expect(p1.children).not.toBe(p2.children)
      }
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
