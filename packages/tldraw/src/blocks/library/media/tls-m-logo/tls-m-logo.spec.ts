/**
 * tls.m.logo — fit, never cropped, ratio, align, plate, placeholder, alt lint.
 */

import { tlsMLogo } from './index'
import { standardBlockSuite, leavesOf, absoluteLeaves } from '../../text/standard-suite'
import { ctxNoAssets, ctxWithAssets } from '../media-test'
import { renderNodeToSvg } from '../../../render-svg'

const lay = (props: Record<string, unknown>, w = 420, h = 160, assets = true) =>
  tlsMLogo.layout({ ...(tlsMLogo.defaults as any), image: 'acme', alt: 'Acme', ...props } as any, (assets ? ctxWithAssets : ctxNoAssets)(w, h))
const logo = (tree: any) => leavesOf(tree, 'logo').find((l) => l.k === 'image')!

standardBlockSuite(tlsMLogo, { noCapacity: true })

describe('tls.m.logo', () => {
  it('always fits (contain), never crops', () => {
    expect((logo(lay({})).node as any).fit).toBe('contain')
  })

  it('maxHeight sm < md < lg, clamped by the box height', () => {
    const h = (maxHeight: string) => logo(lay({ maxHeight, ratio: 2 }, 600, 400)).height
    expect(h('sm')).toBeLessThan(h('md'))
    expect(h('md')).toBeLessThan(h('lg'))
    expect(logo(lay({ maxHeight: 'lg', ratio: 2 }, 600, 50)).height).toBeLessThanOrEqual(50)
  })

  it('with a ratio the image box has exactly that ratio and stays inside the width', () => {
    const l = logo(lay({ ratio: 4 }, 300, 160))
    expect(l.width / l.height).toBeCloseTo(4, 3)
    expect(l.width).toBeLessThanOrEqual(300)
    const narrow = logo(lay({ ratio: 4, maxHeight: 'lg' }, 200, 160))
    expect(narrow.width).toBeLessThanOrEqual(200)
    expect(narrow.width / narrow.height).toBeCloseTo(4, 3)
  })

  it('align moves a known-ratio logo to the start, centre or end', () => {
    const x = (align: string) => logo(lay({ ratio: 2, align }, 600, 160))
    expect(x('start').x).toBe(0)
    expect(x('end').x + x('end').width).toBeCloseTo(600, 3)
    expect(x('center').x + x('center').width / 2).toBeCloseTo(300, 3)
  })

  it('without a ratio the logo takes the full width (contain centres it)', () => {
    const l = logo(lay({ align: 'start' }, 600, 160))
    expect(l.x).toBe(0)
    expect(l.width).toBe(600)
  })

  it('reads the natural ratio from ctx.asset() when no ratio is given', () => {
    const ctx = { ...ctxWithAssets(600, 160), asset: () => ({ width: 300, height: 100 }) }
    const tree = tlsMLogo.layout({ ...(tlsMLogo.defaults as any), image: 'acme', alt: 'Acme' } as any, ctx)
    const l = logo(tree)
    expect(l.width / l.height).toBeCloseTo(3, 3)
  })

  it('plate none draws no plate; surface and alt draw one that contains the logo', () => {
    expect(leavesOf(lay({ ratio: 2 }), 'logo.plate')).toHaveLength(0)
    for (const plate of ['surface', 'alt']) {
      const tree = lay({ ratio: 2, plate })
      const p = leavesOf(tree, 'logo.plate')[0]
      const l = logo(tree)
      expect(p.x).toBeLessThanOrEqual(l.x)
      expect(p.y).toBeLessThanOrEqual(l.y)
      expect(p.x + p.width).toBeGreaterThanOrEqual(l.x + l.width)
      expect(p.y + p.height).toBeGreaterThanOrEqual(l.y + l.height)
    }
  })

  it('a missing or empty logo renders the placeholder with its alt (no crash)', () => {
    for (const image of ['', 'gone']) {
      const svg = renderNodeToSvg(lay({ image, alt: 'Acme Corp' }, 420, 160, false))
      expect(svg).toContain('stroke-dasharray')
      expect(svg).toContain('Acme Corp')
    }
    expect(() => lay({ ratio: 'x' as any, image: null as any })).not.toThrow()
  })

  it('lint: empty alt is a warning', () => {
    expect(tlsMLogo.lint!({ image: 'a', alt: '' } as any, {} as any)).toEqual([expect.objectContaining({ level: 'warning', rule: 'alt/missing' })])
    expect(tlsMLogo.lint!({ image: 'a', alt: 'A' } as any, {} as any)).toEqual([])
  })

  it('stays inside its box at tiny sizes', () => {
    for (const l of absoluteLeaves(lay({ ratio: 3, plate: 'alt' }, 40, 30))) {
      expect(l.x + l.width).toBeLessThanOrEqual(42)
      expect(l.y + l.height).toBeLessThanOrEqual(32)
    }
  })
})
