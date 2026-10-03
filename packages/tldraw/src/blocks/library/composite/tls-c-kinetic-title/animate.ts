/**
 * Motion for tls.c.kinetic-title.
 *
 * Expressive: the orbs drift in, the kicker tightens its tracking, each title word rises through
 * its mask with a slight rotation, the accent rule draws, the subtitle unblurs last.
 * Subtle / reduced motion: handled by `runShowcase`.
 */

import type { BlockMotionRuntime } from '../../../types'
import { all, runShowcase, type GsapLike, type MotionStepList } from '../_showcase'

/** Rough length of the expressive timeline, for chaining (`MotionRecipe.expressiveMs`). */
export const KINETIC_TITLE_MS = 2600

const ORB_FROM: Array<[number, number]> = [[140, -90], [-140, 90], [0, 70]]

function isCentered(root: HTMLElement): boolean {
  const host = root.querySelector<HTMLElement>('[data-kinetic-title]')
  return (host?.style.alignItems ?? 'center') === 'center'
}

function gsapTimeline(root: HTMLElement, gsap: GsapLike, done: () => void, rt: BlockMotionRuntime): () => void {
  const tl = gsap.timeline({ onComplete: done, delay: rt.timing.delayMs / 1000 })
  tl.set(all(root, '[data-part]'), { opacity: 1 }, 0)

  all(root, '[data-orb]').forEach((orb, i) => {
    const [x, y] = ORB_FROM[i] ?? [0, 60]
    tl.fromTo(orb, { opacity: 0, scale: 0.3, x, y }, { opacity: 1, scale: 1, x: 0, y: 0, duration: 1.4, ease: 'power3.out' }, 0.1 * i)
  })

  const kicker = root.querySelector('[data-part="kicker"]')
  if (kicker) {
    tl.fromTo(kicker, { opacity: 0, y: 20, letterSpacing: '0.5em' }, { opacity: 1, y: 0, letterSpacing: '0.16em', duration: 0.9, ease: 'power3.out' }, 0.15)
  }

  const words = all(root, '[data-word-inner]')
  if (words.length) {
    tl.fromTo(
      words,
      { yPercent: 115, rotation: 8, opacity: 0 },
      { yPercent: 0, rotation: 0, opacity: 1, duration: 0.9, ease: 'power4.out', stagger: 0.1 },
      0.35
    )
  }

  const rule = root.querySelector('[data-part="rule"]')
  if (rule) {
    tl.fromTo(
      rule,
      { scaleX: 0, transformOrigin: isCentered(root) ? '50% 50%' : '0% 50%' },
      { scaleX: 1, duration: 0.8, ease: 'power3.inOut' },
      0.35 + words.length * 0.1 + 0.4
    )
  }

  const subtitle = root.querySelector('[data-part="subtitle"]')
  if (subtitle) {
    tl.fromTo(
      subtitle,
      { opacity: 0, y: 24, filter: 'blur(6px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.7, ease: 'power2.out' },
      0.35 + words.length * 0.1 + 0.9
    )
  }
  return () => tl.kill()
}

function driverSteps(root: HTMLElement, rt: BlockMotionRuntime): MotionStepList {
  const steps: MotionStepList = []
  const ease = 'cubic-bezier(0.16, 1, 0.3, 1)'
  for (const p of all(root, '[data-part="decor"], [data-part="title"]')) rt.driver.set(p, { opacity: 1 })

  all(root, '[data-orb]').forEach((orb, i) => {
    const [x, y] = ORB_FROM[i] ?? [0, 60]
    steps.push([orb, { opacity: [0, 1], scale: [0.3, 1], translate: [`${x}px ${y}px`, '0px 0px'] }, { duration: 1300, delay: 100 * i, easing: ease }])
  })
  const kicker = root.querySelector('[data-part="kicker"]')
  if (kicker) steps.push([kicker, { opacity: [0, 1], translate: ['0px 20px', '0px 0px'] }, { duration: 700, delay: 150, easing: ease }])

  const words = all(root, '[data-word-inner]')
  words.forEach((w, i) => {
    steps.push([w, { opacity: [0, 1], translate: ['0 115%', '0 0'] }, { duration: 850, delay: 350 + i * 100, easing: ease }])
  })
  const tail = 350 + words.length * 100
  const rule = root.querySelector('[data-part="rule"]')
  if (rule) {
    const from = isCentered(root) ? 'inset(0 50% 0 50%)' : 'inset(0 100% 0 0)'
    steps.push([rule, { opacity: [1, 1], clipPath: [from, 'inset(0 0% 0 0%)'] }, { duration: 800, delay: tail + 400, easing: 'ease-in-out' }])
  }
  const subtitle = root.querySelector('[data-part="subtitle"]')
  if (subtitle) {
    steps.push([subtitle, { opacity: [0, 1], translate: ['0px 24px', '0px 0px'], filter: ['blur(6px)', 'blur(0px)'] }, { duration: 700, delay: tail + 900, easing: ease }])
  }
  return steps
}

export function animate(root: HTMLElement, rt: BlockMotionRuntime): void | (() => void) {
  return runShowcase(root, rt, { gsap: gsapTimeline, driver: driverSteps })
}
