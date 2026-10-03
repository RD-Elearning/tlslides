/**
 * tls.m.image-grid — patterns, cells, captions, placeholders, alt lint, capacity.
 */

import { tlsMImageGrid } from './index'
import { standardBlockSuite, absoluteLeaves } from '../../text/standard-suite'
import { ctxNoAssets, ctxWithAssets, imagesOf, assertDisjoint } from '../media-test'
import { renderNodeToSvg } from '../../../render-svg'
import { gridCells } from './layout'

const items = (n: number, cap = true) =>
  Array.from({ length: n }, (_, i) => ({ image: `pic${i}`, alt: `Photo ${i}`, ...(cap ? { caption: `Cap ${i}` } : {}) }))
const lay = (props: Record<string, unknown>, w = 1200, h = 640, assets = true) =>
  tlsMImageGrid.layout({ ...(tlsMImageGrid.defaults as any), ...props } as any, (assets ? ctxWithAssets : ctxNoAssets)(w, h))

standardBlockSuite(tlsMImageGrid, { overflowProps: { images: items(12) } })

describe('tls.m.image-grid', () => {
  const patterns = ['even', 'feature-left', 'feature-top', 'mosaic']

  it.each(patterns.flatMap((p) => [2, 3, 4, 5, 6, 7, 8, 9].map((n) => [p, n] as const)))(
    '%s with %i images: cells are disjoint and inside the box',
    (pattern, n) => {
      const cells = gridCells(pattern, n, 1200, 640, 24, 'auto')
      expect(cells).toHaveLength(n)
      assertDisjoint(cells.map((c, i) => ({ part: `c${i}`, ...c })))
      for (const c of cells) {
        expect(c.x).toBeGreaterThanOrEqual(-0.01)
        expect(c.y).toBeGreaterThanOrEqual(-0.01)
        expect(c.x + c.width).toBeLessThanOrEqual(1200.01)
        expect(c.y + c.height).toBeLessThanOrEqual(640.01)
      }
    }
  )

  it('renders one image node per item, truncating past 9', () => {
    expect(imagesOf(lay({ images: items(4) }))).toHaveLength(4)
    expect(imagesOf(lay({ images: items(12) }))).toHaveLength(9)
  })

  it('feature patterns make the first image the largest', () => {
    for (const pattern of ['feature-left', 'feature-top']) {
      const imgs = imagesOf(lay({ images: items(5, false), pattern, captions: 'none' }))
      const area = (b: { width: number; height: number }) => b.width * b.height
      for (const o of imgs.slice(1)) expect(area(imgs[0])).toBeGreaterThan(area(o) * 1.5)
    }
  })

  it('cols option sets the column count; auto picks from count and box', () => {
    const xs = (cols: string) => new Set(imagesOf(lay({ images: items(8, false), cols, captions: 'none' })).map((i) => Math.round(i.x))).size
    expect(xs('2')).toBe(2)
    expect(xs('4')).toBe(4)
    expect(xs('auto')).toBeGreaterThanOrEqual(2)
  })

  it('gap none leaves no space between neighbouring cells', () => {
    const [a, b] = imagesOf(lay({ images: items(2, false), gap: 'none', cols: '2', captions: 'none' }))
    expect(Math.abs(b.x - (a.x + a.width))).toBeLessThan(0.5)
  })

  it('captions below reserve height under the image; overlay floats on it; none draws none', () => {
    const below = lay({ captions: 'below' })
    const overlay = lay({ captions: 'overlay' })
    const none = lay({ captions: 'none' })
    const part = (t: any, p: string) => absoluteLeaves(t).filter((l) => l.part?.startsWith(p))
    expect(part(below, 'cap[').length).toBe(4)
    expect(part(none, 'cap[').length).toBe(0)
    expect(part(overlay, 'cap[').some((l) => l.part?.endsWith('.scrim'))).toBe(true)
    expect(imagesOf(below)[0].height).toBeLessThan(imagesOf(none)[0].height)
    expect(imagesOf(overlay)[0].height).toBe(imagesOf(none)[0].height)
    // the overlay caption sits inside its image
    const img = imagesOf(overlay)[0]
    const scrim = part(overlay, 'cap[0].scrim')[0]
    expect(scrim.y + scrim.height).toBeLessThanOrEqual(img.y + img.height)
  })

  it('radius option reaches the image nodes', () => {
    const r = (radius: string) => (imagesOf(lay({ radius }))[0].node as any).radius
    expect(r('none')).toBeUndefined()
    expect(r('lg')).toBeGreaterThan(r('md'))
  })

  it('a missing or empty image renders the dashed placeholder with its alt text (no crash)', () => {
    const tree = lay({ images: [{ image: '', alt: 'Empty slot' }, { image: 'gone', alt: 'Missing asset' }] }, 800, 400, false)
    const svg = renderNodeToSvg(tree)
    expect(svg).toContain('stroke-dasharray')
    expect(svg).toContain('Empty slot')
    expect(svg).toContain('Missing asset')
    expect(svg).not.toMatch(/<image\b/)
    expect(() => lay({ images: [{}, null, { image: 5 }] } as any)).not.toThrow()
  })

  it('a resolved image renders an <image> in the SVG', () => {
    expect(renderNodeToSvg(lay({ images: items(2) }))).toMatch(/<image\b/)
  })

  it('lint warns on an image without alt text and is quiet otherwise', () => {
    const bad = tlsMImageGrid.lint!({ images: [{ image: 'a', alt: '' }, { image: 'b', alt: 'ok' }] } as any, {} as any)
    expect(bad).toHaveLength(1)
    expect(bad[0]).toMatchObject({ level: 'warning', rule: 'alt/missing' })
    expect(tlsMImageGrid.lint!({ images: items(3) } as any, {} as any)).toEqual([])
  })

  it('capacity: more than 9 images does not fit and remedies by truncating', () => {
    const c = tlsMImageGrid.capacity!({ images: items(10) } as any, { width: 1200, height: 640 }, ctxNoAssets(1200, 640))
    expect(c.fits).toBe(false)
    expect(c.remedy).toEqual([{ kind: 'truncate', slot: 'images' }])
  })
})
