/**
 * tls.m.avatar — initials (1-word, 2-word, Vietnamese), shapes, sizes, layouts, ring, toggles.
 */

import { tlsMAvatar } from './index'
import { standardBlockSuite, absoluteLeaves, leavesOf } from '../../text/standard-suite'
import { ctxNoAssets, ctxWithAssets } from '../media-test'
import { initialsOf } from '../_kit'

const lay = (props: Record<string, unknown>, w = 420, h = 240, assets = false) =>
  tlsMAvatar.layout({ ...(tlsMAvatar.defaults as any), ...props } as any, (assets ? ctxWithAssets : ctxNoAssets)(w, h))
const textOf = (tree: any, part: string) =>
  leavesOf(tree, part)
    .filter((l) => l.k === 'text')
    .map((l) => (l.node as any).lines.map((x: any) => x.text).join(''))
    .join('')

standardBlockSuite(tlsMAvatar, { noCapacity: true })

describe('tls.m.avatar', () => {
  describe('initialsOf', () => {
    it.each([
      ['Linh', 'L'],
      ['Ada Lovelace', 'AL'],
      ['  marie  curie  ', 'MC'],
      ['Jean Claude Van Damme', 'JC'],
      ['Nguyễn Thị Hoa', 'NT'],
      ['Đặng Ánh Tuyết', 'ĐÁ'],
      ['ngô bảo châu', 'NB'],
      ['Ôn Văn', 'ÔV'],
      ['', ''],
      ['   ', ''],
      ['(Dr.) Lê', 'DL'],
    ])('%j gives %j', (name, expected) => {
      expect(initialsOf(name)).toBe(expected)
    })

    it('keeps the combining marks of a decomposed letter', () => {
      const decomposed = 'Ê Vịt'.normalize('NFD') // Ê Vịt
      expect(initialsOf(decomposed)).toBe('ÊV')
    })
  })

  it('no image: a surfaceAlt disc with initials centred in it', () => {
    const c = ctxNoAssets(420, 240)
    const tree = lay({ name: 'Đặng Ánh', image: '' })
    const disc = leavesOf(tree, 'photo').find((l) => l.k === 'rect')!
    expect((disc.node as any).fill.color).toBe(c.resolveColor('surfaceAlt').color)
    expect((disc.node as any).radius).toBe(disc.width / 2)
    expect(textOf(tree, 'photo.initials')).toBe('ĐÁ')
    const t = leavesOf(tree, 'photo.initials')[0]
    expect(t.x).toBeGreaterThanOrEqual(disc.x)
    expect(t.x + t.width).toBeLessThanOrEqual(disc.x + disc.width + 1)
    expect(t.y).toBeGreaterThanOrEqual(disc.y)
    expect(t.y + t.height).toBeLessThanOrEqual(disc.y + disc.height + 1)
  })

  it('1-word and 2-word names give 1 and 2 letters', () => {
    expect(textOf(lay({ name: 'Linh' }), 'photo.initials')).toBe('L')
    expect(textOf(lay({ name: 'Linh Tran' }), 'photo.initials')).toBe('LT')
  })

  it('with a resolvable image: an image node with radius = size/2 and the name as alt', () => {
    const tree = lay({ image: 'me', name: 'Lan Tran' }, 420, 240, true)
    const img = absoluteLeaves(tree).find((l) => l.k === 'image')!
    expect((img.node as any).radius).toBe(img.width / 2)
    expect((img.node as any).alt).toBe('Lan Tran')
    expect((img.node as any).url).toBe('/assets/me.png')
  })

  it('an image id that cannot be resolved falls back to initials, never a broken box', () => {
    const tree = lay({ image: 'gone', name: 'Lan Tran' })
    expect(absoluteLeaves(tree).some((l) => l.k === 'image')).toBe(false)
    expect(textOf(tree, 'photo.initials')).toBe('LT')
  })

  it('shape: circle is fully round, rounded is not, square has no radius', () => {
    const r = (shape: string) => (leavesOf(lay({ shape, image: 'me' }, 420, 240, true), 'photo')[0].node as any).radius
    expect(r('circle')).toBeGreaterThan(r('rounded'))
    expect(r('rounded')).toBeGreaterThan(0)
    expect(r('square')).toBeUndefined()
  })

  it('size sm < md < lg < xl photo, clamped by the box', () => {
    const s = (size: string) => leavesOf(lay({ size }, 600, 700), 'photo')[0].width
    expect(s('sm')).toBeLessThan(s('md'))
    expect(s('md')).toBeLessThan(s('lg'))
    expect(s('lg')).toBeLessThan(s('xl'))
    expect(leavesOf(lay({ size: 'xl' }, 200, 200), 'photo')[0].width).toBeLessThanOrEqual(200)
  })

  it('stacked centres name and role under the photo; inline puts them to its right', () => {
    const st = lay({ layout: 'stacked' })
    const photo = leavesOf(st, 'photo')[0]
    const name = leavesOf(st, 'name')[0]
    expect(name.y).toBeGreaterThanOrEqual(photo.y + photo.height)
    expect(Math.abs(photo.x + photo.width / 2 - 210)).toBeLessThan(1)
    const inl = lay({ layout: 'inline' })
    const p2 = leavesOf(inl, 'photo')[0]
    expect(leavesOf(inl, 'name')[0].x).toBeGreaterThanOrEqual(p2.x + p2.width)
    expect(leavesOf(inl, 'role')[0].y).toBeGreaterThan(leavesOf(inl, 'name')[0].y)
  })

  it('ring adds an accent disc behind and shrinks the photo inside it', () => {
    const c = ctxNoAssets(420, 240)
    const plain = leavesOf(lay({ ring: false }), 'photo').find((l) => l.k === 'rect' && l.part === 'photo')!
    const ringed = lay({ ring: true })
    const ring = leavesOf(ringed, 'photo.ring')[0]
    expect((ring.node as any).fill.color).toBe(c.resolveColor('accent').color)
    expect(ring.width).toBeCloseTo(plain.width, 0)
    expect(leavesOf(ringed, 'photo').find((l) => l.part === 'photo')!.width).toBeLessThan(ring.width)
  })

  it('showName/showRole false remove the text and the photo keeps its size', () => {
    const both = lay({})
    const none = lay({ showName: false, showRole: false })
    expect(leavesOf(none, 'name')).toHaveLength(0)
    expect(leavesOf(none, 'role')).toHaveLength(0)
    expect(leavesOf(none, 'photo')[0].width).toBeGreaterThanOrEqual(leavesOf(both, 'photo')[0].width)
  })

  it('a long name is clipped to one line with an ellipsis, never overflowing the box', () => {
    const tree = lay({ name: 'Wolfeschlegelsteinhausenbergerdorff '.repeat(3), role: 'x '.repeat(80) }, 300, 240)
    for (const l of absoluteLeaves(tree)) expect(l.x + l.width).toBeLessThanOrEqual(300 + 2)
  })
})
