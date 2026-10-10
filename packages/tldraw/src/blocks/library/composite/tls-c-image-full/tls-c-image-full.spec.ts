/**
 * tls.c.image-full (AC6) — panel placements, opaque panel, scrim, the full-bleed layout, fit, parity.
 */

import { tlsCImageFull, buildImageFull } from './index'
import { standardBlockSuite, leavesOf, absoluteLeaves, assertContained, assertNoTextOverlap } from '../../text/standard-suite'
import { depthOk, layoutAt, hasPart, compileInRegion } from '../composite-test'
import { getSlideLayout } from '../../../slide-layouts'
import { resolveTokens } from '../../../tokens'
import { DEFAULT_DECK_THEME } from '~state/shapes/shared/deck-theme'

standardBlockSuite(tlsCImageFull, { withRegistry: true, noCapacity: true })

const EX = tlsCImageFull.describe!.example.props as Record<string, unknown>
const W = 1920
const H = 1080

describe('tls.c.image-full', () => {
  it('is a slide-scope media composite, tier 1, with the panel and scrim knobs', () => {
    expect(tlsCImageFull.scope).toBe('slide')
    expect(tlsCImageFull.category).toBe('media')
    expect(tlsCImageFull.aiTier).toBe(1)
    expect(tlsCImageFull.looks).toEqual(['panel', 'scrim', 'frame'])
  })

  it('the photo covers the whole box, under the scrim and the panel', () => {
    const t = layoutAt(tlsCImageFull, EX, W, H)
    const ls = absoluteLeaves(t)
    const img = ls.find((l) => l.k === 'image')!
    expect([img.x, img.y, img.width, img.height]).toEqual([0, 0, W, H])
    const iImg = ls.indexOf(img)
    const iScrim = ls.findIndex((l) => l.part === 'scrim')
    const iPanel = ls.findIndex((l) => l.part === 'panel')
    expect(iImg).toBeLessThan(iScrim)
    expect(iScrim).toBeLessThan(iPanel)
  })

  it.each(['bottom-left', 'left', 'center'] as const)('panel %s: opaque, holds the text, inside the box', (panel) => {
    const t = layoutAt(tlsCImageFull, { ...EX, panel }, W, H)
    const p = leavesOf(t, 'panel').find((l) => l.k === 'rect')!
    expect((p.node as any).fill.type).toBe('solid')
    expect((p.node as any).fill.color).not.toMatch(/^rgba|transparent/i)
    for (const part of ['kicker', 'title', 'text']) {
      for (const l of leavesOf(t, part)) {
        expect(l.x).toBeGreaterThanOrEqual(p.x - 1)
        expect(l.x + l.width).toBeLessThanOrEqual(p.x + p.width + 1)
        expect(l.y).toBeGreaterThanOrEqual(p.y - 1)
        expect(l.y + l.height).toBeLessThanOrEqual(p.y + p.height + 1)
      }
    }
    if (panel === 'left') expect([p.x, p.y, p.height]).toEqual([0, 0, H])
    if (panel === 'center') expect(Math.abs(p.x + p.width / 2 - W / 2)).toBeLessThanOrEqual(1)
    if (panel === 'bottom-left') expect(p.y + p.height).toBeLessThan(H)
    assertContained(t, { width: W, height: H })
    assertNoTextOverlap(t)
  })

  it('scrim strong is darker than medium', () => {
    const alpha = (t: any) => Number(/([\d.]+)\)$/.exec((leavesOf(t, 'scrim')[0].node as any).fill.color)![1])
    expect(alpha(layoutAt(tlsCImageFull, { ...EX, scrim: 'strong' }, W, H))).toBeGreaterThan(alpha(layoutAt(tlsCImageFull, { ...EX, scrim: 'medium' }, W, H)))
  })

  it('fits at size.min for every panel', () => {
    const [w, h] = tlsCImageFull.size.min
    for (const panel of ['bottom-left', 'left', 'center']) {
      const t = layoutAt(tlsCImageFull, { ...EX, panel }, w, h)
      assertContained(t, { width: w, height: h })
      expect(hasPart(t, 'title')).toBe(true)
    }
  })

  // AC8: new panels, the gradient scrim and the frame — at size.preferred and size.min
  const AC8 = [
    { panel: 'right' },
    { panel: 'split' },
    { panel: 'band' },
    { scrim: 'gradient' },
    { panel: 'left', scrim: 'gradient' },
    { panel: 'center', scrim: 'gradient' },
    { frame: true, panel: 'center' },
    { frame: true, panel: 'split' },
    { frame: true, panel: 'band' },
  ]
  it.each(AC8.map((k) => [JSON.stringify(k), k] as const))('AC8 %s fits at preferred and min size, text inside, no overlap', (_n, knobs) => {
    for (const [w, h] of [tlsCImageFull.size.preferred, tlsCImageFull.size.min]) {
      const t = layoutAt(tlsCImageFull, { ...EX, ...knobs }, w, h)
      assertContained(t, { width: w, height: h })
      assertNoTextOverlap(t)
      for (const part of ['title', 'kicker', 'text']) expect([part, hasPart(t, part)]).toEqual([part, true])
    }
  })

  it('AC8 split: the photo and the panel do not overlap; band: the panel spans the foot', () => {
    const t = layoutAt(tlsCImageFull, { ...EX, panel: 'split' }, W, H)
    const img = absoluteLeaves(t).find((l) => l.k === 'image')!
    const p = leavesOf(t, 'panel').find((l) => l.k === 'rect')!
    expect(img.x + img.width).toBeLessThanOrEqual(p.x + 1)
    expect(p.x + p.width).toBeCloseTo(W, 0)
    const b = leavesOf(layoutAt(tlsCImageFull, { ...EX, panel: 'band' }, W, H), 'panel').find((l) => l.k === 'rect')!
    expect([b.x, b.width, Math.round(b.y + b.height)]).toEqual([0, W, H])
  })

  it('AC8 gradient: no card, a dark fade, light text; frame insets the photo', () => {
    const g = layoutAt(tlsCImageFull, { ...EX, scrim: 'gradient' }, W, H)
    expect(leavesOf(g, 'panel')).toHaveLength(0)
    expect((leavesOf(g, 'scrim')[0].node as any).fill.type).toBe('linearGradient')
    expect((leavesOf(g, 'title')[0].node as any).style.color.toUpperCase()).toBe('#FFFFFF')
    const f = layoutAt(tlsCImageFull, { ...EX, frame: true }, W, H)
    const img = absoluteLeaves(f).find((l) => l.k === 'image')!
    expect(img.x).toBeGreaterThan(0)
    expect(img.x + img.width).toBeLessThan(W)
  })

  it('AC8: the AC6 looks are unchanged (no frame, no gradient)', () => {
    for (const panel of ['bottom-left', 'left', 'center']) {
      const t = layoutAt(tlsCImageFull, { ...EX, panel, frame: false }, W, H)
      expect(absoluteLeaves(t).find((l) => l.k === 'image')!.x).toBe(0)
    }
  })

  it('the full-bleed layout is one region over the whole frame (S13)', () => {
    const regions = getSlideLayout('full-bleed')!.compile({ width: W, height: H }, resolveTokens(DEFAULT_DECK_THEME))
    expect(regions).toEqual({ content: { x: 0, y: 0, width: W, height: H } })
    const { rects } = compileInRegion(tlsCImageFull, EX, 'full-bleed', 'content')
    expect(rects).toEqual([{ left: 0, top: 0, right: W, bottom: H }])
  })

  it('build() depth <= 4', () => {
    depthOk(tlsCImageFull, buildImageFull, EX, W, H)
  })
})
