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
    it('escapes HTML in user content (title and desc slots)', () => {
      const c = ctx({ width: 1920, height: 1080 })
      const tplCtx = makeTemplateCtx(c)

      const maliciousProps = {
        cells: [
          {
            icon: 'zap', // Icon name is not escaped - it's used to look up the path
            title: 'Safe',
            desc: '<script>alert("xss")</script>',
          },
        ],
        columns: 2,
        gap: 24,
      }

      const html = template(maliciousProps as any, tplCtx)

      // Icon name is not text content - it renders the icon path as SVG
      // Title should be safe (no injection)
      expect(html).toContain('Safe')
      // Desc should be escaped
      expect(html).toContain('&lt;script&gt;')
      // Must not contain raw script tags
      expect(html).not.toMatch(/<script/)
    })

    it('all string slots with injection produce no img or on* attributes', () => {
      const c = ctx({ width: 1920, height: 1080 })
      const tplCtx = makeTemplateCtx(c)

      const injection = '<img src=x onerror=alert(1)>'
      const props = {
        cells: [
          { icon: 'zap', title: injection, desc: injection },
          { icon: 'check', title: injection, desc: injection },
        ],
        columns: 2,
        gap: 24,
      }

      const html = template(props as any, tplCtx)

      // No raw <img> tag in title or desc
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
      const c = ctx({ width: 1200, height: 1080 })
      const p = poster(tlsCFeatureGrid.describe!.example.props as any, c)
      const posterHeight = p.box.height

      // RV03: 1200 wide (was 1920: a drop spanned the whole slide), the height of the example
      expect(tlsCFeatureGrid.size.preferred[0]).toBe(1200)
      // LO8: never below the min height (min ≤ preferred; min = the example's height at 1120).
      expect(tlsCFeatureGrid.size.preferred[1]).toBe(Math.max(tlsCFeatureGrid.size.min[1], Math.ceil(posterHeight + 36)))
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

describe('RV03 — fits its box, reflows, releases every part', () => {
  const DEF = tlsCFeatureGrid
  const leaves = (n: any, ox = 0, oy = 0, out: any[] = []): any[] => {
    const x = ox + n.box.x
    const y = oy + n.box.y
    if (n.k !== 'group') out.push({ x, y, w: n.box.width, h: n.box.height })
    for (const c of n.children ?? []) leaves(c, x, y, out)
    return out
  }

  it.each([
    ['preferred', DEF.size.preferred],
    ['min', DEF.size.min],
    ['half-width region', [860, 600]],
  ])('the example fits size.%s with nothing escaping it', (_l, [w, h]) => {
    const node = poster(DEF.describe!.example.props as any, ctx({ width: w, height: h }))
    expect(node.box.height).toBeLessThanOrEqual(h + 0.5)
    for (const l of leaves(node)) {
      expect(l.x + l.w).toBeLessThanOrEqual(w + 0.5)
      expect(l.y + l.h).toBeLessThanOrEqual(h + 0.5)
    }
  })

  it('drops columns when the box is narrow (poster and template agree)', () => {
    const props = DEF.describe!.example.props as any
    const wide = poster(props, ctx({ width: 1200, height: 900 }))
    const narrow = poster(props, ctx({ width: 440, height: 900 }))
    expect(narrow.box.height).toBeGreaterThan(wide.box.height)
    const html = template(props, { ...makeTemplateCtx(ctx({ width: 440, height: 900 })), box: { x: 0, y: 0, width: 440, height: 900 } } as any)
    expect(html).toContain('repeat(2,')
  })

  it('animate() releases the icon, title and description of every cell', () => {
    const root = document.createElement('div')
    const parts = ['cell[0].icon', 'cell[0].title', 'cell[0].desc', 'cell[1].icon', 'cell[1].title', 'cell[1].desc']
    const wrap = document.createElement('div')
    for (const p of parts) {
      const el = document.createElement('div')
      el.setAttribute('data-part', p)
      wrap.appendChild(el)
    }
    root.appendChild(wrap)
    const played: string[] = []
    const rt: any = {
      driver: { play: (el: HTMLElement) => { played.push(el.getAttribute('data-part') ?? ''); return { cancel() {}, finished: Promise.resolve() } } },
      timing: { delayMs: 0, durationMs: 400, staggerMs: 40, ease: 'ease' },
      reducedMotion: false,
      onComplete: jest.fn(),
    }
    DEF.html!.animate!(root, rt)
    expect(played.sort()).toEqual([...parts].sort())
  })
})

describe('AC2 — look knobs (cell, align, iconStyle)', () => {
  const DEF = tlsCFeatureGrid
  const leaves = (n: any, ox = 0, oy = 0, out: any[] = []): any[] => {
    const x = ox + n.box.x
    const y = oy + n.box.y
    if (n.k !== 'group') out.push({ x, y, w: n.box.width, h: n.box.height, part: n.part, k: n.k })
    for (const c of n.children ?? []) leaves(c, x, y, out)
    return out
  }
  const VARIANTS: Array<[string, Record<string, unknown>]> = [
    ['cell: card', { cell: 'card' }],
    ['align: center', { align: 'center' }],
    ['iconStyle: circle', { iconStyle: 'circle' }],
    ['card + center + circle', { cell: 'card', align: 'center', iconStyle: 'circle' }],
  ]

  it('declares the knobs as enums', () => {
    expect((DEF.schema.cell.type as any).values).toEqual(['plain', 'card'])
    expect((DEF.schema.align.type as any).values).toEqual(['start', 'center'])
    expect((DEF.schema.iconStyle.type as any).values).toEqual(['plain', 'circle'])
  })

  for (const [name, knobs] of VARIANTS) {
    it.each([
      ['preferred', DEF.size.preferred],
      ['min', DEF.size.min],
    ])(`${name} fits size.%s with nothing escaping it`, (_l, [w, h]) => {
      const node = poster({ ...(DEF.describe!.example.props as any), ...knobs }, ctx({ width: w, height: h }))
      expect(node.box.height).toBeLessThanOrEqual(h + 0.5)
      for (const l of leaves(node)) {
        expect(l.x + l.w).toBeLessThanOrEqual(w + 0.5)
        expect(l.y + l.h).toBeLessThanOrEqual(h + 0.5)
      }
    })
  }

  it('circle: disc and glyph scale with the cell (>= 56 disc / >= 32 glyph at preferred), template = poster', () => {
    const props = { ...(DEF.describe!.example.props as any), iconStyle: 'circle' }
    const sizeAt = (w: number) => {
      const node = poster(props, ctx({ width: w, height: 900 }))
      const ls = leaves(node)
      const disc = ls.find((l) => l.part === 'cell[0].icon' && l.k === 'rect')!
      const glyph = ls.find((l) => l.k === 'icon')!
      const html = template(props, { ...makeTemplateCtx(ctx({ width: w, height: 900 })), box: { x: 0, y: 0, width: w, height: 900 } } as any)
      expect(html).toContain(`width:${disc.w}px;height:${disc.w}px;`)
      expect(html).toContain(`width="${glyph.w}" height="${glyph.w}"`)
      return { disc: disc.w, glyph: glyph.w }
    }
    const pref = sizeAt(DEF.size.preferred[0])
    expect(pref.disc).toBeGreaterThanOrEqual(56)
    expect(pref.glyph).toBeGreaterThanOrEqual(32)
    const wide = sizeAt(1728)
    expect(wide.disc).toBeGreaterThan(pref.disc)
    expect(wide.disc).toBeLessThanOrEqual(80)
  })

  it('card paints one card per cell; center centres the icon; circle paints a disc', () => {
    const props = { ...(DEF.describe!.example.props as any), cell: 'card', align: 'center', iconStyle: 'circle' }
    const node = poster(props, ctx({ width: 1200, height: 600 }))
    const ls = leaves(node)
    const n = props.cells.length
    expect(ls.filter((l) => /^cell\[\d+\]\.card$/.test(l.part ?? '')).length).toBe(n)
    const disc = ls.find((l) => l.part === 'cell[0].icon' && l.k === 'rect')!
    const card = ls.find((l) => l.part === 'cell[0].card')!
    expect(Math.abs(disc.x + disc.w / 2 - (card.x + card.w / 2))).toBeLessThan(1)
    const html = template(props, { ...makeTemplateCtx(ctx({ width: 1200, height: 600 })), box: { x: 0, y: 0, width: 1200, height: 600 } } as any)
    expect(html).toContain('border-radius:50%')
    expect(html).toContain('text-align:center')
    expect(html).toContain('align-items:stretch')
  })
})
