/**
 * tls.c.divider — variants, alignment, toggles, contrast on the field, slide-scope compile.
 */

import { tlsCDivider, buildDivider } from './index'
import { standardBlockSuite, leavesOf, assertContained } from '../../text/standard-suite'
import { collectParts } from '../../layout/test-helpers'
import { contrastRatio } from '../../../color-math'
import { lumOf } from '../../text/_engine/color'
import { depthOk, layoutAt, hasPart, slideScopeCompiles } from '../composite-test'

standardBlockSuite(tlsCDivider, { withRegistry: true, noCapacity: true })

const EX = tlsCDivider.describe!.example.props as Record<string, unknown>

describe('tls.c.divider', () => {
  it('is a slide-scope divider composite related to cover', () => {
    expect(tlsCDivider.scope).toBe('slide')
    expect(tlsCDivider.category).toBe('divider')
    expect(tlsCDivider.related).toContain('tls.c.cover')
  })

  it('build() depth <= 4 and no depth overflow at max content, every variant', () => {
    for (const variant of ['numeral', 'field', 'minimal']) {
      depthOk(tlsCDivider, buildDivider, { ...EX, variant, number: 'Part 12', title: 'w'.repeat(60), subtitle: 'x'.repeat(120) }, 1600, 800)
    }
  })

  it('each toggle removes exactly its piece', () => {
    for (const [key, part, other] of [['showNumber', 'number', 'subtitle'], ['showSubtitle', 'subtitle', 'number']]) {
      const off = collectParts(layoutAt(tlsCDivider, { ...EX, [key]: false }, 1600, 800))
      expect(off.some((p) => p === part || p.startsWith(part + '['))).toBe(false)
      expect(off.some((p) => p === other || p.startsWith(other + '['))).toBe(true)
    }
  })

  it('minimal has no number and draws the title rule', () => {
    const t = layoutAt(tlsCDivider, { ...EX, variant: 'minimal' }, 1600, 800)
    expect(hasPart(t, 'number')).toBe(false)
  })

  it('numeral: number sits above the title; centre alignment centres every line', () => {
    const t = layoutAt(tlsCDivider, { ...EX, align: 'start' }, 1600, 800)
    expect(leavesOf(t, 'number')[0].y).toBeLessThan(leavesOf(t, 'title')[0].y)
    expect(leavesOf(t, 'title')[0].x).toBe(0)
    const c = layoutAt(tlsCDivider, { ...EX, align: 'center' }, 1600, 800)
    for (const l of [...leavesOf(c, 'title'), ...leavesOf(c, 'number')]) expect(Math.abs(l.x + l.width / 2 - 800)).toBeLessThan(2)
  })

  it('the block is vertically centred in a tall box', () => {
    const t = layoutAt(tlsCDivider, EX, 1600, 800)
    const ys = [...leavesOf(t, 'number'), ...leavesOf(t, 'title'), ...leavesOf(t, 'subtitle')]
    const top = Math.min(...ys.map((l) => l.y))
    const bottom = Math.max(...ys.map((l) => l.y + l.height))
    expect(Math.abs(top - (800 - bottom))).toBeLessThan(20)
  })

  it('field paints an accent field and its text reads on it (contrast >= 3)', () => {
    const t = layoutAt(tlsCDivider, { ...EX, variant: 'field' }, 1600, 800)
    const bg = (leavesOf(t, 'field')[0].node as any).fill.color as string
    for (const part of ['title', 'subtitle', 'number']) {
      const col = (leavesOf(t, part)[0].node as any).style.color as string
      expect(contrastRatio(lumOf(col), lumOf(bg))).toBeGreaterThanOrEqual(3)
    }
  })

  it('every variant stays inside the box; content taller than the box grows the root', () => {
    for (const variant of ['numeral', 'field', 'minimal']) assertContained(layoutAt(tlsCDivider, { ...EX, variant, align: 'center' }, 1600, 800), { width: 1600, height: 800 })
    expect(layoutAt(tlsCDivider, EX, 1600, 100).box.height).toBeGreaterThan(100)
  })

  it('the example compiles in a title and a blank region, inside the frame', () => {
    slideScopeCompiles(tlsCDivider, 'title', 'title')
    slideScopeCompiles(tlsCDivider, 'blank', 'content')
  })
})
