/**
 * Design tokens v2 (P19) — `reviews/blocks/02-design-language.md`, mainly §2.2 (colour roles),
 * §2.3 (scales) and §2.4 (the effective-surface contract). This is the module that closes the
 * named follow-up in `reviews/roadmap-slides.md`: a `mono-grid` stat row on a teal gradient used
 * to render nearly-illegible muted captions because nothing resolved `textMuted` against what
 * was actually behind it. `resolveColor` below is the fix.
 *
 * Everything here is pure and DOM-free — no `document`, `window`, `Date.now()`, `Math.random()`
 * — so it runs identically in the live editor, in a headless SVG export, and in the P31 linter.
 */

import type { DeckTheme, SlideBackground, TDGradientStop } from '~types'
import { gradientAngleToVector, resolveThemeColor } from '~state/shapes/shared'
import {
  clamp,
  contrastRatio,
  mixHex,
  relativeLuminance,
  solveForContrast,
  tryHexToRgb,
} from './color-math'
import {
  applyDensity,
  ELEVATION_SCALE,
  generateCategoricalRamp,
  MOTION_SCALE,
  RADIUS_SCALE,
  SPACE_SCALE,
  TYPE_SCALE,
} from './scales'
import type {
  Box,
  ColorRole,
  DurationToken,
  EaseToken,
  ElevationValue,
  MotionScale,
  Paint,
  RadiusToken,
  ResolvedColor,
  ResolvedTokens,
  SpaceToken,
  SurfaceContext,
  TypeScaleValue,
  TypeToken,
} from './types'

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Default font family (mirrors layout/layout-child.ts)                            */
/* ─────────────────────────────────────────────────────────────────────────────── */

/** Default font family when the theme does not set one. Kept in sync with the
 *  identically-named constant in `layout/layout-child.ts`. */
const DEFAULT_FONT_FAMILY = '"Source Sans Pro", sans-serif'

/* ─────────────────────────────────────────────────────────────────────────────── */
/* DeckTokens — the persisted, optional override surface                           */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * `TDDocument.tokens?: DeckTokens` — optional, additive, no migration (doc 02 §2.1). Absent
 * means "derive everything from the active theme"; every field here overrides one specific
 * thing `resolveTokens` would otherwise have computed, so a brand kit or a template only writes
 * what it actually needs to pin. Never partially-required: a caller that sets `type.title` does
 * not have to also supply every other type step, `resolveTokens` fills the rest from
 * `TYPE_SCALE`.
 */
export interface DeckTokens {
  /** Literal-hex overrides per role. Whatever isn't listed here falls back to the theme-derived
   *  default in `resolveTokens` (see its doc comment for what that default is per role). */
  color?: Partial<Record<ColorRole, string>>
  /** Replaces the generated 6-hue categorical ramp wholesale — "or overridden wholesale by a
   *  host brand kit" (doc 02 §2.2). Not merged per-index: a host that cares about its chart
   *  colours supplies the whole list. */
  categorical?: string[]
  /** Per-token overrides to the type scale. Each entry may override just `size`, just
   *  `lineHeight`, or both. */
  type?: Partial<Record<TypeToken, Partial<TypeScaleValue>>>
  /** Spacing-scale overrides, in slide units, applied before `density` shifts the result. */
  space?: Partial<Record<SpaceToken, number>>
  /** Radius-scale overrides, in slide units. */
  radius?: Partial<Record<RadiusToken, number>>
  /** Elevation overrides, keyed by level. `level` itself is not overridable — it is what keys
   *  the record — only the shadow's shape/colour is. */
  elevation?: Partial<Record<0 | 1 | 2, Partial<Omit<ElevationValue, 'level'>>>>
  /** Motion-scale overrides. See `MotionScale`'s doc comment for why this is minimal in P19. */
  motion?: {
    duration?: Partial<Record<DurationToken, number>>
    ease?: Partial<Record<EaseToken, string>>
  }
  /** Shifts every internal spacing gap one step (`applyDensity` in `scales.ts`). Defaults to
   *  `'default'` (no shift) when absent. */
  density?: 'compact' | 'default' | 'roomy'
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* resolveTokens — DeckTheme (+ optional DeckTokens) → ResolvedTokens              */
/* ─────────────────────────────────────────────────────────────────────────────── */

// Doc 02 §2.2: "theme override, else `#0ca30c` family" / "`#d03b3b` family" / amber family — the
// generic fallback for a theme that predates Phase 19 (a host's own brand kit that hasn't added
// status colours yet). Every one of `BUILT_IN_DECK_THEMES` sets its own instead (`deck-theme.ts`)
// so these only ever fire for an external theme.
const GENERIC_STATUS_DEFAULTS = {
  positive: '#0CA30C',
  negative: '#D03B3B',
  warning: '#D97706',
} as const

function resolveColorRoles(
  theme: DeckTheme,
  overrides?: Partial<Record<ColorRole, string>>
): Record<ColorRole, string> {
  const { surface, text, textMuted } = theme.colors
  // `textMuted` comes straight from the theme (`DeckThemeColors.textMuted` is a required field
  // every built-in and host theme already sets) rather than being recomputed here from "text at
  // 62% toward surface" — that formula in doc 02 §2.2's table is guidance for *picking* a
  // theme's `textMuted` in the first place, not a runtime override of an already-designed,
  // required value. `surfaceAlt`, `neutral` and `line` below have no equivalent existing field
  // on `DeckThemeColors`, so those genuinely are computed here — there's nothing else to source
  // them from. Whatever this map holds is the *nominal* value, resolved against
  // `theme.colors.surface` — the actual surface a block sits on is very often different (a slide
  // background, a gradient), which is exactly what `resolveColor` re-solves for below.
  const base: Record<ColorRole, string> = {
    surface,
    surfaceAlt: mixHex(surface, text, 0.04),
    text,
    textMuted,
    accent: theme.colors.accent1,
    accent2: theme.colors.accent2,
    positive: theme.colors.positive ?? GENERIC_STATUS_DEFAULTS.positive,
    negative: theme.colors.negative ?? GENERIC_STATUS_DEFAULTS.negative,
    warning: theme.colors.warning ?? GENERIC_STATUS_DEFAULTS.warning,
    neutral: textMuted,
    // "hairlines, dividers, gridlines... text at 12-18% alpha" (doc 02 §2.2). Represented as an
    // *opaque* blend toward `surface` rather than a true alpha colour: `Stroke.color` and
    // `Paint`'s `color` fields are plain hex strings everywhere else in this module (and in the
    // renderers P20 builds on top of them), so an alpha value would be the one paint in the
    // whole system that needs compositing math against a possibly-unknown backdrop. 15% is the
    // midpoint of the doc's 12–18% range.
    line: mixHex(surface, text, 0.15),
    // Doc 02 §2.6: a scrim's actual stops are derived from the image it sits over, which is a
    // media-block concern (P24/P27), not a deck-wide token — no image is decoded here. This is
    // only the base wash `resolveColor('scrim', ...)` returns before a media block picks its own
    // directional stops.
    scrim: 'rgba(0,0,0,0.6)',
  }
  return overrides ? { ...base, ...overrides } : base
}

function mergeTypeScale(overrides?: DeckTokens['type']): Record<TypeToken, TypeScaleValue> {
  // Always rebuilds every per-token object, overrides or not: `{ ...TYPE_SCALE }` alone would
  // copy the outer record but leave each token's own `{ size, lineHeight }` object aliased to
  // `TYPE_SCALE`'s — the exact "module-level object assigned by reference" bug this repo has
  // shipped twice already (`DEFAULT_SLIDE_SIZE`, Phase 18's `style: defaultStyle`).
  const merged = {} as Record<TypeToken, TypeScaleValue>
  for (const token of Object.keys(TYPE_SCALE) as TypeToken[]) {
    merged[token] = { ...TYPE_SCALE[token], ...overrides?.[token] }
  }
  return merged
}

function mergeElevationScale(
  overrides?: DeckTokens['elevation']
): Record<0 | 1 | 2, ElevationValue> {
  const levels: Array<0 | 1 | 2> = [0, 1, 2]
  const merged = {} as Record<0 | 1 | 2, ElevationValue>
  for (const level of levels) {
    merged[level] = { ...ELEVATION_SCALE[level], ...overrides?.[level], level }
  }
  return merged
}

function mergeMotionScale(overrides?: DeckTokens['motion']): MotionScale {
  return {
    duration: { ...MOTION_SCALE.duration, ...overrides?.duration },
    ease: { ...MOTION_SCALE.ease, ...overrides?.ease },
  }
}

/**
 * Merge a `DeckTheme` with optional `DeckTokens` overrides into the concrete value set
 * `layout()` consumes. Called once per render (a theme switch or a token edit produces a new
 * `ResolvedTokens`, never a mutation of a shared one — see the "never assign a module-level
 * object by reference" rule this whole module follows).
 */
export function resolveTokens(theme: DeckTheme, tokens?: DeckTokens): ResolvedTokens {
  const color = resolveColorRoles(theme, tokens?.color)
  const categorical = tokens?.categorical
    ? [...tokens.categorical]
    : generateCategoricalRamp(theme.colors.accent1, theme.colors.accent2)
  const type = mergeTypeScale(tokens?.type)
  const radius: Record<RadiusToken, number> = { ...RADIUS_SCALE, ...tokens?.radius }
  const elevation = mergeElevationScale(tokens?.elevation)
  const motion = mergeMotionScale(tokens?.motion)
  const density = tokens?.density ?? 'default'
  const space = applyDensity({ ...SPACE_SCALE, ...tokens?.space }, density)

  // Resolve the deck's primary font family from the theme's heading/body family fields.
  // Falls back to the built-in default when the theme doesn't set one.
  const fontFamily = theme.fonts?.headingFamily ?? theme.fonts?.bodyFamily ?? DEFAULT_FONT_FAMILY

  return { color, categorical, space, radius, type, elevation, motion, density, fontFamily }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* resolveColor — the effective-surface contract (doc 02 §2.4)                     */
/* ─────────────────────────────────────────────────────────────────────────────── */

// Doc 02 §2.4 point 3 / the P19 brief's acceptance section: text and textMuted both floor at
// 4.5:1, line at 1.4:1. (Doc 02's own prose also mentions a 3:1 floor for "decorative
// non-informational" textMuted — there is no signal in `ColorRole`/`SurfaceContext` today that
// distinguishes decorative from informational text, so this implementation applies the stricter,
// unambiguous 4.5:1 to every `textMuted` resolution. Flagged in the phase report as a doc
// under-specification rather than silently picking one reading.)
const TEXT_CONTRAST_FLOOR = 4.5
const LINE_CONTRAST_FLOOR = 1.4

const COLOR_ROLES: readonly ColorRole[] = [
  'surface',
  'surfaceAlt',
  'accent',
  'accent2',
  'text',
  'textMuted',
  'positive',
  'negative',
  'warning',
  'neutral',
  'line',
  'scrim',
]

function isColorRole(value: string): value is ColorRole {
  return (COLOR_ROLES as readonly string[]).includes(value)
}

/**
 * Resolve a colour role (or a literal hex / `'theme:accent1'` token) to a concrete,
 * contrast-correct value.
 *
 * - A `ColorRole` foreground role (`text`, `textMuted`, `line`) is contrast-solved against
 *   `ctx.luminance` — not `theme.colors.background` — via `solveForContrast`. This is the fix:
 *   a `mono-grid` stat row on a teal gradient now asks "what's actually behind me at this box"
 *   instead of assuming the theme's own background.
 * - Any other `ColorRole` (`surface`, `accent`, `positive`, ...) has no declared contrast floor;
 *   it resolves straight from `tokens.color` with an informational ratio and `ok: true`.
 * - Anything that is not one of the twelve `ColorRole` strings is treated as a literal: a plain
 *   hex, or a Phase 12 `'theme:accent1'` sentinel (resolved via the same `resolveThemeColor`
 *   every other call site uses). **Never contrast-adjusted** — Phase 8b settled that an explicit
 *   value is the user's pinned choice, and blocks inherit that semantics unchanged.
 * - Never throws: a malformed theme colour degrades to `ok: false` with the offending colour
 *   returned as-is, rather than crashing a layout pass.
 */
export function resolveColor(
  role: ColorRole | string,
  ctx: SurfaceContext,
  tokens: ResolvedTokens,
  theme?: DeckTheme
): ResolvedColor {
  if (!isColorRole(role)) {
    const literal = resolveThemeColor(role, theme) ?? role
    const rgb = tryHexToRgb(literal)
    const ratio = rgb ? contrastRatio(relativeLuminance(rgb), ctx.luminance) : 1
    return { color: literal, ratio, ok: true }
  }

  const base = tokens.color[role]

  if (role === 'text' || role === 'textMuted' || role === 'line') {
    const floor = role === 'line' ? LINE_CONTRAST_FLOOR : TEXT_CONTRAST_FLOOR
    if (!tryHexToRgb(base)) return { color: base, ratio: 1, ok: false }
    return solveForContrast(base, ctx.luminance, floor)
  }

  const rgb = tryHexToRgb(base)
  const ratio = rgb ? contrastRatio(relativeLuminance(rgb), ctx.luminance) : 1
  return { color: base, ratio, ok: true }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* SurfaceContext construction                                                     */
/* ─────────────────────────────────────────────────────────────────────────────── */

// Mirrors `background.ts`'s own `UNRESOLVED_TOKEN_FALLBACK` (`#9AA1AB`) and, separately, doc 02
// §2.4(d)'s "neutral mid luminance" for an image surface. Both are the same honest answer to two
// different unknowns ("this token doesn't resolve" / "this is a photo, luminance isn't
// knowable without decoding it") — a plain mid-grey that never reads as an alarming colour and
// never masquerades as a real measurement.
const NEUTRAL_SURFACE_COLOR = '#9AA1AB'
const NEUTRAL_IMAGE_LUMINANCE = 0.5

function solidSurface(color: string): SurfaceContext {
  const rgb = tryHexToRgb(color)
  return {
    behind: { type: 'solid', color },
    luminance: rgb ? relativeLuminance(rgb) : NEUTRAL_IMAGE_LUMINANCE,
    overImage: false,
  }
}

function resolveStop(theme: DeckTheme | undefined) {
  return (stop: TDGradientStop): { color: string; at: number } => ({
    color: resolveThemeColor(stop.color, theme) ?? NEUTRAL_SURFACE_COLOR,
    at: clamp(stop.at, 0, 1),
  })
}

function paintFromBackground(
  background: Extract<SlideBackground, { type: 'solid' | 'linearGradient' | 'radialGradient' }>,
  theme: DeckTheme | undefined
): Paint {
  switch (background.type) {
    case 'solid':
      return { type: 'solid', color: resolveThemeColor(background.color, theme) ?? NEUTRAL_SURFACE_COLOR }
    case 'linearGradient':
      return {
        type: 'linearGradient',
        angle: background.angle,
        stops: background.stops.map(resolveStop(theme)),
      }
    case 'radialGradient':
      return {
        type: 'radialGradient',
        cx: background.cx,
        cy: background.cy,
        stops: background.stops.map(resolveStop(theme)),
      }
  }
}

/** The point this gradient is sampled at, normalized to the 0–1 box its coordinates are defined
 *  in — `(box.x + box.width/2 - originX) / width`, i.e. the box's own centre. A single
 *  representative point (rather than, say, an area-weighted average over the box) is doc 02
 *  §2.4's own framing: "sampled at the block's own box... a block on the dark end of a gradient
 *  must know that" — the centre is the simplest point that is unambiguously "this block's own
 *  position" rather than the slide's. */
function normalizedCenter(
  box: Box,
  width: number,
  height: number,
  originX = 0,
  originY = 0
): { x: number; y: number } {
  return {
    x: width === 0 ? 0.5 : (box.x + box.width / 2 - originX) / width,
    y: height === 0 ? 0.5 : (box.y + box.height / 2 - originY) / height,
  }
}

/** Projects a normalized `(px, py)` point onto a gradient's own axis, returning where along it
 *  (0–1) that point falls. Reuses `gradientAngleToVector` — the exact construction
 *  `resolveSlideBackground` uses to build the rendered `<linearGradient>` line — so sampling
 *  agrees with what actually gets painted by construction, not by coincidence. The radial
 *  radius `0.75` matches `resolveSlideBackground`'s own hardcoded value for the same reason. */
function projectOntoGradient(
  paint: Extract<Paint, { type: 'linearGradient' | 'radialGradient' }>,
  px: number,
  py: number
): number {
  if (paint.type === 'radialGradient') {
    const dx = px - paint.cx
    const dy = py - paint.cy
    return clamp(Math.sqrt(dx * dx + dy * dy) / 0.75, 0, 1)
  }
  const { x1, y1, x2, y2 } = gradientAngleToVector(paint.angle)
  const dx = x2 - x1
  const dy = y2 - y1
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared === 0) return 0
  const t = ((px - x1) * dx + (py - y1) * dy) / lengthSquared
  return clamp(t, 0, 1)
}

function luminanceOfHex(hex: string): number {
  const rgb = tryHexToRgb(hex)
  return rgb ? relativeLuminance(rgb) : NEUTRAL_IMAGE_LUMINANCE
}

/** The luminance of a resolved `Paint` at gradient position `t` (ignored for a solid). Stops are
 *  interpolated in plain sRGB (`mixHex`), the same space every gradient stop in this codebase is
 *  already defined in — not a re-derivation, a direct read of "what colour is actually painted
 *  there". */
function paintLuminanceAt(paint: Paint, t: number): number {
  if (paint.type === 'solid') return luminanceOfHex(paint.color)

  const stops = [...paint.stops].sort((a, b) => a.at - b.at)
  if (stops.length === 0) return NEUTRAL_IMAGE_LUMINANCE
  const first = stops[0]
  const last = stops[stops.length - 1]
  if (t <= first.at) return luminanceOfHex(first.color)
  if (t >= last.at) return luminanceOfHex(last.color)

  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i]
    const b = stops[i + 1]
    if (t >= a.at && t <= b.at) {
      const span = b.at - a.at
      const localT = span === 0 ? 0 : (t - a.at) / span
      return luminanceOfHex(mixHex(a.color, b.color, localT))
    }
  }
  return NEUTRAL_IMAGE_LUMINANCE // unreachable given the sort + bounds checks above
}

/**
 * Build a `SurfaceContext` from a `TDPage.background`, sampled at `box` (the block's own box, in
 * slide units) within a page of size `pageSize`. For a gradient this samples luminance **at
 * `box`**, not the slide centre — the fix for the mono-grid/teal-gradient bug. For an image
 * background, luminance is unknowable (see `NEUTRAL_IMAGE_LUMINANCE`'s comment): returns
 * `overImage: true` and a neutral mid luminance rather than guessing.
 */
export function surfaceFromBackground(
  background: SlideBackground | string | undefined,
  box: Box,
  pageSize: [number, number],
  theme?: DeckTheme
): SurfaceContext {
  if (background === undefined) {
    // Matches `TemplateThumbnail.tsx`'s existing "no background resolved" fallback exactly, so a
    // block's idea of what's behind it on an untouched slide agrees with everything else that
    // already reads `TDPage.background`.
    return solidSurface(theme?.colors.background ?? '#e8e8e8')
  }

  const resolved: SlideBackground =
    typeof background === 'string' ? { type: 'solid', color: background } : background

  if (resolved.type === 'image') {
    return {
      behind: { type: 'solid', color: NEUTRAL_SURFACE_COLOR },
      luminance: NEUTRAL_IMAGE_LUMINANCE,
      overImage: true,
    }
  }

  const paint = paintFromBackground(resolved, theme)
  if (paint.type === 'solid') return solidSurface(paint.color)

  const { x, y } = normalizedCenter(box, pageSize[0], pageSize[1])
  const t = projectOntoGradient(paint, x, y)
  return { behind: paint, luminance: paintLuminanceAt(paint, t), overImage: false }
}

/**
 * Build a `SurfaceContext` from a parent block's own fill, for a child block sitting at `box`
 * (in the same coordinate space as `parentBox`, both in slide units — the same "absolute origin,
 * not pre-normalized" convention every other `Box` in this module uses). `paint`'s gradient
 * spans exactly `parentBox` (the CSS/SVG `objectBoundingBox` convention `gradientAngleToVector`
 * already assumes for a shape's own fill), so `box`'s position is normalized against `parentBox`
 * — not the page — before projecting.
 */
export function surfaceFromPaint(paint: Paint, box: Box, parentBox: Box): SurfaceContext {
  if (paint.type === 'solid') return solidSurface(paint.color)

  const { x, y } = normalizedCenter(box, parentBox.width, parentBox.height, parentBox.x, parentBox.y)
  const t = projectOntoGradient(paint, x, y)
  return { behind: paint, luminance: paintLuminanceAt(paint, t), overImage: false }
}
