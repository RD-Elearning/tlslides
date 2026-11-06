/**
 * spro creative PLAN CR10 — slide transitions: how the viewer brings a slide in (`SlideSpec.transition`).
 * Viewer-only: renders, checks and exports never read it. Pure and DOM-free: the viewer plays the
 * keyframes with WAAPI on the slide's frame.
 *
 * - `fade` — opacity in;
 * - `push` — the slide slides in from `dir` (default right);
 * - `wipe` — a clip-path inset uncovers it from `dir`;
 * - `flip` — the continuity transition (a block kept between slides): played as a cross-fade until
 *   the Flip plugin lands (Phase R);
 * - sprint 2026-11b S15-b, all played on the incoming frame (the viewer keeps no second layer):
 *   `zoom` — scale 1.04→1 + opacity (`dir: 'down'` zooms from 0.96); `cover` — slides in from `dir` over 60 % of the
 *   distance while it fades in, so it reads as covering the old slide; `reveal` — a softer wipe from `dir` with an opacity
 *   ramp; `split` — two clip halves open from the centre (`dir` up/down opens vertically); `morph` — a short cross-fade for
 *   a pair of slides that share their layout and title position (the title does not move, so only the body changes visibly);
 * - `none` and reduced motion — an instant cut.
 */
import type { MotionPersonality, SlideTransition } from '../types'
import { personalityOf } from './personality'

export const TRANSITION_KINDS = ['none', 'fade', 'push', 'wipe', 'flip', 'zoom', 'cover', 'reveal', 'split', 'morph'] as const
export const TRANSITION_DIRS = ['left', 'right', 'up', 'down'] as const

export interface TransitionPlan {
  keyframes: Keyframe[]
  durationMs: number
  easing: string
}

const BASE_MS: Record<string, number> = { fade: 420, push: 520, wipe: 560, flip: 460, zoom: 480, cover: 560, reveal: 560, split: 600, morph: 260 }

/** The keyframes that bring a slide in, or `undefined` for a cut. */
export function transitionPlan(t: SlideTransition | undefined, personality?: MotionPersonality, reducedMotion = false): TransitionPlan | undefined {
  if (!t || t.kind === 'none' || reducedMotion || !(TRANSITION_KINDS as readonly string[]).includes(t.kind)) return undefined
  const p = personalityOf(personality)
  const durationMs = Math.round((BASE_MS[t.kind] ?? 420) * p.duration)
  const easing = p.transitionEase
  const dir = t.dir ?? 'right'
  switch (t.kind) {
    case 'push': {
      // the individual `translate` property: it composes with the frame's own centring transform
      const from = { left: '-100% 0', right: '100% 0', up: '0 -100%', down: '0 100%' }[dir]
      return { keyframes: [{ translate: from }, { translate: '0 0' }], durationMs, easing }
    }
    case 'wipe': {
      const from = { left: 'inset(0% 0% 0% 100%)', right: 'inset(0% 100% 0% 0%)', up: 'inset(100% 0% 0% 0%)', down: 'inset(0% 0% 100% 0%)' }[dir]
      return { keyframes: [{ clipPath: from }, { clipPath: 'inset(0% 0% 0% 0%)' }], durationMs, easing }
    }
    case 'zoom':
      return { keyframes: [{ scale: dir === 'down' ? 0.96 : 1.04, opacity: 0 }, { scale: 1, opacity: 1 }], durationMs, easing }
    case 'cover': {
      const from = { left: '-60% 0', right: '60% 0', up: '0 -60%', down: '0 60%' }[dir]
      return { keyframes: [{ translate: from, opacity: 0 }, { translate: '0 0', opacity: 1 }], durationMs, easing }
    }
    case 'reveal': {
      const from = { left: 'inset(0% 0% 0% 100%)', right: 'inset(0% 100% 0% 0%)', up: 'inset(100% 0% 0% 0%)', down: 'inset(0% 0% 100% 0%)' }[dir]
      return { keyframes: [{ clipPath: from, opacity: 0.4 }, { clipPath: 'inset(0% 0% 0% 0%)', opacity: 1 }], durationMs, easing }
    }
    case 'split': {
      const vertical = dir === 'up' || dir === 'down'
      return { keyframes: [{ clipPath: vertical ? 'inset(50% 0% 50% 0%)' : 'inset(0% 50% 0% 50%)' }, { clipPath: 'inset(0% 0% 0% 0%)' }], durationMs, easing }
    }
    default:
      return { keyframes: [{ opacity: 0 }, { opacity: 1 }], durationMs, easing }
  }
}

/** S15-b: whether slide `b` may play `morph` after slide `a` — the same layout and a title box within `tol` slide units
 *  (the title stays still, so only the body visibly changes). Pure over the two compiled title boxes. */
export function canMorph(a: { layout?: string; title?: { x: number; y: number; w: number; h: number } }, b: { layout?: string; title?: { x: number; y: number; w: number; h: number } }, tol = 2): boolean {
  if (!a.layout || a.layout !== b.layout || !a.title || !b.title) return false
  return (['x', 'y', 'w', 'h'] as const).every((k) => Math.abs(a.title![k] - b.title![k]) <= tol)
}
