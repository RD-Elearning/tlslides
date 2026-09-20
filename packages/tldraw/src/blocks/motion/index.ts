/**
 * Motion system barrel — tokens + driver + presets + play-reveal.
 */

// Token data (05-motion-system.md §5.2)
export {
  DURATION_TOKENS,
  EASING_TOKENS,
  DISTANCE_TOKENS,
  SCALE_TOKENS,
  BLUR_TOKENS,
} from './tokens'

// Driver interface + types (05-motion-system.md §5.6)
export {
  ALLOWED_PROPERTIES,
  FORBIDDEN_PROPERTIES,
} from './driver'
export type {
  MotionKeyframes,
  MotionOptions,
  MotionHandle,
  MotionState,
  MotionStep,
  MotionDriver,
} from './driver'

// Motion presets (05-motion-system.md §5.3)
export {
  MOTION_PRESETS,
  PRESET_IDS,
  ACTIVE_PRESET_IDS,
  getPreset,
} from './presets'
export type { MotionPreset, MotionPresetId } from './presets'

// WAAPI driver implementation
export { createWAAPI_driver } from './waapi-driver'

// GSAP driver adapter (host-injected, optional)
export { createGsapDriver } from './gsap-driver'
export type { GsapInstance, GsapTimeline, GsapVars } from './gsap-driver'

// Play-reveal: shared block-reveal function (R5)
export { playBlockReveal } from './play-reveal'
export type { PlayBlockRevealContext } from './play-reveal'
