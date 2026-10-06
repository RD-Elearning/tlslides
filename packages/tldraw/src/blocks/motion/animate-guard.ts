/**
 * Guard for html blocks' `animate()` (M1 / S26).
 *
 * Before an html block's `animate()` runs, the viewer hides every `[data-part]` (inline
 * `opacity: 0`) so nothing flashes before the block's own from-states are applied. That contract
 * puts the reveal on `animate()`: a part it never tweens stays invisible. An `animate()` that
 * tweens only a part's descendants (the words inside a `quote` container, say) left the
 * container — and so everything in it — invisible for good (`tls.c.testimonial` before RV09).
 *
 * `hidePartsForAnimate` does the hiding and remembers what it hid; `revealUntouchedParts`, called
 * when the block reports completion (or its timeout fires), fades in every part that still has
 * exactly the opacity the viewer gave it. A part that `animate()` tweened ends at its own value
 * (normally 1), so only the forgotten ones are touched. The fade is short and eased, so a missed
 * part arrives late rather than never, and never snaps (J1).
 *
 * Pure DOM + driver, no React.
 */

import type { MotionDriver } from './driver'

/** Inline opacity the viewer writes before `animate()`. */
const HIDDEN = '0'

/** Fade used for a part `animate()` never revealed. */
export const UNTOUCHED_REVEAL_MS = 250

/** Hide every `[data-part]` under `root` before `animate()`; returns the hidden elements. */
export function hidePartsForAnimate(root: HTMLElement): HTMLElement[] {
  const parts = Array.from(root.querySelectorAll<HTMLElement>('[data-part]'))
  for (const p of parts) p.style.opacity = HIDDEN
  return parts
}

/** The hidden parts nothing has revealed: still at the viewer's opacity and still mounted. */
export function untouchedParts(hidden: readonly HTMLElement[]): HTMLElement[] {
  return hidden.filter((p) => p.isConnected && p.style.opacity === HIDDEN)
}

/**
 * Fade in every part `animate()` left hidden. Call once the block's animation is complete.
 * Returns the parts it revealed (empty for a well-behaved block).
 */
export function revealUntouchedParts(hidden: readonly HTMLElement[], driver: MotionDriver): HTMLElement[] {
  const left = untouchedParts(hidden)
  for (const p of left) {
    driver.play(p, { opacity: [0, 1] }, { duration: UNTOUCHED_REVEAL_MS, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' })
  }
  return left
}
