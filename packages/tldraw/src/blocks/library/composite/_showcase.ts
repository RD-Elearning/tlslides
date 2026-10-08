/**
 * P7 — shared runtime for the showcase html blocks (`tls.c.kinetic-title`, `tls.c.stat-spotlight`,
 * `tls.c.journey`, `tls.c.feature-reveal`).
 *
 * Every showcase `animate()` follows the same contract, written once here:
 * - `rt.reducedMotion` → settle to the final state, `onComplete()` at once.
 * - `rt.style === 'subtle'` → one calm fade of every part, numbers already final.
 * - otherwise (expressive, also when `style` is absent) → the block's GSAP timeline when
 *   `rt.gsap` is a GSAP-like object, else its driver fallback.
 * - `onComplete()` is called exactly once on every path; a disposer is returned.
 * - Never touches `root.style.transform` (the shape wrapper owns it): only descendants move.
 *
 * Also holds the small poster/template helpers the four blocks share (colours, icons, a
 * transparent full-box backdrop that keeps the DOM/SVG parity probe honest).
 */

import type { BlockMotionRuntime, HtmlTemplateContext, LayoutContext, LayoutNode, ResolvedTokens } from '../../types'
import type { MotionHandle, MotionKeyframes, MotionOptions } from '../../motion/driver'
import { FALLBACK_ICON, getIcon } from '../../icons'
import { lineWidth } from './_kit'

/* ── GSAP, typed structurally (the package never imports gsap) ─────────────────────────── */

export interface GsapTimelineLike {
  to(target: unknown, vars: Record<string, unknown>, position?: number | string): GsapTimelineLike
  fromTo(target: unknown, from: Record<string, unknown>, to: Record<string, unknown>, position?: number | string): GsapTimelineLike
  set(target: unknown, vars: Record<string, unknown>, position?: number | string): GsapTimelineLike
  kill(): void
}

export interface GsapLike {
  timeline(vars?: Record<string, unknown>): GsapTimelineLike
}

export function asGsap(value: unknown): GsapLike | undefined {
  return value && typeof value === 'object' && typeof (value as GsapLike).timeline === 'function'
    ? (value as GsapLike)
    : undefined
}

/* ── animate() contract ────────────────────────────────────────────────────────────────── */

export interface ShowcaseAnimation {
  /** The showy GSAP timeline. Call `done` exactly when it finishes (the timeline's onComplete). */
  gsap(root: HTMLElement, gsap: GsapLike, done: () => void, rt: BlockMotionRuntime): () => void
  /** The same idea with the motion driver only (opacity, translate, scale, clip-path, filter). */
  driver(root: HTMLElement, rt: BlockMotionRuntime): MotionStepList
}

/** One driver animation: element, keyframes, options. */
export type MotionStepList = Array<[Element, MotionKeyframes, MotionOptions]>

/** Wrap `fn` so only its first call has an effect. */
export function once(fn: () => void): () => void {
  let called = false
  return () => {
    if (called) return
    called = true
    fn()
  }
}

/** Make every part visible again (the viewer hides `[data-part]` before `animate()`). */
export function settleParts(root: HTMLElement): void {
  const parts = root.querySelectorAll<HTMLElement>('[data-part]')
  for (let i = 0; i < parts.length; i++) parts[i].style.opacity = ''
}

/** Play a list of driver steps; `done` after every one has finished. Returns a disposer. */
export function playSteps(rt: BlockMotionRuntime, steps: MotionStepList, done: () => void): () => void {
  if (steps.length === 0) {
    done()
    return () => undefined
  }
  const handles: MotionHandle[] = steps.map(([el, kf, opts]) =>
    // `both`: an element waiting out its delay already shows its first keyframe (hidden), not its final state.
    rt.driver.play(el, kf, { fill: 'both', ...opts, delay: (opts.delay ?? 0) + rt.timing.delayMs })
  )
  Promise.all(handles.map((h) => h.finished)).then(done, done)
  return () => handles.forEach((h) => h.cancel())
}

/**
 * The shared `animate()` entry point. See the module comment for the contract.
 */
export function runShowcase(root: HTMLElement, rt: BlockMotionRuntime, anim: ShowcaseAnimation): void | (() => void) {
  const done = once(() => rt.onComplete())

  if (rt.reducedMotion) {
    settleParts(root)
    done()
    return
  }

  if (rt.style === 'subtle') {
    const parts = Array.from(root.querySelectorAll<HTMLElement>('[data-part]'))
    // The part opacity the viewer set inline must not fight the fade's fill.
    const steps: MotionStepList = parts.map((p) => [p, { opacity: [0, 1] }, { duration: 400, easing: 'ease-out' }])
    return playSteps(rt, steps, done)
  }

  const gsap = asGsap(rt.gsap)
  if (gsap) {
    let dispose: () => void = () => undefined
    try {
      dispose = anim.gsap(root, gsap, done, rt)
    } catch {
      settleParts(root)
      done()
    }
    return () => dispose()
  }

  let steps: MotionStepList = []
  try {
    steps = anim.driver(root, rt)
  } catch {
    settleParts(root)
  }
  return playSteps(rt, steps, done)
}

/** All elements under `root` matching `selector`, as an array. */
export function all(root: ParentNode, selector: string): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(selector))
}

/* ── template helpers ──────────────────────────────────────────────────────────────────── */

/** A CSS colour for a role the host does not publish as a variable (accent2, surfaceAlt, line). */
export function roleVar(ctx: HtmlTemplateContext, role: 'accent2' | 'surfaceAlt' | 'line', cssName: string): string {
  const hex = ctx.tokens?.color?.[role]
  return hex ? `var(--tls-${cssName}, ${hex})` : `var(--tls-${cssName})`
}

/** Inline outline icon (24-unit path scaled by the viewBox), stroke in `color`. */
export function iconSvg(name: string, size: number, color: string): string {
  const path = (getIcon(name) ?? FALLBACK_ICON).path
  return (
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" style="display:block;overflow:visible" aria-hidden="true">` +
    `<path d="${path}" fill="none" stroke="${color}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  )
}

/** Font sizes from the deck's type scale (slide units = CSS px inside the frame). */
export function typeSize(tokens: ResolvedTokens | undefined, token: keyof ResolvedTokens['type'], fallback: number): number {
  return tokens?.type?.[token]?.size ?? fallback
}

/* ── poster helpers ────────────────────────────────────────────────────────────────────── */

/** A transparent rect over the whole block: SVG export shows the slide behind it, and the
 *  root group's bounding box equals the host box, which is what the parity probe measures. */
export function backdrop(width: number, height: number): LayoutNode {
  return { k: 'rect', box: { x: 0, y: 0, width, height }, fill: { type: 'solid', color: 'rgba(0,0,0,0)' } }
}

/** Finite, non-negative number or the fallback. */
export function safe(n: unknown, fallback = 0): number {
  return typeof n === 'number' && Number.isFinite(n) ? Math.max(0, n) : fallback
}

/** Plain string from a possibly missing / non-string prop. */
export function str(v: unknown, max = 400): string {
  return typeof v === 'string' ? v.slice(0, max) : typeof v === 'number' ? String(v) : ''
}

/** A colour role resolved for the poster. */
export function color(ctx: LayoutContext, role: string): string {
  return ctx.resolveColor(role).color
}

/**
 * One text node per line, each centred in the node's box. `alignText` (in `_kit`) centres with
 * the regular-weight glyph table; bold text renders 10-20% wider than that, so a centred bold line
 * drifted right (and could leave the box in SVG). `bold` takes the wider of the estimate and the
 * table x 1.12.
 */
export function centerLines(n: Extract<LayoutNode, { k: 'text' }>, bold: boolean): LayoutNode[] {
  const lh = n.style.size * n.style.lineHeight
  return n.lines.map((line, i) => {
    const top = line.top ?? i * lh
    const table = lineWidth(line.text.trimEnd(), n.style)
    const lw = Math.min(n.box.width, bold ? Math.max(line.width, table * 1.12) : table || line.width)
    return {
      ...n,
      box: { x: n.box.x + (n.box.width - lw) / 2, y: n.box.y + top, width: Math.max(1, lw + 1), height: lh },
      lines: [{ ...line, top: 0, baseline: line.baseline - top }],
    } as LayoutNode
  })
}
