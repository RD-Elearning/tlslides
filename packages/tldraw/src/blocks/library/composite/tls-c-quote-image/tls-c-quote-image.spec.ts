/**
 * tls.c.quote-image — anchors, scrim strength, worst-case contrast guarantee, lint, depth, compile.
 */

import { tlsCQuoteImage, buildQuoteImage, scrimColor, worstCaseContrast } from './index'
import { standardBlockSuite, leavesOf, absoluteLeaves, assertContained, assertNoTextOverlap } from '../../text/standard-suite'
import { contrastRatio } from '../../../color-math'
import { lumOf } from '../../text/_engine/color'
import { depthOk, layoutAt, hasPart, slideScopeCompiles } from '../composite-test'

standardBlockSuite(tlsCQuoteImage, { withRegistry: true, noCapacity: true })

const EX = tlsCQuoteImage.describe!.example.props as Record<string, unknown>
const textOf = (tree: any, part: string) =>
  leavesOf(tree, part)
    .filter((l) => l.k === 'text')
    .map((l) => (l.node as any).lines.map((x: any) => x.text).join(''))
    .join('|')

describe('tls.c.quote-image', () => {
  it('is a slide-scope emphasis composite', () => {
    expect(tlsCQuoteImage.scope).toBe('slide')
    expect(tlsCQuoteImage.category).toBe('emphasis')
  })

  it('build() depth <= 4 and no depth overflow at max content, every anchor', () => {
    const max = { quote: 'q'.repeat(200), name: 'n'.repeat(40), role: 'r'.repeat(50) }
    for (const anchor of ['bottom-left', 'center', 'left']) depthOk(tlsCQuoteImage, buildQuoteImage, { ...EX, ...max, anchor }, 1600, 800)
  })

  it('draws the photo, then one scrim over it, then the text', () => {
    const t = layoutAt(tlsCQuoteImage, EX, 1600, 800)
    const order = absoluteLeaves(t).map((l) => l.part ?? '')
    expect(order.findIndex((p) => p.startsWith('image'))).toBeLessThan(order.findIndex((p) => p.startsWith('scrim')))
    expect(order.findIndex((p) => p.startsWith('scrim'))).toBeLessThan(order.findIndex((p) => p.startsWith('quote')))
    const scrim = leavesOf(t, 'scrim')
    expect(scrim).toHaveLength(1)
    expect(scrim[0].width).toBe(1600)
    expect(scrim[0].height).toBe(800)
  })

  it('anchor: bottom-left sits in the lower half, left and center are vertically centred; center is centred in x', () => {
    const bl = layoutAt(tlsCQuoteImage, { ...EX, anchor: 'bottom-left' }, 1600, 800)
    expect(leavesOf(bl, 'quote')[0].y).toBeGreaterThan(300)
    expect(leavesOf(bl, 'quote')[0].x).toBeLessThan(200)
    for (const anchor of ['left', 'center']) {
      const t = layoutAt(tlsCQuoteImage, { ...EX, anchor }, 1600, 800)
      const ls = [...leavesOf(t, 'mark'), ...leavesOf(t, 'quote'), ...leavesOf(t, 'name'), ...leavesOf(t, 'role')]
      const top = Math.min(...ls.map((l) => l.y))
      const bottom = Math.max(...ls.map((l) => l.y + l.height))
      expect(Math.abs(top - (800 - bottom))).toBeLessThan(80)
    }
    const c = layoutAt(tlsCQuoteImage, { ...EX, anchor: 'center' }, 1600, 800)
    for (const l of leavesOf(c, 'quote')) expect(Math.abs(l.x + l.width / 2 - 800)).toBeLessThan(2)
  })

  it('the quote text reads on the scrim and the scrim is dark enough for a white photo (>= 4.5)', () => {
    for (const scrim of ['medium', 'strong']) {
      const t = layoutAt(tlsCQuoteImage, { ...EX, scrim }, 1600, 800)
      const fill = (leavesOf(t, 'scrim')[0].node as any).fill.color as string
      expect(worstCaseContrast(fill)).toBeGreaterThanOrEqual(4.5)
      const col = (leavesOf(t, 'quote')[0].node as any).style.color as string
      expect(contrastRatio(lumOf(col), 0)).toBeGreaterThanOrEqual(7)
    }
  })

  it('strong is darker than medium; both honour a lighter theme scrim', () => {
    const alpha = (c: string) => Number(c.match(/,([\d.]+)\)$/)![1])
    expect(alpha(scrimColor('rgba(0,0,0,0.6)', 'strong'))).toBeGreaterThan(alpha(scrimColor('rgba(0,0,0,0.6)', 'medium')))
    expect(alpha(scrimColor('rgba(0,0,0,0.2)', 'medium'))).toBeGreaterThanOrEqual(0.55)
    expect(alpha(scrimColor('rgba(0,0,0,0.2)', 'strong'))).toBeGreaterThanOrEqual(0.75)
    expect(alpha(scrimColor('#000000', 'medium'))).toBeLessThanOrEqual(0.92)
  })

  it('lint: alt/missing, and quote-image/scrim-contrast for a light theme scrim', () => {
    expect(tlsCQuoteImage.lint!({ ...EX, alt: '' } as any, {} as any)).toEqual([expect.objectContaining({ rule: 'alt/missing' })])
    expect(tlsCQuoteImage.lint!(EX as any, {} as any)).toEqual([])
    const f = tlsCQuoteImage.lint!(EX as any, { tokens: { color: { scrim: '#dddddd' } } } as any)
    expect(f).toEqual([expect.objectContaining({ level: 'warning', rule: 'quote-image/scrim-contrast' })])
    expect(f[0].message).toMatch(/:1/)
  })

  it('name and role show their text; without them nothing is drawn; text stays inside', () => {
    const t = layoutAt(tlsCQuoteImage, EX, 1600, 800)
    expect(textOf(t, 'name')).toContain('Tran')
    expect(textOf(t, 'role')).toContain('Head')
    const bare = layoutAt(tlsCQuoteImage, { ...EX, name: '', role: '' }, 1600, 800)
    expect(hasPart(bare, 'name')).toBe(false)
    expect(hasPart(bare, 'role')).toBe(false)
    for (const tree of [t, bare]) {
      assertNoTextOverlap(tree)
      assertContained(tree, { width: 1600, height: 800 })
    }
  })

  it('the example compiles in a title and a blank region, inside the frame', () => {
    slideScopeCompiles(tlsCQuoteImage, 'title', 'title')
    slideScopeCompiles(tlsCQuoteImage, 'blank', 'content')
  })
})
