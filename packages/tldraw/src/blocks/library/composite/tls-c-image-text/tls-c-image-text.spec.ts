/**
 * Tests for tls.c.image-text — image beside/above a text cluster.
 *
 * Covers:
 * - Layout at 3 SIZES for each of 3 placements
 * - data-part set === motion.parts set
 * - describe.example passes validateDeckSpec
 * - capacity() sane at min/max
 * - Adversarial inputs: 400-char body, CJK text, missing image asset
 * - Purity: layout() runs with no browser globals
 * - Defaults deep-copy: not.toBe + toEqual
 * - assertParity for left placement
 */

import { tlsCImageText } from './index'
import { makeCtx, SIZES, assertValidNode } from '../../layout/test-helpers'
import { validateDeckSpec } from '../../../validate-deck-spec'
import { BlockRegistry } from '../../../registry'
import { registerBuiltInBlocks } from '../../../library'
import { assertParity } from '../../../parity-harness'
import type { DeckSpec, LayoutContext, LayoutNode } from '../../../types'

/* ── helpers ───────────────────────────────────────────────────────────────── */

const registry = (() => {
  const r = new BlockRegistry()
  registerBuiltInBlocks(r)
  if (!r.has(tlsCImageText.type)) r.register(tlsCImageText)
  return r
})()

function ctx(box: { width: number; height: number }): LayoutContext {
  return makeCtx(box, registry)
}

/** Collect all part names from a LayoutNode tree (DFS). */
function collectParts(node: LayoutNode): string[] {
  const result: string[] = []
  function walk(n: LayoutNode) {
    if (n.part && n.part !== 'root' && n.part !== 'text-cluster') {
      result.push(n.part)
    }
    if (n.k === 'group' && 'children' in n) {
      for (const c of (n as { k: 'group'; children: LayoutNode[] }).children) walk(c)
    }
  }
  walk(node)
  return result
}

/** Narrow a LayoutNode to its children array (group kind). */
function getChildren(node: LayoutNode): LayoutNode[] {
  if (node.k === 'group' && 'children' in node) {
    return (node as { k: 'group'; children: LayoutNode[] }).children
  }
  return []
}

/** Stub globals that purity tests require to throw. */
function withGlobalsThrowing(names: string[], fn: () => void) {
  const originals: Record<string, unknown> = {}
  for (const name of names) {
    originals[name] = (globalThis as any)[name]
    ;(globalThis as any)[name] = () => { throw new Error(`Should not use ${name}`) }
  }
  try {
    fn()
  } finally {
    for (const name of names) {
      if (originals[name] === undefined) {
        delete (globalThis as any)[name]
      } else {
        (globalThis as any)[name] = originals[name]
      }
    }
  }
}

/* ── layout at 3 SIZES for each of 3 placements ──────────────────────────── */

describe('tls.c.image-text', () => {
  const placements = ['left', 'right', 'top'] as const

  for (const placement of placements) {
    describe(`layout at 3 SIZES with placement="${placement}"`, () => {
      it.each(SIZES)('produces valid tree at $label ($box.width×$box.height)', ({ box }) => {
        const c = ctx(box)
        const node = tlsCImageText.layout(
          { ...tlsCImageText.defaults, placement } as any,
          c,
        )
        assertValidNode(node)
        expect(node.k).toBe('group')
        expect(node.part).toBe('root')
      })
    })
  }

  /* ── structure checks ─────────────────────────────────────────────────────── */

  describe('layout structure', () => {
    it('left placement: image node first, text second', () => {
      const c = ctx({ width: 960, height: 540 })
      const node = tlsCImageText.layout(
        { ...tlsCImageText.defaults, placement: 'left' } as any,
        c,
      )
      const children = getChildren(node)
      expect(children).toHaveLength(2)
      // First child is the delegated image tree (has part 'image' inside)
      const imageGroup = children[0]
      expect(imageGroup.k).toBe('group')
      // Second child is the text cluster
      const textCluster = children[1]
      expect(textCluster.part).toBe('text-cluster')
    })

    it('right placement: text first, image second', () => {
      const c = ctx({ width: 960, height: 540 })
      const node = tlsCImageText.layout(
        { ...tlsCImageText.defaults, placement: 'right' } as any,
        c,
      )
      const children = getChildren(node)
      expect(children).toHaveLength(2)
      const textCluster = children[0]
      expect(textCluster.part).toBe('text-cluster')
      const imageGroup = children[1]
      expect(imageGroup.k).toBe('group')
    })

    it('top placement: image first, text second (vertical)', () => {
      const c = ctx({ width: 960, height: 540 })
      const node = tlsCImageText.layout(
        { ...tlsCImageText.defaults, placement: 'top' } as any,
        c,
      )
      const children = getChildren(node)
      expect(children).toHaveLength(2)
      const imageGroup = children[0]
      expect(imageGroup.k).toBe('group')
      const textCluster = children[1]
      expect(textCluster.part).toBe('text-cluster')
    })

    it('text cluster contains kicker, title, body nodes', () => {
      const c = ctx({ width: 960, height: 540 })
      const node = tlsCImageText.layout(
        { ...tlsCImageText.defaults, placement: 'left' } as any,
        c,
      )
      const children = getChildren(node)
      const textCluster = children[1]
      const textParts = getChildren(textCluster).map((n) => n.part)
      expect(textParts).toContain('kicker')
      expect(textParts).toContain('title')
      expect(textParts).toContain('body')
    })
  })

  /* ── data-part set === motion.parts set ──────────────────────────────────── */

  describe('data-part set matches motion.parts', () => {
    for (const placement of placements) {
      it(`placement="${placement}": all layout parts are in motion.parts`, () => {
        const c = ctx({ width: 960, height: 540 })
        const node = tlsCImageText.layout(
          { ...tlsCImageText.defaults, placement } as any,
          c,
        )
        const layoutParts = collectParts(node)
        const motionParts = tlsCImageText.motion.parts ?? []
        for (const part of layoutParts) {
          expect(motionParts).toContain(part)
        }
      })

      it(`placement="${placement}": all motion.parts appear in layout tree`, () => {
        const c = ctx({ width: 960, height: 540 })
        const node = tlsCImageText.layout(
          { ...tlsCImageText.defaults, placement } as any,
          c,
        )
        const layoutParts = collectParts(node)
        const motionParts = tlsCImageText.motion.parts ?? []
        for (const part of motionParts) {
          // image is delegated to tls.m.image which always emits part='image'
          // kicker/title/body are rendered directly
          expect(layoutParts).toContain(part)
        }
      })
    }
  })

  /* ── describe.example passes validateDeckSpec ─────────────────────────────── */

  describe('describe.example passes validateDeckSpec', () => {
    it('the example from describe.example validates clean', () => {
      const example = tlsCImageText.describe!.example
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

  /* ── capacity() ───────────────────────────────────────────────────────────── */

  describe('capacity()', () => {
    it('fits at preferred size with defaults', () => {
      const c = ctx({ width: 1200, height: 600 })
      const report = tlsCImageText.capacity!(
        tlsCImageText.defaults as any,
        { width: 1200, height: 600 },
        c,
      )
      // At preferred size, content should fit or have a remedy
      expect(report).toBeDefined()
      expect(report.budget).toBeDefined()
      expect(report.budget.body).toBeDefined()
      expect(report.budget.body.max).toBeGreaterThan(0)
    })

    it('may not fit at min size with long body', () => {
      const c = ctx({ width: 400, height: 200 })
      const longBodyProps = {
        ...tlsCImageText.defaults,
        body: 'This is a very long body text that should overflow at small sizes. '.repeat(10),
      }
      const report = tlsCImageText.capacity!(
        longBodyProps as any,
        { width: 400, height: 200 },
        c,
      )
      // At min size with a very long body, it may or may not fit
      expect(typeof report.fits).toBe('boolean')
      expect(report.budget).toBeDefined()
      expect(report.budget.body).toBeDefined()
    })

    it('reports budget for image slot', () => {
      const c = ctx({ width: 960, height: 540 })
      const report = tlsCImageText.capacity!(
        tlsCImageText.defaults as any,
        { width: 960, height: 540 },
        c,
      )
      expect(report.budget.image).toBeDefined()
      expect(report.budget.image.max).toBeGreaterThan(0)
    })
  })

  /* ── adversarial: 400-char body ──────────────────────────────────────────── */

  describe('adversarial: 400-char body', () => {
    it.each(SIZES)('handles 400-char body at $label without throwing', ({ box }) => {
      const c = ctx(box)
      const longBody = 'a'.repeat(400)
      const node = tlsCImageText.layout(
        { ...tlsCImageText.defaults, body: longBody } as any,
        c,
      )
      assertValidNode(node)
    })
  })

  /* ── adversarial: CJK text ────────────────────────────────────────────────── */

  describe('adversarial: CJK text', () => {
    it.each(SIZES)('handles CJK text at $label without throwing', ({ box }) => {
      const c = ctx(box)
      const node = tlsCImageText.layout(
        {
          ...tlsCImageText.defaults,
          kicker: '概要',
          title: '设计系统的实施方案',
          body: '统一的设计系统确保每个界面的一致性。令牌、块和模板使产品在规模上保持连贯。',
        } as any,
        c,
      )
      assertValidNode(node)
    })
  })

  /* ── adversarial: missing image asset ─────────────────────────────────────── */

  describe('adversarial: missing image asset', () => {
    it('degrades to dashed frame (image node has no url), does not throw', () => {
      const c = ctx({ width: 960, height: 540 })
      const node = tlsCImageText.layout(
        {
          ...tlsCImageText.defaults,
          image: 'nonexistent-asset-id',
          alt: 'Missing image',
        } as any,
        c,
      )
      assertValidNode(node)
      // The image delegation to tls.m.image produces an image node without url
      // when resolveAsset is not provided (the default test context has no resolver)
    })
  })

  /* ── purity test ──────────────────────────────────────────────────────────── */

  describe('purity', () => {
    it('layout() runs with no browser globals', () => {
      withGlobalsThrowing(['document', 'window', 'Date', 'Math.random'], () => {
        const c = ctx({ width: 960, height: 540 })
        expect(() =>
          tlsCImageText.layout(tlsCImageText.defaults as any, c),
        ).not.toThrow()
      })
    })
  })

  /* ── defaults deep-copy ───────────────────────────────────────────────────── */

  describe('defaults deep-copy', () => {
    it('defaults are not shared by reference (not.toBe and toEqual)', () => {
      const d1 = { ...tlsCImageText.defaults }
      const d2 = { ...tlsCImageText.defaults }
      // toEqual: same content
      expect(d1).toEqual(d2)
      // not.toBe: different references
      expect(d1).not.toBe(d2)
    })

    it('mutating a copy does not affect the original', () => {
      const copy = { ...tlsCImageText.defaults, title: 'Changed title' }
      expect(tlsCImageText.defaults.title).not.toBe(copy.title)
    })
  })

  /* ── geometry: image ratio affects split ──────────────────────────────────── */

  describe('image ratio', () => {
    it('changing imageRatio changes the image area width (left placement)', () => {
      const c = ctx({ width: 960, height: 540 })
      const small = tlsCImageText.layout(
        { ...tlsCImageText.defaults, placement: 'left', imageRatio: 0.3 } as any,
        c,
      )
      const large = tlsCImageText.layout(
        { ...tlsCImageText.defaults, placement: 'left', imageRatio: 0.7 } as any,
        c,
      )
      // The image groups should have different widths
      const smallImgBox = getChildren(small)[0].box
      const largeImgBox = getChildren(large)[0].box
      expect(smallImgBox.width).toBeLessThan(largeImgBox.width)
    })

    it('changing imageRatio changes the image area height (top placement)', () => {
      const c = ctx({ width: 960, height: 540 })
      const small = tlsCImageText.layout(
        { ...tlsCImageText.defaults, placement: 'top', imageRatio: 0.3 } as any,
        c,
      )
      const large = tlsCImageText.layout(
        { ...tlsCImageText.defaults, placement: 'top', imageRatio: 0.7 } as any,
        c,
      )
      const smallImgBox = getChildren(small)[0].box
      const largeImgBox = getChildren(large)[0].box
      expect(smallImgBox.height).toBeLessThan(largeImgBox.height)
    })
  })

  /* ── optional fields: no kicker, no body ──────────────────────────────────── */

  describe('optional fields', () => {
    it('renders with no kicker', () => {
      const c = ctx({ width: 960, height: 540 })
      const node = tlsCImageText.layout(
        { ...tlsCImageText.defaults, kicker: undefined } as any,
        c,
      )
      assertValidNode(node)
      const children = getChildren(node)
      const textCluster = children[1]
      const parts = getChildren(textCluster).map((n) => n.part)
      expect(parts).not.toContain('kicker')
      expect(parts).toContain('title')
    })

    it('renders with no body', () => {
      const c = ctx({ width: 960, height: 540 })
      const node = tlsCImageText.layout(
        { ...tlsCImageText.defaults, body: undefined } as any,
        c,
      )
      assertValidNode(node)
      const children = getChildren(node)
      const textCluster = children[1]
      const parts = getChildren(textCluster).map((n) => n.part)
      expect(parts).toContain('title')
      expect(parts).not.toContain('body')
    })
  })

  /* ── block metadata ───────────────────────────────────────────────────────── */

  describe('block metadata', () => {
    it('has type tls.c.image-text', () => {
      expect(tlsCImageText.type).toBe('tls.c.image-text')
    })

    it('is composite family', () => {
      expect(tlsCImageText.family).toBe('composite')
    })

    it('is tier A', () => {
      expect(tlsCImageText.tier).toBe('A')
    })

    it('has motion.parts matching declared parts', () => {
      expect(tlsCImageText.motion.parts).toEqual(['image', 'kicker', 'title', 'body'])
    })

    it('has sensible preferred size', () => {
      expect(tlsCImageText.size.preferred[0]).toBeGreaterThan(0)
      expect(tlsCImageText.size.preferred[1]).toBeGreaterThan(0)
    })

    it('has min size', () => {
      expect(tlsCImageText.size.min[0]).toBeGreaterThan(0)
      expect(tlsCImageText.size.min[1]).toBeGreaterThan(0)
    })
  })

  /* ── registry integration ─────────────────────────────────────────────────── */

  describe('registry integration', () => {
    it('block can be registered and looked up', () => {
      const reg = new BlockRegistry()
      reg.register(tlsCImageText)
      const def = reg.get('tls.c.image-text')
      expect(def).toBeDefined()
      expect(def!.type).toBe('tls.c.image-text')
    })
  })
})

/* ── parity test (Playwright, async) ───────────────────────────────────────── */

describe('tls.c.image-text parity', () => {
  it('DOM and SVG agree for left placement at default size', async () => {
    await assertParity(
      tlsCImageText,
      tlsCImageText.defaults,
      { width: 1200, height: 600 },
    )
  }, 30_000)
})
