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

/** RVM3: the whole expressive timeline (was 2700 with a 1.8 s arc and count, 150 ms stagger). */
export const STAT_SPOTLIGHT_MS = 2100

/** RVM3 timing (J5: each tween 150–900 ms on an out ease, per-item stagger <= 120 ms). */
export const SPOT = {
  ring: { at: 0, dur: 0.7 },
  arc: { at: 0.15, dur: 0.9 },
  value: { at: 0.15, dur: 0.6 },
  count: { at: 0.15, dur: 0.9 },
  label: { at: 0.5, dur: 0.6 },
  context: { at: 0.7, dur: 0.6 },
  stats: { at: 1.0, dur: 0.6, stagger: 0.12, count: 0.8 },
} as const

/** The supporting-stat parts (`stat[i]`), in order. */
function statParts(root: HTMLElement): HTMLElement[] {
  return all(root, '[data-part]').filter((e) => (e.getAttribute('data-part') ?? '').startsWith('stat['))
}

/** The progress arc: dashed to its own length, drawn from that length (empty) to 0 (full). */
function arcOf(root: HTMLElement): { el: SVGElement; from: number; to: number } | undefined {
  const el = root.querySelector<SVGElement>('[data-arc]')
  if (!el) return undefined
  return { el, from: Number(el.getAttribute('data-length')) || 0, to: 0 }
}

/** Count `el`'s text from 0 to its own value; returns a progress writer, or undefined. */
function counter(el: Element | null): ((t: number) => void) | undefined {
  if (!el) return undefined
  const final = el.textContent ?? ''
  const parts = parseCount(final)
  if (!parts) return undefined
  // the part element (it inherits), so the count touches no element the timeline does not
  const host = ((el as HTMLElement).closest?.('[data-part]') ?? el) as HTMLElement
  const numeric = host.style?.fontVariantNumeric ?? ''
  return (t: number) => {
    // tabular figures while counting (the value is tabular already; supporting stats are not)
    if (host.style) host.style.fontVariantNumeric = t >= 1 ? numeric : 'tabular-nums'
    el.textContent = t >= 1 ? final : parts.format(parts.value * t)
  }
}

function gsapTimeline(root: HTMLElement, gsap: GsapLike, done: () => void, rt: BlockMotionRuntime): () => void {
  const tl = gsap.timeline({ onComplete: done, delay: rt.timing.delayMs / 1000 })
  // Every part owns its opacity in its own fromTo (no blanket set: it would undo the from-states).

  const ring = root.querySelector('[data-part="ring"]')
  if (ring) tl.fromTo(ring, { opacity: 0, scale: 0.85, rotation: -45 }, { opacity: 1, scale: 1, rotation: 0, duration: SPOT.ring.dur, ease: 'power3.out' }, SPOT.ring.at)
  const arc = arcOf(root)
  if (arc) tl.fromTo(arc.el, { strokeDashoffset: arc.from }, { strokeDashoffset: arc.to, duration: SPOT.arc.dur, ease: 'power2.out' }, SPOT.arc.at)

  const valueEl = root.querySelector('[data-part="value"]')
  const count = counter(valueEl)
  if (valueEl) tl.fromTo(valueEl, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: SPOT.value.dur, ease: 'back.out(1.4)' }, SPOT.value.at)
  if (count) {
    const o = { t: 0 }
    tl.to(o, { t: 1, duration: SPOT.count.dur, ease: 'power2.out', onUpdate: () => count(o.t), onComplete: () => count(1) }, SPOT.count.at)
  }

  const label = root.querySelector('[data-part="label"]')
  if (label) tl.fromTo(label, { opacity: 0, x: -36 }, { opacity: 1, x: 0, duration: SPOT.label.dur, ease: 'power3.out' }, SPOT.label.at)
  const context = root.querySelector('[data-part="context"]')
  if (context) tl.fromTo(context, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: SPOT.context.dur, ease: 'power2.out' }, SPOT.context.at)

  const stats = statParts(root)
  if (stats.length) {
    tl.fromTo(stats, { opacity: 0, scale: 0.9, y: 24 }, { opacity: 1, scale: 1, y: 0, duration: SPOT.stats.dur, ease: 'back.out(1.6)', stagger: SPOT.stats.stagger }, SPOT.stats.at)
    stats.forEach((s, i) => {
      const c = counter(s.querySelector('[data-stat-value]'))
      if (!c) return
      const o = { t: 0 }
      tl.to(o, { t: 1, duration: SPOT.stats.count, ease: 'power2.out', onUpdate: () => c(o.t), onComplete: () => c(1) }, SPOT.stats.at + i * SPOT.stats.stagger)
    })
  }
  return () => tl.kill()
}

function driverSteps(root: HTMLElement, _rt: BlockMotionRuntime): MotionStepList {
  const steps: MotionStepList = []
  const ease = 'cubic-bezier(0.16, 1, 0.3, 1)'
  const pop = 'cubic-bezier(0.34, 1.36, 0.64, 1)'
  const ms = (s: number) => Math.round(s * 1000)
  const ring = root.querySelector('[data-part="ring"]')
  if (ring) steps.push([ring, { opacity: [0, 1], scale: [0.85, 1] }, { duration: ms(SPOT.ring.dur), delay: ms(SPOT.ring.at), easing: ease }])
  const arc = arcOf(root)
  if (arc) steps.push([arc.el, { strokeDashoffset: [`${arc.from}`, `${arc.to}`] }, { duration: ms(SPOT.arc.dur), delay: ms(SPOT.arc.at), easing: ease }])
  const valueEl = root.querySelector('[data-part="value"]')
  if (valueEl) {
    const count = counter(valueEl)
    steps.push([valueEl, { opacity: [0, 1], scale: [0.8, 1] }, { duration: ms(SPOT.count.dur), delay: ms(SPOT.count.at), easing: ease, ...(count ? { onUpdate: count } : {}) }])
  }
  const label = root.querySelector('[data-part="label"]')
  if (label) steps.push([label, { opacity: [0, 1], translate: ['-36px 0px', '0px 0px'] }, { duration: ms(SPOT.label.dur), delay: ms(SPOT.label.at), easing: ease }])
  const context = root.querySelector('[data-part="context"]')
  if (context) steps.push([context, { opacity: [0, 1], translate: ['0px 18px', '0px 0px'] }, { duration: ms(SPOT.context.dur), delay: ms(SPOT.context.at), easing: ease }])
  statParts(root).forEach((s, i) => {
    const c = counter(s.querySelector('[data-stat-value]'))
    steps.push([s, { opacity: [0, 1], scale: [0.9, 1], translate: ['0px 24px', '0px 0px'] }, { duration: ms(SPOT.stats.count), delay: ms(SPOT.stats.at + i * SPOT.stats.stagger), easing: pop, ...(c ? { onUpdate: c } : {}) }])
  })
  return steps
}

export function animate(root: HTMLElement, rt: BlockMotionRuntime): void | (() => void) {
  return runShowcase(root, rt, { gsap: gsapTimeline, driver: driverSteps })
}
