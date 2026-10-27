import * as React from 'react'
import type { TDDocument, TDPage, ComponentShape } from '~types'
import { TDShapeType } from '~types'
// Deliberately importing each of these from its own leaf module rather than the `~blocks`
// barrel (`~blocks/index.ts`). The barrel also re-exports `parity-harness.ts`, which imports
// Node's `child_process` (it forks a worker for the SVG parity harness) — fine for Jest/CJS,
// but fatal for a browser bundle: `esbuild --bundle --platform=browser` on `~blocks` fails with
// "Could not resolve child_process". Importing the specific leaf files this component actually
// uses avoids pulling that (and anything else barrel-adjacent) into a real DeckViewer bundle.
// Verified with the same walker `import-graph.spec.ts` uses: none of these leaf modules reach
// `parity-harness.ts`, `state/TldrawApp`, `state/sessions/`, or `mobx`.
import type { DeckSpec, Box, BlockMotionRuntime } from '~blocks/types'
import type { MotionDriver } from '~blocks/motion/driver'
import type { BlockDefinition } from '~blocks/types'
import type { LayoutContext } from '~blocks/types'
import { deckSpecToDocument } from '~blocks/deck-document'
import { deckLayoutContext, contextForBlock } from '~blocks/deck-context'
import { ambientStyleOf, revealStyleOf, shapeToBlock, shapeToRevealBlock } from '~blocks/shape-bridge'
import { renderNodeToDom, paintToCSS, HostLayoutContext } from '~blocks/render-dom'
import { BlockRegistry } from '~blocks/registry'
import { HostRegistry } from '~blocks/host-registry'
import { layoutBlock } from '~blocks/layout/layout-child'
import { treatTree } from '~blocks/paint-treatment'
import { blockTreatment } from '~blocks/look'
import { HostRegistryContext } from '~hooks/useHostRegistry'
import { BlockRegistryContext } from '~hooks/useBlockRegistry'
import { registerBuiltInBlocks } from '~blocks/library'
import { createWAAPI_driver } from '~blocks/motion/waapi-driver'
import { createGsapDriver, type GsapInstance } from '~blocks/motion/gsap-driver'
import { blockAmbients, startAmbient } from '~blocks/motion/ambient'
import { computeBuildSteps, stepChainDelayMs } from '~state/deck/presentation'
import type { BuildStep } from '~state/deck/presentation'
import { autoRunEnd, entranceKeyframes, hiddenState, visibleState } from './motion-helpers'
import { playBlockReveal, settleBlockParts } from '~blocks/motion/play-reveal'
import { transitionPlan } from '~blocks/motion/transition'
import { hidePartsForAnimate, revealUntouchedParts } from '~blocks/motion/animate-guard'

/**
 * `<DeckViewer>` — Q14's real, animated, read-only deck viewer (`reviews/blocks/BACKLOG-demo.md`
 * §7). Unlike `<DeckEmbed>` (`./DeckEmbed.tsx`, the Phase-14 component this replaces under its old
 * name), this component mounts **no editor at all**: no `TldrawApp`, no MobX, no canvas, no
 * session system — verified structurally by `import-graph.spec.ts`, which walks this file's real
 * module graph rather than trusting a comment.
 *
 * The render path is exactly the one the editor uses, minus the editor: `deckSpecToDocument`
 * compiles the same `DeckSpec` → `TDDocument` a `<Tldraw document={...}>` would load (via
 * `compileSlide`/`blockToShape`, the same functions `Deck.addSlideFromSpec` calls), so a shape
 * here is byte-for-byte the same `ComponentShape` the editor would show. Per shape:
 * `shapeToBlock` → `registry.get(type).layout(props, deckLayoutContext(...))` → `renderNodeToDom`
 * — the same three calls `ComponentUtil`'s `Component` makes (see its own comment on
 * `useBlockLayoutContext`), just without a mounted shape/store behind them.
 *
 * Build-step playback reuses `computeBuildSteps`/`stepChainDelayMs` from
 * `state/deck/presentation.ts` unchanged — that module is pure and TDPage-only by design (its own
 * doc comment says so) specifically so this component and `PresentationRuntime` can share it
 * without either depending on the other. Motion plays through the `MotionDriver` contract
 * (`opacity`/`translate`/`scale`/`clip-path` only, never `transform`), defaulting to
 * `createWAAPI_driver()`.
 */
export interface DeckViewerProps {
  /** The deck to render. Recompiled (via `deckSpecToDocument`) whenever this reference changes. */
  spec: DeckSpec
  /** Controlled current slide index (0-based, into `spec.slides` order). Uncontrolled when
   *  absent — the viewer then owns its own slide position, reporting changes via
   *  `onSlideChange`. */
  slideIndex?: number
  /** Controlled build-step count already revealed on the current slide (0 = only
   *  non-animated/base content). Uncontrolled when absent. */
  buildStep?: number
  /** Fired whenever navigation would change the slide — always fired, controlled or not, so a
   *  controlled host can decide whether to follow it. */
  onSlideChange?: (index: number) => void
  /** Fired whenever navigation would change the build step. */
  onBuildStepChange?: (step: number) => void
  /** Motion driver. Defaults to `createWAAPI_driver()`. Inject a stub in tests. */
  driver?: MotionDriver
  /** Host-injected GSAP instance (R3). When provided, passed through to `BlockMotionRuntime.gsap`
   *  so that html blocks with `animate()` can use GSAP directly. No `import gsap` anywhere
   *  in the bundle — the adapter is structurally typed. */
  gsap?: unknown
  /** V2 (spro vivid PLAN.md §4) — play the blocks' ambient loops (a decoration that floats, a
   *  ring that turns) once each block has entered; they stop when the slide changes. Through GSAP
   *  when `gsap` is given, else through `driver`. Off under reduced motion and on still slides.
   *  Default `false`: a host opts in (thumbnails and before/after previews stay still). A deck
   *  whose `spec.ambient` is `false` stays still whatever the host says. */
  ambient?: boolean
  /** When set, once a slide's build finishes, auto-advance to the next presentable slide after
   *  this many ms. Absent = fully manual/click/keyboard navigation only. */
  autoAdvanceMs?: number
  /** What a click on the slide does: `advance` (default) always moves forward; `halves` moves back
   *  on the left half and forward on the right half (a build step, then the next slide). */
  clickNavigation?: 'advance' | 'halves'
  /** Where a slide change made by the HOST (a new `slideIndex` prop, step uncontrolled) lands:
   *  `start` (default) = before the first build step; `built` = every step shown, like a
   *  thumbnail jump in a presentation app. The viewer's own navigation is unaffected (back
   *  lands built, forward at the start). */
  slideEntry?: 'start' | 'built'
  /** Optional block registry override. When absent, the module-level `sharedRegistry` is used. */
  registry?: BlockRegistry
  /** Optional host registry for `k: 'host'` layout nodes. */
  hostRegistry?: HostRegistry
  className?: string
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Shared block registry — built once per module load, never per instance          */
/* ─────────────────────────────────────────────────────────────────────────────── */

const sharedRegistry = new BlockRegistry()
registerBuiltInBlocks(sharedRegistry)

/** A touch that moves at least this far sideways (and mostly sideways) is a swipe, not a tap. */
const SWIPE_MIN_PX = 40

/** A layout effect in the browser (runs before paint), a plain effect during SSR. */
const useIsoLayoutEffect = typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Pure helpers                                                                     */
/* ─────────────────────────────────────────────────────────────────────────────── */

function clampIndex(i: number, length: number): number {
  if (length === 0) return 0
  return Math.min(Math.max(i, 0), length - 1)
}

/** `TDPage`s in `spec.slides` order — `deckSpecToDocument` assigns `childIndex = index + 1`, so
 *  sorting by it reproduces the original slide order exactly (pages are keyed by slide id, not
 *  by array position). */
function orderedPages(document: TDDocument): TDPage[] {
  return Object.values(document.pages).sort((a, b) => (a.childIndex || 0) - (b.childIndex || 0))
}

function isPresentable(page: TDPage | undefined): boolean {
  return !!page && !page.skipInPresentation
}

function firstPresentableIndex(pages: TDPage[]): number {
  for (let i = 0; i < pages.length; i++) if (isPresentable(pages[i])) return i
  return 0
}

function lastPresentableIndex(pages: TDPage[]): number {
  for (let i = pages.length - 1; i >= 0; i--) if (isPresentable(pages[i])) return i
  return Math.max(0, pages.length - 1)
}

function nextPresentableIndex(pages: TDPage[], from: number): number | undefined {
  for (let i = from + 1; i < pages.length; i++) if (isPresentable(pages[i])) return i
  return undefined
}

function prevPresentableIndex(pages: TDPage[], from: number): number | undefined {
  for (let i = from - 1; i >= 0; i--) if (isPresentable(pages[i])) return i
  return undefined
}

/** SSR-safe `prefers-reduced-motion` — reads `window` only inside the initial-state thunk (run
 *  during render, but guarded) and inside effects, never at module scope. Mirrors
 *  `PresentationRuntime.tsx`'s `usePrefersReducedMotion` (same query, same fallback). */
function usePrefersReducedMotion(): boolean {
  const query = '(prefers-reduced-motion: reduce)'
  const [reduced, setReduced] = React.useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia(query).matches === true
  )
  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia(query)
    const onChange = () => setReduced(mql.matches)
    if (mql.addEventListener) mql.addEventListener('change', onChange)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- older matchMedia API
    else if ((mql as any).addListener) (mql as any).addListener(onChange)
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', onChange)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- older matchMedia API
      else if ((mql as any).removeListener) (mql as any).removeListener(onChange)
    }
  }, [])
  return reduced
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Placeholders — a bad or unknown block must never take the whole viewer down     */
/* ─────────────────────────────────────────────────────────────────────────────── */

const PLACEHOLDER_STYLE: React.CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
  border: '2px dashed #a1a1aa',
  borderRadius: 4,
  color: '#71717a',
  fontFamily: 'sans-serif',
  fontSize: 12,
  textAlign: 'center',
  padding: 8,
  boxSizing: 'border-box',
}

function UnknownBlockPlaceholder({ type }: { type: string }) {
  return (
    <div style={PLACEHOLDER_STYLE} data-testid="unknown-block">
      <div style={{ fontWeight: 600 }}>Unknown block</div>
      <div style={{ fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all' }}>
        {type || '(no type)'}
      </div>
    </div>
  )
}

/**
 * Renders one block's `layout()` output. Deliberately its own component (not an inline
 * expression in `DeckViewer`'s JSX): `blockDef.layout()` can throw, and only an error thrown
 * during a *descendant's* render is visible to an ancestor error boundary — evaluating it
 * directly in `DeckViewer`'s own render function would crash the whole viewer instead of just
 * this one block.
 */
function BlockContent({
  blockDef,
  props,
  ctx,
  paintKey = '',
  meta,
}: {
  blockDef: BlockDefinition
  props: Record<string, unknown>
  ctx: LayoutContext
  /** enhance S2: seeds the style's render treatment (`${type}|${id}`, as the editor and export). */
  paintKey?: string
  /** CR7b: the shape's `$block` metadata (its look and its page's merged look). */
  meta?: unknown
}) {
  return <React.Fragment>{renderNodeToDom(treatTree(layoutBlock(blockDef, props, ctx), blockTreatment(ctx.tokens.surface?.render, meta), paintKey))}</React.Fragment>
}

interface BlockBoundaryState {
  error: Error | null
  key: string
}

/** Scoped to a single block. A block that throws degrades to a visible "crashed" placeholder
 *  rather than taking the rest of the slide (or deck) down with it — rule 7. */
class BlockBoundary extends React.Component<
  { blockType: string; children: React.ReactNode },
  BlockBoundaryState
> {
  state: BlockBoundaryState = { error: null, key: this.props.blockType }

  static getDerivedStateFromError(error: Error): Partial<BlockBoundaryState> {
    return { error }
  }

  static getDerivedStateFromProps(
    props: { blockType: string },
    state: BlockBoundaryState
  ): Partial<BlockBoundaryState> | null {
    if (state.error && props.blockType !== state.key) return { error: null, key: props.blockType }
    return { key: props.blockType }
  }

  componentDidCatch(error: Error): void {
    // eslint-disable-next-line no-console
    console.error(`[DeckViewer block "${this.props.blockType}"] threw while rendering:`, error)
  }

  render(): React.ReactNode {
    if (this.state.error) {
      return (
        <div
          style={{ ...PLACEHOLDER_STYLE, border: '2px solid #ef4444', color: '#b91c1c' }}
          data-testid="crashed-block"
        >
          <div>Block crashed</div>
          <div style={{ fontFamily: 'monospace', fontSize: 11 }}>{this.props.blockType}</div>
        </div>
      )
    }
    return this.props.children
  }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* DeckViewer                                                                       */
/* ─────────────────────────────────────────────────────────────────────────────── */

export const DeckViewer: React.FC<DeckViewerProps> = ({
  spec,
  slideIndex,
  buildStep,
  onSlideChange,
  onBuildStepChange,
  driver,
  gsap,
  ambient = false,
  autoAdvanceMs,
  clickNavigation = 'advance',
  slideEntry = 'start',
  registry: registryProp,
  hostRegistry,
  className,
}) => {
  const { document } = React.useMemo(() => deckSpecToDocument(spec), [spec])
  const pages = React.useMemo(() => orderedPages(document), [document])

  // Use the provided registry, or fall back to the module-level sharedRegistry
  const blockRegistry = registryProp ?? sharedRegistry

  const isSlideControlled = slideIndex !== undefined
  const [innerSlideIndex, setInnerSlideIndex] = React.useState(0)
  const currentSlideIndex = clampIndex(isSlideControlled ? (slideIndex as number) : innerSlideIndex, pages.length)

  const isStepControlled = buildStep !== undefined
  const [innerBuildStep, setInnerBuildStep] = React.useState(0)
  const currentBuildStep = isStepControlled ? (buildStep as number) : innerBuildStep

  const page = pages[currentSlideIndex]
  const steps = React.useMemo<BuildStep[]>(() => (page ? computeBuildSteps(page) : []), [page])

  const reducedMotion = usePrefersReducedMotion()
  const motionDriver = React.useMemo<MotionDriver>(() => driver ?? createWAAPI_driver(), [driver])

  const elementsRef = React.useRef<Map<string, HTMLDivElement>>(new Map())

  /* --- CR10: the slide transition, played on the frame when the slide changes ---------- */
  const frameRef = React.useRef<HTMLDivElement | null>(null)
  const shownPageRef = React.useRef<string | undefined>(undefined)
  React.useEffect(() => {
    const el = frameRef.current
    const id = page?.id
    const first = shownPageRef.current === undefined
    if (id === shownPageRef.current) return
    shownPageRef.current = id
    if (first || !el || typeof el.animate !== 'function') return
    const plan = transitionPlan(page?.transition, document.motionPersonality, reducedMotion)
    if (!plan) return
    const anim = el.animate(plan.keyframes, { duration: plan.durationMs, easing: plan.easing })
    return () => anim.cancel()
  }, [page, document.motionPersonality, reducedMotion])

  /* --- R3: animate() disposers and onComplete promises ------------------------------ */

  /**
   * Disposer functions returned by `animate()`, keyed by shape id. Called on every cancel
   * path (backward navigation, slide change, unmount) to kill GSAP timelines that the
   * driver's `cancelAll()` knows nothing about.
   */
  const animateDisposersRef = React.useRef<Map<string, () => void>>(new Map())

  /**
   * Map of shape id → resolve function for the `onComplete` promise. The viewer awaits
   * these for build-step chaining (`afterPrevious` / auto-advance).
   */
  const animateCompletersRef = React.useRef<Map<string, () => void>>(new Map())

  /**
   * Timeout handles for blocks that never call `onComplete`. Keyed by shapeId
   * so each shape's onComplete only clears its own timeout, not every pending one.
   */
  const animateTimeoutsRef = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  /** Kill all animate()-started timelines and clear tracking state. */
  const cancelAllAnimate = React.useCallback(() => {
    for (const disposer of animateDisposersRef.current.values()) {
      disposer()
    }
    animateDisposersRef.current.clear()
    for (const timeout of animateTimeoutsRef.current.values()) {
      clearTimeout(timeout)
    }
    animateTimeoutsRef.current.clear()
    // Note: we do NOT clear animateCompletersRef — the promises are already stored
    // in the build-step chain and will resolve when the disposer runs or timeout fires.
  }, [])

  /* --- Navigation state transitions --------------------------------------------------- */

  // The slide index the viewer itself last asked a controlling host for: when the host follows
  // with that index, the step this viewer set (a retreat lands on the previous slide fully built)
  // must stand — before, the host-change reset below wiped it back to 0 (spro demo T12).
  const selfRequestedSlideRef = React.useRef<number | undefined>(undefined)

  const setSlide = React.useCallback(
    (index: number, step: number) => {
      selfRequestedSlideRef.current = index
      if (isSlideControlled) onSlideChange?.(index)
      else setInnerSlideIndex(index)
      if (isStepControlled) onBuildStepChange?.(step)
      else setInnerBuildStep(step)
    },
    [isSlideControlled, isStepControlled, onSlideChange, onBuildStepChange]
  )

  const setStep = React.useCallback(
    (step: number) => {
      if (isStepControlled) onBuildStepChange?.(step)
      else setInnerBuildStep(step)
    },
    [isStepControlled, onBuildStepChange]
  )

  // Which way the last navigation moved. The auto-advance chain effect below re-checks
  // `steps[currentBuildStep]` every time `currentBuildStep` changes, so it can't otherwise
  // tell "we just revealed the previous step, chain forward" from "the visitor pressed
  // back into a step that happens to be `auto`" — both land on the same index. Only the
  // forward case should re-fire the chain; retreating into an auto step must stick there,
  // or "back" instantly snaps forward again and looks like it does nothing. Defaults to
  // 'forward' so the existing reveal-on-mount behavior for an auto first step is unchanged.
  const navDirectionRef = React.useRef<'forward' | 'backward'>('forward')

  const advance = React.useCallback(() => {
    navDirectionRef.current = 'forward'
    if (currentBuildStep < steps.length) {
      setStep(currentBuildStep + 1)
      return
    }
    const next = nextPresentableIndex(pages, currentSlideIndex)
    if (next !== undefined) setSlide(next, 0)
  }, [currentBuildStep, steps.length, pages, currentSlideIndex, setStep, setSlide])

  const retreat = React.useCallback(() => {
    navDirectionRef.current = 'backward'
    // Back undoes the last CLICK, as in a presentation app: the latest revealed step that waited
    // for one, with the auto steps that chained after it. Steps that revealed themselves on entry
    // (step 0 is always auto) are part of arriving, so with nothing clicked yet back leaves the
    // slide. Stepping back one auto step at a time looked like "back does nothing" on a deck
    // whose builds all chain (spro demo T12).
    let group = Math.min(currentBuildStep, steps.length) - 1
    while (group > 0 && steps[group].auto) group--
    if (group > 0) {
      setStep(group)
      return
    }
    const prev = prevPresentableIndex(pages, currentSlideIndex)
    if (prev !== undefined) {
      const prevPage = pages[prev]
      const prevSteps = prevPage ? computeBuildSteps(prevPage) : []
      setSlide(prev, prevSteps.length)
    }
  }, [currentBuildStep, steps, pages, currentSlideIndex, setStep, setSlide])

  const goHome = React.useCallback(() => {
    navDirectionRef.current = 'forward'
    setSlide(firstPresentableIndex(pages), 0)
  }, [pages, setSlide])

  const goEnd = React.useCallback(() => {
    navDirectionRef.current = 'forward'
    const last = lastPresentableIndex(pages)
    const lastPage = pages[last]
    const lastSteps = lastPage ? computeBuildSteps(lastPage) : []
    setSlide(last, lastSteps.length)
  }, [pages, setSlide])

  // When `slideIndex` is host-controlled but `buildStep` is not, an external slide change must
  // still reset the viewer's own build progress — every other transition (advance/retreat/
  // goHome/goEnd) already sets both pieces of state together via `setSlide`, so this only needs
  // to cover the "host changed the prop directly" path.
  const prevControlledSlideRef = React.useRef(slideIndex)
  React.useEffect(() => {
    if (isSlideControlled && !isStepControlled && prevControlledSlideRef.current !== slideIndex) {
      if (selfRequestedSlideRef.current !== slideIndex) {
        const target = pages[clampIndex(slideIndex as number, pages.length)]
        setInnerBuildStep(slideEntry === 'built' && target ? computeBuildSteps(target).length : 0)
      }
    }
    selfRequestedSlideRef.current = undefined
    prevControlledSlideRef.current = slideIndex
  }, [slideIndex, isSlideControlled, isStepControlled, slideEntry, pages])

  /* --- Build-step visual sync ---------------------------------------------------------- */

  const prevBuildRef = React.useRef<{ pageId: string; revealed: number }>({
    pageId: page?.id ?? '',
    revealed: -1,
  })

  // A layout effect, not a plain one (M1/S8): the hidden state of every un-revealed block must
  // be in place before the browser paints a new slide, or the first frame shows each block in
  // its final state and the next one hides it again (a one-frame flash on every first slide).
  useIsoLayoutEffect(() => {
    if (!page) return
    const prev = prevBuildRef.current
    const pageChanged = prev.pageId !== page.id
    if (pageChanged) {
      motionDriver.cancelAll()
      cancelAllAnimate()
    }
    const prevRevealed = pageChanged ? -1 : prev.revealed
    // J7: under prefers-reduced-motion a run of auto steps is shown at once, like `static`,
    // instead of hiding each block for a frame until the (zero-delay) chain reaches it.
    const shownStep = reducedMotion ? autoRunEnd(steps, currentBuildStep) : currentBuildStep

    steps.forEach((step, index) => {
      const isRevealed = index < shownStep
      // isNewlyRevealed: first time appearing. reducedMotion is handled per-block below,
      // not folded into this flag, so that animate() blocks get their onComplete() call.
      const isNewlyRevealed = !pageChanged && index >= prevRevealed && isRevealed
      step.shapeIds.forEach((shapeId) => {
        const el = elementsRef.current.get(shapeId)
        if (!el) return

        // R3: check if this block has animate() and should be handled via the runtime
        const shape = page.shapes[shapeId]
        // P7: the reveal spec carries the style-derived motion when the block has none.
        const blockSpec = shape ? shapeToRevealBlock(shape) : undefined
        const blockDef = blockSpec ? blockRegistry.get(blockSpec.type) : undefined
        const hasAnimate = blockDef?.kind === 'html' && !!blockDef.html?.animate

        if (hasAnimate && isNewlyRevealed) {
          // Find the host root div inside the shape wrapper
          const hostRoot = el.querySelector('[data-render]') as HTMLElement | null
          if (!hostRoot) return

          const animation = shape?.animation
          const durationMs = animation?.durationMs ?? 400
          const delayMs = animation?.delayMs ?? 0

          // Create the onComplete promise — stored before calling animate so that a
          // synchronous onComplete still resolves correctly (promise is already created).
          let completeResolve!: () => void
          const completePromise = new Promise<void>((resolve) => {
            completeResolve = resolve
          })
          // Suppress unused variable — the promise is stored via the completer ref
          void completePromise

          // Store the completer for build-step chaining
          animateCompletersRef.current.set(shapeId, completeResolve)

          if (reducedMotion) {
            // Reduced motion: no animate(). Settle the BLOCK and its parts to their
            // final state. The wrapper can still carry the hidden state applied while
            // this step was un-revealed, and nothing else in this branch clears it —
            // returning early here is what left animated html blocks invisible.
            if (animation) motionDriver.set(el, visibleState(animation.effect))
            const parts = hostRoot.querySelectorAll<HTMLElement>('[data-part]')
            for (let i = 0; i < parts.length; i++) parts[i].style.opacity = ''
            completeResolve()
            animateCompletersRef.current.delete(shapeId)
            return
          }

          // R3 "hidden state before reveal", in the order that matters: hide the
          // parts, then make the BLOCK wrapper visible, then let animate() own the
          // reveal. The wrapper was hidden when this step was un-revealed and only
          // this branch clears it — without it the whole block stays invisible.
          // S26: what was hidden here is revealed on completion if animate() never touched it.
          const hiddenParts = hidePartsForAnimate(hostRoot)
          if (animation) motionDriver.set(el, visibleState(animation.effect))

          const rt: BlockMotionRuntime = {
            driver: motionDriver,
            gsap: gsap ?? undefined,
            timing: {
              delayMs,
              durationMs,
              staggerMs: 40, // default stagger from motion tokens
              ease: 'cubic-bezier(0.22, 1, 0.36, 1)', // smoothOut
            },
            reducedMotion: false,
            style: revealStyleOf(shape),
            onComplete: () => {
              // Idempotent resolve
              const resolve = animateCompletersRef.current.get(shapeId)
              if (resolve) {
                resolve()
                animateCompletersRef.current.delete(shapeId)
                revealUntouchedParts(hiddenParts, motionDriver)
              }
              // Clear only this shape's timeout, not every pending one
              const t = animateTimeoutsRef.current.get(shapeId)
              if (t) {
                clearTimeout(t)
                animateTimeoutsRef.current.delete(shapeId)
              }
            },
          }

          const disposer = blockDef!.html!.animate!(hostRoot, rt)
          if (disposer) {
            animateDisposersRef.current.set(shapeId, disposer)
          }

          // Timeout guard: if onComplete is not called within durationMs + 2000
          const timeout = setTimeout(() => {
            // eslint-disable-next-line no-console
            console.warn(
              `[block "${blockDef!.type}"] animate() did not call onComplete ` +
              `within ${durationMs + 2000}ms — continuing anyway`
            )
            rt.onComplete()
          }, durationMs + 2000)
          animateTimeoutsRef.current.set(shapeId, timeout)

        } else if (hasAnimate && !isRevealed) {
          // Block is hidden — cancel any running animate for this shape
          const disposer = animateDisposersRef.current.get(shapeId)
          if (disposer) {
            disposer()
            animateDisposersRef.current.delete(shapeId)
          }
          // Also resolve onComplete so build-step chaining isn't blocked
          const resolve = animateCompletersRef.current.get(shapeId)
          if (resolve) {
            resolve()
            animateCompletersRef.current.delete(shapeId)
          }

          // Apply hidden state to the shape wrapper (existing behavior)
          const animation = shape?.animation
          if (animation) {
            motionDriver.set(el, hiddenState(animation.effect))
          }

        } else if (!hasAnimate) {
          // Non-animated block — use playBlockReveal for part-level choreography (R5).
          const animation = shape?.animation
          if (!animation) return
          if (isRevealed) {
            if (isNewlyRevealed && !reducedMotion && blockSpec && blockDef) {
              // Full reveal: block-level + part-level choreography with stagger.
              playBlockReveal(el, blockSpec, blockDef, { driver: motionDriver, reducedMotion: false, personality: document.motionPersonality })
            } else {
              // Already revealed (or reduced motion): settle to visible.
              motionDriver.set(el, visibleState(animation.effect))
              // Also settle parts to their rest state (M6: clip and dash offset too, so a wipe,
              // draw or sweep cut short by a skip ends drawn, not half-way).
              if (blockSpec && blockDef) settleBlockParts(el, blockSpec, blockDef, motionDriver)
            }
          } else {
            motionDriver.set(el, hiddenState(animation.effect))
          }
        }
        // If hasAnimate && isRevealed && !isNewlyRevealed: already settled, do nothing
      })
    })

    prevBuildRef.current = { pageId: page.id, revealed: shownStep }
  }, [page, steps, currentBuildStep, reducedMotion, motionDriver, gsap])

  // Cancel every in-flight animation on unmount — an abandoned WAAPI animation holding
  // `will-change` on an unmounted subtree is a real leak (rule 5).
  React.useEffect(() => {
    return () => {
      motionDriver.cancelAll()
      cancelAllAnimate()
    }
  }, [motionDriver, cancelAllAnimate])

  /* --- V2: ambient loops ----------------------------------------------------------------- */

  const ambientDriver = React.useMemo<MotionDriver>(() => {
    const g = gsap as GsapInstance | undefined
    return g && typeof g.fromTo === 'function' && typeof g.timeline === 'function' ? createGsapDriver(g) : motionDriver
  }, [gsap, motionDriver])
  /** Running loops (and loops waiting for their block's entrance), keyed by shape id. */
  const ambientRef = React.useRef<Map<string, { stop?: () => void; timer?: ReturnType<typeof setTimeout> }>>(new Map())
  const ambientSeenRef = React.useRef<{ pageId: string; shown: number }>({ pageId: '', shown: -1 })
  const stopAmbient = React.useCallback((id?: string) => {
    for (const [key, loop] of ambientRef.current) {
      if (id !== undefined && key !== id) continue
      if (loop.timer) clearTimeout(loop.timer)
      loop.stop?.()
      ambientRef.current.delete(key)
    }
  }, [])

  const ambientOn = ambient && spec.ambient !== false
  React.useEffect(() => {
    if (!ambientOn || !page || reducedMotion) {
      stopAmbient()
      return
    }
    const seen = ambientSeenRef.current
    if (seen.pageId !== page.id) stopAmbient()
    const prevShown = seen.pageId === page.id ? seen.shown : -1
    const stepOf = new Map<string, number>()
    steps.forEach((step, i) => step.shapeIds.forEach((sid) => stepOf.set(sid, i)))
    for (const [sid, shape] of Object.entries(page.shapes)) {
      const k = stepOf.get(sid)
      const revealed = k === undefined || k < currentBuildStep
      if (!revealed) {
        stopAmbient(sid)
        continue
      }
      if (ambientRef.current.has(sid)) continue
      const style = ambientStyleOf(shape)
      if (!style) continue
      const spec = shapeToBlock(shape)
      const root = elementsRef.current.get(sid)?.firstElementChild
      // its own loop and its nested children's (a style master's motifs sit in a split)
      const loops = spec && root ? blockAmbients(root, spec, (t) => blockRegistry.get(t), style) : []
      if (!loops.length) continue
      // a block that has just entered loops once its entrance is over; one already shown at once
      const entering = k !== undefined && prevShown >= 0 && k >= prevShown
      const anim = (shape as ComponentShape).animation
      const wait = entering ? (anim?.delayMs ?? 0) + (anim?.durationMs ?? 400) + 500 : 250
      const loop: { stop?: () => void; timer?: ReturnType<typeof setTimeout> } = {}
      loop.timer = setTimeout(() => {
        loop.timer = undefined
        const stops = loops.map((l) => startAmbient(l.el, l.ambient, ambientDriver))
        loop.stop = () => stops.forEach((s) => s())
      }, wait)
      ambientRef.current.set(sid, loop)
    }
    ambientSeenRef.current = { pageId: page.id, shown: currentBuildStep }
  }, [ambientOn, page, steps, currentBuildStep, reducedMotion, blockRegistry, ambientDriver, stopAmbient])

  React.useEffect(() => () => stopAmbient(), [stopAmbient])

  /* --- Auto-advance chain (`afterPrevious`/a leading `withPrevious`) -------------------- */

  React.useEffect(() => {
    if (!page) return
    if (navDirectionRef.current === 'backward') return
    const nextIndex = currentBuildStep
    const nextStep = steps[nextIndex]
    if (!nextStep || !nextStep.auto) return
    const waitMs = reducedMotion ? 0 : stepChainDelayMs(page, steps, nextIndex)
    const handle = setTimeout(() => setStep(nextIndex + 1), waitMs)
    return () => clearTimeout(handle)
  }, [page, steps, currentBuildStep, reducedMotion, setStep])

  /* --- Optional whole-deck auto-advance -------------------------------------------------- */

  React.useEffect(() => {
    if (!autoAdvanceMs || !page) return
    if (currentBuildStep < steps.length) return
    const next = nextPresentableIndex(pages, currentSlideIndex)
    if (next === undefined) return
    const handle = setTimeout(() => setSlide(next, 0), autoAdvanceMs)
    return () => clearTimeout(handle)
  }, [autoAdvanceMs, page, steps.length, currentBuildStep, pages, currentSlideIndex, setSlide])

  /* --- Keyboard / click navigation -------------------------------------------------------- */

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
        case 'Enter':
          e.preventDefault()
          advance()
          break
        case 'ArrowLeft':
        case 'Backspace':
          e.preventDefault()
          retreat()
          break
        case 'Home':
          e.preventDefault()
          goHome()
          break
        case 'End':
          e.preventDefault()
          goEnd()
          break
        default:
          break
      }
    },
    [advance, retreat, goHome, goEnd]
  )

  // `halves`: the pointer says which way a click goes (‹ on the left half, › on the right); a
  // horizontal swipe on a touch screen goes the same way, and the click it ends with is ignored
  const [side, setSide] = React.useState<'left' | 'right'>('right')
  const swipeRef = React.useRef<{ x: number; y: number; swiped: boolean } | null>(null)
  const handleMouseMove = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (clickNavigation !== 'halves') return
      const rect = e.currentTarget.getBoundingClientRect()
      setSide(e.clientX - rect.left < rect.width / 2 ? 'left' : 'right')
    },
    [clickNavigation]
  )
  const handleTouchStart = React.useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const t = e.touches[0]
    swipeRef.current = t ? { x: t.clientX, y: t.clientY, swiped: false } : null
  }, [])
  const handleTouchEnd = React.useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      const start = swipeRef.current
      const t = e.changedTouches[0]
      if (!start || !t || clickNavigation !== 'halves') return
      const dx = t.clientX - start.x
      const dy = t.clientY - start.y
      if (Math.abs(dx) >= SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy) * 1.5) {
        start.swiped = true
        if (dx < 0) advance()
        else retreat()
      }
    },
    [advance, retreat, clickNavigation]
  )

  const handleClick = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (swipeRef.current?.swiped) {
        swipeRef.current = null
        return
      }
      if (clickNavigation === 'halves') {
        const rect = e.currentTarget.getBoundingClientRect()
        if (e.clientX - rect.left < rect.width / 2) {
          retreat()
          return
        }
      }
      advance()
    },
    [advance, retreat, clickNavigation]
  )

  /* --- Viewport scale-to-fit -------------------------------------------------------------- */

  const containerRef = React.useRef<HTMLDivElement>(null)
  const [viewportSize, setViewportSize] = React.useState<{ width: number; height: number } | null>(null)

  React.useEffect(() => {
    const el = containerRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const { width, height } = entry.contentRect
      setViewportSize({ width, height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  /**
   * Take focus on mount so the arrow keys work straight away.
   *
   * Keyboard navigation is an `onKeyDown` on this container plus `tabIndex={0}`, which means it
   * only fires once the container is the focused element. Without this, a viewer filling the
   * whole page looked broken: nothing happened on Right/End until the visitor happened to click
   * the slide first, which nobody does when the page is already showing what they asked for.
   *
   * `preventScroll` keeps a host page from jumping to the viewer when it is embedded partway down
   * a longer document. Focus is only taken if nothing else already has it — stealing focus from a
   * host's own input would be worse than the problem being fixed.
   */
  React.useEffect(() => {
    const el = containerRef.current
    // `window.document`, not `document`: this component has a local `document` binding of its own
    // (the compiled `TDDocument`), which shadows the global and made `document.activeElement` a
    // type error rather than a DOM lookup.
    if (!el || typeof window === 'undefined') return
    const active = window.document.activeElement
    if (active && active !== window.document.body && active !== el) return
    el.focus({ preventScroll: true })
  }, [])

  const [frameWidth, frameHeight] = document.defaultPageSize ?? [1920, 1080]
  // A single, STATIC CSS transform on the slide container — never touched by the motion driver,
  // and not itself animated — purely to fit the fixed 1920×1080 slide frame into whatever box
  // the host gives this component. See this file's own doc comment / BACKLOG-demo.md Q14: this
  // is the one sanctioned use of `transform` here.
  const scale = viewportSize
    ? Math.min(viewportSize.width / frameWidth, viewportSize.height / frameHeight) || 1
    : 1

  const slideCtx = React.useMemo(() => {
    if (!page) return undefined
    return deckLayoutContext(
      document,
      { x: 0, y: 0, width: frameWidth, height: frameHeight },
      { headless: false, slideBackground: page.background }
    )
  }, [document, page, frameWidth, frameHeight])

  const backgroundStyle: React.CSSProperties = slideCtx ? paintToCSS(slideCtx.surface.behind) : {}

  // `compileSlide` only ever produces `ComponentShape`s (`blockToShape`'s return type), but
  // `TDPage.shapes` is typed as the general `Record<string, TDShape>` — filter+narrow rather than
  // cast, so a future non-Component shape on a compiled page is silently skipped instead of
  // reaching `shape.size`/`shape.componentId`, which only exist on `ComponentShape`.
  const shapes = React.useMemo<ComponentShape[]>(
    () =>
      page
        ? (Object.values(page.shapes).filter(
            (s) => s.type === TDShapeType.Component
          ) as ComponentShape[])
            .sort((a, b) => (a.childIndex || 0) - (b.childIndex || 0))
        : [],
    [page]
  )

  return (
    <BlockRegistryContext.Provider value={blockRegistry}>
    <HostRegistryContext.Provider value={hostRegistry}>
    <div
      ref={containerRef}
      className={className}
      tabIndex={0}
      role="group"
      aria-roledescription="presentation"
      aria-live="polite"
      onKeyDown={handleKeyDown}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      data-click-side={clickNavigation === 'halves' ? side : undefined}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        outline: 'none',
        ...(clickNavigation === 'halves' ? { cursor: side === 'left' ? 'w-resize' : 'e-resize', touchAction: 'pan-y' } : {}),
      }}
      data-testid="deck-viewer"
      data-slide-index={currentSlideIndex}
      data-slide-count={pages.length}
      data-build-step={currentBuildStep}
      data-build-step-count={steps.length}
    >
      <span className="sr-only">Slide {currentSlideIndex + 1} of {pages.length}</span>
      {page && (
        <div
          ref={frameRef}
          data-testid="deck-viewer-slide"
          data-slide-id={page.id}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: frameWidth,
            height: frameHeight,
            transform: `translate(-50%, -50%) scale(${scale})`,
            transformOrigin: 'center center',
          }}
        >
          <div style={{ position: 'absolute', inset: 0, ...backgroundStyle }} />
          {shapes.map((shape) => {
            const box: Box = { x: shape.point[0], y: shape.point[1], width: shape.size[0], height: shape.size[1] }
            const ctx = contextForBlock(shape, document, {
              headless: false,
              slideBackground: page.background,
              registry: blockRegistry,
            })
            const blockSpec = shapeToBlock(shape)
            const blockDef = blockSpec ? blockRegistry.get(blockSpec.type) : undefined
            return (
              <div
                key={shape.id}
                data-shape-id={shape.id}
                data-block-id={blockSpec?.id}
                ref={(el) => {
                  if (el) elementsRef.current.set(shape.id, el)
                  else elementsRef.current.delete(shape.id)
                }}
                style={{
                  position: 'absolute',
                  left: box.x,
                  top: box.y,
                  width: box.width,
                  height: box.height,
                }}
              >
                <BlockBoundary blockType={blockSpec?.type ?? shape.componentId ?? '(unknown)'}>
                  {blockDef && blockSpec ? (
                    <HostLayoutContext.Provider value={{
                      tokens: ctx.tokens,
                      surface: ctx.surface,
                      props: blockSpec.props,
                      headless: false,
                    }}>
                      <BlockContent blockDef={blockDef} props={blockSpec.props} ctx={ctx} paintKey={`${blockSpec.type}|${blockSpec.id ?? ''}`} meta={(shape.props as Record<string, unknown>).$block} />
                    </HostLayoutContext.Provider>
                  ) : (
                    <UnknownBlockPlaceholder type={shape.componentId} />
                  )}
                </BlockBoundary>
              </div>
            )
          })}
        </div>
      )}
    </div>
    </HostRegistryContext.Provider>
    </BlockRegistryContext.Provider>
  )
}
