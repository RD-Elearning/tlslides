/**
 * Motion for tls.c.stat-spotlight.
 *
 * Expressive: the ring spins in while its arc draws to the progress, the number counts up from
 * zero and pops, the label slides in, the context fades, the supporting stats pop with a stagger
 * and count up too. Subtle / reduced motion: `runShowcase` (numbers stay at their final value).
 */

import type { BlockMotionRuntime } from '../../../types'
import { all, runShowcase, type GsapLike, type MotionStepList } from '../_showcase'
import { parseCount } from './schema'

export const STAT_SPOTLIGHT_MS = 2700

/** The supporting-stat parts (`stat[i]`), in order. */
function statParts(root: HTMLElement): HTMLElement[] {
  return all(root, '[data-part]').filter((e) => (e.getAttribute('data-part') ?? '').startsWith('stat['))
}

function arcOf(root: HTMLElement): { el: SVGElement; from: number; to: number } | undefined {
  const el = root.querySelector<SVGElement>('[data-arc]')
  if (!el) return undefined
  const c = Number(el.getAttribute('data-circumference')) || 0
  const p = Number(el.getAttribute('data-progress'))
  return { el, from: c, to: c * (1 - (Number.isFinite(p) ? p : 1)) }
}

/** Count `el`'s text from 0 to its own value; returns a progress writer, or undefined. */
function counter(el: Element | null): ((t: number) => void) | undefined {
  if (!el) return undefined
  const final = el.textContent ?? ''
  const parts = parseCount(final)
  if (!parts) return undefined
  return (t: number) => {
    el.textContent = t >= 1 ? final : parts.format(parts.value * t)
  }
}

function gsapTimeline(root: HTMLElement, gsap: GsapLike, done: () => void, rt: BlockMotionRuntime): () => void {
  const tl = gsap.timeline({ onComplete: done, delay: rt.timing.delayMs / 1000 })
  // Every part owns its opacity in its own fromTo (no blanket set: it would undo the from-states).

  const ring = root.querySelector('[data-part="ring"]')
  if (ring) tl.fromTo(ring, { opacity: 0, scale: 0.6, rotation: -120 }, { opacity: 1, scale: 1, rotation: 0, duration: 1.1, ease: 'power3.out' }, 0)
  const arc = arcOf(root)
  if (arc) tl.fromTo(arc.el, { strokeDashoffset: arc.from }, { strokeDashoffset: arc.to, duration: 1.8, ease: 'power2.inOut' }, 0.2)

  const valueEl = root.querySelector('[data-part="value"]')
  const count = counter(valueEl)
  if (valueEl) tl.fromTo(valueEl, { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1, duration: 0.9, ease: 'back.out(1.7)' }, 0.2)
  if (count) {
    const o = { t: 0 }
    tl.to(o, { t: 1, duration: 1.8, ease: 'power2.out', onUpdate: () => count(o.t), onComplete: () => count(1) }, 0.2)
  }

  const label = root.querySelector('[data-part="label"]')
  if (label) tl.fromTo(label, { opacity: 0, x: -60 }, { opacity: 1, x: 0, duration: 0.8, ease: 'power3.out' }, 0.7)
  const context = root.querySelector('[data-part="context"]')
  if (context) tl.fromTo(context, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' }, 1.0)

  const stats = statParts(root)
  if (stats.length) {
    tl.fromTo(stats, { opacity: 0, scale: 0.6, y: 30 }, { opacity: 1, scale: 1, y: 0, duration: 0.7, ease: 'back.out(2)', stagger: 0.15 }, 1.4)
    stats.forEach((s, i) => {
      const c = counter(s.querySelector('[data-stat-value]'))
      if (!c) return
      const o = { t: 0 }
      tl.to(o, { t: 1, duration: 1.0, ease: 'power2.out', onUpdate: () => c(o.t), onComplete: () => c(1) }, 1.4 + i * 0.15)
    })
  }
  return () => tl.kill()
}

function driverSteps(root: HTMLElement, _rt: BlockMotionRuntime): MotionStepList {
  const steps: MotionStepList = []
  const ease = 'cubic-bezier(0.16, 1, 0.3, 1)'
  const pop = 'cubic-bezier(0.34, 1.56, 0.64, 1)'
  const ring = root.querySelector('[data-part="ring"]')
  if (ring) steps.push([ring, { opacity: [0, 1], scale: [0.6, 1] }, { duration: 1000, easing: ease }])
  const arc = arcOf(root)
  if (arc) steps.push([arc.el, { strokeDashoffset: [`${arc.from}`, `${arc.to}`] }, { duration: 1800, delay: 200, easing: 'ease-in-out' }])
  const valueEl = root.querySelector('[data-part="value"]')
  if (valueEl) {
    const count = counter(valueEl)
    steps.push([valueEl, { opacity: [0, 1], scale: [0.5, 1] }, { duration: 1800, delay: 200, easing: ease, ...(count ? { onUpdate: count } : {}) }])
  }
  const label = root.querySelector('[data-part="label"]')
  if (label) steps.push([label, { opacity: [0, 1], translate: ['-60px 0px', '0px 0px'] }, { duration: 800, delay: 700, easing: ease }])
  const context = root.querySelector('[data-part="context"]')
  if (context) steps.push([context, { opacity: [0, 1], translate: ['0px 18px', '0px 0px'] }, { duration: 700, delay: 1000, easing: ease }])
  statParts(root).forEach((s, i) => {
    const c = counter(s.querySelector('[data-stat-value]'))
    steps.push([s, { opacity: [0, 1], scale: [0.6, 1], translate: ['0px 30px', '0px 0px'] }, { duration: 900, delay: 1400 + i * 150, easing: pop, ...(c ? { onUpdate: c } : {}) }])
  })
  return steps
}

export function animate(root: HTMLElement, rt: BlockMotionRuntime): void | (() => void) {
  return runShowcase(root, rt, { gsap: gsapTimeline, driver: driverSteps })
}
