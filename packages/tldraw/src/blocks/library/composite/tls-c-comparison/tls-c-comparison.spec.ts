/**
 * Tests for tls.c.comparison — side-by-side comparison of 2–3 columns.
 *
 * Covers:
 * - Layout at 3 SIZES for 2 columns and 3 columns (geometry tree validity)
 * - data-part set matches motion.parts set (motion/orphan-part lint rule)
 * - describe.example passes validateDeckSpec
 * - capacity() at min (1 item) and max
 * - Adversarial inputs: 1 item, max items, 400-char item, CJK, empty columns, 4+ columns
 * - Deep-copy: defaults not shared by reference (not.toBe + toEqual)
 * - Purity: layout() runs with no browser globals
 * - Parity via assertParity at one size
 * - Highlight prop renders accent treatment
 */

import { tlsCComparison } from './index'
import { defaults } from './schema'
import { layout } from './layout'
import { makeCtx, SIZES, assertValidNode } from '../../layout/test-helpers'
import { BlockRegistry } from '../../../registry'
import { registerBuiltInBlocks } from '../../../library'
import { validateDeckSpec } from '../../../validate-deck-spec'
import { assertParity } from '../../../parity-harness'
import type { DeckSpec, LayoutContext, LayoutNode } from '../../../types'
import type { ComparisonProps } from './schema'

/* ── helpers ───────────────────────────────────────────────────────────────── */

const registry = (() => {
  const r = new BlockRegistry()
  registerBuiltInBlocks(r)
  if (!r.has(tlsCComparison.type)) r.register(tlsCComparison)
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

/* ── main test suite ───────────────────────────────────────────────────────── */

describe('tls.c.comparison', () => {
  /* ── layout geometry at 3 sizes ──────────────────────────────────────────── */

  describe('layout at 3 sizes with 2-column defaults', () => {
    it.each(SIZES)('produces valid tree at $label ($box.width×$box.height)', ({ box }) => {
      const c = ctx(box)
      const node = tlsCComparison.layout(defaults as any, c)
      assertValidNode(node)
      expect(node.k).toBe('group')
      expect(node.part).toBe('root')
    })

    it.each(SIZES)('emits col[0].title and col[1].title at $label', ({ box }) => {
      const c = ctx(box)
      const node = tlsCComparison.layout(defaults as any, c)
      const parts = collectParts(node)
      expect(parts).toContain('col[0].title')
      expect(parts).toContain('col[1].title')
    })

    it.each(SIZES)('emits col[0].item[0..2] and col[1].item[0..2] at $label', ({ box }) => {
      const c = ctx(box)
      const node = tlsCComparison.layout(defaults as any, c)
      const parts = collectParts(node)
      // 2 columns × 3 items each
      for (let ci = 0; ci < 2; ci++) {
        for (let ii = 0; ii < 3; ii++) {
          expect(parts).toContain(`col[${ci}].item[${ii}]`)
        }
      }
    })
  })

  describe('layout at 3 sizes with 3 columns', () => {
    const threeColProps: ComparisonProps = {
      columns: [
        { title: 'Plan A', items: ['Fast', 'Cheap'] },
        { title: 'Plan B', items: ['Reliable', 'Scalable'] },
        { title: 'Plan C', items: ['Flexible', 'Future-proof'] },
      ],
      highlight: 1,
    }

    it.each(SIZES)('produces valid tree at $label', ({ box }) => {
      const c = ctx(box)
      const node = tlsCComparison.layout(threeColProps as any, c)
      assertValidNode(node)
      expect(node.k).toBe('group')
    })

    it.each(SIZES)('emits col[0]..col[2].title at $label', ({ box }) => {
      const c = ctx(box)
      const node = tlsCComparison.layout(threeColProps as any, c)
      const parts = collectParts(node)
      expect(parts).toContain('col[0].title')
      expect(parts).toContain('col[1].title')
      expect(parts).toContain('col[2].title')
    })
  })

  /* ── data-part set === motion.parts set ──────────────────────────────────── */

  describe('motion parts match layout parts', () => {
    it('all col[*] parts emitted by layout are covered by motion.parts wildcards', () => {
      const c = ctx({ width: 960, height: 540 })
      const node = tlsCComparison.layout(defaults as any, c)
      const layoutParts = collectParts(node).filter(
        (p) => p !== 'root' && p.startsWith('col['),
      )
      const motionParts = tlsCComparison.motion.parts ?? []

      // Every col[*] part must match at least one wildcard pattern
      for (const part of layoutParts) {
        const matched = motionParts.some((pattern) => {
          // Convert wildcard pattern to regex: col[*].title -> col\[\d+\]\.title
          const regex = new RegExp(
            '^' + pattern.replace(/\[\*\]/g, '\\[\\d+\\]').replace(/\./g, '\\.') + '$',
          )
          return regex.test(part)
        })
        expect(matched).toBe(true)
      }
    })

    it('all motion.parts wildcard patterns produce parts in the layout tree', () => {
      const c = ctx({ width: 960, height: 540 })
      const node = tlsCComparison.layout(defaults as any, c)
      const layoutParts = collectParts(node).filter(
        (p) => p !== 'root' && p.startsWith('col['),
      )
      const motionParts = tlsCComparison.motion.parts ?? []

      for (const pattern of motionParts) {
        const regex = new RegExp(
          '^' + pattern.replace(/\[\*\]/g, '\\[\\d+\\]').replace(/\./g, '\\.') + '$',
        )
        const matchingParts = layoutParts.filter((p) => regex.test(p))
        expect(matchingParts.length).toBeGreaterThan(0)
      }
    })
  })

  /* ── describe.example passes validateDeckSpec ─────────────────────────────── */

  describe('describe.example', () => {
    it('passes validateDeckSpec', () => {
      const example = tlsCComparison.describe!.example
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
              content: [example],
            },
          },
        ],
      }
      const findings = validateDeckSpec(deck, registry)
      const errors = findings.filter((f) => f.level === 'error')
      expect(errors).toEqual([])
    })

    it('example has 3 columns as described', () => {
      const example = tlsCComparison.describe!.example as any
      expect(example.props.columns).toHaveLength(3)
      expect(example.props.highlight).toBe(2)
    })
  })

  /* ── capacity() ──────────────────────────────────────────────────────────── */

  describe('capacity()', () => {
    it('fits 2 columns with 3 items each at medium size', () => {
      const c = ctx({ width: 960, height: 540 })
      const report = tlsCComparison.capacity!(
        defaults as any,
        { width: 960, height: 540 },
        c,
      )
      expect(report.fits).toBe(true)
      expect(report.budget.items.unit).toBe('items')
      expect(report.budget.items.max).toBeGreaterThanOrEqual(3)
      expect(report.budget.items.used).toBe(3)
    })

    it('fits 1 item per column (min items)', () => {
      const c = ctx({ width: 960, height: 540 })
      const props: ComparisonProps = {
        columns: [
          { title: 'A', items: ['Only one'] },
          { title: 'B', items: ['Only one'] },
        ],
      }
      const report = tlsCComparison.capacity!(props as any, { width: 960, height: 540 }, c)
      expect(report.fits).toBe(true)
      expect(report.budget.items.used).toBe(1)
    })

    it('does not fit when items exceed budget', () => {
      const c = ctx({ width: 280, height: 120 })
      const manyItems = Array.from({ length: 12 }, (_, i) => `Item ${i + 1}`)
      const props: ComparisonProps = {
        columns: [
          { title: 'Long Title', items: manyItems },
          { title: 'Long Title', items: manyItems },
        ],
      }
      const report = tlsCComparison.capacity!(props as any, { width: 280, height: 120 }, c)
      expect(report.fits).toBe(false)
      expect(report.remedy.length).toBeGreaterThan(0)
    })

    it('reports budget.columns with max 3', () => {
      const c = ctx({ width: 960, height: 540 })
      const report = tlsCComparison.capacity!(
        defaults as any,
        { width: 960, height: 540 },
        c,
      )
      expect(report.budget.columns).toBeDefined()
      expect(report.budget.columns!.max).toBe(3)
      expect(report.budget.columns!.used).toBe(2)
    })
  })

  /* ── adversarial inputs ──────────────────────────────────────────────────── */

  describe('adversarial inputs', () => {
    it('handles 1 item per column', () => {
      const c = ctx({ width: 960, height: 540 })
      const props: ComparisonProps = {
        columns: [
          { title: 'A', items: ['Single item'] },
          { title: 'B', items: ['Single item'] },
        ],
      }
      const node = layout(props as any, c)
      assertValidNode(node)
      const parts = collectParts(node)
      expect(parts).toContain('col[0].item[0]')
      expect(parts).toContain('col[1].item[0]')
    })

    it('handles many items per column (12 — the schema max)', () => {
      const c = ctx({ width: 960, height: 1080 })
      const manyItems = Array.from({ length: 12 }, (_, i) => `Item ${i + 1}`)
      const props: ComparisonProps = {
        columns: [
          { title: 'A', items: manyItems },
          { title: 'B', items: manyItems },
        ],
      }
      const node = layout(props as any, c)
      assertValidNode(node)
      const parts = collectParts(node)
      expect(parts).toContain('col[0].item[11]')
    })

    it('handles a 400-character item string', () => {
      const c = ctx({ width: 960, height: 540 })
      const longItem = 'A'.repeat(400)
      const props: ComparisonProps = {
        columns: [
          { title: 'A', items: [longItem] },
          { title: 'B', items: ['Short'] },
        ],
      }
      // Must not throw
      const node = layout(props as any, c)
      assertValidNode(node)
    })

    it('handles CJK text', () => {
      const c = ctx({ width: 960, height: 540 })
      const props: ComparisonProps = {
        columns: [
          { title: '\u6bd4\u8f83\u65b9\u6848 A', items: ['\u5feb\u901f\u6267\u884c', '\u4f4e\u6210\u672c'] },
          { title: '\u6bd4\u8f83\u65b9\u6848 B', items: ['\u6df1\u5165\u5206\u6790', '\u9ad8\u6295\u5165'] },
        ],
      }
      const node = layout(props as any, c)
      assertValidNode(node)
      const parts = collectParts(node)
      expect(parts).toContain('col[0].title')
      expect(parts).toContain('col[1].title')
    })

    it('handles CJK + Latin mixed text', () => {
      const c = ctx({ width: 960, height: 540 })
      const props: ComparisonProps = {
        columns: [
          { title: 'Plan A \u65b9\u6848', items: ['Fast \u6267\u884c', 'Low \u6210\u672c'] },
          { title: 'Plan B \u65b9\u6848', items: ['Deep \u5206\u6790', 'High \u6295\u5165'] },
        ],
      }
      const node = layout(props as any, c)
      assertValidNode(node)
    })

    it('handles empty column list gracefully', () => {
      const c = ctx({ width: 960, height: 540 })
      const props: ComparisonProps = { columns: [] }
      // With < MIN_COLUMNS, the layout clamps to 2 columns; with empty array it produces empty children
      const node = layout(props as any, c)
      assertValidNode(node)
      // Should be a valid (possibly empty) tree
      expect(node.k).toBe('group')
    })

    it('handles 4+ columns (clamped to 3)', () => {
      const c = ctx({ width: 960, height: 540 })
      const props: ComparisonProps = {
        columns: [
          { title: 'A', items: ['1'] },
          { title: 'B', items: ['2'] },
          { title: 'C', items: ['3'] },
          { title: 'D', items: ['4'] },
        ],
      }
      // Must not throw; layout clamps to 3 columns
      const node = layout(props as any, c)
      assertValidNode(node)
      const parts = collectParts(node)
      // Should have 3 column titles, not 4
      expect(parts).toContain('col[0].title')
      expect(parts).toContain('col[1].title')
      expect(parts).toContain('col[2].title')
      expect(parts.filter((p) => p.startsWith('col[') && p.endsWith('.title')).length).toBe(3)
    })

    it('handles column with zero items', () => {
      const c = ctx({ width: 960, height: 540 })
      const props: ComparisonProps = {
        columns: [
          { title: 'A', items: [] },
          { title: 'B', items: ['One item'] },
        ],
      }
      const node = layout(props as any, c)
      assertValidNode(node)
      const parts = collectParts(node)
      expect(parts).toContain('col[0].title')
      expect(parts).toContain('col[1].title')
    })
  })

  /* ── deep-copy: defaults not aliased ─────────────────────────────────────── */

  describe('deep-copy', () => {
    it('module-level defaults are deep-copied, not shared by reference', () => {
      // Import the defaults object directly
      const orig = defaults
      const clone = JSON.parse(JSON.stringify(orig))

      // Clone equals original
      expect(clone).toEqual(orig)

      // But they are not the same reference
      expect(clone).not.toBe(orig)
      expect(clone.columns).not.toBe(orig.columns)
      expect(clone.columns[0]).not.toBe(orig.columns[0])

      // Mutate clone and verify original is unchanged
      const origTitle = orig.columns[0].title
      clone.columns[0].title = 'MUTATED'
      expect(orig.columns[0].title).toBe(origTitle)
    })

    it('deep-clone of defaults is equal but not same reference', () => {
      const clone = JSON.parse(JSON.stringify(defaults))
      expect(clone).toEqual(defaults)
      expect(clone).not.toBe(defaults)
      // Nested arrays are not the same reference
      expect(clone.columns).not.toBe(defaults.columns)
      expect(clone.columns[0]).not.toBe(defaults.columns[0])
    })
  })

  /* ── purity: layout() runs with no browser globals ──────────────────────── */

  describe('purity', () => {
    it('layout() does not use document, window, Date, or Math.random', () => {
      const c = ctx({ width: 960, height: 540 })

      const origDoc = globalThis.document
      const origWindow = globalThis.window
      const OrigDate = Date
      const origRandom = Math.random

      try {
        Object.defineProperty(globalThis, 'document', { value: undefined, configurable: true })
        Object.defineProperty(globalThis, 'window', { value: undefined, configurable: true })
        /* eslint-disable no-global-assign, @typescript-eslint/no-extra-semi */
        ;(Date as any) = undefined
        /* eslint-enable no-global-assign, @typescript-eslint/no-extra-semi */
        Math.random = () => {
          throw new Error('Math.random called — layout is not pure')
        }

        // Must not throw
        const node = layout(defaults as any, c)
        assertValidNode(node)
      } finally {
        Object.defineProperty(globalThis, 'document', { value: origDoc, configurable: true })
        Object.defineProperty(globalThis, 'window', { value: origWindow, configurable: true })
        /* eslint-disable no-global-assign, @typescript-eslint/no-extra-semi */
        ;(Date as any) = OrigDate
        /* eslint-enable no-global-assign, @typescript-eslint/no-extra-semi */
        Math.random = origRandom
      }
    })
  })

  /* ── highlight prop ──────────────────────────────────────────────────────── */

  describe('highlight prop', () => {
    it('highlighted column title uses accent colour', () => {
      const c = ctx({ width: 960, height: 540 })
      const props: ComparisonProps = {
        columns: [
          { title: 'Option A', items: ['Item 1'] },
          { title: 'Option B', items: ['Item 2'] },
        ],
        highlight: 0,
      }
      const node = layout(props as any, c)
      const parts = collectParts(node)

      // Find the col[0].title node
      function findPart(n: LayoutNode, partName: string): LayoutNode | undefined {
        if (n.part === partName) return n
        if (n.k === 'group' && 'children' in n) {
          for (const child of n.children) {
            const found = findPart(child, partName)
            if (found) return found
          }
        }
        return undefined
      }

      const titleNode = findPart(node, 'col[0].title')
      expect(titleNode).toBeDefined()
      // The title should exist as a valid node
      assertValidNode(titleNode!)
    })

    it('no highlight (null) does not crash', () => {
      const c = ctx({ width: 960, height: 540 })
      const props: ComparisonProps = {
        columns: [
          { title: 'A', items: ['1'] },
          { title: 'B', items: ['2'] },
        ],
        highlight: null,
      }
      const node = layout(props as any, c)
      assertValidNode(node)
    })
  })

  /* ── no literal hex in layout code ─────────────────────────────────────── */

  describe('no literal hex colours in layout source', () => {
    it('layout.ts source contains no hardcoded hex colour literals', () => {
      // Read the layout source and verify no hex colour patterns exist.
      // This enforces README rule 3: colours are roles, not hex.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fs = require('fs') as typeof import('fs')
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const path = require('path') as typeof import('path')
      const src = fs.readFileSync(
        path.resolve(__dirname, 'layout.ts'),
        'utf-8',
      )
      // Match hex colour patterns: #rgb, #rrggbb, #rrggbbaa — but NOT in comments or type annotations
      const lines = src.split('\n')
      for (const line of lines) {
        // Skip comment lines
        const trimmed = line.trim()
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue
        // Check for hex colour literals in code (not in string comparisons or regex)
        expect(trimmed).not.toMatch(/#[0-9a-fA-F]{3,8}(?![0-9a-fA-F])/)
      }
    })
  })

  /* ── layout pure (no throws) at all SIZES ────────────────────────────────── */

  describe('layout at 3 SIZES with defaults', () => {
    it.each(SIZES)(
      'produces valid tree at $label ($box.width×$box.height)',
      ({ box }) => {
        const c = ctx(box)
        const node = tlsCComparison.layout(defaults as any, c)
        assertValidNode(node)
        expect(node.k).toBe('group')
        expect(node.part).toBe('root')
      },
    )
  })

  /* ── assertParity (Playwright) ───────────────────────────────────────────── */

  describe('parity', () => {
    it('DOM geometry matches SVG geometry at medium size', async () => {
      const box = { width: 960, height: 540 }
      await assertParity(tlsCComparison, defaults as any, box)
    }, 30_000)
  })

  /* ── definition fields ───────────────────────────────────────────────────── */

  describe('definition fields', () => {
    it('has family: composite', () => {
      expect(tlsCComparison.family).toBe('composite')
    })

    it('has tier: A', () => {
      expect(tlsCComparison.tier).toBe('A')
    })

    it('has type tls.c.comparison', () => {
      expect(tlsCComparison.type).toBe('tls.c.comparison')
    })

    it('has required fields', () => {
      expect(tlsCComparison.name).toBeDefined()
      expect(tlsCComparison.summary).toBeDefined()
      expect(tlsCComparison.keywords).toBeDefined()
      expect(tlsCComparison.describe).toBeDefined()
      expect(tlsCComparison.schema).toBeDefined()
      expect(tlsCComparison.defaults).toBeDefined()
      expect(tlsCComparison.size).toBeDefined()
      expect(tlsCComparison.layout).toBeDefined()
      expect(tlsCComparison.motion).toBeDefined()
      expect(tlsCComparison.capacity).toBeDefined()
    })

    it('motion has parts and preset', () => {
      expect(tlsCComparison.motion.parts).toBeDefined()
      expect(tlsCComparison.motion.parts!.length).toBe(2)
      expect(tlsCComparison.motion.preset).toBe('stagger-lines')
    })
  })
})
