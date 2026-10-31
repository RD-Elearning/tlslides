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
 * - `none` and reduced motion — an instant cut.
 */
import type { MotionPersonality, SlideTransition } from '../types'
import { personalityOf } from './personality'

export const TRANSITION_KINDS = ['none', 'fade', 'push', 'wipe', 'flip'] as const
export const TRANSITION_DIRS = ['left', 'right', 'up', 'down'] as const

export interface TransitionPlan {
  keyframes: Keyframe[]
  durationMs: number
  easing: string
}

const BASE_MS: Record<string, number> = { fade: 420, push: 520, wipe: 560, flip: 460 }

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
    default:
      return { keyframes: [{ opacity: 0 }, { opacity: 1 }], durationMs, easing }
  }
}
