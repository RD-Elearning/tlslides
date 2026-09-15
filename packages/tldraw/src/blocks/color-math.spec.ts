import {
  clamp,
  contrastRatio,
  hexToRgb,
  hslToRgb,
  mixHex,
  relativeLuminance,
  rgbToHex,
  rgbToHsl,
  solveForContrast,
  tryHexToRgb,
} from './color-math'

describe('clamp', () => {
  it('clamps below, within, and above the range', () => {
    expect(clamp(-5, 0, 10)).toBe(0)
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(15, 0, 10)).toBe(10)
  })
})

describe('hexToRgb / rgbToHex', () => {
  it('parses 6-digit hex with and without a leading #', () => {
    expect(hexToRgb('#FF0000')).toEqual({ r: 255, g: 0, b: 0 })
    expect(hexToRgb('00FF00')).toEqual({ r: 0, g: 255, b: 0 })
  })

  it('parses 3-digit shorthand hex', () => {
    expect(hexToRgb('#0F0')).toEqual({ r: 0, g: 255, b: 0 })
  })

  it('is case-insensitive', () => {
    expect(hexToRgb('#abcdef')).toEqual(hexToRgb('#ABCDEF'))
  })

  it('throws on an invalid hex string', () => {
    expect(() => hexToRgb('not-a-colour')).toThrow()
    expect(() => hexToRgb('#12')).toThrow()
  })

  it('round-trips through rgbToHex', () => {
    expect(rgbToHex(hexToRgb('#38BDF8'))).toBe('#38BDF8')
  })

  describe('tryHexToRgb', () => {
    it('returns the parsed colour for valid input', () => {
      expect(tryHexToRgb('#FFFFFF')).toEqual({ r: 255, g: 255, b: 255 })
    })

    it('returns undefined instead of throwing for invalid input', () => {
      expect(tryHexToRgb('rgba(0,0,0,0.6)')).toBeUndefined()
      expect(tryHexToRgb('theme:accent1')).toBeUndefined()
      expect(tryHexToRgb('')).toBeUndefined()
    })
  })
})

describe('rgbToHsl / hslToRgb', () => {
  it('round-trips primary colours', () => {
    for (const hex of ['#FF0000', '#00FF00', '#0000FF', '#FFFFFF', '#000000', '#808080']) {
      const rgb = hexToRgb(hex)
      const hsl = rgbToHsl(rgb)
      const back = hslToRgb(hsl)
      // Rounding through HSL can be off by a shade of 1 on a 0-255 channel.
      expect(Math.abs(back.r - rgb.r)).toBeLessThanOrEqual(1)
      expect(Math.abs(back.g - rgb.g)).toBeLessThanOrEqual(1)
      expect(Math.abs(back.b - rgb.b)).toBeLessThanOrEqual(1)
    }
  })

  it('treats an achromatic colour as saturation 0', () => {
    expect(rgbToHsl(hexToRgb('#808080')).s).toBe(0)
  })
})

describe('mixHex', () => {
  it('returns the first colour at t=0 and the second at t=1', () => {
    expect(mixHex('#000000', '#FFFFFF', 0)).toBe('#000000')
    expect(mixHex('#000000', '#FFFFFF', 1)).toBe('#FFFFFF')
  })

  it('returns the midpoint at t=0.5', () => {
    expect(mixHex('#000000', '#FFFFFF', 0.5)).toBe('#808080')
  })

  it('clamps t outside [0, 1]', () => {
    expect(mixHex('#000000', '#FFFFFF', -1)).toBe('#000000')
    expect(mixHex('#000000', '#FFFFFF', 2)).toBe('#FFFFFF')
  })

  it('does not mutate or alias either input string', () => {
    const a = '#000000'
    const b = '#FFFFFF'
    const result = mixHex(a, b, 0.5)
    expect(a).toBe('#000000')
    expect(b).toBe('#FFFFFF')
    expect(result).not.toBe(a)
    expect(result).not.toBe(b)
  })
})

// Acceptance §4: "unit-test the WCAG helpers against known pairs — black/white = 21:1,
// identical colours = 1:1, and at least two mid-tone pairs you compute by hand."
describe('relativeLuminance / contrastRatio — known pairs', () => {
  it('black is luminance 0, white is luminance 1', () => {
    expect(relativeLuminance(hexToRgb('#000000'))).toBeCloseTo(0, 10)
    expect(relativeLuminance(hexToRgb('#FFFFFF'))).toBeCloseTo(1, 10)
  })

  it('black vs white is exactly 21:1', () => {
    const black = relativeLuminance(hexToRgb('#000000'))
    const white = relativeLuminance(hexToRgb('#FFFFFF'))
    expect(contrastRatio(black, white)).toBeCloseTo(21, 5)
    // Order-independent.
    expect(contrastRatio(white, black)).toBeCloseTo(21, 5)
  })

  it('identical colours are exactly 1:1', () => {
    const l = relativeLuminance(hexToRgb('#5588AA'))
    expect(contrastRatio(l, l)).toBeCloseTo(1, 10)
  })

  // Hand-computed: #767676 is the sRGB value WCAG accessibility tooling (e.g. WebAIM's contrast
  // checker) commonly cites as landing at ~4.54:1 against white. Channel 0x76 = 118;
  // 118/255 = 0.462745...; since 0.462745 > 0.03928, linear = ((0.462745+0.055)/1.055)^2.4 =
  // 0.181164 (to 6 s.f.), and since R=G=B, luminance = 0.181164. Contrast against white (L=1):
  // (1+0.05)/(0.181164+0.05) = 1.05/0.231164 = 4.5422.
  it('mid-tone pair #767676 vs white (hand-computed ~4.54:1)', () => {
    const grey = relativeLuminance(hexToRgb('#767676'))
    expect(grey).toBeCloseTo(0.181164, 5)
    const white = relativeLuminance(hexToRgb('#FFFFFF'))
    expect(contrastRatio(grey, white)).toBeCloseTo(4.5422, 3)
  })

  // Hand-computed: #808080 (mid grey, 128/255 = 0.501961). linear =
  // ((0.501961+0.055)/1.055)^2.4 = 0.215861 (to 6 s.f.). Against black (L=0):
  // (0.215861+0.05)/(0+0.05) = 0.265861/0.05 = 5.3172.
  it('mid-tone pair #808080 vs black (hand-computed ~5.32:1)', () => {
    const grey = relativeLuminance(hexToRgb('#808080'))
    const black = relativeLuminance(hexToRgb('#000000'))
    expect(contrastRatio(grey, black)).toBeCloseTo(5.317, 2)
  })
})

describe('solveForContrast', () => {
  it('returns the base colour unchanged when it already meets the floor', () => {
    // Black on a light (luminance 1) surface already clears 4.5:1 (21:1).
    const result = solveForContrast('#000000', 1, 4.5)
    expect(result.color).toBe('#000000')
    expect(result.ok).toBe(true)
    expect(result.ratio).toBeGreaterThanOrEqual(4.5)
  })

  it('darkens a light base colour against a light surface until the floor is met', () => {
    const result = solveForContrast('#F8FAFC', 0.9, 4.5)
    expect(result.ok).toBe(true)
    expect(result.ratio).toBeGreaterThanOrEqual(4.5)
    // It should have moved away from the original near-white value.
    expect(result.color).not.toBe('#F8FAFC')
  })

  it('lightens a dark base colour against a dark surface until the floor is met', () => {
    const result = solveForContrast('#111111', 0.02, 4.5)
    expect(result.ok).toBe(true)
    expect(result.ratio).toBeGreaterThanOrEqual(4.5)
    expect(result.color).not.toBe('#111111')
  })

  // P0 fix: the preferred [0.04, 0.96] lightness band is tried first, but the search now falls
  // through to the true [0, 1] extremes when that band alone can't reach the floor — instead of
  // reporting `ok: false` the moment the *preferred* band falls short. `ok: false` is reserved
  // for "no hue-preserving colour reaches the floor at all", never "not within my aesthetic
  // sub-range".
  it('falls through to the true lightness extremes when the preferred band alone is not enough', () => {
    // Pure blue (#0000FF, hue 240°, full saturation) only carries 7.22% of the WCAG luminance
    // weight: within the preferred [0.04, 0.96] band its best achievable contrast against
    // surface luminance 0.16 is only ~4.25:1 (short of 4.5). But WCAG's own algebra guarantees
    // max(contrast-to-black, contrast-to-white) ≥ √21 ≈ 4.583 against ANY surface — here pure
    // white reaches ~4.77:1 — so a real, valid, only-slightly-further-out answer exists and must
    // be returned instead of a false `ok: false`.
    expect(() => solveForContrast('#0000FF', 0.16, 4.5)).not.toThrow()
    const result = solveForContrast('#0000FF', 0.16, 4.5)
    expect(result.ok).toBe(true)
    expect(result.ratio).toBeGreaterThanOrEqual(4.5)
    expect(result.color).toMatch(/^#[0-9A-F]{6}$/)
  })

  // The regression pinned by the coordinator's review: this exact combination used to report
  // `ok: false` at ratio 4.378 (the old clamp's 0.96 bound) even though pure white reaches
  // 4.773 one step further out — a `mono-grid` `textMuted` on a `northern-lights` gradient box
  // at this exact luminance was one of the "muted captions nearly vanish" cases doc 02's own
  // named follow-up describes. See `surface.spec.ts` for the same case through the full
  // `surfaceFromBackground` → `resolveColor` path, not just this raw function.
  it('regression: surface luminance 0.170, base #555555, floor 4.5 → ok:true', () => {
    const result = solveForContrast('#555555', 0.17, 4.5)
    expect(result.ok).toBe(true)
    expect(result.ratio).toBeGreaterThanOrEqual(4.5)
  })

  it('the low floor (1.4, the line role) is met for almost any base colour', () => {
    const result = solveForContrast('#38BDF8', 0.5, 1.4)
    expect(result.ok).toBe(true)
  })

  it('reports a genuine, deterministic ok:false for a floor above √21 ≈ 4.583', () => {
    // No role in this codebase uses a floor this high (text/textMuted floor at 4.5, line at
    // 1.4) — this is a pure test of the fallback path itself, using a floor high enough that
    // WCAG's own algebra can no longer guarantee an achromatic escape hatch. At surface
    // luminance 0.18, contrast-to-black is 4.6 and contrast-to-white is ~4.565 — both short of
    // 5 — so this is unreachable regardless of the base colour's hue (an achromatic base makes
    // the point cleanly: the entire lightness ramp IS the black-white line, so there is nowhere
    // further to search).
    const result = solveForContrast('#808080', 0.18, 5)
    expect(result.ok).toBe(false)
    expect(result.ratio).toBeCloseTo(4.6, 2)
    expect(result.ratio).toBeLessThan(5)
    expect(result.color).toMatch(/^#[0-9A-F]{6}$/)
  })

  it('ok:true never lies: every successful resolution actually meets its floor', () => {
    // A property test over a spread of hues/saturations/surfaces/floors — the invariant the
    // linter (P31) will depend on.
    const floors = [1.4, 3, 4.5]
    for (let hueDeg = 0; hueDeg < 360; hueDeg += 37) {
      for (const s of [0, 0.4, 1]) {
        const base = rgbToHex(hslToRgb({ h: hueDeg / 360, s, l: 0.5 }))
        for (let bg = 0.05; bg < 1; bg += 0.13) {
          for (const floor of floors) {
            const result = solveForContrast(base, bg, floor)
            if (result.ok) expect(result.ratio).toBeGreaterThanOrEqual(floor)
          }
        }
      }
    }
  })
})
