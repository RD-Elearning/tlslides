/**
 * Motion recipe for tls.m.decoration — the shape fades in as a field, then (vivid V2) loops in the
 * viewer: `ambient: auto` picks the loop by shape (`AUTO_AMBIENT`), an explicit value wins.
 */

import type { AmbientRecipe, MotionRecipe } from '../../../types'
import type { DecorationProps, DecorationShape } from './schema'

/** The loop each shape plays under `ambient: auto` (absent = still). */
export const AUTO_AMBIENT: Partial<Record<DecorationShape, AmbientRecipe['preset']>> = {
  blob: 'drift',
  orb: 'float',
  ring: 'spin',
  arc: 'sway',
  dots: 'twinkle',
  wave: 'drift',
  squiggle: 'sway',
  star: 'spin',
  sparkle: 'twinkle',
  zigzag: 'sway',
  triangle: 'float',
  'half-circle': 'bob',
  cube: 'float',
  cylinder: 'float',
  cone: 'float',
  pyramid: 'float',
  slab: 'float',
  tree: 'sway',
  graph: 'bob',
  gear: 'spin',
  book: 'bob',
  flask: 'sway',
  globe: 'spin',
  bulb: 'pulse',
  chart: 'bob',
  code: 'bob',
  icon: 'float',
}

export function decorationAmbient(props: Record<string, unknown>): AmbientRecipe | null {
  const p = props as DecorationProps
  const own = p.ambient
  if (own === 'none') return null
  if (own && own !== 'auto') return { preset: own }
  const preset = AUTO_AMBIENT[(p.shape ?? 'blob') as DecorationShape]
  // a large ring or star turns slowly; small ones a little faster
  return preset ? { preset } : null
}

export const motion: MotionRecipe = {
  parts: ['shape'],
  preset: 'field-in',
  ambient: decorationAmbient,
}
