/**
 * Motion tokens (05-motion-system.md §5.2) — the transitions.dev-inspired scale covering
 * durations, easings, distances (×3 for web), scales, and blur. Pure data; no DOM, no React.
 *
 * Every module-level object below is *copied* on import so consumers can safely mutate their
 * own view without affecting the canonical values (enforced by test: not.toBe + toEqual).
 */

// --- Durations (ms) -----------------------------------------------------------

export const DURATION_TOKENS = {
  stagger: 40,
  micro: 80,
  quick: 150,
  fast: 250,
  medium: 350,
  slow: 400,
  verySlow: 500,
} as const

// --- Easings (CSS easing strings) ---------------------------------------------

export const EASING_TOKENS = {
  smoothOut: 'cubic-bezier(0.22, 1, 0.36, 1)',
  inOut: 'ease-in-out',
  out: 'ease-out',
  linear: 'linear',
  bounce: 'cubic-bezier(0.34, 1.36, 0.64, 1)',
  bounceStrong: 'cubic-bezier(0.34, 3.85, 0.64, 1)',
} as const

// --- Distances (slide units; ×3 for web) --------------------------------------

export const DISTANCE_TOKENS = {
  micro: 12,
  small: 18,
  base: 24,
  medium: 36,
  large: 90,
} as const

// --- Scales -------------------------------------------------------------------

export const SCALE_TOKENS = {
  large: 0.96,
  medium: 0.97,
  small: 0.98,
  tiny: 0.99,
} as const

// --- Blur (px) ----------------------------------------------------------------

export const BLUR_TOKENS = {
  small: 2,
  medium: 3,
  large: 8,
} as const
