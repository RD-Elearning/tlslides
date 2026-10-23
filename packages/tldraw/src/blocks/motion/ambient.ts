/**
 * V2 (spro vivid PLAN.md §4) — ambient motion: the slow loops that keep a built slide alive (a
 * decoration that floats, a ring that turns, sparkles that twinkle).
 *
 * Kept apart from `MOTION_PRESETS` on purpose: those are entrances the timeline plans and the AI
 * picks; a loop never takes part in a build, never chains, and is chosen by the block (its recipe's
 * `ambient`, e.g. by decoration shape), not by the model.
 *
 * Rules (the plan's §2):
 * - presentation only: layout, checks and renders never see a loop;
 * - it starts once the block has entered, stops when the slide changes;
 * - off under reduced motion and on a slide that does not move (`static`, no motion style), calmer
 *   under `subtle` (smaller amplitude, longer period);
 * - only the allowed vocabulary (translate, rotate, scale, opacity) and never on the shape wrapper
 *   (its entrance owns it): on the block's paint root, or on its indexed parts.
 *
 * `resolveAmbient` is pure; `startAmbient` is the only DOM code.
 */

import type { AmbientRecipe, BlockDefinition, BlockSpec, MotionStyle } from '../types'
import type { MotionDriver, MotionHandle, MotionKeyframes } from './driver'

export const AMBIENT_IDS = ['float', 'drift', 'spin', 'sway', 'pulse', 'twinkle', 'bob'] as const
export type AmbientId = (typeof AMBIENT_IDS)[number]

export function isAmbientId(v: unknown): v is AmbientId {
  return typeof v === 'string' && (AMBIENT_IDS as readonly string[]).includes(v)
}

/** The loop easing (`sine.inOut` in GSAP): slows at both ends, so a float rises and settles. */
export const AMBIENT_EASE = 'cubic-bezier(0.37, 0, 0.63, 1)'

export interface AmbientPreset {
  id: AmbientId
  /** Keyframes at amplitude `amp` (1 = expressive). Two values: the loop runs between them. */
  keyframes: (amp: number) => MotionKeyframes
  /** One run (one way for an alternating loop), in ms. */
  periodMs: number
  /** `alternate` goes there and back; `normal` restarts (a full turn). */
  direction: 'alternate' | 'normal'
  easing: string
  /** `transform-origin` for rotate / scale (about the element's own box). */
  origin?: string
}

/** Distances are slide units (the viewer scales the slide), sized for a 1920-wide slide. */
export const AMBIENT_PRESETS: Readonly<Record<AmbientId, AmbientPreset>> = {
  float: { id: 'float', keyframes: (a) => ({ translate: ['0px 0px', `0px ${-16 * a}px`] }), periodMs: 3600, direction: 'alternate', easing: AMBIENT_EASE },
  drift: { id: 'drift', keyframes: (a) => ({ translate: ['0px 0px', `${22 * a}px ${-14 * a}px`] }), periodMs: 6400, direction: 'alternate', easing: AMBIENT_EASE },
  spin: { id: 'spin', keyframes: () => ({ rotate: ['0deg', '360deg'] }), periodMs: 40000, direction: 'normal', easing: 'linear', origin: '50% 50%' },
  sway: { id: 'sway', keyframes: (a) => ({ rotate: [`${-5 * a}deg`, `${5 * a}deg`] }), periodMs: 3200, direction: 'alternate', easing: AMBIENT_EASE, origin: '50% 50%' },
  pulse: { id: 'pulse', keyframes: (a) => ({ scale: [1, 1 + 0.06 * a] }), periodMs: 2200, direction: 'alternate', easing: AMBIENT_EASE, origin: '50% 50%' },
  twinkle: { id: 'twinkle', keyframes: (a) => ({ opacity: [1, 1 - 0.6 * a] }), periodMs: 1600, direction: 'alternate', easing: AMBIENT_EASE },
  bob: { id: 'bob', keyframes: (a) => ({ translate: ['0px 0px', `0px ${-9 * a}px`] }), periodMs: 2400, direction: 'alternate', easing: AMBIENT_EASE },
}

/** What `subtle` does to a loop: a smaller amplitude and a longer period. */
export const SUBTLE_AMP = 0.55
export const SUBTLE_PERIOD = 1.5

export interface ResolvedAmbient {
  preset: AmbientPreset
  /** `undefined` = the block's paint root; else the indexed parts `name`, `name[0]`, `name[1]`… */
  part?: string
  /** Phase offset between indexed parts, in ms. */
  staggerMs: number
  amp: number
  periodMs: number
}

/**
 * The loop a block plays, or `null`.
 *
 * @param block  the block spec (its `motion.ambient.preset` wins: an ambient id, or `'none'`)
 * @param def    its definition (`motion.ambient`: a recipe, or a function of the props)
 * @param style  the motion style the block's slide plays in; absent or `static` = no loop
 * @param reducedMotion  the viewer's `prefers-reduced-motion`
 */
export function resolveAmbient(
  block: Pick<BlockSpec, 'props' | 'motion'>,
  def: Pick<BlockDefinition, 'motion'> | undefined,
  style: MotionStyle | undefined,
  reducedMotion = false
): ResolvedAmbient | null {
  if (reducedMotion || !style || style === 'static') return null
  const own = block.motion?.ambient?.preset
  if (own === 'none') return null
  const fromDef = def?.motion?.ambient
  const recipe: AmbientRecipe | null | undefined =
    typeof fromDef === 'function' ? fromDef((block.props ?? {}) as Record<string, unknown>) : fromDef
  const id = isAmbientId(own) ? own : recipe?.preset
  if (!isAmbientId(id)) return null
  const preset = AMBIENT_PRESETS[id]
  const subtle = style === 'subtle'
  const ownPeriod = typeof block.motion?.ambient?.duration === 'number' ? block.motion.ambient.duration : undefined
  const base = ownPeriod ?? recipe?.periodMs ?? preset.periodMs
  return {
    preset,
    part: recipe?.part,
    staggerMs: recipe?.stagger ?? 0,
    amp: (recipe?.amp ?? 1) * (subtle ? SUBTLE_AMP : 1),
    periodMs: Math.round(base * (subtle ? SUBTLE_PERIOD : 1)),
  }
}

/** The elements a loop moves: the parts `name` / `name[i]` in document order, else the paint root. */
export function ambientTargets(root: Element, part: string | undefined): Element[] {
  if (!part) return [root]
  const out: Element[] = []
  const all = root.querySelectorAll('[data-part]')
  for (let i = 0; i < all.length; i++) {
    const p = all[i].getAttribute('data-part') ?? ''
    if (p === part || (p.startsWith(part + '[') && p.endsWith(']') && !p.slice(part.length + 1, -1).includes('.'))) out.push(all[i])
  }
  return out
}

/**
 * Start a resolved loop on `root` (the block's paint root, inside the shape wrapper). Returns the
 * stopper. A loop on an SVG part turns about its own box (`transform-box: fill-box`).
 */
export function startAmbient(root: Element, ambient: ResolvedAmbient, driver: MotionDriver): () => void {
  const targets = ambientTargets(root, ambient.part)
  const handles: MotionHandle[] = []
  targets.forEach((el, i) => {
    const style = (el as HTMLElement | SVGElement).style
    if (style && typeof SVGElement !== 'undefined' && el instanceof SVGElement) style.setProperty('transform-box', 'fill-box')
    // a phase offset per part, and a period that differs a little, so a cluster never moves in step
    const period = Math.round(ambient.periodMs * (1 + ((i * 7) % 5) * 0.06))
    handles.push(
      driver.play(el, ambient.preset.keyframes(ambient.amp), {
        duration: period,
        delay: i * ambient.staggerMs,
        easing: ambient.preset.easing,
        iterations: Infinity,
        direction: ambient.preset.direction,
        fill: 'both',
        ...(ambient.preset.origin ? { origin: ambient.preset.origin } : {}),
      })
    )
  })
  return () => handles.forEach((h) => h.cancel())
}
