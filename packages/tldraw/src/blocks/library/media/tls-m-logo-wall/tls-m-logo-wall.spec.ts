/**
 * tls.m.logo-wall — grid, equal-area math, heading toggle, plates, dividers, placeholder, lint.
 */

import { tlsMLogoWall } from './index'
import { standardBlockSuite, leavesOf, absoluteLeaves } from '../../text/standard-suite'
import { ctxNoAssets, ctxWithAssets, assertDisjoint } from '../media-test'
import { renderNodeToSvg } from '../../../render-svg'
import { autoLogoCols, sizeLogos } from './layout'

const logos = (n: number, ratio?: (i: number) => number | undefined) =>
  Array.from({ length: n }, (_, i) => ({ image: `l${i}`, alt: `Brand ${i}`, ...(ratio?.(i) ? { ratio: ratio(i) } : {}) }))
const lay = (props: Record<string, unknown>, w = 1200, h = 360, assets = true) =>
  tlsMLogoWall.layout({ ...(tlsMLogoWall.defaults as any), ...props } as any, (assets ? ctxWithAssets : ctxNoAssets)(w, h))
const imgs = (tree: any) => absoluteLeaves(tree).filter((l) => l.k === 'image')

standardBlockSuite(tlsMLogoWall, { overflowProps: { logos: logos(20) } })

describe('tls.m.logo-wall', () => {
  describe('area equalisation math', () => {
    it('a 4:1 and a 1:1 logo get the same area', () => {
      const [a, b] = sizeLogos('area', [4, 1], 300, 120)
      expect(a.width * a.height).toBeCloseTo(b.width * b.height, 6)
      expect(a.width / a.height).toBeCloseTo(4, 6)
      expect(b.width / b.height).toBeCloseTo(1, 6)
      // 4:1 is wider, the square is taller
      expect(a.width).toBeGreaterThan(b.width)
      expect(b.height).toBeGreaterThan(a.height)
      // and the numbers are the closed form: A = min(iw^2/r, ih^2*r) over both = 14400
      expect(a.width * a.height).toBeCloseTo(14400, 6)
      expect(a.width).toBeCloseTo(240, 6)
      expect(b.height).toBeCloseTo(120, 6)
    })

    it('every logo fits the inner box in area mode, whatever the ratios', () => {
      for (const ratios of [[4, 1], [8, 0.2], [1, 1, 1], [3, 2, 6, 0.5]]) {
        for (const s of sizeLogos('area', ratios, 280, 100)) {
          expect(s.width).toBeLessThanOrEqual(280 + 1e-6)
          expect(s.height).toBeLessThanOrEqual(100 + 1e-6)
        }
      }
    })

    it('height mode gives one height and the widest logo still fits', () => {
      const s = sizeLogos('height', [4, 1, 2], 200, 120)
      expect(new Set(s.map((x) => Math.round(x.height * 1000))).size).toBe(1)
      expect(Math.max(...s.map((x) => x.width))).toBeLessThanOrEqual(200 + 1e-6)
      expect(s[0].height).toBeCloseTo(50, 6)
    })

    it('area mode differs from height mode for mixed ratios, and a lone ratio-less logo is fitted by contain', () => {
      const h = sizeLogos('height', [4, 1], 300, 120)
      const a = sizeLogos('area', [4, 1], 300, 120)
      expect(h[1].height).toBeCloseTo(h[0].height, 6)
      expect(a[1].height).not.toBeCloseTo(a[0].height, 3)
      const u = sizeLogos('area', [undefined, undefined], 300, 120)
      expect(u[0].width).toBe(300)
    })

    it('the rendered tree keeps the equal areas (uniform: area)', () => {
      const tree = lay({ logos: [{ image: 'a', alt: 'A', ratio: 4 }, { image: 'b', alt: 'B', ratio: 1 }, { image: 'c', alt: 'C', ratio: 2 }], uniform: 'area' })
      const [a, b, c] = imgs(tree)
      expect(a.width * a.height).toBeCloseTo(b.width * b.height, 3)
      expect(c.width * c.height).toBeCloseTo(b.width * b.height, 3)
    })
  })

  it('autoLogoCols: at most 5 per row, rows balanced', () => {
    expect([3, 4, 5, 6, 8, 9, 12, 16].map(autoLogoCols)).toEqual([3, 4, 5, 3, 4, 5, 4, 4])
  })

  it('every logo gets its own cell: boxes are disjoint and inside the block', () => {
    for (const n of [3, 5, 7, 11, 16]) {
      const tree = lay({ logos: logos(n, (i) => [4, 1, 2][i % 3]) })
      const boxes = imgs(tree)
      expect(boxes).toHaveLength(n)
      assertDisjoint(boxes)
      for (const b of boxes) {
        expect(b.x).toBeGreaterThanOrEqual(-0.01)
        expect(b.x + b.width).toBeLessThanOrEqual(1200.01)
        expect(b.y + b.height).toBeLessThanOrEqual(360.01)
      }
    }
  })

  it('cols option forces the column count', () => {
    const xs = (cols: string) => new Set(imgs(lay({ logos: logos(8, () => 2), cols })).map((i) => Math.round(i.x + i.width / 2))).size
    expect(xs('4')).toBe(4)
    expect(xs('6')).toBe(6)
  })

  it('an incomplete last row is centred', () => {
    const tree = lay({ logos: logos(4, () => 1), cols: '3' })
    const last = imgs(tree).sort((a, b) => a.y - b.y).pop()!
    expect(Math.abs(last.x + last.width / 2 - 600)).toBeLessThan(1)
  })

  it('showHeading false (or an empty heading) removes the heading and gives the grid the height', () => {
    expect(leavesOf(lay({}), 'heading').length).toBeGreaterThan(0)
    expect(leavesOf(lay({ showHeading: false }), 'heading')).toHaveLength(0)
    expect(leavesOf(lay({ heading: '' }), 'heading')).toHaveLength(0)
  })

  it('a tall block does not stretch the cells into tall plates', () => {
    const t = lay({ logos: logos(6, () => 2), cols: '3', plates: true }, 900, 1000)
    for (const p of leavesOf(t, 'plate')) expect(p.height).toBeLessThanOrEqual(p.width * 0.7 + 0.5)
  })

  it('plates draw one plate per logo behind it; dividers sit between columns only', () => {
    const tree = lay({ logos: logos(6, () => 2), cols: '3', plates: true, dividers: true })
    expect(leavesOf(tree, 'plate')).toHaveLength(6)
    expect(leavesOf(tree, 'divider')).toHaveLength(4)
    expect(leavesOf(lay({ logos: logos(6, () => 2), cols: '3' }), 'plate')).toHaveLength(0)
  })

  it('missing and empty logos render the placeholder with their alt text (no crash)', () => {
    const svg = renderNodeToSvg(lay({ logos: [{ image: '', alt: 'Empty one' }, { image: 'gone', alt: 'Gone two' }, { image: 'x', alt: 'Three' }] }, 900, 300, false))
    expect(svg).toContain('stroke-dasharray')
    expect(svg).toContain('Empty one')
    expect(svg).toContain('Gone two')
    expect(() => lay({ logos: [null, {}, { ratio: 'x' }] as any })).not.toThrow()
  })

  it('lint warns once per logo without alt text', () => {
    const f = tlsMLogoWall.lint!({ logos: [{ image: 'a', alt: '' }, { image: 'b', alt: '  ' }, { image: 'c', alt: 'ok' }] } as any, {} as any)
    expect(f).toHaveLength(2)
    expect(f[0]).toMatchObject({ level: 'warning', rule: 'alt/missing' })
  })

  it('capacity: more than 16 logos does not fit; remedy truncates', () => {
    const c = tlsMLogoWall.capacity!({ logos: logos(18) } as any, { width: 1200, height: 360 }, ctxNoAssets(1200, 360))
    expect(c.fits).toBe(false)
    expect(c.remedy).toEqual([{ kind: 'truncate', slot: 'logos' }])
  })
})
