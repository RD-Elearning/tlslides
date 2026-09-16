/**
 * Motion presets (05-motion-system.md §5.3) — 35 pure-data animation recipes.
 *
 * Each preset declares which ALLOWED_PROPERTIES it touches, default keyframes built
 * from the token scale, and the token names for duration / easing. Chained presets
 * list sub-preset IDs in playback order; ambient presets loop indefinitely.
 *
 * Pure data — no DOM, no React, no side effects.
 */

import type { MotionKeyframes } from './driver'
import { ALLOWED_PROPERTIES } from './driver'
import { DURATION_TOKENS, EASING_TOKENS, DISTANCE_TOKENS, SCALE_TOKENS, BLUR_TOKENS } from './tokens'

// --- Types -------------------------------------------------------------------

type AllowedProperty = (typeof ALLOWED_PROPERTIES)[number]
type DurationTokenName = keyof typeof DURATION_TOKENS
type EasingTokenName = keyof typeof EASING_TOKENS

export interface MotionPreset {
  /** Unique preset identifier matching §5.3. */
  readonly id: string
  /** Subset of ALLOWED_PROPERTIES this preset animates. */
  readonly properties: readonly AllowedProperty[]
  /** Default keyframes — values derived from the token scale. */
  readonly keyframes: MotionKeyframes
  /** Duration token name (key of DURATION_TOKENS). */
  readonly duration: DurationTokenName
  /** Easing token name (key of EASING_TOKENS). */
  readonly easing: EasingTokenName
  /** Per-item stagger offset in ms (typically DURATION_TOKENS.stagger = 40). */
  readonly staggerMs?: number
  /** True when this preset is composed of multiple sub-presets sequenced via `chain`. */
  readonly isChained?: boolean
  /** Ordered list of sub-preset IDs to play in sequence. */
  readonly chain?: readonly string[]
  /** True for looping ambient presets (e.g. ken-burns). */
  readonly isAmbient?: boolean
}

// --- Preset catalog ----------------------------------------------------------

export const MOTION_PRESETS: Readonly<Record<string, MotionPreset>> = {
  // §5.3 row 1 — no animation
  none: {
    id: 'none',
    properties: [],
    keyframes: {},
    duration: 'fast',
    easing: 'smoothOut',
  },

  // §5.3 row 2 — baseline fade
  fade: {
    id: 'fade',
    properties: ['opacity'],
    keyframes: { opacity: [0, 1] },
    duration: 'fast',
    easing: 'smoothOut',
  },

  // §5.3 row 3 — fade + rise (texts-reveal)
  'fade-up': {
    id: 'fade-up',
    properties: ['opacity', 'translate'],
    keyframes: {
      opacity: [0, 1],
      translate: [`0 ${DISTANCE_TOKENS.base}px`, '0 0'],
    },
    duration: 'slow',
    easing: 'smoothOut',
  },

  // §5.3 row 4 — fade + sink (texts-reveal, inverted)
  'fade-down': {
    id: 'fade-down',
    properties: ['opacity', 'translate'],
    keyframes: {
      opacity: [0, 1],
      translate: [`0 -${DISTANCE_TOKENS.base}px`, '0 0'],
    },
    duration: 'slow',
    easing: 'smoothOut',
  },

  // §5.3 row 5 — notification-badge pop
  pop: {
    id: 'pop',
    properties: ['opacity', 'scale'],
    keyframes: {
      opacity: [0, 1],
      scale: [SCALE_TOKENS.small, 1],
    },
    duration: 'fast',
    easing: 'bounce',
  },

  // §5.3 row 6 — horizontal wipe (panel-reveal)
  'wipe-x': {
    id: 'wipe-x',
    properties: ['clip-path'],
    keyframes: {
      clipPath: ['inset(0 100% 0 0)', 'inset(0)'],
    },
    duration: 'medium',
    easing: 'smoothOut',
  },

  // §5.3 row 7 — vertical wipe (panel-reveal)
  'wipe-y': {
    id: 'wipe-y',
    properties: ['clip-path'],
    keyframes: {
      clipPath: ['inset(100% 0 0 0)', 'inset(0)'],
    },
    duration: 'medium',
    easing: 'smoothOut',
  },

  // §5.3 row 8 — circular clip grows from focal point (panel-reveal)
  'mask-reveal': {
    id: 'mask-reveal',
    properties: ['clip-path'],
    keyframes: {
      clipPath: ['circle(0% at 50% 50%)', 'circle(100% at 50% 50%)'],
    },
    duration: 'slow',
    easing: 'smoothOut',
  },

  // §5.3 row 9 — clip-path from top + translateY (accordion)
  'reveal-down': {
    id: 'reveal-down',
    properties: ['clip-path', 'translate'],
    keyframes: {
      clipPath: ['inset(0 0 100% 0)', 'inset(0)'],
      translate: [`0 -${DISTANCE_TOKENS.base}px`, '0 0'],
    },
    duration: 'slow',
    easing: 'smoothOut',
  },

  // §5.3 row 10 — per-line fade-up + blur (texts-reveal)
  'stagger-lines': {
    id: 'stagger-lines',
    properties: ['opacity', 'translate', 'filter'],
    keyframes: {
      opacity: [0, 1],
      translate: [`0 ${DISTANCE_TOKENS.base}px`, '0 0'],
      filter: [`blur(${BLUR_TOKENS.medium}px)`, 'blur(0px)'],
    },
    duration: 'verySlow',
    easing: 'smoothOut',
    staggerMs: DURATION_TOKENS.stagger,
  },

  // §5.3 row 11 — per-child fade-up, capped (texts-reveal)
  'stagger-children': {
    id: 'stagger-children',
    properties: ['opacity', 'translate'],
    keyframes: {
      opacity: [0, 1],
      translate: [`0 ${DISTANCE_TOKENS.base}px`, '0 0'],
    },
    duration: 'slow',
    easing: 'smoothOut',
    staggerMs: DURATION_TOKENS.stagger,
  },

  // §5.3 row 12 — grid variant, row-major offset (texts-reveal)
  'stagger-grid': {
    id: 'stagger-grid',
    properties: ['opacity', 'translate'],
    keyframes: {
      opacity: [0, 1],
      translate: [`0 ${DISTANCE_TOKENS.base}px`, '0 0'],
    },
    duration: 'slow',
    easing: 'smoothOut',
    staggerMs: DURATION_TOKENS.stagger,
  },

  // §5.3 row 13 — per-word fade-up + blur (streaming-text)
  'words-in': {
    id: 'words-in',
    properties: ['opacity', 'translate', 'filter'],
    keyframes: {
      opacity: [0, 1],
      translate: [`0 ${DISTANCE_TOKENS.base}px`, '0 0'],
      filter: [`blur(${BLUR_TOKENS.medium}px)`, 'blur(0px)'],
    },
    duration: 'verySlow',
    easing: 'smoothOut',
    staggerMs: DURATION_TOKENS.stagger,
  },

  // §5.3 row 14 — quote mark pop → quote text stagger-lines → attribution fade
  'quote-in': {
    id: 'quote-in',
    properties: ['opacity', 'translate', 'scale', 'filter'],
    keyframes: {
      opacity: [0, 1],
      translate: [`0 ${DISTANCE_TOKENS.base}px`, '0 0'],
    },
    duration: 'slow',
    easing: 'smoothOut',
    isChained: true,
    chain: ['pop', 'stagger-lines', 'fade'],
  },

  // §5.3 row 15 — numeric interpolation + pop on container (spinning-counter)
  'count-up': {
    id: 'count-up',
    properties: ['opacity', 'scale'],
    keyframes: {
      opacity: [0, 1],
      scale: [SCALE_TOKENS.small, 1],
    },
    duration: 'verySlow',
    easing: 'smoothOut',
  },

  // §5.3 row 16 — per-bar scaleX 0→1 from baseline edge (card-resize)
  'grow-bars-x': {
    id: 'grow-bars-x',
    properties: ['scale'],
    keyframes: {
      scale: [0, 1],
    },
    duration: 'slow',
    easing: 'smoothOut',
    staggerMs: DURATION_TOKENS.stagger,
  },

  // §5.3 row 17 — per-bar scaleY 0→1 anchored at zero line (card-resize)
  'grow-bars-y': {
    id: 'grow-bars-y',
    properties: ['scale'],
    keyframes: {
      scale: [0, 1],
    },
    duration: 'slow',
    easing: 'smoothOut',
    staggerMs: DURATION_TOKENS.stagger,
  },

  // §5.3 row 18 — stacked segments grow in series order (card-resize)
  'grow-segments': {
    id: 'grow-segments',
    properties: ['scale'],
    keyframes: {
      scale: [0, 1],
    },
    duration: 'slow',
    easing: 'smoothOut',
    staggerMs: DURATION_TOKENS.stagger,
  },

  // §5.3 row 19 — stroke-dashoffset length→0 (success-check)
  'draw-path': {
    id: 'draw-path',
    properties: ['stroke-dashoffset'],
    keyframes: {
      strokeDashoffset: ['100%', '0%'],
    },
    duration: 'slow',
    easing: 'inOut',
  },

  // §5.3 row 20 — draw-path on axis, then stagger-children on nodes (success-check)
  'draw-axis-then-nodes': {
    id: 'draw-axis-then-nodes',
    properties: ['stroke-dashoffset', 'opacity', 'translate'],
    keyframes: {
      strokeDashoffset: ['100%', '0%'],
    },
    duration: 'slow',
    easing: 'smoothOut',
    isChained: true,
    chain: ['draw-path', 'stagger-children'],
  },

  // §5.3 row 21 — arc/sector stroke-dashoffset or angular clip (success-check)
  sweep: {
    id: 'sweep',
    properties: ['stroke-dashoffset'],
    keyframes: {
      strokeDashoffset: ['100%', '0%'],
    },
    duration: 'verySlow',
    easing: 'inOut',
  },

  // §5.3 row 22 — nodes reveal in rotational order around centre
  'sweep-nodes': {
    id: 'sweep-nodes',
    properties: ['opacity'],
    keyframes: {
      opacity: [0, 1],
    },
    duration: 'slow',
    easing: 'smoothOut',
    staggerMs: DURATION_TOKENS.stagger,
  },

  // §5.3 row 23 — per-point pop, seeded order (notification-badge)
  'pop-points': {
    id: 'pop-points',
    properties: ['opacity', 'scale'],
    keyframes: {
      opacity: [0, 1],
      scale: [SCALE_TOKENS.small, 1],
    },
    duration: 'fast',
    easing: 'bounce',
    staggerMs: DURATION_TOKENS.stagger,
  },

  // §5.3 row 24 — hub pop, then spokes fade-up outward with stagger
  radiate: {
    id: 'radiate',
    properties: ['opacity', 'translate', 'scale'],
    keyframes: {
      opacity: [0, 1],
      translate: [`0 ${DISTANCE_TOKENS.base}px`, '0 0'],
    },
    duration: 'slow',
    easing: 'smoothOut',
    isChained: true,
    chain: ['pop', 'stagger-children'],
  },

  // §5.3 row 25 — parent first, children after, draw-path on connectors
  'grow-branches': {
    id: 'grow-branches',
    properties: ['stroke-dashoffset', 'opacity', 'translate'],
    keyframes: {
      strokeDashoffset: ['100%', '0%'],
    },
    duration: 'slow',
    easing: 'smoothOut',
    isChained: true,
    chain: ['draw-path', 'stagger-children'],
  },

  // §5.3 row 26 — left from −base, right from +base, together (page-side-by-side)
  'split-in': {
    id: 'split-in',
    properties: ['opacity', 'translate'],
    keyframes: {
      opacity: [0, 1],
      translate: [`-${DISTANCE_TOKENS.base}px 0`, `${DISTANCE_TOKENS.base}px 0`],
    },
    duration: 'slow',
    easing: 'smoothOut',
  },

  // §5.3 row 27 — large surface scale large→1 + opacity (modal)
  'field-in': {
    id: 'field-in',
    properties: ['opacity', 'scale'],
    keyframes: {
      opacity: [0, 1],
      scale: [SCALE_TOKENS.large, 1],
    },
    duration: 'slow',
    easing: 'smoothOut',
  },

  // §5.3 row 28 — title fade-up, then body fade, micro apart
  'title-then-body': {
    id: 'title-then-body',
    properties: ['opacity', 'translate'],
    keyframes: {
      opacity: [0, 1],
      translate: [`0 ${DISTANCE_TOKENS.base}px`, '0 0'],
    },
    duration: 'slow',
    easing: 'smoothOut',
    isChained: true,
    chain: ['fade-up', 'fade'],
  },

  // §5.3 row 29 — title fade-up, then split-in
  'title-then-split': {
    id: 'title-then-split',
    properties: ['opacity', 'translate'],
    keyframes: {
      opacity: [0, 1],
      translate: [`0 ${DISTANCE_TOKENS.base}px`, '0 0'],
    },
    duration: 'slow',
    easing: 'smoothOut',
    isChained: true,
    chain: ['fade-up', 'split-in'],
  },

  // §5.3 row 30 — scrim fade, then text stagger-lines
  'scrim-then-text': {
    id: 'scrim-then-text',
    properties: ['opacity', 'translate', 'filter'],
    keyframes: {
      opacity: [0, 1],
    },
    duration: 'slow',
    easing: 'smoothOut',
    isChained: true,
    chain: ['fade', 'stagger-lines'],
  },

  // §5.3 row 31 — ambient slow scale 1→1.06, linear (§5.7)
  'ken-burns': {
    id: 'ken-burns',
    properties: ['scale'],
    keyframes: {
      scale: [1, 1.06],
    },
    duration: 'verySlow',
    easing: 'linear',
    isAmbient: true,
  },

  // §5.3 row 32 — kicker fade, title words-in, subtitle fade-up, meta fade
  'cover-in': {
    id: 'cover-in',
    properties: ['opacity', 'translate', 'filter'],
    keyframes: {
      opacity: [0, 1],
    },
    duration: 'slow',
    easing: 'smoothOut',
    isChained: true,
    chain: ['fade', 'words-in', 'fade-up', 'fade'],
  },

  // §5.3 row 33 — numeral pop, field wipe-x, title fade-up
  'section-in': {
    id: 'section-in',
    properties: ['opacity', 'scale', 'translate', 'clip-path'],
    keyframes: {
      opacity: [0, 1],
      scale: [SCALE_TOKENS.small, 1],
    },
    duration: 'slow',
    easing: 'smoothOut',
    isChained: true,
    chain: ['pop', 'wipe-x', 'fade-up'],
  },

  // §5.3 row 34 — KPIs stagger-children, then chart grow-bars-y
  'dashboard-in': {
    id: 'dashboard-in',
    properties: ['opacity', 'translate', 'scale'],
    keyframes: {
      opacity: [0, 1],
      translate: [`0 ${DISTANCE_TOKENS.base}px`, '0 0'],
    },
    duration: 'slow',
    easing: 'smoothOut',
    isChained: true,
    chain: ['stagger-children', 'grow-bars-y'],
  },

  // §5.3 row 35 — statement fade-up, CTA pop last
  'closing-in': {
    id: 'closing-in',
    properties: ['opacity', 'translate', 'scale'],
    keyframes: {
      opacity: [0, 1],
      translate: [`0 ${DISTANCE_TOKENS.base}px`, '0 0'],
    },
    duration: 'slow',
    easing: 'smoothOut',
    isChained: true,
    chain: ['fade-up', 'pop'],
  },
}

// Deep-freeze the record and every preset object for runtime immutability.
Object.freeze(MOTION_PRESETS)
for (const id of Object.keys(MOTION_PRESETS)) {
  Object.freeze(MOTION_PRESETS[id])
}

// --- Derived helpers --------------------------------------------------------

/** All 35 preset IDs in catalog order. */
export const PRESET_IDS = Object.freeze(
  Object.keys(MOTION_PRESETS)
) as readonly (keyof typeof MOTION_PRESETS)[]

/** Type-safe preset ID string. */
export type MotionPresetId = keyof typeof MOTION_PRESETS

/**
 * Look up a preset by ID. Returns `undefined` for unknown IDs.
 */
export function getPreset(id: string): MotionPreset | undefined {
  return MOTION_PRESETS[id]
}
