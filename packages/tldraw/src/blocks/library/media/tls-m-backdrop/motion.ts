/**
 * Motion recipe for tls.m.backdrop — the ground never moves in the build; S15-e adds a viewer-only drift for the
 * soft kinds (mesh, aurora, waves, dots): one slow loop of 18–40 s on the whole backdrop (its children move together
 * inside the clipped root, so the edges never show). A `quiet` ground (dense slides) never moves, and the loop only
 * runs when the slide's motion style allows loops and the deck's `ambient` is not off (`resolveAmbient`).
 */

import type { MotionRecipe } from '../../../types'

const LOOPS: Record<string, { preset: string; amp: number; periodMs: number }> = {
  mesh: { preset: 'drift', amp: 1.6, periodMs: 30000 },
  aurora: { preset: 'drift', amp: 2, periodMs: 36000 },
  waves: { preset: 'bob', amp: 1.4, periodMs: 18000 },
  dots: { preset: 'drift', amp: 0.8, periodMs: 40000 },
}

export const motion: MotionRecipe = {
  parts: ['backdrop'],
  preset: 'none',
  ambient: (props) => {
    const loop = LOOPS[String(props.kind)]
    return loop && props.tone !== 'quiet' ? { ...loop, clip: true } : null
  },
}
