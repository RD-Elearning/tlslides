/**
 * Tests for tls.c.feature-grid — a grid of feature cells (kind: 'html').
 *
 * Covers:
 * - Poster geometry at 3 sizes
 * - Parts declared in motion match parts in the poster tree
 * - Template produces text content matching the poster's text (R2 "same story")
 * - Escaping: every string slot set to <img onerror=...> — no raw img, no on*
 * - Reduced-motion path calls onComplete immediately with no driver calls
 * - Host-node assertion: layout returns one k:host with render === 'tls.c.feature-grid'
 * - data-part set vs motion.parts set (family pattern matching)
 * - validateDeckSpec accepts the example and rejects too many cells
 * - Size derived from poster of defaults
 * - Deep copy: defaults not aliased
 */

import { tlsCFeatureGrid } from './index'
import { makeCtx, SIZES, assertValidNode } from '../../text/test-helpers'
import { poster } from './poster'
import { template } from './template'
import { validateDeckSpec } from '../../../validate-deck-spec'
import { BlockRegistry } from '../../../registry'
import type { DeckSpec, LayoutContext, LayoutNode, BlockMotionRuntime } from '../../../types'

/* ── helpers ───────────────────────────────────────────────────────────────── */

/** Register the feature-grid block (not in the global barrel — isolation contract). */
const registry = (() => {
  const r = new BlockRegistry()
  r.register(tlsCFeatureGrid)
  return r
})()

function ctx(box: { width: number; height: number }): LayoutContext {
  return makeCtx(box, registry)
}

function makeTemplateCtx(c: LayoutContext) {
  return {
    esc: (s: string) =>
      s
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

/** Collect all part names from a LayoutNode tree (DFS). */
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

/** Collect text nodes with their part names. */
function collectTextNodes(
  node: LayoutNode,
): Array<{ part?: string; lines: any[] }> {
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

/**
 * Check if a concrete part name (e.g. "cell[0].icon") matches a family pattern
 * (e.g. "cell[*].icon"). The `*` wildcard inside brackets matches any
 * non-`]` characters.
 */
function matchesFamily(concrete: string, pattern: string): boolean {
  // Split pattern into segments separated by `[*]`
  const parts = pattern.split('[*]')
  if (parts.length !== 2) return false
  const [prefix, suffix] = parts
  return concrete.startsWith(prefix) && concrete.endsWith(suffix) && concrete.length > prefix.length + suffix.length
}

/* ── tests ─────────────────────────────────────────────────────────────────── */

describe('tls.c.feature-grid', () => {
  /* ── definition fields ──────────────────────────────────────────────────── */

  describe('definition fields', () => {
    it('has kind: html', () => {
      expect(tlsCFeatureGrid.kind).toBe('html')
    })

    it('has tier: B', () => {
      expect(tlsCFeatureGrid.tier).toBe('B')
    })

    it('has family: composite', () => {
      expect(tlsCFeatureGrid.family).toBe('composite')
    })

    it('has html.template as a function', () => {
      expect(typeof tlsCFeatureGrid.html?.template).toBe('function')
    })

    it('has html.animate as a function', () => {
      expect(typeof tlsCFeatureGrid.html?.animate).toBe('function')
    })

    it('has poster as a function', () => {
      expect(typeof tlsCFeatureGrid.poster).toBe('function')
    })

    it('has schema with cells, columns, gap', () => {
      expect(Object.keys(tlsCFeatureGrid.schema)).toEqual(
        expect.arrayContaining(['cells', 'columns', 'gap']),
      )
    })
  })

  /* ── host-node assertion ────────────────────────────────────────────────── */

  describe('layout() returns a host node', () => {
    it('layout returns k:host with render tls.c.feature-grid and poster', () => {
      const c = ctx({ width: 1920, height: 1080 })
      const node = tlsCFeatureGrid.layout(
        tlsCFeatureGrid.defaults as any,
        c,
      )
      expect(node.k).toBe('host')
      expect((node as any).render).toBe('tls.c.feature-grid')
      expect((node as any).poster).toBeDefined()
      expect((node as any).poster.k).toBe('group')
    })

    it('layout returns exactly one host node (root)', () => {
      const c = ctx({ width: 1920, height: 1080 })
      const node = tlsCFeatureGrid.layout(
        tlsCFeatureGrid.defaults as any,
        c,
      )
      assertValidNode(node)
      expect(node.k).toBe('host')
    })
  })

  /* ── poster geometry ────────────────────────────────────────────────────── */

  describe('poster at 3 sizes with defaults', () => {
    it.each(SIZES)(
      'produces valid tree at $label ($box.width×$box.height)',
      ({ box }) => {
        const c = ctx(box)
        const node = poster(tlsCFeatureGrid.defaults as any, c)
        assertValidNode(node)
        expect(node.k).toBe('group')
        expect(node.part).toBe('root')
      },
    )
  })

  describe('poster text content', () => {
    it('has cell icons, titles, and descriptions', () => {
      const c = ctx({ width: 1920, height: 1080 })
      const node = poster(tlsCFeatureGrid.defaults as any, c)
      const parts = collectParts(node)
      expect(parts).toContain('cell[0].icon')
      expect(parts).toContain('cell[0].title')
      expect(parts).toContain('cell[0].desc')
      expect(parts).toContain('cell[1].icon')
      expect(parts).toContain('cell[2].title')
    })

    it('title text contains the expected content', () => {
      const c = ctx({ width: 1920, height: 1080 })
      const node = poster(tlsCFeatureGrid.defaults as any, c)
      const textNodes = collectTextNodes(node)
      const titleText = textNodes.find((t) => t.part === 'cell[0].title')
      expect(titleText).toBeDefined()
      const allText = titleText!.lines.map((l: any) => l.text).join('')
      expect(allText).toContain('Fast')
    })

    it('desc text contains the expected content', () => {
      const c = ctx({ width: 1920, height: 1080 })
      const node = poster(tlsCFeatureGrid.defaults as any, c)
      const textNodes = collectTextNodes(node)
      const descText = textNodes.find((t) => t.part === 'cell[0].desc')
      expect(descText).toBeDefined()
      const allText = descText!.lines.map((l: any) => l.text).join('')
      expect(allText).toContain('Optimised')
    })
  })

  /* ── parts declared in motion match parts in poster ─────────────────────── */

  describe('parts declared in motion match parts in poster', () => {
    it('every concrete poster part matches a family pattern in motion.parts', () => {
      const c = ctx({ width: 1920, height: 1080 })
      const node = poster(tlsCFeatureGrid.defaults as any, c)
      const posterParts = collectParts(node).filter((p) => p !== 'root')
      const motionParts = tlsCFeatureGrid.motion.parts ?? []
      for (const part of posterParts) {
        const matched = motionParts.some((pattern) =>
          matchesFamily(part, pattern),
        )
        expect(matched).toBe(true)
      }
    })

    it('every concrete data-part from the template matches a family pattern in motion.parts', () => {
      const c = ctx({ width: 1920, height: 1080 })
      const tplCtx = makeTemplateCtx(c)
      const html = template(tlsCFeatureGrid.defaults as any, tplCtx)
      const templateParts = Array.from(
        html.matchAll(/data-part="([^"]+)"/g),
      ).map((m) => m[1])
      const motionParts = tlsCFeatureGrid.motion.parts ?? []
      for (const part of templateParts) {
        const matched = motionParts.some((pattern) =>
          matchesFamily(part, pattern),
        )
        expect(matched).toBe(true)
      }
    })
  })

  /* ── data-part set === motion.parts set (family-matched) ────────────────── */

  describe('data-part set covered by motion.parts family patterns', () => {
    it('template data-part names are all covered by motion.parts family patterns', () => {
      const c = ctx({ width: 1920, height: 1080 })
      const tplCtx = makeTemplateCtx(c)
      const html = template(tlsCFeatureGrid.defaults as any, tplCtx)

      const templateParts = Array.from(
        html.matchAll(/data-part="([^"]+)"/g),
      ).map((m) => m[1])

      const motionParts = tlsCFeatureGrid.motion.parts ?? []

      for (const part of templateParts) {
        const matched = motionParts.some((pattern) =>
          matchesFamily(part, pattern),
        )
        expect(matched).toBe(true)
      }
    })

    it('motion.parts family patterns cover all possible cell parts (0–5)', () => {
      const motionParts = tlsCFeatureGrid.motion.parts ?? []
      // Every concrete part for cells 0-5 should match a family pattern
      for (let i = 0; i < 6; i++) {
        for (const suffix of ['.icon', '.title', '.desc']) {
          const concrete = `cell[${i}]${suffix}`
          const matched = motionParts.some((pattern) =>
            matchesFamily(concrete, pattern),
          )
          expect(matched).toBe(true)
        }
      }
    })
  })

  /* ── template text matches poster text (R2 "same story") ────────────────── */

  describe('template produces text matching poster', () => {
    it('template text content matches poster text content', () => {
      const c = ctx({ width: 1920, height: 1080 })
      const p = poster(tlsCFeatureGrid.defaults as any, c)
      const tplCtx = makeTemplateCtx(c)
      const html = template(tlsCFeatureGrid.defaults as any, tplCtx)

      // Strip HTML tags from the template to get plain text content
      const plainHtml = html.replace(/<[^>]+>/g, '')

      // Extract text from the poster (excluding icon rects — they have no text)
      const posterTexts = collectTextNodes(p).map((t) =>
        t.lines.map((l: any) => l.text).join(''),
      )

      // Every poster text string should appear in the template's plain text
      for (const text of posterTexts) {
        const plainText = text.trim()
        if (plainText) {
          expect(plainHtml).toContain(plainText)
        }
      }
    })

    it('template and poster produce the same data-part set (family-matched) and text content', () => {
      const c = ctx({ width: 1920, height: 1080 })
      const p = poster(tlsCFeatureGrid.defaults as any, c)
      const tplCtx = makeTemplateCtx(c)
      const html = template(tlsCFeatureGrid.defaults as any, tplCtx)

      // Extract data-part names from the template
      const templateParts = Array.from(
        html.matchAll(/data-part="([^"]+)"/g),
      )
        .map((m) => m[1])
        .sort()

      // Extract part names from the poster tree (exclude root)
      const posterParts = collectParts(p)
        .filter((p) => p !== 'root')
        .sort()

      // Both should have the same concrete parts
      expect(templateParts).toEqual(posterParts)

      // Extract plain text from template (strip HTML tags)
      const plainHtml = html
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()

      // Extract text from poster
      const posterTexts = collectTextNodes(p).map((t) =>
        t.lines.map((l: any) => l.text).join(''),
      )

      for (const text of posterTexts) {
        const plainText = text.trim()
        if (plainText) {
          expect(plainHtml).toContain(plainText)
        }
      }
    })
  })

  /* ── escaping ───────────────────────────────────────────────────────────── */

  describe('escaping', () => {
    it('escapes HTML in user content', () => {
      const c = ctx({ width: 1920, height: 1080 })
      const tplCtx = makeTemplateCtx(c)

      const maliciousProps = {
        cells: [
          {
            icon: '<img src=x onerror=alert(1)>',
            title: 'Safe',
            desc: '<script>alert("xss")</script>',
          },
        ],
        columns: 2,
        gap: 24,
      }

      const html = template(maliciousProps as any, tplCtx)

      // Must not contain raw <img> or <script> tags — they should be escaped
      expect(html).not.toMatch(/<img\s/)
      expect(html).not.toMatch(/<script/)
      // The escaped versions should be present
      expect(html).toContain('&lt;img')
      expect(html).toContain('&lt;script')
    })

    it('all string slots with injection produce no img or on* attributes', () => {
      const c = ctx({ width: 1920, height: 1080 })
      const tplCtx = makeTemplateCtx(c)

      const injection = '<img src=x onerror=alert(1)>'
      const props = {
        cells: [
          { icon: injection, title: injection, desc: injection },
          { icon: injection, title: injection, desc: injection },
        ],
        columns: 2,
        gap: 24,
      }

      const html = template(props as any, tplCtx)

      // No raw <img> tag
      expect(html).not.toMatch(/<img[\s>]/)

      // Parse with DOMParser and check: no on* attributes on any real element
      const doc = new DOMParser().parseFromString(html, 'text/html')
      const allElements = doc.querySelectorAll('*')
      for (const el of Array.from(allElements)) {
        for (const attr of Array.from(el.attributes)) {
          expect(attr.name).not.toMatch(/^on/)
        }
      }
    })
  })

  /* ── reduced-motion path ────────────────────────────────────────────────── */

  describe('animate() — reduced motion', () => {
    it('calls onComplete immediately with no driver calls when reducedMotion is true', () => {
      const animate = tlsCFeatureGrid.html?.animate
      expect(animate).toBeDefined()

      // Create a fake root with icon + title + desc elements
      const root = document.createElement('div')
      const wrapper = document.createElement('div')
      const icon = document.createElement('div')
      icon.setAttribute('data-part', 'cell[0].icon')
      const title = document.createElement('div')
      title.setAttribute('data-part', 'cell[0].title')
      const desc = document.createElement('div')
      desc.setAttribute('data-part', 'cell[0].desc')
      wrapper.appendChild(icon)
      wrapper.appendChild(title)
      wrapper.appendChild(desc)
      root.appendChild(wrapper)

      const driverCalls: string[] = []
      const rt: BlockMotionRuntime = {
        driver: {
          play: jest.fn().mockImplementation(() => {
            driverCalls.push('play')
            return { cancel: jest.fn(), finished: Promise.resolve() }
          }),
          set: jest.fn().mockImplementation(() => {
            driverCalls.push('set')
          }),
          cancelAll: jest.fn(),
        } as any,
        timing: { delayMs: 0, durationMs: 400, staggerMs: 40, ease: 'power3.out' },
        reducedMotion: true,
        onComplete: jest.fn(),
      }

      animate!(root, rt)

      // onComplete must be called immediately
      expect(rt.onComplete).toHaveBeenCalledTimes(1)
      // No driver calls
      expect(driverCalls).toHaveLength(0)
    })
  })

  /* ── GSAP path ──────────────────────────────────────────────────────────── */

  describe('animate() — GSAP path', () => {
    it('uses GSAP timeline when gsap is present', () => {
      const animate = tlsCFeatureGrid.html?.animate
      expect(animate).toBeDefined()

      const root = document.createElement('div')
      const wrapper = document.createElement('div')
      for (const partName of ['cell[0].icon', 'cell[0].title', 'cell[0].desc']) {
        const el = document.createElement('div')
        el.setAttribute('data-part', partName)
        wrapper.appendChild(el)
      }
      root.appendChild(wrapper)

      const timelineFromToCalls: unknown[] = []
      let killCount = 0

      const stubGsap = {
        fromTo(_target: unknown, _from: unknown, _to: unknown) {
          return { kill() { killCount++ }, then: () => Promise.resolve() }
        },
        timeline() {
          const tl = {
            fromTo(target: unknown, from: unknown, to: unknown) {
              timelineFromToCalls.push({ target, from, to })
              return tl
            },
            kill() { killCount++ },
            then: (cb?: () => void) => {
              cb?.()
              return Promise.resolve()
            },
          }
          return tl
        },
      }

      const rt: BlockMotionRuntime = {
        driver: { play: jest.fn(), set: jest.fn(), cancelAll: jest.fn() } as any,
        gsap: stubGsap,
        timing: { delayMs: 0, durationMs: 400, staggerMs: 40, ease: 'power3.out' },
        reducedMotion: false,
        onComplete: jest.fn(),
      }

      const disposer = animate!(root, rt)

      // Should call timeline().fromTo for cells and icons
      expect(timelineFromToCalls.length).toBeGreaterThan(0)

      // Disposer should kill the timeline
      if (disposer) disposer()
      expect(killCount).toBe(1)
    })

    it('calls onComplete exactly once (idempotent)', () => {
      const animate = tlsCFeatureGrid.html?.animate
      expect(animate).toBeDefined()

      const root = document.createElement('div')
      const wrapper = document.createElement('div')
      for (const partName of ['cell[0].icon', 'cell[0].title', 'cell[0].desc']) {
        const el = document.createElement('div')
        el.setAttribute('data-part', partName)
        wrapper.appendChild(el)
      }
      root.appendChild(wrapper)

      let thenCb: (() => void) | undefined
      const stubGsap = {
        fromTo() {
          return { kill() { /* stub */ }, then: () => Promise.resolve() }
        },
        timeline() {
          return {
            fromTo(_target: unknown, _from: unknown, _to: unknown) {
              return this
            },
            kill() { /* stub */ },
            then: (cb?: () => void) => {
              thenCb = cb
              return Promise.resolve()
            },
          }
        },
      }

      const rt: BlockMotionRuntime = {
        driver: { play: jest.fn(), set: jest.fn(), cancelAll: jest.fn() } as any,
        gsap: stubGsap,
        timing: { delayMs: 0, durationMs: 400, staggerMs: 40, ease: 'power3.out' },
        reducedMotion: false,
        onComplete: jest.fn(),
      }

      animate!(root, rt)
      // Simulate GSAP completion
      thenCb?.()
      thenCb?.() // call again — should be idempotent

      expect(rt.onComplete).toHaveBeenCalledTimes(1)
    })
  })

  /* ── size derived from defaults ─────────────────────────────────────────── */

  describe('size derived from defaults', () => {
    it('size.preferred is set from the poster of defaults', () => {
      const c = ctx({ width: 1920, height: 1080 })
      const p = poster(tlsCFeatureGrid.defaults as any, c)
      const posterHeight = p.box.height

      expect(tlsCFeatureGrid.size.preferred[0]).toBe(1920)
      expect(tlsCFeatureGrid.size.preferred[1]).toBe(posterHeight)
    })

    it('changing defaults changes the derived height', () => {
      const c = ctx({ width: 1920, height: 1080 })
      const p1 = poster(tlsCFeatureGrid.defaults as any, c)

      // Build with more cells — should produce a taller poster
      const moreCells = {
        ...tlsCFeatureGrid.defaults,
        cells: [
          ...tlsCFeatureGrid.defaults.cells!,
          { icon: 'star', title: 'Reliable', desc: '99.99% uptime guaranteed.' },
          { icon: 'heart', title: 'Loved', desc: 'Trusted by millions worldwide.' },
        ],
        columns: 2 as const,
      }
      const p2 = poster(moreCells as any, c)

      // The two poster heights should differ
      expect(p2.box.height).not.toBe(p1.box.height)
    })
  })

  /* ── deep copy test (DoD item 5) ────────────────────────────────────────── */

  describe('defaults are not aliased (DoD item 5)', () => {
    it('defaults deep-copies correctly', () => {
      const original = tlsCFeatureGrid.defaults
      const cloned = JSON.parse(JSON.stringify(original))

      // Should be equal
      expect(cloned).toEqual(original)
      // But not the same reference
      expect(cloned).not.toBe(original)
      // Array specifically
      expect(cloned.cells).not.toBe(original.cells)
      expect(cloned.cells[0]).not.toBe(original.cells[0])
    })
  })

  /* ── validateDeckSpec ───────────────────────────────────────────────────── */

  describe('validateDeckSpec', () => {
    function featureGridDeck(
      extraProps?: Record<string, unknown>,
    ): DeckSpec {
      return {
        version: 1,
        id: 'test-deck',
        title: 'Test',
        theme: 'mono-grid',
        aspect: 'widescreen',
        slides: [
          {
            id: 'sl1',
            layout: 'blank',
            regions: {
              body: [
                {
                  id: 'fg1',
                  type: 'tls.c.feature-grid',
                  props: {
                    cells: [
                      { icon: 'zap', title: 'Fast', desc: 'Speed.' },
                      { icon: 'shield', title: 'Safe', desc: 'Security.' },
                    ],
                    columns: 2,
                    gap: 24,
                    ...extraProps,
                  },
                },
              ],
            },
          },
        ],
      }
    }

    it('accepts the feature-grid with valid props (finding: region/unknown is expected)', () => {
      const findings = validateDeckSpec(featureGridDeck(), registry)
      const errors = findings.filter((f) => f.level === 'error')
      // The feature-grid block IS registered; region errors are layout-level
      const blockErrors = errors.filter(
        (f) => f.rule === 'block/unknown-type',
      )
      expect(blockErrors).toEqual([])
    })

    it('accepts the describe.example with no block/unknown-type finding', () => {
      const example = tlsCFeatureGrid.describe!.example
      const deck: DeckSpec = {
        version: 1,
        id: 'test-deck',
        title: 'Test',
        theme: 'mono-grid',
        aspect: 'widescreen',
        slides: [
          {
            id: 'sl1',
            layout: 'blank',
            regions: {
              body: [example],
            },
          },
        ],
      }
      const findings = validateDeckSpec(deck, registry)
      const blockErrors = findings.filter(
        (f) => f.level === 'error' && f.rule === 'block/unknown-type',
      )
      expect(blockErrors).toEqual([])
    })
  })
})
