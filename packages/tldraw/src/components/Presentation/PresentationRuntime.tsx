import * as React from 'react'
import { useTldrawApp } from '~hooks'
import { computeBuildSteps, stepChainDelayMs } from '~state/deck/presentation'
import { AnimationEffect, TDSnapshot } from '~types'
import type { ShapeAnimation } from '~types'
import { shapeToBlock } from '~blocks/shape-bridge'
import { BlockRegistry } from '~blocks/registry'
import { registerBuiltInBlocks } from '~blocks/library'
import { playBlockReveal } from '~blocks/motion/play-reveal'
import type { MotionDriver, MotionHandle, MotionKeyframes, MotionOptions, MotionState, MotionStep } from '~blocks/motion/driver'

/**
 * T16.1 (build-order playback) + T16.6 (slide transitions), together in one component because
 * both are "presentation-only visual effects applied imperatively to DOM nodes the live editor
 * already renders" — the same mechanism, just aimed at two different targets (a shape's own
 * positioned container vs. the whole canvas).
 *
 * **Why DOM-imperative rather than a prop threaded through `@tlslides/core`'s `Shape`/`Canvas`.**
 * Both targets are already-rendered, stable elements this fork can select by id/hardcoded id
 * (`document.getElementById(shape.id)` — the same positioned `<div>` `@tlslides/core`'s
 * `Container` gives every shape; `#canvas`, `@tlslides/core`'s pan/zoom root). Reaching them this
 * way, exactly like `appendBackgroundDefs`/`TldrawApp.copySvg` already do for gradients, keeps
 * every non-presentation render path — the editor's normal canvas, `copySvg`, `renderPageToSvg` —
 * completely untouched: none of them import this module or know it exists. This component is
 * mounted **only** while `settings.isPresentationMode` (see `Tldraw.tsx`), so a shape's
 * `animation` field has zero effect on anything until presenting actually starts, and this
 * module's own cleanup (below) puts every touched node back to a plain, no-override state the
 * moment presenting stops — verified in `PresentationRuntime.spec.tsx` and, visually, in
 * `tools/visual/scenarios/present.js` (a `fadeIn` shape screenshotted mid-editing, not presenting,
 * at full opacity).
 *
 * **Why `translate`/`scale`/`clip-path`, never `transform`, on a shape's container.**
 * `@tlslides/core`'s `usePosition` hook owns `transform` on that same element via a mobx
 * `autorun` (position + rotation) and rewrites it on every bounds change — fighting it for the
 * same CSS property would mean whichever write happens to run last wins, silently. Modern
 * browsers treat `translate`/`scale`/`rotate` as independent CSS properties that compose with
 * `transform` (applied before it, in that order per the CSS Transforms Level 2 cascade) rather
 * than colliding with it, so a build animation and a live shape reposition can never race for the
 * same property. `opacity` and `clip-path` have no other writer on this element at all.
 */
const settingsSelector = (s: TDSnapshot) => s.settings.presentationTransition
const stateSelector = (s: TDSnapshot) => ({
  pageId: s.appState.currentPageId,
  buildStep: s.appState.presentationBuildStep,
})

const TRANSITION_MS = 220
const SLIDE_OFFSET_PX = 48

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Shared block registry + CSS-transition MotionDriver adapter                     */
/* ─────────────────────────────────────────────────────────────────────────────── */

const sharedRegistry = new BlockRegistry()
registerBuiltInBlocks(sharedRegistry)

/** Map our JS keyframe property names → CSS property names. */
const KEYFRAME_MAP: Record<string, string> = {
  opacity: 'opacity',
  translate: 'translate',
  scale: 'scale',
  clipPath: 'clip-path',
  filter: 'filter',
  strokeDashoffset: 'stroke-dashoffset',
}

/**
 * A minimal `MotionDriver` backed by CSS transitions — used by `playBlockReveal`
 * in the editor's Present mode. This avoids pulling in WAAPI (which may conflict
 * with `@tlslides/core`'s own `usePosition` autorun) while keeping the same
 * driver interface the viewer uses. Only `set()` and `play()` are meaningfully
 * implemented; `timeline()` and `cancelAll()` are stubs (PresentationRuntime
 * doesn't chain or cancel animations across steps).
 */
function createCSSTransitionDriver(): MotionDriver {
  return {
    play(target: Element, keyframes: MotionKeyframes, opts: MotionOptions): MotionHandle {
      const el = target as HTMLElement
      const duration = opts.duration ?? 300
      const delay = opts.delay ?? 0
      const easing = opts.easing ?? 'ease-out'

      // Apply "from" state from keyframes.
      for (const [key, values] of Object.entries(keyframes)) {
        if (!values || values.length === 0) continue
        const cssProp = KEYFRAME_MAP[key]
        if (!cssProp) continue
        el.style.setProperty(cssProp, String(values[0]))
      }

      // Force reflow between "before" and "after" state writes.
      void el.offsetWidth

      // Build transition string for the animated properties.
      const properties = Object.keys(keyframes)
        .map((k) => KEYFRAME_MAP[k])
        .filter(Boolean)
      el.style.transition = properties
        .map((p) => `${p} ${duration}ms ${easing} ${delay}ms`)
        .join(', ')

      // Apply "to" state from keyframes.
      for (const [key, values] of Object.entries(keyframes)) {
        if (!values || values.length === 0) continue
        const cssProp = KEYFRAME_MAP[key]
        if (!cssProp) continue
        el.style.setProperty(cssProp, String(values[values.length - 1]))
      }

      // Fire onUpdate if provided.
      if (opts.onUpdate) {
        const onUpdate = opts.onUpdate
        const timer = setTimeout(() => onUpdate(1), delay + duration)
        return {
          cancel() { clearTimeout(timer) },
          finished: new Promise<void>((resolve) => {
            setTimeout(resolve, delay + duration)
          }),
        }
      }

      return {
        cancel() { el.style.transition = 'none' },
        finished: Promise.resolve(),
      }
    },

    set(target: Element, state: MotionState): void {
      const el = target as HTMLElement
      el.style.transition = 'none'
      for (const [key, value] of Object.entries(state)) {
        if (value === undefined) continue
        const cssProp = KEYFRAME_MAP[key]
        if (!cssProp) continue
        el.style.setProperty(cssProp, String(value))
      }
    },

    timeline(steps: MotionStep[]): MotionHandle {
      // PresentationRuntime doesn't use timelines — stub.
      return { cancel() {}, finished: Promise.resolve() }
    },

    cancelAll(): void {
      // PresentationRuntime manages transitions per-element, not globally.
      // This is called by cleanup effects; individual element cleanup is
      // handled by `clearOverrides`.
    },
  }
}

export const PresentationRuntime = React.memo(function PresentationRuntime() {
  const app = useTldrawApp()
  const transitionSetting = app.useStore(settingsSelector)
  const { pageId, buildStep } = app.useStore(stateSelector)

  const reducedMotion = usePrefersReducedMotion()

  // Build-step playback -------------------------------------------------------------------
  const touchedShapeIds = React.useRef<Set<string>>(new Set())
  const prevBuildRef = React.useRef<{ pageId: string; revealed: number }>({
    pageId,
    revealed: buildStep,
  })

  React.useEffect(() => {
    const page = app.document.pages[pageId]
    if (!page) return
    const steps = computeBuildSteps(page)
    const prev = prevBuildRef.current
    // A slide change snaps every step straight to its target state — see the module doc comment
    // on `previousPresentation` for why "back" to a fully-built slide should not replay its build.
    const pageChanged = prev.pageId !== pageId
    const prevRevealed = pageChanged ? -1 : prev.revealed

    const cssDriver = createCSSTransitionDriver()

    steps.forEach((step, index) => {
      const isRevealed = index < buildStep
      const isNewlyRevealed = !pageChanged && !reducedMotion && index >= prevRevealed && isRevealed
      step.shapeIds.forEach((shapeId) => {
        const el = document.getElementById(shapeId)
        const shape = page.shapes[shapeId]
        const animation = shape?.animation
        if (!el || !animation) return
        touchedShapeIds.current.add(shapeId)
        if (isRevealed) {
          if (isNewlyRevealed) {
            // Use playBlockReveal when we have the block spec + definition (R5).
            const blockSpec = shapeToBlock(shape)
            const blockDef = blockSpec ? sharedRegistry.get(blockSpec.type) : undefined
            if (blockSpec && blockDef) {
              playBlockReveal(el, blockSpec, blockDef, { driver: cssDriver, reducedMotion: false })
            } else {
              playIn(el, animation)
            }
          } else {
            settleVisible(el)
          }
        } else {
          settleHidden(el, animation.effect)
        }
      })
    })

    prevBuildRef.current = { pageId, revealed: buildStep }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app, pageId, buildStep, reducedMotion])

  // Auto-advance chain (`afterPrevious`/a leading `withPrevious`) -------------------------
  React.useEffect(() => {
    const page = app.document.pages[pageId]
    if (!page) return
    const steps = computeBuildSteps(page)
    const nextIndex = buildStep
    const nextStep = steps[nextIndex]
    if (!nextStep || !nextStep.auto) return

    const waitMs = reducedMotion ? 0 : stepChainDelayMs(page, steps, nextIndex)
    const handle = setTimeout(() => {
      // Guard against a stale timer firing after the presenter already advanced manually, or
      // after leaving presentation mode / changing slides — re-check everything fresh rather
      // than trusting the closure.
      if (
        app.settings.isPresentationMode &&
        app.currentPageId === pageId &&
        app.appState.presentationBuildStep === nextIndex
      ) {
        app.advancePresentation()
      }
    }, waitMs)
    return () => clearTimeout(handle)
  }, [app, pageId, buildStep, reducedMotion])

  // Cleanup: leaving presentation mode must restore every touched node to a plain state — these
  // are the SAME DOM nodes the editor keeps showing once presenting stops.
  React.useEffect(() => {
    return () => {
      touchedShapeIds.current.forEach((shapeId) => {
        const el = document.getElementById(shapeId)
        if (el) clearOverrides(el)
      })
      touchedShapeIds.current.clear()
    }
  }, [])

  // Slide transitions (T16.6) --------------------------------------------------------------
  const prevPageRef = React.useRef<{ pageId: string; index: number }>({
    pageId,
    index: sortedIndex(app, pageId),
  })

  React.useEffect(() => {
    const el = document.getElementById('canvas')
    if (!el) return
    const prev = prevPageRef.current
    if (prev.pageId !== pageId && transitionSetting !== 'none') {
      const index = sortedIndex(app, pageId)
      const direction = index >= prev.index ? 1 : -1
      el.style.transition = 'none'
      el.style.opacity = '0'
      el.style.translate = transitionSetting === 'push' ? `${direction * SLIDE_OFFSET_PX}px 0` : ''
      if (reducedMotion) {
        el.style.opacity = '1'
        el.style.translate = '0 0'
      } else {
        // Force a reflow so the browser registers the "before" state above before the
        // transitioned "after" state below is applied on the next line.
        void el.offsetWidth
        el.style.transition = `opacity ${TRANSITION_MS}ms ease, translate ${TRANSITION_MS}ms ease`
        el.style.opacity = '1'
        el.style.translate = '0 0'
      }
    }
    prevPageRef.current = { pageId, index: sortedIndex(app, pageId) }
  }, [app, pageId, transitionSetting, reducedMotion])

  React.useEffect(() => {
    return () => {
      const el = document.getElementById('canvas')
      if (el) clearOverrides(el)
    }
  }, [])

  return null
})

/* -------------------------------------------------- */
/*                        Timing                       */
/* -------------------------------------------------- */

function sortedIndex(app: ReturnType<typeof useTldrawApp>, pageId: string): number {
  return Object.values(app.document.pages)
    .sort((a, b) => (a.childIndex || 0) - (b.childIndex || 0))
    .findIndex((p) => p.id === pageId)
}

/* -------------------------------------------------- */
/*                    DOM style helpers                */
/* -------------------------------------------------- */

function hiddenStyle(el: HTMLElement, effect: AnimationEffect) {
  el.style.clipPath = ''
  switch (effect) {
    case AnimationEffect.SlideIn:
      el.style.opacity = '0'
      el.style.translate = '0 32px'
      el.style.scale = ''
      break
    case AnimationEffect.ZoomIn:
      el.style.opacity = '0'
      el.style.translate = ''
      el.style.scale = '0.7'
      break
    case AnimationEffect.Wipe:
      el.style.opacity = '1'
      el.style.translate = ''
      el.style.scale = ''
      el.style.clipPath = 'inset(0 100% 0 0)'
      break
    case AnimationEffect.FadeIn:
    default:
      el.style.opacity = '0'
      el.style.translate = ''
      el.style.scale = ''
  }
}

function settleHidden(el: HTMLElement, effect: AnimationEffect) {
  el.style.transition = 'none'
  hiddenStyle(el, effect)
}

function settleVisible(el: HTMLElement) {
  el.style.transition = 'none'
  el.style.opacity = '1'
  el.style.translate = '0 0'
  el.style.scale = '1'
  el.style.clipPath = 'inset(0 0 0 0)'
}

function playIn(el: HTMLElement, animation: ShapeAnimation) {
  settleHidden(el, animation.effect)
  // Force a reflow between the "before" and "after" style writes so the browser has a starting
  // point to transition from, rather than collapsing both into one frame.
  void el.offsetWidth
  el.style.transition = [
    `opacity ${animation.durationMs}ms ease ${animation.delayMs}ms`,
    `translate ${animation.durationMs}ms ease ${animation.delayMs}ms`,
    `scale ${animation.durationMs}ms ease ${animation.delayMs}ms`,
    `clip-path ${animation.durationMs}ms ease ${animation.delayMs}ms`,
  ].join(', ')
  el.style.opacity = '1'
  el.style.translate = '0 0'
  el.style.scale = '1'
  el.style.clipPath = 'inset(0 0 0 0)'
}

function clearOverrides(el: HTMLElement) {
  el.style.transition = ''
  el.style.opacity = ''
  el.style.translate = ''
  el.style.scale = ''
  el.style.clipPath = ''
}

/* -------------------------------------------------- */
/*                 prefers-reduced-motion              */
/* -------------------------------------------------- */

function usePrefersReducedMotion(): boolean {
  const query = '(prefers-reduced-motion: reduce)'
  const [reduced, setReduced] = React.useState(
    () => typeof window !== 'undefined' && window.matchMedia?.(query).matches === true
  )
  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia(query)
    const onChange = () => setReduced(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])
  return reduced
}
