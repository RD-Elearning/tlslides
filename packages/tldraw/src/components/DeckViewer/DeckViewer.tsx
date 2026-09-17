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
import type { DeckSpec, Box } from '~blocks/types'
import type { MotionDriver } from '~blocks/motion/driver'
import type { BlockDefinition } from '~blocks/types'
import type { LayoutContext } from '~blocks/types'
import { deckSpecToDocument } from '~blocks/deck-document'
import { deckLayoutContext } from '~blocks/deck-context'
import { shapeToBlock } from '~blocks/shape-bridge'
import { renderNodeToDom, paintToCSS } from '~blocks/render-dom'
import { BlockRegistry } from '~blocks/registry'
import { registerBuiltInBlocks } from '~blocks/library'
import { createWAAPI_driver } from '~blocks/motion/waapi-driver'
import { computeBuildSteps, stepChainDelayMs } from '~state/deck/presentation'
import type { BuildStep } from '~state/deck/presentation'
import { entranceKeyframes, hiddenState, visibleState } from './motion-helpers'

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
  /** When set, once a slide's build finishes, auto-advance to the next presentable slide after
   *  this many ms. Absent = fully manual/click/keyboard navigation only. */
  autoAdvanceMs?: number
  className?: string
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Shared block registry — built once per module load, never per instance          */
/* ─────────────────────────────────────────────────────────────────────────────── */

const sharedRegistry = new BlockRegistry()
registerBuiltInBlocks(sharedRegistry)

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
}: {
  blockDef: BlockDefinition
  props: Record<string, unknown>
  ctx: LayoutContext
}) {
  return <React.Fragment>{renderNodeToDom(blockDef.layout(props, ctx))}</React.Fragment>
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
  autoAdvanceMs,
  className,
}) => {
  const { document } = React.useMemo(() => deckSpecToDocument(spec), [spec])
  const pages = React.useMemo(() => orderedPages(document), [document])

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

  /* --- Navigation state transitions --------------------------------------------------- */

  const setSlide = React.useCallback(
    (index: number, step: number) => {
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

  const advance = React.useCallback(() => {
    if (currentBuildStep < steps.length) {
      setStep(currentBuildStep + 1)
      return
    }
    const next = nextPresentableIndex(pages, currentSlideIndex)
    if (next !== undefined) setSlide(next, 0)
  }, [currentBuildStep, steps.length, pages, currentSlideIndex, setStep, setSlide])

  const retreat = React.useCallback(() => {
    if (currentBuildStep > 0) {
      setStep(currentBuildStep - 1)
      return
    }
    const prev = prevPresentableIndex(pages, currentSlideIndex)
    if (prev !== undefined) {
      const prevPage = pages[prev]
      const prevSteps = prevPage ? computeBuildSteps(prevPage) : []
      setSlide(prev, prevSteps.length)
    }
  }, [currentBuildStep, pages, currentSlideIndex, setStep, setSlide])

  const goHome = React.useCallback(() => setSlide(firstPresentableIndex(pages), 0), [pages, setSlide])

  const goEnd = React.useCallback(() => {
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
      setInnerBuildStep(0)
    }
    prevControlledSlideRef.current = slideIndex
  }, [slideIndex, isSlideControlled, isStepControlled])

  /* --- Build-step visual sync ---------------------------------------------------------- */

  const prevBuildRef = React.useRef<{ pageId: string; revealed: number }>({
    pageId: page?.id ?? '',
    revealed: -1,
  })

  React.useEffect(() => {
    if (!page) return
    const prev = prevBuildRef.current
    const pageChanged = prev.pageId !== page.id
    if (pageChanged) motionDriver.cancelAll()
    const prevRevealed = pageChanged ? -1 : prev.revealed

    steps.forEach((step, index) => {
      const isRevealed = index < currentBuildStep
      const isNewlyRevealed = !pageChanged && !reducedMotion && index >= prevRevealed && isRevealed
      step.shapeIds.forEach((shapeId) => {
        const el = elementsRef.current.get(shapeId)
        const animation = page.shapes[shapeId]?.animation
        if (!el || !animation) return
        if (isRevealed) {
          if (isNewlyRevealed) {
            motionDriver.play(el, entranceKeyframes(animation.effect), {
              duration: animation.durationMs,
              delay: animation.delayMs,
              easing: 'ease-out',
              fill: 'forwards',
            })
          } else {
            motionDriver.set(el, visibleState(animation.effect))
          }
        } else {
          motionDriver.set(el, hiddenState(animation.effect))
        }
      })
    })

    prevBuildRef.current = { pageId: page.id, revealed: currentBuildStep }
  }, [page, steps, currentBuildStep, reducedMotion, motionDriver])

  // Cancel every in-flight animation on unmount — an abandoned WAAPI animation holding
  // `will-change` on an unmounted subtree is a real leak (rule 5).
  React.useEffect(() => {
    return () => {
      motionDriver.cancelAll()
    }
  }, [motionDriver])

  /* --- Auto-advance chain (`afterPrevious`/a leading `withPrevious`) -------------------- */

  React.useEffect(() => {
    if (!page) return
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

  const handleClick = React.useCallback(() => advance(), [advance])

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
    <div
      ref={containerRef}
      className={className}
      tabIndex={0}
      role="group"
      aria-roledescription="presentation"
      onKeyDown={handleKeyDown}
      onClick={handleClick}
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', outline: 'none' }}
      data-testid="deck-viewer"
    >
      {page && (
        <div
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
            const ctx = deckLayoutContext(document, box, {
              headless: false,
              slideBackground: page.background,
            })
            const blockSpec = shapeToBlock(shape)
            const blockDef = blockSpec ? sharedRegistry.get(blockSpec.type) : undefined
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
                    <BlockContent blockDef={blockDef} props={blockSpec.props} ctx={ctx} />
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
  )
}
