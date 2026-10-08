/**
 * tls.c.profile-card — composite structure, layouts, tones, toggles, fallbacks.
 */

import { tlsCProfileCard } from './index'
import { makeCtx, collectParts, TEST_TOKENS, TEST_SURFACE } from '../../layout/test-helpers'
import { createLayoutContext } from '../../../layout/layout-child'
import { standardBlockSuite, absoluteLeaves, leavesOf, assertWellFormed } from '../../text/standard-suite'
import { BlockRegistry } from '../../../registry'
import { registerBuiltInBlocks } from '../../index'

const reg = new BlockRegistry()
registerBuiltInBlocks(reg)
const ctx = (w: number, h: number, assets = false) =>
  assets
    ? createLayoutContext({
        box: { width: w, height: h },
        tokens: TEST_TOKENS,
        surface: TEST_SURFACE,
        registry: reg,
        resolveAsset: (id: string) => `/assets/${id}.png`,
      })
    : makeCtx({ width: w, height: h }, reg)
const lay = (props: Record<string, unknown>, w = 520, h = 700, assets = false) =>
  tlsCProfileCard.layout({ ...(tlsCProfileCard.defaults as any), ...props } as any, ctx(w, h, assets))
const textOf = (tree: any, part: string) =>
  leavesOf(tree, part)
    .filter((l) => l.k === 'text')
    .map((l) => (l.node as any).lines.map((x: any) => x.text).join(''))
    .join('')

// The DOM/SVG probe needs the registry (a composite lays children out through `ctx.layoutChild`); `layout()`
// flattens the nested groups so the SVG renderer, which ignores group offsets, agrees with the DOM.
standardBlockSuite(tlsCProfileCard, { noCapacity: true, withRegistry: true })

describe('tls.c.profile-card', () => {
  it('is a Tier A composite built from existing blocks (no hand-written layout)', () => {
    expect(tlsCProfileCard.family).toBe('composite')
    expect(tlsCProfileCard.tier).toBe('A')
    expect(tlsCProfileCard.intrinsicSize).toBeDefined()
  })

  it('names every piece with its own part and no error node (depth cap respected)', () => {
    for (const layout of ['stacked', 'side']) {
      const tree = lay({ layout })
      assertWellFormed(tree)
      const parts = collectParts(tree)
      for (const p of ['photo', 'name', 'role', 'bio', 'contact']) expect(parts).toContain(p)
    }
  })

  it('shows the text content of every slot', () => {
    const tree = lay({ name: 'Ada Lovelace', role: 'Analyst', bio: 'First programmer.', contact: '@ada' })
    const all = absoluteLeaves(tree)
      .filter((l) => l.k === 'text')
      .map((l) => (l.node as any).lines.map((x: any) => x.text).join(''))
      .join('|')
    for (const t of ['Ada Lovelace', 'Analyst', 'First programmer.', '@ada']) expect(all).toContain(t)
  })

  it('showBio / showContact false remove those parts and the card reflows', () => {
    const parts = collectParts(lay({ showBio: false, showContact: false }))
    expect(parts).not.toContain('bio')
    expect(parts).not.toContain('contact')
    expect(parts).toContain('role')
  })

  it('empty role, bio and contact are simply absent', () => {
    const parts = collectParts(lay({ role: '', bio: '', contact: '' }))
    for (const p of ['role', 'bio', 'contact']) expect(parts).not.toContain(p)
    expect(parts).toContain('name')
  })

  it('stacked puts the portrait above the name; side puts it to the left of the name', () => {
    const st = lay({ layout: 'stacked' })
    const photo = leavesOf(st, 'photo')[0]
    expect(leavesOf(st, 'name')[0].y).toBeGreaterThan(photo.y + photo.height - 1)
    const sd = lay({ layout: 'side' }, 980, 420)
    const p2 = leavesOf(sd, 'photo')[0]
    expect(leavesOf(sd, 'name')[0].x).toBeGreaterThanOrEqual(p2.x + p2.width - 1)
  })

  it('tone alt paints the card surfaceAlt; surface leaves the slide surface', () => {
    const c = ctx(520, 700)
    const bg = (tone: string) => (absoluteLeaves(lay({ tone })).find((l) => l.part === 'background')!.node as any).fill.color
    expect(bg('alt')).toBe(c.resolveColor('surfaceAlt').color)
    expect(bg('surface')).toBe(c.resolveColor('surface').color)
  })

  it('without an image the portrait is initials on a disc; with one it is an image node', () => {
    expect(textOf(lay({ name: 'Đặng Ánh Tuyết', image: '' }), 'photo.initials')).toBe('ĐÁ')
    const withImg = lay({ image: 'lan' }, 520, 700, true)
    expect(absoluteLeaves(withImg).some((l) => l.k === 'image')).toBe(true)
  })

  it('every leaf stays inside the card at the preferred and a small size', () => {
    for (const [w, h] of [[520, 700], [300, 420]]) {
      for (const l of absoluteLeaves(lay({}, w, h))) {
        expect(l.x).toBeGreaterThanOrEqual(-2)
        expect(l.x + l.width).toBeLessThanOrEqual(w + 2)
      }
    }
  })
})
