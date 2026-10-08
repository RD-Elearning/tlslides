/**
 * tls.c.cover — variants, toggles, centring, bleed contrast, slide-scope compile.
 */

import { tlsCCover, buildCover } from './index'
import { standardBlockSuite, absoluteLeaves, leavesOf, assertContained } from '../../text/standard-suite'
import { collectParts } from '../../layout/test-helpers'
import { depthOk, layoutAt, hasPart, slideScopeCompiles } from '../composite-test'

standardBlockSuite(tlsCCover, { withRegistry: true, noCapacity: true })

const EX = tlsCCover.describe!.example.props as Record<string, unknown>
const textOf = (tree: any, part: string) =>
  leavesOf(tree, part)
    .filter((l) => l.k === 'text')
    .map((l) => (l.node as any).lines.map((x: any) => x.text).join(''))
    .join('')

describe('tls.c.cover', () => {
  it('is a slide-scope Tier A composite in the cover category', () => {
    expect(tlsCCover.scope).toBe('slide')
    expect(tlsCCover.category).toBe('cover')
    expect(tlsCCover.tier).toBe('A')
    expect(tlsCCover.related).toContain('tls.c.hero')
  })

  it('build() tree is at most 4 deep and lays out with no depth overflow, for every variant at max content', () => {
    const long = 'w'.repeat(80)
    for (const variant of ['centered', 'split', 'bleed']) {
      depthOk(tlsCCover, buildCover, { ...EX, variant, title: long, subtitle: 'x'.repeat(140), meta: 'y'.repeat(80), kicker: 'k'.repeat(40) }, 1600, 800)
    }
  })

  it('every variant keeps its leaves inside the box', () => {
    for (const variant of ['centered', 'split', 'bleed']) {
      for (const image of ['', '/demo/photo-1.svg']) {
        const tree = layoutAt(tlsCCover, { ...EX, variant, image }, 1600, 800)
        assertContained(tree, { width: 1600, height: 800 })
      }
    }
  })

  it('each toggle removes exactly its piece', () => {
    const toggles: Array<[string, string]> = [
      ['showKicker', 'kicker'],
      ['showSubtitle', 'subtitle'],
      ['showMeta', 'meta'],
      ['showLogo', 'logo'],
      ['showImage', 'image'],
    ]
    const all = collectParts(layoutAt(tlsCCover, EX, 1600, 800))
    for (const [key, part] of toggles) {
      const off = collectParts(layoutAt(tlsCCover, { ...EX, [key]: false }, 1600, 800))
      expect(off.some((p) => p === part || p.startsWith(part + '['))).toBe(false)
      for (const other of toggles.filter(([, p]) => p !== part)) {
        expect(off.some((p) => p === other[1] || p.startsWith(other[1] + '['))).toBe(hasPartIn(all, other[1]))
      }
    }
  })

  it('centered puts every title line around the box centre; split keeps the text in the left half', () => {
    const c = layoutAt(tlsCCover, { ...EX, variant: 'centered', image: '' }, 1600, 800)
    for (const l of leavesOf(c, 'title')) expect(Math.abs(l.x + l.width / 2 - 800)).toBeLessThan(2)
    const s = layoutAt(tlsCCover, { ...EX, variant: 'split' }, 1600, 800)
    for (const part of ['title', 'subtitle', 'kicker']) for (const l of leavesOf(s, part)) expect(l.x + l.width).toBeLessThanOrEqual(800)
    expect(leavesOf(s, 'image')[0].x).toBeGreaterThanOrEqual(800)
  })

  it('shows the text of every slot', () => {
    const tree = layoutAt(tlsCCover, EX, 1600, 800)
    expect(textOf(tree, 'title')).toContain('Applied')
    expect(textOf(tree, 'kicker').toUpperCase()).toContain('LECTURE 1')
    expect(textOf(tree, 'subtitle')).toContain('decisions')
    expect(textOf(tree, 'meta')).toContain('2026')
  })

  it('bleed paints the image, a scrim and light text; without an image it falls back to an accent field', () => {
    const withImg = layoutAt(tlsCCover, { ...EX, variant: 'bleed' }, 1600, 800)
    expect(hasPart(withImg, 'image')).toBe(true)
    expect(hasPart(withImg, 'scrim')).toBe(true)
    const light = (leavesOf(withImg, 'title')[0].node as any).style.color as string
    expect(parseInt(light.slice(1, 3), 16)).toBeGreaterThan(200)
    const noImg = layoutAt(tlsCCover, { ...EX, variant: 'bleed', image: '' }, 1600, 800)
    expect(hasPart(noImg, 'field')).toBe(true)
    expect(hasPart(noImg, 'scrim')).toBe(false)
  })

  it('a long title steps down the type size instead of overflowing', () => {
    const tree = layoutAt(tlsCCover, { ...EX, variant: 'centered', image: '', title: 'A very long cover title that needs several lines to fit nicely on the slide' }, 1600, 800)
    assertContained(tree, { width: 1600, height: 800 })
    expect(leavesOf(tree, 'title').length).toBeLessThanOrEqual(3)
  })

  it('grows its root height when the content cannot fit the box', () => {
    const tall = layoutAt(tlsCCover, { ...EX, variant: 'centered', image: '' }, 1600, 140)
    expect(tall.box.height).toBeGreaterThan(140)
    const roomy = layoutAt(tlsCCover, { ...EX, variant: 'centered', image: '' }, 1600, 800)
    expect(roomy.box.height).toBe(800)
  })

  it('the example compiles alone in a title layout region and in a blank content region, inside the frame', () => {
    slideScopeCompiles(tlsCCover, 'title', 'title')
    slideScopeCompiles(tlsCCover, 'blank', 'content')
  })
})

function hasPartIn(parts: string[], part: string): boolean {
  return parts.some((p) => p === part || p.startsWith(part + '['))
}
