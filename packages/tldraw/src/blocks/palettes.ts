/**
 * Palettes built around one colour (spro v2 V3.1/V3.2) — pure colour maths, so the deck dialogs run
 * it in the browser and the sidecar (an AI colour suggestion) runs the same code.
 *
 * A palette can be *derived* from one colour the person picks: the hue moves in OKLCH (perceptual,
 * so a rotated hue keeps its lightness), the accents are contrast-solved against the slide
 * background with `solveForContrast`, and the result is a set of `DeckTokens.color` overrides. The
 * page background is not a token role, so a derived palette keeps its base palette's background (a
 * dark style stays dark) and changes the accents, the card surface and the chart colours.
 */
import { contrastRatio, hexToRgb, mixHex, relativeLuminance, rgbToHex, solveForContrast } from './color-math'
import { generateCategoricalRamp } from './scales'

type Hex = string
export type PaletteBase = { background: Hex; surface: Hex; text: Hex; textMuted: Hex; accent1: Hex; accent2: Hex }
export type PaletteHarmony = 'analogous' | 'complementary' | 'split' | 'triadic' | 'mono'

/* ----------------------------------- OKLCH ----------------------------------- */

const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const gam = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)
const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x))

export function hexToOklch(hex: Hex): [number, number, number] {
  const { r, g, b } = hexToRgb(hex)
  const [R, G, B] = [r / 255, g / 255, b / 255].map(lin)
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B)
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B)
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  const C = Math.hypot(a, bb)
  const H = ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360
  return [L, C, H]
}

export function oklchToHex(L: number, C: number, H: number): Hex {
  // reduce chroma until the colour fits sRGB (keeps hue and lightness)
  for (let c = C; c >= 0; c -= 0.005) {
    const a = c * Math.cos((H * Math.PI) / 180)
    const b = c * Math.sin((H * Math.PI) / 180)
    const l_ = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
    const m_ = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
    const s_ = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
    const r = 4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_
    const g = -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_
    const bl = -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_
    if ([r, g, bl].every((v) => v >= -0.001 && v <= 1.001)) {
      return rgbToHex({ r: Math.round(gam(clamp(r)) * 255), g: Math.round(gam(clamp(g)) * 255), b: Math.round(gam(clamp(bl)) * 255) })
    }
  }
  return rgbToHex({ r: Math.round(L * 255), g: Math.round(L * 255), b: Math.round(L * 255) })
}

const rotate = (hex: Hex, deg: number, dL = 0, cScale = 1): Hex => {
  const [L, C, H] = hexToOklch(hex)
  return oklchToHex(clamp(L + dL, 0.05, 0.97), C * cScale, (H + deg + 360) % 360)
}

const lum = (hex: Hex) => relativeLuminance(hexToRgb(hex))
/** The WCAG contrast ratio of two hex colours. */
export const hexContrast = (a: Hex, b: Hex) => contrastRatio(lum(a), lum(b))

/** An accent readable as a graphic on the background (≥ 3:1), nudged along its own hue if not. */
const accentOn = (hex: Hex, background: Hex): Hex => solveForContrast(hex, lum(background), 3).color

/* -------------------------------- palettes -------------------------------- */

/** A style palette's colours with the optional roles filled in (what a swatch shows). */
export function paletteColors(p: { colors: Record<string, string> }): PaletteBase {
  const c = p.colors
  return {
    background: c.background,
    surface: c.surface ?? c.background,
    text: c.text,
    textMuted: c.textMuted ?? c.text,
    accent1: c.accent1,
    accent2: c.accent2 ?? c.accent1,
  }
}

const SECOND: Record<PaletteHarmony, (seed: Hex) => Hex> = {
  analogous: (s) => rotate(s, 35),
  complementary: (s) => rotate(s, 180),
  split: (s) => rotate(s, 150),
  triadic: (s) => rotate(s, 120),
  mono: (s) => rotate(s, 0, hexToOklch(s)[0] > 0.6 ? -0.25 : 0.22, 0.75),
}

export type DerivedPalette = {
  id: string
  harmony: PaletteHarmony
  /** what the swatch shows */
  swatch: PaletteBase
  /** `DeckTokens.color` overrides */
  tokens: { accent: Hex; accent2: Hex; surface: Hex }
  /** `DeckTokens.categorical` — chart colours from the accents */
  categorical: Hex[]
  contrast: { text: number; accent: number; accent2: number }
}

/** Palettes around `seed` on `base`'s background, one per harmony. */
export function derivePalettes(
  base: PaletteBase,
  seed: Hex,
  harmonies: PaletteHarmony[] = ['analogous', 'complementary', 'split', 'mono']
): DerivedPalette[] {
  const bg = base.background
  return harmonies.map((h) => {
    const accent = accentOn(seed, bg)
    const accent2 = accentOn(SECOND[h](seed), bg)
    // a card surface is the background with a breath of the accent (dark backgrounds lighten)
    const surface = mixHex(bg, accent, lum(bg) < 0.2 ? 0.12 : 0.06)
    const categorical = generateCategoricalRamp(accent, accent2)
    return {
      id: `${h}-${accent.slice(1)}`.toLowerCase(),
      harmony: h,
      swatch: { ...base, accent1: accent, accent2, surface },
      tokens: { accent, accent2, surface },
      categorical,
      contrast: {
        text: Math.round(hexContrast(base.text, surface) * 100) / 100,
        accent: Math.round(hexContrast(accent, bg) * 100) / 100,
        accent2: Math.round(hexContrast(accent2, bg) * 100) / 100,
      },
    }
  })
}

/** After the person changes one accent, three completions for the other one. */
export function partnerPalettes(
  base: PaletteBase,
  current: { accent: Hex; accent2?: Hex },
  changed: 'accent' | 'accent2'
): DerivedPalette[] {
  const fixed = changed === 'accent' ? current.accent : current.accent2 ?? current.accent
  const out = derivePalettes(base, fixed, ['analogous', 'complementary', 'split'])
  if (changed === 'accent') return out
  // the person fixed the second colour: the first one follows, the roles swap back
  return out.map((d) => ({
    ...d,
    id: `${d.id}-b`,
    swatch: { ...d.swatch, accent1: d.tokens.accent2, accent2: d.tokens.accent },
    tokens: { ...d.tokens, accent: d.tokens.accent2, accent2: d.tokens.accent },
    categorical: generateCategoricalRamp(d.tokens.accent2, d.tokens.accent),
    contrast: { ...d.contrast, accent: d.contrast.accent2, accent2: d.contrast.accent },
  }))
}

/* -------------------------------- slide tone -------------------------------- */

/** S13-a — the tones a slide can take (`SlideSpec.tone`). */
export type SlideToneName = 'base' | 'deep' | 'accent'

const BODY_MIN = 4.5
const GRAPHIC_MIN = 3

/** Walk `ground` along OKLCH lightness (away from `text`) until body text reads on it and on a card
 *  surface mixed from the two (`surface` = 10 % of the text into the ground). */
function walkGround(ground: Hex, text: Hex): Hex {
  const [L0, C, H] = hexToOklch(ground)
  const dir = lum(text) > lum(ground) ? -1 : 1
  const ok = (g: Hex) => hexContrast(text, g) >= BODY_MIN && hexContrast(text, mixHex(g, text, 0.1)) >= BODY_MIN
  for (let i = 0; i <= 50; i++) {
    const g = oklchToHex(clamp(L0 + dir * 0.02 * i, 0.03, 0.98), C, H)
    if (ok(g)) return g
  }
  return dir < 0 ? '#111111' : '#FAFAFA'
}

/** A muted text colour on `ground`: `text` mixed toward the ground, as far as body contrast allows. */
function mutedOn(text: Hex, ground: Hex): Hex {
  for (const t of [0.3, 0.22, 0.15, 0.08, 0]) {
    const c = mixHex(text, ground, t)
    if (hexContrast(c, ground) >= BODY_MIN) return c
  }
  return text
}

const toneCache = new WeakMap<object, Map<string, unknown>>()

/**
 * S13-a — the theme a slide of `tone` paints with, derived from the deck theme: `deep` is a dark ground
 * (the palette's own dark text, or a coloured dark from `accent2` in a dark deck) with light text;
 * `accent` is the `accent1` ground with whichever of the palette's text/background reads on it. The
 * ground walks in OKLCH lightness until body text passes 4.5:1 (on the ground and on a card), the
 * accents and status colours are re-solved to 3:1 on the new ground. Pure; memoised per theme object,
 * so React memos keyed on the result stay stable. `base` / absent returns the theme itself.
 */
export function slideTheme<T extends { id: string; colors: Record<string, string | undefined> }>(theme: T, tone?: SlideToneName | string): T {
  if (tone !== 'deep' && tone !== 'accent') return theme
  let byTone = toneCache.get(theme)
  if (!byTone) toneCache.set(theme, (byTone = new Map()))
  const hit = byTone.get(tone)
  if (hit) return hit as T
  const c = theme.colors as Record<string, string>
  const bg = c.background
  const darkDeck = lum(bg) < 0.2
  const accent2 = c.accent2 ?? c.accent1
  let ground: Hex
  let text: Hex
  if (tone === 'deep') {
    if (darkDeck) {
      const [, C, H] = hexToOklch(accent2)
      ground = oklchToHex(0.2, Math.min(C, 0.09), H)
      text = c.text
    } else {
      const [Lt, Ct, Ht] = hexToOklch(c.text)
      ground = Lt <= 0.32 ? c.text : oklchToHex(0.24, Ct, Ht)
      text = bg
    }
  } else {
    ground = c.accent1
    const options = [bg, c.text, '#FFFFFF', '#111111']
    text = options.reduce((best, o) => (hexContrast(o, ground) > hexContrast(best, ground) + 0.01 ? o : best), options[0])
  }
  ground = walkGround(ground, text)
  // a deep ground carries small accent text (kickers, labels at 22 units): solve to body contrast there
  const solve = (hex: string | undefined) => (hex ? solveForContrast(hex, lum(ground), tone === 'deep' ? BODY_MIN : GRAPHIC_MIN).color : undefined)
  const colors: Record<string, string | undefined> = {
    ...c,
    background: ground,
    surface: mixHex(ground, text, 0.1),
    text,
    textMuted: mutedOn(text, ground),
    accent1: tone === 'accent' ? (hexContrast(accent2, ground) >= GRAPHIC_MIN ? accent2 : text) : solve(c.accent1)!,
    accent2: tone === 'accent' ? text : solve(accent2)!,
    positive: solve(c.positive),
    negative: solve(c.negative),
    warning: solve(c.warning),
  }
  for (const k of ['positive', 'negative', 'warning']) if (colors[k] === undefined) delete colors[k]
  const out = { ...theme, id: `${theme.id}~${tone}`, colors, tone } as T
  byTone.set(tone, out)
  return out
}
