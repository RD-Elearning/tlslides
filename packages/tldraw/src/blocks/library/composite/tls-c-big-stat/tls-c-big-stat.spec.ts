/**
 * Tests for tls.c.big-stat — one enormous headline number with a label
 * and context line (kind: 'html').
 *
 * Covers:
 * - validateDeckSpec accepts the example
 * - data-part set === motion.parts set
 * - Template value text equals poster value text (all four format values + negative/zero)
 * - Escaping: every string slot with <img onerror=...> → no img/on* survives
 * - Reduced motion calls onComplete immediately, no driver calls
 * - Host-node assertion (layout returns k:host with render id and poster)
 * - Definition fields (kind, tier, html, poster, motion)
 * - Module-level defaults: deep-copied, not aliased
 */

import { tlsCBigStat } from './index'
import { makeCtx, SIZES, assertValidNode } from '../../text/test-helpers'
import { formatValue } from './schema'
import { poster } from './poster'
import { template } from './template'
import { validateDeckSpec } from '../../../validate-deck-spec'
import { BlockRegistry } from '../../../registry'
import { registerBuiltInBlocks } from '../../../library'
import type { DeckSpec, LayoutContext, LayoutNode, Paint } from '../../../types'
import type { BigStatProps } from './schema'

/* ── helpers ───────────────────────────────────────────────────────────────── */

const registry = (() => {
  const r = new BlockRegistry()
  registerBuiltInBlocks(r)
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
    box: { x: 0, y: 0, width: c.box.width, height: c.box.height },
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

/** Collect all text node content from a LayoutNode tree (DFS). */
function collectTextNodes(node: LayoutNode): Array<{ part?: string; text: string }> {
  const result: Array<{ part?: string; text: string }> = []
  function walk(n: LayoutNode) {
    if (n.k === 'text') {
      result.push({ part: n.part, text: n.lines.map((l: any) => l.text).join('') })
    }
    if (n.k === 'group' && 'children' in n) {
      for (const c of n.children) walk(c)
    }
  }
  walk(node)
  return result
}

/* ── tests ─────────────────────────────────────────────────────────────────── */

describe('tls.c.big-stat', () => {
  /* ── definition fields ──────────────────────────────────────────────────── */

  describe('definition fields', () => {
    it('has kind: html', () => {
      expect(tlsCBigStat.kind).toBe('html')
    })

    it('has tier: B', () => {
      expect(tlsCBigStat.tier).toBe('B')
    })

    it('has html.template as a function', () => {
      expect(typeof tlsCBigStat.html?.template).toBe('function')
    })

    it('has html.animate as a function', () => {
      expect(typeof tlsCBigStat.html?.animate).toBe('function')
    })

    it('has poster as a function', () => {
      expect(typeof tlsCBigStat.poster).toBe('function')
    })

    it('has type tls.c.big-stat', () => {
      expect(tlsCBigStat.type).toBe('tls.c.big-stat')
    })
  })

  /* ── poster geometry at 3 sizes ─────────────────────────────────────────── */

  describe('poster at 3 sizes with defaults', () => {
    it.each(SIZES)('produces valid tree at $label ($box.width×$box.height)', ({ box }) => {
      const c = ctx(box)
      const node = poster(tlsCBigStat.defaults as BigStatProps, c)
      assertValidNode(node)
      expect(node.k).toBe('group')
      expect(node.part).toBe('root')
    })
  })

  /* ── host-node assertion ────────────────────────────────────────────────── */

  describe('layout() returns a host node', () => {
    it('layout returns k:host with render tls.c.big-stat and poster', () => {
      const c = ctx({ width: 1920, height: 1080 })
      const node = tlsCBigStat.layout(tlsCBigStat.defaults as any, c)
      expect(node.k).toBe('host')
      expect((node as any).render).toBe('tls.c.big-stat')
      expect((node as any).poster).toBeDefined()
      expect((node as any).poster.k).toBe('group')
    })
  })

  /* ── parts match motion.parts ───────────────────────────────────────────── */

  describe('motion.parts matches data-part names', () => {
    it('motion.parts declares value, label, context', () => {
      expect(tlsCBigStat.motion.parts).toEqual(
        expect.arrayContaining(['value', 'label', 'context'])
      )
    })

    it('template emits data-part attributes matching motion.parts', () => {
      const c = ctx({ width: 1920, height: 1080 })
      const html = template(tlsCBigStat.defaults as BigStatProps, tplCtx(c))
      const templateParts = Array.from(html.matchAll(/data-part="([^"]+)"/g))
        .map((m) => m[1])
        .sort()
      const motionParts = [...(tlsCBigStat.motion.parts ?? [])].sort()
      expect(templateParts).toEqual(motionParts)
    })

    it('poster contains the same non-root parts as motion.parts', () => {
      const c = ctx({ width: 1920, height: 1080 })
      const p = poster(tlsCBigStat.defaults as BigStatProps, c)
      const posterParts = collectParts(p).filter((p) => p !== 'root').sort()
      const motionParts = [...(tlsCBigStat.motion.parts ?? [])].sort()
      expect(posterParts).toEqual(motionParts)
    })
  })

  /* ── describe.example validates ─────────────────────────────────────────── */

  describe('validateDeckSpec', () => {
    // Registered by the built-in barrel after R10 integration; the guard keeps
    // a standalone run from throwing "already registered".
    const localRegistry = (() => {
      const r = new BlockRegistry()
      registerBuiltInBlocks(r)
      if (!r.has(tlsCBigStat.type)) r.register(tlsCBigStat)
      return r
    })()

    function bigStatDeck(extraProps?: Record<string, unknown>): DeckSpec {
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
              id: 'stat1',
              type: 'tls.c.big-stat',
              props: {
                value: 4200000,
                label: 'Total Revenue',
                ...extraProps,
              },
            }],
          },
        }],
      }
    }

    it('accepts the example from describe.example', () => {
      const findings = validateDeckSpec(
        {
          version: 1,
          id: 'test-deck',
          title: 'Test',
          theme: 'mono-grid',
          aspect: 'widescreen',
          slides: [{
            id: 'sl1',
            layout: 'title',
            regions: {
              title: [tlsCBigStat.describe!.example],
            },
          }],
        },
        localRegistry,
      )
      const errors = findings.filter((f) => f.level === 'error')
      expect(errors).toEqual([])
    })

    it('accepts valid props', () => {
      const findings = validateDeckSpec(bigStatDeck(), localRegistry)
      const errors = findings.filter((f) => f.level === 'error')
      expect(errors).toEqual([])
    })
  })

  /* ── template value matches poster value — all format values + edge cases ─ */

  describe('template vs poster value text — same story rule', () => {
    const formatCases: Array<{ format: BigStatProps['format']; value: number; prefix?: string; suffix?: string; label: string }> = [
      { format: 'plain', value: 1234567, label: 'plain int' },
      { format: 'plain', value: 1234.56, label: 'plain decimal' },
      { format: 'compact', value: 4200000, prefix: '$', label: 'compact M' },
      { format: 'compact', value: 750, label: 'compact small' },
      { format: 'compact', value: 1500000000, label: 'compact B' },
      { format: 'percent', value: 0.42, label: 'percent' },
      { format: 'percent', value: 1.0, label: 'percent 100%' },
      { format: 'currency', value: 1234567.89, label: 'currency' },
      { format: 'plain', value: 0, label: 'zero' },
      { format: 'plain', value: -42, label: 'negative' },
      { format: 'compact', value: -2500000, prefix: '$', label: 'negative compact' },
      { format: 'percent', value: -0.05, label: 'negative percent' },
      { format: 'currency', value: 0, label: 'currency zero' },
    ]

    it.each(formatCases)('format=$format, value=$value ($label): template text === poster text', ({ format, value, prefix, suffix }) => {
      const props: BigStatProps = {
        value,
        label: 'Test Label',
        context: 'Test Context',
        format,
        prefix: prefix ?? '',
        suffix: suffix ?? '',
      }

      // Poster text
      const c = ctx({ width: 1920, height: 1080 })
      const p = poster(props, c)
      const posterTexts = collectTextNodes(p)
      const posterValueText = posterTexts.find((t) => t.part === 'value')?.text ?? ''

      // Template text (strip HTML tags)
      const html = template(props, tplCtx(c))
      const templatePlain = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

      // The formatted value text from both must be identical
      const formattedValue = formatValue(props)
      expect(posterValueText).toBe(formattedValue)
      expect(templatePlain).toContain(formattedValue)
    })
  })

  /* ── escaping ───────────────────────────────────────────────────────────── */

  describe('escaping', () => {
    it('escapes HTML in all string slots', () => {
      const c = ctx({ width: 1920, height: 1080 })
      const injection = '<img src=x onerror=alert(1)>'

      const maliciousProps: BigStatProps = {
        value: 42,
        label: injection,
        context: injection,
        format: 'plain',
        prefix: injection,
        suffix: injection,
      }

      const html = template(maliciousProps, tplCtx(c))

      // No raw <img> tag
      expect(html).not.toMatch(/<img[\s>]/)
      // Escaped versions should be present
      expect(html).toContain('&lt;img')
    })

    it('no on* attributes survive in parsed DOM', () => {
      const c = ctx({ width: 1920, height: 1080 })
      const injection = '<img src=x onerror=alert(1)>'

      const maliciousProps: BigStatProps = {
        value: 42,
        label: injection,
        context: injection,
        format: 'plain',
        prefix: injection,
        suffix: injection,
      }

      const html = template(maliciousProps, tplCtx(c))

      const doc = new DOMParser().parseFromString(html, 'text/html')
      for (const el of Array.from(doc.querySelectorAll('*'))) {
        for (const attr of Array.from(el.attributes)) {
          expect(attr.name).not.toMatch(/^on/)
        }
      }
    })

    it('all string slots escaped through ctx.esc() — injection in value via prefix/suffix', () => {
      const c = ctx({ width: 1920, height: 1080 })
      const injection = '<img src=x onerror=alert(1)>'

      // Test prefix and suffix — they appear in the formatted value text
      const maliciousProps: BigStatProps = {
        value: 42,
        label: 'ok',
        format: 'plain',
        prefix: injection,
        suffix: injection,
      }

      const html = template(maliciousProps, tplCtx(c))

      // No raw <img> tag
      expect(html).not.toMatch(/<img[\s>]/)
      // No on* attributes on real elements
      const doc = new DOMParser().parseFromString(html, 'text/html')
      for (const el of Array.from(doc.querySelectorAll('*'))) {
        for (const attr of Array.from(el.attributes)) {
          expect(attr.name).not.toMatch(/^on/)
        }
      }
    })
  })

  /* ── reduced motion ─────────────────────────────────────────────────────── */

  describe('reduced motion', () => {
    it('calls onComplete immediately with no driver calls', () => {
      const animate = tlsCBigStat.html?.animate
      expect(animate).toBeDefined()

      const root = document.createElement('div')
      const valueEl = document.createElement('div')
      valueEl.setAttribute('data-part', 'value')
      valueEl.textContent = '$4.2M'
      root.appendChild(valueEl)

      const labelEl = document.createElement('div')
      labelEl.setAttribute('data-part', 'label')
      labelEl.textContent = 'Revenue'
      root.appendChild(labelEl)

      const driver = {
        play: jest.fn(),
        set: jest.fn(),
        cancelAll: jest.fn(),
      }

      const onComplete = jest.fn()

      animate!(root, {
        driver: driver as any,
        gsap: undefined,
        timing: { delayMs: 0, durationMs: 800, staggerMs: 0, ease: 'power3.out' },
        reducedMotion: true,
        onComplete,
      })

      // onComplete must be called immediately
      expect(onComplete).toHaveBeenCalledTimes(1)
      // No driver calls
      expect(driver.play).not.toHaveBeenCalled()
      expect(driver.set).not.toHaveBeenCalled()
    })
  })

  /* ── module-level defaults: deep copy, not alias ────────────────────────── */

  describe('defaults not aliased by reference', () => {
    it('poster does not mutate defaults', () => {
      const original = JSON.parse(JSON.stringify(tlsCBigStat.defaults))
      const c = ctx({ width: 1920, height: 1080 })
      poster(tlsCBigStat.defaults as BigStatProps, c)
      expect(tlsCBigStat.defaults).toEqual(original)
      // Structural check: not the same reference
      expect(tlsCBigStat.defaults).not.toBe(original)
    })
  })

  /* ── poster text content ────────────────────────────────────────────────── */

  describe('poster text content', () => {
    it('has value, label, context text nodes with defaults', () => {
      const c = ctx({ width: 1920, height: 1080 })
      const node = poster(tlsCBigStat.defaults as BigStatProps, c)
      const parts = collectParts(node)
      expect(parts).toContain('value')
      expect(parts).toContain('label')
      expect(parts).toContain('context')
    })

    it('without context, poster omits context part', () => {
      const props: BigStatProps = { value: 42, label: 'Answer' }
      const c = ctx({ width: 1920, height: 1080 })
      const node = poster(props, c)
      const parts = collectParts(node)
      expect(parts).toContain('value')
      expect(parts).toContain('label')
      expect(parts).not.toContain('context')
    })
  })

  /* ── formatValue shared helper ──────────────────────────────────────────── */

  describe('formatValue (shared helper)', () => {
    it('plain: formats integer without decimals', () => {
      expect(formatValue({ value: 42, label: 'x' })).toBe('42')
    })

    it('plain: formats decimal with up to 10 significant digits', () => {
      expect(formatValue({ value: 3.14, label: 'x', format: 'plain' })).toBe('3.14')
    })

    it('compact: thousands', () => {
      expect(formatValue({ value: 1500, label: 'x', format: 'compact' })).toBe('1.5K')
    })

    it('compact: millions', () => {
      expect(formatValue({ value: 4200000, label: 'x', format: 'compact' })).toBe('4.2M')
    })

    it('compact: billions', () => {
      expect(formatValue({ value: 1500000000, label: 'x', format: 'compact' })).toBe('1.5B')
    })

    it('compact: sub-thousand', () => {
      expect(formatValue({ value: 750, label: 'x', format: 'compact' })).toBe('750')
    })

    it('percent: multiplies by 100 and appends %', () => {
      expect(formatValue({ value: 0.42, label: 'x', format: 'percent' })).toBe('42%')
    })

    it('percent: 100%', () => {
      expect(formatValue({ value: 1.0, label: 'x', format: 'percent' })).toBe('100%')
    })

    it('currency: thousands separator', () => {
      expect(formatValue({ value: 1234567, label: 'x', format: 'currency' })).toBe('1,234,567')
    })

    it('prefix and suffix applied', () => {
      expect(formatValue({ value: 42, label: 'x', prefix: '$', suffix: 'M' })).toBe('$42M')
    })

    it('negative plain', () => {
      expect(formatValue({ value: -42, label: 'x' })).toBe('-42')
    })

    it('zero plain', () => {
      expect(formatValue({ value: 0, label: 'x' })).toBe('0')
    })

    it('negative compact', () => {
      expect(formatValue({ value: -2500000, label: 'x', format: 'compact', prefix: '$' })).toBe('$-2.5M')
    })
  })

  /* ── size derived from poster ───────────────────────────────────────────── */

  describe('size derived from defaults', () => {
    it('size.preferred is set from the poster of defaults, not by hand', () => {
      const c = ctx({ width: 1920, height: 1080 })
      const p = poster(tlsCBigStat.defaults as BigStatProps, c)
      const posterHeight = p.box.height

      expect(tlsCBigStat.size.preferred[0]).toBe(1920)
      expect(tlsCBigStat.size.preferred[1]).toBe(posterHeight)
    })
  })

  /* ── surface background ─────────────────────────────────────────────────── */

  describe('surface background', () => {
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
      const node = poster(tlsCBigStat.defaults as BigStatProps, c)
      const root = node as Extract<LayoutNode, { k: 'group' }>
      const bg = root.children[0] as Extract<LayoutNode, { k: 'rect' }>
      expect(bg.k).toBe('rect')
      expect(bg.fill).toEqual(paint)
      expect(bg.box).toEqual(node.box)
      // Structural background — must not be a data-part
      expect(bg.part).toBeUndefined()
    })
  })
})
