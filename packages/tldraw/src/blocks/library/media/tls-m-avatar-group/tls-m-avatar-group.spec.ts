/**
 * tls.m.avatar-group — overlap, max and the +N bubble, sizing, caption, fallbacks, capacity.
 */

import { tlsMAvatarGroup } from './index'
import { standardBlockSuite, leavesOf, absoluteLeaves } from '../../text/standard-suite'
import { ctxNoAssets, ctxWithAssets } from '../media-test'
import { planRow } from './layout'

const people = (n: number) => Array.from({ length: n }, (_, i) => ({ name: `Person ${i}` }))
const lay = (props: Record<string, unknown>, w = 640, h = 120, assets = false) =>
  tlsMAvatarGroup.layout({ ...(tlsMAvatarGroup.defaults as any), ...props } as any, (assets ? ctxWithAssets : ctxNoAssets)(w, h))
const photos = (tree: any) => absoluteLeaves(tree).filter((l) => /^avatar\[\d+\]$/.test(l.part ?? ''))
const textOf = (tree: any, part: string) =>
  leavesOf(tree, part)
    .filter((l) => l.k === 'text')
    .map((l) => (l.node as any).lines.map((x: any) => x.text).join(''))
    .join('')

standardBlockSuite(tlsMAvatarGroup, { overflowProps: { people: people(25) } })

describe('tls.m.avatar-group', () => {
  it('shows at most max avatars (default 5) and a +N bubble for the rest', () => {
    const t = lay({ people: people(9), max: 5 })
    expect(photos(t)).toHaveLength(5)
    expect(textOf(t, 'more.label')).toBe('+4')
    expect(leavesOf(t, 'more').length).toBeGreaterThan(0)
    const t2 = lay({ people: people(3), max: 5 })
    expect(photos(t2)).toHaveLength(3)
    expect(leavesOf(t2, 'more')).toHaveLength(0)
  })

  it('max 1 and a missing max are handled', () => {
    expect(photos(lay({ people: people(4), max: 1 }))).toHaveLength(1)
    expect(photos(lay({ people: people(8), max: undefined }))).toHaveLength(5)
  })

  it('overlap: none leaves a gap, md overlaps by 30%, lg by 50%; avatars keep left-to-right order', () => {
    const step = (overlap: string) => {
      const [a, b] = absoluteLeaves(lay({ people: people(3), overlap, caption: '' })).filter((l) => /\.edge$/.test(l.part ?? ''))
      return { d: a.width, dx: b.x - a.x }
    }
    const none = step('none')
    const md = step('md')
    const lg = step('lg')
    expect(none.dx).toBeGreaterThan(none.d)
    expect(md.dx / md.d).toBeCloseTo(0.7, 2)
    expect(lg.dx / lg.d).toBeCloseTo(0.5, 2)
  })

  it('size sm < md < lg, and the row shrinks to fit a narrow box', () => {
    const d = (size: string) => photos(lay({ people: people(5), size }, 900, 200))[0].width
    expect(d('sm')).toBeLessThan(d('md'))
    expect(d('md')).toBeLessThan(d('lg'))
    const tree = lay({ people: people(10), max: 8, size: 'lg', caption: '' }, 260, 120)
    for (const l of absoluteLeaves(tree)) expect(l.x + l.width).toBeLessThanOrEqual(260 + 1)
  })

  it('planRow fits its width and keeps the counts', () => {
    for (const [n, max, ov, W] of [[10, 5, 0.3, 300], [3, 5, 0, 120], [20, 12, 0.5, 400]] as const) {
      const p = planRow(n, max, 112, ov, W)
      expect(p.width).toBeLessThanOrEqual(W + 1e-6)
      expect(p.shown).toBe(Math.min(n, max))
      expect(p.more).toBe(n - p.shown)
    }
  })

  it('people without an image get initials (Vietnamese diacritics kept); with an image an image node', () => {
    const t = lay({ people: [{ name: 'Đặng Ánh' }, { name: 'Linh' }, { name: 'Ada Lovelace' }], caption: '' })
    expect(textOf(t, 'avatar[0].initials')).toBe('ĐÁ')
    expect(textOf(t, 'avatar[1].initials')).toBe('L')
    const w = lay({ people: [{ name: 'A B', image: 'p1' }, { name: 'C D', image: 'p2' }], caption: '' }, 640, 120, true)
    expect(absoluteLeaves(w).filter((l) => l.k === 'image')).toHaveLength(2)
  })

  it('caption sits right of the row when there is room, under it when there is not; empty caption draws none', () => {
    const wide = lay({ people: people(3), caption: 'Three people' }, 800, 120)
    const row = photos(wide)
    const cap = leavesOf(wide, 'caption')[0]
    expect(cap.x).toBeGreaterThan(Math.max(...row.map((r) => r.x + r.width)))
    const narrow = lay({ people: people(3), caption: 'Three people' }, 260, 200)
    expect(leavesOf(narrow, 'caption')[0].y).toBeGreaterThanOrEqual(photos(narrow)[0].height)
    expect(leavesOf(lay({ caption: '' }), 'caption')).toHaveLength(0)
  })

  it('hostile lists do not throw', () => {
    expect(() => lay({ people: [null, 3, {}, { name: 5 }] as any })).not.toThrow()
    expect(() => lay({ people: [] })).not.toThrow()
  })

  it('capacity: over 20 people does not fit', () => {
    const c = tlsMAvatarGroup.capacity!({ people: people(21) } as any, { width: 640, height: 120 }, ctxNoAssets(640, 120))
    expect(c.fits).toBe(false)
    expect(c.remedy).toEqual([{ kind: 'truncate', slot: 'people' }])
  })
})
