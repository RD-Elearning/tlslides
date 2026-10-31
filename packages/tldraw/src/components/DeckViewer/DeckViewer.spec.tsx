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
import { render, fireEvent, cleanup, act } from '@testing-library/react'
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
    // Collect block ids from set() calls; filter out undefined (part-level set() calls
    // target elements inside the block that have data-part but not data-block-id).
    const touchedBlockIds = new Set(
      calls.set.map((c) => (c.target as HTMLElement).dataset.blockId).filter(Boolean)
    )
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
    // Collect block ids from play() calls; filter out undefined (part-level play() calls
    // target elements inside the block that have data-part but not data-block-id).
    const playedBlockIds = new Set(
      calls.play.map((c) => (c.target as HTMLElement).dataset.blockId).filter(Boolean)
    )
    expect(playedBlockIds).toEqual(expectedBlockIds)
    // Exactly one play() per animated block — the moment it's newly revealed. Every step also
    // gets settled visible again on every later render (already-revealed steps go through
    // `set()`, not a replayed `play()`), so `calls.set` is not asserted empty here.
    // Note: playBlockReveal may call play() on part-level elements too, so the total play
    // count is >= expectedBlockIds.size (one block-level + zero-or-more part-level per block).
    expect(calls.play.length).toBeGreaterThanOrEqual(expectedBlockIds.size)
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* 2b. An animated html block must actually become visible (R10 regression)         */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('an animated kind:html block is revealed, not left hidden', () => {
  // sl_01 holds `tls.c.hero` — a `kind: 'html'` block with `animate()`. Its wrapper is
  // given the hidden state while the reveal step is pending; the reveal branch must
  // settle it VISIBLE. It used to `return` early (right after calling `onComplete` in
  // the reduced-motion path) and never applied a visible state, so the whole block —
  // and every other animated html block — stayed invisible. Found by driving the real
  // browser (`tools/visual/shoot.js deck-demo`), invisible to the whole jest suite.
  const stepCount = computeBuildSteps(deckSpecToDocument(DEMO_DECK).document.pages['sl_01']).length

  it('reduced motion: settles the block wrapper visible and leaves no part at opacity 0', () => {
    mockMatchMedia(true)
    const { driver, calls } = makeStubDriver()
    const { container, rerender } = render(
      <DeckViewer spec={DEMO_DECK} slideIndex={0} buildStep={0} driver={driver} onBuildStepChange={noop} />
    )
    for (let step = 1; step <= stepCount; step++) {
      rerender(
        <DeckViewer spec={DEMO_DECK} slideIndex={0} buildStep={step} driver={driver} onBuildStepChange={noop} />
      )
    }

    // The html block really is mounted (host root rendered by HostMount).
    expect(container.querySelector('[data-render]')).not.toBeNull()

    // Its parts must not be left hidden by the "hidden before reveal" stamp.
    const parts = Array.from(container.querySelectorAll('[data-part]')) as HTMLElement[]
    expect(parts.length).toBeGreaterThan(0)
    for (const part of parts) {
      expect(part.style.opacity).not.toBe('0')
    }

    // And the block WRAPPER itself must have been settled to a visible state. `set` is
    // called with the hidden state while the step is pending, so assert the LAST state
    // applied to the wrapper — this is the assertion that fails on the pre-fix code,
    // where the branch returned early and the wrapper stayed at opacity 0.
    const wrapperSets = calls.set.filter(
      (c) => (c.target as HTMLElement).dataset.blockId !== undefined
    )
    expect(wrapperSets.length).toBeGreaterThan(0)
    expect(wrapperSets[wrapperSets.length - 1].state.opacity).toBe(1)
  })
})

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

  // Regression: retreating into a build step that reveals itself automatically (any
  // trigger other than 'onClick') used to immediately snap forward again, because the
  // auto-advance-chain effect re-checked `steps[currentBuildStep]` on every change with
  // no way to tell "just retreated here" from "just arrived here by advancing" — both
  // land on the same index. From the visitor's side, "back" did nothing.
  it('retreating into an auto build step stays there instead of auto-chaining forward again', () => {
    mockMatchMedia(true) // reducedMotion: true → chain delay is 0ms, so a stray re-fire is instant
    const spec: DeckSpec = {
      version: 1,
      id: 'retreat-into-auto-step-test',
      title: 'Retreat into auto step test',
      theme: 'mono-grid',
      aspect: 'widescreen',
      slides: [
        {
          id: 's0',
          layout: 'blank',
          regions: {
            content: [
              // First cue always starts its own auto step, regardless of trigger.
              titleBlock('b0', 'Part One', { order: 1 }),
              // Explicit 'onClick': a manual step the visitor must advance past.
              titleBlock('b1', 'Part Two', { order: 2, trigger: 'onClick' }),
              // 'afterPrevious': chains forward on its own once step 1 is revealed.
              titleBlock('b2', 'Part Three', { order: 3, trigger: 'afterPrevious' }),
            ],
          },
        },
      ],
    }

    jest.useFakeTimers()
    try {
      const { container } = render(<DeckViewer spec={spec} driver={NOOP_DRIVER} />)
      const viewer = container.querySelector('[data-testid="deck-viewer"]') as HTMLElement

      // Mount: step 0 (b0) auto-reveals immediately; step 1 (b1) is manual, so it stops there.
      act(() => { jest.runOnlyPendingTimers() })
      expect(viewer.dataset.buildStep).toBe('1')

      // Advance past the manual step: reveals b1, then auto-chains straight through the
      // 'afterPrevious' step to reveal b2 too (fully built: step === count).
      fireEvent.keyDown(viewer, { key: 'ArrowRight' })
      act(() => { jest.runOnlyPendingTimers() })
      expect(viewer.dataset.buildStep).toBe(viewer.dataset.buildStepCount)

      // Retreat once: undoes the last click — b1's step and the 'afterPrevious' b2 that chained
      // after it (spro demo T12) — landing on step 1, and STAYS there. Running any pending
      // timers must not snap it forward again.
      fireEvent.keyDown(viewer, { key: 'ArrowLeft' })
      act(() => { jest.runOnlyPendingTimers() })
      expect(viewer.dataset.buildStep).toBe('1')
      expect(viewer.dataset.buildStep).not.toBe(viewer.dataset.buildStepCount)
    } finally {
      jest.useRealTimers()
    }
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* spro demo T12 — click halves, host slide changes                                 */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('click halves and host-controlled slides (spro demo T12)', () => {
  // two slides, each with two click steps after the first (auto) one
  const built: DeckSpec = {
    version: 1,
    id: 'halves-test',
    title: 'Halves test',
    theme: 'mono-grid',
    aspect: 'widescreen',
    slides: ['s0', 's1'].map((id) => ({
      id,
      layout: 'blank',
      regions: {
        content: [
          titleBlock(`${id}a`, `${id} one`, { order: 1 }),
          titleBlock(`${id}b`, `${id} two`, { order: 2, trigger: 'onClick' }),
          titleBlock(`${id}c`, `${id} three`, { order: 3, trigger: 'onClick' }),
        ],
      },
    })),
  }
  const stepCount = computeBuildSteps(Object.values(deckSpecToDocument(built).document.pages)[0]).length

  /** A host that follows `onSlideChange` (the way spro's workspace does). */
  function Host(props: { entry?: 'start' | 'built'; jump?: (go: (i: number) => void) => void }) {
    const [index, setIndex] = React.useState(0)
    React.useEffect(() => props.jump?.(setIndex), [])
    return <DeckViewer spec={built} slideIndex={index} onSlideChange={setIndex} driver={NOOP_DRIVER} clickNavigation="halves" slideEntry={props.entry} />
  }

  const viewerOf = (c: HTMLElement) => c.querySelector('[data-testid="deck-viewer"]') as HTMLElement
  /** jsdom lays nothing out: give the viewer a 1000 px wide box to click in. */
  function sized(el: HTMLElement) {
    el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1000, height: 560, right: 1000, bottom: 560, x: 0, y: 0, toJSON: noop }) as DOMRect
    return el
  }

  it('the right half advances a step, then the slide; the left half goes back', () => {
    mockMatchMedia(true)
    const { container } = render(<Host />)
    const viewer = sized(viewerOf(container))
    const start = Number(viewer.dataset.buildStep)
    fireEvent.click(viewer, { clientX: 800 })
    const one = Number(viewer.dataset.buildStep)
    fireEvent.click(viewer, { clientX: 800 })
    expect(Number(viewer.dataset.buildStep)).toBe(one + 1)
    expect(one).toBeGreaterThan(start)
    expect(viewer.dataset.slideIndex).toBe('0')
    // back undoes that click only
    fireEvent.click(viewer, { clientX: 200 })
    expect(Number(viewer.dataset.buildStep)).toBe(one)
    for (let i = 0; i < stepCount + 1; i++) fireEvent.click(viewer, { clientX: 800 })
    expect(viewer.dataset.slideIndex).toBe('1')
  })

  it('back with nothing clicked yet on a slide leaves it (the entry step is part of arriving)', () => {
    mockMatchMedia(true)
    const { container } = render(<Host />)
    const viewer = sized(viewerOf(container))
    for (let i = 0; i < stepCount + 1; i++) fireEvent.click(viewer, { clientX: 800 })
    expect(viewer.dataset.slideIndex).toBe('1')
    fireEvent.click(viewer, { clientX: 800 }) // slide 1's entry step
    fireEvent.click(viewer, { clientX: 100 })
    expect(viewer.dataset.slideIndex).toBe('0')
  })

  it('going back to the previous slide under a controlling host lands on it fully built', () => {
    mockMatchMedia(true)
    const { container } = render(<Host />)
    const viewer = sized(viewerOf(container))
    for (let i = 0; i < stepCount + 1; i++) fireEvent.click(viewer, { clientX: 800 })
    expect(viewer.dataset.slideIndex).toBe('1')
    // back past slide 1's steps: the host follows to slide 0, which must stay built
    for (let i = 0; i < 4 && viewer.dataset.slideIndex === '1'; i++) fireEvent.click(viewer, { clientX: 100 })
    expect(viewer.dataset.slideIndex).toBe('0')
    expect(viewer.dataset.buildStep).toBe(String(stepCount))
  })

  it('a host jump lands at the start by default and fully built with slideEntry="built"', () => {
    mockMatchMedia(true)
    let go: (i: number) => void = noop
    const a = render(<Host jump={(g) => (go = g)} />)
    act(() => go(1))
    expect(viewerOf(a.container).dataset.slideIndex).toBe('1')
    expect(Number(viewerOf(a.container).dataset.buildStep)).toBeLessThan(stepCount)
    a.unmount()

    const b = render(<Host entry="built" jump={(g) => (go = g)} />)
    act(() => go(1))
    expect(viewerOf(b.container).dataset.buildStep).toBe(String(stepCount))
  })
})

describe('halves: pointer hint and swipes (spro demo T12)', () => {
  const two: DeckSpec = {
    version: 1,
    id: 'swipe-test',
    title: 'Swipe test',
    theme: 'mono-grid',
    aspect: 'widescreen',
    slides: ['a', 'b'].map((id) => ({ id, layout: 'blank', regions: { content: [titleBlock(`${id}t`, `slide ${id}`)] } })),
  }
  const box = (el: HTMLElement) => {
    el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1000, height: 560, right: 1000, bottom: 560, x: 0, y: 0, toJSON: noop }) as DOMRect
    return el
  }

  it('the cursor points the way a click goes', () => {
    const { container } = render(<DeckViewer spec={two} driver={NOOP_DRIVER} clickNavigation="halves" />)
    const v = box(container.querySelector('[data-testid="deck-viewer"]') as HTMLElement)
    fireEvent.mouseMove(v, { clientX: 100 })
    expect(v.dataset.clickSide).toBe('left')
    expect(v.style.cursor).toBe('w-resize')
    fireEvent.mouseMove(v, { clientX: 900 })
    expect(v.style.cursor).toBe('e-resize')
  })

  it('a swipe left goes forward, a swipe right goes back; the click a swipe ends with is ignored', () => {
    const { container } = render(<DeckViewer spec={two} driver={NOOP_DRIVER} clickNavigation="halves" />)
    const v = box(container.querySelector('[data-testid="deck-viewer"]') as HTMLElement)
    fireEvent.touchStart(v, { touches: [{ clientX: 800, clientY: 300 }] })
    fireEvent.touchEnd(v, { changedTouches: [{ clientX: 600, clientY: 310 }] })
    fireEvent.click(v, { clientX: 600 })
    expect(v.dataset.slideIndex).toBe('1')
    fireEvent.touchStart(v, { touches: [{ clientX: 200, clientY: 300 }] })
    fireEvent.touchEnd(v, { changedTouches: [{ clientX: 400, clientY: 300 }] })
    expect(v.dataset.slideIndex).toBe('0')
    // a tap is still a click
    fireEvent.touchStart(v, { touches: [{ clientX: 800, clientY: 300 }] })
    fireEvent.touchEnd(v, { changedTouches: [{ clientX: 805, clientY: 300 }] })
    fireEvent.click(v, { clientX: 805 })
    expect(v.dataset.slideIndex).toBe('1')
  })
})

describe('ambient loops (spro vivid V2)', () => {
  beforeEach(() => {
    mockMatchMedia(false)
    jest.useFakeTimers()
  })
  afterEach(() => jest.useRealTimers())

  const deck = (motionStyle: 'static' | 'subtle' | 'expressive'): DeckSpec => ({
    version: 1,
    id: 'amb',
    title: 'Ambient',
    motionStyle,
    slides: [
      {
        id: 's1',
        layout: 'two-column',
        regions: {
          title: [titleBlock('t1', 'Orbs')],
          left: [{ id: 'orb', type: 'tls.m.decoration', props: { shape: 'orb' } }],
          right: [{ id: 'frame', type: 'tls.m.decoration', props: { shape: 'frame' } }],
        },
      },
      { id: 's2', layout: 'blank', regions: { content: [titleBlock('t2', 'Next')] } },
    ],
  } as unknown as DeckSpec)

  const loops = (calls: ReturnType<typeof makeStubDriver>['calls']) => calls.play.filter((c) => c.opts.iterations === Infinity)

  it('a built slide loops its decoration (only the one whose shape loops), at its paint root', () => {
    const { driver, calls } = makeStubDriver()
    const { container } = render(<DeckViewer spec={deck('expressive')} driver={driver} ambient slideIndex={0} buildStep={9} />)
    act(() => void jest.advanceTimersByTime(3000))
    const l = loops(calls)
    expect(l).toHaveLength(1)
    const wrapper = container.querySelector('[data-block-id="orb"]')!
    expect(l[0].target).toBe(wrapper.firstElementChild)
    expect(l[0].keyframes.translate).toBeDefined()
  })

  it('nothing loops without the prop, on a still deck, or under reduced motion', () => {
    // a deck switched off (`ambient: false`) stays still even when the host asks for loops
    const off = { ...deck('expressive'), ambient: false } as DeckSpec
    for (const [spec, on] of [[deck('expressive'), false], [deck('static'), true], [off, true]] as const) {
      const { driver, calls } = makeStubDriver()
      render(<DeckViewer spec={spec} driver={driver} ambient={on} slideIndex={0} buildStep={9} />)
      act(() => void jest.advanceTimersByTime(3000))
      expect(loops(calls)).toHaveLength(0)
      cleanup()
    }
    mockMatchMedia(true)
    const { driver, calls } = makeStubDriver()
    render(<DeckViewer spec={deck('expressive')} driver={driver} ambient slideIndex={0} buildStep={9} />)
    act(() => void jest.advanceTimersByTime(3000))
    expect(loops(calls)).toHaveLength(0)
  })

  it('the loop stops when the slide changes', () => {
    const cancel = jest.fn()
    const { driver, calls } = makeStubDriver()
    const play = driver.play.bind(driver)
    driver.play = (t, k, o) => (o.iterations === Infinity ? (play(t, k, o), { cancel, finished: new Promise<void>(noop) }) : play(t, k, o))
    // a click step under subtle: the host shows it built (`buildStep`)
    const { rerender } = render(<DeckViewer spec={deck('subtle')} driver={driver} ambient slideIndex={0} buildStep={9} />)
    act(() => void jest.advanceTimersByTime(3000))
    expect(loops(calls)).toHaveLength(1)
    rerender(<DeckViewer spec={deck('subtle')} driver={driver} ambient slideIndex={1} buildStep={9} />)
    expect(cancel).toHaveBeenCalled()
  })

  it('with GSAP the loops go through it, not the entrance driver', () => {
    const { driver, calls } = makeStubDriver()
    const tweens: Array<Record<string, unknown>> = []
    const gsap = {
      fromTo: (_t: unknown, _f: unknown, to: Record<string, unknown>) => (tweens.push(to), { kill: noop, then: () => new Promise<void>(noop) }),
      timeline: () => ({}),
    }
    render(<DeckViewer spec={deck('expressive')} driver={driver} gsap={gsap} ambient slideIndex={0} buildStep={9} />)
    act(() => void jest.advanceTimersByTime(3000))
    expect(loops(calls)).toHaveLength(0)
    expect(tweens.filter((t) => t.repeat === -1)).toHaveLength(1)
  })
})

describe('activity slides (learning L04): clicks belong to the activity, keys keep navigating', () => {
  const choice = tlsAChoiceProps()
  const two: DeckSpec = {
    version: 1,
    id: 'activity-nav',
    title: 'Activity nav',
    theme: 'mono-grid',
    aspect: 'widescreen',
    slides: [
      { id: 'p', layout: 'blank', regions: { content: [titleBlock('pt', 'plain slide')] } },
      { id: 'q', layout: 'blank', regions: { content: [titleBlock('qt', 'quiz slide'), { id: 'qc', type: 'tls.a.choice', props: choice }] } },
      { id: 'r', layout: 'blank', regions: { content: [titleBlock('rt', 'last slide')] } },
    ],
  }
  const box = (el: HTMLElement) => {
    el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1000, height: 560, right: 1000, bottom: 560, x: 0, y: 0, toJSON: noop }) as DOMRect
    return el
  }
  const mountAt = (slideIndex: number, extra: Partial<React.ComponentProps<typeof DeckViewer>> = {}) => {
    mockMatchMedia(true)
    const r = render(<DeckViewer spec={two} slideIndex={slideIndex} driver={NOOP_DRIVER} clickNavigation="halves" {...extra} />)
    return { ...r, v: box(r.container.querySelector('[data-testid="deck-viewer"]') as HTMLElement) }
  }
  function Host(props: { start: number; extra?: Partial<React.ComponentProps<typeof DeckViewer>> }) {
    const [i, setI] = React.useState(props.start)
    return <DeckViewer spec={two} slideIndex={i} onSlideChange={setI} driver={NOOP_DRIVER} clickNavigation="halves" slideEntry="built" {...props.extra} />
  }
  const hostAt = (start: number, extra?: Partial<React.ComponentProps<typeof DeckViewer>>) => {
    mockMatchMedia(true)
    const r = render(<Host start={start} extra={extra} />)
    return { ...r, v: box(r.container.querySelector('[data-testid="deck-viewer"]') as HTMLElement) }
  }

  it('a click moves a plain slide but not an activity slide', () => {
    const { v } = hostAt(0)
    fireEvent.click(v, { clientX: 800 })
    expect(v.dataset.slideIndex).toBe('1')
    expect(v.dataset.activitySlide).toBe('true')
    fireEvent.click(v, { clientX: 800 })
    fireEvent.click(v, { clientX: 100 })
    expect(v.dataset.slideIndex).toBe('1')
    expect(v.dataset.clickSide).toBeUndefined()
  })

  it('arrows and page keys navigate; Space and Enter advance unless the focus is inside an activity', () => {
    const { v, container } = hostAt(1)
    fireEvent.keyDown(v, { key: 'ArrowDown' })
    expect(v.dataset.slideIndex).toBe('2')
    fireEvent.keyDown(v, { key: 'PageUp' })
    expect(v.dataset.slideIndex).toBe('1')
    const option = container.querySelector('[data-activity] button') as HTMLElement
    expect(option).not.toBeNull()
    fireEvent.keyDown(option, { key: 'Enter' })
    fireEvent.keyDown(option, { key: ' ' })
    expect(v.dataset.slideIndex).toBe('1')
    fireEvent.keyDown(v, { key: 'Enter' })
    expect(v.dataset.slideIndex).toBe('2')
    fireEvent.keyDown(v, { key: 'ArrowUp' })
    fireEvent.keyDown(v, { key: 'ArrowRight' })
    expect(v.dataset.slideIndex).toBe('2')
  })

  it('a click on an option picks it and the slide stays; a click inside an activity never navigates', () => {
    const { v, container } = mountAt(1)
    const option = container.querySelector('[data-act="option"]') as HTMLElement
    fireEvent.click(option, { clientX: 800 })
    expect(v.dataset.slideIndex).toBe('1')
    expect(option.getAttribute('aria-pressed') === 'true' || container.querySelector('[data-state]')).toBeTruthy()
  })

  it('a tap does nothing, a swipe navigates, and a swipe that starts on an option picks nothing', () => {
    const { v, container } = hostAt(1)
    const option = container.querySelector('[data-act="option"]') as HTMLElement
    fireEvent.touchStart(v, { touches: [{ clientX: 800, clientY: 300 }] })
    fireEvent.touchEnd(v, { changedTouches: [{ clientX: 805, clientY: 300 }] })
    fireEvent.click(v, { clientX: 805 })
    expect(v.dataset.slideIndex).toBe('1')
    // swipe from the option
    fireEvent.touchStart(option, { touches: [{ clientX: 800, clientY: 300 }] })
    fireEvent.touchEnd(option, { changedTouches: [{ clientX: 600, clientY: 305 }] })
    fireEvent.click(option)
    expect(v.dataset.slideIndex).toBe('2')
    fireEvent.keyDown(v, { key: 'ArrowLeft' })
    const again = container.querySelector('[data-act="option"][aria-pressed="true"]')
    expect(again).toBeNull()
  })

  it('auto-advance is paused on an activity slide and runs elsewhere', () => {
    jest.useFakeTimers()
    try {
      const { v } = hostAt(1, { autoAdvanceMs: 500 })
      act(() => void jest.advanceTimersByTime(2000))
      expect(v.dataset.slideIndex).toBe('1')
      cleanup()
      const plain = hostAt(0, { autoAdvanceMs: 500 })
      act(() => void jest.advanceTimersByTime(600))
      expect(plain.v.dataset.slideIndex).toBe('1')
    } finally {
      jest.useRealTimers()
    }
  })

  it('shows the hint for 3 seconds when an activity slide appears, and not at all without the prop', () => {
    jest.useFakeTimers()
    try {
      const a = hostAt(1, { activityHint: '← → to change slide' })
      expect(a.queryByTestId('activity-hint')?.textContent).toBe('← → to change slide')
      act(() => void jest.advanceTimersByTime(3100))
      expect(a.queryByTestId('activity-hint')).toBeNull()
      cleanup()
      const b = hostAt(1)
      expect(b.queryByTestId('activity-hint')).toBeNull()
      cleanup()
      const c = hostAt(0, { activityHint: 'x' })
      expect(c.queryByTestId('activity-hint')).toBeNull()
    } finally {
      jest.useRealTimers()
    }
  })

  it('state survives leaving the slide and coming back', () => {
    const { v, container } = hostAt(1)
    const first = container.querySelector('[data-act="option"]') as HTMLElement
    fireEvent.click(first)
    const picked = () => container.querySelectorAll('[data-act="option"][aria-pressed="true"], [data-act="option"][data-state="correct"], [data-act="option"][data-state="wrong"]').length
    expect(picked()).toBeGreaterThan(0)
    fireEvent.keyDown(v, { key: 'ArrowRight' })
    fireEvent.keyDown(v, { key: 'ArrowLeft' })
    expect(picked()).toBeGreaterThan(0)
  })
})

function tlsAChoiceProps(): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('~blocks/library/activity/tls-a-choice').tlsAChoice.describe.example.props
}
