/**
 * tls.c.recap — numbered and cards styles, takeaway, depth, capacity, slide-scope compile.
 */

import { tlsCRecap, buildRecap } from './index'
import { standardBlockSuite, leavesOf, assertContained, assertNoTextOverlap } from '../../text/standard-suite'
import { depthOk, layoutAt, hasPart, slideScopeCompiles } from '../composite-test'

standardBlockSuite(tlsCRecap, { withRegistry: true, overflowProps: { points: ['a', 'b', 'c', 'd', 'e', 'f'] } })

const EX = tlsCRecap.describe!.example.props as Record<string, unknown>
const textOf = (tree: any, part: string) =>
  leavesOf(tree, part)
    .filter((l) => l.k === 'text')
    .map((l) => (l.node as any).lines.map((x: any) => x.text).join(''))
    .join('|')

describe('tls.c.recap', () => {
  it('is a slide-scope closing composite', () => {
    expect(tlsCRecap.scope).toBe('slide')
    expect(tlsCRecap.category).toBe('closing')
  })

  it('build() depth <= 4 and no depth overflow at max content, both styles', () => {
    const max = { points: Array.from({ length: 5 }, () => 'p'.repeat(140)), takeaway: 't'.repeat(140) }
    for (const style of ['numbered', 'cards']) depthOk(tlsCRecap, buildRecap, { ...EX, ...max, style }, 1500, 900)
  })

  it('numbered: one list piece then the takeaway below it', () => {
    const t = layoutAt(tlsCRecap, { ...EX, style: 'numbered' }, 1500, 800)
    expect(hasPart(t, 'points')).toBe(true)
    expect(textOf(t, 'takeaway')).toContain('Plot first')
    const lastPoint = Math.max(...leavesOf(t, 'points').map((l) => l.y + l.height))
    expect(Math.min(...leavesOf(t, 'takeaway').map((l) => l.y))).toBeGreaterThanOrEqual(lastPoint - 1)
  })

  it('cards: one panel, number and point per point, equal heights, numbered 1..n', () => {
    const t = layoutAt(tlsCRecap, { ...EX, style: 'cards' }, 1500, 800)
    const cards = leavesOf(t, 'card')
    expect(cards).toHaveLength(3)
    expect(new Set(cards.map((c) => Math.round(c.height))).size).toBe(1)
    expect(textOf(t, 'number')).toBe('1|2|3')
    expect(leavesOf(t, 'point')).toHaveLength(3)
    // number and point sit inside their panel (the panel is shifted with the centred content)
    cards.forEach((c, i) => {
      for (const part of ['number', 'point']) {
        const l = leavesOf(t, part)[i]
        expect(l.y).toBeGreaterThanOrEqual(c.y)
        expect(l.y + l.height).toBeLessThanOrEqual(c.y + c.height + 1)
      }
    })
    assertContained(t, { width: 1500, height: 800 })
    assertNoTextOverlap(t)
  })

  it('without a takeaway nothing is drawn for it; content is centred in a tall box', () => {
    const t = layoutAt(tlsCRecap, { ...EX, takeaway: '' }, 1500, 900)
    expect(hasPart(t, 'takeaway')).toBe(false)
    const ys = leavesOf(t, 'points').map((l) => l.y)
    const bottoms = leavesOf(t, 'points').map((l) => l.y + l.height)
    expect(Math.min(...ys)).toBeGreaterThan(50)
    expect(900 - Math.max(...bottoms)).toBeGreaterThan(50)
  })

  it('five long points at max width still fit a slide region and never overlap', () => {
    const points = Array.from({ length: 5 }, (_, i) => `Point ${i + 1}: ` + 'long words here '.repeat(8))
    for (const style of ['numbered', 'cards']) {
      const t = layoutAt(tlsCRecap, { ...EX, points, style }, 1500, 900)
      assertNoTextOverlap(t)
    }
  })

  it('the example compiles in a title and a blank region, inside the frame', () => {
    slideScopeCompiles(tlsCRecap, 'title', 'title')
    slideScopeCompiles(tlsCRecap, 'blank', 'content')
  })
})
