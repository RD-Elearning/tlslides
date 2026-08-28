import { TDAssetType } from '~types'
import type { SlideBackground, TDAssets } from '~types'
import {
  gradientAngleToVector,
  resolveSlideBackground,
  resolveShapeGradientFill,
  GRADIENT_PRESETS,
} from './background'

describe('gradientAngleToVector — CSS linear-gradient angle convention', () => {
  it('0deg points to top: the line runs from bottom-center to top-center', () => {
    const v = gradientAngleToVector(0)
    expect(v.x1).toBeCloseTo(0.5)
    expect(v.y1).toBeCloseTo(1)
    expect(v.x2).toBeCloseTo(0.5)
    expect(v.y2).toBeCloseTo(0)
  })

  it('90deg points to right: the line runs from left-center to right-center', () => {
    const v = gradientAngleToVector(90)
    expect(v.x1).toBeCloseTo(0)
    expect(v.y1).toBeCloseTo(0.5)
    expect(v.x2).toBeCloseTo(1)
    expect(v.y2).toBeCloseTo(0.5)
  })

  it('180deg points to bottom, 270deg points to left — the exact reverse of 0/90', () => {
    const v180 = gradientAngleToVector(180)
    const v0 = gradientAngleToVector(0)
    expect(v180.x1).toBeCloseTo(v0.x2)
    expect(v180.y1).toBeCloseTo(v0.y2)
    expect(v180.x2).toBeCloseTo(v0.x1)
    expect(v180.y2).toBeCloseTo(v0.y1)

    const v270 = gradientAngleToVector(270)
    const v90 = gradientAngleToVector(90)
    expect(v270.x1).toBeCloseTo(v90.x2)
    expect(v270.y1).toBeCloseTo(v90.y2)
  })

  it('45deg reaches exactly the bottom-left and top-right corners of the unit box', () => {
    const v = gradientAngleToVector(45)
    expect(v.x1).toBeCloseTo(0)
    expect(v.y1).toBeCloseTo(1)
    expect(v.x2).toBeCloseTo(1)
    expect(v.y2).toBeCloseTo(0)
  })
})

describe('resolveSlideBackground', () => {
  it('returns undefined for an undefined background, matching every page before this phase', () => {
    expect(resolveSlideBackground(undefined, 'page1')).toBeUndefined()
  })

  it('treats the legacy plain-string shape of the old reserved field as a solid color', () => {
    expect(resolveSlideBackground('#ff0000', 'page1')).toEqual({
      type: 'solid',
      color: '#ff0000',
    })
  })

  it('resolves a solid background as-is', () => {
    const bg: SlideBackground = { type: 'solid', color: '#123456' }
    expect(resolveSlideBackground(bg, 'page1')).toEqual({ type: 'solid', color: '#123456' })
  })

  it('resolves a linear gradient into an x1/y1/x2/y2 vector and a unique, page-derived id', () => {
    const bg: SlideBackground = {
      type: 'linearGradient',
      angle: 90,
      stops: [
        { color: '#ff0000', at: 0 },
        { color: '#0000ff', at: 1 },
      ],
    }
    const resolved = resolveSlideBackground(bg, 'page1')
    expect(resolved?.type).toBe('linearGradient')
    if (resolved?.type !== 'linearGradient') throw new Error('expected linearGradient')
    expect(resolved.id).toBe('page1-bg-gradient')
    expect(resolved.stops).toEqual([
      { color: '#ff0000', offset: 0 },
      { color: '#0000ff', offset: 1 },
    ])
  })

  it('gives two different pages two different gradient ids, so their <defs> never collide', () => {
    const bg: SlideBackground = {
      type: 'linearGradient',
      angle: 0,
      stops: [
        { color: '#fff', at: 0 },
        { color: '#000', at: 1 },
      ],
    }
    const a = resolveSlideBackground(bg, 'page-a')
    const b = resolveSlideBackground(bg, 'page-b')
    expect(a?.type === 'linearGradient' && a.id).not.toBe(b?.type === 'linearGradient' && b.id)
  })

  it('resolves a radial gradient, clamping stop offsets into 0-1', () => {
    const bg: SlideBackground = {
      type: 'radialGradient',
      cx: 0.5,
      cy: 0.5,
      stops: [
        { color: '#fff', at: -0.5 },
        { color: '#000', at: 1.5 },
      ],
    }
    const resolved = resolveSlideBackground(bg, 'page1')
    expect(resolved?.type).toBe('radialGradient')
    if (resolved?.type !== 'radialGradient') throw new Error('expected radialGradient')
    expect(resolved.stops).toEqual([
      { color: '#fff', offset: 0 },
      { color: '#000', offset: 1 },
    ])
  })

  it('resolves an image background from the asset table, or undefined if the asset is missing', () => {
    const bg: SlideBackground = { type: 'image', assetId: 'asset1', fit: 'cover' }
    const assets: TDAssets = {
      asset1: {
        id: 'asset1',
        type: TDAssetType.Image,
        src: 'https://example.com/a.png',
        size: [10, 10],
      },
    }
    const resolved = resolveSlideBackground(bg, 'page1', assets)
    expect(resolved).toEqual({
      type: 'image',
      id: 'page1-bg-image',
      href: 'https://example.com/a.png',
      fit: 'cover',
      opacity: undefined,
    })
    expect(resolveSlideBackground(bg, 'page1', {})).toBeUndefined()
  })
})

describe('resolveShapeGradientFill', () => {
  it('derives an id from the shape id, distinct from the page background id shape', () => {
    const resolved = resolveShapeGradientFill(
      { type: 'linearGradient', angle: 45, stops: [{ color: '#fff', at: 0 }, { color: '#000', at: 1 }] },
      'shape1'
    )
    expect(resolved.id).toBe('shape1-fill-gradient')
  })

  it('two different shapes get two different fill-gradient ids', () => {
    const gradient = {
      type: 'linearGradient' as const,
      angle: 0,
      stops: [
        { color: '#fff', at: 0 },
        { color: '#000', at: 1 },
      ],
    }
    const a = resolveShapeGradientFill(gradient, 'shape-a')
    const b = resolveShapeGradientFill(gradient, 'shape-b')
    expect(a.id).not.toBe(b.id)
  })
})

describe('GRADIENT_PRESETS', () => {
  it('curates at least 24 distinct, hand-picked gradients', () => {
    expect(GRADIENT_PRESETS.length).toBeGreaterThanOrEqual(24)
    const ids = new Set(GRADIENT_PRESETS.map((p) => p.id))
    expect(ids.size).toBe(GRADIENT_PRESETS.length)
  })

  it('every preset is a valid multi-stop linear gradient', () => {
    for (const preset of GRADIENT_PRESETS) {
      expect(preset.background.type).toBe('linearGradient')
      expect(preset.background.stops.length).toBeGreaterThanOrEqual(2)
      for (const stop of preset.background.stops) {
        expect(stop.color).toMatch(/^#[0-9a-f]{6}$/i)
        expect(stop.at).toBeGreaterThanOrEqual(0)
        expect(stop.at).toBeLessThanOrEqual(1)
      }
    }
  })
})
