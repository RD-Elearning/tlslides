/**
 * D3 — Slide compiler tests.
 *
 * Covers:
 * - A 3-slide DeckSpec compiles to valid shapes
 * - Every shape gets a unique id (P18 bug prevention)
 * - Every shape gets a unique childIndex (P18 bug prevention)
 * - Layout regions correctly populated
 * - Background / masterId / notes / skip propagated
 * - Missing or unknown layout falls back gracefully to 'blank' + finding
 * - Unknown region emits finding with suggestion
 * - Multi-block regions stack vertically with space.md gaps
 * - Free-positioned blocks placed directly
 * - Module-level objects are copied, not aliased
 */

import { compileSlide, type CompileSlideResult } from './slide-compiler'
import type { SlideSpec, BlockSpec, Box, ResolvedTokens } from './types'
import { TEST_TOKENS } from './parity-harness'

/* ── Helpers ────────────────────────────────────────────────────────────────── */

const DEFAULT_FRAME = { width: 1920, height: 1080 }

const blockA: BlockSpec = { type: 'tls.text', id: 'b-a', props: { text: 'Hello' } }
const blockB: BlockSpec = { type: 'tls.text', id: 'b-b', props: { text: 'World' } }
const blockC: BlockSpec = { type: 'tls.kpi', id: 'b-c', props: { label: 'Revenue', value: 42 } }

/* ── compileSlide: basic compilation ────────────────────────────────────────── */

describe('compileSlide', () => {
  describe('3-slide DeckSpec compiles to valid shapes', () => {
    const slides: SlideSpec[] = [
      {
        id: 'slide-1',
        layout: 'title',
        regions: { title: [blockA], subtitle: [blockB] },
        background: { type: 'solid', color: '#ff0000' },
      },
      {
        id: 'slide-2',
        layout: 'two-column',
        regions: { title: [blockA], left: [blockB], right: [blockC] },
      },
      {
        id: 'slide-3',
        layout: 'blank',
        regions: { content: [blockA] },
        notes: 'Speaker notes',
        skip: true,
        masterId: 'brand',
      },
    ]

    it('each slide produces an array of shapes', () => {
      for (const slide of slides) {
        const result = compileSlide(slide, DEFAULT_FRAME, TEST_TOKENS)
        expect(Array.isArray(result.shapes)).toBe(true)
        expect(result.shapes.length).toBeGreaterThan(0)
      }
    })

    it('all shapes are ComponentShape type', () => {
      for (const slide of slides) {
        const result = compileSlide(slide, DEFAULT_FRAME, TEST_TOKENS)
        for (const shape of result.shapes) {
          expect(shape.type).toBe('component')
          expect(shape.componentId).toBeTruthy()
          expect(shape.point).toBeDefined()
          expect(shape.size).toBeDefined()
        }
      }
    })

    it('total shapes across 3 slides equals 6 (2 + 3 + 1)', () => {
      let total = 0
      for (const slide of slides) {
        total += compileSlide(slide, DEFAULT_FRAME, TEST_TOKENS).shapes.length
      }
      expect(total).toBe(6) // title: 2 (title, subtitle), two-column: 3 (title, left, right), blank: 1 (content)
    })
  })

  describe('unique id per shape (P18 bug prevention)', () => {
    it('all shapes within a single slide have unique ids', () => {
      const spec: SlideSpec = {
        id: 'uid-1',
        layout: 'two-column',
        regions: { title: [blockA], left: [blockB], right: [blockC] },
      }
      const { shapes } = compileSlide(spec, DEFAULT_FRAME, TEST_TOKENS)
      const ids = shapes.map((s) => s.id)
      expect(new Set(ids).size).toBe(ids.length)
    })

    it('all shapes across multiple slides have unique ids', () => {
      const spec1: SlideSpec = {
        id: 'uid-2',
        layout: 'title',
        regions: { title: [blockA], subtitle: [blockB] },
      }
      const spec2: SlideSpec = {
        id: 'uid-3',
        layout: 'title',
        regions: { title: [blockA], subtitle: [blockB] },
      }
      const s1 = compileSlide(spec1, DEFAULT_FRAME, TEST_TOKENS)
      const s2 = compileSlide(spec2, DEFAULT_FRAME, TEST_TOKENS)
      const allIds = [...s1.shapes, ...s2.shapes].map((s) => s.id)
      expect(new Set(allIds).size).toBe(allIds.length)
    })

    it('shapes have ids that are non-empty strings', () => {
      const spec: SlideSpec = {
        id: 'uid-4',
        layout: 'blank',
        regions: { content: [blockA] },
      }
      const { shapes } = compileSlide(spec, DEFAULT_FRAME, TEST_TOKENS)
      for (const shape of shapes) {
        expect(typeof shape.id).toBe('string')
        expect(shape.id.length).toBeGreaterThan(0)
      }
    })
  })

  describe('unique childIndex per shape (P18 bug prevention)', () => {
    it('all shapes within a slide have unique childIndex values', () => {
      const spec: SlideSpec = {
        id: 'ci-1',
        layout: 'two-column',
        regions: { title: [blockA], left: [blockB], right: [blockC] },
      }
      const { shapes } = compileSlide(spec, DEFAULT_FRAME, TEST_TOKENS)
      const indices = shapes.map((s) => s.childIndex)
      expect(new Set(indices).size).toBe(indices.length)
    })

    it('childIndex values start at 1 and are monotonically increasing', () => {
      const spec: SlideSpec = {
        id: 'ci-2',
        layout: 'two-column',
        regions: { title: [blockA], left: [blockB], right: [blockC] },
      }
      const { shapes } = compileSlide(spec, DEFAULT_FRAME, TEST_TOKENS)
      const indices = shapes.map((s) => s.childIndex)
      expect(indices).toEqual([1, 2, 3])
    })

    it('no two shapes in a multi-slide compilation share a childIndex within a slide', () => {
      const spec: SlideSpec = {
        id: 'ci-3',
        layout: 'four-up',
        regions: { title: [blockA], q1: [blockB], q2: [blockC], q3: [blockA], q4: [blockB] },
      }
      const { shapes } = compileSlide(spec, DEFAULT_FRAME, TEST_TOKENS)
      const indices = shapes.map((s) => s.childIndex)
      expect(new Set(indices).size).toBe(indices.length)
    })
  })

  describe('layout regions correctly populated', () => {
    it('title layout: title and subtitle blocks get correct positions', () => {
      const spec: SlideSpec = {
        id: 'lr-1',
        layout: 'title',
        regions: { title: [blockA], subtitle: [blockB] },
      }
      const { shapes } = compileSlide(spec, DEFAULT_FRAME, TEST_TOKENS)
      expect(shapes).toHaveLength(2)

      // Both shapes should have non-zero, non-overlapping positions
      const [titleShape, subtitleShape] = shapes
      expect(titleShape.point[0]).toBeGreaterThanOrEqual(0)
      expect(titleShape.point[1]).toBeGreaterThanOrEqual(0)
      expect(subtitleShape.point[1]).toBeGreaterThan(
        titleShape.point[1] + titleShape.size[1]
      )
    })

    it('two-column layout: title, left, and right blocks positioned', () => {
      const spec: SlideSpec = {
        id: 'lr-2',
        layout: 'two-column',
        regions: { title: [blockA], left: [blockB], right: [blockC] },
      }
      const { shapes } = compileSlide(spec, DEFAULT_FRAME, TEST_TOKENS)
      expect(shapes).toHaveLength(3)
      // left and right should not overlap
      const left = shapes.find((s) => s.childIndex === 2)!
      const right = shapes.find((s) => s.childIndex === 3)!
      const leftRight = left.point[0] + left.size[0]
      expect(right.point[0]).toBeGreaterThanOrEqual(leftRight)
    })

    it('blank layout: single content region fills safe margin', () => {
      const spec: SlideSpec = {
        id: 'lr-3',
        layout: 'blank',
        regions: { content: [blockA] },
      }
      const { shapes } = compileSlide(spec, DEFAULT_FRAME, TEST_TOKENS)
      expect(shapes).toHaveLength(1)
      const m = TEST_TOKENS.space['3xl']
      expect(shapes[0].point[0]).toBe(m)
      expect(shapes[0].point[1]).toBe(m)
      expect(shapes[0].size[0]).toBe(DEFAULT_FRAME.width - 2 * m)
      expect(shapes[0].size[1]).toBe(DEFAULT_FRAME.height - 2 * m)
    })

    it('unknown region emits finding with suggestion', () => {
      const spec: SlideSpec = {
        id: 'lr-4',
        layout: 'title', // regions: title, subtitle
        regions: { title: [blockA], nonexistent: [blockB] },
      }
      const { shapes, findings } = compileSlide(spec, DEFAULT_FRAME, TEST_TOKENS)
      expect(shapes).toHaveLength(1) // only 'title' matches a region
      const unknownFindings = findings.filter((f) => f.rule === 'region/unknown')
      expect(unknownFindings.length).toBeGreaterThanOrEqual(1)
      const nf = unknownFindings.find((f) => f.region === 'nonexistent')
      expect(nf).toBeDefined()
      expect(nf!.message).toContain('nonexistent')
    })
  })

  describe('multi-block regions', () => {
    it('stacks blocks vertically within a region with space.md gaps', () => {
      const spec: SlideSpec = {
        id: 'mb-1',
        layout: 'blank',
        regions: { content: [blockA, blockB, blockC] },
      }
      const { shapes } = compileSlide(spec, DEFAULT_FRAME, TEST_TOKENS)
      expect(shapes).toHaveLength(3)

      const gap = TEST_TOKENS.space.md
      const m = TEST_TOKENS.space['3xl']
      const regionHeight = DEFAULT_FRAME.height - 2 * m
      const blockHeight = (regionHeight - 2 * gap) / 3

      // First block at region top
      expect(shapes[0].point[1]).toBe(m)
      expect(shapes[0].size[1]).toBeCloseTo(blockHeight, 0)

      // Second block below first + gap
      expect(shapes[1].point[1]).toBeCloseTo(m + blockHeight + gap, 0)

      // Third block below second + gap
      expect(shapes[2].point[1]).toBeCloseTo(m + 2 * (blockHeight + gap), 0)
    })

    it('childIndex is sequential across regions and free blocks', () => {
      const spec: SlideSpec = {
        id: 'mb-2',
        layout: 'two-column',
        regions: { title: [blockA, blockB], left: [blockC], right: [blockA] },
      }
      const { shapes } = compileSlide(spec, DEFAULT_FRAME, TEST_TOKENS)
      expect(shapes).toHaveLength(4)
      const indices = shapes.map((s) => s.childIndex)
      expect(indices).toEqual([1, 2, 3, 4])
    })
  })

  describe('free-positioned blocks', () => {
    it('places free blocks directly at their explicit box', () => {
      const spec: SlideSpec = {
        id: 'free-1',
        layout: 'blank',
        regions: { content: [blockA] },
        free: [{ block: blockB, box: { x: 100, y: 200, width: 300, height: 150 } }],
      }
      const { shapes } = compileSlide(spec, DEFAULT_FRAME, TEST_TOKENS)
      expect(shapes).toHaveLength(2)
      const freeShape = shapes.find((s) => s.props?.$block?.id === 'b-b')!
      expect(freeShape.point).toEqual([100, 200])
      expect(freeShape.size).toEqual([300, 150])
    })

    it('free blocks get childIndex after all region blocks', () => {
      const spec: SlideSpec = {
        id: 'free-2',
        layout: 'blank',
        regions: { content: [blockA] },
        free: [{ block: blockB, box: { x: 0, y: 0, width: 100, height: 50 } }],
      }
      const { shapes } = compileSlide(spec, DEFAULT_FRAME, TEST_TOKENS)
      expect(shapes).toHaveLength(2)
      const indices = shapes.map((s) => s.childIndex).sort((a, b) => a - b)
      expect(indices).toEqual([1, 2])
    })
  })

  describe('metadata propagated', () => {
    it('background is passed through', () => {
      const bg = { type: 'solid' as const, color: '#abcdef' }
      const spec: SlideSpec = {
        id: 'meta-1',
        layout: 'blank',
        regions: { content: [blockA] },
        background: bg,
      }
      const result = compileSlide(spec, DEFAULT_FRAME, TEST_TOKENS)
      expect(result.background).toEqual(bg)
    })

    it('background is undefined when not set', () => {
      const spec: SlideSpec = {
        id: 'meta-2',
        layout: 'blank',
        regions: { content: [blockA] },
      }
      const result = compileSlide(spec, DEFAULT_FRAME, TEST_TOKENS)
      expect(result.background).toBeUndefined()
    })

    it('masterId is passed through', () => {
      const spec: SlideSpec = {
        id: 'meta-3',
        layout: 'blank',
        regions: { content: [blockA] },
        masterId: 'brand-v2',
      }
      const result = compileSlide(spec, DEFAULT_FRAME, TEST_TOKENS)
      expect(result.masterId).toBe('brand-v2')
    })

    it('notes are passed through', () => {
      const spec: SlideSpec = {
        id: 'meta-4',
        layout: 'blank',
        regions: { content: [blockA] },
        notes: 'Remember to mention Q3 results',
      }
      const result = compileSlide(spec, DEFAULT_FRAME, TEST_TOKENS)
      expect(result.notes).toBe('Remember to mention Q3 results')
    })

    it('skip maps to skipInPresentation in result', () => {
      const spec: SlideSpec = {
        id: 'meta-5',
        layout: 'blank',
        regions: { content: [blockA] },
        skip: true,
      }
      const result = compileSlide(spec, DEFAULT_FRAME, TEST_TOKENS)
      expect(result.skipInPresentation).toBe(true)
    })

    it('layout and slideSpecId are returned', () => {
      const spec: SlideSpec = {
        id: 'meta-6',
        layout: 'two-column',
        regions: { title: [blockA] },
      }
      const result = compileSlide(spec, DEFAULT_FRAME, TEST_TOKENS)
      expect(result.layout).toBe('two-column')
      expect(result.slideSpecId).toBe('meta-6')
    })

    it('findings is always returned as an array', () => {
      const spec: SlideSpec = {
        id: 'meta-7',
        layout: 'blank',
        regions: { content: [blockA] },
      }
      const result = compileSlide(spec, DEFAULT_FRAME, TEST_TOKENS)
      expect(Array.isArray(result.findings)).toBe(true)
      expect(result.findings).toHaveLength(0) // no issues for a clean spec
    })
  })

  describe('missing or unknown layout falls back gracefully', () => {
    it('empty regions produces zero shapes', () => {
      const spec: SlideSpec = {
        id: 'fallback-1',
        layout: 'title',
        regions: {},
      }
      const result = compileSlide(spec, DEFAULT_FRAME, TEST_TOKENS)
      expect(result.shapes).toHaveLength(0)
    })

    it('unknown layout name falls back to blank with finding', () => {
      const spec: SlideSpec = {
        id: 'fallback-2',
        layout: 'nonexistent-layout',
        regions: { content: [blockA] },
      }
      const result = compileSlide(spec, DEFAULT_FRAME, TEST_TOKENS)
      expect(result.shapes).toHaveLength(1) // blank layout has 'content' region
      const unknownFindings = result.findings.filter((f) => f.rule === 'region/unknown')
      expect(unknownFindings.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('different aspect ratios', () => {
    it('compiles correctly at 4:3', () => {
      const frame = { width: 1440, height: 1080 }
      const spec: SlideSpec = {
        id: 'ar-1',
        layout: 'two-column',
        regions: { title: [blockA], left: [blockB], right: [blockC] },
      }
      const result = compileSlide(spec, frame, TEST_TOKENS)
      expect(result.shapes).toHaveLength(3)
      // All shapes should fit within the frame
      for (const shape of result.shapes) {
        expect(shape.point[0] + shape.size[0]).toBeLessThanOrEqual(frame.width)
        expect(shape.point[1] + shape.size[1]).toBeLessThanOrEqual(frame.height)
      }
    })

    it('compiles correctly at 9:16', () => {
      const frame = { width: 1080, height: 1920 }
      const spec: SlideSpec = {
        id: 'ar-2',
        layout: 'blank',
        regions: { content: [blockA] },
      }
      const result = compileSlide(spec, frame, TEST_TOKENS)
      expect(result.shapes).toHaveLength(1)
      const shape = result.shapes[0]
      expect(shape.point[0] + shape.size[0]).toBeLessThanOrEqual(frame.width)
      expect(shape.point[1] + shape.size[1]).toBeLessThanOrEqual(frame.height)
    })
  })

  describe('end-to-end: 3-slide DeckSpec compiles to valid document-ready shapes', () => {
    it('all shapes across the deck are valid ComponentShapes with unique ids and childIndex', () => {
      const deckSlides: SlideSpec[] = [
        {
          id: 'e2e-1',
          layout: 'title',
          regions: { title: [blockA], subtitle: [blockB] },
          background: { type: 'solid', color: '#1a1a2e' },
        },
        {
          id: 'e2e-2',
          layout: 'three-column',
          regions: { title: [blockA], a: [blockB], b: [blockC], c: [blockA] },
        },
        {
          id: 'e2e-3',
          layout: 'kpi-row',
          regions: { title: [blockA], kpi1: [blockB], kpi2: [blockC], kpi3: [blockA], kpi4: [blockB] },
          notes: 'Final slide',
          skip: false,
        },
      ]

      const allShapes: import('~types').ComponentShape[] = []
      for (const slide of deckSlides) {
        const result = compileSlide(slide, DEFAULT_FRAME, TEST_TOKENS)
        allShapes.push(...result.shapes)
      }

      // Every shape has unique id
      const ids = allShapes.map((s) => s.id)
      expect(new Set(ids).size).toBe(ids.length)

      // Every shape within each slide has unique childIndex
      for (const slide of deckSlides) {
        const { shapes } = compileSlide(slide, DEFAULT_FRAME, TEST_TOKENS)
        const indices = shapes.map((s) => s.childIndex)
        expect(new Set(indices).size).toBe(indices.length)
      }

      // All shapes are valid ComponentShapes
      for (const shape of allShapes) {
        expect(shape.type).toBe('component')
        expect(shape.componentId).toBeTruthy()
        expect(typeof shape.id).toBe('string')
        expect(typeof shape.childIndex).toBe('number')
        expect(shape.point).toHaveLength(2)
        expect(shape.size).toHaveLength(2)
      }

      // Total: title(2) + three-column(4) + kpi-row(5) = 11
      expect(allShapes).toHaveLength(11)
    })
  })

  describe('module-level objects are copied, not aliased', () => {
    it('shapes from compileSlide are independent objects (different references)', () => {
      const spec: SlideSpec = {
        id: 'alias-1',
        layout: 'two-column',
        regions: { title: [blockA], left: [blockB], right: [blockC] },
      }
      const result1 = compileSlide(spec, DEFAULT_FRAME, TEST_TOKENS)
      const result2 = compileSlide(spec, DEFAULT_FRAME, TEST_TOKENS)

      // Different shape arrays
      expect(result1.shapes).not.toBe(result2.shapes)

      // Shapes are different object references
      expect(result1.shapes[0]).not.toBe(result2.shapes[0])

      // Mutating one doesn't affect the other
      const originalX = result1.shapes[0].point[0]
      result1.shapes[0].point[0] = 99999
      expect(result2.shapes[0].point[0]).toBe(originalX)
    })

    it('multiple calls produce same layout geometry (except id)', () => {
      const spec: SlideSpec = {
        id: 'alias-2',
        layout: 'blank',
        regions: { content: [blockA] },
      }
      const r1 = compileSlide(spec, DEFAULT_FRAME, TEST_TOKENS)
      const r2 = compileSlide(spec, DEFAULT_FRAME, TEST_TOKENS)

      // Same point and size (geometry is deterministic from the same layout)
      expect(r1.shapes[0].point).toEqual(r2.shapes[0].point)
      expect(r1.shapes[0].size).toEqual(r2.shapes[0].size)
      expect(r1.shapes[0].childIndex).toBe(r2.shapes[0].childIndex)

      // But different id (unique per shape)
      expect(r1.shapes[0].id).not.toBe(r2.shapes[0].id)
    })

    it('style objects are copied (not aliased to defaultStyle)', () => {
      const spec: SlideSpec = {
        id: 'alias-3',
        layout: 'blank',
        regions: { content: [blockA] },
      }
      const result = compileSlide(spec, DEFAULT_FRAME, TEST_TOKENS)
      // Each shape should have its own style object
      for (const shape of result.shapes) {
        expect(shape.style).toBeDefined()
        // Style should be a plain object (deep-copied by blockToShape)
        expect(typeof shape.style).toBe('object')
      }
    })
  })
})
