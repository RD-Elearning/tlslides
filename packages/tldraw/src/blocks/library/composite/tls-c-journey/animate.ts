/**
 * Motion for tls.c.journey.
 *
 * Expressive: the path draws from left to right at a constant speed; each node pops (with a
 * one-shot halo pulse) the moment the line reaches it, and its label rises in from the path side.
 * Subtle / reduced motion: `runShowcase`.
 */

import type { BlockMotionRuntime } from '../../../types'
import { all, runShowcase, type GsapLike, type MotionStepList } from '../_showcase'

/** Path draw time (s) and the whole timeline (ms, for chaining). */
const DRAW_S = 2.6
export const JOURNEY_MS = 3400

interface Stop {
  node: HTMLElement
  label?: HTMLElement
  /** When the line reaches the node, 0-1 of the draw. */
  at: number
  above: boolean
}

function stops(root: HTMLElement): Stop[] {
  const host = root.querySelector<HTMLElement>('[data-journey]')
  const width = host?.offsetWidth || Number(root.querySelector('svg')?.getAttribute('width')) || 1
  return all(root, '[data-part]')
    .filter((e) => (e.getAttribute('data-part') ?? '').startsWith('node['))
    .map((node) => {
      const i = (node.getAttribute('data-part') ?? '').slice(5, -1)
      const label = root.querySelector<HTMLElement>(`[data-part="label[${i}]"]`) ?? undefined
      const cx = (parseFloat(node.style.left) || 0) + (parseFloat(node.style.width) || 0) / 2
      return { node, label, at: Math.min(1, Math.max(0, cx / width)), above: !!label?.style.bottom }
    })
}

function pathOf(root: HTMLElement): { el: Element; length: number } | undefined {
  const el = root.querySelector('[data-part="path"]')
  if (!el) return undefined
  return { el, length: Number(el.getAttribute('data-length')) || 0 }
}

function gsapTimeline(root: HTMLElement, gsap: GsapLike, done: () => void, rt: BlockMotionRuntime): () => void {
  const tl = gsap.timeline({ onComplete: done, delay: rt.timing.delayMs / 1000 })
  // Every part owns its opacity in its own fromTo (no blanket set: it would undo the from-states).
  const path = pathOf(root)
  if (path) tl.fromTo(path.el, { strokeDashoffset: path.length, opacity: 1 }, { strokeDashoffset: 0, opacity: 1, duration: DRAW_S, ease: 'none' }, 0)
  for (const s of stops(root)) {
    const t = s.at * DRAW_S
    tl.fromTo(s.node, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.55, ease: 'back.out(3)' }, Math.max(0, t - 0.08))
    const halo = s.node.querySelector('[data-halo]')
    if (halo) tl.fromTo(halo, { scale: 0.6, opacity: 0.9 }, { scale: 2.2, opacity: 0, duration: 0.9, ease: 'power2.out' }, t)
    if (s.label) tl.fromTo(s.label, { opacity: 0, y: s.above ? 28 : -28 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, t + 0.12)
  }
  // Leave the halos at rest after their pulse.
  const halos = all(root, '[data-halo]')
  if (halos.length) tl.set(halos, { scale: 1, opacity: 1 }, DRAW_S + 0.8)
  return () => tl.kill()
}

function driverSteps(root: HTMLElement, _rt: BlockMotionRuntime): MotionStepList {
  const steps: MotionStepList = []
  const path = pathOf(root)
  const drawMs = DRAW_S * 1000
  if (path) steps.push([path.el, { opacity: [1, 1], strokeDashoffset: [`${path.length}`, '0'] }, { duration: drawMs, easing: 'linear' }])
  for (const s of stops(root)) {
    const t = s.at * drawMs
    steps.push([s.node, { opacity: [0, 1], scale: [0, 1] }, { duration: 550, delay: Math.max(0, t - 80), easing: 'cubic-bezier(0.34, 1.8, 0.64, 1)' }])
    if (s.label) {
      steps.push([s.label, { opacity: [0, 1], translate: [s.above ? '0px 28px' : '0px -28px', '0px 0px'] }, { duration: 600, delay: t + 120, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }])
    }
  }
  return steps
}

export function animate(root: HTMLElement, rt: BlockMotionRuntime): void | (() => void) {
  return runShowcase(root, rt, { gsap: gsapTimeline, driver: driverSteps })
}
