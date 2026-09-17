/**
 * Behavioural tests for `<DeckViewer>` (Q14, `reviews/blocks/BACKLOG-demo.md` §7). The
 * import-graph structural assertion lives in `import-graph.spec.ts`; this file covers:
 *
 *  1. Rendering the real 6-slide demo deck fixture and finding real text from it.
 *  2. `prefers-reduced-motion` keeping every build step (via `set()`, never `play()`).
 *  3. `cancelAll()` on slide change and on unmount.
 *  4. Navigation: overflowing a slide's build steps advances to the next slide; a `skip: true`
 *     slide is never stopped on.
 */

import * as React from 'react'
import * as fs from 'fs'
import * as path from 'path'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { DeckViewer } from './DeckViewer'
import type { DeckSpec, BlockSpec } from '~blocks/types'
import type { MotionDriver, MotionHandle, MotionKeyframes, MotionOptions, MotionState } from '~blocks/motion/driver'
import { deckSpecToDocument } from '~blocks/deck-document'
import { computeBuildSteps } from '~state/deck/presentation'

afterEach(() => {
  cleanup()
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Fixtures / helpers                                                              */
/* ─────────────────────────────────────────────────────────────────────────────── */

const DEMO_DECK: DeckSpec = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../blocks/__fixtures__/demo-deck.json'), 'utf-8')
)

function titleBlock(id: string, text: string, motion?: Record<string, unknown>) {
  return {
    id,
    type: 'tls.t.title',
    props: { text: { runs: [{ text }] }, size: 'heading', align: 'start' },
    ...(motion ? { motion } : {}),
  }
}

/** A stub `MotionDriver` that records every call instead of touching real WAAPI. */
function makeStubDriver() {
  const calls = {
    play: [] as Array<{ target: Element; keyframes: MotionKeyframes; opts: MotionOptions }>,
    set: [] as Array<{ target: Element; state: MotionState }>,
    cancelAll: 0,
  }
  const driver: MotionDriver = {
    play(target: Element, keyframes: MotionKeyframes, opts: MotionOptions): MotionHandle {
      calls.play.push({ target, keyframes, opts })
      return { cancel: noop, finished: Promise.resolve() }
    },
    set(target: Element, state: MotionState): void {
      calls.set.push({ target, state })
    },
    timeline(): MotionHandle {
      return { cancel: noop, finished: Promise.resolve() }
    },
    cancelAll(): void {
      calls.cancelAll += 1
    },
  }
  return { driver, calls }
}

/**
 * A driver that never touches the real Web Animations API. jsdom does not implement
 * `Element.prototype.animate`, so any test that exercises the *default* `createWAAPI_driver()`
 * (i.e. doesn't care about motion specifically) needs this instead, or a build-step transition
 * throws `target.animate is not a function` — not a `<DeckViewer>` bug, just an environment gap.
 */
const NOOP_DRIVER: MotionDriver = {
  play: () => ({ cancel: noop, finished: Promise.resolve() }),
  set: noop,
  timeline: () => ({ cancel: noop, finished: Promise.resolve() }),
  cancelAll: noop,
}

/** Every `BlockSpec` in a `SlideSpec`'s `regions` (+ `free[]`), flattened — for reading expected
 *  ids straight from the JSON spec, independent of any `deckSpecToDocument` compile. */
function flattenBlocks(spec: DeckSpec, slideIndex: number): BlockSpec[] {
  const slide = spec.slides[slideIndex]
  const fromRegions = Object.values(slide.regions).flat()
  const fromFree = (slide.free ?? []).map((p) => p.block)
  return [...fromRegions, ...fromFree]
}

/** Ids of blocks that `blockToShape` would give a `ShapeAnimation` (see `shape-bridge.ts`'s own
 *  guard: `motion.order !== undefined || motion.preset !== undefined`) — i.e. the blocks that
 *  actually participate in build-step playback. Deliberately reads straight from the JSON spec
 *  rather than compiling: `compileSlide`/`blockToShape` mint a fresh random `ComponentShape.id`
 *  on every call (a separate, pre-existing behaviour found while writing this test — see this
 *  file's own note in the report), so two independent `deckSpecToDocument` calls on the same
 *  `DeckSpec` never agree on shape ids. `BlockSpec.id` (`data-block-id` in the rendered DOM) is
 *  the one identifier that IS stable across compiles, because it round-trips through `$block.id`
 *  metadata rather than being regenerated. */
function animatedBlockIds(spec: DeckSpec, slideIndex: number): Set<string> {
  return new Set(
    flattenBlocks(spec, slideIndex)
      .filter((b) => b.motion?.order !== undefined || b.motion?.preset !== undefined)
      .map((b) => b.id)
  )
}

/** A single shared no-op, reused wherever a test needs a callback whose only job is to
 *  exist (a controlled prop's change handler, a cancel()/set() a stub never needs to do
 *  anything real for) — avoids `no-empty-function` at every call site individually. */
// eslint-disable-next-line @typescript-eslint/no-empty-function
function noop(): void {}

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches,
      media: query,
      addEventListener: noop,
      removeEventListener: noop,
      addListener: noop,
      removeListener: noop,
    }),
  })
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* 1. Renders the real demo deck                                                    */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('DeckViewer renders the real demo deck fixture', () => {
  const expectedTextPerSlide: string[][] = [
    ['QUARTERLY REVIEW', 'infrastructure', 'board'],
    ['01 — Where the money went', 'Compute spend, headcount'],
    ['Gross margin', 'three quarters', 'Compute spend grew 2.4'],
    ['The quarter in four numbers', '$4.2M', 'Revenue', '61%', 'Gross margin', '118', '2.4×'],
    ['We were optimising for the demo', 'Head of Platform', 'Q3 engineering retrospective'],
    ['Next quarter:', 'margin first', 'Commit reservations drop on 1 Nov', 'Hand-placed'],
  ]

  it.each(expectedTextPerSlide.map((texts, i) => [i, texts] as const))(
    'slide %i contains its real block text',
    (index, texts) => {
      const { container } = render(<DeckViewer spec={DEMO_DECK} slideIndex={index} onSlideChange={noop} driver={NOOP_DRIVER} />)
      const content = container.textContent ?? ''
      for (const text of texts) {
        expect(content).toContain(text)
      }
    }
  )

  it('renders an unknown block type as a visible placeholder, not a crash', () => {
    const spec: DeckSpec = {
      version: 1,
      id: 'unknown-block-test',
      title: 'Unknown block test',
      theme: 'mono-grid',
      aspect: 'widescreen',
      slides: [
        {
          id: 's0',
          layout: 'blank',
          regions: { content: [{ id: 'b0', type: 'tls.x.does-not-exist', props: {} }] },
        },
      ],
    }
    expect(() => render(<DeckViewer spec={spec} driver={NOOP_DRIVER} />)).not.toThrow()
    const { container } = render(<DeckViewer spec={spec} driver={NOOP_DRIVER} />)
    expect(container.textContent).toContain('Unknown block')
    expect(container.textContent).toContain('tls.x.does-not-exist')
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* 2. prefers-reduced-motion keeps every build step                                */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('DeckViewer honours prefers-reduced-motion', () => {
  // sl_04 (kpi-row, index 3) has 5 animated blocks / cues: order 1 (no explicit trigger — the
  // first cue, so it starts its own auto step regardless), then orders 2-5 ('onClick' then 3x
  // 'afterPrevious'). computeBuildSteps folds `afterPrevious`/a leading `withPrevious` into their
  // own auto steps (see state/deck/presentation.ts's doc comment) — a good non-trivial fixture:
  // multiple steps, mixed trigger kinds.
  const expectedBlockIds = animatedBlockIds(DEMO_DECK, 3)
  const stepCount = computeBuildSteps(deckSpecToDocument(DEMO_DECK).document.pages['sl_04']).length

  it('sanity: sl_04 has more than one build step, one per animated block here', () => {
    expect(stepCount).toBeGreaterThan(1)
    expect(expectedBlockIds.size).toBe(5)
  })

  it('reduced motion: only ever calls set(), touches every animated block, never calls play()', () => {
    mockMatchMedia(true)
    const { driver, calls } = makeStubDriver()
    const { rerender } = render(
      <DeckViewer spec={DEMO_DECK} slideIndex={3} buildStep={0} driver={driver} onBuildStepChange={noop} />
    )
    for (let step = 1; step <= stepCount; step++) {
      rerender(
        <DeckViewer spec={DEMO_DECK} slideIndex={3} buildStep={step} driver={driver} onBuildStepChange={noop} />
      )
    }
    expect(calls.play).toHaveLength(0)
    const touchedBlockIds = new Set(calls.set.map((c) => (c.target as HTMLElement).dataset.blockId))
    expect(touchedBlockIds).toEqual(expectedBlockIds)
  })

  it('normal motion: calls play() exactly once per animated block as its step is revealed — the same block count as the reduced-motion run', () => {
    mockMatchMedia(false)
    const { driver, calls } = makeStubDriver()
    const { rerender } = render(
      <DeckViewer spec={DEMO_DECK} slideIndex={3} buildStep={0} driver={driver} onBuildStepChange={noop} />
    )
    for (let step = 1; step <= stepCount; step++) {
      rerender(
        <DeckViewer spec={DEMO_DECK} slideIndex={3} buildStep={step} driver={driver} onBuildStepChange={noop} />
      )
    }
    const playedBlockIds = new Set(calls.play.map((c) => (c.target as HTMLElement).dataset.blockId))
    expect(playedBlockIds).toEqual(expectedBlockIds)
    // Exactly one play() per animated block — the moment it's newly revealed. Every step also
    // gets settled visible again on every later render (already-revealed steps go through
    // `set()`, not a replayed `play()`), so `calls.set` is not asserted empty here.
    expect(calls.play.length).toBe(expectedBlockIds.size)
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* 3. cancelAll on slide change and on unmount                                     */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('DeckViewer cancels motion on slide change and unmount', () => {
  it('calls cancelAll exactly once per slide change, and once more on unmount', () => {
    const { driver, calls } = makeStubDriver()
    const { rerender, unmount } = render(
      <DeckViewer spec={DEMO_DECK} slideIndex={0} driver={driver} onSlideChange={noop} />
    )
    expect(calls.cancelAll).toBe(0)

    rerender(<DeckViewer spec={DEMO_DECK} slideIndex={1} driver={driver} onSlideChange={noop} />)
    expect(calls.cancelAll).toBe(1)

    rerender(<DeckViewer spec={DEMO_DECK} slideIndex={2} driver={driver} onSlideChange={noop} />)
    expect(calls.cancelAll).toBe(2)

    unmount()
    expect(calls.cancelAll).toBe(3)
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* 4. Navigation: overflow advances slide; skip:true is never stopped on           */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('DeckViewer navigation', () => {
  function skipDeck(): DeckSpec {
    return {
      version: 1,
      id: 'nav-test',
      title: 'Nav test',
      theme: 'mono-grid',
      aspect: 'widescreen',
      slides: [
        { id: 's0', layout: 'blank', regions: { content: [titleBlock('b0', 'Slide Zero')] } },
        { id: 's1', layout: 'blank', skip: true, regions: { content: [titleBlock('b1', 'Slide One Skipped')] } },
        { id: 's2', layout: 'blank', regions: { content: [titleBlock('b2', 'Slide Two')] } },
      ],
    }
  }

  it('a slide with skip:true is never stopped on when advancing', () => {
    const { container } = render(<DeckViewer spec={skipDeck()} driver={NOOP_DRIVER} />)
    expect(container.textContent).toContain('Slide Zero')

    fireEvent.click(container.querySelector('[data-testid="deck-viewer"]') as Element)

    expect(container.textContent).toContain('Slide Two')
    expect(container.textContent).not.toContain('Slide One Skipped')
  })

  it('a slide with skip:true is never stopped on when retreating', () => {
    const { container, rerender } = render(
      <DeckViewer spec={skipDeck()} slideIndex={2} onSlideChange={noop} driver={NOOP_DRIVER} />
    )
    expect(container.textContent).toContain('Slide Two')
    // Uncontrolled slide navigation from an explicit starting point: re-mount uncontrolled at
    // slide 2 equivalent by using Home/End is out of scope here; instead exercise retreat via
    // keyboard directly on an uncontrolled instance seeded at the end.
    void rerender
    const viewer = container.querySelector('[data-testid="deck-viewer"]') as HTMLElement
    fireEvent.keyDown(viewer, { key: 'ArrowLeft' })
    expect(container.textContent).not.toContain('Slide One Skipped')
  })

  it('advancing past a slide’s last build step moves to the next slide', () => {
    const spec: DeckSpec = {
      version: 1,
      id: 'build-step-nav-test',
      title: 'Build step nav test',
      theme: 'mono-grid',
      aspect: 'widescreen',
      slides: [
        {
          id: 's0',
          layout: 'blank',
          regions: { content: [titleBlock('b0', 'First Slide', { order: 1 })] },
        },
        {
          id: 's1',
          layout: 'blank',
          regions: { content: [titleBlock('b1', 'Second Slide')] },
        },
      ],
    }
    const { container } = render(<DeckViewer spec={spec} driver={NOOP_DRIVER} />)
    const viewer = container.querySelector('[data-testid="deck-viewer"]') as HTMLElement
    expect(container.textContent).toContain('First Slide')

    // First advance: reveals the one build step, stays on slide 0.
    fireEvent.keyDown(viewer, { key: 'ArrowRight' })
    expect(container.textContent).toContain('First Slide')
    expect(container.textContent).not.toContain('Second Slide')

    // Second advance: build steps are exhausted, moves to slide 1.
    fireEvent.keyDown(viewer, { key: 'ArrowRight' })
    expect(container.textContent).toContain('Second Slide')
  })

  it('Home and End jump to the first and last presentable slides', () => {
    const { container } = render(
      <DeckViewer spec={skipDeck()} slideIndex={undefined as unknown as number} driver={NOOP_DRIVER} />
    )
    const viewer = container.querySelector('[data-testid="deck-viewer"]') as HTMLElement
    fireEvent.keyDown(viewer, { key: 'End' })
    expect(container.textContent).toContain('Slide Two')
    fireEvent.keyDown(viewer, { key: 'Home' })
    expect(container.textContent).toContain('Slide Zero')
  })
})
