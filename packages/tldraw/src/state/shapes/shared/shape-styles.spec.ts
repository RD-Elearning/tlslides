import { ColorStyle, DashStyle, SizeStyle, ShapeStyles } from '~types'
import {
  clampCornerRadius,
  defaultStyle,
  fills,
  getEffectiveStrokeWidth,
  getShapeOpacity,
  getShapeStyle,
  getStrokeWidth,
  strokes,
} from './shape-styles'

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
