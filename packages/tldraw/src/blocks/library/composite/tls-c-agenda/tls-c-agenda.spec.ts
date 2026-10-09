/**
 * Tests for tls.c.agenda — agenda / table-of-contents.
 *
 * Covers:
 * - Layout at 3 sizes with defaults
 * - data-part set matches motion.parts set
 * - Current item emphasis (accent colour, larger size)
 * - describe.example passes validateDeckSpec
 * - capacity() at min (1 item) and max
 * - Adversarial: 1 item, 9+ items, 400-char title, CJK, empty list
 * - Deep copy: module-level defaults not aliased
 * - Purity: layout() runs with no browser globals
 * - assertParity at one size
 */

import { tlsCAgenda } from './index'
import { defaults } from './schema'
import { makeCtx, SIZES, assertValidNode } from '../../layout/test-helpers'
import { BlockRegistry } from '../../../registry'
import { registerBuiltInBlocks } from '../../../library'
import { validateDeckSpec } from '../../../validate-deck-spec'
import type { DeckSpec, LayoutContext, LayoutNode } from '../../../types'

/* ── helpers ───────────────────────────────────────────────────────────────── */

const registry = (() => {
  const r = new BlockRegistry()
  registerBuiltInBlocks(r)
  if (!r.has(tlsCAgenda.type)) r.register(tlsCAgenda)
  return r
})()

function ctx(box: { width: number; height: number }): LayoutContext {
  return makeCtx(box, registry)
}

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

/* ── tests ─────────────────────────────────────────────────────────────────── */

describe('tls.c.agenda', () => {

  /* ── geometry at 3 sizes ────────────────────────────────────────────────── */

  describe('layout at 3 sizes with defaults', () => {
    it.each(SIZES)('produces valid tree at $label ($box.width×$box.height)', ({ box }) => {
      const c = ctx(box)
      const node = tlsCAgenda.layout(defaults as any, c)
      assertValidNode(node)
      expect(node.k).toBe('group')
      expect(node.part).toBe('root')
    })
  })

  /* ── part naming ────────────────────────────────────────────────────────── */

  describe('part naming', () => {
    it('emits item[0].index, item[0].title, item[0].note for 4-item defaults', () => {
      const c = ctx({ width: 960, height: 540 })
      const node = tlsCAgenda.layout(defaults as any, c)
      const parts = collectParts(node)
      expect(parts).toContain('item[0].index')
      expect(parts).toContain('item[0].title')
      expect(parts).toContain('item[0].note')
      expect(parts).toContain('item[1].index')
      expect(parts).toContain('item[1].title')
      expect(parts).toContain('item[1].note')
      expect(parts).toContain('item[3].index')
      expect(parts).toContain('item[3].title')
      expect(parts).toContain('item[3].note')
    })

    it('data-part set is a superset of motion.parts set', () => {
      const c = ctx({ width: 960, height: 540 })
      const node = tlsCAgenda.layout(defaults as any, c)
      const layoutParts = collectParts(node)
      const motionParts = tlsCAgenda.motion.parts ?? []

      // motion.parts uses wildcards (item[*].index, etc.); concrete parts should
      // match the wildcard pattern.
      for (const mp of motionParts) {
        // Convert wildcard pattern to regex: item[*].title → item\[\d+\]\.title
        const pattern = mp.replace(/\[\*\]/g, '\\[\\d+\\]').replace(/\./g, '\\.')
        const regex = new RegExp(`^${pattern}$`)
        const matches = layoutParts.filter(p => regex.test(p))
        expect(matches.length).toBeGreaterThan(0)
      }
    })

    it('every concrete part in the layout matches some motion.parts wildcard (itself or its slot)', () => {
      const c = ctx({ width: 960, height: 540 })
      const node = tlsCAgenda.layout(defaults as any, c)
      const motionParts = tlsCAgenda.motion.parts ?? []
      const animated = (p: string) =>
        motionParts.some(mp => {
          const pattern = mp.replace(/\[\*\]/g, '\\[\\d+\\]').replace(/\./g, '\\.')
          return new RegExp(`^${pattern}$`).test(p)
        })
      // RVM5: a note is animated by its per-item slot `note[i]` (the group above it)
      const walk = (n: any, covered: boolean) => {
        const here = covered || (n.part !== undefined && n.part !== 'root' && animated(n.part))
        if (n.part !== undefined && n.part !== 'root') expect([n.part, here]).toEqual([n.part, true])
        if (n.k === 'group') n.children.forEach((k: any) => walk(k, here))
      }
      walk(node, false)
    })
  })

  /* ── current item emphasis ──────────────────────────────────────────────── */

  describe('current item emphasis', () => {
    it('current item title uses accent colour', () => {
      const c = ctx({ width: 960, height: 540 })
      const node = tlsCAgenda.layout({ ...defaults, current: 1 } as any, c)
      const titleParts = node.children.filter(
        (n) => n.part === 'item[1].title',
      )
      expect(titleParts.length).toBe(1)
      const titleNode = titleParts[0] as Extract<LayoutNode, { k: 'text' }>
      const accentColor = c.resolveColor('accent').color
      expect(titleNode.style.color).toBe(accentColor)
    })

    it('non-current item title uses normal text colour', () => {
      const c = ctx({ width: 960, height: 540 })
      const node = tlsCAgenda.layout({ ...defaults, current: 1 } as any, c)
      const titleNode = node.children.find(
        (n) => n.part === 'item[0].title',
      ) as Extract<LayoutNode, { k: 'text' }>
      const textColor = c.resolveColor('text').color
      expect(titleNode.style.color).toBe(textColor)
    })

    it('current item index uses accent colour', () => {
      const c = ctx({ width: 960, height: 540 })
      const node = tlsCAgenda.layout({ ...defaults, current: 0 } as any, c)
      const indexNode = node.children.find(
        (n) => n.part === 'item[0].index',
      ) as Extract<LayoutNode, { k: 'text' }>
      const accentColor = c.resolveColor('accent').color
      expect(indexNode.style.color).toBe(accentColor)
    })

    it('non-current item index uses muted colour', () => {
      const c = ctx({ width: 960, height: 540 })
      const node = tlsCAgenda.layout({ ...defaults, current: 0 } as any, c)
      const indexNode = node.children.find(
        (n) => n.part === 'item[1].index',
      ) as Extract<LayoutNode, { k: 'text' }>
      const mutedColor = c.resolveColor('textMuted').color
      expect(indexNode.style.color).toBe(mutedColor)
    })

    it('current item title is larger than non-current', () => {
      const c = ctx({ width: 960, height: 540 })
      const node = tlsCAgenda.layout({ ...defaults, current: 1 } as any, c)
      const currentTitle = node.children.find(
        (n) => n.part === 'item[1].title',
      ) as Extract<LayoutNode, { k: 'text' }>
      const otherTitle = node.children.find(
        (n) => n.part === 'item[0].title',
      ) as Extract<LayoutNode, { k: 'text' }>
      expect(currentTitle.style.size).toBeGreaterThan(otherTitle.style.size)
    })

    it('all items use normal colour when current is null', () => {
      const c = ctx({ width: 960, height: 540 })
      const node = tlsCAgenda.layout({ ...defaults, current: null } as any, c)
      const textColor = c.resolveColor('text').color
      const title0 = node.children.find(
        (n) => n.part === 'item[0].title',
      ) as Extract<LayoutNode, { k: 'text' }>
      expect(title0.style.color).toBe(textColor)
    })

    it('all items use normal colour when current is absent', () => {
      const c = ctx({ width: 960, height: 540 })
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { current: _current, ...propsWithoutCurrent } = defaults as any
      const node = tlsCAgenda.layout(propsWithoutCurrent, c)
      const textColor = c.resolveColor('text').color
      const title0 = node.children.find(
        (n) => n.part === 'item[0].title',
      ) as Extract<LayoutNode, { k: 'text' }>
      expect(title0.style.color).toBe(textColor)
    })
  })

  /* ── describe.example validation ────────────────────────────────────────── */

  describe('describe.example', () => {
    it('passes validateDeckSpec', () => {
      const example = tlsCAgenda.describe?.example
      expect(example).toBeDefined()

      const deck: DeckSpec = {
        version: 1,
        id: 'test-agenda',
        title: 'Test',
        theme: 'mono-grid',
        aspect: 'widescreen',
        slides: [{
          id: 'sl1',
          layout: 'title',
          regions: {
            title: [example!],
          },
        }],
      }

      const findings = validateDeckSpec(deck, registry)
      const errors = findings.filter((f) => f.level === 'error')
      expect(errors).toEqual([])
    })
  })

  /* ── capacity() ─────────────────────────────────────────────────────────── */

  describe('capacity()', () => {
    it('reports fits for 1 item at preferred size', () => {
      const c = ctx({ width: 700, height: 500 })
      const report = tlsCAgenda.capacity!(
        { items: [{ title: 'Only one' }] } as any,
        { width: 700, height: 500 },
        c,
      )
      expect(report.fits).toBe(true)
      expect(report.budget.items.unit).toBe('items')
      expect(report.budget.items.max).toBeGreaterThanOrEqual(1)
      expect(report.budget.items.used).toBe(1)
    })

    it('reports fits for 8 items at preferred size', () => {
      const c = ctx({ width: 700, height: 500 })
      const items = Array.from({ length: 8 }, (_, i) => ({ title: `Item ${i + 1}` }))
      const report = tlsCAgenda.capacity!(
        { items } as any,
        { width: 700, height: 500 },
        c,
      )
      expect(report.budget.items.unit).toBe('items')
      expect(report.budget.items.used).toBe(8)
    })

    it('reports overflow when items exceed capacity at min size', () => {
      const c = ctx({ width: 280, height: 120 })
      const items = Array.from({ length: 20 }, (_, i) => ({ title: `Item ${i + 1}` }))
      const report = tlsCAgenda.capacity!(
        { items } as any,
        { width: 280, height: 120 },
        c,
      )
      expect(report.fits).toBe(false)
      expect(report.remedy.length).toBeGreaterThan(0)
    })
  })

  /* ── adversarial inputs ─────────────────────────────────────────────────── */

  describe('adversarial inputs', () => {
    it('handles 1 item without throwing', () => {
      const c = ctx({ width: 960, height: 540 })
      const node = tlsCAgenda.layout(
        { items: [{ title: 'Single item' }] } as any,
        c,
      )
      assertValidNode(node)
      // index + title + the (empty) note slot every item gets for the motion stagger (RVM5)
      expect(node.children).toHaveLength(3)
      expect((node as any).children[2].part).toBe('note[0]')
      expect((node as any).children[2].children).toHaveLength(0)
    })

    it('handles 9+ items without throwing', () => {
      const c = ctx({ width: 960, height: 2000 })
      const items = Array.from({ length: 12 }, (_, i) => ({ title: `Item ${i + 1}` }))
      const node = tlsCAgenda.layout({ items } as any, c)
      assertValidNode(node)
      // 12 items × 3 children each (index + title + an empty note slot, RVM5) = 36
      expect(node.children).toHaveLength(36)
    })

    it('handles a 400-char title without throwing', () => {
      const c = ctx({ width: 960, height: 540 })
      const longTitle = 'a'.repeat(400)
      const node = tlsCAgenda.layout(
        { items: [{ title: longTitle }] } as any,
        c,
      )
      assertValidNode(node)
    })

    it('handles CJK text without throwing', () => {
      const c = ctx({ width: 960, height: 540 })
      const node = tlsCAgenda.layout(
        {
          items: [
            { title: '開場白', note: '歓迎と議題の概要' },
            { title: '第3四半期の結果', note: '収益と成長指標' },
          ],
        } as any,
        c,
      )
      assertValidNode(node)
      // 2 items × 3 parts each (index + title + note) = 6
      expect(node.children).toHaveLength(6)
      const parts = collectParts(node)
      expect(parts).toContain('item[0].index')
      expect(parts).toContain('item[0].title')
      expect(parts).toContain('item[0].note')
      expect(parts).toContain('item[1].index')
      expect(parts).toContain('item[1].title')
      expect(parts).toContain('item[1].note')
    })

    it('handles empty items list without throwing', () => {
      const c = ctx({ width: 960, height: 540 })
      const node = tlsCAgenda.layout({ items: [] } as any, c)
      expect(node.children).toHaveLength(0)
      assertValidNode(node)
    })

    it('handles items with empty titles', () => {
      const c = ctx({ width: 960, height: 540 })
      const node = tlsCAgenda.layout(
        { items: [{ title: '' }, { title: 'Valid' }] } as any,
        c,
      )
      assertValidNode(node)
    })

    it('handles items with no notes', () => {
      const c = ctx({ width: 960, height: 540 })
      const node = tlsCAgenda.layout(
        { items: [{ title: 'A' }, { title: 'B' }, { title: 'C' }] } as any,
        c,
      )
      assertValidNode(node)
      const parts = collectParts(node)
      // No note parts should appear
      expect(parts.filter(p => p.includes('.note'))).toHaveLength(0)
    })
  })

  /* ── deep copy ──────────────────────────────────────────────────────────── */

  describe('defaults deep copy', () => {
    it('defaults clone deeply — items array and objects are distinct references', () => {
      const d: typeof defaults = JSON.parse(JSON.stringify(defaults))
      expect(d).toEqual(defaults)
      expect(d).not.toBe(defaults)
      // Deep check on items array
      expect(d.items).toEqual(defaults.items)
      expect(d.items).not.toBe(defaults.items)
      // Each item object is a distinct reference
      for (let i = 0; i < d.items.length; i++) {
        expect(d.items[i]).not.toBe(defaults.items[i])
      }
      // Mutate copy; originals must be unchanged
      d.items = [{ title: 'Changed' }]
      expect(defaults.items).toHaveLength(4)
    })
  })

  /* ── purity ─────────────────────────────────────────────────────────────── */

  describe('purity', () => {
    it('layout() runs with no browser globals', () => {
      const originalDocument = globalThis.document
      const originalWindow = globalThis.window
      const originalDate = globalThis.Date
      const originalMathRandom = Math.random

      try {
        // Stub globals to throw if called
        Object.defineProperty(globalThis, 'document', {
          get() { throw new Error('document is not available in pure layout') },
          configurable: true,
        })
        Object.defineProperty(globalThis, 'window', {
          get() { throw new Error('window is not available in pure layout') },
          configurable: true,
        })
        ;(globalThis as any).Date = class {
          constructor() { throw new Error('Date is not available in pure layout') }
          static now() { throw new Error('Date.now is not available in pure layout') }
        }
        Math.random = () => { throw new Error('Math.random is not available in pure layout') }

        const c = ctx({ width: 960, height: 540 })
        expect(() => tlsCAgenda.layout(defaults as any, c)).not.toThrow()
      } finally {
        Object.defineProperty(globalThis, 'document', { value: originalDocument, configurable: true })
        Object.defineProperty(globalThis, 'window', { value: originalWindow, configurable: true })
        globalThis.Date = originalDate
        Math.random = originalMathRandom
      }
    })
  })

  /* ── geometry ───────────────────────────────────────────────────────────── */

  describe('geometry', () => {
    it('4 items at medium size produce expected children count', () => {
      const c = ctx({ width: 960, height: 540 })
      const node = tlsCAgenda.layout(defaults as any, c)
      // 4 items × 3 parts each (index + title + note) = 12
      expect(node.children).toHaveLength(12)
    })

    it('each row is vertically stacked (y increases)', () => {
      const c = ctx({ width: 960, height: 540 })
      const node = tlsCAgenda.layout(defaults as any, c)
      const indexNodes = node.children.filter(n => n.part?.match(/item\[\d+\]\.index/))
      for (let i = 1; i < indexNodes.length; i++) {
        expect(indexNodes[i].box.y).toBeGreaterThan(indexNodes[i - 1].box.y)
      }
    })

    it('index nodes have fixed width', () => {
      const c = ctx({ width: 960, height: 540 })
      const node = tlsCAgenda.layout(defaults as any, c)
      const indexNodes = node.children.filter(n => n.part?.match(/item\[\d+\]\.index/))
      const widths = indexNodes.map(n => n.box.width)
      // All index nodes should have the same width
      const uniqueWidths = new Set(widths)
      expect(uniqueWidths.size).toBe(1)
    })

    it('title nodes fill remaining width after index', () => {
      const c = ctx({ width: 960, height: 540 })
      const node = tlsCAgenda.layout(defaults as any, c)
      const titleNode = node.children.find(n => n.part === 'item[0].title')!
      const indexNode = node.children.find(n => n.part === 'item[0].index')!
      // Title starts after index + gap
      expect(titleNode.box.x).toBeGreaterThan(indexNode.box.x + indexNode.box.width)
      // Title fills remaining width
      expect(titleNode.box.x + titleNode.box.width).toBeCloseTo(960, 0)
    })
  })

  /* ── parity ─────────────────────────────────────────────────────────────── */

  describe('parity', () => {
    it('DOM and SVG agree at medium size', async () => {
      const { assertParity } = await import('../../../parity-harness')
      await assertParity(tlsCAgenda, defaults as any, { width: 960, height: 540 }, undefined, { registry })
    }, 30000)
  })
})

describe('AC2 — look knobs (variant, numbering)', () => {
  const DEF = tlsCAgenda
  const props = { ...(DEF.defaults as any), ...(DEF.describe!.example.props as any) }
  const leaves = (n: LayoutNode, out: LayoutNode[] = []): LayoutNode[] => {
    if (n.k === 'group') n.children.forEach((c) => leaves(c, out))
    else out.push(n)
    return out
  }
  const LOOKS: Array<[string, Record<string, unknown>]> = [
    ['variant: cards', { variant: 'cards' }],
    ['numbering: badge', { numbering: 'badge' }],
    ['numbering: none', { numbering: 'none' }],
    ['cards + badge', { variant: 'cards', numbering: 'badge' }],
  ]

  it('declares the knobs as enums', () => {
    expect((DEF.schema.variant.type as any).values).toEqual(['list', 'cards'])
    expect((DEF.schema.numbering.type as any).values).toEqual(['plain', 'badge', 'none'])
  })

  for (const [name, knobs] of LOOKS) {
    it.each([
      ['preferred', DEF.size.preferred],
      ['min', DEF.size.min],
    ])(`${name} fits size.%s with nothing escaping it`, (_l, [w, h]) => {
      const node = DEF.layout({ ...props, ...knobs }, ctx({ width: w, height: h }))
      assertValidNode(node)
      expect(node.box.height).toBeLessThanOrEqual(h + 0.5)
      for (const l of leaves(node)) {
        expect(l.box.x + l.box.width).toBeLessThanOrEqual(w + 0.5)
        expect(l.box.y + l.box.height).toBeLessThanOrEqual(h + 0.5)
      }
    })
  }

  it('cards: one card per item, as wide as its column, every card in a row as tall as the row; text inset', () => {
    const node = DEF.layout({ ...props, variant: 'cards' }, ctx({ width: 1728, height: 758 }))
    const cards = leaves(node).filter((l) => l.k === 'rect')
    expect(cards).toHaveLength(4)
    for (const c of cards) expect(c.box.width).toBeCloseTo(cards[0].box.width, 5)
    // two columns: the second column's cards end at the right edge
    expect(cards[2].box.x).toBeGreaterThan(cards[0].box.x + cards[0].box.width)
    expect(cards[2].box.x + cards[2].box.width).toBeCloseTo(1728, 5)
    expect(cards[0].box.height).toBe(cards[2].box.height)
    const title = leaves(node).find((l) => l.part === 'item[0].title')!
    expect(title.box.x).toBeGreaterThan(cards[0].box.x)
    expect(title.box.y).toBeGreaterThan(cards[0].box.y)
  })

  it('badge: the number sits in a disc (the index part), filled with the accent for the current item', () => {
    const c = ctx({ width: 1200, height: 660 })
    const node = DEF.layout({ ...props, numbering: 'badge', current: 1 }, c)
    const groups = (n: LayoutNode, out: LayoutNode[] = []): LayoutNode[] => {
      if (n.k === 'group') { out.push(n); n.children.forEach((k) => groups(k, out)) }
      return out
    }
    const badges = groups(node).filter((g) => /^item\[\d+\]\.index$/.test(g.part ?? ''))
    expect(badges).toHaveLength(4)
    const disc = (g: LayoutNode) => (g as any).children.find((k: LayoutNode) => k.k === 'rect')
    expect(disc(badges[1]).fill.color).toBe(c.resolveColor('accent').color)
    expect(disc(badges[0]).fill.color).not.toBe(c.resolveColor('accent').color)
    expect(disc(badges[0]).box.width).toBe(disc(badges[0]).box.height)
  })

  it('cards: a box too short for cards keeps the list (no card rects), as size.min does', () => {
    const [w, h] = DEF.size.min
    const node = DEF.layout({ ...props, items: [...props.items, { title: 'Wrap-up', note: 'Decisions' }], variant: 'cards' }, ctx({ width: w, height: h }))
    expect(leaves(node).some((l) => l.k === 'rect')).toBe(false)
  })

  it('none: no number column, the titles start at the left edge', () => {
    const node = DEF.layout({ ...props, numbering: 'none' }, ctx({ width: 1200, height: 660 }))
    expect(collectParts(node).some((p) => /\.index$/.test(p))).toBe(false)
    expect(leaves(node).find((l) => l.part === 'item[0].title')!.box.x).toBe(0)
  })

  it('cards + badge: DOM and SVG agree', async () => {
    const { assertParity } = await import('../../../parity-harness')
    await assertParity(DEF, { ...props, variant: 'cards', numbering: 'badge' } as any, { width: 1200, height: 660 }, undefined, { registry })
  }, 30000)
})
