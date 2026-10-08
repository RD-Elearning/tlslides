/**
 * Motion for tls.c.testimonial.
 *
 * The viewer hides every `[data-part]` before `animate()` runs, so every part owns its opacity in
 * its own tween: the quote container fades in under its first words (it also holds the quotation
 * marks), the words carry the reading motion. Expressive: the quote's words fade in one by one (all in within 0.7 s, however long the
 * quote), then the portrait settles from 104 % in place, the name and the role rise in order.
 * Subtle / reduced motion: handled by `runShowcase`.
 */

import type { BlockMotionRuntime } from '../../../types'
import { all, runShowcase, type GsapLike, type MotionStepList } from '../_showcase'

/**
 * Length of the expressive timeline, for chaining (`MotionRecipe.expressiveMs`): the words span at
 * most `WORDS_SPAN` s, then the attribution (portrait, name, role) — at most ~1.7 s in all.
 */
export const TESTIMONIAL_MS = 1800

/** Gap between two words (s), shortened for a long quote so all words are in by `WORDS_SPAN`. */
const WORD_GAP = 0.045
const WORDS_SPAN = 0.7
const WORD_FADE = 0.45
/** The quote box (and its quotation marks) fades in under the first words. */
const QUOTE_FADE = 0.35
/** The attribution: the portrait settles from 104 % in place (no slide), name and role rise 12 px. */
const ATTR_GAP = 0.15
const ATTR_FADE = 0.55

export const wordGap = (n: number): number => Math.min(WORD_GAP, WORDS_SPAN / Math.max(1, n))

/** The attribution parts, in reading order (each present only when the template drew it). */
function attribution(root: HTMLElement): HTMLElement[] {
  return ['avatar', 'name', 'role']
    .map((p) => root.querySelector<HTMLElement>(`[data-part="${p}"]`))
    .filter((e): e is HTMLElement => !!e)
}

const isPortrait = (el: HTMLElement) => el.getAttribute('data-part') === 'avatar'

function gsapTimeline(root: HTMLElement, gsap: GsapLike, done: () => void, rt: BlockMotionRuntime): () => void {
  const tl = gsap.timeline({ onComplete: done, delay: rt.timing.delayMs / 1000 })
  const words = all(root, '[data-part="quote"] [data-word]')
  const gap = wordGap(words.length)
  // The quote box holds the words and the two quotation marks (bare text, not words): it fades in
  // with the first words (RVM5: a `set` to 1 popped the marks in one frame, J1).
  tl.fromTo(all(root, '[data-part="quote"]'), { opacity: 0 }, { opacity: 1, duration: QUOTE_FADE, ease: 'power2.out' }, 0)
  if (words.length) tl.fromTo(words, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: WORD_FADE, ease: 'power2.out', stagger: gap }, 0)
  const start = words.length ? words.length * gap + 0.15 : 0
  attribution(root).forEach((el, i) => {
    const from = isPortrait(el) ? { opacity: 0, scale: 1.04 } : { opacity: 0, y: 12 }
    const to = isPortrait(el) ? { opacity: 1, scale: 1 } : { opacity: 1, y: 0 }
    tl.fromTo(el, from, { ...to, duration: ATTR_FADE, ease: 'power3.out' }, start + i * ATTR_GAP)
  })
  return () => tl.kill()
}

function driverSteps(root: HTMLElement, rt: BlockMotionRuntime): MotionStepList {
  const steps: MotionStepList = []
  const ease = 'cubic-bezier(0.22, 1, 0.36, 1)'
  for (const q of all(root, '[data-part="quote"]')) steps.push([q, { opacity: [0, 1] }, { duration: QUOTE_FADE * 1000, easing: ease }])
  const words = all(root, '[data-part="quote"] [data-word]')
  const gap = wordGap(words.length) * 1000
  words.forEach((w, i) => steps.push([w, { opacity: [0, 1], translate: ['0px 8px', '0px 0px'] }, { duration: WORD_FADE * 1000, delay: i * gap, easing: ease }]))
  const start = words.length ? words.length * gap + 150 : 0
  attribution(root).forEach((el, i) => {
    const kf = isPortrait(el) ? { opacity: [0, 1], scale: [1.04, 1] } : { opacity: [0, 1], translate: ['0px 12px', '0px 0px'] }
    steps.push([el, kf, { duration: ATTR_FADE * 1000, delay: start + i * ATTR_GAP * 1000, easing: ease }])
  })
  return steps
}

export function animate(root: HTMLElement, rt: BlockMotionRuntime): void | (() => void) {
  return runShowcase(root, rt, { gsap: gsapTimeline, driver: driverSteps })
}
