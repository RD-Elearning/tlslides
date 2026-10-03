/**
 * tls.x.logo-mark — corners, sizes, ratio convention, box containment, placeholder, alt lint.
 */

import { tlsXLogoMark } from './index'
import { standardBlockSuite, leavesOf, absoluteLeaves } from '../../text/standard-suite'
import { ctxNoAssets, ctxWithAssets } from '../../media/media-test'
import { renderNodeToSvg } from '../../../render-svg'

const lay = (props: Record<string, unknown>, w = 200, h = 64, assets = true) =>
  tlsXLogoMark.layout({ ...(tlsXLogoMark.defaults as any), image: 'acme', alt: 'Acme', ...props } as any, (assets ? ctxWithAssets : ctxNoAssets)(w, h))
const logo = (tree: any) => leavesOf(tree, 'logo')[0]

standardBlockSuite(tlsXLogoMark, { noCapacity: true })

describe('tls.x.logo-mark', () => {
  it('always fits (contain), never crops', () => {
    expect((logo(lay({})).node as any).fit).toBe('contain')
  })

  it('size sm < md, both quiet (<= 80) and clamped by the box height', () => {
    const h = (size: string, boxH = 120) => logo(lay({ size, ratio: 2 }, 400, boxH)).height
    expect(h('sm')).toBeLessThan(h('md'))
    expect(h('md')).toBeLessThanOrEqual(80)
    expect(h('md', 20)).toBeLessThanOrEqual(20)
  })

  it('corners with a known ratio: left/right x, top/bottom y', () => {
    const at = (corner: string) => logo(lay({ ratio: 3, corner }, 300, 100))
    expect(at('top-left').x).toBe(0)
    expect(at('top-left').y).toBe(0)
    const tr = at('top-right')
    expect(tr.x + tr.width).toBeCloseTo(300, 3)
    expect(tr.y).toBe(0)
    const bl = at('bottom-left')
    expect(bl.x).toBe(0)
    expect(bl.y + bl.height).toBeCloseTo(100, 3)
    const br = at('bottom-right')
    expect(br.x + br.width).toBeCloseTo(300, 3)
    expect(br.y + br.height).toBeCloseTo(100, 3)
  })

  it('the image box has exactly the ratio and stays inside the width', () => {
    const l = logo(lay({ ratio: 4 }, 100, 64))
    expect(l.width / l.height).toBeCloseTo(4, 3)
    expect(l.width).toBeLessThanOrEqual(100)
  })

  it('reads the natural ratio from ctx.asset() when no ratio is given', () => {
    const ctx = { ...ctxWithAssets(300, 64), asset: () => ({ width: 300, height: 100 }) }
    const tree = tlsXLogoMark.layout({ ...(tlsXLogoMark.defaults as any), image: 'acme', alt: 'Acme' } as any, ctx)
    expect(logo(tree).width / logo(tree).height).toBeCloseTo(3, 3)
  })

  it('without a ratio the logo takes the full width (corner has no horizontal effect)', () => {
    const l = logo(lay({ corner: 'top-left' }, 300, 64))
    expect(l.x).toBe(0)
    expect(l.width).toBe(300)
  })

  it('top corners hug the logo height; bottom corners keep the box height', () => {
    expect((lay({ ratio: 3, corner: 'top-left', size: 'sm' }, 300, 100) as any).box.height).toBeLessThan(100)
    expect((lay({ ratio: 3, corner: 'bottom-left' }, 300, 100) as any).box.height).toBe(100)
  })

  it('a missing or empty logo renders the placeholder with its alt (no crash)', () => {
    for (const image of ['', 'gone']) {
      const svg = renderNodeToSvg(lay({ image, alt: 'Acme Corp' }, 200, 64, false))
      expect(svg).toContain('stroke-dasharray')
      expect(svg).toContain('Acme Corp')
    }
    expect(() => lay({ ratio: 'x' as any, image: null as any })).not.toThrow()
  })

  it('lint: empty alt is a warning', () => {
    expect(tlsXLogoMark.lint!({ image: 'a', alt: '' } as any, {} as any)).toEqual([expect.objectContaining({ level: 'warning', rule: 'alt/missing' })])
    expect(tlsXLogoMark.lint!({ image: 'a', alt: 'A' } as any, {} as any)).toEqual([])
  })

  it('stays inside its box at tiny sizes', () => {
    for (const l of absoluteLeaves(lay({ ratio: 3, corner: 'bottom-right' }, 40, 30))) {
      expect(l.x + l.width).toBeLessThanOrEqual(42)
      expect(l.y + l.height).toBeLessThanOrEqual(32)
    }
  })
})
