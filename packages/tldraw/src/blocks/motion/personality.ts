/**
 * spro creative PLAN CR10 — motion personality (`DeckSpec.motionPersonality`): one knob that scales
 * every block reveal's duration and stagger and picks its easing, on top of `motionStyle`
 * (which decides *which* presets play). Viewer-only, like all motion.
 *
 * | personality | duration | stagger | ease |
 * |---|---|---|---|
 * | calm | × 1.2 | × 0.6 | sine |
 * | lively | × 0.85 | × 1.3 | back (pops) |
 * | cinematic | × 1.4 | × 1 | expo |
 */
import type { MotionPersonality } from '../types'

export const MOTION_PERSONALITIES = ['calm', 'lively', 'cinematic'] as const

export interface Personality {
  duration: number
  stagger: number
  /** CSS easing of block reveals. */
  ease: string
  /** CSS easing of slide transitions. */
  transitionEase: string
}

const TABLE: Record<MotionPersonality, Personality> = {
  calm: { duration: 1.2, stagger: 0.6, ease: 'cubic-bezier(0.37, 0, 0.63, 1)', transitionEase: 'cubic-bezier(0.37, 0, 0.63, 1)' },
  lively: { duration: 0.85, stagger: 1.3, ease: 'cubic-bezier(0.34, 1.56, 0.64, 1)', transitionEase: 'cubic-bezier(0.22, 1, 0.36, 1)' },
  cinematic: { duration: 1.4, stagger: 1, ease: 'cubic-bezier(0.16, 1, 0.3, 1)', transitionEase: 'cubic-bezier(0.87, 0, 0.13, 1)' },
}
const NEUTRAL: Personality = { duration: 1, stagger: 1, ease: '', transitionEase: 'cubic-bezier(0.4, 0, 0.2, 1)' }

/** The personality's factors; none (or an unknown name) = neutral (× 1, the presets' own easing). */
export function personalityOf(p: MotionPersonality | string | undefined): Personality {
  return (p && TABLE[p as MotionPersonality]) || NEUTRAL
}

/** A reveal effect's timing under a personality (durations and stagger scaled, easing replaced). */
export function personalTiming<T extends { durationMs: number; staggerMs?: number; easing?: string }>(t: T, p: MotionPersonality | undefined): T {
  const k = personalityOf(p)
  if (k === NEUTRAL) return t
  return {
    ...t,
    durationMs: Math.round(t.durationMs * k.duration),
    ...(t.staggerMs !== undefined ? { staggerMs: Math.round(t.staggerMs * k.stagger) } : {}),
    easing: k.ease,
  }
}
