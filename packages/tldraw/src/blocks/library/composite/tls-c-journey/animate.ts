/**
 * Motion for tls.c.journey.
 *
 * Expressive: the path draws from left to right on an out ease (quick start, settling at the
 * end); each node pops, with its halo opening behind it, the moment the line reaches it, and its
 * label rises in from the path side. Subtle / reduced motion: `runShowcase`.
 *
 * RVM4 (MOTION.md J1/J3/J5): the draw was 2.6 s at a constant (linear) speed, nodes overshot to
 * scale with `back.out(3)`, and each halo pulsed out to opacity 0 and was then *set* back to its
 * resting opacity 1 at the end (a visible snap, and the block ran 3.4 s). Now the draw is 900 ms
 * eased out, nodes are timed by the inverse of that ease, halos ease into their rest state, and
 * the whole timeline ends within 1.6 s.
 */

import type { BlockMotionRuntime } from '../../../types'
import { all, runShowcase, type GsapLike, type MotionStepList } from '../_showcase'

/** Path draw time (s) and the whole timeline (ms, for chaining). */
const DRAW_S = 0.9
export const JOURNEY_MS = 1600
/** The draw's ease (quadratic out) and when it reaches `p` (0–1) of the path, as 0–1 of the draw. */
const DRAW_EASE = 'power1.out'
const DRAW_CSS = 'cubic-bezier(0.5, 1, 0.89, 1)'
const reachAt = (p: number) => 1 - Math.sqrt(Math.max(0, 1 - p))

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

/** The dotted guide track under the path. RVM6: a part that fades in first; it was not a part
 *  and appeared in one frame when the block was shown (J1). */
function trackOf(root: HTMLElement): Element | undefined {
  return root.querySelector('[data-part="track"]') ?? undefined
}

function gsapTimeline(root: HTMLElement, gsap: GsapLike, done: () => void, rt: BlockMotionRuntime): () => void {
  const tl = gsap.timeline({ onComplete: done, delay: rt.timing.delayMs / 1000 })
  // Every part owns its opacity in its own fromTo (no blanket set: it would undo the from-states).
  const path = pathOf(root)
  const track = trackOf(root)
  if (track) tl.fromTo(track, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out' }, 0)
  if (path) tl.fromTo(path.el, { strokeDashoffset: path.length, opacity: 1 }, { strokeDashoffset: 0, opacity: 1, duration: DRAW_S, ease: DRAW_EASE }, 0)
  for (const s of stops(root)) {
    const t = reachAt(s.at) * DRAW_S
    tl.fromTo(s.node, { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(1.6)' }, Math.max(0, t - 0.05))
    const halo = s.node.querySelector('[data-halo]')
    if (halo) tl.fromTo(halo, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'power2.out' }, t)
    if (s.label) tl.fromTo(s.label, { opacity: 0, y: s.above ? 16 : -16 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' }, t + 0.1)
  }
  return () => tl.kill()
}

function driverSteps(root: HTMLElement, _rt: BlockMotionRuntime): MotionStepList {
  const steps: MotionStepList = []
  const path = pathOf(root)
  const drawMs = DRAW_S * 1000
  const track = trackOf(root)
  if (track) steps.push([track, { opacity: [0, 1] }, { duration: 300, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }])
  if (path) steps.push([path.el, { opacity: [1, 1], strokeDashoffset: [`${path.length}`, '0'] }, { duration: drawMs, easing: DRAW_CSS }])
  for (const s of stops(root)) {
    const t = reachAt(s.at) * drawMs
    steps.push([s.node, { opacity: [0, 1], scale: [0.4, 1] }, { duration: 450, delay: Math.max(0, t - 50), easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }])
    if (s.label) {
      steps.push([s.label, { opacity: [0, 1], translate: [s.above ? '0px 16px' : '0px -16px', '0px 0px'] }, { duration: 450, delay: t + 100, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }])
    }
  }
  return steps
}

export function animate(root: HTMLElement, rt: BlockMotionRuntime): void | (() => void) {
  return runShowcase(root, rt, { gsap: gsapTimeline, driver: driverSteps })
}
