/**
 * Motion for tls.c.feature-reveal.
 *
 * Expressive: cards flip up from a 3D tilt (alternating left/right yaw) with a staggered
 * overshoot, each icon bounces in with an elastic spin, titles and texts rise after their card.
 * Subtle / reduced motion: `runShowcase`.
 */

import type { BlockMotionRuntime } from '../../../types'
import { all, runShowcase, type GsapLike, type MotionStepList } from '../_showcase'

export const FEATURE_REVEAL_MS = 2400

function family(root: HTMLElement, name: string): HTMLElement[] {
  return all(root, '[data-part]').filter((e) => (e.getAttribute('data-part') ?? '').startsWith(`${name}[`))
}

function gsapTimeline(root: HTMLElement, gsap: GsapLike, done: () => void, rt: BlockMotionRuntime): () => void {
  const tl = gsap.timeline({ onComplete: done, delay: rt.timing.delayMs / 1000 })
  tl.set(all(root, '[data-part]'), { opacity: 1 }, 0)
  const cards = family(root, 'card')
  cards.forEach((card, i) => {
    tl.fromTo(
      card,
      { opacity: 0, rotationX: -70, rotationY: i % 2 ? 22 : -22, y: 90, scale: 0.82, transformOrigin: '50% 100%' },
      { opacity: 1, rotationX: 0, rotationY: 0, y: 0, scale: 1, duration: 1.0, ease: 'back.out(1.4)' },
      i * 0.14
    )
  })
  family(root, 'icon').forEach((icon, i) => {
    tl.fromTo(icon, { scale: 0, rotation: -40 }, { scale: 1, rotation: 0, duration: 0.9, ease: 'elastic.out(1, 0.45)' }, 0.35 + i * 0.14)
  })
  const texts = [...family(root, 'title'), ...family(root, 'text')]
  texts.forEach((el) => {
    const i = Number(/\[(\d+)\]/.exec(el.getAttribute('data-part') ?? '')?.[1] ?? 0)
    const isTitle = (el.getAttribute('data-part') ?? '').startsWith('title')
    tl.fromTo(el, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 0.5 + i * 0.14 + (isTitle ? 0 : 0.12))
  })
  return () => tl.kill()
}

function driverSteps(root: HTMLElement, _rt: BlockMotionRuntime): MotionStepList {
  const steps: MotionStepList = []
  const back = 'cubic-bezier(0.34, 1.4, 0.64, 1)'
  const smooth = 'cubic-bezier(0.16, 1, 0.3, 1)'
  family(root, 'card').forEach((card, i) => {
    steps.push([card, { opacity: [0, 1], translate: ['0px 90px', '0px 0px'], scale: [0.82, 1] }, { duration: 1000, delay: i * 140, easing: back }])
  })
  family(root, 'icon').forEach((icon, i) => {
    steps.push([icon, { opacity: [0, 1], scale: [0, 1] }, { duration: 800, delay: 350 + i * 140, easing: 'cubic-bezier(0.34, 2.2, 0.64, 1)' }])
  })
  for (const el of [...family(root, 'title'), ...family(root, 'text')]) {
    const part = el.getAttribute('data-part') ?? ''
    const i = Number(/\[(\d+)\]/.exec(part)?.[1] ?? 0)
    steps.push([el, { opacity: [0, 1], translate: ['0px 24px', '0px 0px'] }, { duration: 600, delay: 500 + i * 140 + (part.startsWith('title') ? 0 : 120), easing: smooth }])
  }
  return steps
}

export function animate(root: HTMLElement, rt: BlockMotionRuntime): void | (() => void) {
  return runShowcase(root, rt, { gsap: gsapTimeline, driver: driverSteps })
}
