/**
 * Motion for tls.c.testimonial.
 *
 * The viewer hides every `[data-part]` before `animate()` runs, so the quote container must be
 * shown up front (its words carry the motion) and every other part owns its opacity in its own
 * tween. Expressive: the quote's words fade in one by one, then the avatar, name and role rise in
 * order. Subtle / reduced motion: handled by `runShowcase`.
 */

import type { BlockMotionRuntime } from '../../../types'
import { all, runShowcase, type GsapLike, type MotionStepList } from '../_showcase'

/** Rough length of the expressive timeline, for chaining (`MotionRecipe.expressiveMs`). */
export const TESTIMONIAL_MS = 2000

const WORD_GAP = 0.045
const WORD_FADE = 0.45

/** The attribution parts, in reading order (each present only when the template drew it). */
function attribution(root: HTMLElement): HTMLElement[] {
  return ['avatar', 'name', 'role']
    .map((p) => root.querySelector<HTMLElement>(`[data-part="${p}"]`))
    .filter((e): e is HTMLElement => !!e)
}

function gsapTimeline(root: HTMLElement, gsap: GsapLike, done: () => void, rt: BlockMotionRuntime): () => void {
  const tl = gsap.timeline({ onComplete: done, delay: rt.timing.delayMs / 1000 })
  const words = all(root, '[data-part="quote"] [data-word]')
  // The quote box is only a container for its words: show it, the words start hidden.
  tl.set(all(root, '[data-part="quote"]'), { opacity: 1 }, 0)
  if (words.length) tl.fromTo(words, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: WORD_FADE, ease: 'power2.out', stagger: WORD_GAP }, 0)
  const start = words.length ? words.length * WORD_GAP + 0.15 : 0
  attribution(root).forEach((el, i) => {
    tl.fromTo(el, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out' }, start + i * 0.18)
  })
  return () => tl.kill()
}

function driverSteps(root: HTMLElement, rt: BlockMotionRuntime): MotionStepList {
  const steps: MotionStepList = []
  const ease = 'cubic-bezier(0.22, 1, 0.36, 1)'
  for (const q of all(root, '[data-part="quote"]')) rt.driver.set(q, { opacity: 1 })
  const words = all(root, '[data-part="quote"] [data-word]')
  words.forEach((w, i) => steps.push([w, { opacity: [0, 1], translate: ['0px 8px', '0px 0px'] }, { duration: 450, delay: i * 45, easing: ease }]))
  const start = words.length * 45 + 150
  attribution(root).forEach((el, i) => {
    steps.push([el, { opacity: [0, 1], translate: ['0px 14px', '0px 0px'] }, { duration: 550, delay: start + i * 180, easing: ease }])
  })
  return steps
}

export function animate(root: HTMLElement, rt: BlockMotionRuntime): void | (() => void) {
  return runShowcase(root, rt, { gsap: gsapTimeline, driver: driverSteps })
}
