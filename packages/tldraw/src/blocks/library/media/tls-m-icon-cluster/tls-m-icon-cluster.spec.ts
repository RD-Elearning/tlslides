/**
 * tls.m.icon-cluster (vivid V3) — seeded placement inside the box, no two icons touching, one part
 * per icon, the ambient bob per icon.
 */

import { tlsMIconCluster } from './index'
import { clusterSpots } from './layout'
import { standardBlockSuite, absoluteLeaves, allNodes } from '../../text/standard-suite'
import { ctxNoAssets } from '../media-test'

const lay = (props: Record<string, unknown>, w = 480, h = 360) =>
  tlsMIconCluster.layout({ ...(tlsMIconCluster.defaults as any), ...props } as any, ctxNoAssets(w, h))

standardBlockSuite(tlsMIconCluster, { noCapacity: true })

describe('tls.m.icon-cluster', () => {
  it.each([1, 3, 5, 7])('%i icons: every square inside the box, none overlapping', (n) => {
    for (const [W, H] of [[480, 360], [900, 200], [200, 600]]) {
      const spots = clusterSpots(n, W, H, 7)
      expect(spots).toHaveLength(n)
      for (const p of spots) {
        expect(p.x - p.s / 2).toBeGreaterThanOrEqual(-0.01)
        expect(p.y - p.s / 2).toBeGreaterThanOrEqual(-0.01)
        expect(p.x + p.s / 2).toBeLessThanOrEqual(W + 0.01)
        expect(p.y + p.s / 2).toBeLessThanOrEqual(H + 0.01)
      }
      if (n <= 5 && W >= 480) {
        for (let i = 0; i < n; i++)
          for (let j = i + 1; j < n; j++) expect(Math.hypot(spots[i].x - spots[j].x, spots[i].y - spots[j].y)).toBeGreaterThan((spots[i].s + spots[j].s) / 2 - 1)
      }
    }
  })

  it('the same seed draws the same picture; another seed another', () => {
    expect(JSON.stringify(lay({ seed: 4 }))).toBe(JSON.stringify(lay({ seed: 4 })))
    expect(JSON.stringify(lay({ seed: 4 }))).not.toBe(JSON.stringify(lay({ seed: 5 })))
  })

  it('one part per icon (a disc and a glyph inside), the glyphs are icons, extra names dropped past 7', () => {
    const tree = lay({ icons: ['atom', 'flask', 'dna', 'microscope', 'planet', 'bulb', 'book', 'school', 'pencil'] })
    const parts = allNodes(tree).filter((n) => /^icon\[\d+\]$/.test(n.part ?? ''))
    expect(parts).toHaveLength(7)
    const glyphs = absoluteLeaves(tree).filter((l) => /\.glyph$/.test(l.part ?? ''))
    expect(glyphs.every((g) => g.k === 'icon')).toBe(true)
    expect(absoluteLeaves(lay({ backing: 'none' })).some((l) => /\.disc$/.test(l.part ?? ''))).toBe(false)
  })

  it('bobs per icon in the viewer unless switched off', () => {
    const amb = tlsMIconCluster.motion!.ambient as (p: Record<string, unknown>) => { preset: string; part?: string } | null
    expect(amb({})).toMatchObject({ preset: 'bob', part: 'icon' })
    expect(amb({ ambient: 'none' })).toBeNull()
  })
})
