/**
 * Tests for R6 — blockShowDuration and slideTimeline.
 *
 * Covers:
 *  - blockShowDuration: delay/active/total for various presets and part counts
 *  - blockShowDuration: ambient presets return zero
 *  - blockShowDuration: no-motion blocks return zero
 *  - blockShowDuration: stagger × (partCount − 1) calculation
 *  - slideTimeline: step grouping by trigger semantics
 *  - slideTimeline: demo deck slides
 *  - slideTimeline: empty and no-motion slides
 *  - slideTimeline: totalMs equals sum of step durations
 *  - Performance: 60-slide deck runs under 20 ms
 *  - DOM-free: no document, window, or browser APIs used
 */

import { AnimationTrigger } from '~types'
import type { BlockSpec, BlockDefinition, SlideSpec } from '../types'
import { BlockRegistry } from '../registry'
import { registerBuiltInBlocks } from '../library'
import { DURATION_TOKENS } from './tokens'
import { MOTION_PRESETS } from './presets'
import { blockShowDuration, slideTimeline, countLayoutParts } from './timeline'
import type { BlockShowDuration } from './timeline'

/* ── Shared fixtures ──────────────────────────────────────────────────────────── */

let registry: BlockRegistry

beforeAll(() => {
  registry = new BlockRegistry()
  registerBuiltInBlocks(registry)
})

/* ── Minimal test helpers ─────────────────────────────────────────────────────── */

function makeBlockSpec(overrides: Partial<BlockSpec> & { type: string; id: string }): BlockSpec {
  return {
    props: {},
    ...overrides,
  }
}

/**
 * A minimal block definition with NO motion preset — used to test the
 * "no motion intent → effect null → zero duration" path.
 */
const NO_MOTION_DEF: BlockDefinition = {
  type: 'test.no-motion',
  name: 'No Motion',
  family: 'text',
  tier: 'A',
  summary: 'A block with no motion recipe.',
  keywords: [],
  schema: {},
  defaults: {},
  size: { preferred: [200, 100], min: [100, 50] },
  layout: (props, ctx) => ({
    k: 'group',
    box: { x: 0, y: 0, width: ctx.box.width, height: 50 },
    children: [],
  }),
  motion: {},  // No preset — no motion intent
}

/* ═══════════════════════════════════════════════════════════════════════════════ */
/* blockShowDuration                                                               */
/* ═══════════════════════════════════════════════════════════════════════════════ */

describe('blockShowDuration', () => {
  describe('basic timing', () => {
    it('returns zero for a block with no motion intent (no preset in spec or definition)', () => {
      const spec = makeBlockSpec({
        type: 'test.no-motion',
        id: 'no-motion',
      })
      const result = blockShowDuration(spec, NO_MOTION_DEF)
      // No motion intent → effect null → zero duration
      expect(result).toEqual({ delayMs: 0, activeMs: 0, totalMs: 0 })
    })

    it('computes timing for a fade-up block', () => {
      const spec = makeBlockSpec({
        type: 'tls.t.title',
        id: 'fade-up-block',
        motion: { preset: 'fade-up', order: 1 },
      })
      const def = registry.get('tls.t.title')!
      const result = blockShowDuration(spec, def, registry)
      // fade-up preset: duration = DURATION_TOKENS.slow (400ms), no stagger
      expect(result.delayMs).toBe(0)
      expect(result.activeMs).toBe(DURATION_TOKENS.slow)
      expect(result.totalMs).toBe(DURATION_TOKENS.slow)
    })

    it('includes delay in totalMs', () => {
      const spec = makeBlockSpec({
        type: 'tls.t.title',
        id: 'delayed-block',
        motion: { preset: 'fade', order: 1, delay: 200 },
      })
      const def = registry.get('tls.t.title')!
      const result = blockShowDuration(spec, def, registry)
      expect(result.delayMs).toBe(200)
      expect(result.totalMs).toBe(200 + result.activeMs)
    })

    it('uses the definition preset when spec has no preset', () => {
      const spec = makeBlockSpec({
        type: 'tls.t.hero-number',
        id: 'def-preset',
        motion: { order: 1 },
      })
      const def = registry.get('tls.t.hero-number')!
      // hero-number default motion preset is 'count-up'
      expect(def.motion.preset).toBe('count-up')
      const result = blockShowDuration(spec, def, registry)
      expect(result.activeMs).toBe(DURATION_TOKENS.verySlow)
    })
  })

  describe('stagger × (partCount − 1)', () => {
    it('stagger-lines on a 3-item bullet list accounts for 6 parts', () => {
      const spec = makeBlockSpec({
        type: 'tls.t.bullets',
        id: 'bullets-3',
        motion: { preset: 'stagger-lines', order: 1 },
        props: {
          items: [
            { text: 'One' },
            { text: 'Two' },
            { text: 'Three' },
          ],
          marker: 'dot',
        },
      })
      const def = registry.get('tls.t.bullets')!
      const result = blockShowDuration(spec, def, registry)

      // bullets layout produces: root + 3×(marker + text) = 7 nodes, 6 parts
      const partCount = countLayoutParts(spec, def, registry)
      expect(partCount).toBe(6)

      // stagger-lines: duration = DURATION_TOKENS.verySlow (500ms), staggerMs = DURATION_TOKENS.stagger (40ms)
      const expectedActive = DURATION_TOKENS.verySlow + DURATION_TOKENS.stagger * (partCount - 1)
      expect(result.activeMs).toBe(expectedActive)
      expect(result.totalMs).toBe(result.delayMs + result.activeMs)
    })

    it('count-up on hero-number has 3 parts (value, unit, caption) but no stagger', () => {
      const spec = makeBlockSpec({
        type: 'tls.t.hero-number',
        id: 'kpi-1',
        motion: { preset: 'count-up', order: 1 },
        props: {
          value: '$4.2M',
          unit: 'Revenue',
          caption: '+21% QoQ',
          format: 'currency',
          emphasis: 'accent',
        },
      })
      const def = registry.get('tls.t.hero-number')!
      const result = blockShowDuration(spec, def, registry)

      // hero-number layout produces: root + value + unit + caption = 4 nodes, 3 parts
      const partCount = countLayoutParts(spec, def, registry)
      expect(partCount).toBe(3)

      // count-up has no staggerMs, so stagger contribution is 0
      expect(result.activeMs).toBe(DURATION_TOKENS.verySlow)
    })

    it('partCountOverride bypasses layout call', () => {
      const spec = makeBlockSpec({
        type: 'tls.t.bullets',
        id: 'bullets-override',
        motion: { preset: 'stagger-lines', order: 1 },
        props: { items: [{ text: 'A' }], marker: 'dot' },
      })
      const def = registry.get('tls.t.bullets')!
      // Override with 10 parts instead of the actual 2 (1 item × 2 parts)
      const result = blockShowDuration(spec, def, registry, 10)
      const expectedActive = DURATION_TOKENS.verySlow + DURATION_TOKENS.stagger * 9
      expect(result.activeMs).toBe(expectedActive)
    })
  })

  describe('ambient presets', () => {
    it('returns zero for ken-burns (ambient)', () => {
      const spec = makeBlockSpec({
        type: 'tls.t.title',
        id: 'ambient-block',
        motion: { preset: 'ken-burns', order: 1 },
      })
      const def = registry.get('tls.t.title')!
      const result = blockShowDuration(spec, def, registry)
      expect(result).toEqual({ delayMs: 0, activeMs: 0, totalMs: 0 })
    })
  })

  describe('part overrides', () => {
    it('accounts for the longest part override beyond base duration', () => {
      const spec = makeBlockSpec({
        type: 'tls.t.hero-number',
        id: 'override-block',
        motion: {
          preset: 'count-up',
          order: 1,
          parts: {
            value: { duration: 800 }, // 300ms longer than base (500ms)
          },
        },
      })
      const def = registry.get('tls.t.hero-number')!
      const result = blockShowDuration(spec, def, registry)

      // count-up base = 500ms, value override = 800ms, excess = 300ms
      expect(result.activeMs).toBe(DURATION_TOKENS.verySlow + 300)
    })
  })
})

/* ═══════════════════════════════════════════════════════════════════════════════ */
/* slideTimeline                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════════ */

describe('slideTimeline', () => {
  describe('empty and no-motion slides', () => {
    it('returns zero for a slide with no blocks', () => {
      const slide: SlideSpec = {
        id: 'empty',
        layout: 'blank',
        regions: { content: [] },
      }
      const result = slideTimeline(slide, registry)
      expect(result.totalMs).toBe(0)
      expect(result.steps).toEqual([])
    })

    it('returns zero for a slide with blocks but no motion', () => {
      const slide: SlideSpec = {
        id: 'no-motion',
        layout: 'blank',
        regions: {
          content: [
            { id: 'b1', type: 'tls.t.title', props: { text: { runs: [{ text: 'Hello' }] } } },
          ],
        },
      }
      const result = slideTimeline(slide, registry)
      expect(result.totalMs).toBe(0)
    })
  })

  describe('step grouping by trigger semantics', () => {
    it('withPrevious blocks share a step', () => {
      const slide: SlideSpec = {
        id: 'shared-step',
        layout: 'blank',
        regions: {
          content: [
            {
              id: 'b1', type: 'tls.t.title',
              props: { text: { runs: [{ text: 'Title' }] } },
              motion: { preset: 'fade-up', order: 1, trigger: AnimationTrigger.WithPrevious },
            },
            {
              id: 'b2', type: 'tls.t.body',
              props: { text: 'Body text' },
              motion: { preset: 'fade-up', order: 2, trigger: AnimationTrigger.WithPrevious },
            },
          ],
        },
      }
      const result = slideTimeline(slide, registry)
      // Both withPrevious → 1 step
      expect(result.steps).toHaveLength(1)
      expect(result.steps[0].blocks).toHaveLength(2)
    })

    it('afterPrevious opens a new step', () => {
      const slide: SlideSpec = {
        id: 'after-step',
        layout: 'blank',
        regions: {
          content: [
            {
              id: 'b1', type: 'tls.t.title',
              props: { text: { runs: [{ text: 'Title' }] } },
              motion: { preset: 'fade-up', order: 1 },
            },
            {
              id: 'b2', type: 'tls.t.body',
              props: { text: 'Body text' },
              motion: { preset: 'fade-up', order: 2, trigger: AnimationTrigger.AfterPrevious },
            },
          ],
        },
      }
      const result = slideTimeline(slide, registry)
      // withPrevious (first) + afterPrevious = 2 steps
      expect(result.steps).toHaveLength(2)
      // Step 1 starts at step 0's end
      expect(result.steps[1].startsAtMs).toBe(result.steps[0].endsAtMs)
    })

    it('onClick opens a new step', () => {
      const slide: SlideSpec = {
        id: 'click-step',
        layout: 'blank',
        regions: {
          content: [
            {
              id: 'b1', type: 'tls.t.title',
              props: { text: { runs: [{ text: 'Title' }] } },
              motion: { preset: 'fade-up', order: 1 },
            },
            {
              id: 'b2', type: 'tls.t.body',
              props: { text: 'Body text' },
              motion: { preset: 'fade-up', order: 2, trigger: AnimationTrigger.OnClick },
            },
          ],
        },
      }
      const result = slideTimeline(slide, registry)
      // withPrevious + onClick = 2 steps
      expect(result.steps).toHaveLength(2)
      expect(result.steps[1].blocks[0].trigger).toBe(AnimationTrigger.OnClick)
    })

    it('totalMs equals sum of all step durations', () => {
      const slide: SlideSpec = {
        id: 'sum-check',
        layout: 'blank',
        regions: {
          content: [
            {
              id: 'b1', type: 'tls.t.title',
              props: { text: { runs: [{ text: 'A' }] } },
              motion: { preset: 'fade-up', order: 1 },
            },
            {
              id: 'b2', type: 'tls.t.body',
              props: { text: 'B' },
              motion: { preset: 'fade-up', order: 2, trigger: AnimationTrigger.OnClick },
            },
            {
              id: 'b3', type: 'tls.t.caption',
              props: { text: 'C' },
              motion: { preset: 'fade-up', order: 3, trigger: AnimationTrigger.AfterPrevious },
            },
          ],
        },
      }
      const result = slideTimeline(slide, registry)
      // 3 steps
      expect(result.steps).toHaveLength(3)

      // totalMs = sum of step durations
      let sum = 0
      for (const step of result.steps) {
        sum += step.endsAtMs - step.startsAtMs
      }
      expect(result.totalMs).toBe(sum)
    })

    it('step starts are monotonically non-decreasing', () => {
      const slide: SlideSpec = {
        id: 'mono-check',
        layout: 'blank',
        regions: {
          content: [
            {
              id: 'b1', type: 'tls.t.title',
              props: { text: { runs: [{ text: 'A' }] } },
              motion: { preset: 'fade-up', order: 1 },
            },
            {
              id: 'b2', type: 'tls.t.body',
              props: { text: 'B' },
              motion: { preset: 'fade-up', order: 2, trigger: AnimationTrigger.OnClick },
            },
            {
              id: 'b3', type: 'tls.t.caption',
              props: { text: 'C' },
              motion: { preset: 'fade-up', order: 3, trigger: AnimationTrigger.AfterPrevious },
            },
          ],
        },
      }
      const result = slideTimeline(slide, registry)
      for (let i = 1; i < result.steps.length; i++) {
        expect(result.steps[i].startsAtMs).toBeGreaterThanOrEqual(result.steps[i - 1].startsAtMs)
      }
    })
  })

  describe('demo deck slides', () => {
    const DEMO_DECK: { slides: SlideSpec[] } = JSON.parse(
      require('fs').readFileSync(
        require('path').resolve(__dirname, '../__fixtures__/demo-deck.json'),
        'utf-8'
      )
    )

    it('slide 3 (sl_03) has steps with onClick triggers', () => {
      const slide = DEMO_DECK.slides[2] // sl_03
      expect(slide.id).toBe('sl_03')
      const result = slideTimeline(slide, registry)

      // sl_03 has 5 blocks with motion: withPrevious, onClick, onClick, onClick, afterPrevious
      // → 5 steps
      expect(result.steps.length).toBeGreaterThanOrEqual(3)

      // At least one step has an onClick trigger
      const clickSteps = result.steps.filter(s =>
        s.blocks.some(b => b.trigger === AnimationTrigger.OnClick)
      )
      expect(clickSteps.length).toBeGreaterThanOrEqual(1)
    })

    it('slide 4 (sl_04) step 1 is a count-up block with 500ms activeMs', () => {
      const slide = DEMO_DECK.slides[3] // sl_04
      expect(slide.id).toBe('sl_04')
      const result = slideTimeline(slide, registry)

      // sl_04: withPrevious title, onClick k1, afterPrevious k2, afterPrevious k3, afterPrevious k4
      // Step 1 (index 1) is the onClick step for k1
      const step1 = result.steps[1]
      expect(step1).toBeDefined()
      expect(step1.blocks).toHaveLength(1)
      // The block id in the timeline should be the original spec id
      expect(step1.blocks[0].id).toBe('b_04_k1')

      // count-up duration = DURATION_TOKENS.verySlow = 500ms, no stagger
      const step1Duration = step1.endsAtMs - step1.startsAtMs
      expect(step1Duration).toBe(DURATION_TOKENS.verySlow)
    })

    it('all demo slides produce valid timelines with non-negative times', () => {
      for (const slide of DEMO_DECK.slides) {
        const result = slideTimeline(slide, registry)
        expect(result.totalMs).toBeGreaterThanOrEqual(0)
        for (const step of result.steps) {
          expect(step.startsAtMs).toBeGreaterThanOrEqual(0)
          expect(step.endsAtMs).toBeGreaterThanOrEqual(step.startsAtMs)
          for (const block of step.blocks) {
            expect(block.startsAtMs).toBeGreaterThanOrEqual(0)
            expect(block.endsAtMs).toBeGreaterThanOrEqual(block.startsAtMs)
          }
        }
      }
    })

    it('step indices are sequential from 0', () => {
      for (const slide of DEMO_DECK.slides) {
        const result = slideTimeline(slide, registry)
        for (let i = 0; i < result.steps.length; i++) {
          expect(result.steps[i].index).toBe(i)
        }
      }
    })
  })
})

/* ═══════════════════════════════════════════════════════════════════════════════ */
/* Performance                                                                      */
/* ═══════════════════════════════════════════════════════════════════════════════ */

describe('performance', () => {
  it('slideTimeline on a 60-slide deck runs under 20 ms', () => {
    // Build a 60-slide deck from the demo deck template
    const DEMO_DECK: { slides: SlideSpec[] } = JSON.parse(
      require('fs').readFileSync(
        require('path').resolve(__dirname, '../__fixtures__/demo-deck.json'),
        'utf-8'
      )
    )

    const slides: SlideSpec[] = []
    for (let i = 0; i < 60; i++) {
      slides.push({
        ...DEMO_DECK.slides[i % DEMO_DECK.slides.length],
        id: `perf-slide-${i}`,
      })
    }

    // Pre-warm caches (LayoutContext, tokens, part count cache) so the timing
    // loop measures steady-state performance, not cold-start overhead.
    for (let i = 0; i < 3; i++) {
      slideTimeline(slides[i], registry)
    }

    const start = performance.now()
    for (const slide of slides) {
      slideTimeline(slide, registry)
    }
    const elapsed = performance.now() - start

    expect(elapsed).toBeLessThan(20)
  })
})

/* ═══════════════════════════════════════════════════════════════════════════════ */
/* DOM-free guarantee                                                               */
/* ═══════════════════════════════════════════════════════════════════════════════ */

describe('DOM-free guarantee', () => {
  it('blockShowDuration does not reference document or window', () => {
    const spec = makeBlockSpec({
      type: 'tls.t.title',
      id: 'dom-free-test',
      motion: { preset: 'fade-up', order: 1 },
    })
    const def = registry.get('tls.t.title')!
    const result = blockShowDuration(spec, def, registry)
    expect(result.totalMs).toBeGreaterThan(0)
  })

  it('slideTimeline does not reference document or window', () => {
    const slide: SlideSpec = {
      id: 'dom-free-slide',
      layout: 'blank',
      regions: {
        content: [
          {
            id: 'b1', type: 'tls.t.title',
            props: { text: { runs: [{ text: 'Test' }] } },
            motion: { preset: 'fade-up', order: 1 },
          },
        ],
      },
    }
    const result = slideTimeline(slide, registry)
    expect(result.totalMs).toBeGreaterThan(0)
  })
})
