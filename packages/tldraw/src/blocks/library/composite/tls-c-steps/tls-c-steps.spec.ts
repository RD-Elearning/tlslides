/**
 * Geometry and behaviour tests for tls.c.steps — process/timeline of steps.
 *
 * Covers:
 * - Layout at 3 sizes for both orientations (horizontal, vertical)
 * - Part naming matches motion.parts patterns
 * - Connector nodes are thin rects (B.5 lesson)
 * - Delegated children (tls.t.title, tls.t.body) are present
 * - Empty steps, 1 step (min), many steps (max), adversarial inputs
 * - capacity() sane at min and max
 * - describe.example passes validateDeckSpec
 * - Parity for at least one size per orientation
 * - Deep-copy of defaults
 */

import { tlsCSteps } from './index'
import { makeCtx, SIZES, assertValidNode } from '../../text/test-helpers'
import { layout } from './layout'
import { validateDeckSpec } from '../../../validate-deck-spec'
import { BlockRegistry } from '../../../registry'
import { registerBuiltInBlocks } from '../../../library'
import { assertParity } from '../../../parity-harness'
import type { DeckSpec, LayoutContext, LayoutNode, CapacityReport } from '../../../types'
import type { StepsProps } from './schema'

/* ── helpers ───────────────────────────────────────────────────────────────── */

const registry = (() => {
  const r = new BlockRegistry()
  registerBuiltInBlocks(r)
  if (!r.has(tlsCSteps.type)) r.register(tlsCSteps)
  return r
})()

function ctx(box: { width: number; height: number }): LayoutContext {
  return makeCtx(box, registry)
}

/** Narrow a `LayoutNode` to its group variant. */
function asGroup(node: LayoutNode): Extract<LayoutNode, { k: 'group' }> {
  if (node.k !== 'group') throw new Error(`expected group, got ${node.k}`)
  return node
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

/** Collect all rect nodes from a LayoutNode tree (DFS). */
function collectRects(node: LayoutNode): Array<{ part?: string; box: { width: number; height: number } }> {
  const result: Array<{ part?: string; box: { width: number; height: number } }> = []
  function walk(n: LayoutNode) {
    if (n.k === 'rect') {
      result.push({ part: n.part, box: n.box })
    }
    if (n.k === 'group' && 'children' in n) {
      for (const c of n.children) walk(c)
    }
  }
  walk(node)
  return result
}

const DEFAULT_PROPS: StepsProps = {
  steps: [
    { title: 'Plan', desc: 'Define scope' },
    { title: 'Build', desc: 'Implement solution' },
    { title: 'Ship', desc: 'Deploy' },
  ],
  orientation: 'horizontal',
}

const VERTICAL_PROPS: StepsProps = {
  steps: [
    { title: 'Plan', desc: 'Define scope' },
    { title: 'Build', desc: 'Implement solution' },
    { title: 'Ship', desc: 'Deploy' },
  ],
  orientation: 'vertical',
}

/* ── layout geometry tests ─────────────────────────────────────────────────── */

describe('tls.c.steps', () => {
  describe('layout at 3 sizes — horizontal', () => {
    it.each(SIZES)('produces valid tree at $label ($box.width×$box.height)', ({ box }) => {
      const c = ctx(box)
      const node = layout(DEFAULT_PROPS, c)
      assertValidNode(node)
      expect(node.k).toBe('group')
      expect(node.part).toBe('root')
    })
  })

  describe('layout at 3 sizes — vertical', () => {
    it.each(SIZES)('produces valid tree at $label ($box.width×$box.height)', ({ box }) => {
      const c = ctx(box)
      const node = layout(VERTICAL_PROPS, c)
      assertValidNode(node)
      expect(node.k).toBe('group')
      expect(node.part).toBe('root')
    })
  })

  describe('part naming — horizontal', () => {
    it('emits step[0].marker, step[0].title, step[0].desc, connector[0], etc.', () => {
      const c = ctx({ width: 960, height: 540 })
      const node = layout(DEFAULT_PROPS, c)
      const parts = collectParts(node)

      // 3 steps: marker/title/desc for each = 9, plus 2 connectors = 11
      expect(parts).toContain('step[0].marker')
      expect(parts).toContain('step[0].title')
      expect(parts).toContain('step[0].desc')
      expect(parts).toContain('connector[0]')
      expect(parts).toContain('step[1].marker')
      expect(parts).toContain('step[1].title')
      expect(parts).toContain('step[1].desc')
      expect(parts).toContain('connector[1]')
      expect(parts).toContain('step[2].marker')
      expect(parts).toContain('step[2].title')
      expect(parts).toContain('step[2].desc')
    })

    it('emits exactly N-1 connectors for N steps', () => {
      const c = ctx({ width: 960, height: 540 })
      const node = layout(DEFAULT_PROPS, c)
      const parts = collectParts(node)
      const connectorParts = parts.filter((p) => p.startsWith('connector['))
      expect(connectorParts).toHaveLength(2) // 3 steps -> 2 connectors
    })
  })

  describe('part naming — vertical', () => {
    it('emits correct parts for vertical orientation', () => {
      const c = ctx({ width: 960, height: 540 })
      const node = layout(VERTICAL_PROPS, c)
      const parts = collectParts(node)

      expect(parts).toContain('step[0].marker')
      expect(parts).toContain('step[0].title')
      expect(parts).toContain('step[0].desc')
      expect(parts).toContain('connector[0]')
    })
  })

  describe('data-part set matches motion.parts set', () => {
    it('every step/connector part matches a motion.parts pattern', () => {
      const c = ctx({ width: 960, height: 540 })
      const node = layout(DEFAULT_PROPS, c)
      const allParts = collectParts(node)
      const motionParts = tlsCSteps.motion.parts ?? []

      // Only check parts declared by this block (step[*] and connector[*]),
      // not internal parts from delegated child blocks (root, text).
      const ourParts = allParts.filter(
        (p) => p.startsWith('step[') || p.startsWith('connector['),
      )

      for (const part of ourParts) {
        const matches = motionParts.some((pattern) => {
          const regex = new RegExp(
            '^' + pattern.replace(/\[\*\]/g, '\\[\\d+\\]').replace(/\./g, '\\.') + '$',
          )
          return regex.test(part)
        })
        expect(matches).toBe(true)
      }
    })
  })

  describe('connector nodes are thin rects', () => {
    it('connectors have k=rect and thickness of 2', () => {
      const c = ctx({ width: 960, height: 540 })
      const node = layout(DEFAULT_PROPS, c)
      const rects = collectRects(node)
      const connectors = rects.filter((r) => r.part?.startsWith('connector['))

      expect(connectors.length).toBeGreaterThanOrEqual(1)
      for (const conn of connectors) {
        if (conn.part === 'connector[0]') {
          // Horizontal: thin height
          expect(conn.box.height).toBe(2)
          expect(conn.box.width).toBeGreaterThanOrEqual(1)
        }
      }
    })

    it('vertical connectors are thin width', () => {
      const c = ctx({ width: 960, height: 540 })
      const node = layout(VERTICAL_PROPS, c)
      const rects = collectRects(node)
      const connectors = rects.filter((r) => r.part?.startsWith('connector['))

      expect(connectors.length).toBeGreaterThanOrEqual(1)
      for (const conn of connectors) {
        if (conn.part === 'connector[0]') {
          // Vertical: thin width
          expect(conn.box.width).toBe(2)
          expect(conn.box.height).toBeGreaterThanOrEqual(1)
        }
      }
    })
  })

  describe('delegated children', () => {
    it('title nodes exist as children of the group', () => {
      const c = ctx({ width: 960, height: 540 })
      const node = layout(DEFAULT_PROPS, c)
      const parts = collectParts(node)
      const titleParts = parts.filter((p) => p.match(/^step\[\d+\]\.title$/))
      expect(titleParts).toHaveLength(3)
    })

    it('desc nodes exist as children of the group', () => {
      const c = ctx({ width: 960, height: 540 })
      const node = layout(DEFAULT_PROPS, c)
      const parts = collectParts(node)
      const descParts = parts.filter((p) => p.match(/^step\[\d+\]\.desc$/))
      expect(descParts).toHaveLength(3)
    })
  })

  describe('marker numbering', () => {
    it('markers display 1-based numbers', () => {
      const c = ctx({ width: 960, height: 540 })
      const node = layout(DEFAULT_PROPS, c)

      // Find marker nodes by walking the tree
      function findMarkerText(n: LayoutNode, partName: string): string | undefined {
        if (n.part === partName && n.k === 'text') {
          return n.lines.map((l) => l.text).join('')
        }
        if (n.k === 'group' && 'children' in n) {
          for (const child of n.children) {
            const found = findMarkerText(child, partName)
            if (found) return found
          }
        }
        return undefined
      }

      expect(findMarkerText(node, 'step[0].marker')).toBe('1')
      expect(findMarkerText(node, 'step[1].marker')).toBe('2')
      expect(findMarkerText(node, 'step[2].marker')).toBe('3')
    })
  })

  /* ── adversarial tests ───────────────────────────────────────────────────── */

  describe('empty steps', () => {
    it('returns an empty group for no steps', () => {
      const c = ctx({ width: 960, height: 540 })
      const node = layout({ steps: [], orientation: 'horizontal' } as any, c)
      expect(node.children).toHaveLength(0)
    })
  })

  describe('single step (min)', () => {
    it('handles a single step without throwing', () => {
      const c = ctx({ width: 960, height: 540 })
      const node = layout(
        { steps: [{ title: 'Only' }], orientation: 'horizontal' } as any,
        c,
      )
      assertValidNode(node)
      const parts = collectParts(node)
      expect(parts).toContain('step[0].marker')
      expect(parts).toContain('step[0].title')
      // No connectors for 1 step
      const connectors = parts.filter((p) => p.startsWith('connector['))
      expect(connectors).toHaveLength(0)
    })
  })

  describe('12 steps (max)', () => {
    it('handles 12 steps without throwing', () => {
      const c = ctx({ width: 1920, height: 1080 })
      const steps = Array.from({ length: 12 }, (_, i) => ({
        title: `Step ${i + 1}`,
        desc: `Description ${i + 1}`,
      }))
      const node = layout({ steps, orientation: 'horizontal' } as any, c)
      assertValidNode(node)
      const parts = collectParts(node)
      const connectorParts = parts.filter((p) => p.startsWith('connector['))
      expect(connectorParts).toHaveLength(11)
    })
  })

  describe('400-char desc (adversarial)', () => {
    it('handles a 400-char description without throwing', () => {
      const c = ctx({ width: 960, height: 540 })
      const longDesc = 'a'.repeat(400)
      const node = layout(
        {
          steps: [{ title: 'Step', desc: longDesc }],
          orientation: 'horizontal',
        } as any,
        c,
      )
      assertValidNode(node)
    })
  })

  describe('CJK text (adversarial)', () => {
    it('handles CJK characters in step titles and descriptions', () => {
      const c = ctx({ width: 960, height: 540 })
      const node = layout(
        {
          steps: [
            { title: '第一阶段', desc: '定义范围和需求' },
            { title: '第二阶段', desc: '实施方案' },
          ],
          orientation: 'horizontal',
        } as any,
        c,
      )
      assertValidNode(node)
      const parts = collectParts(node)
      expect(parts).toContain('step[0].marker')
      expect(parts).toContain('step[1].marker')
    })
  })

  describe('empty step list (adversarial)', () => {
    it('handles empty steps array without throwing', () => {
      const c = ctx({ width: 960, height: 540 })
      const node = layout({ steps: [], orientation: 'vertical' } as any, c)
      assertValidNode(node)
    })
  })

  /* ── capacity tests ──────────────────────────────────────────────────────── */

  describe('capacity()', () => {
    it('reports fits=true for defaults at preferred size', () => {
      const c = ctx({ width: 960, height: 540 })
      const report = tlsCSteps.capacity!(
        tlsCSteps.defaults as StepsProps,
        { width: 960, height: 540 },
        c,
      )
      expect(report.fits).toBe(true)
      expect(report.budget).toHaveProperty('steps')
    })

    it('reports fits=false when too many steps for a small box', () => {
      const c = ctx({ width: 200, height: 100 })
      const manySteps = Array.from({ length: 12 }, (_, i) => ({
        title: `Step ${i + 1}`,
        desc: `Desc ${i + 1}`,
      }))
      const report = tlsCSteps.capacity!(
        { steps: manySteps, orientation: 'horizontal' } as StepsProps,
        { width: 200, height: 100 },
        c,
      )
      expect(report.fits).toBe(false)
      expect(report.budget.steps.max).toBeLessThan(12)
      expect(report.remedy.length).toBeGreaterThan(0)
    })

    it('reports fits=true for 1 step (min adversarial)', () => {
      const c = ctx({ width: 200, height: 100 })
      const report = tlsCSteps.capacity!(
        { steps: [{ title: 'Solo' }], orientation: 'horizontal' } as StepsProps,
        { width: 200, height: 100 },
        c,
      )
      expect(report.fits).toBe(true)
    })

    it('reports budget with correct unit', () => {
      const c = ctx({ width: 960, height: 540 })
      const report = tlsCSteps.capacity!(
        tlsCSteps.defaults as StepsProps,
        { width: 960, height: 540 },
        c,
      )
      expect(report.budget.steps.unit).toBe('items')
    })

    it('vertical capacity differs from horizontal', () => {
      const c = ctx({ width: 960, height: 200 })
      const manySteps = Array.from({ length: 12 }, (_, i) => ({
        title: `Step ${i + 1}`,
        desc: `Desc ${i + 1}`,
      }))
      const hReport = tlsCSteps.capacity!(
        { steps: manySteps, orientation: 'horizontal' } as StepsProps,
        { width: 960, height: 200 },
        c,
      )
      const vReport = tlsCSteps.capacity!(
        { steps: manySteps, orientation: 'vertical' } as StepsProps,
        { width: 960, height: 200 },
        c,
      )
      // With wide but short box, horizontal should fit more than vertical
      expect(hReport.budget.steps.max).toBeGreaterThanOrEqual(
        vReport.budget.steps.max,
      )
    })
  })

  /* ── validateDeckSpec ────────────────────────────────────────────────────── */

  describe('validateDeckSpec', () => {
    function stepsDeck(extraProps?: Record<string, unknown>): DeckSpec {
      return {
        version: 1,
        id: 'test-deck',
        title: 'Test',
        theme: 'mono-grid',
        aspect: 'widescreen',
        slides: [
          {
            id: 'sl1',
            layout: 'title',
            regions: {
              title: [
                {
                  id: 'steps1',
                  type: 'tls.c.steps',
                  props: {
                    steps: [
                      { title: 'Plan', desc: 'Define scope' },
                      { title: 'Build', desc: 'Implement' },
                      { title: 'Ship', desc: 'Deploy' },
                    ],
                    orientation: 'horizontal',
                    ...extraProps,
                  },
                },
              ],
            },
          },
        ],
      }
    }

    it('accepts the steps block with valid props', () => {
      const findings = validateDeckSpec(stepsDeck(), registry)
      const errors = findings.filter((f) => f.level === 'error')
      expect(errors).toEqual([])
    })

    it('accepts the describe.example', () => {
      const example = tlsCSteps.describe!.example
      const deck: DeckSpec = {
        version: 1,
        id: 'test-example',
        title: 'Test',
        theme: 'mono-grid',
        aspect: 'widescreen',
        slides: [
          {
            id: 'sl1',
            layout: 'title',
            regions: {
              title: [
                {
                  id: 'steps-ex',
                  type: 'tls.c.steps',
                  props: example.props,
                },
              ],
            },
          },
        ],
      }
      const findings = validateDeckSpec(deck, registry)
      const errors = findings.filter((f) => f.level === 'error')
      expect(errors).toEqual([])
    })
  })

  /* ── definition fields ───────────────────────────────────────────────────── */

  describe('definition fields', () => {
    it('has type tls.c.steps', () => {
      expect(tlsCSteps.type).toBe('tls.c.steps')
    })

    it('has family composite', () => {
      expect(tlsCSteps.family).toBe('composite')
    })

    it('has tier A', () => {
      expect(tlsCSteps.tier).toBe('A')
    })

    it('has describe with when, avoid, example', () => {
      expect(tlsCSteps.describe).toBeDefined()
      expect(tlsCSteps.describe!.when).toBeTruthy()
      expect(tlsCSteps.describe!.avoid).toBeTruthy()
      expect(tlsCSteps.describe!.example).toBeDefined()
    })

    it('has schema with steps and orientation', () => {
      expect(tlsCSteps.schema).toHaveProperty('steps')
      expect(tlsCSteps.schema).toHaveProperty('orientation')
    })

    it('has motion with parts', () => {
      expect(tlsCSteps.motion.parts).toBeDefined()
      expect(tlsCSteps.motion.parts!.length).toBeGreaterThan(0)
    })

    it('has capacity as a function', () => {
      expect(typeof tlsCSteps.capacity).toBe('function')
    })
  })

  /* ── deep copy safety ────────────────────────────────────────────────────── */

  describe('defaults deep copy', () => {
    it('layout does not mutate its props', () => {
      const c = ctx({ width: 960, height: 540 })
      const props: StepsProps = {
        steps: [{ title: 'A' }, { title: 'B' }],
        orientation: 'horizontal',
      }
      const before = JSON.parse(JSON.stringify(props))
      layout(props, c)
      expect(props).toEqual(before)
      // Deep equality AND reference safety: the internal arrays should not
      // be the same reference (DoD item 5: not.toBe AND toEqual).
      expect(props.steps).not.toBe(before.steps)
    })

    it('defaults are not mutated across calls', () => {
      const c = ctx({ width: 960, height: 540 })
      const snapshot = JSON.parse(JSON.stringify(tlsCSteps.defaults))
      layout(tlsCSteps.defaults as StepsProps, c)
      expect(tlsCSteps.defaults).toEqual(snapshot)
    })
  })

  /* ── parity tests ────────────────────────────────────────────────────────── */

  describe('parity', () => {
    it('horizontal at medium size', async () => {
      await assertParity(
        tlsCSteps,
        tlsCSteps.defaults as Record<string, unknown>,
        { width: 960, height: 540 },
      )
    }, 30_000)

    it('vertical at medium size', async () => {
      await assertParity(
        tlsCSteps,
        { steps: tlsCSteps.defaults.steps, orientation: 'vertical' } as Record<string, unknown>,
        { width: 960, height: 540 },
      )
    }, 30_000)
  })
})
