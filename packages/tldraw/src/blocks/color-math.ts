/**
 * Pure colour math: WCAG relative luminance / contrast ratio, hex ⇄ RGB ⇄ HSL conversion, and
 * the hue-preserving contrast solver `resolveColor` (`tokens.ts`) is built on. Every function
 * here is a small, deterministic, exported unit — doc 02 §2.4 asks for this explicitly ("Write
 * these as small pure exported helpers so they are directly testable") because the bug this
 * whole phase exists to fix (`reviews/roadmap-slides.md`'s mono-grid-on-teal-gradient caption)
 * was invisible to every existing test: nothing anywhere measured contrast.
 *
 * No `document`, no `window`, no `Date`, no `Math.random` — this runs in Node, in the linter,
 * and in a headless export, same as everything else under `blocks/`.
 */

export interface RGB {
  r: number
  g: number
  b: number
}

/** `h`, `s`, `l` all 0–1 (not the 0–360/0–100% convention CSS uses) — one range for every value
 *  in this module keeps the arithmetic below (mixing, clamping, lerp) uniform. */
export interface HSL {
  h: number
  s: number
  l: number
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

/**
 * Parse a 3- or 6-digit hex colour (with or without a leading `#`) into 0–255 RGB channels.
 * Throws on anything else — this is a low-level parser, not `resolveColor`'s "never throw" path;
 * callers that must degrade gracefully on untrusted input use `tryHexToRgb` below.
 */
export function hexToRgb(hex: string): RGB {
  const stripped = hex.trim().replace(/^#/, '')
  const full = stripped.length === 3
    ? stripped.split('').map((c) => c + c).join('')
    : stripped
  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    throw new Error(`hexToRgb: "${hex}" is not a valid 3- or 6-digit hex colour`)
  }
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  }
}

/** `hexToRgb`, but returns `undefined` instead of throwing — for a code path (`resolveColor`,
 *  `surfaceFromBackground`) that must never throw on a malformed or non-hex value (a `scrim`
 *  role's `rgba(...)` default, a stale theme with a typo'd hex, ...). */
export function tryHexToRgb(value: string): RGB | undefined {
  try {
    return hexToRgb(value)
  } catch {
    return undefined
  }
}

export function rgbToHex(rgb: RGB): string {
  const toHex = (n: number) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0')
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`.toUpperCase()
}

/** Linear interpolation between two hex colours in plain sRGB channel space. Not perceptually
 *  uniform (a real product would mix in a linear or Lab space), but this repo's existing colour
 *  handling (theme palettes, gradient stops) is all plain sRGB hex already — matching that
 *  discipline was judged more valuable here than introducing a second colour space nothing else
 *  in the codebase uses, for a "second, quieter ground" / hairline tint that never needs to be
 *  perceptually exact. */
export function mixHex(a: string, b: string, t: number): string {
  const ca = hexToRgb(a)
  const cb = hexToRgb(b)
  const ct = clamp(t, 0, 1)
  return rgbToHex({
    r: ca.r + (cb.r - ca.r) * ct,
    g: ca.g + (cb.g - ca.g) * ct,
    b: ca.b + (cb.b - ca.b) * ct,
  })
}

export function rgbToHsl(rgb: RGB): HSL {
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return { h: h / 6, s, l }
}

export function hslToRgb(hsl: HSL): RGB {
  const { h, s, l } = hsl
  if (s === 0) {
    const v = Math.round(clamp(l, 0, 1) * 255)
    return { r: v, g: v, b: v }
  }
  const hue2rgb = (p: number, q: number, t: number): number => {
    let tt = t
    if (tt < 0) tt += 1
    if (tt > 1) tt -= 1
    if (tt < 1 / 6) return p + (q - p) * 6 * tt
    if (tt < 1 / 2) return q
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
    return p
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return {
    r: Math.round(clamp(hue2rgb(p, q, h + 1 / 3), 0, 1) * 255),
    g: Math.round(clamp(hue2rgb(p, q, h), 0, 1) * 255),
    b: Math.round(clamp(hue2rgb(p, q, h - 1 / 3), 0, 1) * 255),
  }
}

/** sRGB → linear-light, per channel — the WCAG 2.x formula, verbatim. */
function srgbChannelToLinear(c: number): number {
  const cs = clamp(c, 0, 255) / 255
  return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4)
}

/** WCAG relative luminance, 0 (black) – 1 (white). `0.2126R + 0.7152G + 0.0722B` in linear
 *  light — the formula itself, not an approximation of it. */
export function relativeLuminance(rgb: RGB): number {
  return (
    0.2126 * srgbChannelToLinear(rgb.r) +
    0.7152 * srgbChannelToLinear(rgb.g) +
    0.0722 * srgbChannelToLinear(rgb.b)
  )
}

/** WCAG contrast ratio between two relative luminances: `(L1+0.05)/(L2+0.05)`, lighter over
 *  darker, so the result is always ≥ 1 regardless of argument order. Black vs white is exactly
 *  21 (`(1+0.05)/(0+0.05)`); identical luminances are exactly 1. */
export function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

// -------------------------------------------------------------------------------------------
// Hue-preserving contrast solver
// -------------------------------------------------------------------------------------------
// Doc 02 §2.4: a foreground role is "contrast-solved against `ctx.luminance`... lighten or
// darken along the role's own hue until it clears the floor."
//
// Two lightness bands, tried in order:
//   1. `HUE_PRESERVING_[MIN|MAX]_L` (0.04–0.96) — the *preferred* band. Reaching the floor here
//      reads as "the same colour, nudged", not "replaced with black/white".
//   2. `TRUE_MIN_L`/`TRUE_MAX_L` (0/1) — the true achromatic extremes, tried ONLY when the
//      preferred band cannot reach the floor.
//
// This ordering matters and was gotten wrong in an earlier version of this function: clamping
// the search to band 1 and reporting `ok: false` the moment *that band* fell short treated "not
// in my preferred aesthetic range" as equivalent to "no legible colour exists", which is false —
// and produced exactly the kind of illegible-caption failure this phase exists to fix (a
// `mono-grid` `textMuted` on a `northern-lights` gradient box at luminance 0.170: band 1 tops out
// at 4.378 against a 4.5 floor and used to report `ok: false`, while pure white there is 4.773 —
// a real, valid answer one step further out). `ok: false` must mean "no hue-preserving colour
// reaches the floor, period", not "no colour in an arbitrary aesthetic sub-range does".
//
// A mathematical consequence worth being explicit about: WCAG's algebra means
// max(contrast-to-pure-black, contrast-to-pure-white) is *always* ≥ √21 ≈ 4.583 against any
// background luminance (their product is exactly 21 — `(bg+.05)/.05 * 1.05/(bg+.05) = 21`, so if
// one factor is below √21 the other must be above it). Since every floor this codebase actually
// uses (4.5 for text/textMuted, 1.4 for line) is below that, band 2 — the true extremes — is
// *always* reachable in practice, which means `ok: false` cannot occur for those two floors. It
// remains real, correct code for a floor above ~4.583 (a future "enhanced" AA/AAA-plus role a
// later phase might add) rather than dead code kept for its own sake: see the
// `solveForContrast` test suite for a deterministic floor-5 example that exercises it.
const HUE_PRESERVING_MIN_L = 0.04
const HUE_PRESERVING_MAX_L = 0.96
const TRUE_MIN_L = 0
const TRUE_MAX_L = 1
const SOLVE_ITERATIONS = 24

export interface ContrastSolution {
  color: string
  ratio: number
  ok: boolean
}

function candidateAt(hsl: HSL, l: number, surfaceLuminance: number): ContrastSolution {
  const rgb = hslToRgb({ h: hsl.h, s: hsl.s, l })
  return {
    color: rgbToHex(rgb),
    ratio: contrastRatio(relativeLuminance(rgb), surfaceLuminance),
    ok: true, // provisional; the caller decides based on `floor`
  }
}

/**
 * Search lightness within `[minL, maxL]` (inclusive) for the value closest to `hsl.l` that
 * reaches `floor` contrast against `surfaceLuminance`. Returns `null` — not a fabricated
 * "best attempt" — when even this band's own extremes cannot reach the floor, so the caller can
 * tell "this band has nothing" apart from "this is the answer".
 */
function solveWithinBand(
  hsl: HSL,
  surfaceLuminance: number,
  floor: number,
  minL: number,
  maxL: number
): ContrastSolution | null {
  // Whichever bound gives more contrast tells us which direction ("lighten" or "darken") to
  // search in — and whether that bound even reaches the floor at all tells us whether this band
  // has a solution before spending any iterations looking for one.
  const dark = candidateAt(hsl, minL, surfaceLuminance)
  const light = candidateAt(hsl, maxL, surfaceLuminance)
  const towardDark = dark.ratio >= light.ratio
  const bound = towardDark ? dark : light
  if (bound.ratio < floor) return null

  // Binary search between the base lightness and the winning bound for the closest-to-base
  // lightness that still clears the floor. `winner` always satisfies it because it is only ever
  // updated when `candidate.ratio >= floor`.
  let lo = clamp(hsl.l, minL, maxL)
  let hi = towardDark ? minL : maxL
  let winner = bound
  for (let i = 0; i < SOLVE_ITERATIONS; i++) {
    const mid = (lo + hi) / 2
    const candidate = candidateAt(hsl, mid, surfaceLuminance)
    if (candidate.ratio >= floor) {
      hi = mid
      winner = candidate
    } else {
      lo = mid
    }
  }
  return winner
}

/**
 * Starting from `baseHex`, search along its own hue (varying only HSL lightness) for the value
 * closest to it that reaches `floor` contrast against `surfaceLuminance`. Returns the original
 * colour unchanged if it already clears the floor. Tries the preferred `[0.04, 0.96]` lightness
 * band first, and only falls through to the true `[0, 1]` extremes when that band cannot reach
 * the floor — see the module comment above for why the order matters. Never throws for a valid
 * hex `baseHex` (`resolveColor` is responsible for not calling this with anything else).
 */
export function solveForContrast(
  baseHex: string,
  surfaceLuminance: number,
  floor: number
): ContrastSolution {
  const baseRgb = hexToRgb(baseHex)
  const hsl = rgbToHsl(baseRgb)

  // Check the *true* base colour first, unclamped — a caller passing an already-black or
  // already-white role default must get it back unchanged, not nudged to a band boundary just
  // because the search machinery below operates in clamped bands.
  const trueBaseRatio = contrastRatio(relativeLuminance(baseRgb), surfaceLuminance)
  if (trueBaseRatio >= floor) return { color: rgbToHex(baseRgb), ratio: trueBaseRatio, ok: true }

  const preferred = solveWithinBand(hsl, surfaceLuminance, floor, HUE_PRESERVING_MIN_L, HUE_PRESERVING_MAX_L)
  if (preferred) return preferred

  const extreme = solveWithinBand(hsl, surfaceLuminance, floor, TRUE_MIN_L, TRUE_MAX_L)
  if (extreme) return extreme

  // Neither band reaches the floor — genuinely unreachable (only possible for a floor above
  // √21 ≈ 4.583, see the module comment). Report the better of the two true extremes honestly,
  // rather than throwing or silently returning an illegible colour.
  const trueDark = candidateAt(hsl, TRUE_MIN_L, surfaceLuminance)
  const trueLight = candidateAt(hsl, TRUE_MAX_L, surfaceLuminance)
  const best = trueDark.ratio >= trueLight.ratio ? trueDark : trueLight
  return { ...best, ok: false }
}
