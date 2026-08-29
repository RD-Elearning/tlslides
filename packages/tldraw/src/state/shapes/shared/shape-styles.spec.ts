import { ColorStyle, DashStyle, FontStyle, SizeStyle, ShapeStyles } from '~types'
import {
  clampCornerRadius,
  computeAutoFitScale,
  defaultStyle,
  fills,
  getEffectiveStrokeWidth,
  getFontStyle,
  getLetterSpacingCss,
  getLetterSpacingEm,
  getLineHeight,
  getShapeOpacity,
  getShapeStyle,
  getStickyFontStyle,
  getStrokeWidth,
  resolveFont,
  strokes,
  unquoteFontFamily,
} from './shape-styles'
import { BUILT_IN_DECK_THEMES, themeToken } from './deck-theme'

const baseStyle: ShapeStyles = {
  ...defaultStyle,
  color: ColorStyle.Black,
  size: SizeStyle.Small,
  dash: DashStyle.Solid,
}

describe('getShapeOpacity', () => {
  it('falls back to fully opaque (1) when style.opacity is undefined', () => {
    expect(getShapeOpacity(baseStyle)).toBe(1)
  })

  it('falls back to fully opaque when not ghosted and opacity is undefined', () => {
    expect(getShapeOpacity(baseStyle, false)).toBe(1)
  })

  it('passes through an explicit opacity when not ghosted', () => {
    expect(getShapeOpacity({ ...baseStyle, opacity: 0.5 })).toBe(0.5)
  })

  it('clamps an out-of-range opacity into 0–1', () => {
    expect(getShapeOpacity({ ...baseStyle, opacity: 1.5 })).toBe(1)
    expect(getShapeOpacity({ ...baseStyle, opacity: -0.5 })).toBe(0)
  })

  it('multiplies the persisted opacity by the ghost dim, rather than replacing it', () => {
    const opaqueGhosted = getShapeOpacity(baseStyle, true)
    const halfGhosted = getShapeOpacity({ ...baseStyle, opacity: 0.5 }, true)

    // Ghosting a fully opaque shape yields exactly the ghost multiplier...
    expect(opaqueGhosted).toBeLessThan(1)
    // ...and ghosting an already-translucent shape dims it further still, rather than the ghost
    // dim simply overriding the user's opacity.
    expect(halfGhosted).toBeCloseTo(opaqueGhosted * 0.5)
    expect(halfGhosted).toBeLessThan(0.5)
  })
})

describe('getEffectiveStrokeWidth', () => {
  it('falls back to the size-enum-derived width when style.strokeWidth is undefined', () => {
    expect(getEffectiveStrokeWidth(baseStyle)).toBe(getStrokeWidth(SizeStyle.Small))
    expect(getEffectiveStrokeWidth({ ...baseStyle, size: SizeStyle.Large })).toBe(
      getStrokeWidth(SizeStyle.Large)
    )
  })

  it('honors an explicit arbitrary stroke width, overriding the size enum', () => {
    expect(getEffectiveStrokeWidth({ ...baseStyle, strokeWidth: 42 })).toBe(42)
  })

  it('clamps a negative stroke width to zero rather than producing invalid geometry', () => {
    expect(getEffectiveStrokeWidth({ ...baseStyle, strokeWidth: -10 })).toBe(0)
  })
})

describe('clampCornerRadius', () => {
  it('passes through a radius that fits comfortably inside the shape', () => {
    expect(clampCornerRadius(10, [200, 100])).toBe(10)
  })

  it('clamps a radius larger than the shape down to half of its smaller dimension', () => {
    // A 200x100 shape can round at most to a 50px radius before the two opposite arcs would
    // meet (a stadium shape); anything requested above that degenerates to that maximum instead
    // of producing overlapping/inverted geometry.
    expect(clampCornerRadius(1000, [200, 100])).toBe(50)
    expect(clampCornerRadius(1000, [100, 200])).toBe(50)
  })

  it('clamps a negative radius to zero', () => {
    expect(clampCornerRadius(-5, [200, 100])).toBe(0)
  })

  it('degenerates a square to a full circle at the maximum radius', () => {
    expect(clampCornerRadius(1000, [80, 80])).toBe(40)
  })
})

describe('getShapeStyle — Phase 8b arbitrary hex colour', () => {
  it('falls back to the theme palette when style.stroke/fill are undefined', () => {
    const filled = { ...baseStyle, isFilled: true }
    expect(getShapeStyle(filled, false).stroke).toBe(strokes.light[ColorStyle.Black])
    expect(getShapeStyle(filled, false).fill).toBe(fills.light[ColorStyle.Black])
    expect(getShapeStyle(filled, true).stroke).toBe(strokes.dark[ColorStyle.Black])
    expect(getShapeStyle(filled, true).fill).toBe(fills.dark[ColorStyle.Black])
  })

  it('an explicit stroke override wins over the color enum', () => {
    const style = { ...baseStyle, stroke: '#3a7bd5' }
    expect(getShapeStyle(style, false).stroke).toBe('#3a7bd5')
  })

  it('an explicit fill override wins over the color enum, but only when isFilled is true', () => {
    const filled = { ...baseStyle, isFilled: true, fill: '#f5a623' }
    expect(getShapeStyle(filled, false).fill).toBe('#f5a623')

    // Unfilled shapes still resolve to 'none', exactly as before this field existed — a fill
    // override sitting unused on an unfilled shape must not leak into the render.
    const unfilled = { ...baseStyle, isFilled: false, fill: '#f5a623' }
    expect(getShapeStyle(unfilled, false).fill).toBe('none')
  })

  it('does NOT flip an explicit stroke/fill override with the UI theme, unlike the enum', () => {
    // This is the deliberate semantic decision documented on getShapeStyle: an absolute hex is
    // presented to the user as "this exact colour" and must not shift when the app's own UI
    // theme is toggled, unlike the theme-dependent enum palette.
    const style = { ...baseStyle, isFilled: true, stroke: '#3a7bd5', fill: '#f5a623' }
    const light = getShapeStyle(style, false)
    const dark = getShapeStyle(style, true)
    expect(light.stroke).toBe('#3a7bd5')
    expect(dark.stroke).toBe('#3a7bd5')
    expect(light.fill).toBe('#f5a623')
    expect(dark.fill).toBe('#f5a623')

    // Sanity check that the enum path (no override) really does differ across themes — otherwise
    // the assertions above wouldn't prove anything.
    expect(getShapeStyle(baseStyle, false).stroke).not.toBe(getShapeStyle(baseStyle, true).stroke)
  })
})

describe('getShapeStyle — Phase 11 gradient fill', () => {
  const gradient = {
    type: 'linearGradient' as const,
    angle: 90,
    stops: [
      { color: '#ff0000', at: 0 },
      { color: '#0000ff', at: 1 },
    ],
  }

  it('a gradient fill wins over a flat fill hex and the color enum, when a shapeId is given', () => {
    const style = { ...baseStyle, isFilled: true, fill: '#f5a623', fillGradient: gradient }
    const resolved = getShapeStyle(style, false, 'shape1')
    expect(resolved.fill).toBe('url(#shape1-fill-gradient)')
    expect(resolved.fillGradientDef).toBeDefined()
    expect(resolved.fillGradientDef?.id).toBe('shape1-fill-gradient')
  })

  it('two shapes with the same gradient style still resolve two distinct <defs> ids', () => {
    const style = { ...baseStyle, isFilled: true, fillGradient: gradient }
    const a = getShapeStyle(style, false, 'shape-a')
    const b = getShapeStyle(style, false, 'shape-b')
    expect(a.fill).not.toBe(b.fill)
  })

  it('falls back to the flat fill/enum when no shapeId is given, rather than an unresolvable url()', () => {
    const style = { ...baseStyle, isFilled: true, fill: '#f5a623', fillGradient: gradient }
    const resolved = getShapeStyle(style, false)
    expect(resolved.fill).toBe('#f5a623')
    expect(resolved.fillGradientDef).toBeUndefined()
  })

  it('a gradient fill on an unfilled shape has no effect, exactly like a flat fill override', () => {
    const style = { ...baseStyle, isFilled: false, fillGradient: gradient }
    const resolved = getShapeStyle(style, false, 'shape1')
    expect(resolved.fill).toBe('none')
    expect(resolved.fillGradientDef).toBeUndefined()
  })
})

describe('getShapeStyle — Phase 12 theme tokens', () => {
  const theme = BUILT_IN_DECK_THEMES[0]

  it('resolves a stroke token against the active deck theme', () => {
    const style = { ...baseStyle, stroke: themeToken('accent1') }
    const resolved = getShapeStyle(style, false, undefined, theme)
    expect(resolved.stroke).toBe(theme.colors.accent1)
  })

  it('resolves a fill token against the active deck theme, only when isFilled', () => {
    const filled = { ...baseStyle, isFilled: true, fill: themeToken('surface') }
    expect(getShapeStyle(filled, false, undefined, theme).fill).toBe(theme.colors.surface)

    const unfilled = { ...baseStyle, isFilled: false, fill: themeToken('surface') }
    expect(getShapeStyle(unfilled, false, undefined, theme).fill).toBe('none')
  })

  it('falls back to the color enum — not a hardcoded colour — when no theme is active', () => {
    const style = { ...baseStyle, stroke: themeToken('accent1') }
    const resolved = getShapeStyle(style, false)
    expect(resolved.stroke).toBe(strokes.light[baseStyle.color])
  })

  it('the same fallback applies to an unresolvable (unknown-key) token', () => {
    const style = { ...baseStyle, stroke: 'theme:notAToken' }
    const resolved = getShapeStyle(style, false, undefined, theme)
    expect(resolved.stroke).toBe(strokes.light[baseStyle.color])
  })

  it('a plain hex override still works exactly as before — tokens are additive, not a replacement', () => {
    const style = { ...baseStyle, stroke: '#43CEA2' }
    expect(getShapeStyle(style, false, undefined, theme).stroke).toBe('#43CEA2')
  })
})

// Phase 17 — font resolution / typography helpers.
describe('resolveFont', () => {
  const theme = BUILT_IN_DECK_THEMES.find((t) => t.id === 'ivory-editorial')!

  it('falls back to the four-way enum when nothing is overridden', () => {
    const resolved = resolveFont({ ...baseStyle, font: FontStyle.Serif })
    expect(resolved.font).toBe(FontStyle.Serif)
    expect(resolved.face).toBe('"Crimson Pro"')
  })

  it('an explicit fontFamily wins outright, even with a fontToken and an active theme present', () => {
    const resolved = resolveFont(
      { ...baseStyle, font: FontStyle.Mono, fontFamily: '"Poppins", sans-serif', fontToken: 'heading' },
      theme
    )
    expect(resolved.face).toBe('"Poppins", sans-serif')
    // The enum is still returned (for the size-modifier/metrics table), untouched by the override.
    expect(resolved.font).toBe(FontStyle.Mono)
  })

  it('a fontToken resolves against the active theme’s pairing when fontFamily is unset', () => {
    const heading = resolveFont({ ...baseStyle, fontToken: 'heading' }, theme)
    expect(heading.font).toBe(theme.fonts.heading)
    const body = resolveFont({ ...baseStyle, fontToken: 'body' }, theme)
    expect(body.font).toBe(theme.fonts.body)
  })

  it('a fontToken degrades to style.font — not a hardcoded value — with no active theme', () => {
    const resolved = resolveFont({ ...baseStyle, font: FontStyle.Sans, fontToken: 'heading' })
    expect(resolved.font).toBe(FontStyle.Sans)
    expect(resolved.face).toBe('"Source Sans Pro"')
  })

  it("prefers a theme's own headingFamily/bodyFamily override over its enum pairing's bundled face", () => {
    const themeWithFamily = { ...theme, fonts: { ...theme.fonts, headingFamily: 'Georgia, serif' } }
    const resolved = resolveFont({ ...baseStyle, fontToken: 'heading' }, themeWithFamily)
    expect(resolved.face).toBe('Georgia, serif')
  })
})

describe('unquoteFontFamily', () => {
  it('strips a single wrapping quote pair', () => {
    expect(unquoteFontFamily('"Caveat Brush"')).toBe('Caveat Brush')
  })

  it('leaves an unquoted or multi-font value untouched', () => {
    expect(unquoteFontFamily('Georgia, serif')).toBe('Georgia, serif')
    expect(unquoteFontFamily('"Poppins", sans-serif')).toBe('"Poppins", sans-serif')
  })
})

describe('getLetterSpacingEm / getLetterSpacingCss / getLineHeight', () => {
  it('fall back to the pre-existing constants when unset', () => {
    expect(getLetterSpacingEm(baseStyle)).toBe(-0.03)
    expect(getLetterSpacingCss(baseStyle)).toBe('-0.03em')
    expect(getLineHeight(baseStyle)).toBe(1)
  })

  it('pass an explicit override through unchanged', () => {
    expect(getLetterSpacingEm({ ...baseStyle, letterSpacing: 0.1 })).toBe(0.1)
    expect(getLetterSpacingCss({ ...baseStyle, letterSpacing: 0.1 })).toBe('0.1em')
    expect(getLineHeight({ ...baseStyle, lineHeight: 1.6 })).toBe(1.6)
  })
})

describe('getFontStyle / getStickyFontStyle with a fontToken', () => {
  const theme = BUILT_IN_DECK_THEMES.find((t) => t.id === 'mono-grid')!

  it('bakes the theme-resolved face into the CSS font shorthand', () => {
    const style = { ...baseStyle, fontToken: 'heading' as const }
    expect(getFontStyle(style, theme)).toContain('"Source Code Pro"') // mono-grid's heading is Mono
    expect(getStickyFontStyle(style, theme)).toContain('"Source Code Pro"')
  })

  it('a token has no effect without a theme argument', () => {
    const style = { ...baseStyle, font: FontStyle.Sans, fontToken: 'heading' as const }
    expect(getFontStyle(style)).toContain('"Source Sans Pro"')
  })
})

describe('computeAutoFitScale', () => {
  it('never grows beyond 1 when the natural size already fits', () => {
    expect(computeAutoFitScale(100, 40, 400, 200)).toBe(1)
  })

  it('shrinks to the tighter of the two dimensions', () => {
    expect(computeAutoFitScale(400, 100, 200, 100)).toBe(0.5)
    expect(computeAutoFitScale(100, 400, 100, 200)).toBe(0.5)
  })

  it('never shrinks toward zero/negative or NaN for a degenerate size', () => {
    expect(computeAutoFitScale(0, 0, 100, 100)).toBe(1)
    expect(computeAutoFitScale(100, 100, 0, 0)).toBe(1)
  })
})
