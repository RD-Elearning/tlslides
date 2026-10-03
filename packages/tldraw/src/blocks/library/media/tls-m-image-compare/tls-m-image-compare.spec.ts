/**
 * tls.m.image-compare — side and split modes, the clip in both renderers, labels, placeholder.
 */

import { tlsMImageCompare } from './index'
import { standardBlockSuite, leavesOf, absoluteLeaves, allNodes } from '../../text/standard-suite'
import { ctxNoAssets, ctxWithAssets } from '../media-test'
import { renderNodeToSvg } from '../../../render-svg'

const lay = (props: Record<string, unknown>, w = 1200, h = 640, assets = true) =>
  tlsMImageCompare.layout(
    { ...(tlsMImageCompare.defaults as any), before: { image: 'old', alt: 'Old', label: 'Before' }, after: { image: 'new', alt: 'New', label: 'After' }, ...props } as any,
    (assets ? ctxWithAssets : ctxNoAssets)(w, h)
  )
const img = (tree: any, part: string) => leavesOf(tree, part).find((l) => l.k === 'image')!

standardBlockSuite(tlsMImageCompare, { noCapacity: true })

describe('tls.m.image-compare', () => {
  describe('side mode', () => {
    it('two equal frames with a gap, before on the left', () => {
      const t = lay({ mode: 'side' })
      const b = img(t, 'before')
      const a = img(t, 'after')
      expect(b.width).toBeCloseTo(a.width, 3)
      expect(a.x).toBeGreaterThan(b.x + b.width)
      expect(a.x + a.width).toBeLessThanOrEqual(1200.01)
    })

    it('labels default to Before / After and sit inside their frame', () => {
      const t = lay({ mode: 'side', before: { image: 'o', alt: 'o' }, after: { image: 'n', alt: 'n' } })
      const text = (p: string) => (leavesOf(t, p).find((l) => l.k === 'text')!.node as any).lines.map((x: any) => x.text).join('')
      expect(text('before.label')).toBe('Before')
      expect(text('after.label')).toBe('After')
      const lb = leavesOf(t, 'before.label').find((l) => l.k === 'text')!
      const b = img(t, 'before')
      expect(lb.x).toBeGreaterThanOrEqual(b.x)
      expect(lb.x + lb.width).toBeLessThanOrEqual(b.x + b.width)
      expect(lb.y + lb.height).toBeLessThanOrEqual(b.y + b.height)
    })

    it('divider false removes the divider', () => {
      expect(leavesOf(lay({ mode: 'side' }), 'divider').length).toBeGreaterThan(0)
      expect(leavesOf(lay({ mode: 'side', divider: false }), 'divider')).toHaveLength(0)
    })
  })

  describe('split mode', () => {
    it('after fills the frame; before sits in a clipped group over the LEFT half only', () => {
      const t = lay({ mode: 'split' })
      const clip = allNodes(t).find((n) => n.k === 'group' && n.clip) as any
      expect(clip).toBeDefined()
      expect(clip.box).toMatchObject({ x: 0, y: 0, width: 600, height: 640 })
      // the clip group is at the origin and its child uses absolute (full-frame) coordinates,
      // so DOM (relative to the group) and SVG (absolute) agree
      expect(clip.children[0].box).toMatchObject({ x: 0, y: 0, width: 1200, height: 640 })
      expect(img(t, 'after').width).toBe(1200)
    })

    it('SVG: clip-path is a rect of the left half; the DOM renderer clips with overflow hidden', () => {
      const svg = renderNodeToSvg(lay({ mode: 'split' }))
      expect(svg).toMatch(/<clipPath id="[^"]+"><rect x="0" y="0" width="600" height="640"\/><\/clipPath>/)
      expect(svg).toMatch(/clip-path="url\(#[^"]+\)"/)
      expect(svg.match(/<image\b/g)).toHaveLength(2)
    })

    it('divider and handle sit on the centre line; divider false removes both', () => {
      const t = lay({ mode: 'split' })
      const d = leavesOf(t, 'divider').find((l) => l.part === 'divider')!
      expect(d.x + d.width / 2).toBeCloseTo(600, 3)
      expect(leavesOf(t, 'divider.handle').length).toBe(1)
      expect(leavesOf(lay({ mode: 'split', divider: false }), 'divider')).toHaveLength(0)
    })

    it('labels sit in their own half, the after label right-anchored', () => {
      const t = lay({ mode: 'split' })
      const lb = leavesOf(t, 'before.label').find((l) => l.k === 'text')!
      const la = leavesOf(t, 'after.label').find((l) => l.k === 'text')!
      expect(lb.x + lb.width).toBeLessThanOrEqual(600)
      expect(la.x).toBeGreaterThanOrEqual(600)
      expect(la.x + la.width).toBeLessThanOrEqual(1200)
    })
  })

  it('a missing or empty image shows the placeholder in both modes (no crash)', () => {
    for (const mode of ['side', 'split']) {
      const svg = renderNodeToSvg(lay({ mode, before: { image: '', alt: 'Nothing here' } }, 800, 400, false))
      expect(svg).toContain('stroke-dasharray')
      expect(svg).toContain('Nothing here')
    }
    expect(() => lay({ before: null, after: 5 } as any)).not.toThrow()
  })

  it('lint: both images need alt text', () => {
    const f = tlsMImageCompare.lint!({ before: { image: 'a', alt: '' }, after: { image: 'b', alt: '' } } as any, {} as any)
    expect(f).toHaveLength(2)
    expect(f[0]).toMatchObject({ level: 'warning', rule: 'alt/missing' })
    expect(absoluteLeaves(lay({})).length).toBeGreaterThan(0)
  })
})
