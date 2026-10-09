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
    expect(tlsCImageFull.looks).toEqual(['panel', 'scrim'])
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
