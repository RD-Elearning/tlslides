/**
 * Motion for tls.c.kinetic-title.
 *
 * Expressive: the orbs settle in, the kicker rises, each title word rises through its mask with a
 * slight rotation, the accent rule draws, the subtitle rises last (timings below).
 * Subtle / reduced motion: handled by `runShowcase`.
 */

import type { BlockMotionRuntime } from '../../../types'
import { all, runShowcase, type GsapLike, type MotionStepList } from '../_showcase'

/**
 * Choreography (s). RVM5: the orbs drifted 140 px for 1.4 s (J5), the kicker tweened its
 * letter-spacing (a reflow every frame: J4, the line shifted while it tightened), the rule eased
 * in and out, the subtitle unblurred, and a 12-word title ran the chain to ~3.2 s. Now only
 * opacity and transforms move: the orbs settle in place, the kicker rises, each title word rises
 * through its mask (per-word transforms, no reflow) with the word gap shortened for a long title
 * so every word is in by `WORDS_SPAN`, the accent rule draws from its start (hidden until it
 * starts: it sat at opacity 1 and scaleX 0 from the first frame), the subtitle rises.
 */
const ORB_FROM: Array<[number, number]> = [[40, -26], [-40, 26], [0, 20]]
const ORB_S = 0.9
const KICKER_AT = 0.1
const WORDS_AT = 0.3
const WORD_GAP = 0.1
const WORDS_SPAN = 0.8
const WORD_S = 0.8
const RULE_S = 0.7
const SUB_S = 0.6
/** The decor layer and the title box fade in under their orbs / words. */
const CONTAINER_S = 0.3

export const wordGap = (n: number): number => Math.min(WORD_GAP, WORDS_SPAN / Math.max(1, n))
/** Where the rule and the subtitle start, after `n` words. */
const tailAt = (n: number) => WORDS_AT + n * wordGap(n)

/** Length of the longest expressive timeline (a long title), for chaining (`MotionRecipe.expressiveMs`). */
export const KINETIC_TITLE_MS = Math.round((WORDS_AT + WORDS_SPAN + 0.45 + SUB_S) * 1000)

function isCentered(root: HTMLElement): boolean {
  const host = root.querySelector<HTMLElement>('[data-kinetic-title]')
  return (host?.style.alignItems ?? 'center') === 'center'
}

function gsapTimeline(root: HTMLElement, gsap: GsapLike, done: () => void, rt: BlockMotionRuntime): () => void {
  const tl = gsap.timeline({ onComplete: done, delay: rt.timing.delayMs / 1000 })
  // The containers whose children carry the motion (the orbs, the words) fade in under them
  // (RVM5: a `set` to 1 made the decor layer jump in one frame); every other part owns its
  // opacity in its own fromTo (a blanket set at 0 would undo their hidden from-state).
  tl.fromTo(all(root, '[data-part="decor"]'), { opacity: 0 }, { opacity: 1, duration: CONTAINER_S, ease: 'power2.out' }, 0)
  tl.fromTo(all(root, '[data-part="title"]'), { opacity: 0 }, { opacity: 1, duration: CONTAINER_S, ease: 'power2.out' }, WORDS_AT)

  all(root, '[data-orb]').forEach((orb, i) => {
    const [x, y] = ORB_FROM[i] ?? [0, 20]
    tl.fromTo(orb, { opacity: 0, scale: 0.9, x, y }, { opacity: 1, scale: 1, x: 0, y: 0, duration: ORB_S, ease: 'power2.out' }, 0.1 * i)
  })

  const kicker = root.querySelector('[data-part="kicker"]')
  if (kicker) tl.fromTo(kicker, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, KICKER_AT)

  const words = all(root, '[data-word-inner]')
  if (words.length) {
    tl.fromTo(
      words,
      { yPercent: 115, rotation: 8, opacity: 0 },
      { yPercent: 0, rotation: 0, opacity: 1, duration: WORD_S, ease: 'power4.out', stagger: wordGap(words.length) },
      WORDS_AT
    )
  }

  const tail = tailAt(words.length)
  const rule = root.querySelector('[data-part="rule"]')
  if (rule) {
    tl.fromTo(
      rule,
      { scaleX: 0, opacity: 0, transformOrigin: isCentered(root) ? '50% 50%' : '0% 50%' },
      { scaleX: 1, opacity: 1, duration: RULE_S, ease: 'power3.out' },
      tail + 0.2
    )
  }

  const subtitle = root.querySelector('[data-part="subtitle"]')
  if (subtitle) {
    tl.fromTo(subtitle, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: SUB_S, ease: 'power3.out' }, tail + 0.45)
  }
  return () => tl.kill()
}

function driverSteps(root: HTMLElement, rt: BlockMotionRuntime): MotionStepList {
  const steps: MotionStepList = []
  const ease = 'cubic-bezier(0.16, 1, 0.3, 1)'
  for (const p of all(root, '[data-part="decor"]')) steps.push([p, { opacity: [0, 1] }, { duration: CONTAINER_S * 1000, easing: ease }])
  for (const p of all(root, '[data-part="title"]')) steps.push([p, { opacity: [0, 1] }, { duration: CONTAINER_S * 1000, delay: WORDS_AT * 1000, easing: ease }])

  all(root, '[data-orb]').forEach((orb, i) => {
    const [x, y] = ORB_FROM[i] ?? [0, 20]
    steps.push([orb, { opacity: [0, 1], scale: [0.9, 1], translate: [`${x}px ${y}px`, '0px 0px'] }, { duration: ORB_S * 1000, delay: 100 * i, easing: ease }])
  })
  const kicker = root.querySelector('[data-part="kicker"]')
  if (kicker) steps.push([kicker, { opacity: [0, 1], translate: ['0px 16px', '0px 0px'] }, { duration: 700, delay: KICKER_AT * 1000, easing: ease }])

  const words = all(root, '[data-word-inner]')
  const gap = wordGap(words.length) * 1000
  words.forEach((w, i) => {
    steps.push([w, { opacity: [0, 1], translate: ['0 115%', '0 0'] }, { duration: WORD_S * 1000, delay: WORDS_AT * 1000 + i * gap, easing: ease }])
  })
  const tail = tailAt(words.length) * 1000
  const rule = root.querySelector('[data-part="rule"]')
  if (rule) {
    // Four explicit `%` terms on both ends: GSAP pairs the numbers in order (S16).
    const from = isCentered(root) ? 'inset(0% 50% 0% 50%)' : 'inset(0% 100% 0% 0%)'
    steps.push([rule, { opacity: [0, 1], clipPath: [from, 'inset(0% 0% 0% 0%)'] }, { duration: RULE_S * 1000, delay: tail + 200, easing: ease }])
  }
  const subtitle = root.querySelector('[data-part="subtitle"]')
  if (subtitle) {
    steps.push([subtitle, { opacity: [0, 1], translate: ['0px 20px', '0px 0px'] }, { duration: SUB_S * 1000, delay: tail + 450, easing: ease }])
  }
  return steps
}

export function animate(root: HTMLElement, rt: BlockMotionRuntime): void | (() => void) {
  return runShowcase(root, rt, { gsap: gsapTimeline, driver: driverSteps })
}
