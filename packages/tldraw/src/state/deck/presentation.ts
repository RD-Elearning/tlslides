import { AnimationTrigger } from '~types'
import type { ShapeAnimation, TDPage } from '~types'

/**
 * Phase 16 — build-order animation playback. A pure function of a `TDPage`'s shapes, deliberately
 * kept dependency-free (no `TldrawApp`, no DOM) so it's usable from the live editor
 * (`PresentationRuntime`), the host-facing `Deck` facade, and a unit test without a mounted app —
 * the same "resolve once, reuse everywhere" discipline `renderPageToSvg`/`resolveSlideBackground`
 * already established for this fork.
 *
 * A **build step** is one or more shapes that appear together. Every shape carrying a
 * `ShapeAnimation` is a "cue"; cues are sorted by `order` (ties broken by shape id, for a
 * deterministic result no caller has to worry about) and folded into steps:
 *
 * - `onClick` starts a **new** step that only reveals on an explicit advance (a click, an arrow
 *   key, `TldrawApp.advancePresentation`, or `Deck.advance`).
 * - `withPrevious` joins the **same** step as the cue immediately before it in `order` — it never
 *   gets its own advance, manual or automatic. (If it's the very first cue, there's no "previous"
 *   to join, so it starts its own step instead, marked `auto` — see below.)
 * - `afterPrevious` also starts a new step, but one marked `auto: true`: `PresentationRuntime`
 *   reveals it on a timer once the previous step's own animation has finished playing, with no
 *   click required. This is the actual, observable difference between `withPrevious` and
 *   `afterPrevious` the roadmap asked for: the former is simultaneous with what came before it,
 *   the latter is sequential but hands-free.
 *
 * A step with no `onClick` cue in it is `auto: true` — reveals itself with no advance needed once
 * it's due (immediately, for a leading `withPrevious`/`afterPrevious` run, since there is no prior
 * step to wait on).
 */
export interface BuildStep {
  /** Ids of the shapes revealed together at this step, in cue order. */
  shapeIds: string[]
  /** Whether this step reveals itself automatically (no click) or waits for an explicit advance. */
  auto: boolean
}

interface Cue {
  shapeId: string
  animation: ShapeAnimation
}

function collectCues(page: TDPage): Cue[] {
  const cues: Cue[] = []
  for (const shape of Object.values(page.shapes)) {
    if (shape.animation) cues.push({ shapeId: shape.id, animation: shape.animation })
  }
  cues.sort((a, b) => a.animation.order - b.animation.order || a.shapeId.localeCompare(b.shapeId))
  return cues
}

/** Build the ordered list of build steps for a page — see this module's doc comment. Every shape
 *  with no `animation` is simply not a cue and is unaffected: it's visible from the moment the
 *  slide is shown, exactly as it renders outside presentation mode. */
export function computeBuildSteps(page: TDPage): BuildStep[] {
  const steps: BuildStep[] = []
  for (const cue of collectCues(page)) {
    if (cue.animation.trigger === AnimationTrigger.WithPrevious && steps.length > 0) {
      steps[steps.length - 1].shapeIds.push(cue.shapeId)
      continue
    }
    steps.push({
      shapeIds: [cue.shapeId],
      auto: cue.animation.trigger !== AnimationTrigger.OnClick,
    })
  }
  return steps
}

/**
 * How long a step's own animations take, measured from the moment the step is revealed: the
 * longest `delayMs + durationMs` across the step's shapes. This is the single formula both the
 * runtime (`stepChainDelayMs`) and `blocks/motion/timeline.ts`'s `slideTimeline` use, so the two
 * agree by construction rather than by coincidence.
 */
export function stepDurationMs(page: TDPage, step: BuildStep): number {
  let max = 0
  for (const id of step.shapeIds) {
    const animation = page.shapes[id]?.animation
    if (!animation) continue
    max = Math.max(max, animation.delayMs + animation.durationMs)
  }
  return max
}

/**
 * How long `PresentationRuntime` should wait, after `steps[index - 1]` becomes visible, before
 * revealing `steps[index]` — only meaningful when `steps[index].auto` is true. `0` for the first
 * step (nothing to wait on) and for any step whose members have no timing at all.
 */
export function stepChainDelayMs(page: TDPage, steps: BuildStep[], index: number): number {
  if (index <= 0) return 0
  return stepDurationMs(page, steps[index - 1])
}

/**
 * The next `order` value a newly-animated shape should get by default — one past whatever's
 * already on the slide, so a shape a user just turned into a build step lands at the *end* of the
 * existing sequence rather than jumping ahead of it. `0` on a slide with no animated shapes yet.
 * Used by `AnimateMenu`, not by `computeBuildSteps` itself (which never invents an order).
 */
export function nextBuildOrder(page: TDPage): number {
  let max = -1
  for (const shape of Object.values(page.shapes)) {
    if (shape.animation) max = Math.max(max, shape.animation.order)
  }
  return max + 1
}

/**
 * Sorted slide ids, exactly the ordering `TldrawApp.nextPage`/`previousPage` and `Deck.listSlides`
 * already use. Pulled out here so the skip-aware helpers below and `PresentationRuntime`'s "up
 * next" preview all walk the identical sequence — one place, not three copies of the same sort.
 */
export function sortedPageIds(pages: Record<string, TDPage>): string[] {
  return Object.values(pages)
    .sort((a, b) => (a.childIndex || 0) - (b.childIndex || 0))
    .map((page) => page.id)
}

/**
 * The next (or, with `direction: -1`, previous) slide id a presentation should land on from
 * `currentId` — skipping any slide with `skipInPresentation` (T16.4). Returns `undefined` at
 * either end of the deck (matching `nextPage`/`previousPage`'s existing "do nothing past the
 * last/first slide" behaviour) — including when every remaining slide in that direction is
 * skipped, rather than wrapping around or skipping the whole deck silently.
 */
export function adjacentPresentableSlideId(
  pages: Record<string, TDPage>,
  currentId: string,
  direction: 1 | -1
): string | undefined {
  const ids = sortedPageIds(pages)
  let index = ids.indexOf(currentId)
  if (index === -1) return undefined
  for (;;) {
    index += direction
    if (index < 0 || index >= ids.length) return undefined
    if (!pages[ids[index]]?.skipInPresentation) return ids[index]
  }
}
