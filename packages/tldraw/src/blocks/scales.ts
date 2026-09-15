/**
 * Type / spacing / radius / elevation / motion scales, as data — doc 02 §2.3, verbatim. A block
 * asks `ctx.tokens.<scale>[<token>]`, never a bare number: "a block that wants a size no token
 * provides either uses the nearest token, or its author proposes a new token to this document —
 * never a bare number."
 *
 * Every value here is in **slide units** (the 1920×1080 `DEFAULT_SLIDE_SIZE` frame) or otherwise
 * unitless (line-height multipliers, HSL fractions) — never CSS pixels; the camera handles that
 * conversion, same discipline `Box`'s own doc comment states.
 */

import type {
  ElevationValue,
  MotionScale,
  RadiusToken,
  SpaceToken,
  TypeScaleValue,
  TypeToken,
} from './types'
import { hexToRgb, hslToRgb, rgbToHex, rgbToHsl } from './color-math'

// -------------------------------------------------------------------------------------------
// Type scale
// -------------------------------------------------------------------------------------------
export const TYPE_SCALE: Record<TypeToken, TypeScaleValue> = {
  display: { size: 152, lineHeight: 1.02 },
  title: { size: 96, lineHeight: 1.08 },
  heading: { size: 64, lineHeight: 1.15 },
  subheading: { size: 44, lineHeight: 1.2 },
  lead: { size: 36, lineHeight: 1.35 },
  body: { size: 28, lineHeight: 1.45 },
  caption: { size: 22, lineHeight: 1.4 },
  footnote: { size: 18, lineHeight: 1.35 },
}

// -------------------------------------------------------------------------------------------
// Spacing scale
// -------------------------------------------------------------------------------------------
export const SPACE_SCALE: Record<SpaceToken, number> = {
  '3xs': 4,
  '2xs': 8,
  xs: 12,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48,
  '2xl': 64,
  '3xl': 96,
  '4xl': 128,
}

/** Ascending order of the spacing scale — the axis `density` shifts along. Kept as its own list
 *  (rather than `Object.keys(SPACE_SCALE)`, whose iteration order for these string keys is not
 *  something to lean structural correctness on) so "one step" has an unambiguous meaning. */
export const SPACE_ORDER: SpaceToken[] = [
  '3xs',
  '2xs',
  'xs',
  'sm',
  'md',
  'lg',
  'xl',
  '2xl',
  '3xl',
  '4xl',
]

/**
 * `density: 'compact'` shifts every internal gap one step down the scale, `'roomy'` one step up
 * — "one knob, not a dozen" (doc 02 §2.3). Operates on whatever spacing scale is passed in (so
 * it composes with `DeckTokens.space` overrides: density re-indexes the *resolved* scale, it
 * doesn't recompute from `SPACE_SCALE` directly), and clamps at the ends of `SPACE_ORDER` rather
 * than wrapping or going negative — a `'compact'` deck's `3xs` is still `3xs`, not something
 * smaller that doesn't exist.
 */
export function applyDensity(
  space: Record<SpaceToken, number>,
  density: 'compact' | 'default' | 'roomy'
): Record<SpaceToken, number> {
  if (density === 'default') return { ...space }
  const shift = density === 'compact' ? -1 : 1
  const shifted = {} as Record<SpaceToken, number>
  SPACE_ORDER.forEach((token, i) => {
    const sourceIndex = Math.min(SPACE_ORDER.length - 1, Math.max(0, i + shift))
    shifted[token] = space[SPACE_ORDER[sourceIndex]]
  })
  return shifted
}

// -------------------------------------------------------------------------------------------
// Radius scale
// -------------------------------------------------------------------------------------------
export const RADIUS_SCALE: Record<RadiusToken, number> = {
  none: 0,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 9999,
}

// -------------------------------------------------------------------------------------------
// Elevation scale
// -------------------------------------------------------------------------------------------
// "Three levels only, and this is a discipline, not a palette." Level 0 is the default for
// everything, including peer cards in a grid; level 2 is at most one per slide. `dx` is 0 at
// every level — one light source per slide — kept explicit (see `ElevationValue`'s doc comment).
export const ELEVATION_SCALE: Record<0 | 1 | 2, ElevationValue> = {
  0: { level: 0, dx: 0, dy: 0, blur: 0, color: 'rgba(0,0,0,0)', shadow: 'none' },
  1: {
    level: 1,
    dx: 0,
    dy: 6,
    blur: 8,
    color: 'rgba(0,0,0,0.10)',
    shadow: '0 6px 8px rgba(0,0,0,0.10)',
  },
  2: {
    level: 2,
    dx: 0,
    dy: 12,
    blur: 24,
    color: 'rgba(0,0,0,0.18)',
    shadow: '0 12px 24px rgba(0,0,0,0.18)',
  },
}

// -------------------------------------------------------------------------------------------
// Motion scale (minimal — see `MotionScale`'s doc comment in `types.ts` for why this stops here)
// -------------------------------------------------------------------------------------------
export const MOTION_SCALE: MotionScale = {
  duration: { fast: 150, normal: 250, slow: 400 },
  ease: {
    linear: 'linear',
    'ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
    'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
    'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
}

// -------------------------------------------------------------------------------------------
// Categorical ramp
// -------------------------------------------------------------------------------------------
// Doc 02 §2.2: "6 hues, generated from accent1/accent2 by rotating hue and holding perceptual
// lightness, or overridden wholesale by a host brand kit." "Perceptual lightness" here means HSL
// lightness, not a true perceptually-uniform space (CIE Lab/OKLab) — this repo's colour handling
// is plain sRGB hex everywhere else (theme palettes, gradient stops), and pulling in a real
// perceptual model for one 6-swatch ramp would be the only place in the codebase doing colour
// science the other 99% of it doesn't; matching the existing discipline was judged the better
// trade. Interleaved from both accents (not 3 rotations of accent1 then 3 of accent2) so a
// 2-series chart's colours visibly come from both brand hues, not just one.
const CATEGORICAL_HUE_STEP_DEG = 40
const CATEGORICAL_RAMP_SIZE = 6

export function generateCategoricalRamp(accent1: string, accent2: string): string[] {
  const base1 = rgbToHsl(hexToRgb(accent1))
  const base2 = rgbToHsl(hexToRgb(accent2))
  const rotate = (hsl: typeof base1, steps: number): string => {
    const hueShift = (steps * CATEGORICAL_HUE_STEP_DEG) / 360
    const h = ((hsl.h + hueShift) % 1 + 1) % 1
    return rgbToHex(hslToRgb({ h, s: hsl.s, l: hsl.l }))
  }
  const ramp: string[] = []
  for (let i = 0; i < CATEGORICAL_RAMP_SIZE / 2; i++) {
    ramp.push(rotate(base1, i))
    ramp.push(rotate(base2, i))
  }
  return ramp
}
